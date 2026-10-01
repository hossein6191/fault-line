// Headless smoke test: runs the real game loop in Node with a stubbed DOM and
// a bot that swipes through targets. Checks for exceptions, NaNs, runaway
// object counts, that a timed round ends, and that a seed is deterministic.
//   node tools/smoke.mjs
import './smoke-env.mjs';
const fakeCanvas = globalThis.__fakeCanvas;
const noop = () => {};
const { Game, ROUND } = await import('../src/game.js');
const { TYPES } = await import('../src/targets.js');
const { Missions } = await import('../src/missions.js');
const { mulberry32 } = await import('../src/rng.js');
const { validateRound } = await import('../api/_lib/util.js');

let failures = 0;
const fail = (m) => { failures++; console.error('FAIL', m); };
const seen = new Set();
const events = new Map();

// Advance the game clock by hand so runs are reproducible.
let clock = 0;
const realNow = performance.now.bind(performance);
performance.now = () => clock * 1000;

function play({ mode, seed, skill, label, maxSeconds = 140, avoidBlocks = true, viewport, mayOutlast = false }) {
  if (viewport) { globalThis.innerWidth = viewport[0]; globalThis.innerHeight = viewport[1]; }
  const rnd = mulberry32(seed || 1234);
  let over = null;
  const game = new Game(fakeCanvas(), { onOver: (r) => { over = r; }, onEvent: (n, v) => events.set(n, (events.get(n) || 0) + v), onTutorial: noop });
  game.ox = 0; game.oy = 0;
  game.start(mode, seed);
  const spawnLog = [];
  const dt = 1 / 60;
  let t = 0, id = 1, maxT = 0, maxP = 0, known = new Set();
  try {
    while (t < maxSeconds && game.state !== 'over') {
      for (const o of game.targets) { seen.add(o.type === 'power' ? 'power:' + o.kind : o.type); if (!known.has(o)) { known.add(o); if (!o.free) spawnLog.push(o.type + ':' + Math.round(o.x)); } }
      // the bot: now and then, one straight stroke through a target near its apex
      for (const o of game.targets) {
        if (!o.alive || o.blown || o.y > game.H - 60 || Math.abs(o.vy) > 260) continue;
        if (o.type === 'block' && avoidBlocks) continue;
        if (rnd() > skill) continue;
        const pid = id++;
        const x0 = o.x - 70, x1 = o.x + 70, y = o.y + (rnd() - 0.5) * 20;
        game.bladeStart(pid, x0, y);
        for (let i = 1; i <= 6; i++) { clock += 0.004; game.bladeMove(pid, x0 + (x1 - x0) * i / 6, y); }
        game.bladeEnd(pid);
      }
      if (game.boss && game.boss.t > 0.5 && rnd() < 0.4) {
        const pid = id++, b = game.boss;
        game.bladeStart(pid, b.x - 90, b.y);
        for (let i = 1; i <= 6; i++) { clock += 0.004; game.bladeMove(pid, b.x - 90 + 30 * i, b.y + (rnd() - 0.5) * 30); }
        game.bladeEnd(pid);
      }
      clock += dt; t += dt;
      game.update(dt);
      if (Math.round(t * 60) % 20 === 0) game.draw();
      maxT = Math.max(maxT, game.targets.length); maxP = Math.max(maxP, game.parts.length + game.pieces.length);
      if (!Number.isFinite(game.score)) { fail(`${label}: score NaN`); break; }
      for (const o of game.targets) if (!Number.isFinite(o.x) || !Number.isFinite(o.y)) { fail(`${label}: target NaN`); t = 1e9; break; }
      if (game.targets.length > 80) { fail(`${label}: ${game.targets.length} targets alive`); break; }
    }
  } catch (e) { fail(`${label}: threw ${e.stack}`); return null; }
  if (game.state !== 'over' && !mayOutlast) fail(`${label}: round did not end within ${maxSeconds}s (phase ${game.phase})`);
  const out = { score: game.score, sliced: game.sliced, combos: game.combos, maxCombo: game.maxCombo, boss: game.bossHits, cracks: game.cracks, shield: game.shieldHits, t: Math.round(t), maxTargets: maxT, maxParts: maxP, size: `${game.W}x${game.H}` };
  console.log(label, JSON.stringify(out));
  return { out, over, spawnLog, t };
}

