// Rocky, the Seismic mascot, as the host of the Halloween edition:
// "Jack-o'-Rocky". The procedural golem comes from the sister game Magnitude Run
// (same shapes, same exports: drawRocky, POSES, PAL, R, applySkin), with his
// costume always on in this file:
//  - his face carved like a jack-o'-lantern: triangle eyes and a jagged grin,
//    lit from inside with a warm orange flicker (blinks are a squint),
//  - his chest crystal burning as an ember,
//  - a tattered vampire cape (dark purple outside, deep red inside, ragged hem)
//    hung from the shoulders, swaying and streaming, with a high collar.
// Authored ~96 units tall, origin at the centre of the feet, y down, facing right.
//
//   drawRocky(ctx, x, y, s, POSES.idle(t), { t })     one frame of a pose
//   const host = new RockyHost(); host.react('cheer'); host.update(dt); host.draw(ctx, x, y, s)
//
// Poses: idle, cheer (both arms up), wave, flinch, plus the runner's run, jump,
// fall, stomp, land, slide and dash.

import { HW } from './theme.js';

export const PAL = {
  light: '#A17A8F', mauve: '#825A6D', mid: '#6A475A', purple: '#523542',
  plum: '#3D2731', deep: '#2A1C22', glow: '#F3E7EC', pearl: '#FCFCFC', ink: '#161616',
};

// warm faceted stone; the chest gem is an ember tonight
const STONE = {
  light: '#BE8A5B', mauve: '#9C6B45', mid: '#7E5436', purple: '#5F3D28', plum: '#452A1C', deep: '#261610',
  glow: '#FCFCFC', gem: HW.pumpkinDeep, gemHi: HW.pumpkin, gemGlow: HW.ember,
};
export const SKINS = {
  mauve:    { name: 'Stone', pal: {} },
  obsidian: { name: 'Obsidian', pal: { light: '#77717C', mauve: '#514C58', mid: '#3D3943', purple: '#2C2A31', plum: '#1F1D22', deep: '#0C0B0D' } },
  rose:     { name: 'Rose Quartz', pal: { light: '#E4BACD', mauve: '#C893AD', mid: '#A8758F', purple: '#86566F', plum: '#643F53', deep: '#3D2731' } },
};
export const R = { ...STONE };
export function applySkin(id) {
  const sk = SKINS[id] || SKINS.mauve;
  Object.assign(R, STONE, sk.pal);
}

// the costume
const CAPE = {
  out: HW.plum, outHi: '#563072', outLo: '#24112F',
  lin: '#8C1D3A', linLo: '#5C1129', rim: 'rgba(194,154,175,0.7)',
};
const CUT = { wall: HW.pumpkinDeep, fire: HW.pumpkin, core: '#FFD36B', hot: '#FFF3C4' };
const EMBER = ['#E8661E', HW.pumpkin, '#FFC24A', HW.pumpkinDeep, '#FFA03A'];

let FLASH = null;
const OUT = 1.7;
const TAU = Math.PI * 2;

