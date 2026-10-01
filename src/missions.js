// Missions, lifetime stats, ranks and blade unlocks for Fault Line.
// Everything lives in one versioned localStorage key so a player keeps their
// progress across tabs and days. Mission order is fixed (no Math.random):
// every player starts with the same three easy missions and climbs the same
// ladder, one mission per lane, three active at any time.

const KEY = 'fl-progress';
const VERSION = 1;

// Event names the game emits through track(). Per-run and lifetime counters
// are kept for each: count (times fired), sum (values added up) and max
// (largest single value).
//   slice      one target shattered (value = how many, default 1)
//   watcher, golem, moth, probe, prism
//              fired next to 'slice' for that kind of target
//   boss       fired once per Auditor encounter, value = hits landed on it
//   combo      fired once per combo, value = targets in that combo
//   clean      a clean cut (through the core of a target)
//   power      a power-up was sliced and activated
//   quake      a Quake went off
//   shieldhit  the blade touched a shielded block
//   miss       a target fell back down unsliced
export const EVENTS = [
  'slice', 'watcher', 'golem', 'moth', 'probe', 'prism', 'boss', 'combo',
  'clean', 'power', 'quake', 'shieldhit', 'miss',
];

export const MODES = ['arcade', 'classic', 'daily'];

// Rank ladder: points thresholds map to levels 1.0..9.0 with USGS-flavoured
// titles, echoing the "Magnitude" roles on the Seismic Discord.
export const RANK_THRESHOLDS = [0, 40, 100, 180, 290, 430, 600, 800, 1050];
export const RANK_TITLES = ['Micro', 'Minor', 'Light', 'Moderate', 'Strong', 'Major', 'Great', 'Epic', 'Cataclysmic'];

// Blade trails unlock at whole levels. 'pearl' is the default and always on.
export const BLADES = [
  { id: 'pearl', name: 'Pearl', level: 1 },
  { id: 'mauve', name: 'Mauve', level: 3 },
  { id: 'ember', name: 'Ember', level: 5 },
  { id: 'glass', name: 'Glass', level: 7 },
  { id: 'enclave', name: 'Enclave', level: 9 },
];

const DEFAULT_BLADE = 'pearl';

const num = (x, d = 0) => (Number.isFinite(x) ? x : d);
const fmt = (n) => n.toLocaleString('en-US');
const normMode = (m) => (MODES.includes(m) ? m : 'arcade');
// Same UTC day key the daily seed and the daily leaderboard use.
const today = () => new Date().toISOString().slice(0, 10);

// ---- mission templates ----
// scope 'run': read from the round in progress (or the one that just ended).
// scope 'life': read from lifetime totals, updated live as events arrive.
// prog(run, life) returns the raw number compared against goal.
const T = (id, text, points, goal, scope, prog) => ({ id, text, points, goal, scope, prog });
const runCount = (ev) => (r) => r.count[ev];
const runSum = (ev) => (r) => r.sum[ev];
const runMax = (ev) => (r) => r.max[ev];
const lifeCount = (ev) => (r, l) => l.count[ev];
const lifeSum = (ev) => (r, l) => l.sum[ev];
const lifeRuns = (r, l) => l.runs;
const lifeDaily = (r, l) => l.dailyPlayed;

// The Daily is a seeded Arcade round, so it counts for every Arcade mission.
const timed = (r) => r.mode === 'arcade' || r.mode === 'daily';
const arcadeScore = (r) => (timed(r) ? r.score : 0);
const classicScore = (r) => (r.mode === 'classic' ? r.score : 0);
// Targets sliced in Classic before the first miss of the round. With no miss
// yet it is simply the slice total, so a clean round keeps counting.
const classicStreak = (r) => {
  if (r.mode !== 'classic') return 0;
  return r.firstMissSliced == null ? r.sum.slice : r.firstMissSliced;
};
// A finished timed round with no shielded block touched. The slice floor
// keeps an abandoned or idle round from counting.
const NO_SHIELD_MIN_SLICES = 10;
const noShieldRound = (r) => (
  r.ended && timed(r) && r.count.shieldhit === 0 && r.sum.slice >= NO_SHIELD_MIN_SLICES ? 1 : 0
);
// Arcade score that only counts while no shielded block has been touched.
const noShieldScore = (r) => (timed(r) && r.count.shieldhit === 0 ? r.score : 0);

