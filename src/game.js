// Fault Line — core loop. The screen is a seismogram and the swipe is the
// fault line drawn on it: glass is tossed up from below and shatters when the
// stroke crosses it; redaction blocks are shielded and must not be cut. Logical playfield: landscape 600 tall, portrait 440 wide.
//
// Modes: arcade (60 s, then the Core), daily (arcade on a shared seed),
// classic (three cracks: a missed target or a cut block is a crack).

import { Paper } from './paper.js';
import { mulberry32 } from './rng.js';
import { Sfx } from './audio.js';
import { Music } from './music.js';
import { TYPES, BASE_TYPES, POWERS, buildSprites, spriteKey, drawBoss } from './targets.js';
import { Blade, BLADE_SKINS, segDist } from './blade.js';
import { magnitudeFor, tierFor } from './score.js';

export const ROUND = 60;
const BOSS_TIME = 3.4;
const COMBO_WINDOW = 0.3;      // s between cuts of one stroke that still chain
const BLITZ_WINDOW = 3;         // s without a combo before the blitz chain drops
const MIN_SPEED = 220;         // logical px/s: a resting finger does not cut
const HIT_SCALE = 1.28;        // glass is generous
const BLOCK_SCALE = 0.74;      // shielded blocks are forgiving
const CLEAN_FRAC = 0.34;       // cut within this fraction of the radius = clean cut
const GRAVITY = 820;           // at H = 600; scaled with the playfield height
const MAX_PARTS = 300;
const BLITZ = ['', 'Blitz', 'Great', 'Awesome', 'Super', 'Hyper', 'Unreal'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const now = () => performance.now() / 1000;

export class Game {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d');
    this.hooks = hooks;
    this.sfx = new Sfx();
    this.music = new Music(() => this.sfx.ctx, () => this.sfx.musicBus);
    this.music.start();
    this.bg = new Paper();
    this.settings = { shake: true };
    this.skin = 'pearl';
    this.state = 'title';
    this.mode = 'arcade';
    this.best = 0;
    this.needTutorial = false;
    this.blockHints = 0;
    this.rt = 0;
    this.last = performance.now();
    this.rng = Math.random; this.frng = Math.random;
    this.resize();
    this.reset();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => { setTimeout(() => this.resize(), 120); setTimeout(() => this.resize(), 500); });
    requestAnimationFrame((ts) => this.loop(ts));
  }

  resize() {
    // the layout viewport: the soft keyboard must not re-lay out the playfield
    const de = document.documentElement || {};
    const vw = de.clientWidth || window.innerWidth || 960, vh = de.clientHeight || window.innerHeight || 540;
    const oW = this.W, oH = this.H, wasPortrait = this.portrait;
    // cap the backing store near 2.1 MP so mid-range phones hold 60 fps
    const dpr = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(2.1e6 / Math.max(1, vw * vh)));
    this.portrait = vh > vw;
    if (this.portrait) { this.W = 440; this.H = clamp(Math.round(this.W * vh / vw), 700, 960); }
    else { this.H = 600; this.W = clamp(Math.round(this.H * vw / vh), 800, 1300); }
    this.scale = Math.min(vw / this.W, vh / this.H);
    this.dpr = dpr;
    this.canvas.width = Math.round(this.W * this.scale * dpr);
    this.canvas.height = Math.round(this.H * this.scale * dpr);
    this.canvas.style.width = Math.round(this.W * this.scale) + 'px';
    this.canvas.style.height = Math.round(this.H * this.scale) + 'px';
    const rect = this.canvas.getBoundingClientRect();
    this.ox = rect.left; this.oy = rect.top;
    this.g = GRAVITY * this.H / 600;
    const q = Math.min(3, dpr * this.scale);
    this.bg.resize(this.W, this.H, q);
    this.sprites = buildSprites(q);
    // a rotation or window resize mid-round: carry everything in the air into the new field
    if (oW && this.targets && (oW !== this.W || oH !== this.H)) {
      const sx = this.W / oW, sy = this.H / oH;
      for (const o of this.targets) { o.x *= sx; o.vx *= sx; o.y *= sy; o.vy *= sy; }
      for (const o of this.pieces) { o.x *= sx; o.vx *= sx; o.y *= sy; o.vy *= sy; }
      for (const it of this.queue) { it.x0 *= sx; it.xl *= sx; }
      for (const c of this.crackMarks) { for (const pt of c.pts) { pt[0] *= sx; pt[1] *= sy; } for (const pt of c.br) { pt[0] *= sx; pt[1] *= sy; } }
      if (this.boss) { this.boss.x = this.W / 2; this.boss.ty = this.H * 0.42; this.boss.y *= sy; }
      this.parts.length = 0; this.popups.length = 0;
      this.clearBlades();
      if (wasPortrait !== this.portrait && this.state === 'playing') this.togglePause();
    }
  }
  toLogical(cx, cy) { return [(cx - this.ox) / this.scale, (cy - this.oy) / this.scale]; }

  reset() {
    this.score = 0; this.sliced = 0; this.cracks = 0; this.combos = 0; this.maxCombo = 0; this.cleans = 0;
    this.shieldHits = 0; this.bossHits = 0; this.chain = 0; this.lastComboAt = -9; this.powersUsed = 0; this.bonuses = []; this.nextHeal = 100; this.pity = false; this.tutStage = 0;
    this.targets = []; this.pieces = []; this.parts = []; this.popups = []; this.crackMarks = []; this.queue = [];
    this.blades = new Map(); this.fading = [];
    this.power = { amp: 0, stasis: 0, frenzy: 0 };
    this.wt = 0; this.elapsed = 0; this.nextWave = 0.7; this.timeLeft = ROUND; this.phase = 'round';
    this.boss = null; this.endT = 0; this.finaleT = 0; this.frenzyT = 0; this.powerPlan = []; this.nextPowerAt = 30;
    this.shake = 0; this.flash = 0; this.flashCol = '252,252,252'; this.hitstop = 0; this.bladeLock = 0;
    this.banner = null; this.scorePulse = 0; this.lastTick = 6; this.timeScale = 1; this.tutTries = 0;
  }

  start(mode = 'arcade', seed = 0, date = null) {
    this.mode = mode;
    this.timed = mode !== 'classic';
    this.seed = seed >>> 0;
    const s = this.seed || ((Math.random() * 0xffffffff) >>> 0) || 1;
    // The course: each wave draws from its own stream, keyed by seed and wave
    // number, so nothing the player does can shift what comes next.
    this.courseSeed = s; this.waveNo = 0;
    this.rng = mulberry32(s); this.frng = mulberry32((s ^ 0x9e3779b9) >>> 0);
    this.runDate = date || new Date().toISOString().slice(0, 10);
    this.reset();
    this.state = 'playing';
    this.startedAt = performance.now();
    const r = this.rng;
    if (this.timed) {
      const kinds = ['overclock', 'amp', 'stasis', 'quake'];
      for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      this.powerPlan = [{ at: 9 + r() * 6, kind: kinds[0] }, { at: 25 + r() * 7, kind: kinds[1] }, { at: 41 + r() * 7, kind: kinds[2] }];
    } else this.nextPowerAt = 50 + Math.floor(r() * 30);
    if (this.needTutorial) { this.phase = 'tutorial'; this.tutStage = 0; this.tutTries = 0; this.tutorialToss(); }
    this.sfx.ensure();
    this.music.start(); this.music.setDanger(0); this.music.setBlitz(0); this.music.setIntensity(0.15); this.music.setState('playing');
    this.sfx.start();
  }

  // ---------- input ----------
  bladeStart(id, x, y) {
    if (this.state === 'paused' || this.state === 'over') return;
    const old = this.blades.get(id);
    if (old) { this.endCombo(old); old.down = false; this.fading.push(old); }
    const b = new Blade();
    b.add(x, y, now());
    this.blades.set(id, b);
  }
  bladeMove(id, x, y) {
    let b = this.blades.get(id);
    if (!b) {
      // a finger that went down while paused, or across a restart: give it a blade now
      if (this.state === 'paused' || this.state === 'over') return;
      b = new Blade(); this.blades.set(id, b);
    }
    const t = now(), l = b.last();
    const x0 = l ? l.x : x, y0 = l ? l.y : y;
    if (!b.add(x, y, t)) return;
    if (this.state === 'paused' || this.state === 'over' || this.bladeLock > 0 || this.phase === 'ending') return;
    const sp = b.speed(t);
    if (sp < MIN_SPEED) return;
    if (sp > 1100 && t - b.whoosh > 0.22) { b.whoosh = t; this.sfx.whoosh(); }
    this.cutSegment(b, x0, y0, x, y);
  }
  bladeEnd(id) {
    const b = this.blades.get(id);
    if (!b) return;
    this.blades.delete(id);
    this.endCombo(b);
    b.down = false;
    this.fading.push(b);
  }
  clearBlades() {
    for (const b of this.blades.values()) { b.count = 0; b.pts.length = 0; }
  }
  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused'; this.clearBlades(); this.music.stop();
      this.hooks.onPause && this.hooks.onPause(true);
    } else if (this.state === 'paused') {
      this.state = 'playing'; this.last = performance.now();
      this.music.start(); this.music.setState('playing');
      this.hooks.onPause && this.hooks.onPause(false);
    }
  }
  toTitle() {
    this.state = 'title'; this.reset();
    this.music.start(); this.music.setState('title');
  }

  // ---------- cutting ----------
  cutSegment(b, x0, y0, x1, y1) {
    const ang = Math.atan2(y1 - y0, x1 - x0);
    const boss = this.boss;
    // one hit per pass, and the Core itself needs a beat between hits
    if (boss && boss.alive && boss.t > 0.4 && this.rt - b.lastBoss > 0.12 && this.rt - boss.lastHit > 0.07 && segDist(x0, y0, x1, y1, boss.x, boss.y) < boss.r) {
      b.lastBoss = this.rt; boss.lastHit = this.rt;
      this.bossHit(ang, x1, y1);
    }
    for (const o of this.targets) {
      if (!o.alive || o.blown) continue;
      const d = segDist(x0, y0, x1, y1, o.x, o.y);
      if (o.type === 'block') {
        if (d < o.r * BLOCK_SCALE) { this.hitBlock(o); return; }
        continue;
      }
      if (d > o.r * HIT_SCALE) continue;
      if (o.type === 'power') this.takePower(o);
      else this.slice(o, b, ang, d);
    }
  }

  slice(o, b, ang, dist) {
    o.alive = false;
    const T = TYPES[o.type], mult = this.power.amp > 0 ? 2 : 1;
    const clean = dist < o.r * CLEAN_FRAC;
    let pts = T.pts * mult;
    if (clean) { pts += mult; this.cleans++; }
    this.score += pts; this.sliced++; this.scorePulse = 1;
    this.halves(o, ang);
    this.frags(o.x, o.y, 9, o.vx, o.vy, ang);
    if (this.mode === 'classic' && this.state === 'playing' && this.score >= this.nextHeal) {
      this.nextHeal += 100;
      if (this.cracks > 0 && this.phase === 'round') { this.cracks--; this.crackMarks.pop(); this.music.setDanger(this.cracks); this.popup(this.W / 2, this.H * 0.3, 'CRACK REPAIRED', 18, '82,53,66', 1.4); this.sfx.power(); }
    }
    this.addPart({ kind: 'cut', x: o.x, y: o.y, ang, len: o.r * 1.7, t: 0, life: 0.16 });
    if (clean) { this.addPart({ kind: 'star', x: o.x, y: o.y, t: 0, life: 0.35, size: 20 }); this.popup(o.x, o.y - o.r - 8, `clean +${pts}`, 13); }
    else if (pts >= 2) this.popup(o.x, o.y - o.r - 8, `+${pts}`, 14);
    if (b) {
      if (this.rt - b.lastSlice > COMBO_WINDOW) { this.endCombo(b); b.count = 0; b.cx = 0; b.cy = 0; }
      b.count++; b.cx += o.x; b.cy += o.y; b.lastSlice = this.rt;
      this.sfx.slice(b.count, clean);
    }
    this.emit('slice', 1); this.emit(o.type, 1); if (clean) this.emit('clean', 1);
    this.vibrate(8);
    if (this.phase === 'tutorial' && o.tut) this.tutSliced = (this.tutSliced || 0) + 1;
  }

  endCombo(b) {
    const n = b.count;
    b.count = 0;
    if (n < 3 || this.state === 'title') return;
    this.awardCombo(n, b.cx / n, b.cy / n);
  }
  // A combo pays its size again. Combos in quick succession build the blitz:
  // every third one raises the tier, and each combo then pays tier x 5 on top.
  awardCombo(n, x, y) {
    const mult = this.power.amp > 0 ? 2 : 1;
    this.chain = this.rt - this.lastComboAt < BLITZ_WINDOW ? this.chain + 1 : 1;
    this.lastComboAt = this.rt;
    const tier = Math.min(6, Math.floor(this.chain / 3));
    const blitz = tier * 5 * mult, bonus = n * mult;
    this.score += bonus + blitz; this.scorePulse = 1;
    this.combos++; this.maxCombo = Math.max(this.maxCombo, n);
    x = clamp(x, 90, this.W - 90); y = clamp(y, 130, this.H - 140);
    this.music.setBlitz(tier);
    this.popup(x, y, `AFTERSHOCK x${n}`, 20, '82,53,66', 1.1, `+${bonus}`);
    if (blitz) this.popup(x, y + 42, `${BLITZ[tier].toLowerCase()} +${blitz}`, 13, '130,90,109', 1);
    this.sfx.combo(n);
    this.hitstop = Math.max(this.hitstop, n >= 5 ? 0.07 : 0.035);
    this.shake = Math.max(this.shake, n >= 5 ? 8 : 4);
    this.emit('combo', n);
    this.vibrate(18);
  }

  hitBlock(o) {
    o.alive = false;
    this.shieldHits++;
    this.bladeLock = 0.6;
    this.clearBlades();
    this.chain = 0; this.lastComboAt = -9; this.music.setBlitz(0);
    this.power.amp = 0; this.power.stasis = 0; this.power.frenzy = 0;
    this.hitstop = 0.11; this.pity = true;
    this.flash = 0.55; this.flashCol = '22,22,22';
    this.shake = 13;
    this.sfx.clang();
    this.vibrate([30, 30, 60]);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * 6.28, s = 120 + Math.random() * 380;
      this.addPart({ kind: 'stone', x: o.x, y: o.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 14, size: 4 + Math.random() * 8, t: 0, life: 0.8 + Math.random() * 0.5, col: ['#161616', '#3D2731', '#523542'][i % 3] });
    }
    this.addPart({ kind: 'ring', x: o.x, y: o.y, t: 0, life: 0.5, r0: 20, r1: 220 });
    // the blast throws everything else clear; none of it counts for or against you
    for (const t of this.targets) {
      if (!t.alive || t.type === 'power') continue;
      const dx = t.x - o.x, dy = t.y - o.y, d = Math.hypot(dx, dy) || 1;
      t.blown = true; t.vx += (dx / d) * 520; t.vy += (dy / d) * 520 - 180; t.vr *= 3;
    }
    if (this.mode === 'classic') { this.addCrack(o.x, 'shield'); }
    else {
      const loss = Math.min(10, this.score);
      this.score -= loss;
      this.popup(o.x, o.y - 40, `shielded -${loss}`, 16, '22,22,22', 1.2);
    }
    this.emit('shieldhit', 1);
  }

  takePower(o) {
    o.alive = false;
    const P = POWERS[o.kind];
    this.powersUsed++;
    this.frags(o.x, o.y, 10, o.vx, o.vy);
    this.addPart({ kind: 'ring', x: o.x, y: o.y, t: 0, life: 0.45, r0: 16, r1: 160 });
    this.banner = { t: 1.9, title: P.name.toUpperCase(), sub: P.text };
    this.sfx.power();
    this.vibrate(25);
    if (o.kind === 'overclock') { this.power.frenzy = P.dur; this.frenzyT = 0; }
    else if (o.kind === 'amp') this.power.amp = P.dur;
    else if (o.kind === 'stasis') this.power.stasis = P.dur;
    else if (o.kind === 'quake') this.quake();
    this.emit('power', 1);
  }

  quake() {
    let n = 0, sx = 0, sy = 0;
    for (const t of this.targets) {
      if (!t.alive || t.blown) continue;
      if (t.type === 'block') { t.alive = false; t.blown = true; continue; }
      if (t.type === 'power') continue;
      sx += t.x; sy += t.y; n++;
      this.slice(t, null, Math.random() * Math.PI, t.r);
    }
    this.shake = 16; this.flash = 0.5; this.flashCol = '130,90,109';
    this.sfx.quake();
    this.bg.pulse(this.W / 2);
    this.vibrate([40, 40, 80]);
    if (n >= 3) this.awardCombo(n, sx / n, sy / n);
    this.emit('quake', 1);
  }

  bossHit(ang, x, y) {
    const b = this.boss, mult = this.power.amp > 0 ? 2 : 1;
    b.hits++; this.bossHits++; b.punch = 1;
    this.score += mult; this.scorePulse = 1;
    const c = Math.cos(ang), s = Math.sin(ang), off = (Math.random() - 0.5) * 70, nx = -s * off, ny = c * off;
    const j = () => (Math.random() - 0.5) * 12;
    b.cracks.push([[-c * 62 + nx, -s * 62 + ny], [-c * 20 + nx + j(), -s * 20 + ny + j()], [c * 18 + nx + j(), s * 18 + ny + j()], [c * 62 + nx, s * 62 + ny]]);
    if (b.cracks.length > 26) b.cracks.shift();
    this.frags(x, y, 4, c * 120, s * 120);
    this.sfx.bossHit(b.hits);
    this.shake = Math.max(this.shake, 3);
    this.vibrate(6);
  }
  breakBoss() {
    const b = this.boss, mult = this.power.amp > 0 ? 2 : 1;
    b.alive = false;
    const bonus = 10 * mult;
    this.score += bonus; this.scorePulse = 1;
    for (let i = 0; i < 5; i++) this.frags(b.x + (Math.random() - 0.5) * 100, b.y + (Math.random() - 0.5) * 100, 10, 0, -80);
    this.addPart({ kind: 'ring', x: b.x, y: b.y, t: 0, life: 0.7, r0: 40, r1: 420 });
    this.popup(b.x, b.y, `CORE x${b.hits}`, 24, '82,53,66', 1.6, `+${b.hits * mult + bonus}`);
    this.shake = 18; this.flash = 0.7; this.flashCol = '130,90,109';
    this.sfx.bossBreak();
    this.bg.pulse(b.x);
    this.vibrate([60, 40, 120]);
    this.emit('boss', b.hits);
    this.boss = null;
    this.phase = 'ending'; this.endT = 1.5;
  }

  // ---------- classic cracks ----------
  addCrack(x, why) {
    this.cracks++;
    const H = this.H, pts = [[x, H]];
    let cx = x, cy = H;
    for (let i = 0; i < 6; i++) { cx += (Math.random() - 0.5) * 46; cy -= 26 + Math.random() * 30; pts.push([cx, cy]); }
    const br = [[pts[3][0], pts[3][1]], [pts[3][0] + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 30), pts[3][1] - 30 - Math.random() * 20]];
    this.crackMarks.push({ pts, br, t: 0 });
    this.music.setDanger(this.cracks);
    this.shake = Math.max(this.shake, 7);
    this.pity = true;
    if (why === 'miss') { this.sfx.miss(); this.popup(clamp(x, 50, this.W - 50), H - 70, 'missed', 14, '82,53,66', 1); this.vibrate(40); }
    if (this.cracks >= 3) {
      this.phase = 'ending'; this.endT = 1.4; this.timeScale = 0.35;
      this.clearBlades();
      this.flash = 0.6; this.flashCol = '22,22,22';
      this.sfx.bossBreak();
      this.music.duck(1.2);
    }
  }

  // ---------- spawning ----------
  intensity() {
    return this.timed ? clamp(1 - this.timeLeft / ROUND, 0, 1) : Math.min(1, this.sliced / 160);
  }
  pickType(r, k) {
    const w = [['orb', 5], ['lens', 3], ['prism', 3], ['dart', k > 0.15 ? 2 : 0], ['star', k > 0.3 ? 1.4 : 0]];
    let total = 0;
    for (const [, x] of w) total += x;
    let v = r() * total;
    for (const [n, x] of w) { v -= x; if (v <= 0) return n; }
    return 'orb';
  }
  // First run only. Beat 1: one slow Orb, re-tossed until it is cut.
  // Beat 2: three in a row, to show that one swipe through all of them pays more.
  tutorialToss() {
    const W = this.W;
    this.tutSliced = 0; this.tutLive = true;
    if (this.tutStage === 0) this.queue.push({ at: this.wt + 0.5, type: 'orb', x0: W * 0.5, xl: W * 0.5 + 10, apex: 0.62, tut: true });
    else for (const k of [-1, 0, 1]) this.queue.push({ at: this.wt + 0.6, type: 'orb', x0: W * 0.5 + k * 30, xl: W * 0.5 + k * Math.min(120, W * 0.24), apex: 0.6, tut: true });
    this.tutTries++;
  }
  tutorialStep() {
    if (this.phase !== 'tutorial' || !this.tutLive) return;
    if (this.queue.some((q) => q.tut) || this.targets.some((o) => o.tut && o.alive)) return;
    this.tutLive = false;
    if (this.tutStage === 0) {
      if (!this.tutSliced && this.tutTries < 4) { this.tutorialToss(); return; }
      this.tutStage = 1; this.tutTries = 0; this.tutorialToss(); return;
    }
    if (this.tutSliced < 3 && this.tutTries < 2) { this.tutorialToss(); return; }
    // the lesson is not part of the round: start the clock and the count from zero
    this.phase = 'round'; this.wt = 0; this.nextWave = 0.8; this.waveNo = 0;
    this.score = 0; this.sliced = 0; this.cleans = 0; this.combos = 0; this.maxCombo = 0; this.chain = 0; this.lastComboAt = -9;
    for (const b of this.blades.values()) { b.count = 0; b.cx = 0; b.cy = 0; }
    this.needTutorial = false;
    this.hooks.onTutorial && this.hooks.onTutorial();
  }

  spawnWave() {
    const r = mulberry32((this.courseSeed + Math.imul(++this.waveNo, 0x9E3779B1)) >>> 0), W = this.W, k = this.intensity();
    const early = this.wt < 6;
    const kinds = [['single', early ? 3 : k < 0.2 ? 2 : 0.6], ['pair', 3 - k * 1.5], ['fan', early ? 0 : 1.2 + 3 * k], ['stream', early || k < 0.12 ? 0 : 2], ['burst', k > 0.4 ? 2.5 * k : 0], ['cross', k > 0.3 ? 1 : 0]];
    let total = 0;
    for (const [, x] of kinds) total += x;
    let v = r() * total, kind = 'single';
    for (const [n, x] of kinds) { v -= x; if (v <= 0) { kind = n; break; } }
    const items = [];
    const T = () => this.pickType(r, k);
    if (kind === 'single') {
      const x0 = W * (0.2 + 0.6 * r());
      items.push({ type: T(), x0, xl: x0 + W * (r() - 0.5) * 0.5, apex: 0.6 + 0.22 * r() });
    } else if (kind === 'pair') {
      const a = 0.6 + 0.2 * r();
      items.push({ type: T(), x0: W * (0.18 + 0.14 * r()), xl: W * (0.4 + 0.2 * r()), apex: a });
      items.push({ type: T(), x0: W * (0.68 + 0.14 * r()), xl: W * (0.4 + 0.2 * r()), apex: a + (r() - 0.5) * 0.08 });
    } else if (kind === 'fan') {
      const n = 3 + (k > 0.5 && r() < 0.5 ? 1 : 0) + (k > 0.8 && r() < 0.4 ? 1 : 0);
      const c = W * (0.32 + 0.36 * r()), a = 0.62 + 0.18 * r(), mid = (n - 1) / 2;
      for (let i = 0; i < n; i++) items.push({ type: T(), x0: c + (i - mid) * 16, xl: clamp(c + (i - mid) * W * 0.16, 40, W - 40), apex: a - Math.abs(i - mid) * 0.035 });
    } else if (kind === 'stream') {
      const n = 4 + Math.floor(k * 2.5), dir = r() < 0.5 ? 1 : -1, a = 0.66 + 0.1 * r();
      for (let i = 0; i < n; i++) {
        const f = 0.14 + 0.72 * (i / (n - 1)), x0 = W * (dir > 0 ? f : 1 - f);
        items.push({ type: T(), x0, xl: clamp(x0 + dir * W * 0.07, 40, W - 40), apex: a, delay: i * 0.17 });
      }
    } else if (kind === 'burst') {
      const n = 5 + (k > 0.75 ? 1 : 0), a = 0.6 + 0.16 * r();
      for (let i = 0; i < n; i++) { const x0 = W * (0.1 + 0.8 * (i + r()) / n); items.push({ type: T(), x0, xl: clamp(x0 + W * (r() - 0.5) * 0.2, 40, W - 40), apex: a + (r() - 0.5) * 0.1 }); }
    } else {
      const a = 0.66 + 0.1 * r();
      items.push({ type: T(), x0: W * 0.08, xl: W * 0.9, apex: a });
      items.push({ type: T(), x0: W * 0.92, xl: W * 0.1, apex: a });
      items.push({ type: T(), x0: W * 0.5, xl: W * 0.5 + (r() - 0.5) * 60, apex: a + 0.1 });
    }
    for (const it of items) it.ph = r() * 6.28;   // a Star's wobble is part of the course, not decoration
    // drawn now, before anything player-dependent, so they are the same for everyone
    const planned = items.length, plannedDelay = items.reduce((m, it) => Math.max(m, it.delay || 0), 0), px0 = r(), pxl = r();
    // Shielded blocks, kept fair: none in the opening seconds or the last four,
    // none during Overclock, none right after a crack, never more than two in the
    // air, and launched clear of the glass they travel with.
    const live = this.targets.filter((o) => o.alive && !o.blown);
    const blocksUp = live.filter((o) => o.type === 'block').length;
    const allow = (this.timed ? (this.wt > 6 && this.timeLeft > 4) : this.sliced > 10) && this.power.frenzy <= 0 && !this.pity && blocksUp < 2;
    if (allow && r() < lerp(0.1, this.timed ? 0.22 : 0.26, k)) {
      const count = k > 0.6 && blocksUp === 0 && r() < 0.25 ? 2 : 1;
      for (let c = 0; c < count; c++) {
        // A block needs a lane of its own among whatever leaves the ground near
        // its moment. If the wave has no free lane, it follows the wave alone.
        let bd = 0.25 + r() * 0.2;
        const xl = r(), ap = r();
        let x0 = W * (0.14 + 0.72 * r()), clear = false;
        for (let tries = 0; tries < 6 && !clear; tries++) {
          clear = items.every((it) => Math.abs((it.delay || 0) - bd) > 0.45 || Math.abs(it.x0 - x0) > 80);
          if (!clear) x0 = W * (0.14 + 0.72 * r());
        }
        if (!clear) bd = plannedDelay + 0.6;
        items.push({ type: 'block', x0, xl: clamp(x0 + W * (xl - 0.5) * 0.3, 50, W - 50), apex: 0.5 + 0.2 * ap, delay: bd });
      }
    }
    if (this.pity) { this.pity = false; if (items.length > 1) items.pop(); }
    // never more glass in the air than a thumb can read
    const cap = (this.portrait ? 7 : 9) - live.length;
    while (items.length > Math.max(1, cap)) items.pop();
    if (this.timed) {
      if (this.powerPlan.length && this.wt >= this.powerPlan[0].at && this.timeLeft > 6) {
        const p = this.powerPlan.shift();
        items.push({ type: 'power', kind: p.kind, x0: W * (0.3 + 0.4 * px0), xl: W * (0.3 + 0.4 * pxl), apex: 0.74, delay: 0.2 });
      }
    } else if (this.sliced >= this.nextPowerAt) {
      this.nextPowerAt = this.sliced + 70 + Math.floor(r() * 40);
      items.push({ type: 'power', kind: 'quake', x0: W * (0.3 + 0.4 * px0), xl: W * (0.3 + 0.4 * pxl), apex: 0.74, delay: 0.2 });
    }
    for (const it of items) this.queue.push({ ...it, at: this.wt + (it.delay || 0) });
    // the next wave is timed from what was planned, not from what survived the caps
    let gap = lerp(1.45, 0.9, k) + planned * 0.05 + plannedDelay;
    if (this.timed && this.timeLeft < 9) gap *= 0.8;
    this.nextWave = this.wt + gap;
    this.sfx.toss();
  }

  launch(it) {
    const r = Math.random, T = TYPES[it.type], H = this.H, rad = T.r;
    const y0 = H + rad + 12, h = it.apex * H + rad + 12;
    const vy = -Math.sqrt(2 * this.g * h), time = (2 * -vy) / this.g;
    const o = { type: it.type, kind: it.kind, x: it.x0, y: y0, vx: (it.xl - it.x0) / time, vy, rot: r() * 6.28, vr: (r() - 0.5) * 5, r: rad, t: 0, ph: it.ph || 0, alive: true, entered: false, tut: it.tut };
    if (it.type === 'block') { o.rot = (r() - 0.5) * 0.5; o.vr = (r() - 0.5) * 1.4; }
    else if (it.type === 'power') { o.rot = 0; o.vr = (r() - 0.5) * 0.8; }
    this.targets.push(o);
  }
  sideLaunch() {
    const r = this.frng, W = this.W, H = this.H, side = r() < 0.5 ? -1 : 1;
    const type = this.pickType(r, 0.5), rad = TYPES[type].r;
    this.targets.push({
      type, x: side < 0 ? -rad - 10 : W + rad + 10, y: H * (0.45 + 0.35 * r()),
      vx: -side * (W * 0.42 + r() * W * 0.3), vy: -this.g * (0.36 + r() * 0.26),
      rot: r() * 6.28, vr: (r() - 0.5) * 6, r: rad, t: 0, ph: 0, alive: true, entered: true, free: true,
    });
  }

  // ---------- fx ----------
  addPart(p) { if (this.parts.length < MAX_PARTS) this.parts.push(p); }
  frags(x, y, n, vx = 0, vy = 0, ang = null) {
    for (let i = 0; i < n; i++) {
      // with a cut angle, most shards fly along the blade
      const a = ang == null || i % 3 === 0 ? Math.random() * 6.28 : ang + (Math.random() - 0.5) * 2 + (i % 2 ? Math.PI : 0), s = 70 + Math.random() * 260;
      this.addPart({ kind: 'glass', x, y, vx: Math.cos(a) * s + vx * 0.4, vy: Math.sin(a) * s + vy * 0.4 - 60, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 16, size: 3 + Math.random() * 7, t: 0, life: 0.5 + Math.random() * 0.5 });
    }
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * 6.28, s = 40 + Math.random() * 160;
      this.addPart({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, size: 2 + Math.random() * 2, t: 0, life: 0.3 + Math.random() * 0.3 });
    }
  }
  halves(o, ang) {
    const key = spriteKey(o), ca = ang - o.rot, nx = -Math.sin(ang), ny = Math.cos(ang);
    for (const side of [-1, 1]) {
      this.pieces.push({ key, r: o.r, x: o.x, y: o.y, vx: o.vx * 0.6 + nx * side * 120 + Math.cos(ang) * 40, vy: o.vy * 0.6 + ny * side * 120 - 40, rot: o.rot, vr: o.vr + side * (2 + Math.random() * 3), ca, side, t: 0, life: 0.85 });
    }
  }
  popup(x, y, text, size = 14, col = '22,22,22', life = 0.9, sub = '') { this.popups.push({ x, y, text, size, col, t: 0, life, sub }); }
  emit(name, value) { if (this.state === 'playing' && this.hooks.onEvent) this.hooks.onEvent(name, value); }
  vibrate(p) { if (this.hooks.onVibrate) this.hooks.onVibrate(p); }

  // Timed rounds end with up to three bonuses, the three largest earned.
  roundBonuses() {
    const c = this.maxCombo, list = [];
    const big = c >= 10 ? 55 : c >= 9 ? 50 : c >= 8 ? 40 : c >= 7 ? 30 : c >= 6 ? 20 : c >= 5 ? 10 : c >= 4 ? 5 : 0;
    if (big) list.push({ name: `Aftershock x${c}`, points: big });
    const n = this.combos, many = n >= 30 ? 50 : n >= 20 ? 35 : n >= 15 ? 25 : n >= 10 ? 15 : n >= 5 ? 10 : 0;
    if (many) list.push({ name: `${n} aftershocks`, points: many });
    if (this.shieldHits === 0 && this.sliced >= 20) list.push({ name: 'Nothing shielded was cut', points: 10 });
    if (this.powersUsed >= 3) list.push({ name: 'All three powers', points: 10 });
    if (this.cleans >= 15) list.push({ name: `${this.cleans} clean cuts`, points: 15 });
    list.sort((a, b) => b.points - a.points);
    return list.slice(0, 3);
  }

  finish() {
    this.state = 'over';
    this.music.setState('over');
    this.bonuses = this.timed ? this.roundBonuses() : [];
    for (const b of this.bonuses) this.score += b.points;
    const m = magnitudeFor(this.score);
    this.hooks.onOver && this.hooks.onOver({
      mode: this.mode, score: this.score, sliced: this.sliced, combos: this.combos, maxCombo: this.maxCombo, cleans: this.cleans,
      shieldHits: this.shieldHits, bossHits: this.bossHits, powers: this.powersUsed, cracks: this.cracks, bonuses: this.bonuses,
      duration: (performance.now() - this.startedAt) / 1000, m, tier: tierFor(m), seed: this.seed, date: this.runDate,
    });
  }

  // ---------- loop ----------
  loop(ts) {
    const raw = Math.min(0.05, Math.max(0, (ts - this.last) / 1000));
    this.last = ts;
    if (this.state !== 'paused') this.update(raw);
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.rt += dt;
    const t = now();
    for (const b of this.blades.values()) {
      b.trim(t);
      if (b.count && this.rt - b.lastSlice > COMBO_WINDOW) this.endCombo(b);
    }
    for (const b of this.fading) b.trim(t);
    this.fading = this.fading.filter((b) => b.pts.length > 1);
    this.shake = Math.max(0, this.shake - dt * 26);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.scorePulse = Math.max(0, this.scorePulse - dt * 5);
    this.bladeLock = Math.max(0, this.bladeLock - dt);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.bg.quake = Math.min(1, this.shake / 14);
    this.bg.update(dt);
    if (this.hitstop > 0) { this.hitstop -= dt; this.updateFx(dt * 0.2); return; }

    if (this.state === 'title') {
      this.wt += dt;
      if (this.wt >= this.nextWave) {
        this.nextWave = this.wt + 1.5 + Math.random() * 0.8;
        const x0 = this.W * (0.5 + Math.random() * 0.42);
        this.launch({ type: this.pickType(Math.random, 0.4), x0, xl: x0 + (Math.random() - 0.5) * 120, apex: 0.55 + Math.random() * 0.25 });
      }
      this.physics(dt, false);
      this.updateFx(dt);
      return;
    }
    if (this.state === 'over') { this.physics(dt, false); this.updateFx(dt); return; }

    const stasis = this.power.stasis > 0;
    const wdt = dt * (stasis ? 0.45 : 1) * this.timeScale;
    this.elapsed += dt; this.wt += wdt;
    for (const k of ['amp', 'stasis', 'frenzy']) if (this.power[k] > 0) this.power[k] = Math.max(0, this.power[k] - dt);

    if (this.phase === 'round') {
      if (this.timed) {
        if (!stasis) this.timeLeft -= dt;
        const sec = Math.ceil(this.timeLeft);
        if (sec < this.lastTick && sec >= 1 && sec <= 5) { this.lastTick = sec; this.sfx.tick(); }
        this.music.setIntensity(0.15 + 0.85 * this.intensity());
        if (this.timeLeft <= 0) { this.timeLeft = 0; this.phase = 'finale'; this.finaleT = 0; this.queue.length = 0; this.power.frenzy = 0; }
      } else this.music.setIntensity(0.15 + 0.85 * this.intensity());
      if (this.phase === 'round') {
        if (this.wt >= this.nextWave) this.spawnWave();
        if (this.power.frenzy > 0) {
          this.frenzyT -= wdt;
          while (this.frenzyT <= 0) { this.sideLaunch(); this.frenzyT += 0.13; }
        }
      }
    } else if (this.phase === 'finale') {
      this.finaleT += dt;
      const left = this.targets.some((o) => o.alive && !o.blown && o.type !== 'block');
      if (!left || this.finaleT > 1.6) this.startBoss();
    } else if (this.phase === 'boss') {
      const b = this.boss;
      b.t += dt; b.ph += dt * 3; b.punch = Math.max(0, b.punch - dt * 7);
      b.y += (b.ty - b.y) * (1 - Math.exp(-dt * 6));
      if (b.t > BOSS_TIME + 0.4) this.breakBoss();
    } else if (this.phase === 'ending') {
      this.endT -= dt;
      this.timeScale = Math.min(1, this.timeScale + dt * 0.5);
      if (this.endT <= 0) { this.finish(); return; }
    }
    if (this.phase === 'tutorial') this.tutorialStep();
    if (this.chain && this.rt - this.lastComboAt > BLITZ_WINDOW) { this.chain = 0; this.music.setBlitz(0); }
    // queued launches (streams, tutorial)
    if (this.queue.length) {
      const due = this.queue.filter((q) => q.at <= this.wt);
      if (due.length) { this.queue = this.queue.filter((q) => q.at > this.wt); for (const q of due) this.launch(q); }
    }
    this.physics(wdt, true);
    this.updateFx(dt);
  }

  startBoss() {
    this.phase = 'boss';
    for (const o of this.targets) o.blown = true;
    this.boss = { x: this.W / 2, y: this.H + 120, ty: this.H * 0.42, r: TYPES.boss.r, hits: 0, t: 0, ph: 0, punch: 0, cracks: [], alive: true, lastHit: -9 };
    this.banner = { t: BOSS_TIME, title: 'THE CORE', sub: 'cut it as many times as you can' };
    this.sfx.rise();
    this.music.duck(0.8);
  }

  physics(dt, live) {
    const H = this.H, W = this.W, g = this.g;
    for (const o of this.targets) {
      if (!o.alive) continue;
      o.t += dt; o.vy += g * dt;
      o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt;
      if (o.type === 'star' && !o.blown) o.x += Math.sin(o.t * 7 + o.ph) * 50 * dt;
      if (!o.entered && o.y < H - o.r * 0.3) o.entered = true;
      const gone = (o.y > H + o.r + 40 && o.vy > 0) || o.x < -220 || o.x > W + 220;
      if (!gone) continue;
      o.alive = false;
      if (!live || o.blown || o.free || !o.entered) continue;
      if (o.tut) continue;
      if (o.type === 'block' || o.type === 'power') continue;
      if (this.mode === 'classic' && this.phase === 'round') this.addCrack(clamp(o.x, 20, W - 20), 'miss');
      this.emit('miss', 1);
    }
    this.targets = this.targets.filter((o) => o.alive);
    for (const p of this.pieces) { p.t += dt; p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    this.pieces = this.pieces.filter((p) => p.t < p.life && p.y < H + 120);
  }

  updateFx(dt) {
    const g = this.g;
    for (const p of this.parts) {
      p.t += dt;
      if (p.vx !== undefined) {
        p.vy += (p.kind === 'spark' ? g * 0.25 : g * 0.9) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.rot !== undefined) p.rot += p.vr * dt;
      }
    }
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const p of this.popups) { p.t += dt; p.y -= 26 * dt; }
    this.popups = this.popups.filter((p) => p.t < p.life);
    for (const c of this.crackMarks) c.t += dt;
  }

  // ---------- draw ----------
  draw() {
    const ctx = this.ctx, W = this.W, H = this.H, q = this.dpr * this.scale;
    ctx.setTransform(q, 0, 0, q, 0, 0);
    ctx.save();
    if (this.shake > 0 && this.settings.shake) ctx.translate((Math.random() - 0.5) * this.shake * 1.6, (Math.random() - 0.5) * this.shake * 1.6);
    this.bg.draw(ctx);
    if (this.power.stasis > 0) { ctx.fillStyle = 'rgba(130,90,109,0.1)'; ctx.fillRect(0, 0, W, H); }
    this.drawCracks(ctx);
    this.drawPieces(ctx);
    this.drawParts(ctx);
    this.drawTargets(ctx);
    if (this.boss) this.drawBossLayer(ctx);
    const skin = BLADE_SKINS[this.skin] || BLADE_SKINS.pearl, t = now();
    if (this.bladeLock <= 0) for (const b of this.blades.values()) b.draw(ctx, t, skin);
    for (const b of this.fading) b.draw(ctx, t, skin);
    this.drawPopups(ctx);
    ctx.restore();
    if (this.flash > 0) { ctx.fillStyle = `rgba(${this.flashCol},${this.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    if (this.power.amp > 0) this.edgeGlow(ctx, '130,90,109', 0.22 + 0.06 * Math.sin(this.rt * 8));
    if (this.state !== 'title') this.drawHUD(ctx);
    if (this.phase === 'tutorial' && this.state === 'playing') this.drawTutorial(ctx);
  }

  edgeGlow(ctx, rgb, a) {
    const W = this.W, H = this.H;
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  drawTargets(ctx) {
    for (const o of this.targets) {
      const sp = this.sprites[spriteKey(o)];
      if (!sp) continue;
      ctx.save();
      ctx.translate(o.x, o.y);
      if (o.blown) ctx.globalAlpha = 0.5;
      if (o.type === 'power') {
        ctx.save(); ctx.rotate(this.rt * 1.4);
        ctx.strokeStyle = 'rgba(130,90,109,0.85)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 6]);
        ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
      }
      ctx.rotate(o.rot);
      ctx.drawImage(sp.c, -sp.pad, -sp.pad, sp.pad * 2, sp.pad * 2);
      ctx.restore();
      if (o.type === 'block' && this.blockHints > 0 && !o.blown && this.state === 'playing') this.label(ctx, o.x, o.y + o.r + 22, "SHIELDED · DON'T CUT");
    }
  }
  // a chart annotation: white slip, ink rule, mono capitals
  label(ctx, x, y, text) {
    ctx.save();
    ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
    const w = ctx.measureText(text).width + 18;
    x = clamp(x, w / 2 + 6, this.W - w / 2 - 6);
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fillRect(x - w / 2, y - 14, w, 21);
    ctx.strokeStyle = '#161616'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + 0.5, y - 13.5, w - 1, 20);
    ctx.fillStyle = '#161616'; ctx.fillText(text, x + 0.5, y + 1);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }
  drawPieces(ctx) {
    for (const p of this.pieces) {
      const sp = this.sprites[p.key];
      if (!sp) continue;
      const k = 1 - p.t / p.life, c = Math.cos(p.ca), s = Math.sin(p.ca), P = sp.pad * 1.5, nx = -s * p.side, ny = c * p.side;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(0.75, k * 1.6);
      ctx.beginPath();
      ctx.moveTo(-c * P, -s * P); ctx.lineTo(c * P, s * P); ctx.lineTo(c * P + nx * P, s * P + ny * P); ctx.lineTo(-c * P + nx * P, -s * P + ny * P);
      ctx.closePath(); ctx.clip();
      ctx.drawImage(sp.c, -sp.pad, -sp.pad, sp.pad * 2, sp.pad * 2);
      ctx.strokeStyle = '#3D2731'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-c * p.r, -s * p.r); ctx.lineTo(c * p.r, s * p.r); ctx.stroke();
      ctx.restore();
    }
  }
  drawBossLayer(ctx) {
    const b = this.boss;
    drawBoss(ctx, b);
    const left = clamp(1 - (b.t - 0.4) / BOSS_TIME, 0, 1);
    ctx.strokeStyle = 'rgba(22,22,22,0.12)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(b.x, b.y, 98, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#825A6D'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(b.x, b.y, 98, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke(); ctx.lineCap = 'butt';
    if (b.hits) {
      ctx.fillStyle = '#161616'; ctx.textAlign = 'center';
      ctx.font = `500 ${30 + b.punch * 8}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.fillText('x' + b.hits, b.x, b.y - 118);
    }
  }
  drawParts(ctx) {
    for (const p of this.parts) {
      const k = 1 - p.t / p.life;
      if (p.kind === 'spark') {
        ctx.fillStyle = `rgba(61,39,49,${k * 0.8})`;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.kind === 'glass' || p.kind === 'stone') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, k * 1.7);
        ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(p.size * 0.8, p.size * 0.5); ctx.lineTo(-p.size * 0.7, p.size * 0.6); ctx.closePath();
        if (p.kind === 'glass') { ctx.fillStyle = 'rgba(130,90,109,0.4)'; ctx.fill(); ctx.strokeStyle = 'rgba(61,39,49,0.85)'; ctx.lineWidth = 1; ctx.stroke(); }
        else { ctx.fillStyle = p.col; ctx.fill(); }
        ctx.restore();
      } else if (p.kind === 'cut') {
        const c = Math.cos(p.ang), s = Math.sin(p.ang), L = p.len * (0.6 + 0.6 * (1 - k));
        ctx.strokeStyle = `rgba(22,22,22,${k})`; ctx.lineWidth = 1 + 3 * k; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x - c * L, p.y - s * L); ctx.lineTo(p.x + c * L, p.y + s * L); ctx.stroke();
        ctx.lineCap = 'butt';
      } else if (p.kind === 'ring') {
        const r = lerp(p.r0, p.r1, 1 - k * k);
        ctx.strokeStyle = `rgba(82,53,66,${k * 0.7})`; ctx.lineWidth = 1 + 4 * k;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === 'star') {
        const s = p.size * (0.5 + (1 - k) * 0.9);
        ctx.fillStyle = `rgba(255,255,255,${k})`; ctx.strokeStyle = `rgba(61,39,49,${k})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s * 0.2, p.y - s * 0.2); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x + s * 0.2, p.y + s * 0.2);
        ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s * 0.2, p.y + s * 0.2); ctx.lineTo(p.x - s, p.y); ctx.lineTo(p.x - s * 0.2, p.y - s * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
  }
  drawPopups(ctx) {
    for (const p of this.popups) {
      const age = p.t / p.life, pop = age < 0.12 ? 0.6 + (age / 0.12) * 0.55 : age < 0.2 ? 1.15 - ((age - 0.12) / 0.08) * 0.15 : 1;
      const big = p.size >= 18;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.scale(pop, pop);
      ctx.globalAlpha = Math.min(1, (1 - age) * 2.2);
      ctx.textAlign = 'center';
      ctx.font = big ? `700 ${p.size}px "Instrument Sans", sans-serif` : `500 ${p.size}px "IBM Plex Mono", ui-monospace, monospace`;
      if (big && 'letterSpacing' in ctx) ctx.letterSpacing = '2.5px';
      ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(247,244,245,0.95)';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = `rgb(${p.col})`; ctx.fillText(p.text, 0, 0);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      if (p.sub) {
        ctx.font = `500 ${Math.round(p.size * 0.8)}px "IBM Plex Mono", ui-monospace, monospace`;
        ctx.strokeText(p.sub, 0, p.size * 1.15); ctx.fillStyle = '#161616'; ctx.fillText(p.sub, 0, p.size * 1.15);
      }
      ctx.restore();
    }
  }
  // Classic: each crack is a tear running up the paper from where it happened
  drawCracks(ctx) {
    if (!this.crackMarks.length) return;
    ctx.lineJoin = 'miter';
    for (const c of this.crackMarks) {
      const grow = Math.min(1, c.t * 6), n = Math.max(2, Math.ceil(c.pts.length * grow));
      const line = (pts, w, col) => {
        ctx.beginPath();
        for (let i = 0; i < Math.min(n, pts.length); i++) (i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]));
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
      };
      line(c.pts, 7, 'rgba(130,90,109,0.18)'); line(c.pts, 2, '#161616');
      if (grow >= 1) line(c.br, 1.4, 'rgba(22,22,22,0.8)');
    }
  }
  drawTutorial(ctx) {
    const W = this.W, H = this.H, k = (this.rt * 0.9) % 1;
    this.label(ctx, W / 2, H * 0.2, this.tutStage === 0 ? 'SWIPE THROUGH THE GLASS' : 'ONE SWIPE THROUGH ALL THREE');
    const x0 = W * 0.28, x1 = W * 0.72, y = H * 0.5, x = lerp(x0, x1, Math.min(1, k * 1.4));
    ctx.strokeStyle = `rgba(22,22,22,${0.5 * (1 - k)})`; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([2, 9]);
    ctx.beginPath(); ctx.moveTo(x0, y + 30); ctx.lineTo(x, lerp(y + 30, y - 30, (x - x0) / (x1 - x0))); ctx.stroke();
    ctx.setLineDash([]); ctx.lineCap = 'butt';
  }

  drawHUD(ctx) {
    const W = this.W, MONO = '"IBM Plex Mono", ui-monospace, monospace', SANS = '"Instrument Sans", sans-serif';
    const spacing = (px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; };
    ctx.save();
    const top = ctx.createLinearGradient(0, 0, 0, 130);
    top.addColorStop(0, 'rgba(247,244,245,0.9)'); top.addColorStop(1, 'rgba(247,244,245,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, 130);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(22,22,22,0.6)'; ctx.font = `500 10px ${MONO}`;
    spacing(1.6);
    ctx.fillText(this.mode === 'daily' ? 'SCORE / DAILY' : this.mode === 'classic' ? 'SCORE / CLASSIC' : 'SCORE', 20, 30);
    spacing(0);
    ctx.fillStyle = '#161616';
    ctx.font = `700 ${46 + this.scorePulse * 6}px ${SANS}`;
    spacing(-1.5);
    ctx.fillText(String(this.score), 18, 74);
    spacing(0);
    const beat = this.score > this.best && this.best > 0;
    ctx.fillStyle = beat ? '#825A6D' : 'rgba(22,22,22,0.5)';
    ctx.font = `500 11px ${MONO}`;
    ctx.fillText(beat ? 'new best' : `best ${this.best}`, 20, 93);
    // blitz: the chain of combos, with the time left to keep it alive
    const tier = Math.min(6, Math.floor(this.chain / 3));
    if (this.chain > 0 && this.phase === 'round') {
      const left = clamp(1 - (this.rt - this.lastComboAt) / BLITZ_WINDOW, 0, 1);
      ctx.fillStyle = tier ? '#523542' : 'rgba(22,22,22,0.6)'; ctx.font = `600 10px ${MONO}`;
      spacing(1.2);
      ctx.fillText(tier ? `${BLITZ[tier].toUpperCase()} +${tier * 5}` : `CHAIN ${this.chain}/3`, 20, 114);
      spacing(0);
      ctx.fillStyle = 'rgba(22,22,22,0.12)'; ctx.fillRect(20, 120, 96, 3);
      ctx.fillStyle = tier ? '#825A6D' : 'rgba(22,22,22,0.55)'; ctx.fillRect(20, 120, 96 * left, 3);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(22,22,22,0.6)'; ctx.font = `500 10px ${MONO}`;
    spacing(1.6); ctx.fillText(this.timed ? 'TIME' : 'CRACKS', W - 20, 30); spacing(0);
    if (this.timed) {
      const sec = Math.max(0, Math.ceil(this.timeLeft)), low = sec <= 10 && this.phase === 'round';
      ctx.fillStyle = this.power.stasis > 0 ? '#825A6D' : low ? '#825A6D' : '#161616';
      ctx.font = `600 ${low ? 36 : 32}px ${SANS}`;
      ctx.fillText(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, W - 18, 64);
    } else {
      for (let i = 0; i < 3; i++) {
        const cx = W - 30 - i * 26, hit = this.cracks > 2 - i;
        ctx.beginPath(); ctx.arc(cx, 52, 9, 0, Math.PI * 2);
        if (hit) { ctx.strokeStyle = 'rgba(22,22,22,0.3)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 5, 47); ctx.lineTo(cx + 1, 52); ctx.lineTo(cx - 2, 57); ctx.strokeStyle = 'rgba(22,22,22,0.5)'; ctx.stroke(); }
        else { ctx.fillStyle = '#825A6D'; ctx.fill(); ctx.strokeStyle = '#3D2731'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
    }
    // active power-ups
    let py = this.H - 22;
    for (const [k, name] of [['frenzy', 'overclock'], ['amp', 'amp'], ['stasis', 'stasis']]) {
      if (this.power[k] <= 0) continue;
      const P = POWERS[name], frac = this.power[k] / P.dur;
      ctx.fillStyle = '#161616'; ctx.font = `500 11px ${MONO}`;
      ctx.fillText(P.name.toUpperCase(), W - 20, py);
      ctx.fillStyle = 'rgba(22,22,22,0.14)'; ctx.fillRect(W - 130, py + 5, 110, 3);
      ctx.fillStyle = '#825A6D'; ctx.fillRect(W - 20 - 110 * frac, py + 5, 110 * frac, 3);
      py -= 24;
    }
    if (this.bladeLock > 0) {
      ctx.textAlign = 'center'; ctx.fillStyle = `rgba(22,22,22,${Math.min(1, this.bladeLock * 3)})`;
      ctx.font = `700 14px ${SANS}`; spacing(5);
      ctx.fillText('SHIELDED', W / 2, this.H * 0.5); spacing(0);
    }
    if (this.banner) {
      const a = Math.min(1, this.banner.t * 2.5), y = this.portrait ? 132 : 98;
      ctx.textAlign = 'center';
      ctx.font = `700 15px ${SANS}`;
      spacing(5);
      const bw = ctx.measureText(this.banner.title).width / 2 + 18;
      ctx.fillStyle = `rgba(22,22,22,${a})`;
      ctx.fillText(this.banner.title, W / 2 + 2.5, y);
      spacing(0);
      ctx.strokeStyle = `rgba(22,22,22,${a * 0.7})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W / 2 - bw - 36, y - 5.5); ctx.lineTo(W / 2 - bw, y - 5.5); ctx.moveTo(W / 2 + bw, y - 5.5); ctx.lineTo(W / 2 + bw + 36, y - 5.5); ctx.stroke();
      ctx.fillStyle = `rgba(82,53,66,${a})`;
      ctx.font = `500 12px ${MONO}`;
      ctx.fillText(this.banner.sub, W / 2, y + 22);
    }
    ctx.restore();
  }
}
