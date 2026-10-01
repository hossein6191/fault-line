// Fault Line score: procedural, percussion-led, in A Hirajoshi. Written for
// this game alone. A plucked line over skin and wood drums; the tempo follows
// the round, and the drum kit grows with the blitz tier, so a good run can be
// heard building. A lookahead scheduler books notes on the audio clock.

import { degree } from './audio.js';

const LEVEL = 0.34, LOOKAHEAD = 0.14;
const ROOTS = [110, 87.31, 130.81, 82.41];              // A2 F2 C3 E2, one bar each
const LINE = [0, 2, 4, 2, 3, 4, 7, 4, 5, 4, 2, 3, 4, 2, 1, 0];   // scale degrees, one per eighth
const LINE2 = [4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 5, 2, 0];
const semi = (n) => Math.pow(2, n / 12);

export class Music {
  constructor(getCtx, getMaster) {
    this.getCtx = getCtx; this.getMaster = getMaster;
    this._enabled = true;
    try { this._enabled = localStorage.getItem('fl-music') !== '0'; } catch (e) { /* private mode */ }
    this.state = 'title'; this.intensity = 0; this.danger = 0; this.blitz = 0;
    this.wanted = false; this.timer = null; this.out = null; this.echo = null; this.noiseBuf = null;
    this.step = 0; this.next = 0; this.duckUntil = 0;
  }
  get enabled() { return this._enabled; }
  start() { this.wanted = true; if (!this.timer) this.timer = setInterval(() => this.tick(), 25); this.level(0.4); }
  stop() { this.wanted = false; this.level(0.3); }
  setEnabled(b) {
    this._enabled = Boolean(b);
    try { localStorage.setItem('fl-music', b ? '1' : '0'); } catch (e) { /* ignore */ }
    this.level(0.3);
  }
  setIntensity(x) { this.intensity = Math.max(0, Math.min(1, x)); }
  setDanger(n) { this.danger = n; }
  setBlitz(t) { this.blitz = t; }
  setState(s) { this.state = s; this.level(s === 'over' ? 1.5 : 0.4); }
  duck(seconds = 0.6) {
    const c = this.getCtx();
    if (!c || !this.out) return;
    const t = c.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(this.target() * 0.2, t, 0.03);
    this.out.gain.setTargetAtTime(this.target(), t + seconds * 0.5, seconds * 0.25);
  }
  active() { return this.wanted && this._enabled && this.state !== 'over'; }
  target() { return this.active() ? LEVEL : 0.0001; }
  level(fade) {
    const c = this.getCtx();
    if (!c || !this.out) return;
    this.out.gain.cancelScheduledValues(c.currentTime);
    this.out.gain.setTargetAtTime(this.target(), c.currentTime, fade / 4);
  }
  build(c) {
    this.out = c.createGain(); this.out.gain.value = 0.0001;
    this.out.connect(this.getMaster());
    // a dotted-eighth echo on the plucked line only
    const d = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter();
    d.delayTime.value = 0.3; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2400;
    d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(this.out);
    this.echo = d;
    const n = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, n, n);
    const ch = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    this.level(0.6);
  }
  bpm() { return this.state === 'title' ? 84 : 100 + 46 * this.intensity; }
  tick() {
    const c = this.getCtx();
    if (!c || c.state !== 'running') return;
    if (!this.out) this.build(c);
    if (!this.active()) return;
    const now = c.currentTime;
    if (this.next < now - 0.2) this.next = now + 0.04;   // woke from a stalled tab: do not replay the gap
    while (this.next < now + LOOKAHEAD) {
      this.play(c, this.next, this.step);
      const sixteenth = 60 / this.bpm() / 4;
      if (this.echo) this.echo.delayTime.setTargetAtTime(sixteenth * 3, this.next, 0.05);
      this.next += sixteenth;
      this.step = (this.step + 1) % 128;
    }
  }

  // ---- voices ----
  tone(c, t, { type = 'sine', f0, f1 = f0, dur, gain, attack = 0.003, echo = 0 }) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out);
    if (echo) { const s = c.createGain(); s.gain.value = echo; g.connect(s); s.connect(this.echo); }
    o.start(t); o.stop(t + dur + 0.03);
  }
  hiss(c, t, { dur, gain, type = 'highpass', f, q = 1 }) {
    const s = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(g); g.connect(this.out);
    s.start(t, (t * 7.13) % 0.8); s.stop(t + dur + 0.02);
  }
  kick(c, t, g = 0.9) { this.tone(c, t, { f0: 128, f1: 44, dur: 0.24, gain: g }); this.hiss(c, t, { dur: 0.03, gain: g * 0.2, type: 'lowpass', f: 500 }); }
  tom(c, t, f, g = 0.4) { this.tone(c, t, { f0: f * 1.3, f1: f, dur: 0.2, gain: g }); }
  rim(c, t, g = 0.4) { this.tone(c, t, { type: 'triangle', f0: 1700, f1: 1250, dur: 0.035, gain: g * 0.6, attack: 0.001 }); this.hiss(c, t, { dur: 0.03, gain: g * 0.5, type: 'bandpass', f: 2600, q: 2.5 }); }
  shaker(c, t, g = 0.12) { this.hiss(c, t, { dur: 0.045, gain: g, f: 7000 }); }
  pluck(c, t, f, g = 0.16, echo = 0.5) {
    this.tone(c, t, { type: 'triangle', f0: f, dur: 0.42, gain: g, attack: 0.002, echo });
    this.tone(c, t, { f0: f * 2, dur: 0.14, gain: g * 0.45, attack: 0.001 });
    this.tone(c, t, { f0: f * 3.01, dur: 0.06, gain: g * 0.2, attack: 0.001 });
  }
  bass(c, t, f, g = 0.3) { this.tone(c, t, { type: 'triangle', f0: f, dur: 0.3, gain: g, attack: 0.004 }); this.tone(c, t, { f0: f / 2, dur: 0.34, gain: g * 0.8, attack: 0.004 }); }

  // one sixteenth note
  play(c, t, s) {
    const bar = Math.floor(s / 16), i = s % 16, x = this.intensity, bl = this.blitz;
    const root = ROOTS[bar % 4];
    if (this.state === 'title') {
      // sparse: a slow drum and a wandering line
      if (i === 0 && bar % 2 === 0) this.kick(c, t, 0.45);
      if (i === 8 && bar % 2 === 1) this.tom(c, t, 98, 0.22);
      if (i % 4 === 0 && (s * 7) % 5 !== 0) this.pluck(c, t, 220 * semi(degree(LINE[(s / 4) % 16 | 0])), 0.1, 0.8);
      if (i === 0) this.bass(c, t, root, 0.16);
      return;
    }
    // drums: the kit grows with the round and with the blitz tier
    if (i === 0 || i === 10 || (x > 0.5 && i === 6)) this.kick(c, t, 0.85);
    if (i === 4 || i === 12) this.rim(c, t, 0.4 + 0.3 * x);
    if (x > 0.2 && i % 2 === 0) this.shaker(c, t, 0.08 + 0.08 * x);
    if ((x > 0.65 || bl >= 1) && i % 2 === 1) this.shaker(c, t, 0.06);
    if (bl >= 2 && (i === 3 || i === 7 || i === 11 || i === 14)) this.tom(c, t, 104 + (i % 3) * 26, 0.34);
    if (bl >= 4 && i % 4 === 2) this.rim(c, t, 0.3);
    if (bl >= 5 && i % 4 === 0) this.tom(c, t, 82, 0.4);
    if ((x > 0.7 || bl >= 3) && bar % 4 === 3 && i >= 12) this.tom(c, t, 190 - (i - 12) * 24, 0.42);
    // bass
    if (i === 0 || i === 7 || i === 10) this.bass(c, t, root, 0.3);
    // the line: eighths, with sixteenth pickups late in the round
    if (this.danger >= 2) {
      // two cracks: the tune gives way to a nagging semitone
      if (i % 4 === 0) this.pluck(c, t, 440 * semi(i % 8 === 0 ? 3 : 2), 0.13, 0.6);
    } else if (i % 2 === 0) {
      const line = bar % 8 < 4 ? LINE : LINE2;
      const k = line[((bar % 2) * 8 + i / 2) % 16];
      this.pluck(c, t, 220 * semi(degree(k)), 0.14, 0.45);
    } else if (x > 0.75 && (i === 7 || i === 15)) this.pluck(c, t, 440 * semi(degree(LINE[i % 5] + 2)), 0.08, 0.6);
  }
}