// Three lanes, each easy to hard, so the three active missions always mix
// slicing volume, blade skill and mode goals.
const LANES = [
  // Lane 0: targets.
  [
    T('slice-40', 'Slice 40 targets in one round', 10, 40, 'run', runSum('slice')),
    T('watchers-8', 'Shatter 8 Watchers in one round', 10, 8, 'run', runSum('watcher')),
    T('slice-60', 'Slice 60 targets in one round', 15, 60, 'run', runSum('slice')),
    T('moths-10', 'Slice 10 Moths in one round', 15, 10, 'run', runSum('moth')),
    T('golems-6', 'Crack 6 Glass Golems in one round', 20, 6, 'run', runSum('golem')),
    T('life-slice-1000', 'Slice 1,000 targets (lifetime)', 30, 1000, 'life', lifeSum('slice')),
    T('probes-8', 'Cut down 8 Probes in one round', 25, 8, 'run', runSum('probe')),
    T('slice-90', 'Slice 90 targets in one round', 30, 90, 'run', runSum('slice')),
    T('prisms-3', 'Split 3 prisms in one round', 30, 3, 'run', runSum('prism')),
    T('life-watchers-300', 'Shatter 300 Watchers (lifetime)', 45, 300, 'life', lifeSum('watcher')),
    T('slice-120', 'Slice 120 targets in one round', 45, 120, 'run', runSum('slice')),
    T('life-slice-5000', 'Slice 5,000 targets (lifetime)', 60, 5000, 'life', lifeSum('slice')),
  ],
  // Lane 1: blade skill.
  [
    T('combos-2', 'Make 2 combos in one round', 10, 2, 'run', runCount('combo')),
    T('combo-4', 'Land a 4 combo', 15, 4, 'run', runMax('combo')),
    T('clean-4', 'Make 4 clean cuts in one round', 15, 4, 'run', runCount('clean')),
    T('combos-6', 'Make 6 combos in one round', 20, 6, 'run', runCount('combo')),
    T('combo-5', 'Land a 5 combo', 25, 5, 'run', runMax('combo')),
    T('power-3', 'Activate 3 power-ups in one round', 20, 3, 'run', runCount('power')),
    T('clean-8', 'Make 8 clean cuts in one round', 30, 8, 'run', runCount('clean')),
    T('boss-20', 'Land 20 hits on the Auditor', 30, 20, 'run', runSum('boss')),
    T('life-combos-100', 'Make 100 combos (lifetime)', 35, 100, 'life', lifeCount('combo')),
    T('combo-7', 'Land a 7 combo', 45, 7, 'run', runMax('combo')),
    T('life-quakes-10', 'Trigger 10 Quakes (lifetime)', 45, 10, 'life', lifeCount('quake')),
    T('combos-12', 'Make 12 combos in one round', 50, 12, 'run', runCount('combo')),
  ],
  // Lane 2: modes and scores.
  [
    T('arcade-100', 'Score 100 in Arcade', 10, 100, 'run', arcadeScore),
    T('classic-60', 'Finish a Classic round with 60 or more', 10, 60, 'run', classicScore),
    T('daily-1', 'Play the Daily', 15, 1, 'life', lifeDaily),
    T('arcade-150', 'Score 150 in Arcade', 20, 150, 'run', arcadeScore),
    T('no-shield', 'Finish an Arcade round without touching a shielded block', 30, 1, 'run', noShieldRound),
    T('streak-30', 'Slice 30 targets in Classic before your first miss', 25, 30, 'run', classicStreak),
    T('classic-120', 'Finish a Classic round with 120 or more', 30, 120, 'run', classicScore),
    T('arcade-250', 'Score 250 in Arcade', 35, 250, 'run', arcadeScore),
    T('life-daily-5', 'Play the Daily on 5 different days', 35, 5, 'life', lifeDaily),
    T('no-shield-300', 'Score 300 in Arcade without touching a shielded block', 50, 300, 'run', noShieldScore),
    T('classic-200', 'Finish a Classic round with 200 or more', 55, 200, 'run', classicScore),
    T('arcade-400', 'Score 400 in Arcade', 60, 400, 'run', arcadeScore),
  ],
];

// Once a lane is exhausted it keeps producing lifetime missions with growing
// goals, so there are always three things to chase.
const CYCLES = [
  (n) => T(`cycle-slice-${n}`, `Slice ${fmt(7500 + 2500 * n)} targets (lifetime)`, 40, 7500 + 2500 * n, 'life', lifeSum('slice')),
  (n) => T(`cycle-combos-${n}`, `Make ${fmt(200 + 100 * n)} combos (lifetime)`, 40, 200 + 100 * n, 'life', lifeCount('combo')),
  (n) => T(`cycle-runs-${n}`, `Finish ${fmt(50 + 25 * n)} rounds (lifetime)`, 40, 50 + 25 * n, 'life', lifeRuns),
];

export const MISSIONS = LANES.flat();

function templateFor(lane, idx) {
  const list = LANES[lane];
  return idx < list.length ? list[idx] : CYCLES[lane](idx - list.length);
}