function path(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
export function poly(ctx, pts, fill) {
  path(ctx, pts);
  ctx.fillStyle = FLASH || fill;
  ctx.fill();
}
function outline(ctx, pts, w = OUT, close = true) {
  if (FLASH) return;
  path(ctx, pts, close);
  ctx.strokeStyle = R.deep; ctx.lineWidth = w; ctx.lineJoin = 'round';
  ctx.stroke();
}
function seam(ctx, pts, a = 0.5, w = 0.9, col = R.deep) {
  if (FLASH) return;
  ctx.save();
  ctx.globalAlpha *= a;
  path(ctx, pts, false);
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}
function part(ctx, outer, base, facets, seams) {
  poly(ctx, outer, base);
  for (const f of facets) poly(ctx, f[0], f[1]);
  if (seams) for (const s of seams) seam(ctx, s);
  outline(ctx, outer);
}

// Beveled stone block from (x,y) along angle a (0 = down, + = forward).
function limb(ctx, x, y, a, L, w0, w1, main, shade, hi) {
  const dx = Math.sin(a), dy = Math.cos(a), nx = dy, ny = -dx;
  const P = (u, v) => [x + dx * u + nx * v, y + dy * u + ny * v];
  const b = Math.min(3, L * 0.25), h0 = w0 / 2, h1 = w1 / 2;
  const outer = [P(0, -h0 + b), P(b, -h0), P(L - b, -h1), P(L, -h1 + b), P(L, h1 - b), P(L - b, h1), P(b, h0), P(0, h0 - b)];
  const back = [P(b, -h0), P(L - b, -h1), P(L, -h1 + b), P(L, -h1 * 0.15), P(0, -h0 * 0.15), P(0, -h0 + b)];
  const chip = [P(b + 0.5, h0 - 1.4), P(L * 0.6, h1 - 1.4), P(L * 0.35, h0 * 0.3)];
  part(ctx, outer, main, [[back, shade], [chip, hi]]);
  return [x + dx * L, y + dy * L, dx, dy, nx, ny];
}

function cols(far) {
  return far ? [R.mid, R.purple, R.mauve, R.plum] : [R.mauve, R.mid, R.light, R.purple];
}

function drawLeg(ctx, hx, hy, leg, far) {
  const c = cols(far);
  const [kx, ky] = limb(ctx, hx, hy, leg.hip, 11, 15, 14, c[0], c[1], c[2]);
  const sa = leg.hip - leg.knee;
  const [ax, ay] = limb(ctx, kx, ky, sa, 10, 14, 15, c[0], c[1], c[2]);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(-sa * 0.4);
  const outer = [[-8, -3], [-5, -6], [7, -6], [12, -3], [14, 1], [13, 5], [-9, 5], [-10, 1]];
  part(ctx, outer, c[0], [
    [[[-5, -6], [7, -6], [12, -3], [4, -2], [-6, -3]], c[2]],
    [[[-10, 1], [14, 1], [13, 5], [-9, 5]], c[3]],
  ], [[[6, -4], [8, 1]]]);
  ctx.restore();
}

function drawArm(ctx, sx, sy, arm, far) {
  const c = cols(far);
  const [ex, ey] = limb(ctx, sx, sy, arm.sh, 13, 11, 12, c[0], c[1], c[2]);
  const [hx, hy, dx, dy, nx, ny] = limb(ctx, ex, ey, arm.sh + arm.el, 12, 13, 15, c[0], c[1], c[2]);
  const P = (u, v) => [hx + dx * u + nx * v, hy + dy * u + ny * v];
  const outer = [P(-1, -7), P(3, -8.5), P(11, -8), P(14, -4), P(14, 4), P(11, 8), P(3, 8.5), P(-1, 7)];
  part(ctx, outer, c[0], [
    [[P(3, -8.5), P(11, -8), P(14, -4), P(14, -1), P(-1, -1), P(-1, -7)], c[1]],
    [[P(0, 6), P(3, 8), P(9, 7.5), P(5, 3)], c[2]],
  ], [[P(9, -6), P(9.5, 6)]]);
}

function pauldron(ctx, x, y, rot, far) {
  const c = cols(far);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const outer = [[-11, -2], [-8, -10], [1, -13], [10, -9], [13, -1], [10, 7], [0, 10], [-9, 6]];
  part(ctx, outer, c[0], [
    [[[-8, -10], [1, -13], [10, -9], [5, -4], [-5, -5]], c[2]],
    [[[13, -1], [10, 7], [0, 10], [-9, 6], [1, 3]], c[1]],
  ], [[[-11, -2], [-5, -5], [5, -4], [13, -1]]]);
  ctx.restore();
}

function drawPelvis(ctx) {
  const outer = [[-17, -10], [15, -11], [20, -4], [17, 4], [-14, 5], [-19, -2]];
  part(ctx, outer, R.purple, [[[[-17, -10], [15, -11], [18, -6], [-17, -5]], R.mid]]);
}

// ---------- the cape ----------
// Torso frame (hip at 0, shoulders near y -41). st = how far it streams back
// (0 hangs, 1 flies), hemY = where the hem hangs at rest, ph = flutter phase.
const HEM = [4.6, -1.6, 3.1, -2.6, 5.2, -1.2, 3.6, -2];
function capeShape(t, st, hemY, ph) {
  const sw = Math.sin(t * 1.9 + ph) * 1.6 + Math.sin(t * 3.3 + ph * 2) * 0.7;
  const pts = [[13, -47], [-2, -51], [-19, -47.5]];
  pts.push([-27 - 5 * st + sw * 0.25, -32 + 2 * st]);
  pts.push([-32 - 12 * st + sw * 0.6, -11 + st]);
  const bx = -37 - 20 * st + sw, by = hemY - 10 * st;
  pts.push([bx, by]);
  const fx = 9 - 3 * st + sw * 0.3, fy = hemY + 1 - 4 * st;
  const N = HEM.length + 1;
  for (let i = 1; i < N; i++) {
    const k = i / N, flut = Math.sin(t * 4.3 + i * 1.9 + ph) * 1.2;
    pts.push([bx + (fx - bx) * k + flut * 0.4, by + (fy - by) * k + HEM[i - 1] + flut]);
  }
  pts.push([fx, fy], [12, -20]);
  return pts;
}
function drawCapeBack(ctx, t, st, hipY) {
  const hemY = -hipY - 9;
  // the lining: the inside of the far half, flaring out behind
  const lin = capeShape(t, Math.min(1.3, st + 0.3), hemY + 2, 1.3);
  poly(ctx, lin, CAPE.lin);
  poly(ctx, [lin[2], lin[3], lin[4], [lin[4][0] + 6, lin[4][1] + 2], [lin[3][0] + 5, lin[3][1]], [-12, -46]], CAPE.linLo);
  outline(ctx, lin, 1.4);
  // the outside
  const out = capeShape(t, st, hemY, 0);
  poly(ctx, out, CAPE.out);
  const n = out.length;
  // a lit fold down the middle and a shadow fold near the back
  poly(ctx, [[-6, -49], [-12, -30], [out[9][0] - 2, out[9][1] - 3], [out[10][0], out[10][1] - 1], [-6, -28], [-2, -49]], CAPE.outHi);
  poly(ctx, [[-17, -46], [-21 - 2 * st, -28], [out[6][0] + 1, out[6][1] - 1], [out[7][0], out[7][1] - 2], [-16 - 2 * st, -26]], CAPE.outLo);
  outline(ctx, out, 1.4);
  if (!FLASH) {
    // moonlight on the back edge, so it reads on a night sheet
    path(ctx, [out[2], out[3], out[4], out[5]], false);
    ctx.strokeStyle = CAPE.rim; ctx.lineWidth = 1; ctx.stroke();
  }
  return n;
}
// high pointed collar behind the head; red inside
function drawCollar(ctx, st) {
  const f = st * 1.5;
  const outer = [[-1, -47], [-12, -49], [-22 - f, -57], [-29 - f, -72], [-20 - f, -65.5], [-16 - f * 0.5, -78], [-9, -61], [-3, -54]];
  poly(ctx, outer, CAPE.out);
  poly(ctx, [[-4, -49], [-12, -51], [-20.5 - f, -58], [-25 - f, -67], [-18 - f, -62], [-15 - f * 0.5, -72], [-9, -58.5], [-4, -53]], CAPE.lin);
  outline(ctx, outer, 1.3);
}
// the band and clasp at the throat
function drawClasp(ctx, fire) {
  poly(ctx, [[-7, -44.5], [12, -45], [13.5, -49.5], [-6, -50]], CAPE.out);
  outline(ctx, [[-7, -44.5], [12, -45], [13.5, -49.5], [-6, -50]], 1.1);
  ctx.beginPath(); ctx.arc(12, -47, 2.4, 0, TAU);
  ctx.fillStyle = FLASH || CUT.fire; ctx.fill();
  if (!FLASH) {
    ctx.strokeStyle = R.deep; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = `rgba(255,243,196,${0.5 + 0.5 * fire})`; ctx.fillRect(11.2, -48.4, 1.2, 1.2);
  }
}

// ---------- torso and the ember ----------
const CRACKS = [
  [[-12, -40], [-8, -33], [-13, -25], [-9, -16]],
  [[19, -15], [14, -11], [20, -7]],
  [[14, -45], [18, -38], [12, -32], [15, -28]],
];

function drawTorso(ctx, cracks, crackGlow, glow) {
  const outer = [[-22, -12], [-26, -26], [-22, -42], [-10, -49], [12, -49], [24, -42], [28, -26], [22, -12], [8, -7], [-12, -7]];
  part(ctx, outer, R.mauve, [
    [[[-22, -42], [-10, -49], [12, -49], [24, -42], [10, -38], [-12, -38]], R.light],
    [[[-22, -12], [-26, -26], [-22, -42], [-12, -38], [-14, -12], [-12, -7]], R.purple],
    [[[24, -42], [28, -26], [22, -12], [14, -14], [16, -36], [10, -38]], R.mid],
    [[[-14, -12], [14, -14], [22, -12], [8, -7], [-12, -7]], R.plum],
  ], [
    [[-12, -38], [-14, -12]], [[10, -38], [16, -36], [14, -14]],
    [[-5, -44], [-1, -41], [-3, -38]], [[20, -30], [24, -27]],
  ]);
  if (!FLASH) {
    path(ctx, [[-12, -7], [-22, -12], [-26, -26], [-22, -42], [-10, -49]], false);
    ctx.strokeStyle = 'rgba(255,170,110,0.4)'; ctx.lineWidth = 0.9; ctx.stroke();
  }
  // the ember: the Seismic logomark burning in its dark socket
  const a = Math.max(0, Math.min(1.4, glow)), gx = 2, gy = -26, GS = 9.5;
  if (!FLASH) {
    const g = ctx.createRadialGradient(gx, gy, 1, gx, gy, 19);
    g.addColorStop(0, `rgba(${R.gemGlow},${0.6 * Math.min(1, a)})`);
    g.addColorStop(1, `rgba(${R.gemGlow},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(gx, gy, 19, 0, TAU); ctx.fill();
  }
  const hull = [[0, -1.12], [0.62, -0.86], [0.8, 0.26], [0.5, 1.12], [-0.3, 1.12], [-0.8, 0.22], [-0.64, -0.1], [-0.12, -1.05]].map(([u, v]) => [gx + u * GS, gy + v * GS]);
  poly(ctx, hull, '#2A0E06');
  MARK.forEach((pts, i) => poly(ctx, pts.map(([u, v]) => [gx + u * GS, gy + v * GS]), EMBER[i]));
  if (!FLASH) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.75, 0.1 + 0.4 * a);
    for (const pts of MARK) { path(ctx, pts.map(([u, v]) => [gx + u * GS, gy + v * GS])); ctx.fillStyle = CUT.hot; ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = `rgba(255,248,220,${0.6 + 0.3 * Math.min(1, a)})`;
    ctx.fillRect(gx + 0.5, gy - 7.5, 1.6, 1.6);
    for (let i = 0; i < Math.min(3, cracks); i++) {
      const c = CRACKS[i];
      path(ctx, c, false);
      ctx.strokeStyle = R.deep; ctx.lineWidth = 2.6; ctx.lineJoin = 'miter'; ctx.stroke();
      ctx.strokeStyle = `rgba(${R.gemGlow},${0.45 + 0.55 * crackGlow})`; ctx.lineWidth = 1.3; ctx.stroke();
    }
  }
}
// the Seismic logomark, five facets
const MARK = [
  [[-0.045, -0.941], [-0.559, 0], [-0.05, -0.65]],
  [[0, -1], [0.509, -0.768], [0.45, -0.032], [-0.027, -0.655]],
  [[0.532, -0.627], [0.677, 0.227], [0.473, -0.023]],
  [[-0.05, -0.609], [0.432, -0.009], [-0.205, 0.955], [-0.673, 0.214]],
  [[0.445, 0.027], [0.677, 0.286], [0.418, 1], [-0.182, 1]],
];

// ---------- the jack-o'-lantern head ----------
// a carved hole lit from inside: orange wall, bright core
function carve(ctx, pts, fire, inset = 0.5) {
  poly(ctx, pts, CUT.wall);
  if (FLASH) return;
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p[0]; cy += p[1]; }
  cx /= pts.length; cy /= pts.length;
  const inner = pts.map(([x, y]) => [cx + (x - cx) * (1 - inset * 0.55), cy + (y - cy) * (1 - inset * 0.55) + 0.25]);
  poly(ctx, inner, CUT.fire);
  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.35 + 0.65 * fire);
  poly(ctx, pts.map(([x, y]) => [cx + (x - cx) * (1 - inset), cy + (y - cy) * (1 - inset) + 0.35]), CUT.core);
  ctx.restore();
  outline(ctx, pts, 0.8);
}

// Head frame: neck at (0,0), dome up to y=-26. eye = { w: size, h: openness 0..1.3, dx: look }
// mouth: 0 grin, 1 wide grin, -1 a gasp.
function drawHead(ctx, eye, mouth, fire) {
  const outer = [[-13, 0], [-15, -10], [-11, -21], [-2, -26], [10, -25], [16, -17], [17, -6], [14, 1], [-10, 2]];
  part(ctx, outer, R.mauve, [
    [[[-11, -21], [-2, -26], [10, -25], [12, -20], [-1, -19]], R.light],
    [[[-13, 0], [-15, -10], [-11, -21], [-1, -19], [-4, -9], [-5, 1.5], [-10, 2]], R.mid],
    [[[12, -20], [16, -17], [17, -6], [14, 1], [11, 1], [12, -10]], R.mid],
    [[[-5, 1.5], [-4, -3], [12, -3], [14, 1]], R.purple],
  ], [[[-1, -19], [-4, -9], [-5, 1.5]], [[12, -20], [12, -10], [11, 1]], [[-7, -23], [-1, -19]]]);
  poly(ctx, [[-4, -15.5], [13, -16.5], [12.5, -14], [-3.5, -13.4]], R.purple);
  // a pumpkin stem on top
  const stem = [[2.2, -24.6], [1.4, -29], [3.4, -32], [7, -31.4], [7.4, -29.6], [5.4, -28.8], [5.8, -25]];
  poly(ctx, stem, HW.stem);
  poly(ctx, [[3.4, -32], [7, -31.4], [7.4, -29.6], [4.6, -30]], '#5E8A34');
  outline(ctx, stem, 1.1);
  if (!FLASH) {
    path(ctx, [[-10, 2], [-13, 0], [-15, -10], [-11, -21], [-2, -26]], false);
    ctx.strokeStyle = 'rgba(255,170,110,0.45)'; ctx.lineWidth = 0.9; ctx.stroke();
    // firelight spilling over the face
    const g = ctx.createRadialGradient(7, -8, 1, 7, -8, 15);
    g.addColorStop(0, `rgba(${HW.ember},${0.32 * fire})`);
    g.addColorStop(1, `rgba(${HW.ember},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(7, -8, 15, 0, TAU); ctx.fill();
  }
  const dx = eye.dx * 0.9, h = Math.max(0.14, eye.h), w = eye.w;
  // triangle eyes, point up; a blink is a squint
  for (const [ex, ey, bw, bh] of [[1.4 + dx, -9.2, 2.9, 5], [8.8 + dx, -9.5, 2.5, 4.6]]) {
    const hw = bw * w, top = ey - bh * w * h;
    carve(ctx, [[ex - hw, ey], [ex + hw, ey], [ex + 0.5, top]], fire, h < 0.4 ? 0.2 : 0.5);
  }
  const mx = dx * 0.6;
  if (mouth < -0.4) {
    // a gasp: a jagged O
    const o = [];
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, r = i % 2 ? 2.1 : 2.9; o.push([8 + mx + Math.cos(a) * r * 0.9, -3.8 + Math.sin(a) * r]); }
    carve(ctx, o, fire, 0.5);
  } else {
    const k = 1 + 0.4 * Math.max(0, mouth), y0 = -4.4;
    const G = [[-1.6, -6.3], [1.5, -5.3], [3, -3.6], [4.5, -5.1], [8, -5.2], [9.6, -3.5], [11.1, -5], [14.6, -6.9],
      [13.8, -4.8], [11.8, -2.3], [10.3, -3.5], [8.4, -1.5], [5.6, -1.4], [4.1, -2.9], [2.6, -1.9], [0, -3.5]];
    carve(ctx, G.map(([x, y]) => [x + mx, y0 + (y - y0) * k]), fire, 0.45);
  }
}

const nowS = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
// the lantern flicker: incommensurate sines, never quite repeating
export function flicker(t) {
  return Math.max(0, Math.min(1, 0.8 + 0.11 * Math.sin(t * 13.7) + 0.08 * Math.sin(t * 23.3 + 1.7) + 0.05 * Math.sin(t * 5.1 + 0.4)));
}

// pose: from POSES. opts: t (seconds, drives the flicker and the cape; defaults
// to the clock), glow (ember, ~0.6 rest, >1 flaring), fire (face light 0..1,
// defaults to the flicker), cracks/crackGlow, flash (white pass), inv (blink).
export function drawRocky(ctx, x, y, s, pose, opts = {}) {
  const { cracks = 0, flash = 0, crackGlow = 0.4, inv = 0, glow = 0.6 } = opts;
  const t = opts.t == null ? nowS() : opts.t;
  const fire = opts.fire == null ? flicker(t) : opts.fire;
  const passes = flash > 0.02 ? 2 : 1;
  const hipY = pose.hipY == null ? -26 : pose.hipY;
  const st = Math.max(0, pose.cape == null ? 0.15 : pose.cape);
  const mouth = pose.mouth || 0;
  for (let p = 0; p < passes; p++) {
    FLASH = p === 1 ? R.glow : null;
    ctx.save();
    if (p === 1) ctx.globalAlpha = Math.min(1, flash);
    else if (inv > 0 && Math.floor(inv * 14) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.translate(x, y + (pose.bob || 0) * s);
    ctx.scale(s * pose.sx, s * pose.sy);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // the cape and collar hang behind everything
    ctx.save();
    ctx.translate(0, hipY); ctx.rotate(pose.lean);
    drawCapeBack(ctx, t, st, hipY);
    drawCollar(ctx, st);
    ctx.restore();
    drawLeg(ctx, -8, hipY, pose.legs[0], true);
    ctx.save();
    ctx.translate(0, hipY); ctx.rotate(pose.lean);
    drawArm(ctx, -17, -40, pose.arms[0], true);
    pauldron(ctx, -17, -41, pose.arms[0].sh * 0.2, true);
    drawPelvis(ctx);
    drawTorso(ctx, cracks, crackGlow, glow * (0.75 + 0.35 * fire));
    poly(ctx, [[-9, -46], [11, -46], [9, -50], [-7, -50]], R.plum);
    drawClasp(ctx, fire);
    ctx.save(); ctx.translate(3, -48); ctx.rotate(pose.hr || 0); drawHead(ctx, pose.eye, mouth, fire); ctx.restore();
    ctx.restore();
    drawLeg(ctx, 8, hipY, pose.legs[1], false);
    ctx.save();
    ctx.translate(0, hipY); ctx.rotate(pose.lean);
    drawArm(ctx, 20, -40, pose.arms[1], false);
    pauldron(ctx, 20, -41, pose.arms[1].sh * 0.2, false);
    ctx.restore();
    ctx.restore();
  }
  FLASH = null;
}

// ---------------- poses ----------------
// Every pose has the same keys (so poses blend): bob, lean, hipY, sx, sy, hr
// (head tilt, - is up), eye {w,h,dx}, mouth, cape (stream), legs[2], arms[2]
// (far, near). Angles: 0 points down, + swings forward.
const leg = (hip, knee) => ({ hip, knee });
const arm = (sh, el) => ({ sh, el });
function legRun(th) { return leg(0.85 * Math.sin(th), 0.2 + 1.15 * Math.max(0, Math.sin(th + 1.3))); }

export const POSES = {
  idle: (t = 0) => {
    const b = Math.sin(t * 2.2);
    return {
      bob: b * 1.0, lean: 0.03, hipY: -26, sx: 1 + b * 0.01, sy: 1 - b * 0.01, hr: Math.sin(t * 0.7) * 0.04,
      eye: { w: 1, h: 1, dx: 0 }, mouth: 0, cape: 0.12 + 0.05 * Math.sin(t * 0.9),
      legs: [leg(-0.08, 0.1), leg(0.08, 0.1)],
      arms: [arm(-0.08 + b * 0.03, 0.18), arm(0.1 - b * 0.03, 0.2)],
    };
  },
  // both arms up, bouncing on his heels
  cheer: (t = 0) => {
    const b = Math.sin(t * 9);
    return {
      bob: -2.4 * Math.abs(Math.sin(t * 4.5)), lean: -0.05, hipY: -26, sx: 1, sy: 1 + 0.02 * Math.max(0, b), hr: -0.14,
      eye: { w: 1.1, h: 1.15, dx: 0.6 }, mouth: 1, cape: 0.7 + 0.1 * b,
      legs: [leg(-0.22, 0.25), leg(0.22, 0.25)],
      arms: [arm(-2.5 + 0.16 * b, -0.35), arm(2.55 - 0.16 * b, 0.4)],
    };
  },
  // the near hand up, waving
  wave: (t = 0) => {
    const w = Math.sin(t * 11), b = Math.sin(t * 2.2);
    return {
      bob: b * 0.8, lean: -0.02, hipY: -26, sx: 1, sy: 1, hr: -0.06 + 0.03 * w,
      eye: { w: 1, h: 1.05, dx: 1.2 }, mouth: 1, cape: 0.28 + 0.04 * w,
      legs: [leg(-0.1, 0.12), leg(0.1, 0.12)],
      arms: [arm(-0.12 + b * 0.03, 0.2), arm(2.3, 0.6 + 0.5 * w)],
    };
  },
  // leaning away, arms up over his face, eyes squeezed
  flinch: (t = 0) => {
    const j = Math.sin(t * 38) * 0.025;
    return {
      bob: 0, lean: -0.2 + j, hipY: -24, sx: 1.05, sy: 0.93, hr: 0.2,
      eye: { w: 0.9, h: 0.18, dx: -0.8 }, mouth: -1, cape: 0.9,
      legs: [leg(-0.38, 0.5), leg(0.22, 0.45)],
      arms: [arm(1.6, 1.55), arm(1.95, 1.4)],
    };
  },
  run: (t, ph = 0) => {
    const th = ph * Math.PI * 2, c = 1 - Math.abs(Math.cos(th));
    return {
      bob: -3.4 * Math.abs(Math.cos(th)), lean: 0.14 + 0.03 * Math.sin(th * 2), hipY: -26,
      sx: 1 + 0.02 * c, sy: 1 - 0.035 * c, hr: -0.06 + 0.05 * Math.sin(th * 2 + 0.7),
      eye: { w: 1, h: 0.85, dx: 1.2 }, mouth: 0, cape: 0.8,
      legs: [legRun(th + Math.PI), legRun(th)],
      arms: [arm(0.75 * Math.sin(th), 0.9 + 0.35 * Math.max(0, Math.sin(th))), arm(-0.75 * Math.sin(th), 0.9 + 0.35 * Math.max(0, -Math.sin(th)))],
    };
  },
  jump: () => ({
    bob: 0, lean: 0.16, hipY: -26, sx: 0.96, sy: 1.05, hr: -0.1, eye: { w: 1, h: 1.1, dx: 1.5 }, mouth: 1, cape: 0.6,
    legs: [leg(-0.55, 0.8), leg(0.95, 1.6)],
    arms: [arm(-1.0, 0.6), arm(1.9, 0.7)],
  }),
  fall: () => ({
    bob: 0, lean: 0.04, hipY: -26, sx: 1, sy: 1, hr: 0.08, eye: { w: 1.15, h: 1.25, dx: 1 }, mouth: -1, cape: 1,
    legs: [leg(0.2, 0.5), leg(0.5, 0.8)],
    arms: [arm(-1.6, 0.5), arm(2.1, 0.4)],
  }),
  stomp: () => ({
    bob: 0, lean: -0.04, hipY: -26, sx: 1.03, sy: 0.95, hr: 0.14, eye: { w: 0.9, h: 0.3, dx: 0.5 }, mouth: 0, cape: 0.9,
    legs: [leg(0.05, 0.2), leg(-0.05, 0.2)],
    arms: [arm(2.75, 0.25), arm(2.9, 0.35)],
  }),
  land: () => ({
    bob: 0, lean: 0.2, hipY: -26, sx: 1.1, sy: 0.88, hr: 0.12, eye: { w: 1, h: 0.55, dx: 1 }, mouth: 0, cape: 0.3,
    legs: [leg(-0.4, 0.95), leg(0.4, 0.95)],
    arms: [arm(-0.45, 0.55), arm(0.65, 0.9)],
  }),
  slide: () => ({
    bob: 0, lean: -1.25, hipY: -10, sx: 1, sy: 1, hr: 0.5, eye: { w: 1, h: 0.9, dx: 2 }, mouth: 1, cape: 0.5,
    legs: [leg(0.9, 1.7), leg(1.5, 0.1)],
    arms: [arm(-2.2, 0.5), arm(1.1, 1.2)],
  }),
  dash: (t, ph = 0) => {
    const th = ph * Math.PI * 2;
    return {
      bob: -2.2 * Math.abs(Math.cos(th)), lean: 0.32, hipY: -26, sx: 1, sy: 1, hr: -0.12, eye: { w: 1, h: 0.55, dx: 2.5 }, mouth: 0, cape: 1.1,
      legs: [legRun(th + Math.PI), legRun(th)],
      arms: [arm(-1.0, 1.2), arm(-0.8, 1.3)],
    };
  },
};

export function lerpPose(a, b, k) {
  for (const key in b) {
    const bv = b[key];
    if (typeof bv === 'number') a[key] = (a[key] == null ? bv : a[key] + (bv - a[key]) * k);
    else if (Array.isArray(bv)) bv.forEach((o, i) => lerpPose(a[key][i], o, k));
    else if (bv && typeof bv === 'object') lerpPose(a[key] || (a[key] = { ...bv }), bv, k);
  }
}

// ---------- the host ----------
// A small, cheap state machine for Rocky standing at the side of the play
// area: idle breathing with blinks and glances, and reactions that blend in
// and out. react(): 'wave' | 'cheer' | 'flinch' | 'celebrate' (a big cheer with
// hops). A stronger reaction is not cut short by a weaker one.
const RANK = { idle: 0, wave: 1, cheer: 2, flinch: 3, celebrate: 4 };
export class RockyHost {
  constructor() { this.seed = 0x2545F491; this.reset(); }
  reset() {
    this.t = 0; this.state = 'idle'; this.until = 0; this.since = 0;
    this.blink = 0; this.blinkT = 1.8; this.look = 0; this.lookTarget = 0; this.lookT = 2.5; this.tilt = 0;
    this.sq = 0; this.sqv = 0; this.hr = 0; this.hrv = 0; this.boost = 0; this.cur = null;
  }
  // its own little generator: never touches Math.random or the game's streams
  rnd() { this.seed = (Math.imul(this.seed ^ (this.seed >>> 15), 0x2C1B3C6D) + 0x6D2B79F5) >>> 0; return this.seed / 4294967296; }
  react(kind, dur = 1.2) {
    if (!(kind in RANK)) return false;
    if (this.state !== 'idle' && this.t < this.until && RANK[kind] < RANK[this.state]) return false;
    const same = kind === this.state && this.t < this.until;
    this.until = Math.max(same ? this.until : 0, this.t + dur);
    if (!same) this.since = this.t;
    this.state = kind;
    if (kind === 'cheer') { this.sqv -= 1.8; this.boost = Math.max(this.boost, 0.8); }
    else if (kind === 'celebrate') { this.sqv -= 2.8; this.boost = 1.2; }
    else if (kind === 'flinch') { this.sqv += 2.6; this.hrv += 3.5; this.boost = Math.max(this.boost, 0.5); this.blink = 0; }
    else if (kind === 'wave') this.hrv -= 1.2;
    return true;
  }
  update(dt) {
    this.t += dt;
    if (this.state !== 'idle' && this.t >= this.until) this.state = 'idle';
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 1; this.blinkT = 2 + this.rnd() * 3.2; }
    if (this.blink > 0) this.blink = Math.max(0, this.blink - dt * 7);
    if (this.state === 'idle') {
      this.lookT -= dt;
      if (this.lookT <= 0) { this.lookTarget = this.rnd() < 0.4 ? 0 : -1.4 + this.rnd() * 3.4; this.lookT = 1.6 + this.rnd() * 2.6; }
    } else this.lookTarget = 0;
    this.look += (this.lookTarget - this.look) * (1 - Math.exp(-dt * 9));
    const key = this.state === 'celebrate' ? 'cheer' : this.state;
    const target = POSES[key](this.t);
    if (this.state === 'celebrate') {
      // hops, two a second
      const ph = (this.t - this.since) * 2.2;
      target.bob = -9 * Math.abs(Math.sin(ph * Math.PI));
      target.cape = 1;
    }
    target.hr += this.tilt;
    if (!this.cur) { this.cur = JSON.parse(JSON.stringify(target)); this.hr = target.hr; }
    else lerpPose(this.cur, target, 1 - Math.exp(-dt * (this.state === 'flinch' ? 22 : 13)));
    if (this.state === 'celebrate') this.cur.bob = target.bob;
    // springs: squash and stretch, a lagging head
    this.sqv += (-240 * this.sq - 15 * this.sqv) * dt; this.sq += this.sqv * dt;
    this.sq = Math.max(-0.2, Math.min(0.22, this.sq));
    this.hrv += (-200 * (this.hr - this.cur.hr) - 13 * this.hrv) * dt; this.hr += this.hrv * dt;
    this.boost = Math.max(0, this.boost - dt * 1.1);
  }
  // feet at (x, y); s = scale (1 = ~96 units tall)
  draw(ctx, x, y, s, alpha = 1) {
    if (!this.cur) this.update(0);
    const p = this.cur, t = this.t, fire = Math.min(1, flicker(t) + this.boost * 0.4);
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    // lantern light on the ground, then his shadow
    const r = 46 * s, g = ctx.createRadialGradient(x + 4 * s, y, 1, x + 4 * s, y, r);
    g.addColorStop(0, `rgba(${HW.ember},${0.2 * fire + 0.15 * this.boost})`); g.addColorStop(1, `rgba(${HW.ember},0)`);
    ctx.fillStyle = g; ctx.fillRect(x + 4 * s - r, y - r, r * 2, r * 2);
    const lift = Math.max(0, -p.bob) / 12, sc = 1 / (1 + lift);
    ctx.fillStyle = `rgba(6,3,10,${0.5 * sc})`;
    ctx.beginPath(); ctx.ellipse(x + 2 * s, y + 1, 26 * s * sc, 5 * s * sc, 0, 0, TAU); ctx.fill();
    const eye = { w: p.eye.w, h: p.eye.h * (1 - this.blink * 0.85), dx: p.eye.dx + this.look };
    const sx = p.sx * (1 + this.sq), sy = p.sy * (1 - this.sq);
    drawRocky(ctx, x, y, s, { ...p, sx, sy, hr: this.hr, eye }, { t, fire, glow: 0.6 + this.boost * 0.7 });
    ctx.restore();
  }
}
