// Everything that gets tossed into the air. Glass (pale, transparent) is to
// be cut; stone (solid mauve, with a padlock) is shielded and must not be.
// Each type draws itself centred on the origin; the game caches them as
// sprites so a phone only pays for drawImage while playing.

import { drawWatcher, PAL } from './rocky.js';

const PEARL = (a) => `rgba(252,252,252,${a})`;
const GLOW = (a) => `rgba(243,231,236,${a})`;
const MAUVE = (a) => `rgba(130,90,109,${a})`;
const BACK = 'rgba(14,10,13,0.55)';

function path(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
}
// dark backing first so the city does not read through the glass
function glass(ctx, pts, fill = PEARL(0.16), stroke = PEARL(0.8), lw = 1.5) {
  path(ctx, pts); ctx.fillStyle = BACK; ctx.fill();
  path(ctx, pts); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function glint(ctx, pts, x = 0, a = 0.2) {
  ctx.save();
  path(ctx, pts); ctx.clip();
  ctx.fillStyle = PEARL(a);
  ctx.beginPath(); ctx.moveTo(x - 4, -120); ctx.lineTo(x + 8, -120); ctx.lineTo(x - 30, 60); ctx.lineTo(x - 42, 60); ctx.closePath(); ctx.fill();
  ctx.restore();
}
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);

function drawWatcherTarget(ctx) {
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fillStyle = BACK; ctx.fill();
  drawWatcher(ctx, 0, 0, 30, 0.5, 0.35, 0.6);
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.strokeStyle = PEARL(0.85); ctx.lineWidth = 1.6; ctx.stroke();
}

function drawGolem(ctx) {
  ctx.save();
  ctx.scale(1.15, 1.15); ctx.translate(0, 31);
  const F = PEARL(0.15), S = PEARL(0.8);
  glass(ctx, [[-13, 0], [-2, 0], [-2, -5], [-12, -6]], F, S);
  glass(ctx, [[2, 0], [14, 0], [13, -6], [2, -5]], F, S);
  glass(ctx, [[-10, -5], [-3, -5], [-3, -20], [-10, -20]], F, S);
  glass(ctx, [[3, -5], [10, -5], [10, -20], [3, -20]], F, S);
  const torso = [[-15, -19], [15, -19], [17, -32], [13, -46], [-13, -46], [-17, -32]];
  glass(ctx, torso, PEARL(0.18), S);
  path(ctx, [[-13, -46], [13, -46], [8, -40], [-8, -40]]); ctx.fillStyle = PEARL(0.14); ctx.fill();
  ctx.fillStyle = MAUVE(0.85); ctx.fillRect(-4, -36, 8, 8);
  ctx.strokeStyle = GLOW(0.7); ctx.lineWidth = 0.8; ctx.strokeRect(-4, -36, 8, 8);
  glass(ctx, [[-22, -44], [-15, -48], [-13, -38], [-19, -34]], F, S);
  glass(ctx, [[22, -44], [15, -48], [13, -38], [19, -34]], F, S);
  const head = [[-9, -46], [-11, -54], [-6, -62], [6, -62], [11, -54], [9, -46]];
  glass(ctx, head, PEARL(0.18), S);
  glint(ctx, torso, 6); glint(ctx, head, 4);
  ctx.fillStyle = GLOW(0.95); ctx.fillRect(-6, -56, 12, 2.4);
  ctx.restore();
}

function drawPrism(ctx) {
  const outer = [[0, -36], [17, -14], [13, 26], [-9, 32], [-19, -6]];
  glass(ctx, outer, PEARL(0.14), PEARL(0.85), 1.6);
  path(ctx, [[-3, -4], [17, -14], [13, 26], [-9, 32]]); ctx.fillStyle = MAUVE(0.3); ctx.fill();
  path(ctx, [[0, -36], [-19, -6], [-3, -4]]); ctx.fillStyle = PEARL(0.2); ctx.fill();
  ctx.strokeStyle = PEARL(0.5); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(-3, -4); ctx.lineTo(-9, 32); ctx.moveTo(-3, -4); ctx.lineTo(17, -14); ctx.moveTo(-3, -4); ctx.lineTo(-19, -6); ctx.stroke();
  glint(ctx, outer, 10, 0.25);
  ctx.fillStyle = PEARL(0.9); ctx.fillRect(4, -22, 2, 2);
}

