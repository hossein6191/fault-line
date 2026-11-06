// The blade: a short-lived trail behind each finger, drawn as a stroke of
// ink with a seismograph zigzag riding on it. The swipe is the fault line,
// and on chart paper a fault line is a pen stroke.
//
// Halloween edition: on the night sheet the stroke glows instead. The skins
// keep their keys (unlocks are stored by key) and change look: Ember (a flame
// with a hot core), Witch Purple, Candy Stripe, Bone and Ectoplasm.

import { HALLOWEEN } from './theme.js';

const CLASSIC_SKINS = {
  pearl:   { name: 'Ink',      core: '22,22,22',   glow: '130,90,109' },
  mauve:   { name: 'Mauve',    core: '82,53,66',   glow: '194,154,175' },
  ember:   { name: 'Copper',   core: '142,78,42',  glow: '214,158,112' },
  glass:   { name: 'Graphite', core: '92,92,98',   glow: '170,170,178' },
  enclave: { name: 'Enclave',  core: '18,92,72',   glow: '110,200,170' },
};

// core and glow stay r,g,b strings (the blade picker paints its swatch from them);
// hot is the bright centre, line the seismograph riding the cut, fx the extra touch
const NIGHT_SKINS = {
  pearl:   { name: 'Ember',        core: '255,150,52',  glow: '255,96,24',   hot: '255,240,196', line: '255,232,170', fx: 'ember' },
  mauve:   { name: 'Witch Purple', core: '176,98,255',  glow: '123,47,190',  hot: '236,214,255', line: '226,196,255', fx: 'sparkle' },
  ember:   { name: 'Candy Stripe', core: '255,244,248', glow: '255,95,162',  hot: '255,255,255', line: '255,95,162',  fx: 'stripe' },
  glass:   { name: 'Bone',         core: '237,227,207', glow: '190,176,150', hot: '255,252,242', line: '128,110,88',  fx: 'bone' },
  enclave: { name: 'Ectoplasm',    core: '141,255,158', glow: '50,220,110',  hot: '228,255,234', line: '210,255,222', fx: 'ecto' },
};

export const BLADE_SKINS = HALLOWEEN ? NIGHT_SKINS : CLASSIC_SKINS;

export const BLADE_LIFE = 0.17;

// a stable 0..1 per point, so sparks and stripes do not shimmer as the tail is trimmed
const hash = (k) => { const s = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };

export class Blade {
  constructor() {
    this.pts = [];
    this.down = true;
    this.count = 0; this.cx = 0; this.cy = 0; this.lastSlice = -9;
    this.lastBoss = -9; this.whoosh = -9;
    this.seq = 0;
  }
  last() { return this.pts[this.pts.length - 1]; }
  // returns true when the point moved far enough to form a new segment
  add(x, y, t) {
    const l = this.last();
    if (l && Math.hypot(x - l.x, y - l.y) < 1.5) { l.t = t; return false; }
    this.pts.push({ x, y, t, k: this.seq++ });
    if (this.pts.length > 44) this.pts.shift();
    return true;
  }
  // logical px per second over the last 80 ms
  speed(now) {
    const p = this.pts, n = p.length;
    if (n < 2) return 0;
    let d = 0, i = n - 1;
    while (i > 0 && now - p[i - 1].t < 0.08) { d += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); i--; }
    const dt = Math.max(0.016, p[n - 1].t - p[i].t);
    return d / dt;
  }
  trim(now) {
    const p = this.pts;
    while (p.length && now - p[0].t > BLADE_LIFE) p.shift();
  }
  draw(ctx, now, skin) {
    const p = this.pts, n = p.length;
    if (n < 2) return;
    // flames and goo breathe a little (looks only: cutting never reads the width)
    const wob = skin.fx === 'ember' ? 0.2 : skin.fx === 'ecto' ? 0.14 : 0;
    const L = [], Rr = [], w = [];
    for (let i = 0; i < n; i++) {
      const a = Math.min(1, Math.max(0, (now - p[i].t) / BLADE_LIFE));
      // needle at the tail, full width near the head, a point at the very tip
      let wi = 6.5 * Math.pow(1 - a, 0.8) * Math.min(1, (i + 0.4) / Math.max(1, (n - 1) * 0.65));
      if (i === n - 1) wi *= 0.25; else if (i === n - 2) wi *= 0.7;
      if (wob) wi *= 1 + wob * Math.sin(now * 34 + (p[i].k || 0) * 1.9);
      w.push(wi);
      const p0 = p[Math.max(0, i - 1)], p1 = p[Math.min(n - 1, i + 1)];
      let dx = p1.x - p0.x, dy = p1.y - p0.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d; dy /= d;
      L.push([p[i].x - dy * wi, p[i].y + dx * wi, -dy, dx]);
      Rr.push([p[i].x + dy * wi, p[i].y - dx * wi]);
    }
    const ribbon = (k) => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const x = p[i].x + (L[i][0] - p[i].x) * k, y = p[i].y + (L[i][1] - p[i].y) * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      for (let i = n - 1; i >= 0; i--) ctx.lineTo(p[i].x + (Rr[i][0] - p[i].x) * k, p[i].y + (Rr[i][1] - p[i].y) * k);
      ctx.closePath();
    };
    if (skin.fx) { this.drawGlow(ctx, now, skin, L, Rr, w, ribbon); return; }
    ribbon(2.6); ctx.fillStyle = `rgba(${skin.glow},0.2)`; ctx.fill();
    ribbon(1.5); ctx.fillStyle = `rgba(${skin.glow},0.4)`; ctx.fill();
    ribbon(1); ctx.fillStyle = `rgba(${skin.core},0.96)`; ctx.fill();
    // the seismograph riding the cut
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const k = (i % 2 ? 1 : -1) * w[i] * 1.9;
      const x = p[i].x + L[i][2] * k, y = p[i].y + L[i][3] * k;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = `rgba(${skin.core},0.6)`; ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.stroke();
  }
  // the night stroke: an additive glow, a bright body, a hot centre, the zigzag, then the skin's touch
  drawGlow(ctx, now, skin, L, Rr, w, ribbon) {
    const p = this.pts, n = p.length, fx = skin.fx;
    const age = (i) => Math.min(1, Math.max(0, (now - p[i].t) / BLADE_LIFE));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ribbon(3.6); ctx.fillStyle = `rgba(${skin.glow},0.13)`; ctx.fill();
    ribbon(2.2); ctx.fillStyle = `rgba(${skin.glow},0.28)`; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ribbon(1); ctx.fillStyle = `rgba(${skin.core},0.95)`; ctx.fill();
    if (fx === 'stripe') {
      // peppermint bands across the body
      ctx.fillStyle = `rgba(${skin.glow},0.95)`;
      ctx.beginPath();
      for (let i = 0; i < n - 1; i++) {
        if (p[i].k & 1) continue;
        ctx.moveTo(L[i][0], L[i][1]); ctx.lineTo(L[i + 1][0], L[i + 1][1]);
        ctx.lineTo(Rr[i + 1][0] + (Rr[i + 1][0] - Rr[i][0]) * 0.5, Rr[i + 1][1] + (Rr[i + 1][1] - Rr[i][1]) * 0.5);
        ctx.lineTo(Rr[i][0] + (Rr[i + 1][0] - Rr[i][0]) * 0.5, Rr[i][1] + (Rr[i + 1][1] - Rr[i][1]) * 0.5);
        ctx.closePath();
      }
      ctx.fill();
    } else if (fx !== 'bone') {
      ribbon(0.42); ctx.fillStyle = `rgba(${skin.hot},0.95)`; ctx.fill();
    }
    // the seismograph riding the cut
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const k = (i % 2 ? 1 : -1) * w[i] * 1.9;
      const x = p[i].x + L[i][2] * k, y = p[i].y + L[i][3] * k;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = `rgba(${skin.line},0.7)`; ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.stroke();

    if (fx === 'bone') {
      // knuckles along the shaft, like a spine
      ctx.strokeStyle = `rgba(${skin.line},0.75)`; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 1; i < n - 1; i++) {
        if (p[i].k % 2 || w[i] < 2) continue;
        ctx.moveTo(p[i].x + (L[i][0] - p[i].x) * 0.7, p[i].y + (L[i][1] - p[i].y) * 0.7);
        ctx.lineTo(p[i].x + (Rr[i][0] - p[i].x) * 0.7, p[i].y + (Rr[i][1] - p[i].y) * 0.7);
      }
      ctx.stroke();
    } else if (fx === 'ember') {
      // sparks thrown off the flame, rising as they cool
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n - 1; i++) {
        const k = p[i].k;
        if (k % 3) continue;
        const a = age(i), h = hash(k), sx = p[i].x + L[i][2] * (h - 0.5) * 18 + (hash(k + 7) - 0.5) * 10 * a, sy = p[i].y + L[i][3] * (h - 0.5) * 18 - a * 30;
        ctx.fillStyle = `rgba(${a < 0.4 ? skin.hot : skin.core},${(0.9 * (1 - a)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(sx, sy, 0.6 + 1.6 * (1 - a), 0, Math.PI * 2); ctx.fill();
      }
    } else if (fx === 'sparkle') {
      // little four-point stars that twinkle in the wake
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(${skin.hot},0.9)`;
      ctx.beginPath();
      for (let i = 0; i < n - 1; i++) {
        const k = p[i].k;
        if (k % 4) continue;
        const a = age(i), h = hash(k), r = (1.5 + 3.5 * (1 - a)) * (0.6 + 0.4 * Math.sin(now * 22 + k));
        if (r <= 0.4) continue;
        const sx = p[i].x + L[i][2] * (h - 0.5) * 26, sy = p[i].y + L[i][3] * (h - 0.5) * 26;
        ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.26, sy - r * 0.26); ctx.lineTo(sx + r, sy); ctx.lineTo(sx + r * 0.26, sy + r * 0.26);
        ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.26, sy + r * 0.26); ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * 0.26, sy - r * 0.26); ctx.closePath();
      }
      ctx.fill();
    } else if (fx === 'ecto') {
      // slime dripping off the stroke
      ctx.fillStyle = `rgba(${skin.core},0.85)`;
      ctx.strokeStyle = `rgba(${skin.core},0.85)`; ctx.lineCap = 'round';
      for (let i = 1; i < n - 1; i++) {
        const k = p[i].k, h = hash(k);
        if (k % 3 || h < 0.35 || w[i] < 1.5) continue;
        const a = age(i), len = a * (14 + h * 22), bx = p[i].x + (L[i][0] - p[i].x) * (h - 0.5), by = p[i].y + Math.abs(L[i][1] - p[i].y) * 0.6;
        ctx.lineWidth = Math.max(0.8, w[i] * 0.45);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + len); ctx.stroke();
        ctx.beginPath(); ctx.arc(bx, by + len, Math.max(1, w[i] * 0.42 + 0.6), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}

// distance from point (cx, cy) to segment (x0,y0)-(x1,y1)
export function segDist(x0, y0, x1, y1, cx, cy) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
  let t = l2 ? ((cx - x0) * dx + (cy - y0) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(cx - (x0 + dx * t), cy - (y0 + dy * t));
}