// ---- state ----
function zeros() {
  const o = {};
  for (const ev of EVENTS) o[ev] = 0;
  return o;
}
function counters(src) {
  const out = { count: zeros(), sum: zeros(), max: zeros() };
  if (!src) return out;
  for (const k of ['count', 'sum', 'max']) {
    const s = src[k] && typeof src[k] === 'object' ? src[k] : {};
    for (const ev of EVENTS) out[k][ev] = Math.max(0, num(s[ev]));
  }
  return out;
}
function freshRun(no, mode, live) {
  return {
    ...counters(), no, mode: normMode(mode),
    // live: between runStart and runEnd. Events outside a live run (menu
    // slicing, a trailing swipe after the timer) are ignored.
    live: !!live, ended: false,
    score: 0, duration: 0, firstMissSliced: null,
  };
}
function freshLife(src) {
  const s = src && typeof src === 'object' ? src : {};
  const pos = (x) => Math.max(0, num(x));
  return {
    ...counters(s),
    runs: Math.floor(pos(s.runs)),
    bestArcade: pos(s.bestArcade), bestClassic: pos(s.bestClassic), bestDaily: pos(s.bestDaily),
    playTime: pos(s.playTime),
    // Distinct UTC days on which a Daily round was finished.
    dailyPlayed: Math.floor(pos(s.dailyPlayed)),
    dailyDay: typeof s.dailyDay === 'string' ? s.dailyDay : '',
    dailyDayBest: pos(s.dailyDayBest),
  };
}
function freshState(src) {
  const s = src && typeof src === 'object' && src.v === VERSION ? src : {};
  const lanes = LANES.map((_, i) => {
    const l = Array.isArray(s.lanes) && s.lanes[i] && typeof s.lanes[i] === 'object' ? s.lanes[i] : {};
    return { idx: Math.max(0, Math.floor(num(l.idx))), since: Math.max(0, Math.floor(num(l.since))) };
  });
  return {
    v: VERSION,
    points: Math.max(0, num(s.points)),
    lanes,
    done: Array.isArray(s.done) ? s.done.filter((id) => typeof id === 'string') : [],
    life: freshLife(s.life),
    blade: typeof s.blade === 'string' ? s.blade : DEFAULT_BLADE,
  };
}

