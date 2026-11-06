// Fault Line sound. Everything is synthesised with WebAudio, and none of it
// is shared with Magnitude Run: this game's voice is struck glass (bells
// with inharmonic partials), wood and skin percussion, and a short echo.
// All timing goes through the audio clock (`when`), never setTimeout.
// The Halloween edition (theme.js) swaps in its own voices below the classic
// class; with the classic theme everything here sounds exactly as before.

import { HALLOWEEN } from './theme.js';

// A Hirajoshi scale (A B C E F): cuts in one stroke climb it, and the music
// is written in it, so play and score stay in one key.
export const SCALE = [0, 2, 3, 7, 8];
export const degree = (k) => SCALE[((k % 5) + 5) % 5] + 12 * Math.floor(k / 5);
const semi = (n) => Math.pow(2, n / 12);

// Halloween: A harmonic minor (A B C D E F G#), the key of the spooky score.
export const HSCALE = [0, 2, 3, 5, 7, 8, 11];
export const hdegree = (k) => HSCALE[((k % 7) + 7) % 7] + 12 * Math.floor(k / 7);
// A church bell: hum, a beating twin, prime, minor-third tierce, quint, nominal
// and the upper partials, as [ratio, level, share of the ring time].
export const TOLL = [[0.5, 0.5, 1], [0.503, 0.3, 0.9], [1, 0.45, 0.7], [1.19, 0.3, 0.5], [1.5, 0.18, 0.42], [2, 0.32, 0.38], [2.51, 0.14, 0.24], [3.01, 0.1, 0.18], [4.16, 0.06, 0.11]];
// The effects hear when the Great Pumpkin rises (rise() is played at that
// moment) and the score reads it here to play its boss variation.
export const stage = { finale: false };