const a = play({ mode: 'daily', seed: 4242, skill: 0.5, label: 'daily-a' });
const b = play({ mode: 'daily', seed: 4242, skill: 0.5, label: 'daily-b' });
if (a && b && (a.out.score !== b.out.score || a.spawnLog.join() !== b.spawnLog.join())) fail('same seed, same bot, different round');
const c = play({ mode: 'daily', seed: 4242, skill: 0.05, label: 'daily-lazy' });
if (a && c) {
  // the course itself must not depend on how well you play (power-ups aside, the plain waves are the same)
  const n = Math.min(12, a.spawnLog.length, c.spawnLog.length);
  if (a.spawnLog.slice(0, n).join() !== c.spawnLog.slice(0, n).join()) fail('opening waves differ between players on the same seed');
}
const arc = play({ mode: 'arcade', seed: 0, skill: 0.6, label: 'arcade' });
if (arc && (arc.t < ROUND || arc.t > ROUND + 12)) fail(`arcade round lasted ${arc.t}s`);
play({ mode: 'arcade', seed: 77, skill: 0.6, label: 'arcade-reckless', avoidBlocks: false });
const cl = play({ mode: 'classic', seed: 0, skill: 0.015, label: 'classic-weak', maxSeconds: 200, avoidBlocks: false });
if (cl && cl.out.cracks < 3) fail('classic round ended without three cracks');
const clStrong = play({ mode: 'classic', seed: 9, skill: 0.92, label: 'classic-strong', maxSeconds: 240, mayOutlast: true });
if (clStrong && clStrong.over) { const r = clStrong.over; const why = validateRound({ mode: 'classic', score: r.score, sliced: r.sliced, combos: r.combos, maxCombo: r.maxCombo, bossHits: 0 }, { t: 0 }, clStrong.t * 1000 + 3000); if (why) fail('honest classic round rejected: ' + why); }
play({ mode: 'arcade', seed: 5, skill: 0.6, label: 'portrait', viewport: [390, 844] });
globalThis.innerWidth = 960; globalThis.innerHeight = 540;

// server rules accept an honest round and refuse silly ones
if (arc && arc.over) {
  const tok = { t: 0 }, nowMs = 70000, r = arc.over;
  const body = { mode: 'arcade', score: r.score, sliced: r.sliced, combos: r.combos, maxCombo: r.maxCombo, bossHits: r.bossHits };
  const why = validateRound(body, tok, nowMs);
  if (why) fail('honest arcade round rejected: ' + why);
  if (!validateRound({ ...body, score: 99999 }, tok, nowMs)) fail('absurd score accepted');
  if (!validateRound(body, tok, 20000)) fail('20 second arcade round accepted');
  if (!validateRound({ mode: 'classic', score: 300, sliced: 20, combos: 7, maxCombo: 3, bossHits: 0 }, tok, 1000)) fail('instant classic round accepted');
  if (!validateRound({ mode: 'arcade', score: 20000, sliced: 420, combos: 141, maxCombo: 90, bossHits: 60 }, tok, nowMs)) fail('20,000 point arcade round accepted');
}

// missions round trip
try {
  const ms = new Missions();
  ms.runStart('arcade');
  ms.track('slice', 50); ms.track('orb', 20); ms.track('combo', 5); ms.track('clean', 9);
  const r = ms.runEnd({ score: 180, mode: 'arcade', duration: 64, maxCombo: 5, sliced: 50 });
  if (!r || !Array.isArray(r.completed)) fail('missions.runEnd shape');
  if (ms.list().length !== 3) fail('missions.list() should have 3 entries');
  if (typeof ms.rank().level !== 'number') fail('missions.rank() shape');
  if (!ms.unlocks().includes('pearl') || ms.getBlade() !== 'pearl') fail('default blade');
} catch (e) { fail(`missions threw ${e.stack}`); }

for (const k of ['orb', 'lens', 'prism', 'dart', 'star', 'block', 'power:overclock', 'power:amp', 'power:stasis', 'power:quake']) if (!seen.has(k)) fail('never spawned: ' + k);
for (const k of Object.keys(TYPES)) if (!TYPES[k].r) fail('type without radius: ' + k);
console.log('seen:', [...seen].sort().join(' '));
console.log('events:', Object.fromEntries([...events].sort()));
performance.now = realNow;
if (failures) { console.error(`${failures} failure(s)`); process.exit(1); }
console.log('smoke ok');
process.exit(0);