export class Missions {
  constructor() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* private mode or bad JSON */ }
    this.state = freshState(saved);
    this.life = this.state.life;
    // Before the first runStart the run counters are empty and belong to no
    // round, so per-run missions read 0 and lifetime ones read saved totals.
    this.run = freshRun(this.life.runs, 'arcade', false);
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { /* ignore */ }
  }

  // Wipe everything. Kept for a settings button; never called by the game.
  reset() {
    this.state = freshState(null);
    this.life = this.state.life;
    this.run = freshRun(0, 'arcade', false);
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  // ---- run lifecycle ----
  runStart(mode = 'arcade') {
    // A round that was started but never ended (quit, restart) does not
    // count as a run and completes nothing, but what was sliced in it still
    // belongs to the lifetime totals, so persist those before moving on.
    if (this.run.live && !this.run.ended) this.save();
    this.run = freshRun(this.life.runs + 1, mode, true);
  }

  // Optional, cheap: call whenever the HUD score changes so score missions
  // show live progress. runEnd() does not depend on it.
  runTick({ score } = {}) {
    const r = this.run;
    if (!r.live || r.ended) return;
    r.score = Math.max(r.score, num(score));
  }

  track(event, value = 1) {
    if (!EVENTS.includes(event)) return false;
    const r = this.run, l = this.life;
    if (!r.live || r.ended) return false;
    const v = Math.max(0, num(value, 1));
    r.count[event] += 1; r.sum[event] += v; r.max[event] = Math.max(r.max[event], v);
    l.count[event] += 1; l.sum[event] += v; l.max[event] = Math.max(l.max[event], v);
    if (event === 'miss' && r.firstMissSliced == null) r.firstMissSliced = r.sum.slice;
    return true;
  }

  runEnd({ score, mode, duration, maxCombo, sliced } = {}) {
    const r = this.run, l = this.life;
    const before = this.rank();
    if (!r.live || r.ended) {
      return { completed: [], points: 0, rankBefore: before, rankAfter: before, newUnlocks: [] };
    }
    if (MODES.includes(mode)) r.mode = mode;
    r.score = Math.max(r.score, num(score));
    r.duration = Math.max(0, num(duration));
    // The game's own totals win over the events if the integrator tracked
    // fewer slices or never reported the biggest combo.
    const extra = num(sliced) - r.sum.slice;
    if (extra > 0) { r.sum.slice += extra; l.sum.slice += extra; }
    const mc = num(maxCombo);
    if (mc > r.max.combo) r.max.combo = mc;
    if (mc > l.max.combo) l.max.combo = mc;
    r.ended = true;
    r.live = false;

    l.runs += 1;
    l.playTime += r.duration;
    if (r.mode === 'arcade') l.bestArcade = Math.max(l.bestArcade, r.score);
    if (r.mode === 'classic') l.bestClassic = Math.max(l.bestClassic, r.score);
    if (r.mode === 'daily') {
      l.bestDaily = Math.max(l.bestDaily, r.score);
      const day = today();
      if (l.dailyDay !== day) { l.dailyDay = day; l.dailyDayBest = 0; l.dailyPlayed += 1; }
      l.dailyDayBest = Math.max(l.dailyDayBest, r.score);
    }

    const unlocksBefore = this.unlocks();
    const completed = [];
    let earned = 0;
    // Evaluate until nothing new completes. A mission revealed by a
    // completion is stamped with this run number, so a per-run one only
    // starts counting from the next round while a lifetime one may finish now.
    for (let guard = 0; guard < 12; guard++) {
      let any = false;
      for (let i = 0; i < this.state.lanes.length; i++) {
        const lane = this.state.lanes[i];
        const t = templateFor(i, lane.idx);
        if (!this.evaluate(t, lane).done) continue;
        completed.push({ id: t.id, text: t.text, points: t.points });
        this.state.points += t.points;
        earned += t.points;
        this.state.done.push(t.id);
        lane.idx += 1; lane.since = r.no;
        any = true;
      }
      if (!any) break;
    }
    this.save();
    const after = this.rank();
    const newUnlocks = this.unlocks().filter((id) => !unlocksBefore.includes(id));
    return { completed, points: earned, rankBefore: before, rankAfter: after, newUnlocks };
  }

  evaluate(t, lane) {
    // A per-run mission assigned at the end of round N is gated until N+1.
    const gated = t.scope === 'run' && this.run.no <= lane.since;
    const raw = gated ? 0 : num(t.prog(this.run, this.life));
    return { progress: Math.max(0, Math.min(t.goal, Math.floor(raw))), done: raw >= t.goal };
  }

  // ---- queries ----
  list() {
    return this.state.lanes.map((lane, i) => {
      const t = templateFor(i, lane.idx);
      const { progress, done } = this.evaluate(t, lane);
      return {
        id: t.id, text: t.text, progress, goal: t.goal, done, points: t.points,
        scope: t.scope, label: `${fmt(progress)} / ${fmt(t.goal)}`,
      };
    });
  }

  rank() {
    const p = this.state.points;
    let i = 0;
    while (i + 1 < RANK_THRESHOLDS.length && p >= RANK_THRESHOLDS[i + 1]) i++;
    const top = i === RANK_THRESHOLDS.length - 1;
    const lo = RANK_THRESHOLDS[i], hi = top ? null : RANK_THRESHOLDS[i + 1];
    const frac = top ? 1 : (p - lo) / (hi - lo);
    // One decimal, floored, so 39 points reads 1.9 and never rounds up to
    // a level whose title the player has not earned.
    const level = top ? 9 : Math.min(i + 1.9, Math.floor((i + 1 + frac) * 10 + 1e-9) / 10);
    return { points: p, level, title: RANK_TITLES[i], nextAt: hi, progress: frac };
  }

  stats() {
    const l = this.life;
    return {
      runs: l.runs,
      bestArcade: l.bestArcade, bestClassic: l.bestClassic, bestDaily: l.bestDaily,
      sliced: l.sum.slice, combos: l.count.combo, bestCombo: l.max.combo,
      bosses: l.count.boss, powerups: l.count.power, quakes: l.count.quake,
      shieldHits: l.count.shieldhit, dailyPlayed: l.dailyPlayed, points: this.state.points,
      // Extras beyond the core set, handy for a stats screen.
      bossHits: l.sum.boss, cleanCuts: l.count.clean, misses: l.count.miss,
      watchers: l.sum.watcher, golems: l.sum.golem, moths: l.sum.moth,
      probes: l.sum.probe, prisms: l.sum.prism,
      bestDailyToday: l.dailyDay === today() ? l.dailyDayBest : 0,
      playTime: l.playTime, missions: this.state.done.length,
    };
  }

  unlocks() {
    const lvl = Math.floor(this.rank().level);
    return BLADES.filter((b) => b.level <= lvl).map((b) => b.id);
  }

  getBlade() {
    return this.unlocks().includes(this.state.blade) ? this.state.blade : DEFAULT_BLADE;
  }

  setBlade(id) {
    if (!this.unlocks().includes(id)) return false;
    this.state.blade = id;
    this.save();
    return true;
  }
}