class ClassicSfx {
  constructor() {
    this.ctx = null; this.master = null; this.musicBus = null; this.wet = null; this.noiseBuf = null; this.resumedAt = -1e9;
    this.muted = false;
    try { this.muted = localStorage.getItem('fl-muted') === '1'; } catch (e) { /* private mode */ }
  }
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      let c;
      try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { try { c = new AC(); } catch (e2) { return null; } }
      this.ctx = c;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 24; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      comp.connect(c.destination);
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(comp);
      // the score has its own way out, so muting effects leaves the music alone
      this.musicBus = c.createGain(); this.musicBus.gain.value = 1; this.musicBus.connect(comp);
      // echo: two delay taps feeding each other through a low-pass
      const send = c.createGain(); send.gain.value = 1;
      const d1 = c.createDelay(0.5), d2 = c.createDelay(0.5), lp = c.createBiquadFilter(), fb = c.createGain(), out = c.createGain();
      d1.delayTime.value = 0.093; d2.delayTime.value = 0.151; lp.type = 'lowpass'; lp.frequency.value = 3200; fb.gain.value = 0.36; out.gain.value = 0.5;
      send.connect(d1); d1.connect(d2); d2.connect(lp); lp.connect(fb); fb.connect(d1); d1.connect(out); d2.connect(out); out.connect(this.master);
      this.wet = send;
      const n = c.sampleRate;
      this.noiseBuf = c.createBuffer(1, n, n);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state !== 'running') { this.resumedAt = performance.now(); try { this.ctx.resume(); } catch (e) { /* ignore */ } }
    return this.ctx;
  }
  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('fl-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (this.master) this.master.gain.value = m ? 0 : 0.6;
  }
  // resume() is asynchronous: a cue fired in the same gesture that woke the
  // context is booked anyway and plays the moment it starts running
  ready() {
    if (this.muted || !this.ctx) return null;
    return this.ctx.state === 'running' || performance.now() - this.resumedAt < 400 ? this.ctx : null;
  }

  // ---- voices ----
  // a decaying oscillator; `echo` sends part of it to the delay line
  osc({ type = 'sine', f0, f1 = f0, dur = 0.2, gain = 0.2, attack = 0.003, when = 0, echo = 0 }) {
    const c = this.ready();
    if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    if (echo) { const s = c.createGain(); s.gain.value = echo; g.connect(s); s.connect(this.wet); }
    o.start(t); o.stop(t + dur + 0.03);
  }
  // filtered noise; f1 sweeps the filter
  noise({ dur = 0.1, gain = 0.2, type = 'bandpass', f = 2000, f1 = f, q = 1, when = 0, attack = 0.002, echo = 0 }) {
    const c = this.ready();
    if (!c) return;
    const t = c.currentTime + when, s = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true;
    flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t);
    if (f1 !== f) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(g); g.connect(this.master);
    if (echo) { const w = c.createGain(); w.gain.value = echo; g.connect(w); w.connect(this.wet); }
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.03);
  }
  // struck glass: a fundamental with partials that are not whole multiples
  bell(f, { dur = 0.4, gain = 0.14, when = 0, echo = 0.4 } = {}) {
    const parts = [[1, 1, 1], [2.76, 0.42, 0.55], [5.4, 0.2, 0.3], [8.93, 0.08, 0.16]];
    for (const [ratio, amp, life] of parts) {
      if (f * ratio > 15000) continue;
      this.osc({ f0: f * ratio, dur: dur * life, gain: gain * amp, attack: 0.001, when, echo });
    }
  }
  // skin: a pitched thump with a short breath of noise
  drum(f0, f1, { dur = 0.22, gain = 0.4, when = 0 } = {}) {
    this.osc({ f0, f1, dur, gain, attack: 0.002, when });
    this.noise({ dur: 0.05, gain: gain * 0.35, type: 'lowpass', f: 420, when });
  }
  wood(f, { gain = 0.16, when = 0 } = {}) {
    this.osc({ type: 'triangle', f0: f, f1: f * 0.82, dur: 0.06, gain, attack: 0.001, when });
    this.noise({ dur: 0.02, gain: gain * 0.5, f: f * 2.2, q: 3, when });
  }

  // ---- cues ----
  ui() { this.wood(900, { gain: 0.08 }); }
  start() { this.bell(220, { dur: 1.6, gain: 0.16, echo: 0.6 }); this.drum(130, 52, { dur: 0.5, gain: 0.45 }); }
  toss() { this.osc({ f0: 92, f1: 150, dur: 0.09, gain: 0.07 }); }
  whoosh() { this.noise({ dur: 0.14, gain: 0.16, f: 700, f1: 3600, q: 1.4, attack: 0.03 }); }
  // each cut in a stroke rings one step higher up the scale
  slice(step = 1, clean = false) {
    const f = 880 * semi(degree(Math.min(11, step - 1))) * (0.985 + Math.random() * 0.03);
    this.noise({ dur: 0.045, gain: 0.22, type: 'highpass', f: 5200 });
    this.bell(f, { dur: 0.32, gain: 0.17, echo: 0.35 });
    if (clean) this.bell(f * 2, { dur: 0.5, gain: 0.05, when: 0.03, echo: 0.8 });
  }
  combo(n) {
    const notes = Math.min(5, Math.max(3, n));
    for (let i = 0; i < notes; i++) this.osc({ type: 'triangle', f0: 440 * semi(degree(i * 2)), dur: 0.22, gain: 0.12, when: i * 0.045, echo: 0.5 });
    this.drum(150, 60, { dur: 0.3, gain: n >= 5 ? 0.5 : 0.36 });
  }
  clang() {
    this.bell(174, { dur: 0.9, gain: 0.2, echo: 0.3 });
    this.osc({ type: 'square', f0: 246, f1: 233, dur: 0.18, gain: 0.07 });
    this.drum(110, 40, { dur: 0.4, gain: 0.5 });
    this.noise({ dur: 0.12, gain: 0.2, f: 1200, q: 0.8 });
  }
  miss() { this.osc({ f0: 320, f1: 88, dur: 0.36, gain: 0.2 }); this.noise({ dur: 0.2, gain: 0.08, type: 'lowpass', f: 600 }); }
  tick() { this.wood(1250, { gain: 0.14 }); }
  power() { for (let i = 0; i < 4; i++) this.bell(660 * semi(degree(i * 2)), { dur: 0.5, gain: 0.09, when: i * 0.07, echo: 0.7 }); }
  quake() {
    this.osc({ f0: 58, f1: 24, dur: 1.1, gain: 0.55 });
    this.noise({ dur: 0.9, gain: 0.3, type: 'lowpass', f: 220, f1: 60 });
    for (let i = 0; i < 8; i++) this.bell(900 + Math.random() * 2200, { dur: 0.3, gain: 0.05, when: 0.05 + i * 0.045, echo: 0.6 });
  }
  rise() {
    this.noise({ dur: 0.8, gain: 0.16, f: 260, f1: 2400, q: 2, attack: 0.6 });
    this.osc({ type: 'sawtooth', f0: 55, f1: 110, dur: 0.8, gain: 0.07, attack: 0.5 });
  }
  bossHit(n) {
    const f = 520 * Math.pow(2, Math.min(36, n) / 30);
    this.wood(f, { gain: 0.22 });
    this.bell(f * 2, { dur: 0.12, gain: 0.08, echo: 0.2 });
  }
  bossBreak() {
    this.drum(120, 34, { dur: 0.8, gain: 0.6 });
    this.noise({ dur: 0.7, gain: 0.22, type: 'highpass', f: 2600, attack: 0.005, echo: 0.5 });
    for (let i = 0; i < 14; i++) this.bell(700 + Math.random() * 3000, { dur: 0.35 + Math.random() * 0.3, gain: 0.06, when: i * 0.035 + Math.random() * 0.03, echo: 0.7 });
  }
}

