// GET /api/board?board=arcade|classic|daily&date=YYYY-MM-DD&limit=25&pid=...
// -> { online, board, date, total, entries: [{rank,name,score,sliced,maxCombo,you}], you: {rank,score}|null }
import { send, preflight, redis, rateLimit, clientIp, utcDate, cleanPid, MODES } from './_lib/util.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  if (req.method !== 'GET') return send(res, 405, { error: 'GET only' });
  const r = await redis();
  if (!r) return send(res, 200, { online: false, entries: [], total: 0, you: null });
  if (!(await rateLimit(r, `board:${clientIp(req)}`, 240, 600))) return send(res, 429, { error: 'slow down' });

  const url = new URL(req.url, 'http://x');
  const want = url.searchParams.get('board');
  const mode = MODES.includes(want) ? want : 'arcade';
  const today = utcDate();
  let date = url.searchParams.get('date') || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today;
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 25));
  const pid = cleanPid(url.searchParams.get('pid'));
  const board = mode === 'daily' ? `daily:${date}` : mode;
  const boardKey = `fl:lb:${board}`;
  const detail = (id) => `fl:pb:${board}:${id}`;
  const parse = (d) => (d ? (typeof d === 'string' ? JSON.parse(d) : d) : {});

  const ids = (await r.zrange(boardKey, 0, limit - 1, { rev: true })).map(String);
  const total = await r.zcard(boardKey);
  let entries = [];
  if (ids.length) {
    const details = await r.mget(...ids.map(detail));
    entries = ids.map((id, i) => {
      const o = parse(details[i]);
      return { rank: i + 1, name: o.name || 'Rocky', score: o.score ?? 0, sliced: o.sliced ?? 0, maxCombo: o.maxCombo ?? 0, you: pid ? id === pid : false };
    });
  }
  let you = null;
  if (pid) {
    const rank = await r.zrevrank(boardKey, pid);
    if (rank != null) { const o = parse(await r.get(detail(pid))); you = { rank: rank + 1, score: o.score ?? 0, name: o.name || 'Rocky' }; }
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  return send(res, 200, { online: true, board: mode, date, total, entries, you });
}
