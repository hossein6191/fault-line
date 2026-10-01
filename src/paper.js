// The world of Fault Line is a seismogram: chart paper, a ruled grid, and
// rows of pen traces that never stop moving. A cut that shakes the screen
// shows up in the traces, and a Quake sends a spike down every row.

export const INK = '#161616', PLUM = '#3D2731', PURPLE = '#523542', MAUVE = '#825A6D', ROSE = '#C29AAF', PAPER = '#F5F1F2';

export function drawPaper(g, W, H, { labels = true } = {}) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#F7F4F5'); bg.addColorStop(1, '#ECE5E8');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // ruled grid: fine every 20, heavy every 100
  g.lineWidth = 1;
  for (let x = 0.5; x < W; x += 20) { g.strokeStyle = (Math.round(x - 0.5) % 100 === 0) ? 'rgba(130,90,109,0.2)' : 'rgba(130,90,109,0.08)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0.5; y < H; y += 20) { g.strokeStyle = (Math.round(y - 0.5) % 100 === 0) ? 'rgba(130,90,109,0.2)' : 'rgba(130,90,109,0.08)'; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  if (labels) {
    g.fillStyle = 'rgba(61,39,49,0.38)';
    g.font = '500 9px "IBM Plex Mono", ui-monospace, monospace';
    g.textAlign = 'left';
    for (let y = 200, i = 2; y < H - 30; y += 100, i++) g.fillText(String(i * 10).padStart(2, '0') + ':00', 6, y - 4);
    g.fillText('STA FLT-01  BHZ  100 Hz', 6, H - 8);
  }
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(61,39,49,0)'); vg.addColorStop(1, 'rgba(61,39,49,0.13)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

// a pen wiggle: a few incommensurate sines, bursting now and then
function wiggle(a, seed) {
  const burst = Math.pow(Math.max(0, Math.sin(a * 0.13 + seed * 1.7)), 6);
  return (Math.sin(a * 1.3 + seed) + Math.sin(a * 2.9 + seed * 2.1) * 0.6 + Math.sin(a * 6.1 + seed * 0.7) * 0.35) * (0.35 + burst * 3.2);
}

export class Paper {
  constructor() { this.t = 0; this.quake = 0; this.pulses = []; this.rows = []; this.sheet = null; }
  resize(W, H, q) {
    this.W = W; this.H = H;
    const c = document.createElement('canvas');
    c.width = Math.ceil(W * q); c.height = Math.ceil(H * q);
    const g = c.getContext('2d');
    g.scale(q, q);
    drawPaper(g, W, H);
    this.sheet = c;
    this.rows = [];
    const n = Math.max(4, Math.round(H / 130));
    for (let i = 0; i < n; i++) this.rows.push({ y: H * (i + 0.7) / (n + 0.4), seed: i * 2.37 + 0.6, speed: 0.55 + (i % 3) * 0.2 });
  }
  pulse(x) { this.pulses.push({ x, t: 0 }); }
  update(dt) {
    this.t += dt;
    for (const p of this.pulses) p.t += dt;
    this.pulses = this.pulses.filter((p) => p.t < 1.2);
  }
  draw(ctx) {
    const { W, H, t } = this;
    ctx.drawImage(this.sheet, 0, 0, W, H);
    const amp = 3.2 * (1 + this.quake * 7);
    ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
    for (const r of this.rows) {
      ctx.beginPath();
      for (let x = -4; x <= W + 6; x += 6) {
        const a = (x * 0.045 + t * r.speed * 2.2);
        let y = r.y + wiggle(a, r.seed) * amp;
        for (const p of this.pulses) {
          const d = Math.abs(x - p.x) - p.t * 900;
          if (d > -140 && d < 0) y += Math.sin(d * 0.2) * 26 * (1 - p.t / 1.2) * (1 + d / 140);
        }
        x === -4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(82,53,66,0.26)';
      ctx.stroke();
    }
  }
}
