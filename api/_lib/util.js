// Shared helpers for the Vercel functions. Files under api/_lib are not
// deployed as functions themselves (leading underscore).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

let client = null;
// Upstash Redis when configured; an in-memory stand-in when MR_DEV_STORE=1
// (serve.mjs sets it) so the whole online flow can be tried locally.
export async function redis() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    const { Redis } = await import('@upstash/redis');
    // raw strings back: we parse JSON ourselves, so digit-only ids never turn into numbers
    client = new Redis({ url, token, automaticDeserialization: false });
    return client;
  }
  if (process.env.MR_DEV_STORE === '1') { client = memoryStore(); return client; }
  return null;
}

// Just enough of the Upstash API for the three functions. Not persistent.
function memoryStore() {
  const kv = new Map(), exp = new Map(), z = new Map();
  const alive = (k) => { const e = exp.get(k); if (e && e < Date.now()) { kv.delete(k); z.delete(k); exp.delete(k); } };
  const sorted = (k) => [...(z.get(k) || new Map()).entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return {
    async incr(k) { alive(k); const v = (Number(kv.get(k)) || 0) + 1; kv.set(k, v); return v; },
    async expire(k, sec) { exp.set(k, Date.now() + sec * 1000); return 1; },
    async set(k, v, opts = {}) { alive(k); if (opts.nx && kv.has(k)) return null; kv.set(k, v); if (opts.ex) exp.set(k, Date.now() + opts.ex * 1000); else if (!opts.keepTtl) exp.delete(k); return 'OK'; },
    async del(...ks) { let n = 0; for (const k of ks) { if (kv.delete(k)) n++; z.delete(k); exp.delete(k); } return n; },
    async zrem(k, ...ms) { const s = z.get(k); let n = 0; if (s) for (const m of ms) if (s.delete(m)) n++; return n; },
    async get(k) { alive(k); return kv.has(k) ? kv.get(k) : null; },
    async mget(...ks) { return ks.map((k) => { alive(k); return kv.has(k) ? kv.get(k) : null; }); },
    async zadd(k, entry) { alive(k); if (!z.has(k)) z.set(k, new Map()); z.get(k).set(entry.member, entry.score); return 1; },
    async zscore(k, m) { alive(k); const s = z.get(k); return s && s.has(m) ? s.get(m) : null; },
    async zrevrank(k, m) { alive(k); const i = sorted(k).findIndex(([mm]) => mm === m); return i < 0 ? null : i; },
    async zcard(k) { alive(k); return (z.get(k) || new Map()).size; },
    async zrange(k, a, b) { alive(k); return sorted(k).slice(a, b + 1).map(([m]) => m); },
  };
}

export function secret() {
  return process.env.RUN_SECRET || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function preflight(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return true;
  }
  return false;
}

// Vercel parses the body before the handler runs (object for JSON, string for
// text, Buffer otherwise) and the stream is already drained; the local server
// hands us a live stream. Never wait on a drained stream, never wait forever.
export async function readJson(req) {
  let b;
  try { b = req.body; } catch (e) { return null; }
  if (b !== undefined || req.readableEnded || req.complete) {
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { return null; } }
    return b && typeof b === 'object' && !Buffer.isBuffer(b) && !Array.isArray(b) ? b : null;
  }
  return new Promise((resolve) => {
    let data = '', done = false;
    const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const timer = setTimeout(() => { finish(null); try { req.destroy(); } catch (e) { /* ignore */ } }, 3000);
    req.on('data', (c) => { data += c; if (data.length > 20000) { finish(null); req.destroy(); } });
    req.on('end', () => { try { const v = JSON.parse(data || '{}'); finish(v && typeof v === 'object' && !Array.isArray(v) ? v : null); } catch (e) { finish(null); } });
    req.on('error', () => finish(null));
  });
}

