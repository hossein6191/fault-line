// Fault Line sound. Everything is synthesised with WebAudio, and none of it
// is shared with Magnitude Run: this game's voice is struck glass (bells
// with inharmonic partials), wood and skin percussion, and a short echo.
// All timing goes through the audio clock (`when`), never setTimeout.

// A Hirajoshi scale (A B C E F): cuts in one stroke climb it, and the music
// is written in it, so play and score stay in one key.
export const SCALE = [0, 2, 3, 7, 8];
export const degree = (k) => SCALE[((k % 5) + 5) % 5] + 12 * Math.floor(k / 5);
const semi = (n) => Math.pow(2, n / 12);

export class Sfx {
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
