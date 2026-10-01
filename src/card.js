// Share card: a 1200x630 image of the round with the cut running through it.
import { drawRocky, drawCrystal, POSES, PAL } from './rocky.js';
import { makeContourTile } from './world.js';
import { TYPES } from './targets.js';

function setSpacing(g, px) { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; }

export async function renderCard(res, url) {
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  try {
    await Promise.all([
      document.fonts.load('400 40px "Instrument Serif"'),
      document.fonts.load('italic 400 44px "Instrument Serif"'),
      document.fonts.load('500 200px "JetBrains Mono"'),
      document.fonts.load('500 14px "Instrument Sans"'),
    ]);
  } catch (e) { /* fall back silently */ }

  g.fillStyle = PAL.ink; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W * 0.78, H * 0.3, 40, W * 0.78, H * 0.3, 760);
  rg.addColorStop(0, 'rgba(82,53,66,0.75)'); rg.addColorStop(1, 'rgba(82,53,66,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  g.drawImage(makeContourTile(1600, H, 0.06, 5), -160, 0);

  // the fault line: one cut across the card, with a Watcher split on it
  const x0 = 520, y0 = 600, x1 = 1210, y1 = 150, ang = Math.atan2(y1 - y0, x1 - x0);
  const cx = 905, cy = y0 + (cx - x0) * Math.tan(ang), nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const side of [-1, 1]) {
    g.save();
    g.translate(cx + nx * side * 26 - Math.cos(ang) * side * 10, cy + ny * side * 26);
    g.rotate(side * 0.14);
    g.scale(3.1, 3.1);
    g.beginPath();
    const P = 90, c2 = Math.cos(ang), s2 = Math.sin(ang), ex = -s2 * side, ey = c2 * side;
    g.moveTo(-c2 * P, -s2 * P); g.lineTo(c2 * P, s2 * P); g.lineTo(c2 * P + ex * P, s2 * P + ey * P); g.lineTo(-c2 * P + ex * P, -s2 * P + ey * P);
    g.closePath(); g.clip();
    TYPES.watcher.draw(g);
    g.restore();
  }
  const line = (w, a) => { g.strokeStyle = `rgba(243,231,236,${a})`; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  line(22, 0.06); line(9, 0.14); line(2.5, 0.95);
  g.beginPath();
  for (let i = 0; i <= 60; i++) { const k = i / 60, a = (i % 2 ? 1 : -1) * 9 * Math.sin(k * Math.PI); const x = x0 + (x1 - x0) * k + nx * a, y = y0 + (y1 - y0) * k + ny * a; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.strokeStyle = 'rgba(243,231,236,0.4)'; g.lineWidth = 1.2; g.stroke();

  drawRocky(g, 1085, 560, 1.7, POSES.idle(0.8), { cracks: 0 });

  drawCrystal(g, 78, 72, 20, 0, 0);
  g.fillStyle = PAL.pearl; g.textAlign = 'left';
  g.font = '400 36px "Instrument Serif", serif';
  g.fillText('Fault Line', 104, 84);
  g.fillStyle = 'rgba(252,252,252,0.55)';
  g.font = '500 13px "Instrument Sans", sans-serif';
  setSpacing(g, 3);
  const where = res.mode === 'daily' ? `DAILY · ${res.date}` : res.mode === 'classic' ? 'CLASSIC' : 'ARCADE · 60 S';
  g.fillText(where, 106, 108);
  setSpacing(g, 0);
  if (res.name) { g.textAlign = 'right'; g.fillStyle = 'rgba(252,252,252,0.75)'; g.font = '500 20px "JetBrains Mono", monospace'; g.fillText(res.name, W - 60, 84); g.textAlign = 'left'; }

  g.fillStyle = PAL.pearl;
  g.font = '500 190px "JetBrains Mono", monospace';
  const sStr = String(res.score);
  g.fillText(sStr, 60, 340);
  g.fillStyle = '#C29AAF';
  g.font = 'italic 400 44px "Instrument Serif", serif';
  g.fillText(`M ${res.m.toFixed(2)} · ${res.tier}`, 70, 404);

  g.fillStyle = 'rgba(252,252,252,0.75)';
  g.font = '500 22px "JetBrains Mono", monospace';
  const bits = [`${res.sliced} shattered`];
  if (res.maxCombo) bits.push(`aftershock x${res.maxCombo}`);
  if (res.bossHits) bits.push(`Auditor x${res.bossHits}`);
  g.fillText(bits.join('  ·  '), 70, 456);

  g.fillStyle = 'rgba(252,252,252,0.45)';
  g.font = '500 15px "JetBrains Mono", monospace';
  g.fillText(url, 66, H - 40);
  return c;
}
