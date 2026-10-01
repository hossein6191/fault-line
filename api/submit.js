// POST /api/submit { token, pid, name, mode, score, sliced, combos, maxCombo, bossHits, seed }
// -> { ok, improved, rank, total, board, date }
// One best entry per player id on each board. Keys are prefixed fl: so this
// game can share an Upstash database with Magnitude Run.
//   fl:lb:arcade | fl:lb:classic | fl:lb:daily:<date>   sorted sets, member pid
//   fl:pb:<board>:<pid>                                 JSON details for the listing
import { send, preflight, readJson, redis, rateLimit, clientIp, verifyToken, validateRound, cleanName, cleanPid, compositeScore, utcDate, dailySeed, TOKEN_TTL_MS } from './_lib/util.js';

const BOARD_MAX = 5000;
const DETAIL_TTL = 180 * 86400;

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const r = await redis();
  if (!r) return send(res, 503, { error: 'leaderboard offline', online: false });
  if (!(await rateLimit(r, `submit:${clientIp(req)}`, 60, 600))) return send(res, 429, { error: 'slow down' });

  const body = await readJson(req);
  if (!body) return send(res, 400, { error: 'bad json' });
  const payload = verifyToken(body.token);
  if (!payload || payload.v !== 1 || payload.g !== 'fl') return send(res, 401, { error: 'bad token' });
  const now = Date.now();
  const why = validateRound(body, payload, now);
  if (why) return send(res, 422, { error: why });
  const pid = cleanPid(body.pid);
  if (!pid) return send(res, 400, { error: 'bad player id' });

  // a token is single-use
  const used = await r.set(`fl:tok:${payload.n}`, 1, { nx: true, ex: Math.ceil(TOKEN_TTL_MS / 1000) + 60 });
  if (used !== 'OK') return send(res, 409, { error: 'token used' });

  const name = cleanName(body.name);
  const mode = body.mode;
  const date = mode === 'daily' ? String(payload.d || utcDate(now)) : utcDate(now);
  if (mode === 'daily') {
    if (payload.d !== utcDate(now) && payload.d !== utcDate(now - 86400000)) return send(res, 422, { error: 'daily token stale' });
    if (Number(body.seed) !== dailySeed(date)) return send(res, 422, { error: 'wrong course' });
  }
  const board = mode === 'daily' ? `daily:${date}` : mode;
  const boardKey = `fl:lb:${board}`, detailKey = `fl:pb:${board}:${pid}`;
  const score = Math.floor(Number(body.score)), sliced = Math.floor(Number(body.sliced)), maxCombo = Math.floor(Number(body.maxCombo));
  const sort = compositeScore(score, sliced);
  const prev = await r.zscore(boardKey, pid);
  const improved = prev == null || sort > Number(prev);
  const ttl = mode === 'daily' ? 3 * 86400 : DETAIL_TTL;
  if (improved) {
    await r.zadd(boardKey, { score: sort, member: pid });
    await r.set(detailKey, JSON.stringify({ name, score, sliced, maxCombo, bossHits: Math.floor(Number(body.bossHits)), date }), { ex: ttl });
    if (mode === 'daily') await r.expire(boardKey, 3 * 86400);
    const n = await r.zcard(boardKey);
    if (n > BOARD_MAX) {
      const over = (await r.zrange(boardKey, 0, n - BOARD_MAX - 1)).map(String);
      if (over.length) { await r.zrem(boardKey, ...over); await r.del(...over.map((id) => `fl:pb:${board}:${id}`)); }
    }
  } else {
    // keep the listing alive for as long as the player keeps playing, and let them rename
    const cur = await r.get(detailKey);
    const obj = cur ? (typeof cur === 'string' ? JSON.parse(cur) : cur) : { score: Math.floor(Number(prev) / 1000), sliced: Number(prev) % 1000, maxCombo: 0, bossHits: 0, date };
    obj.name = name;
    await r.set(detailKey, JSON.stringify(obj), { ex: ttl });
  }
  const rank = await r.zrevrank(boardKey, pid);
  const total = await r.zcard(boardKey);
  await r.incr('fl:stats:rounds');
  return send(res, 200, { ok: true, improved, rank: rank == null ? null : rank + 1, total, board: mode, date });
}
