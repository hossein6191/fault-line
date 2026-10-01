// The blade: a short-lived trail behind each finger, drawn as a stroke of
// ink with a seismograph zigzag riding on it. The swipe is the fault line,
// and on chart paper a fault line is a pen stroke.

export const BLADE_SKINS = {
  pearl:   { name: 'Ink',      core: '22,22,22',   glow: '130,90,109' },
  mauve:   { name: 'Mauve',    core: '82,53,66',   glow: '194,154,175' },
  ember:   { name: 'Copper',   core: '142,78,42',  glow: '214,158,112' },
  glass:   { name: 'Graphite', core: '92,92,98',   glow: '170,170,178' },
  enclave: { name: 'Enclave',  core: '18,92,72',   glow: '110,200,170' },
};

export const BLADE_LIFE = 0.17;

export class Blade {
  constructor() {
    this.pts = [];
    this.down = true;
    this.count = 0; this.cx = 0; this.cy = 0; this.lastSlice = -9;
    this.lastBoss = -9; this.whoosh = -9;
  }
  last() { return this.pts[this.pts.length - 1]; }
  // returns true when the point moved far enough to form a new segment
  add(x, y, t) {
    const l = this.last();
    if (l && Math.hypot(x - l.x, y - l.y) < 1.5) { l.t = t; return false; }
    this.pts.push({ x, y, t });
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
    const L = [], Rr = [], w = [];
    for (let i = 0; i < n; i++) {
      const a = Math.min(1, Math.max(0, (now - p[i].t) / BLADE_LIFE));
      // needle at the tail, full width near the head, a point at the very tip
      let wi = 6.5 * Math.pow(1 - a, 0.8) * Math.min(1, (i + 0.4) / Math.max(1, (n - 1) * 0.65));
      if (i === n - 1) wi *= 0.25; else if (i === n - 2) wi *= 0.7;
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
}

// distance from point (cx, cy) to segment (x0,y0)-(x1,y1)
export function segDist(x0, y0, x1, y1, cx, cy) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy;
  let t = l2 ? ((cx - x0) * dx + (cy - y0) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(cx - (x0 + dx * t), cy - (y0 + dy * t));
}