function drawProbe(ctx) {
  ctx.save(); ctx.scale(1.5, 1.5); ctx.translate(0, -2);
  glass(ctx, [[-12, -8], [-20, -14], [-14, 0]], PEARL(0.12), PEARL(0.6), 1);
  glass(ctx, [[12, -8], [20, -14], [14, 0]], PEARL(0.12), PEARL(0.6), 1);
  const body = [[0, 20], [-12, -4], [-7, -16], [7, -16], [12, -4]];
  glass(ctx, body, PEARL(0.18), PEARL(0.85), 1.1);
  glint(ctx, body, 4);
  ctx.beginPath(); ctx.arc(0, -4, 6.5, 0, Math.PI * 2); ctx.fillStyle = PAL.mauve; ctx.fill();
  ctx.strokeStyle = GLOW(0.85); ctx.lineWidth = 0.9; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -3, 2.8, 0, Math.PI * 2); ctx.fillStyle = PAL.ink; ctx.fill();
  ctx.fillStyle = PEARL(0.9); ctx.fillRect(-2.5, -8, 1.6, 1.6);
  ctx.restore();
}

function drawMoth(ctx) {
  ctx.save(); ctx.scale(1.12, 1.12);
  const fl = [[-4, -4], [-28, -18], [-33, -2], [-10, 6]], hl = [[-5, 3], [-22, 6], [-18, 16], [-6, 9]];
  for (const wng of [hl, mirror(hl)]) glass(ctx, wng, PEARL(0.1), PEARL(0.55), 1);
  for (const wng of [fl, mirror(fl)]) { glass(ctx, wng, PEARL(0.16), PEARL(0.8), 1.1); }
  glint(ctx, fl, -12, 0.2); glint(ctx, mirror(fl), 22, 0.2);
  ctx.strokeStyle = PEARL(0.35); ctx.lineWidth = 0.8; ctx.beginPath();
  ctx.moveTo(-4, -2); ctx.lineTo(-26, -12); ctx.moveTo(-6, 0); ctx.lineTo(-28, -2); ctx.moveTo(4, -2); ctx.lineTo(26, -12); ctx.moveTo(6, 0); ctx.lineTo(28, -2);
  ctx.stroke();
  path(ctx, [[-3, -9], [3, -9], [5, 2], [0, 10], [-5, 2]]); ctx.fillStyle = BACK; ctx.fill();
  path(ctx, [[-3, -9], [3, -9], [5, 2], [0, 10], [-5, 2]]); ctx.fillStyle = MAUVE(0.75); ctx.fill(); ctx.strokeStyle = GLOW(0.85); ctx.lineWidth = 0.9; ctx.stroke();
  ctx.strokeStyle = GLOW(0.7); ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(-6, -15); ctx.moveTo(2, -9); ctx.lineTo(6, -15); ctx.stroke();
  ctx.fillStyle = GLOW(0.95); ctx.fillRect(-3, -6, 6, 2);
  ctx.restore();
}

// Shielded block: solid stone, never glass. A cube with a padlock.
function drawBlock(ctx) {
  const r = 34, hx = r * 0.866, T = [0, -r], UR = [hx, -r / 2], LR = [hx, r / 2], B = [0, r], LL = [-hx, r / 2], UL = [-hx, -r / 2], C = [0, 0];
  const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.5);
  halo.addColorStop(0, 'rgba(10,6,9,0.55)'); halo.addColorStop(1, 'rgba(10,6,9,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2); ctx.fill();
  path(ctx, [T, UR, C, UL]); ctx.fillStyle = '#A17A8F'; ctx.fill();
  path(ctx, [UL, C, B, LL]); ctx.fillStyle = '#825A6D'; ctx.fill();
  path(ctx, [UR, LR, B, C]); ctx.fillStyle = '#523542'; ctx.fill();
  ctx.strokeStyle = 'rgba(243,231,236,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(C[0], C[1]); ctx.lineTo(UL[0], UL[1]); ctx.moveTo(C[0], C[1]); ctx.lineTo(UR[0], UR[1]); ctx.moveTo(C[0], C[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
  path(ctx, [T, UR, LR, B, LL, UL]); ctx.strokeStyle = '#150D11'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
  // padlock badge
  ctx.fillStyle = '#150D11'; ctx.beginPath(); ctx.arc(0, 3, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PAL.glow; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, 5.5, Math.PI, 0); ctx.lineTo(5.5, 3); ctx.moveTo(-5.5, 0); ctx.lineTo(-5.5, 3); ctx.stroke();
  ctx.fillStyle = PAL.glow; ctx.fillRect(-8.5, 2.5, 17, 11.5);
  ctx.fillStyle = '#150D11'; ctx.beginPath(); ctx.arc(0, 7, 2.1, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-1, 7, 2, 4.5);
  ctx.lineCap = 'butt';
}

