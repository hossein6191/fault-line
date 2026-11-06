// Fault Line score: procedural, percussion-led, in A Hirajoshi. Written for
// this game alone. A plucked line over skin and wood drums; the tempo follows
// the round, and the drum kit grows with the blitz tier, so a good run can be
// heard building. A lookahead scheduler books notes on the audio clock.
// The Halloween edition (theme.js) plays its own score, below the classic one.

import { degree, TOLL, stage } from './audio.js';
import { HALLOWEEN } from './theme.js';

const LEVEL = 0.34, LOOKAHEAD = 0.14;
const ROOTS = [110, 87.31, 130.81, 82.41];              // A2 F2 C3 E2, one bar each
const LINE = [0, 2, 4, 2, 3, 4, 7, 4, 5, 4, 2, 3, 4, 2, 1, 0];   // scale degrees, one per eighth
const LINE2 = [4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 5, 2, 0];
const semi = (n) => Math.pow(2, n / 12);

class ClassicMusic {
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
    // a fixed delay time: retuning a delay line bends its pitch
    d.delayTime.value = 0.29; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2400;
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
    if (this.next < now) this.next = now + 0.03;   // never book a note in the past (stalled tab, slow frame)
    while (this.next < now + LOOKAHEAD) {
      this.play(c, this.next, this.step);
      this.next += 60 / this.bpm() / 4;
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

// ---- Halloween edition ----
// A haunted-carnival score in A harmonic minor. Title: a music-box waltz, out
// of tune like an old one, with wind and a distant bell. A round: a swung
// skeleton dance, pizzicato oom-pah bass, xylophone bones, a theremin tune
// (the bones take it every other phrase), a church bell on every phrase and a
// pipe organ that joins late and with the blitz. The Great Pumpkin gets its own
// heavier variation in E Phrygian dominant. Same state machine, same API.
const HLEVEL = 0.3, SWING = 0.25;
const WRAP = 768;                       // 64 waltz bars of 12 sixteenths, 48 dance bars of 16
const bassF = (r) => 110 * semi(r >= 5 ? r - 12 : r);    // A2, D2, E2, F2
// eight bars of the dance: the bass root and the chord, in semitones above A
const PROG = [
  { r: 0, ch: [0, 3, 7] }, { r: 5, ch: [5, 8, 12] }, { r: 7, ch: [7, 11, 14] }, { r: 0, ch: [0, 3, 7] },
  { r: 8, ch: [8, 12, 15] }, { r: 5, ch: [5, 8, 12] }, { r: 7, ch: [7, 11, 14] }, { r: 7, ch: [7, 11, 14, 17] },
];
// the tune, per bar: [sixteenth, semitones above A4, length in sixteenths]
const MEL = [
  [[0, 7, 6], [6, 8, 2], [8, 7, 4], [12, 3, 4]],
  [[0, 5, 6], [6, 8, 2], [8, 12, 8]],
  [[0, 11, 6], [6, 8, 2], [8, 7, 4], [12, 5, 4]],
  [[0, 3, 4], [4, 2, 4], [8, 0, 8]],
  [[0, 15, 6], [6, 14, 2], [8, 12, 4], [12, 8, 4]],
  [[0, 12, 6], [6, 11, 2], [8, 8, 4], [12, 5, 4]],
  [[0, 7, 4], [4, 11, 4], [8, 14, 4], [12, 17, 4]],
  [[0, 19, 6], [6, 17, 2], [8, 14, 4], [12, 11, 4]],
];
// the title waltz: bass root, chord, and three melody notes (above A5) per bar
const WALTZ = [
  { r: 0, ch: [0, 3, 7], m: [7, 12, 11] }, { r: 0, ch: [0, 3, 7], m: [12, 7, 3] },
  { r: 5, ch: [5, 8, 12], m: [5, 8, 12] }, { r: 7, ch: [7, 11, 14], m: [11, 8, 7] },
  { r: 0, ch: [0, 3, 7], m: [7, 12, 15] }, { r: 8, ch: [8, 12, 15], m: [15, 12, 8] },
  { r: 7, ch: [7, 11, 14], m: [14, 11, 8] }, { r: 0, ch: [0, 3, 7], m: [7, 3, 0] },
];
// the Great Pumpkin: E and F grinding under a wailing theremin
const FIN = [
  { r: 7, ch: [7, 11, 14, 17], w: [[0, 14, 12], [12, 15, 4]] },
  { r: 8, ch: [8, 12, 15], w: [[0, 15, 8], [8, 12, 8]] },
  { r: 7, ch: [7, 11, 14, 20], w: [[0, 14, 8], [8, 17, 8]] },
  { r: 5, ch: [5, 8, 11, 14], w: [[0, 11, 8], [8, 8, 8]] },
];

class SpookyMusic extends ClassicMusic {
  constructor(getCtx, getMaster) {
    super(getCtx, getMaster);
    this.hall = null; this.wave = null; this.lastLead = 0; this.fs = 0; this.inFinale = false;
  }
  setState(s) {
    if (s !== this.state) {
      if (s === 'playing') this.step = 0;      // a run starts the dance on its first bar
      if (s === 'title' || s === 'over') stage.finale = false;
    }
    super.setState(s);
  }
  target() { return this.active() ? HLEVEL : 0.0001; }
  build(c) {
    super.build(c);
    // a stone hall: a short convolution tail for the bells, the organ and the lead
    const n = Math.round(c.sampleRate * 1.4), ir = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    }
    this.hall = c.createConvolver(); this.hall.buffer = ir;
    const back = c.createGain(); back.gain.value = 0.9;
    this.hall.connect(back); back.connect(this.out);
    // the theremin: a sine with a breath of second and third harmonic
    this.wave = c.createPeriodicWave(new Float32Array([0, 0, 0, 0]), new Float32Array([0, 1, 0.16, 0.06]));
  }
  bpm() { return this.state === 'title' ? 92 : stage.finale ? 138 : 108 + 44 * this.intensity; }
  tick() {
    const c = this.getCtx();
    if (!c || c.state !== 'running') return;
    if (!this.out) this.build(c);
    if (!this.active()) return;
    const now = c.currentTime;
    if (this.next < now) this.next = now + 0.03;   // never book a note in the past
    while (this.next < now + LOOKAHEAD) {
      this.play(c, this.next, this.step);
      this.next += 60 / this.bpm() / 4;
      this.step = (this.step + 1) % WRAP;
    }
  }
  play(c, t, s) {
    if (this.state === 'title') { this.inFinale = false; this.waltz(c, t, s); return; }
    if (stage.finale) {
      if (!this.inFinale) { this.inFinale = true; this.fs = -4; }
      this.finale(c, t, this.fs);
      this.fs = this.fs >= 63 ? 0 : this.fs + 1;
      return;
    }
    this.inFinale = false;
    this.dance(c, t, s);
  }

  // ---- voices ----
  htone(c, t, { type = 'sine', f0, f1 = f0, dur, gain, attack = 0.003, echo = 0, hall = 0, detune = 0 }) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (detune) o.detune.value = detune;
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out);
    this.send(c, g, echo, hall);
    o.start(t); o.stop(t + dur + 0.03);
  }
  send(c, node, echo, hall) {
    if (echo) { const s = c.createGain(); s.gain.value = echo; node.connect(s); s.connect(this.echo); }
    if (hall) { const s = c.createGain(); s.gain.value = hall; node.connect(s); s.connect(this.hall); }
  }
  // a church bell, rung into the hall
  toll(c, t, f, g, ring = 4) {
    for (const [r, a, life] of TOLL) if (f * r < 12000) this.htone(c, t, { f0: f * r, dur: ring * life, gain: g * a, attack: 0.002, hall: 0.6 });
    this.hiss(c, t, { dur: 0.05, gain: g * 0.25, type: 'bandpass', f: Math.min(9000, f * 6), q: 2 });
  }
  // a music-box tine: a slightly out-of-tune comb, its octave, and the bright ping of the second mode
  mbox(c, t, f, g) {
    const det = (Math.random() - 0.5) * 16;
    this.htone(c, t, { f0: f, dur: 1.3, gain: g, attack: 0.001, echo: 0.35, hall: 0.3, detune: det });
    this.htone(c, t, { f0: f * 2, dur: 0.35, gain: g * 0.22, attack: 0.001, detune: det });
    if (f * 5.95 < 12000) this.htone(c, t, { f0: f * 5.95, dur: 0.06, gain: g * 0.16, attack: 0.001 });
  }
  // xylophone: a dry bar with its twelfth and the click of the mallet
  xylo(c, t, f, g, echo = 0.15) {
    this.htone(c, t, { f0: f, dur: 0.2, gain: g, attack: 0.001, echo, hall: 0.12 });
    this.htone(c, t, { f0: f * 3, dur: 0.05, gain: g * 0.35, attack: 0.001 });
    this.hiss(c, t, { dur: 0.012, gain: g * 0.35, type: 'bandpass', f: Math.min(9000, f * 2.5), q: 3 });
  }
  pizz(c, t, f, g) {
    this.htone(c, t, { type: 'triangle', f0: f, dur: 0.24, gain: g, attack: 0.003 });
    this.htone(c, t, { f0: f * 2, dur: 0.09, gain: g * 0.55, attack: 0.002 });
    this.htone(c, t, { f0: f * 3, dur: 0.04, gain: g * 0.25, attack: 0.001 });
  }
  timp(c, t, f, g) {
    this.htone(c, t, { f0: f * 1.2, f1: f, dur: 0.5, gain: g, attack: 0.003, hall: 0.15 });
    this.htone(c, t, { f0: f * 1.5, dur: 0.18, gain: g * 0.3, attack: 0.002 });
    this.hiss(c, t, { dur: 0.04, gain: g * 0.3, type: 'lowpass', f: 400 });
  }
  // two bones knocked together
  clack(c, t, g) {
    this.htone(c, t, { type: 'triangle', f0: 1180, f1: 960, dur: 0.04, gain: g * 0.5, attack: 0.001 });
    this.htone(c, t + 0.021, { type: 'triangle', f0: 1520, f1: 1250, dur: 0.035, gain: g * 0.32, attack: 0.001 });
    this.hiss(c, t, { dur: 0.03, gain: g * 0.4, type: 'bandpass', f: 2300, q: 2.5 });
  }
  rattle(c, t, g) {
    this.hiss(c, t, { dur: 0.035, gain: g, type: 'bandpass', f: 4200, q: 1.6 });
    this.hiss(c, t + 0.016, { dur: 0.025, gain: g * 0.6, type: 'bandpass', f: 3100, q: 2 });
  }
  // theremin: glides in from the last note, the vibrato widening as it holds
  theremin(c, t, f, dur, g, vib = 28, rate = 5.2) {
    const o = c.createOscillator(), v = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
    o.setPeriodicWave(this.wave);
    const from = this.lastLead || f, glide = Math.min(0.16, 0.05 + 0.006 * Math.abs(12 * Math.log2(f / from)));
    this.lastLead = f;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(f, t + glide);
    lfo.frequency.value = rate * (0.92 + Math.random() * 0.16);
    depth.gain.setValueAtTime(vib * 0.3, t);
    depth.gain.linearRampToValueAtTime(vib, t + Math.max(0.05, Math.min(dur, 0.45)));
    lfo.connect(depth); depth.connect(o.detune);
    const end = t + dur + 0.14;
    v.gain.setValueAtTime(0.0001, t);
    v.gain.linearRampToValueAtTime(g, t + 0.05);
    v.gain.linearRampToValueAtTime(g * 0.8, t + Math.max(0.06, dur));
    v.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(v); v.connect(this.out); this.send(c, v, 0.25, 0.35);
    o.start(t); lfo.start(t); o.stop(end + 0.02); lfo.stop(end + 0.02);
  }
  // pipe organ: two detuned squares and an octave sine per note (a sub-octave
  // too when `deep`), one low-pass and one swell for the chord
  organ(c, t, notes, dur, g, cutoff, deep = false) {
    const lp = c.createBiquadFilter(), env = c.createGain(), end = t + dur;
    lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.7;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(g, t + 0.09);
    env.gain.setValueAtTime(g, Math.max(t + 0.09, end - 0.2));
    env.gain.exponentialRampToValueAtTime(0.0001, end + 0.1);
    lp.connect(env); env.connect(this.out); this.send(c, env, 0, 0.45);
    for (const f of notes) {
      const parts = [['square', f, -7], ['square', f, 7], ['sine', f * 2, 0]];
      if (deep) parts.push(['sine', f / 2, 0]);
      for (const [type, fr, det] of parts) {
        const o = c.createOscillator();
        o.type = type; o.frequency.value = fr; o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(end + 0.15);
      }
    }
  }
  // wind: looping noise through a slowly sweeping band-pass
  gust(c, t, dur, g, f0, f1, q = 0.8) {
    const s = c.createBufferSource(), flt = c.createBiquadFilter(), v = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    flt.type = 'bandpass'; flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.55);
    flt.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.linearRampToValueAtTime(g, t + dur * 0.45);
    v.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(v); v.connect(this.out);
    s.start(t, Math.random() * 0.9); s.stop(t + dur + 0.05);
  }
  whisper(c, t, g = 0.05) { this.gust(c, t, 1.1, g, 1800, 3400, 4); this.gust(c, t + 0.5, 0.9, g * 0.7, 2600, 1500, 5); }

  // ---- the three pieces ----
  // title: a music-box waltz, three beats in twelve sixteenths
  waltz(c, t, s) {
    const bar = Math.floor(s / 12), j = s % 12, W = WALTZ[bar % 8], st = 60 / this.bpm() / 4;
    if (j === 0 && bar % 4 === 0) this.toll(c, t, 110, 0.15);
    if (j === 0 && bar % 2 === 0) this.gust(c, t, st * 24 * 1.3, 0.09, 300, 800);
    if (j === 0 && bar % 8 === 5) this.whisper(c, t, 0.04);
    if (j === 0) this.pizz(c, t, bassF(W.r), 0.15);
    if (j === 4 || j === 8) for (const k of W.ch.slice(1, 3)) this.mbox(c, t, 440 * semi(k), 0.03);
    if (j % 4 === 0) this.mbox(c, t, 880 * semi(W.m[j / 4]), 0.07);
    // every other time round, a ghost hums along
    if (j === 0 && bar % 16 === 8) this.theremin(c, t, 440 * semi(W.m[0]), st * 22, 0.05, 30);
  }
  // a round: the skeleton dance, sixteen sixteenths a bar
  dance(c, t, s) {
    const bar = Math.floor(s / 16), i = s % 16, x = this.intensity, bl = this.blitz;
    const P = PROG[bar % 8], root = bassF(P.r), st = 60 / this.bpm() / 4;
    if (i % 4 === 2) t += st * SWING;                   // the skeleton's limp: swung eighths
    const sings = Math.floor(bar / 8) % 2 === 0;       // the theremin's phrase, or the bones'
    // the bed: a bell on each phrase, and the wind
    if (i === 0 && bar % 4 === 0 && s > 0) this.toll(c, t, 110, 0.22);
    if (i === 0 && bar % 2 === 0) this.gust(c, t, st * 16 * 2.6, 0.1, bar % 4 ? 450 : 320, bar % 4 ? 750 : 900);
    if (i === 0 && bar % 8 === 6) this.whisper(c, t);
    // drums: kick and bone clack, the kit growing with the round and the blitz
    if (i === 0 || i === 8 || (x > 0.5 && i === 10)) this.kick(c, t, 0.75);
    if (bl >= 5 && (i === 4 || i === 12)) this.kick(c, t, 0.5);
    if (i === 4 || i === 12) this.clack(c, t, 0.35 + 0.3 * x);
    if (x > 0.2 && i % 4 === 2) this.rattle(c, t, 0.07 + 0.07 * x);
    if ((x > 0.65 || bl >= 1) && i % 4 === 0) this.rattle(c, t, 0.05);
    if (bl >= 2 && (i === 6 || i === 14)) this.timp(c, t, i === 6 ? 98 : 73.42, 0.3);
    if (bl >= 4 && i === 0) this.toll(c, t, 440 * semi(P.ch[2] - 12), 0.08, 1.6);
    if ((x > 0.7 || bl >= 3) && bar % 4 === 3 && i >= 12) this.timp(c, t, 150 - (i - 12) * 20, 0.34);
    // pizzicato bass: oom on one, pah on three, a bounce, a chromatic step into the next bar
    if (i === 0) this.pizz(c, t, root, 0.3);
    if (i === 8) this.pizz(c, t, root * 1.5, 0.26);
    if (x > 0.35 && i === 6) this.pizz(c, t, root * 2, 0.15);
    if (x > 0.45 && i === 14) this.pizz(c, t, bassF(PROG[(bar + 1) % 8].r) * semi(-1), 0.2);
    // the bones: xylophone chords on two and four
    if (i === 4 || i === 12) { this.xylo(c, t, 440 * semi(P.ch[1]), 0.06); this.xylo(c, t, 440 * semi(P.ch[2]), 0.05); }
    // the organ joins late in the round and with the blitz
    if (i === 0 && (bl >= 3 || x > 0.6)) this.organ(c, t, P.ch.slice(0, 3).map((k) => 220 * semi(k)), st * 16, 0.016 + 0.012 * Math.min(1, bl / 6), 900 + 900 * x);
    if (this.danger >= 2) {
      // two cracks: the tune gives way to a theremin siren on E and F
      if (i % 4 === 0) this.theremin(c, t, 440 * semi(i % 8 === 0 ? 7 : 8), st * 3.6, 0.11, 40);
      return;
    }
    for (const [at, k, len] of MEL[bar % 8]) {
      if (sings) { if (at === i) this.theremin(c, t, 440 * semi(k), st * len, 0.1); }
      else if (i >= at && i < at + len && (i - at) % 2 === 0) this.xylo(c, t, 880 * semi(k), i === at ? 0.085 : 0.04, 0.3);
    }
    // while the bones have the tune, the theremin moans the chord
    if (!sings && i === 0) this.theremin(c, t, 220 * semi(P.ch[2]), st * 15, 0.07, 35);
    // running bones late in the round
    if (sings && (x > 0.45 || bl >= 1) && i % 2 === 0 && i % 8 !== 4) this.xylo(c, t, 880 * semi(P.ch[(i / 2) % P.ch.length]), 0.032);
  }
  // the Great Pumpkin: straight and heavy, a bell on every bar, E and F grinding
  finale(c, t, fs) {
    const st = 60 / this.bpm() / 4;
    if (fs < 0) { this.timp(c, t, 82.41, 0.16 + 0.06 * (fs + 4)); return; }   // a timpani roll as it rises
    const bar = Math.floor(fs / 16) % 4, i = fs % 16, F = FIN[bar], root = bassF(F.r);
    if (i === 0) {
      this.toll(c, t, 82.41, 0.26, 3);
      this.organ(c, t, F.ch.map((k) => 220 * semi(k)), st * 16, 0.02, 2200, true);
      if (bar % 2 === 0) this.gust(c, t, st * 32 * 1.2, 0.14, 300, 1400, 1);
    }
    if (i % 4 === 0) this.kick(c, t, 0.9);
    if (i % 4 === 2) this.timp(c, t, root * 1.5, 0.28);
    this.pizz(c, t, root * (i % 2 ? (F.r === 7 ? semi(1) : semi(-1)) : 1), i % 4 === 0 ? 0.17 : 0.11);
    if (i === 4 || i === 12) this.clack(c, t, 0.6);
    if (i % 2 === 1) this.rattle(c, t, 0.06);
    for (const [at, k, len] of F.w) if (at === i) this.theremin(c, t, 440 * semi(k), st * len, 0.12, 45, 6);
    if (i >= 12) this.xylo(c, t, 880 * semi(14 - (i - 12)), 0.06);   // bones falling chromatically into the bell
  }
}

export const Music = HALLOWEEN ? SpookyMusic : ClassicMusic;
