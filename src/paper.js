// The world of Fault Line is a seismogram: chart paper, a ruled grid, and
// rows of pen traces that never stop moving. A cut that shakes the screen
// shows up in the traces, and a Quake sends a spike down every row.
//
// Halloween edition: the same chart on a night sheet. Plum paper, an orange
// grid, a full moon, a skyline of crooked roofs and graves along the bottom,
// ghost-green pen traces, bats now and then and fog drifting along the ground.
// Everything static is baked into one sheet; the live part is the traces, a
// few bats and two fog strips.

import { HALLOWEEN, HW } from './theme.js';
import { mulberry32 } from './rng.js';

export const INK = '#161616', PLUM = '#3D2731', PURPLE = '#523542', MAUVE = '#825A6D', ROSE = '#C29AAF', PAPER = '#F5F1F2';

export function drawPaper(g, W, H, { labels = true, night = HALLOWEEN } = {}) {
  if (night) { drawNight(g, W, H, labels); return; }
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

// ---------- the night sheet ----------

const LIGHT = '243,231,236';                  // HW.ink as r,g,b
const FAR = '#2A1A3C', NEAR = '#0B0613';       // skyline: misty back row, near-black front row
const WINDOW = '255,150,60';                   // HW.ember

// where the moon sits: the upper corner opposite the score, clear of the clock and the banner
export function moonSpot(W, H) {
  return H > W ? { x: W - 84, y: 176, r: 34 } : { x: W * 0.76, y: 114, r: 46 };
}

function drawNight(g, W, H, labels) {
  const R = mulberry32(3110 + Math.round(W) * 31 + Math.round(H));
  // skyline scale: by height on a landscape sheet, by width on a tall one (where there is room below)
  const m = Math.min(W, H), u = H > W ? Math.min(1.1, W / 460) : Math.max(0.8, Math.min(1.25, H / 600));
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, HW.paper); bg.addColorStop(0.55, '#1B122C'); bg.addColorStop(1, HW.paperEdge);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  const mo = moonSpot(W, H);
  // moonlight: a wide soft halo behind everything
  const halo = g.createRadialGradient(mo.x, mo.y, mo.r * 0.8, mo.x, mo.y, mo.r * 5.5);
  halo.addColorStop(0, `rgba(${HW.moonGlow},0.26)`); halo.addColorStop(0.3, `rgba(${HW.moonGlow},0.08)`); halo.addColorStop(1, `rgba(${HW.moonGlow},0)`);
  g.fillStyle = halo; g.fillRect(mo.x - mo.r * 5.5, mo.y - mo.r * 5.5, mo.r * 11, mo.r * 11);

  // a few stars in the upper sky
  const ns = Math.round(W * H / 9000);
  for (let i = 0; i < ns; i++) {
    const x = R() * W, y = R() * R() * H * 0.62, r = 0.45 + R() * 0.85;
    if (Math.hypot(x - mo.x, y - mo.y) < mo.r * 1.4) continue;
    g.fillStyle = `rgba(${LIGHT},${(0.14 + R() * 0.34).toFixed(2)})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }

  // ruled grid in faint pumpkin orange: fine every 20, heavy every 100
  g.lineWidth = 1;
  const fine = `rgba(${HW.grid},0.045)`, heavy = `rgba(${HW.grid},0.11)`;
  for (let x = 0.5; x < W; x += 20) { g.strokeStyle = (Math.round(x - 0.5) % 100 === 0) ? heavy : fine; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0.5; y < H; y += 20) { g.strokeStyle = (Math.round(y - 0.5) % 100 === 0) ? heavy : fine; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

  drawMoon(g, mo, R);
  drawCobweb(g, 0, 0, 0, Math.PI / 2, m * 0.21, R);
  drawCobweb(g, W, 0, Math.PI / 2, Math.PI, m * 0.12, R);
  drawSkyline(g, W, H, u, R);

  if (labels) {
    g.fillStyle = `rgba(${LIGHT},0.3)`;
    g.font = '500 9px "IBM Plex Mono", ui-monospace, monospace';
    g.textAlign = 'left';
    // the night shift: one row per hour, and midnight gets its name
    for (let y = 200, h = 21; y < H - 30; y += 100, h++) {
      const hh = h % 24;
      g.fillText(String(hh).padStart(2, '0') + ':00' + (hh === 0 ? '  witching hour' : ''), 6, y - 4);
    }
    g.fillStyle = `rgba(${LIGHT},0.36)`;
    g.fillText('STA FLT-13  BOO  100 Hz', 6, H - 8);
  }
  const vg = g.createRadialGradient(W / 2, H * 0.46, m * 0.32, W / 2, H * 0.46, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(6,2,12,0)'); vg.addColorStop(1, 'rgba(6,2,12,0.5)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

function drawMoon(g, mo, R) {
  const { x, y, r } = mo;
  const disc = g.createRadialGradient(x - r * 0.35, y - r * 0.38, r * 0.1, x, y, r);
  disc.addColorStop(0, '#FFF9E2'); disc.addColorStop(0.55, HW.moon); disc.addColorStop(1, '#DDC786');
  g.fillStyle = disc;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  // maria and craters, soft
  g.fillStyle = 'rgba(190,162,104,0.22)';
  for (const [cx, cy, cr] of [[-0.32, -0.12, 0.26], [0.22, 0.28, 0.2], [0.3, -0.34, 0.12], [-0.1, 0.44, 0.1], [0.46, 0.02, 0.09]]) {
    g.beginPath(); g.arc(x + cx * r, y + cy * r, cr * r, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(160,130,80,0.16)';
  g.beginPath(); g.ellipse(x - r * 0.05, y - r * 0.02, r * 0.5, r * 0.32, -0.5, 0, Math.PI * 2); g.fill();
  // a thin rim of light
  g.strokeStyle = 'rgba(255,250,228,0.55)'; g.lineWidth = 1;
  g.beginPath(); g.arc(x, y, r - 0.5, 0, Math.PI * 2); g.stroke();
  // wisps of night cloud drifting across the lower half, only where they cross the disc
  g.save();
  g.beginPath(); g.arc(x, y, r + 0.5, 0, Math.PI * 2); g.clip();
  g.fillStyle = 'rgba(30,20,48,0.5)';
  g.beginPath(); g.ellipse(x + r * 0.25, y + r * 0.44, r * 1.1, r * 0.1, -0.08, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(30,20,48,0.34)';
  g.beginPath(); g.ellipse(x - r * 0.45, y + r * 0.68, r * 0.9, r * 0.07, 0.05, 0, Math.PI * 2); g.fill();
  g.restore();
}

// a corner web: spokes fanning out of (cx, cy) between angles a0 and a1, with sagging rings
function drawCobweb(g, cx, cy, a0, a1, rad, R) {
  const spokes = 6, rings = [0.22, 0.4, 0.58, 0.76, 0.93];
  const dirs = [];
  for (let i = 0; i < spokes; i++) {
    const a = a0 + (a1 - a0) * (i + 0.15 + R() * 0.1) / (spokes - 0.7);
    dirs.push([Math.cos(a), Math.sin(a), rad * (0.9 + R() * 0.2)]);
  }
  g.strokeStyle = `rgba(${LIGHT},0.13)`; g.lineWidth = 0.8; g.lineCap = 'round';
  g.beginPath();
  for (const [dx, dy, l] of dirs) { g.moveTo(cx, cy); g.lineTo(cx + dx * l, cy + dy * l); }
  for (const k of rings) {
    for (let i = 0; i < spokes - 1; i++) {
      const [ax, ay, al] = dirs[i], [bx, by, bl] = dirs[i + 1];
      const ra = Math.min(al, rad) * k, rb = Math.min(bl, rad) * k;
      const px = cx + ax * ra, py = cy + ay * ra, qx = cx + bx * rb, qy = cy + by * rb;
      // sag toward the corner
      const mx = (px + qx) / 2, my = (py + qy) / 2;
      g.moveTo(px, py);
      g.quadraticCurveTo(mx + (cx - mx) * 0.16, my + (cy - my) * 0.16, qx, qy);
    }
  }
  g.stroke();
  g.lineCap = 'butt';
}

// the bottom edge: a far row of crooked roofs, then the graveyard, a fence and a dead tree
function drawSkyline(g, W, H, u, R) {
  const portrait = H > W;
  // far hills
  g.fillStyle = FAR;
  g.beginPath(); g.moveTo(0, H);
  g.lineTo(0, H - 34 * u);
  for (let x = 0; x <= W + 60; x += 60) g.quadraticCurveTo(x + 30, H - (40 + R() * 22) * u, x + 60, H - (30 + R() * 14) * u);
  g.lineTo(W, H); g.closePath(); g.fill();
  // a run of crooked houses, and a haunted house with a tower on the rise
  const lit = [];
  let x = W * (portrait ? 0.3 : 0.24);
  const end = W * (portrait ? 0.62 : 0.56);
  while (x < end) {
    const w = (24 + R() * 20) * u, h = (18 + R() * 20) * u;
    house(g, x, H - 28 * u, w, h, (R() - 0.5) * 0.12, (R() - 0.5) * 0.5, R, lit, R() < 0.55);
    x += w + (2 + R() * 10) * u;
  }
  const hx = W * (portrait ? 0.76 : 0.7);
  hauntedHouse(g, hx, H - 34 * u, u, R, lit);
  for (const [lx, ly, lw, lh] of lit) {
    g.fillStyle = `rgba(${WINDOW},0.42)`; g.fillRect(lx, ly, lw, lh);
    g.fillStyle = `rgba(${WINDOW},0.08)`; g.fillRect(lx - lw, ly - lh * 0.6, lw * 3, lh * 2.2);
  }

  // near ground
  g.fillStyle = NEAR;
  g.beginPath(); g.moveTo(0, H);
  g.lineTo(0, H - 18 * u);
  for (let gx = 0; gx <= W + 80; gx += 80) g.quadraticCurveTo(gx + 40, H - (24 + R() * 10) * u, gx + 80, H - (14 + R() * 8) * u);
  g.lineTo(W, H); g.closePath(); g.fill();

  // graveyard
  const gx0 = W * (portrait ? 0.36 : 0.38), gx1 = W * (portrait ? 0.96 : 0.9);
  let sx = gx0;
  let big = null;
  while (sx < gx1) {
    const w = (12 + R() * 9) * u, h = (16 + R() * 14) * u, tilt = (R() - 0.5) * 0.3;
    const kind = R();
    grave(g, sx + w / 2, H - 14 * u, w, h, tilt, kind < 0.2 ? 'cross' : kind < 0.75 ? 'round' : 'slab');
    if (kind >= 0.2 && kind < 0.75 && (!big || h > big.h)) big = { x: sx + w / 2, y: H - 14 * u, w, h, tilt };
    sx += w + (8 + R() * 26) * u;
  }
  if (big) {
    g.save(); g.translate(big.x, big.y); g.rotate(big.tilt);
    g.fillStyle = `rgba(${LIGHT},0.12)`; g.font = `700 ${Math.round(6 * u + 1)}px "IBM Plex Mono", ui-monospace, monospace`; g.textAlign = 'center';
    g.fillText('RIP', 0, -big.h * 0.55);
    g.restore();
  }
  // an iron fence along part of the ground
  const fx0 = W * (portrait ? 0.04 : 0.2), fx1 = fx0 + W * (portrait ? 0.24 : 0.16);
  g.strokeStyle = NEAR; g.fillStyle = NEAR; g.lineWidth = 1.6 * u;
  g.beginPath();
  g.moveTo(fx0, H - 30 * u); g.lineTo(fx1, H - 30 * u);
  g.moveTo(fx0, H - 22 * u); g.lineTo(fx1, H - 22 * u);
  for (let px = fx0; px <= fx1; px += 9 * u) {
    const top = H - (36 + Math.sin(px * 0.7) * 1.5) * u;
    g.moveTo(px, H - 12 * u); g.lineTo(px, top);
  }
  g.stroke();
  g.beginPath();
  for (let px = fx0; px <= fx1; px += 9 * u) {
    const top = H - (36 + Math.sin(px * 0.7) * 1.5) * u;
    g.moveTo(px - 2.4 * u, top + 1); g.lineTo(px, top - 5 * u); g.lineTo(px + 2.4 * u, top + 1); g.closePath();
  }
  g.fill();

  // a dead tree leaning in from the left edge
  g.strokeStyle = NEAR; g.lineCap = 'round';
  const tx = W * (portrait ? 0.13 : 0.08), tl = (portrait ? 70 : 62) * u;
  branch(g, tx, H - 12 * u, -Math.PI / 2 + 0.1, tl, 9 * u, 6, R);
  g.lineCap = 'butt';
}

function house(g, x, base, w, h, lean, roofSkew, R, lit, chimney) {
  const top = base - h, sk = lean * h;
  const peakX = x + w * (0.5 + roofSkew * 0.4) + sk, peakY = top - w * (0.45 + R() * 0.35);
  g.fillStyle = FAR;
  g.beginPath();
  g.moveTo(x, base + 6); g.lineTo(x + sk, top);
  g.lineTo(x - w * 0.08 + sk, top + 2);
  g.lineTo(peakX, peakY);
  g.lineTo(x + w * 1.08 + sk, top + 2);
  g.lineTo(x + w + sk, top); g.lineTo(x + w, base + 6);
  g.closePath(); g.fill();
  if (chimney) {
    const cx = x + w * (roofSkew > 0 ? 0.22 : 0.68) + sk, cw = w * 0.13;
    g.save(); g.translate(cx, top - w * 0.12); g.rotate((R() - 0.5) * 0.35);
    g.fillRect(-cw / 2, -w * 0.32, cw, w * 0.4);
    g.restore();
  }
  if (R() < 0.6) {
    const ww = Math.max(2.5, w * 0.14), wh = ww * 1.3;
    lit.push([x + w * (0.3 + R() * 0.3) + sk * 0.5, base - h * (0.45 + R() * 0.25), ww, wh]);
  }
}

function hauntedHouse(g, x, base, u, R, lit) {
  g.fillStyle = FAR;
  const w = 62 * u, h = 40 * u, lean = 0.06;
  // main hall
  g.beginPath();
  g.moveTo(x - w / 2, base + 8); g.lineTo(x - w / 2 + lean * h, base - h);
  g.lineTo(x - w / 2 - 6 * u + lean * h, base - h + 2);
  g.lineTo(x - w * 0.05 + lean * h, base - h - 30 * u);
  g.lineTo(x + w * 0.22, base - h - 22 * u);
  g.lineTo(x + w / 2 + 6 * u, base - h + 4);
  g.lineTo(x + w / 2, base - h + 2); g.lineTo(x + w / 2, base + 8);
  g.closePath(); g.fill();
  // tower with a crooked spire
  const tx = x - w / 2 + 4 * u, tw = 16 * u, th = 70 * u;
  g.beginPath();
  g.moveTo(tx - tw / 2, base + 8); g.lineTo(tx - tw / 2 + 2 * u, base - th);
  g.lineTo(tx - tw / 2 - 3 * u, base - th);
  g.quadraticCurveTo(tx - 2 * u, base - th - 18 * u, tx + 6 * u, base - th - 34 * u);
  g.quadraticCurveTo(tx + 3 * u, base - th - 14 * u, tx + tw / 2 + 4 * u, base - th);
  g.lineTo(tx + tw / 2 + 1 * u, base - th); g.lineTo(tx + tw / 2, base + 8);
  g.closePath(); g.fill();
  // chimney
  g.save(); g.translate(x + w * 0.32, base - h - 8 * u); g.rotate(0.16); g.fillRect(-3 * u, -14 * u, 6 * u, 18 * u); g.restore();
  // windows: the tower one is lit, and a couple in the hall
  lit.push([tx - 2 * u, base - th + 10 * u, 4 * u, 6 * u]);
  lit.push([x - w * 0.18, base - h * 0.62, 5 * u, 7 * u]);
  if (R() < 0.7) lit.push([x + w * 0.2, base - h * 0.58, 5 * u, 7 * u]);
  lit.push([x + w * 0.02, base - h * 0.28, 6 * u, 10 * u]);
}

function grave(g, x, base, w, h, tilt, kind) {
  g.save(); g.translate(x, base + 4); g.rotate(tilt);
  g.fillStyle = NEAR;
  g.beginPath();
  if (kind === 'cross') {
    const t = w * 0.32;
    g.rect(-t / 2, -h * 1.1, t, h * 1.1);
    g.rect(-w * 0.45, -h * 0.82, w * 0.9, t);
  } else if (kind === 'round') {
    g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h + w / 2);
    g.arc(0, -h + w / 2, w / 2, Math.PI, 0);
    g.lineTo(w / 2, 0); g.closePath();
  } else {
    g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h * 0.85); g.lineTo(-w * 0.2, -h); g.lineTo(w * 0.2, -h); g.lineTo(w / 2, -h * 0.85); g.lineTo(w / 2, 0); g.closePath();
  }
  g.fill();
  g.restore();
}

function branch(g, x, y, ang, len, wid, depth, R) {
  const bend = (R() - 0.5) * 0.5;
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  const mx = x + Math.cos(ang + bend) * len * 0.55, my = y + Math.sin(ang + bend) * len * 0.55;
  g.lineWidth = Math.max(0.8, wid);
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
  if (depth <= 0) return;
  const kids = depth > 4 ? 2 : R() < 0.55 ? 2 : 3;
  for (let i = 0; i < kids; i++) {
    // lean the crown toward the playfield (right) so the tree hugs its corner
    const spread = (i - (kids - 1) / 2) * (0.55 + R() * 0.35) + 0.12 + (R() - 0.5) * 0.3;
    branch(g, ex, ey, ang + spread, len * (0.62 + R() * 0.16), wid * 0.64, depth - 1, R);
  }
}

// a soft strip of ground fog, tiling horizontally; drawn at half resolution since it is all blur
function makeFog(W, H) {
  const fh = Math.round(Math.min(H * 0.26, 170)), k = 0.5;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(W * k)); c.height = Math.max(1, Math.ceil(fh * k));
  const g = c.getContext('2d');
  g.scale(k, k);
  const lg = g.createLinearGradient(0, 0, 0, fh);
  lg.addColorStop(0, 'rgba(176,158,214,0)'); lg.addColorStop(0.6, 'rgba(176,158,214,0.04)'); lg.addColorStop(1, 'rgba(176,158,214,0.11)');
  g.fillStyle = lg; g.fillRect(0, 0, W, fh);
  const R = mulberry32(1031);
  for (let i = 0; i < 16; i++) {
    const x = R() * W, y = fh * (0.45 + R() * 0.55), rx = 70 + R() * 120, ry = rx * (0.26 + R() * 0.14), a = (0.05 + R() * 0.07).toFixed(3);
    for (const ox of [-W, 0, W]) {
      if (x + ox + rx < 0 || x + ox - rx > W) continue;
      g.save(); g.translate(x + ox, y); g.scale(1, ry / rx);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, rx);
      rg.addColorStop(0, `rgba(196,180,232,${a})`); rg.addColorStop(1, 'rgba(196,180,232,0)');
      g.fillStyle = rg; g.fillRect(-rx, -rx, rx * 2, rx * 2);
      g.restore();
    }
  }
  return { c, h: fh };
}

// a bat seen from the front: one closed path, wings flapping with ph
function drawBat(ctx, b) {
  const s = b.s, f = Math.sin(b.ph), up = f * 0.5 * s;
  ctx.save();
  ctx.translate(b.x, b.y + Math.sin(b.x * 0.021 + b.seed) * 9);
  ctx.rotate(Math.sin(b.ph * 0.23 + b.seed) * 0.14);
  // right half from the top of the head round to the tail; the left half mirrors it
  const P = [[0, -0.22], [0.09, -0.44], [0.15, -0.2], [0.5, -0.34 - up / s * 0.5, 1.0, -0.3 - up / s], [0.86, -0.06 - up / s * 0.7, 0.72, 0.06 - up / s * 0.55], [0.62, -0.06 - up / s * 0.4, 0.46, 0.1 - up / s * 0.3], [0.32, 0.02 - up / s * 0.15, 0.16, 0.16], [0.06, 0.4, 0, 0.36]];
  ctx.beginPath();
  ctx.moveTo(P[0][0] * s, P[0][1] * s);
  for (let i = 1; i < P.length; i++) {
    const q = P[i];
    if (q.length === 2) ctx.lineTo(q[0] * s, q[1] * s); else ctx.quadraticCurveTo(q[0] * s, q[1] * s, q[2] * s, q[3] * s);
  }
  for (let i = P.length - 1; i >= 1; i--) {
    const q = P[i], prev = P[i - 1], px = (prev.length === 2 ? prev[0] : prev[2]) * s, py = (prev.length === 2 ? prev[1] : prev[3]) * s;
    if (q.length === 2) ctx.lineTo(-px, py); else ctx.quadraticCurveTo(-q[0] * s, q[1] * s, -px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(7,3,12,0.88)'; ctx.fill();
  ctx.strokeStyle = `rgba(${HW.moonGlow},0.16)`; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();
}

// a pen wiggle: a few incommensurate sines, bursting now and then
function wiggle(a, seed) {
  const burst = Math.pow(Math.max(0, Math.sin(a * 0.13 + seed * 1.7)), 6);
  return (Math.sin(a * 1.3 + seed) + Math.sin(a * 2.9 + seed * 2.1) * 0.6 + Math.sin(a * 6.1 + seed * 0.7) * 0.35) * (0.35 + burst * 3.2);
}

export class Paper {
  constructor() { this.t = 0; this.quake = 0; this.pulses = []; this.rows = []; this.sheet = null; this.bats = []; this.batAt = 2.5; this.fog = null; }
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
    if (HALLOWEEN) { this.fog = makeFog(W, H); this.bats = []; }
  }
  pulse(x) { this.pulses.push({ x, t: 0 }); }
  update(dt) {
    this.t += dt;
    for (const p of this.pulses) p.t += dt;
    this.pulses = this.pulses.filter((p) => p.t < 1.2);
    if (HALLOWEEN) this.updateBats(dt);
  }
  // now and then a little colony of two to four bats crosses the upper sky
  updateBats(dt) {
    const W = this.W || 0, H = this.H || 0;
    for (const b of this.bats) { b.x += b.vx * dt; b.ph += b.flap * dt; }
    if (this.bats.length) this.bats = this.bats.filter((b) => (b.vx > 0 ? b.x < W + 40 : b.x > -40));
    if (this.bats.length || !W) return;
    this.batAt -= dt;
    if (this.batAt > 0) return;
    this.batAt = 7 + Math.random() * 9;
    const n = 2 + Math.floor(Math.random() * 3), dir = Math.random() < 0.5 ? 1 : -1;
    const y0 = H * (0.12 + Math.random() * 0.26), speed = 42 + Math.random() * 30;
    let off = 0;
    for (let i = 0; i < n; i++) {
      this.bats.push({ x: dir > 0 ? -24 - off : W + 24 + off, y: y0 + (Math.random() - 0.5) * 56, vx: dir * speed * (0.85 + Math.random() * 0.3), s: 8 + Math.random() * 4.5, ph: Math.random() * 6.3, flap: 12 + Math.random() * 5, seed: Math.random() * 6.3 });
      off += 22 + Math.random() * 40;
    }
  }
  trace(ctx, r, amp) {
    const { W, t } = this;
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
  }
  draw(ctx) {
    if (HALLOWEEN) { this.drawNight(ctx); return; }
    const { W, H } = this;
    ctx.drawImage(this.sheet, 0, 0, W, H);
    const amp = 3.2 * (1 + this.quake * 7);
    ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
    for (const r of this.rows) {
      this.trace(ctx, r, amp);
      ctx.strokeStyle = 'rgba(82,53,66,0.26)';
      ctx.stroke();
    }
  }
  drawNight(ctx) {
    const { W, H, t } = this;
    ctx.drawImage(this.sheet, 0, 0, W, H);
    // ghost-green pen traces: a soft wide pass and a bright thin one; a shake or a Quake makes them flare
    const amp = 3.2 * (1 + this.quake * 7);
    let hot = this.quake;
    for (const p of this.pulses) hot = Math.max(hot, 1 - p.t / 1.2);
    ctx.lineJoin = 'round';
    const wide = `rgba(${HW.ghostGlow},${(0.06 + hot * 0.12).toFixed(3)})`, thin = `rgba(${HW.ghostGlow},${(0.34 + hot * 0.46).toFixed(3)})`;
    for (const r of this.rows) {
      this.trace(ctx, r, amp);
      ctx.strokeStyle = wide; ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = thin; ctx.lineWidth = 1.15; ctx.stroke();
    }
    for (const b of this.bats) drawBat(ctx, b);
    // two strips of ground fog drifting at different speeds
    const f = this.fog;
    if (f) {
      const o1 = (t * 9) % W, o2 = (t * 15 + W * 0.43) % W, h2 = f.h * 0.75;
      ctx.drawImage(f.c, -o1, H - f.h, W, f.h); ctx.drawImage(f.c, W - o1, H - f.h, W, f.h);
      const ga = ctx.globalAlpha;
      ctx.globalAlpha = ga * 0.7;
      ctx.drawImage(f.c, o2 - W, H - h2 + 6, W, h2); ctx.drawImage(f.c, o2, H - h2 + 6, W, h2);
      ctx.globalAlpha = ga;
    }
  }
}