export const POWERS = {
  overclock: { name: 'Overclock', text: 'glass from every side', dur: 6 },
  amp:       { name: 'Amplifier', text: 'every point counts double', dur: 8 },
  stasis:    { name: 'Stasis', text: 'time slows, the clock stops', dur: 5 },
  quake:     { name: 'Quake', text: 'everything shatters', dur: 0 },
  repair:    { name: 'Repair', text: 'one crack healed', dur: 0 },
};

function drawPower(ctx, kind) {
  const hex = [[0, -30], [26, -15], [26, 15], [0, 30], [-26, 15], [-26, -15]];
  const halo = ctx.createRadialGradient(0, 0, 8, 0, 0, 44);
  halo.addColorStop(0, GLOW(0.3)); halo.addColorStop(1, GLOW(0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();
  glass(ctx, hex, MAUVE(0.6), GLOW(0.95), 1.8);
  path(ctx, [[0, -30], [26, -15], [0, 0], [-26, -15]]); ctx.fillStyle = PEARL(0.14); ctx.fill();
  ctx.strokeStyle = PAL.glow; ctx.fillStyle = PAL.glow; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  if (kind === 'overclock') { ctx.moveTo(-12, -11); ctx.lineTo(-1, 0); ctx.lineTo(-12, 11); ctx.moveTo(2, -11); ctx.lineTo(13, 0); ctx.lineTo(2, 11); ctx.stroke(); }
  else if (kind === 'amp') { ctx.font = '700 19px "JetBrains Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('x2', 0, 1); ctx.textBaseline = 'alphabetic'; }
  else if (kind === 'stasis') { ctx.moveTo(-9, -12); ctx.lineTo(9, -12); ctx.lineTo(-9, 12); ctx.lineTo(9, 12); ctx.closePath(); ctx.stroke(); }
  else if (kind === 'quake') { ctx.moveTo(-15, 2); ctx.lineTo(-8, 2); ctx.lineTo(-4, -12); ctx.lineTo(2, 13); ctx.lineTo(7, -5); ctx.lineTo(10, 2); ctx.lineTo(15, 2); ctx.stroke(); }
  else if (kind === 'repair') { ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke(); }
  ctx.lineCap = 'butt';
}

// r is the hit radius, pad the half-size of the cached sprite
export const TYPES = {
  watcher: { name: 'Watcher', r: 36, pad: 54, pts: 1, draw: drawWatcherTarget },
  golem:   { name: 'Glass Golem', r: 38, pad: 46, pts: 1, draw: drawGolem },
  prism:   { name: 'Prism', r: 34, pad: 44, pts: 1, draw: drawPrism },
  probe:   { name: 'Probe', r: 30, pad: 44, pts: 1, draw: drawProbe },
  moth:    { name: 'Glass Moth', r: 30, pad: 46, pts: 2, draw: drawMoth },
  block:   { name: 'shielded block', r: 34, pad: 54, forbidden: true, draw: drawBlock },
  power:   { name: 'power-up', r: 32, pad: 48 },
  boss:    { name: 'The Auditor', r: 84 },
};
export const BASE_TYPES = ['watcher', 'golem', 'prism', 'probe', 'moth'];
export const spriteKey = (o) => (o.type === 'power' ? 'power:' + o.kind : o.type);

export function buildSprites(q) {
  const out = {};
  const mk = (key, pad, draw) => {
    const c = document.createElement('canvas');
    const n = Math.ceil(pad * 2 * q);
    c.width = n; c.height = n;
    const g = c.getContext('2d');
    g.scale(q, q); g.translate(pad, pad);
    draw(g);
    out[key] = { c, pad };
  };
  for (const k of [...BASE_TYPES, 'block']) mk(k, TYPES[k].pad, TYPES[k].draw);
  for (const kind of Object.keys(POWERS)) mk('power:' + kind, TYPES.power.pad, (g) => drawPower(g, kind));
  return out;
}

// The Auditor is drawn live: its eye follows the blade.
export function drawBoss(ctx, b, lookX, lookY) {
  ctx.save();
  ctx.translate(b.x, b.y);
  const k = 1 + Math.sin(b.ph * 2) * 0.015 + b.punch * 0.06;
  ctx.scale(k, k);
  const halo = ctx.createRadialGradient(0, 0, 50, 0, 0, 150);
  halo.addColorStop(0, GLOW(0.22)); halo.addColorStop(1, GLOW(0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fillStyle = 'rgba(14,10,13,0.7)'; ctx.fill();
  drawWatcher(ctx, 0, 0, 70, lookX, lookY, b.ph);
  ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.strokeStyle = PEARL(0.9); ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = PEARL(0.85); ctx.lineWidth = 1.6; ctx.lineJoin = 'miter';
  for (const c of b.cracks) {
    ctx.beginPath();
    c.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  ctx.restore();
}