// ---- Halloween edition ----
// Same cues, same call sites, a haunted-carnival voice: juicy splats and
// celesta chimes for treats, glass and a witch's cackle for the cursed potion,
// organ stabs and tubular bells for aftershocks, church bells, a wolf howl and
// a ghost choir for the big moments. Still all synthesised.
class HalloweenSfx extends ClassicSfx {
  // a voice with a moving pitch ([time, Hz] points), a shaped envelope ([time,
  // gain] points), a vibrato in cents that grows in, and optional formants
  voice({ type = 'sine', pitch, amp, vib = 0, rate = 5.5, vibIn = 0.25, formants = null, when = 0, echo = 0 }) {
    const c = this.ready();
    if (!c) return;
    const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, pitch[0][1]), t);
    for (let k = 1; k < pitch.length; k++) o.frequency.exponentialRampToValueAtTime(Math.max(20, pitch[k][1]), t + pitch[k][0]);
    g.gain.setValueAtTime(Math.max(0.0001, amp[0][1]), t);
    for (let k = 1; k < amp.length; k++) g.gain.linearRampToValueAtTime(Math.max(0.0001, amp[k][1]), t + amp[k][0]);
    const end = t + amp[amp.length - 1][0] + 0.05;
    if (vib) {
      const lfo = c.createOscillator(), d = c.createGain();
      lfo.frequency.value = rate;
      d.gain.setValueAtTime(0, t); d.gain.linearRampToValueAtTime(vib, t + Math.max(0.01, vibIn));
      lfo.connect(d); d.connect(o.detune);
      lfo.start(t); lfo.stop(end);
    }
    o.connect(g);
    let out = g;
    if (formants) {
      out = c.createGain();
      for (const [f, q, a] of formants) {
        const b = c.createBiquadFilter(), m = c.createGain();
        b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; m.gain.value = a;
        g.connect(b); b.connect(m); m.connect(out);
      }
    }
    out.connect(this.master);
    if (echo) { const s = c.createGain(); s.gain.value = echo; out.connect(s); s.connect(this.wet); }
    o.start(t); o.stop(end);
  }
  // celesta: a pure tone, a twin a few cents up for the sparkle, a short octave
  chime(f, { gain = 0.12, when = 0, echo = 0.35, dur = 0.42 } = {}) {
    this.osc({ f0: f, dur, gain, attack: 0.0015, when, echo });
    this.osc({ f0: f * 1.0068, dur: dur * 0.85, gain: gain * 0.5, attack: 0.0015, when });
    this.osc({ f0: f * 2, dur: dur * 0.38, gain: gain * 0.3, attack: 0.001, when });
    if (f * 4 < 15000) this.osc({ f0: f * 4, dur: 0.05, gain: gain * 0.12, attack: 0.001, when });
  }
  // a church bell (TOLL partials) with the clank of the clapper
  toll(f, { dur = 2.5, gain = 0.16, when = 0, echo = 0.5 } = {}) {
    for (const [ratio, amp, life] of TOLL) {
      if (f * ratio > 12000) continue;
      this.osc({ f0: f * ratio, dur: dur * life, gain: gain * amp, attack: 0.002, when, echo });
    }
    this.noise({ dur: 0.05, gain: gain * 0.3, f: Math.min(9000, f * 6), q: 2, when });
  }
  // pipe organ: two detuned squares and an octave sine per note, through a low-pass
  organ(notes, { dur = 0.4, gain = 0.06, when = 0, cutoff = 1800, echo = 0.4 } = {}) {
    const c = this.ready();
    if (!c) return;
    const t = c.currentTime + when, end = t + dur, lp = c.createBiquadFilter(), env = c.createGain();
    lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 0.8;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.012);
    env.gain.exponentialRampToValueAtTime(gain * 0.55, t + dur * 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    lp.connect(env); env.connect(this.master);
    if (echo) { const s = c.createGain(); s.gain.value = echo; env.connect(s); s.connect(this.wet); }
    for (const f of notes) {
      for (const [type, mul, det] of [['square', 1, -6], ['square', 1, 6], ['sine', 2, 0]]) {
        const o = c.createOscillator();
        o.type = type; o.frequency.value = f * mul; o.detune.value = det;
        o.connect(lp); o.start(t); o.stop(end + 0.03);
      }
    }
  }
  // a ghost choir on 'oh': detuned saws per note, one slow vibrato, three formants
  choir(notes, { when = 0, dur = 2.4, gain = 0.1, echo = 0.5 } = {}) {
    const c = this.ready();
    if (!c) return;
    const t = c.currentTime + when, end = t + dur, mix = c.createGain(), env = c.createGain();
    mix.gain.value = 1;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.35);
    env.gain.setValueAtTime(gain, t + dur * 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    for (const [f, q, a] of [[560, 3, 1], [950, 4, 0.7], [2500, 6, 0.22]]) {
      const b = c.createBiquadFilter(), m = c.createGain();
      b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; m.gain.value = a;
      mix.connect(b); b.connect(m); m.connect(env);
    }
    env.connect(this.master);
    if (echo) { const s = c.createGain(); s.gain.value = echo; env.connect(s); s.connect(this.wet); }
    const lfo = c.createOscillator(), d = c.createGain();
    lfo.frequency.value = 5; d.gain.value = 14; lfo.connect(d);
    for (const f of notes) for (const det of [-9, 8]) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      d.connect(o.detune); o.connect(mix); o.start(t); o.stop(end + 0.05);
    }
    lfo.start(t); lfo.stop(end + 0.05);
  }
  // a treat bursting: a wet low-pass sweep, a squelch and the chop of the blade
  splat({ gain = 0.2, when = 0 } = {}) {
    this.noise({ dur: 0.025, gain: gain * 0.7, type: 'highpass', f: 3600, when });
    this.noise({ dur: 0.12, gain, type: 'lowpass', f: 2600, f1: 280, q: 3, when });
    this.osc({ f0: 240, f1: 80, dur: 0.09, gain: gain * 0.5, attack: 0.003, when });
  }
  // breaking glass: a crack, a falling hiss and a scatter of shards
  glass({ gain = 0.22, when = 0 } = {}) {
    this.noise({ dur: 0.04, gain: gain * 1.1, type: 'highpass', f: 1800, when });
    this.noise({ dur: 0.32, gain: gain * 0.7, f: 5200, f1: 3000, q: 0.8, when: when + 0.005, echo: 0.3 });
    for (let i = 0; i < 9; i++) this.osc({ f0: 2400 + Math.random() * 5200, dur: 0.05 + Math.random() * 0.16, gain: gain * (0.18 + Math.random() * 0.15), attack: 0.001, when: when + 0.01 + Math.random() * 0.22, echo: 0.4 });
  }
  // a witch's cackle: six nasal syllables falling in pitch, with a trill
  cackle({ gain = 0.3, when = 0 } = {}) {
    const amp = [[0, 0.0001]];
    for (let k = 0; k < 6; k++) {
      const on = k * 0.088, g = gain * (1 - k * 0.11);
      amp.push([on + 0.012, g], [on + 0.055, g * 0.25], [on + 0.085, 0.0001]);
      this.noise({ dur: 0.03, gain: g * 0.35, f: 2400, q: 1.2, when: when + on });
    }
    this.voice({ type: 'sawtooth', pitch: [[0, 820], [0.55, 380]], amp, vib: 70, rate: 11, vibIn: 0.01, formants: [[800, 4, 1], [1700, 6, 0.6], [2700, 8, 0.35]], when, echo: 0.35 });
  }
  // a wolf howl: up, hold with a growing vibrato, sink and fall away
  howl({ f = 330, gain = 0.16, when = 0 } = {}) {
    this.voice({ type: 'triangle', pitch: [[0, f * 0.85], [0.45, f * 1.9], [1.15, f * 1.75], [1.65, f * 1.15]], amp: [[0, 0.0001], [0.25, gain], [1.15, gain * 0.85], [1.65, 0.0001]], vib: 35, rate: 5, vibIn: 0.6, formants: [[700, 1.2, 1], [1500, 3, 0.25]], when, echo: 0.5 });
  }
  // a ghost: a sine sliding through the given points with a wide, slow wobble
  ghost(pts, { gain = 0.08, when = 0, vib = 60, echo = 0.6 } = {}) {
    const len = pts[pts.length - 1][0];
    this.voice({ pitch: pts, amp: [[0, 0.0001], [Math.min(0.15, len * 0.2), gain], [len * 0.75, gain * 0.8], [len, 0.0001]], vib, rate: 5.5, vibIn: 0.1, when, echo });
  }

  // ---- cues ----
  ui() { this.osc({ f0: 1180, f1: 560, dur: 0.07, gain: 0.06, attack: 0.002 }); this.osc({ type: 'triangle', f0: 2360, dur: 0.03, gain: 0.03, attack: 0.001 }); }
  start() {
    stage.finale = false;
    this.toll(220, { dur: 2.2, gain: 0.16, echo: 0.5 });
    this.drum(130, 52, { dur: 0.5, gain: 0.45 });
    this.noise({ dur: 0.9, gain: 0.06, f: 500, f1: 1400, q: 1.2, attack: 0.4 });
  }
  toss() { this.osc({ f0: 110, f1: 190, dur: 0.1, gain: 0.07 }); this.noise({ dur: 0.06, gain: 0.025, type: 'lowpass', f: 400 }); }
  whoosh() { this.noise({ dur: 0.18, gain: 0.15, f: 520, f1: 2600, q: 2.4, attack: 0.04 }); this.osc({ f0: 620, f1: 1240, dur: 0.16, gain: 0.018, attack: 0.05 }); }
  // each treat cut in a stroke chimes one step higher up A harmonic minor
  slice(step = 1, clean = false) {
    const f = 880 * semi(hdegree(Math.min(11, step - 1))) * (0.99 + Math.random() * 0.02);
    this.splat({ gain: 0.2 });
    this.chime(f, { gain: 0.12, when: 0.012, echo: 0.35 });
    if (clean) {
      this.chime(f * 2, { gain: 0.045, when: 0.05, echo: 0.8 });
      this.noise({ dur: 0.25, gain: 0.04, type: 'highpass', f: 7000, attack: 0.03, when: 0.03 });
    }
  }
  // an aftershock: an organ stab in A minor and a run of tubular bells
  combo(n) {
    const big = n >= 5;
    this.organ(big ? [110, 220, 261.63, 329.63, 440] : [220, 261.63, 329.63], { dur: big ? 0.55 : 0.38, gain: big ? 0.022 : 0.03, cutoff: big ? 2600 : 1800 });
    const notes = Math.min(5, Math.max(3, n)), arp = [0, 3, 7, 12, 15];
    for (let i = 0; i < notes; i++) this.toll(880 * semi(arp[i]), { dur: 0.9, gain: 0.03, when: 0.02 + i * 0.05, echo: 0.5 });
    this.drum(150, 60, { dur: 0.3, gain: big ? 0.5 : 0.36 });
  }
  // the cursed potion: glass breaks, a thud, and a cackle falling away
  clang() {
    this.glass({ gain: 0.22 });
    this.drum(110, 40, { dur: 0.4, gain: 0.45 });
    this.cackle({ gain: 0.3, when: 0.1 });
    this.ghost([[0, 620], [0.85, 150]], { gain: 0.07, when: 0.08, vib: 90, echo: 0.3 });
  }
  miss() {
    this.ghost([[0, 340], [0.45, 110]], { gain: 0.065, vib: 70, echo: 0 });
    this.noise({ dur: 0.2, gain: 0.08, type: 'lowpass', f: 600 });
  }
  // the last seconds: a grandfather clock, tick and tock
  tick() {
    this.tock = !this.tock;
    this.wood(this.tock ? 1250 : 940, { gain: 0.14 });
    this.osc({ f0: this.tock ? 1320 : 990, dur: 0.18, gain: 0.025, attack: 0.002, echo: 0.3 });
  }
  // a power-up: a harp run up the scale, a sparkle of dust and a trembling chord
  power() {
    for (let i = 0; i < 9; i++) {
      const f = 880 * semi(hdegree(i));
      this.osc({ f0: f, dur: 0.5, gain: 0.05, attack: 0.002, when: i * 0.035, echo: 0.7 });
      this.osc({ f0: f * 2, dur: 0.18, gain: 0.018, attack: 0.002, when: i * 0.035 });
    }
    this.noise({ dur: 0.8, gain: 0.06, type: 'highpass', f: 6500, attack: 0.2, echo: 0.6 });
    for (const f of [880, 1046.5, 1318.5]) this.voice({ pitch: [[0, f]], amp: [[0, 0.0001], [0.12, 0.022], [0.9, 0.0001]], vib: 25, rate: 7, vibIn: 0.01, when: 0.05 });
  }
  // Haunt: everything shatters, and two ghosts swoop through the boom
  quake() {
    this.osc({ f0: 58, f1: 24, dur: 1.1, gain: 0.55 });
    this.noise({ dur: 0.9, gain: 0.3, type: 'lowpass', f: 220, f1: 60 });
    this.ghost([[0, 280], [0.35, 700], [1.1, 230]], { gain: 0.09, when: 0.05 });
    this.ghost([[0, 420], [0.4, 1050], [1.0, 350]], { gain: 0.05, when: 0.17 });
    for (let i = 0; i < 8; i++) this.chime(1200 + Math.random() * 2400, { gain: 0.03, dur: 0.3, when: 0.05 + i * 0.045, echo: 0.6 });
  }
  // the clock runs out and the Great Pumpkin rises: a wolf howls at the moon
  rise() {
    stage.finale = true;
    this.howl({ f: 330, gain: 0.06 });
    this.noise({ dur: 1.2, gain: 0.08, f: 200, f1: 1400, q: 2, attack: 0.8 });
    this.osc({ type: 'triangle', f0: 55, f1: 110, dur: 1.0, gain: 0.06, attack: 0.6 });
  }
  // a cut into the Great Pumpkin: a hollow thump, a little higher each time
  bossHit(n) {
    const h = Math.min(36, n), k = Math.pow(2, h / 48);
    this.osc({ f0: 170 * k, f1: 62 * k, dur: 0.2, gain: 0.15, attack: 0.002 });
    this.noise({ dur: 0.07, gain: 0.1, f: 380 * k, q: 5 });
    this.noise({ dur: 0.05, gain: 0.06, type: 'lowpass', f: 1400, f1: 300 });
    this.osc({ type: 'triangle', f0: 660 * Math.pow(2, h / 30), dur: 0.08, gain: 0.04, attack: 0.001 });
  }
  // the end of a round: a burst, a big bell, a ghost rushing out, a choir
  bossBreak() {
    this.drum(120, 34, { dur: 0.8, gain: 0.6 });
    this.noise({ dur: 0.35, gain: 0.25, type: 'lowpass', f: 2400, f1: 250, q: 2 });
    this.toll(164.81, { dur: 3.2, gain: 0.2, echo: 0.6 });
    this.noise({ dur: 1.3, gain: 0.16, f: 3200, f1: 260, q: 1.8, attack: 0.12, echo: 0.5 });
    this.ghost([[0, 990], [1.2, 300]], { gain: 0.06, when: 0.1, vib: 50 });
    this.choir([220, 261.63, 329.63, 440], { when: 0.25, dur: 2.6, gain: 0.1 });
  }
}

export const Sfx = HALLOWEEN ? HalloweenSfx : ClassicSfx;
