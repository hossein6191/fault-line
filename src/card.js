// Share card: a 1200x630 strip of the seismogram with the round written on it.
import { drawPaper } from './paper.js';
import { TYPES } from './targets.js';
import { HALLOWEEN, HW, HNAMES } from './theme.js';
import { drawRocky, POSES } from './rocky.js';

function setSpacing(g, px) { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; }

export async function renderCard(res, url) {
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  try {
    // never let a slow font request hold the card (or anything behind it) hostage
    await Promise.race([
      Promise.all([document.fonts.load('700 200px "Instrument Sans"'), document.fonts.load('500 22px "IBM Plex Mono"')]),
      new Promise((res) => setTimeout(res, 1500)),
    ]);
  } catch (e) { /* fall back silently */ }
  const SANS = '"Instrument Sans", sans-serif', MONO = '"IBM Plex Mono", ui-monospace, monospace';
  if (HALLOWEEN) { halloweenCard(g, W, H, res, url, SANS, MONO); return c; }

  drawPaper(g, W, H, { labels: false });

  // the trace: quiet, then the round, as one pen line across the card
  const base = 500;
  g.beginPath();
  for (let x = 0; x <= W; x += 4) {
    const k = x / W, env = Math.exp(-Math.pow((k - 0.62) / 0.16, 2));
    const y = base + (Math.sin(x * 0.11) * 3 + Math.sin(x * 0.37) * 2) + env * (Math.sin(x * 0.19) * 70 + Math.sin(x * 0.53) * 38) * Math.min(1.4, 0.4 + res.score / 400);
    x ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.strokeStyle = '#161616'; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();

  // one orb, cut in two, upper right
  const cx = 985, cy = 235, ang = -0.5, nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const side of [-1, 1]) {
    g.save();
    g.translate(cx + nx * side * 22 - Math.cos(ang) * side * 12, cy + ny * side * 22);
    g.rotate(side * 0.13);
    g.scale(3.4, 3.4);
    g.beginPath();
    const P = 90, c2 = Math.cos(ang), s2 = Math.sin(ang), ex = -s2 * side, ey = c2 * side;
    g.moveTo(-c2 * P, -s2 * P); g.lineTo(c2 * P, s2 * P); g.lineTo(c2 * P + ex * P, s2 * P + ey * P); g.lineTo(-c2 * P + ex * P, -s2 * P + ey * P);
    g.closePath(); g.clip();
    TYPES.orb.draw(g);
    g.restore();
  }
  // the stroke that cut it
  const x0 = 730, y0 = cy + (730 - cx) * Math.tan(ang), x1 = 1210, y1 = cy + (1210 - cx) * Math.tan(ang);
  g.strokeStyle = 'rgba(130,90,109,0.35)'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = '#161616'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.lineCap = 'butt';

  // wordmark
  g.fillStyle = '#161616'; g.textAlign = 'left';
  g.font = `700 34px ${SANS}`; setSpacing(g, -0.8);
  g.fillText('Fault Line', 64, 84);
  setSpacing(g, 1.5);
  g.fillStyle = 'rgba(22,22,22,0.6)'; g.font = `500 13px ${MONO}`;
  const where = res.mode === 'daily' ? `DAILY / ${res.date}` : res.mode === 'classic' ? 'CLASSIC' : 'ARCADE / 60 S';
  g.fillText(where, 66, 110);
  setSpacing(g, 0);
  if (res.name) { g.textAlign = 'right'; g.fillStyle = '#161616'; g.font = `500 20px ${MONO}`; g.fillText(res.name, W - 60, 84); g.textAlign = 'left'; }

  g.fillStyle = '#161616';
  g.font = `700 210px ${SANS}`; setSpacing(g, -8);
  g.fillText(String(res.score), 56, 330);
  setSpacing(g, 0);
  g.fillStyle = '#825A6D';
  g.font = `600 30px ${SANS}`;
  g.fillText(`Magnitude ${res.m.toFixed(2)} · ${res.tier}`, 66, 384);

  g.fillStyle = 'rgba(22,22,22,0.75)';
  g.font = `500 20px ${MONO}`;
  const bits = [`${res.sliced} shattered`];
  if (res.maxCombo) bits.push(`aftershock x${res.maxCombo}`);
  if (res.bossHits) bits.push(`core x${res.bossHits}`);
  g.fillText(bits.join('  /  '), 66, 424);

  g.fillStyle = 'rgba(22,22,22,0.5)';
  g.font = `500 15px ${MONO}`;
  g.fillText(url, 66, H - 36);
  return c;
}