export function clientIp(req) {
  const h = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
  return String(h).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

// Sliding bucket rate limit: `limit` hits per `windowSec` per key.
export async function rateLimit(r, key, limit, windowSec) {
  if (!r) return true;
  const bucket = `fl:rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  const n = await r.incr(bucket);
  if (n === 1) await r.expire(bucket, windowSec + 5);
  return n <= limit;
}

export function utcDate(ms = Date.now()) { return new Date(ms).toISOString().slice(0, 10); }

// The daily course seed is derived from the secret, so tomorrow's course cannot
// be practised early. Offline clients fall back to a public seed and are not posted.
export function dailySeed(date) {
  const hex = createHmac('sha256', secret()).update(`fault-line:daily:${date}`).digest('hex').slice(0, 8);
  return parseInt(hex, 16) >>> 0;
}

const BAD = ['fuck', 'shit', 'cunt', 'nigg', 'fag', 'bitch', 'dick', 'cock', 'pussy', 'rape', 'nazi', 'hitler', 'kike', 'whore', 'slut', 'retard'];
export function cleanName(raw) {
  let s = String(raw || '').normalize('NFKC').replace(/\p{Cf}/gu, '').replace(/[^A-Za-z0-9_ .\-؀-ۿ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  const flat = s.toLowerCase().replace(/[^a-z]/g, '');
  if (BAD.some((w) => flat.includes(w))) s = 'Rocky';
  // at least two visible base characters (combining marks and format characters do not count)
  if (s.replace(/[\p{M}\p{Cc}\s]/gu, '').length < 2) s = 'Rocky';
  return s;
}

export function cleanPid(raw) {
  const s = String(raw || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  return s.length >= 8 ? s : null;
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');
export function signToken(payload) {
  const body = b64u(JSON.stringify(payload));
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
}
export function nonce() { return randomBytes(9).toString('base64url'); }

// Composite sort score: points first, targets shattered as the tie-breaker.
export function compositeScore(score, sliced) {
  return Math.floor(score) * 1000 + Math.min(999, Math.max(0, Math.floor(sliced)));
}

export const TOKEN_TTL_MS = 45 * 60 * 1000;
export const MODES = ['arcade', 'classic', 'daily'];

// Server-side plausibility for a round. Returns an error string or null.
// Honest-player checks only: the client plays the round, so a determined
// cheat can still post a believable score. Replay verification would fix that.
export function validateRound(run, tokenPayload, nowMs) {
  const score = Number(run.score), sliced = Number(run.sliced), combos = Number(run.combos), maxCombo = Number(run.maxCombo), bossHits = Number(run.bossHits);
  if (![score, sliced, combos, maxCombo, bossHits].every((n) => Number.isFinite(n) && n >= 0 && Math.floor(n) === n)) return 'bad numbers';
  if (!MODES.includes(run.mode)) return 'bad mode';
  const elapsed = nowMs - Number(tokenPayload.t);
  if (!Number.isFinite(elapsed) || elapsed < 0) return 'bad token time';
  if (elapsed > TOKEN_TTL_MS) return 'token expired';
  const sec = elapsed / 1000;
  if (maxCombo > 40 || combos > sliced / 3 + 1 || (combos === 0) !== (maxCombo === 0)) return 'combo mismatch';
  if (run.mode === 'classic') {
    if (bossHits !== 0) return 'no auditor in classic';
    if (sliced > 4000 || sliced > sec * 5 + 20) return 'round too fast';
  } else {
    // a timed round is 60 s plus the Auditor; nothing finishes sooner
    if (sec < 58) return 'round too fast';
    if (sliced > 420 || bossHits > 60) return 'out of range';
  }
  // most a round can pay: 8 per target (3-point target, doubled, clean cut), combo and chain bonuses, the Auditor
  const cap = sliced * 6 + combos * (maxCombo * 2 + 60) + bossHits * 2 + 20 + 140;
  if (score > cap || score > 20000) return 'score too high';
  return null;
}