// ---- Halloween edition (#ROCKYHalloween) ----
// The night sheet from paper.js (moon, roofs and graves), a ghost-green pen
// trace, a pumpkin cut in two, and Jack-o'-Rocky standing on the right.
function halloweenCard(g, W, H, res, url, SANS, MONO) {
  drawPaper(g, W, H, { labels: false, night: true });

  // the trace, as on the classic card, in ghost-green ink with a glow
  const base = 498;
  g.beginPath();
  for (let x = 0; x <= W; x += 4) {
    const k = x / W, env = Math.exp(-Math.pow((k - 0.6) / 0.16, 2));
    const y = base + (Math.sin(x * 0.11) * 3 + Math.sin(x * 0.37) * 2) + env * (Math.sin(x * 0.19) * 70 + Math.sin(x * 0.53) * 38) * Math.min(1.4, 0.4 + res.score / 400);
    x ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.save();
  g.lineJoin = 'round';
  g.shadowColor = `rgba(${HW.ghostGlow},0.75)`; g.shadowBlur = 14;
  g.strokeStyle = `rgba(${HW.ghostGlow},0.35)`; g.lineWidth = 6; g.stroke();
  g.shadowBlur = 0;
  g.strokeStyle = HW.slime; g.lineWidth = 2.2; g.stroke();
  g.restore();

  // a pumpkin, cut in two, between the score and Rocky
  const cx = 702, cy = 232, ang = -0.5, nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const side of [-1, 1]) {
    g.save();
    g.translate(cx + nx * side * 18 - Math.cos(ang) * side * 10, cy + ny * side * 18);
    g.rotate(side * 0.13);
    g.scale(2.6, 2.6);
    g.beginPath();
    const P = 90, c2 = Math.cos(ang), s2 = Math.sin(ang), ex = -s2 * side, ey = c2 * side;
    g.moveTo(-c2 * P, -s2 * P); g.lineTo(c2 * P, s2 * P); g.lineTo(c2 * P + ex * P, s2 * P + ey * P); g.lineTo(-c2 * P + ex * P, -s2 * P + ey * P);
    g.closePath(); g.clip();
    TYPES.orb.draw(g);
    g.restore();
  }
  // the ember blade that cut it, tapered at both ends
  const L = 150, ux = Math.cos(ang), uy = Math.sin(ang);   // ends short of the moon (912, 114)
  const blade = (w, color) => {
    g.beginPath();
    g.moveTo(cx - ux * L, cy - uy * L);
    g.quadraticCurveTo(cx - nx * w, cy - ny * w, cx + ux * L, cy + uy * L);
    g.quadraticCurveTo(cx + nx * w, cy + ny * w, cx - ux * L, cy - uy * L);
    g.fillStyle = color; g.fill();
  };
  g.save(); g.shadowColor = 'rgba(255,96,24,0.8)'; g.shadowBlur = 18;
  blade(12, 'rgba(255,96,24,0.45)'); g.restore();
  blade(5, 'rgb(255,150,52)');
  blade(1.8, 'rgb(255,240,196)');

  // Jack-o'-Rocky on the right, facing the score, cheering
  const rx = 1032, ry = 604, rs = 3.05;
  const glow = g.createRadialGradient(rx, ry - 40, 10, rx, ry - 40, 260);
  glow.addColorStop(0, `rgba(${HW.ember},0.26)`); glow.addColorStop(1, `rgba(${HW.ember},0)`);
  g.fillStyle = glow; g.fillRect(rx - 270, ry - 300, 540, 330);
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.beginPath(); g.ellipse(rx, ry + 2, 104, 12, 0, 0, Math.PI * 2); g.fill();
  g.save();
  g.translate(rx, 0); g.scale(-1, 1);
  drawRocky(g, 0, ry, rs, POSES.cheer(0.3), { t: 0.3, glow: 1 });
  g.restore();

  // wordmark, the edition tag, the round
  g.textAlign = 'left';
  g.fillStyle = HW.ink;
  g.font = `700 34px ${SANS}`; setSpacing(g, -0.8);
  g.fillText('Fault Line', 64, 84);
  const tw = g.measureText('Fault Line').width;
  setSpacing(g, 1.5);
  g.font = `600 13px ${MONO}`;
  const tag = 'HALLOWEEN EDITION', tagW = g.measureText(tag).width + 22;
  g.fillStyle = HW.pumpkin; g.fillRect(64 + tw + 16, 60, tagW, 30);
  g.fillStyle = '#1A0D10'; g.fillText(tag, 64 + tw + 27, 80);
  g.fillStyle = HW.inkSoft; g.font = `500 13px ${MONO}`;
  const where = res.mode === 'daily' ? `DAILY / ${res.date}` : res.mode === 'classic' ? 'CLASSIC' : 'ARCADE / 60 S';
  g.fillText(where, 66, 110);
  setSpacing(g, 0);
  if (res.name) { g.textAlign = 'right'; g.fillStyle = HW.ink; g.font = `500 20px ${MONO}`; g.fillText(res.name, W - 60, 84); g.textAlign = 'left'; }

  g.save();
  g.fillStyle = HW.ink;
  g.shadowColor = 'rgba(255,138,42,0.4)'; g.shadowBlur = 36;
  g.font = `700 210px ${SANS}`; setSpacing(g, -8);
  g.fillText(String(res.score), 56, 330);
  g.restore();
  setSpacing(g, 0);
  g.fillStyle = HW.pumpkin;
  g.font = `600 30px ${SANS}`;
  g.fillText(`Magnitude ${res.m.toFixed(2)} · ${res.tier}`, 66, 384);

  g.fillStyle = 'rgba(243,231,236,0.8)';
  g.font = `500 20px ${MONO}`;
  const bits = [`${res.sliced} treats sliced`];
  if (res.maxCombo) bits.push(`aftershock x${res.maxCombo}`);
  if (res.bossHits) bits.push(`${HNAMES.boss.replace(/^The /, '').toLowerCase()} x${res.bossHits}`);
  // a dark edge so the line stays legible where the trace's peaks cross it
  g.strokeStyle = 'rgba(21,13,32,0.92)'; g.lineWidth = 7; g.lineJoin = 'round';
  g.strokeText(bits.join('  /  '), 66, 424);
  g.fillText(bits.join('  /  '), 66, 424);

  // the contest tag and the address, on the dark of the skyline
  g.fillStyle = HW.pumpkin;
  g.font = `600 24px ${MONO}`;
  g.fillText('#ROCKYHalloween', 66, H - 36);
  const hw = g.measureText('#ROCKYHalloween').width;
  g.fillStyle = 'rgba(243,231,236,0.66)';
  g.font = `500 15px ${MONO}`;
  g.fillText(url, 66 + hw + 22, H - 37);
}
