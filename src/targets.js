// Everything that gets tossed across the chart. Stained glass (tinted,
// see-through, rounded or pointed) is to be cut. The redaction block (solid
// ink, square, padlocked) is shielded and must not be. Each type draws itself
// centred on the origin; the game caches them as sprites so a phone only pays
// for drawImage while playing.
//
// Halloween edition: the same six shapes, radii and sprite keys, redrawn for the
// night sheet. Pumpkin, Skull, Candy Corn, Bat and Ghost are treats; the Cursed
// Potion is the one you must not cut; the Core becomes The Great Pumpkin.

import { HALLOWEEN, HW, HNAMES, HPOWERS } from './theme.js';

const INK = '#161616', PLUM = '#3D2731';
const TINT = (a) => `rgba(130,90,109,${a})`;
const DEEP = (a) => `rgba(82,53,66,${a})`;
const WHITE = (a) => `rgba(255,255,255,${a})`;
const SHADOW = 'rgba(61,39,49,0.16)';

function path(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
}
function shadow(ctx, draw) { ctx.save(); ctx.translate(3, 6); ctx.fillStyle = SHADOW; draw(); ctx.fill(); ctx.restore(); }
function outline(ctx, w = 1.8) { ctx.strokeStyle = PLUM; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); }
function facet(ctx, pts, fill) { path(ctx, pts); ctx.fillStyle = fill; ctx.fill(); }
function seams(ctx, lines, a = 0.45) {
  ctx.strokeStyle = DEEP(a); ctx.lineWidth = 1; ctx.beginPath();
  for (const [x0, y0, x1, y1] of lines) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
  ctx.stroke();
}
function glint(ctx, x, y, s = 5) {
  ctx.fillStyle = WHITE(0.95);
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.25, y - s * 0.25); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.25, y + s * 0.25);
  ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.25, y + s * 0.25); ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.25, y - s * 0.25); ctx.closePath(); ctx.fill();
}

// Orb: a glass sphere with a darker heart
function drawOrb(ctx) {
  const circle = () => { ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); };
  shadow(ctx, circle);
  const g = ctx.createRadialGradient(-10, -12, 3, 0, 0, 32);
  g.addColorStop(0, WHITE(0.9)); g.addColorStop(0.45, TINT(0.28)); g.addColorStop(1, TINT(0.62));
  circle(); ctx.fillStyle = g; ctx.fill(); outline(ctx);
  ctx.beginPath(); ctx.arc(3, 4, 13, 0, Math.PI * 2); ctx.fillStyle = DEEP(0.5); ctx.fill();
  ctx.strokeStyle = DEEP(0.55); ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 25, Math.PI * 1.05, Math.PI * 1.55); ctx.strokeStyle = WHITE(0.9); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  glint(ctx, 12, -14, 4.5);
}

// Lens: a glass ring
function drawLens(ctx) {
  const ring = () => { ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.arc(0, 0, 16, 0, Math.PI * 2, true); };
  shadow(ctx, ring);
  const g = ctx.createLinearGradient(-30, -30, 30, 30);
  g.addColorStop(0, TINT(0.3)); g.addColorStop(0.5, TINT(0.55)); g.addColorStop(1, DEEP(0.6));
  ring(); ctx.fillStyle = g; ctx.fill('evenodd');
  ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); outline(ctx);
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); outline(ctx, 1.5);
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fillStyle = WHITE(0.35); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 27, Math.PI * 1.1, Math.PI * 1.6); ctx.strokeStyle = WHITE(0.9); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  seams(ctx, [[-35, 0, -16, 0], [16, 0, 35, 0], [0, 16, 0, 35]], 0.35);
}

// Prism: a tall cut crystal
function drawPrism(ctx) {
  const outer = [[0, -37], [17, -14], [13, 27], [-9, 33], [-19, -6]];
  shadow(ctx, () => path(ctx, outer));
  facet(ctx, outer, TINT(0.4));
  facet(ctx, [[0, -37], [-19, -6], [-3, -4]], WHITE(0.6));
  facet(ctx, [[-3, -4], [17, -14], [13, 27], [-9, 33]], DEEP(0.42));
  facet(ctx, [[-19, -6], [-3, -4], [-9, 33]], TINT(0.5));
  seams(ctx, [[0, -37, -3, -4], [-3, -4, -9, 33], [-3, -4, 17, -14], [-3, -4, -19, -6]]);
  path(ctx, outer); outline(ctx);
  glint(ctx, 5, -22, 4);
}

// Dart: small, fast, pointed
function drawDart(ctx) {
  const outer = [[0, -34], [15, 8], [0, 26], [-15, 8]];
  shadow(ctx, () => path(ctx, outer));
  facet(ctx, outer, TINT(0.45));
  facet(ctx, [[0, -34], [-15, 8], [0, 2]], WHITE(0.6));
  facet(ctx, [[0, 2], [15, 8], [0, 26]], DEEP(0.5));
  seams(ctx, [[0, -34, 0, 26], [-15, 8, 0, 2], [0, 2, 15, 8]]);
  path(ctx, outer); outline(ctx);
  glint(ctx, -4, -12, 3.5);
}

// Star: four points, wobbles in flight, worth two
function drawStar(ctx) {
  const outer = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 12 : 33; outer.push([Math.cos(a) * r, Math.sin(a) * r]); }
  shadow(ctx, () => path(ctx, outer));
  facet(ctx, outer, TINT(0.5));
  facet(ctx, [outer[0], outer[1], [0, 0], outer[7]], WHITE(0.65));
  facet(ctx, [outer[4], outer[5], [0, 0], outer[3]], DEEP(0.5));
  seams(ctx, [[0, -33, 0, 33], [-33, 0, 33, 0]], 0.4);
  path(ctx, outer); outline(ctx);
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fillStyle = PLUM; ctx.fill();
  glint(ctx, -9, -9, 3.5);
}

// Redaction block: solid ink with a padlock. Square, opaque, heavy.
function drawBlock(ctx) {
  const r = 30, rr = 7;
  const box = () => { ctx.beginPath(); ctx.moveTo(-r + rr, -r); ctx.lineTo(r - rr, -r); ctx.quadraticCurveTo(r, -r, r, -r + rr); ctx.lineTo(r, r - rr); ctx.quadraticCurveTo(r, r, r - rr, r); ctx.lineTo(-r + rr, r); ctx.quadraticCurveTo(-r, r, -r, r - rr); ctx.lineTo(-r, -r + rr); ctx.quadraticCurveTo(-r, -r, -r + rr, -r); ctx.closePath(); };
  ctx.save(); ctx.translate(4, 7); ctx.fillStyle = 'rgba(22,22,22,0.22)'; box(); ctx.fill(); ctx.restore();
  box(); ctx.fillStyle = INK; ctx.fill();
  // redaction hatch
  ctx.save(); box(); ctx.clip();
  ctx.strokeStyle = 'rgba(194,154,175,0.2)'; ctx.lineWidth = 3;
  for (let x = -70; x < 70; x += 11) { ctx.beginPath(); ctx.moveTo(x, r + 4); ctx.lineTo(x + 40, -r - 4); ctx.stroke(); }
  ctx.restore();
  box(); ctx.strokeStyle = '#523542'; ctx.lineWidth = 2; ctx.stroke();
  // padlock
  ctx.strokeStyle = '#F5F1F2'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -4, 7, Math.PI, 0); ctx.lineTo(7, 0); ctx.moveTo(-7, -4); ctx.lineTo(-7, 0); ctx.stroke();
  ctx.fillStyle = '#F5F1F2'; ctx.fillRect(-11, -1, 22, 15);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 5, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-1.1, 5, 2.2, 5);
  ctx.lineCap = 'butt';
}

const CLASSIC_POWERS = {
  overclock: { name: 'Overclock', text: 'glass from every side', dur: 6 },
  amp:       { name: 'Amplifier', text: 'every point counts double', dur: 8 },
  stasis:    { name: 'Stasis', text: 'time slows, the clock stops', dur: 5 },
  quake:     { name: 'Quake', text: 'everything shatters', dur: 0 },
};
// the active set: Halloween names and lines over the same durations
export const POWERS = HALLOWEEN
  ? Object.fromEntries(Object.entries(CLASSIC_POWERS).map(([k, p]) => [k, { ...p, ...(HPOWERS[k] || {}) }]))
  : CLASSIC_POWERS;

// Power: a white badge with a mauve rim, unlike anything else in the air
function drawPower(ctx, kind) {
  if (HALLOWEEN) { drawPowerNight(ctx, kind); return; }
  const hex = [[0, -30], [26, -15], [26, 15], [0, 30], [-26, 15], [-26, -15]];
  shadow(ctx, () => path(ctx, hex));
  facet(ctx, hex, '#FFFFFF');
  path(ctx, hex); ctx.strokeStyle = '#825A6D'; ctx.lineWidth = 3.2; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = PLUM; ctx.fillStyle = PLUM; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  if (kind === 'overclock') { ctx.moveTo(-12, -11); ctx.lineTo(-1, 0); ctx.lineTo(-12, 11); ctx.moveTo(2, -11); ctx.lineTo(13, 0); ctx.lineTo(2, 11); ctx.stroke(); }
  else if (kind === 'amp') { ctx.font = '600 19px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('x2', 0, 1); ctx.textBaseline = 'alphabetic'; }
  else if (kind === 'stasis') { ctx.moveTo(-9, -12); ctx.lineTo(9, -12); ctx.lineTo(-9, 12); ctx.lineTo(9, 12); ctx.closePath(); ctx.stroke(); }
  else if (kind === 'quake') { ctx.moveTo(-15, 2); ctx.lineTo(-8, 2); ctx.lineTo(-4, -12); ctx.lineTo(2, 13); ctx.lineTo(7, -5); ctx.lineTo(10, 2); ctx.lineTo(15, 2); ctx.stroke(); }
  ctx.lineCap = 'butt';
}

// r is the hit radius, pad the half-size of the cached sprite
// (Halloween: same r, pad, pts and keys; only the name and the art change)
const HW_ON = HALLOWEEN;
const nm = (k, classic) => (HW_ON && HNAMES[k] ? HNAMES[k] : classic);
export const TYPES = {
  orb:   { name: nm('orb', 'Orb'), r: 36, pad: 46, pts: 1, draw: HW_ON ? drawPumpkin : drawOrb },
  lens:  { name: nm('lens', 'Lens'), r: 38, pad: 48, pts: 1, draw: HW_ON ? drawSkull : drawLens },
  prism: { name: nm('prism', 'Prism'), r: 34, pad: 48, pts: 1, draw: HW_ON ? drawCandyCorn : drawPrism },
  dart:  { name: nm('dart', 'Dart'), r: 30, pad: 46, pts: 1, draw: HW_ON ? drawBat : drawDart },
  star:  { name: nm('star', 'Star'), r: 30, pad: 46, pts: 2, draw: HW_ON ? drawGhost : drawStar },
  block: { name: nm('block', 'shielded block'), r: 34, pad: 50, forbidden: true, draw: HW_ON ? drawPotion : drawBlock },
  power: { name: nm('power', 'power-up'), r: 32, pad: 46 },
  boss:  { name: nm('boss', 'The Core'), r: 84 },
};
export const BASE_TYPES = ['orb', 'lens', 'prism', 'dart', 'star'];
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

// The Core is drawn live: a great faceted gem whose heart beats faster as it cracks.
export function drawBoss(ctx, b) {
  if (HALLOWEEN) { drawGreatPumpkin(ctx, b); return; }
  ctx.save();
  ctx.translate(b.x, b.y);
  const k = 1 + Math.sin(b.ph * 2) * 0.015 + b.punch * 0.06;
  ctx.scale(k, k);
  ctx.rotate(Math.sin(b.ph * 0.4) * 0.05);
  const R = 74, n = 10, rim = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; rim.push([Math.cos(a) * R, Math.sin(a) * R]); }
  ctx.save(); ctx.translate(5, 10); path(ctx, rim); ctx.fillStyle = 'rgba(61,39,49,0.18)'; ctx.fill(); ctx.restore();
  for (let i = 0; i < n; i++) {
    const a = rim[i], c = rim[(i + 1) % n];
    path(ctx, [[0, 0], a, c]);
    ctx.fillStyle = i % 2 ? TINT(0.5) : i % 4 === 0 ? WHITE(0.75) : DEEP(0.45);
    ctx.fill();
    ctx.strokeStyle = DEEP(0.4); ctx.lineWidth = 1; ctx.stroke();
  }
  path(ctx, rim); outline(ctx, 2.6);
  const heart = 20 + Math.sin(b.ph * (2 + b.hits * 0.15)) * 2 + b.punch * 5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + b.ph * 0.3; i ? ctx.lineTo(Math.cos(a) * heart, Math.sin(a) * heart) : ctx.moveTo(Math.cos(a) * heart, Math.sin(a) * heart); }
  ctx.closePath(); ctx.fillStyle = PLUM; ctx.fill();
  ctx.strokeStyle = '#C29AAF'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineJoin = 'miter';
  for (const c of b.cracks) {
    ctx.beginPath();
    c.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  glint(ctx, -30, -38, 9);
  ctx.restore();
}

// ---------- Halloween edition (#ROCKYHalloween) ----------
// Drawn for the night sheet: bright treats with a dark rim and a soft glow so
// they lift off the plum paper. Every sprite stays inside its classic pad;
// everything but the Great Pumpkin is cached exactly like the classic set.

const TAU = Math.PI * 2;
const NIGHT_INK = '#140A1E';
const NIGHT_SHADOW = 'rgba(4,1,10,0.42)';
const rgba = (rgb, a) => `rgba(${rgb},${a})`;

// a soft round glow behind (or on) a thing; fades out before r1
function halo(ctx, rgb, r0, r1, a, x = 0, y = 0) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  g.addColorStop(0, rgba(rgb, a)); g.addColorStop(0.45, rgba(rgb, a * 0.4)); g.addColorStop(1, rgba(rgb, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r1, 0, TAU); ctx.fill();
}
function nightShadow(ctx, draw) { ctx.save(); ctx.translate(3, 6); ctx.fillStyle = NIGHT_SHADOW; draw(); ctx.fill(); ctx.restore(); }
function ink(ctx, w = 2, col = NIGHT_INK) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
// adds a closed polygon to the current path (no beginPath), scaled by s
function poly(ctx, pts, s = 1) { pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s))); ctx.closePath(); }
function sparkle(ctx, x, y, s, col) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.25, y - s * 0.25); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.25, y + s * 0.25);
  ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.25, y + s * 0.25); ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.25, y - s * 0.25); ctx.closePath(); ctx.fill();
}

// --- pumpkins (the Pumpkin target and the Great Pumpkin share one body) ---
// lobes [x, y, rx, ry], back to front
const LOBES = [[-19, 4, 14, 24], [19, 4, 14, 24], [-9, 4, 15, 27], [9, 4, 15, 27], [0, 4, 13, 28]];
function lobe(ctx, l, S) { ctx.moveTo((l[0] + l[2]) * S, l[1] * S); ctx.ellipse(l[0] * S, l[1] * S, l[2] * S, l[3] * S, 0, 0, TAU); }
function pumpkinSil(ctx, S) { ctx.beginPath(); for (const l of LOBES) lobe(ctx, l, S); }
function pumpkinBody(ctx, S, lw) {
  // the outline goes underneath; the lobes cover its inner half
  pumpkinSil(ctx, S); ink(ctx, lw * 2);
  LOBES.forEach((l, i) => {
    const x = l[0] * S, y = l[1] * S, front = i === 4, mid = i >= 2;
    const g = ctx.createRadialGradient(x - l[2] * S * 0.35, y - l[3] * S * 0.45, S, x, y, l[3] * S * 1.05);
    g.addColorStop(0, front ? '#FFBE66' : mid ? '#FFA650' : '#F58C38');
    g.addColorStop(0.55, front ? HW.pumpkin : mid ? '#F47A24' : '#E2661C');
    g.addColorStop(1, mid ? HW.pumpkinDeep : '#B4440E');
    ctx.beginPath(); lobe(ctx, l, S); ctx.fillStyle = g; ctx.fill();
  });
  // ribs where one lobe sits on the next
  const rib = (l, a0, a1) => { ctx.moveTo(l[0] * S + Math.cos(a0) * l[2] * S, l[1] * S + Math.sin(a0) * l[3] * S); ctx.ellipse(l[0] * S, l[1] * S, l[2] * S, l[3] * S, 0, a0, a1); };
  ctx.beginPath();
  rib(LOBES[2], Math.PI * 0.62, Math.PI * 1.38); rib(LOBES[3], -Math.PI * 0.38, Math.PI * 0.38);
  rib(LOBES[4], Math.PI * 0.6, Math.PI * 1.4); rib(LOBES[4], -Math.PI * 0.4, Math.PI * 0.4);
  ctx.strokeStyle = 'rgba(120,38,8,0.7)'; ctx.lineWidth = lw * 0.7; ctx.lineCap = 'round'; ctx.stroke();
  // roundness: lighter on top, darker towards the base
  ctx.save(); pumpkinSil(ctx, S); ctx.clip();
  const sh = ctx.createLinearGradient(0, -24 * S, 0, 32 * S);
  sh.addColorStop(0, 'rgba(255,232,170,0.2)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(80,18,0,0.38)');
  ctx.fillStyle = sh; ctx.fillRect(-36 * S, -26 * S, 72 * S, 60 * S);
  ctx.restore();
  // a sheen along the top of the front lobe
  ctx.beginPath(); ctx.ellipse(0, 4 * S, 10.5 * S, 24 * S, 0, Math.PI * 1.3, Math.PI * 1.62);
  ctx.strokeStyle = 'rgba(255,244,214,0.55)'; ctx.lineWidth = lw * 1.1; ctx.lineCap = 'round'; ctx.stroke();
}
function pumpkinStem(ctx, S, lw) {
  // a curl of vine, the stem, a leaf
  ctx.beginPath(); ctx.moveTo(-3 * S, -24 * S);
  ctx.bezierCurveTo(-10 * S, -31 * S, -18 * S, -26 * S, -15 * S, -20.5 * S);
  ctx.bezierCurveTo(-13 * S, -17.5 * S, -9.5 * S, -19.5 * S, -11.5 * S, -22 * S);
  ctx.strokeStyle = NIGHT_INK; ctx.lineWidth = lw * 1.5; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = '#6FA33A'; ctx.lineWidth = lw * 0.7; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4.5 * S, -21 * S); ctx.quadraticCurveTo(-4 * S, -30 * S, -1 * S, -35 * S);
  ctx.lineTo(5 * S, -33.5 * S); ctx.quadraticCurveTo(2 * S, -28 * S, 4.5 * S, -21 * S); ctx.closePath();
  const g = ctx.createLinearGradient(-4 * S, 0, 5 * S, 0);
  g.addColorStop(0, '#86A042'); g.addColorStop(1, HW.stem);
  ctx.fillStyle = g; ctx.fill(); ink(ctx, lw);
  ctx.beginPath(); ctx.moveTo(3 * S, -24 * S); ctx.quadraticCurveTo(9 * S, -36 * S, 20 * S, -30 * S); ctx.quadraticCurveTo(12 * S, -21 * S, 3 * S, -24 * S); ctx.closePath();
  ctx.fillStyle = '#5E9A30'; ctx.fill(); ink(ctx, lw * 0.8);
  ctx.beginPath(); ctx.moveTo(4.5 * S, -24.5 * S); ctx.quadraticCurveTo(11 * S, -28 * S, 18 * S, -29.5 * S);
  ctx.strokeStyle = 'rgba(30,60,14,0.7)'; ctx.lineWidth = lw * 0.5; ctx.stroke();
}
// cut holes lit from inside. holes: polygons; edge: how thick the rind looks
function carve(ctx, holes, S, edge, lum, gy, gr) {
  const hp = () => { ctx.beginPath(); for (const h of holes) poly(ctx, h, S); };
  hp(); ctx.fillStyle = '#5E1F06'; ctx.fill();
  const g = ctx.createRadialGradient(0, gy, 0, 0, gy, gr);
  g.addColorStop(0, '#FFFCE6'); g.addColorStop(0.35, '#FFE27A'); g.addColorStop(0.75, '#FFA526'); g.addColorStop(1, '#E8650F');
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, lum)); hp(); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  // the wall of the cut, in shadow along the top edges
  ctx.save(); hp(); ctx.clip(); ctx.translate(0, edge); hp();
  ctx.strokeStyle = 'rgba(122,40,6,0.85)'; ctx.lineWidth = edge * 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  hp(); ctx.strokeStyle = '#3A1204'; ctx.lineWidth = edge * 0.75; ctx.lineJoin = 'round'; ctx.stroke();
}
const PUMPKIN_FACE = [
  [[-18, -1], [-6, -1], [-11, -13]], [[6, -1], [18, -1], [11, -13]],
  [[-3.5, 7], [3.5, 7], [0, 1.5]],
  [[-21, 9], [-12, 13.5], [-9, 13.5], [-9, 17.5], [-4.5, 17.5], [-4.5, 14.5], [4.5, 14.5], [4.5, 17.5], [9, 17.5], [9, 13.5], [12, 13.5], [21, 9],
    [17, 18], [9, 23.5], [4.5, 24.5], [4.5, 20.5], [-4.5, 20.5], [-4.5, 24.5], [-9, 23.5], [-17, 18]],
];
// Pumpkin (orb): ribbed, stem and leaf, a carved face glowing from inside
function drawPumpkin(ctx) {
  halo(ctx, HW.ember, 24, 45, 0.5);
  nightShadow(ctx, () => pumpkinSil(ctx, 1));
  pumpkinBody(ctx, 1, 2);
  pumpkinStem(ctx, 1, 2);
  ctx.save(); pumpkinSil(ctx, 1); ctx.clip(); halo(ctx, '255,205,100', 0, 30, 0.35, 0, 9); ctx.restore();
  carve(ctx, PUMPKIN_FACE, 1, 1.7, 1, 9, 24);
}

// Skull (lens): bone white, dark sockets with a faint green glow
function skullPath(ctx) {
  ctx.beginPath();
  ctx.arc(0, -6, 28, Math.PI * 0.79, Math.PI * 0.21);
  ctx.quadraticCurveTo(18.5, 17, 15, 19);
  ctx.lineTo(14.5, 26); ctx.quadraticCurveTo(14, 31.5, 8, 31.5);
  ctx.lineTo(-8, 31.5); ctx.quadraticCurveTo(-14, 31.5, -14.5, 26);
  ctx.lineTo(-15, 19); ctx.quadraticCurveTo(-18.5, 17, -22.1, 11.2);
  ctx.closePath();
}
function drawSkull(ctx) {
  halo(ctx, HW.ghostGlow, 28, 47, 0.3);
  nightShadow(ctx, () => skullPath(ctx));
  const g = ctx.createRadialGradient(-8, -16, 2, 0, -2, 38);
  g.addColorStop(0, '#FFFDF6'); g.addColorStop(0.5, HW.bone); g.addColorStop(1, '#B5A385');
  skullPath(ctx); ctx.fillStyle = g; ctx.fill(); ink(ctx, 2.2);
  // cheekbones and temples
  ctx.fillStyle = 'rgba(120,100,70,0.16)';
  ctx.beginPath(); ctx.ellipse(-16, 12, 5, 3, 0.5, 0, TAU); ctx.ellipse(16, 12, 5, 3, -0.5, 0, TAU); ctx.fill();
  // sockets
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(s * 10.5, -3.5, 8.6, 9.8, s * 0.25, 0, TAU); ctx.fillStyle = '#1A0F22'; ctx.fill();
    halo(ctx, '141,255,158', 0, 8, 0.6, s * 10.5, -2);
    ctx.beginPath(); ctx.arc(s * 10.5, -2, 1.8, 0, TAU); ctx.fillStyle = '#D6FFDC'; ctx.fill();
  }
  // nose
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.quadraticCurveTo(-5.5, 11.5, -3.8, 14); ctx.lineTo(0, 12); ctx.lineTo(3.8, 14); ctx.quadraticCurveTo(5.5, 11.5, 0, 5);
  ctx.fillStyle = '#1A0F22'; ctx.fill();
  // teeth
  ctx.beginPath(); ctx.moveTo(-12, 24.5); ctx.quadraticCurveTo(0, 26, 12, 24.5);
  for (const x of [-8.4, -4.2, 0, 4.2, 8.4]) { ctx.moveTo(x, 19.5); ctx.lineTo(x, 29.5); }
  ctx.strokeStyle = '#2A1A2E'; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();
  // a hairline crack and a gleam
  ctx.beginPath(); ctx.moveTo(9, -33.5); ctx.lineTo(6.5, -27); ctx.lineTo(10.5, -23); ctx.lineTo(8.5, -18);
  ctx.strokeStyle = 'rgba(42,26,46,0.75)'; ctx.lineWidth = 1.3; ctx.lineJoin = 'miter'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -6, 22, Math.PI * 1.12, Math.PI * 1.42); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke();
}

// Candy Corn (prism): a big glossy triangle, yellow, orange and white
function cornPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-3.2, -31.5); ctx.quadraticCurveTo(0, -37, 3.2, -31.5);
  ctx.quadraticCurveTo(15, -7, 22.5, 19); ctx.quadraticCurveTo(25, 28.5, 15, 30.5);
  ctx.quadraticCurveTo(0, 33.5, -15, 30.5); ctx.quadraticCurveTo(-25, 28.5, -22.5, 19);
  ctx.quadraticCurveTo(-15, -7, -3.2, -31.5); ctx.closePath();
}
function drawCandyCorn(ctx) {
  halo(ctx, '255,200,100', 24, 46, 0.36, 0, 2);
  nightShadow(ctx, () => cornPath(ctx));
  ctx.save(); cornPath(ctx); ctx.clip();
  ctx.fillStyle = '#FFCB3D'; ctx.fillRect(-30, -40, 60, 76);
  const band = (y, col) => { ctx.beginPath(); ctx.moveTo(-30, -40); ctx.lineTo(30, -40); ctx.lineTo(30, y); ctx.quadraticCurveTo(0, y + 8, -30, y); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
  band(4, HW.pumpkin); band(-16, '#FFF6E8');
  const sh = ctx.createLinearGradient(-24, 0, 24, 0);
  sh.addColorStop(0, 'rgba(255,255,255,0.3)'); sh.addColorStop(0.38, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(110,30,0,0.34)');
  ctx.fillStyle = sh; ctx.fillRect(-30, -40, 60, 76);
  const base = ctx.createLinearGradient(0, 14, 0, 34);
  base.addColorStop(0, 'rgba(120,50,0,0)'); base.addColorStop(1, 'rgba(120,50,0,0.28)');
  ctx.fillStyle = base; ctx.fillRect(-30, 14, 60, 22);
  ctx.restore();
  cornPath(ctx); ink(ctx, 2.2);
  // gloss
  ctx.beginPath(); ctx.moveTo(-4.5, -25); ctx.quadraticCurveTo(-10.5, -6, -16, 19);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-13, 25); ctx.lineTo(-9, 26.3); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.stroke();
  glint(ctx, 4, -22, 3.5);
}

// Bat (dart): wings spread, lit by the moon from behind, small red eyes
function batWing(ctx) {
  ctx.moveTo(4, -4);
  ctx.quadraticCurveTo(11, -17, 20, -14); ctx.quadraticCurveTo(28, -12, 34, -3);
  ctx.quadraticCurveTo(27, -1, 26, 8); ctx.quadraticCurveTo(21, 3, 15.5, 9); ctx.quadraticCurveTo(11, 3.5, 5, 7);
  ctx.closePath();
}
function batHead(ctx) {
  ctx.moveTo(7, 3); ctx.ellipse(0, 3, 7, 10, 0, 0, TAU);
  ctx.moveTo(7.5, -9); ctx.arc(0, -9, 7.5, 0, TAU);
  ctx.moveTo(-6.6, -11.5); ctx.lineTo(-6.2, -21); ctx.lineTo(-1.8, -15.6); ctx.closePath();
  ctx.moveTo(6.6, -11.5); ctx.lineTo(1.8, -15.6); ctx.lineTo(6.2, -21); ctx.closePath();
}
function batPath(ctx) {
  ctx.beginPath(); batWing(ctx);
  ctx.save(); ctx.scale(-1, 1); batWing(ctx); ctx.restore();
  batHead(ctx);
}
function drawBat(ctx) {
  ctx.save(); ctx.translate(0, 3);
  halo(ctx, HW.moonGlow, 14, 42, 0.5, 0, -3);
  nightShadow(ctx, () => batPath(ctx));
  batPath(ctx); ctx.strokeStyle = HW.moon; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
  const g = ctx.createRadialGradient(0, -6, 3, 0, -2, 36);
  g.addColorStop(0, '#4E3D58'); g.addColorStop(0.6, '#2E2238'); g.addColorStop(1, '#1D1426');
  ctx.fillStyle = g; ctx.fill();
  // finger bones
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 5, -3); ctx.lineTo(s * 20, -13.5);
    ctx.moveTo(s * 20, -13.5); ctx.lineTo(s * 26, 7); ctx.moveTo(s * 20, -13.5); ctx.lineTo(s * 15.5, 8); ctx.moveTo(s * 20, -13.5); ctx.lineTo(s * 33, -3.5);
  }
  ctx.strokeStyle = 'rgba(160,130,170,0.55)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.stroke();
  // body and head over the wings
  ctx.beginPath(); batHead(ctx); ctx.fillStyle = '#2A1F31'; ctx.fill();
  ctx.fillStyle = 'rgba(122,74,102,0.9)';
  ctx.beginPath(); ctx.moveTo(-5.4, -13); ctx.lineTo(-5.4, -18.6); ctx.lineTo(-2.6, -15.2); ctx.closePath();
  ctx.moveTo(5.4, -13); ctx.lineTo(2.6, -15.2); ctx.lineTo(5.4, -18.6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 5, 3.6, 6, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
  // eyes and fangs
  for (const s of [-1, 1]) {
    halo(ctx, '255,60,60', 0, 4.6, 0.7, s * 2.9, -9.6);
    ctx.beginPath(); ctx.arc(s * 2.9, -9.6, 1.9, 0, TAU); ctx.fillStyle = '#FF3B3B'; ctx.fill();
    ctx.beginPath(); ctx.arc(s * 2.5, -10.2, 0.6, 0, TAU); ctx.fillStyle = '#FFE0E0'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 2.7, -4.9); ctx.lineTo(s * 1.3, -4.9); ctx.lineTo(s * 2, -2.6); ctx.closePath(); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  }
  ctx.restore();
}

// Ghost (star, worth two): a sheet ghost, wavy hem, 'O' mouth, glowing
function ghostPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-20, -9); ctx.arc(0, -9, 20, Math.PI, 0);
  ctx.quadraticCurveTo(20.5, 6, 23, 19);
  ctx.quadraticCurveTo(17.25, 31, 11.5, 19); ctx.quadraticCurveTo(5.75, 31, 0, 19);
  ctx.quadraticCurveTo(-5.75, 31, -11.5, 19); ctx.quadraticCurveTo(-17.25, 31, -23, 19);
  ctx.quadraticCurveTo(-20.5, 6, -20, -9); ctx.closePath();
  // little arms up: boo
  ctx.moveTo(30, -5); ctx.ellipse(24, -5, 6.5, 4.2, -0.7, 0, TAU);
  ctx.moveTo(-18, -5); ctx.ellipse(-24, -5, 6.5, 4.2, 0.7, 0, TAU);
}
function drawGhost(ctx) {
  halo(ctx, HW.ghostGlow, 18, 45, 0.62);
  sparkle(ctx, -27, -24, 3.6, HW.slime); sparkle(ctx, 27, 19, 3, HW.slime); sparkle(ctx, -26, 21, 2.4, 'rgba(190,255,210,0.9)');
  nightShadow(ctx, () => ghostPath(ctx));
  ghostPath(ctx); ink(ctx, 4, '#24493A');
  const g = ctx.createRadialGradient(-6, -16, 2, 0, 0, 34);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.55, HW.ghost); g.addColorStop(1, '#A9D8BC');
  ctx.fillStyle = g; ctx.fill();
  // folds of the sheet
  ctx.beginPath(); ctx.moveTo(11.5, 19); ctx.quadraticCurveTo(12.5, 12, 11, 6); ctx.moveTo(-11.5, 19); ctx.quadraticCurveTo(-12.5, 12, -11, 6); ctx.moveTo(0, 19); ctx.lineTo(0, 13);
  ctx.strokeStyle = 'rgba(110,165,138,0.4)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.stroke();
  // face
  ctx.fillStyle = '#1A0F22';
  ctx.beginPath(); ctx.ellipse(-7.5, -10, 3.3, 4.6, 0, 0, TAU); ctx.ellipse(7.5, -10, 3.3, 4.6, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 3.5, 4.6, 6, 0, 0, TAU); ctx.fillStyle = '#2A1236'; ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(-6.5, -11.8, 1.2, 0, TAU); ctx.arc(8.5, -11.8, 1.2, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,95,162,0.38)';
  ctx.beginPath(); ctx.ellipse(-13.5, -2.5, 3.4, 2.2, 0, 0, TAU); ctx.ellipse(13.5, -2.5, 3.4, 2.2, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -9, 15, Math.PI * 1.12, Math.PI * 1.4); ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.2; ctx.stroke();
}

// Cursed Potion (block, never cut): a dark round flask, cork, skull label and
// purple liquid bubbling inside. Round where the block was square, but the
// only dark, purple, labelled thing in the air.
const FLASK_A = Math.atan2(-Math.sqrt(23 * 23 - 6.5 * 6.5), 6.5);
function flaskPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-6.5, -23); ctx.lineTo(-6.5, 8 + 23 * Math.sin(FLASK_A));
  ctx.arc(0, 8, 23, -Math.PI - FLASK_A, FLASK_A, true);
  ctx.lineTo(6.5, -23); ctx.closePath();
}
function drawPotion(ctx) {
  halo(ctx, '170,90,255', 22, 48, 0.5, 0, 2);
  // a wisp of cursed smoke above the cork
  ctx.beginPath(); ctx.moveTo(1, -35); ctx.bezierCurveTo(-6, -38, 7, -42, 0, -46.5);
  ctx.strokeStyle = 'rgba(200,140,255,0.55)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke();
  nightShadow(ctx, () => flaskPath(ctx));
  const glass = ctx.createLinearGradient(-23, -20, 23, 30);
  glass.addColorStop(0, '#33264A'); glass.addColorStop(1, '#120A1C');
  flaskPath(ctx); ctx.fillStyle = glass; ctx.fill();
  // the brew
  ctx.save(); ctx.beginPath(); ctx.arc(0, 8, 20.5, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.moveTo(-24, -3); ctx.quadraticCurveTo(-12, -6.5, 0, -3); ctx.quadraticCurveTo(12, 0.5, 24, -3); ctx.lineTo(24, 32); ctx.lineTo(-24, 32); ctx.closePath();
  const brew = ctx.createLinearGradient(0, -5, 0, 30);
  brew.addColorStop(0, '#C77DFF'); brew.addColorStop(0.45, HW.potion); brew.addColorStop(1, '#3A0D68');
  ctx.fillStyle = brew; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-24, -3); ctx.quadraticCurveTo(-12, -6.5, 0, -3); ctx.quadraticCurveTo(12, 0.5, 24, -3);
  ctx.strokeStyle = '#E2B8FF'; ctx.lineWidth = 1.6; ctx.stroke();
  halo(ctx, '215,150,255', 0, 18, 0.3, 0, 14);
  ctx.restore();
  // bubbles
  ctx.fillStyle = 'rgba(232,200,255,0.28)'; ctx.strokeStyle = '#ECCFFF'; ctx.lineWidth = 1;
  for (const [x, y, r] of [[-15, 6, 2.4], [15, 11, 1.8], [-13.5, 20, 1.5], [13, 23, 2.6], [0, 25.5, 1.7], [-4, -3.5, 2.2], [6, -9, 1.6], [-8, -11, 1.1], [1.5, -18, 1.3]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
  }
  // glass gleam and rim
  ctx.beginPath(); ctx.arc(0, 8, 18, Math.PI * 1.08, Math.PI * 1.36); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-3.8, -21.5); ctx.lineTo(-3.8, -15.5); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.6; ctx.stroke();
  flaskPath(ctx); ink(ctx, 2.4);
  // lip and cork
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-9, -26.5, 18, 4.2, 2) : ctx.rect(-9, -26.5, 18, 4.2);
  ctx.fillStyle = '#2E2240'; ctx.fill(); ink(ctx, 1.8);
  ctx.beginPath(); ctx.moveTo(-6, -26.5); ctx.lineTo(-6.8, -33); ctx.quadraticCurveTo(0, -36, 6.8, -33); ctx.lineTo(6, -26.5); ctx.closePath();
  const cork = ctx.createLinearGradient(-7, 0, 7, 0);
  cork.addColorStop(0, '#B07C48'); cork.addColorStop(1, '#6B4424');
  ctx.fillStyle = cork; ctx.fill(); ink(ctx, 1.8);
  ctx.fillStyle = 'rgba(60,34,16,0.6)';
  ctx.beginPath(); ctx.arc(-2.5, -30.5, 0.8, 0, TAU); ctx.arc(2.2, -29, 0.7, 0, TAU); ctx.arc(0.5, -32.6, 0.6, 0, TAU); ctx.fill();
  // the label: skull and crossbones
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-10, 0.5, 20, 19, 3) : ctx.rect(-10, 0.5, 20, 19);
  ctx.fillStyle = HW.bone; ctx.fill(); ink(ctx, 1.6);
  ctx.beginPath(); ctx.moveTo(-6.5, 12.8); ctx.lineTo(6.5, 17.6); ctx.moveTo(6.5, 12.8); ctx.lineTo(-6.5, 17.6);
  ctx.strokeStyle = NIGHT_INK; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
  ctx.fillStyle = NIGHT_INK;
  ctx.beginPath(); for (const [x, y] of [[-6.8, 12.6], [6.8, 12.6], [-6.8, 17.8], [6.8, 17.8]]) { ctx.moveTo(x + 1.3, y); ctx.arc(x, y, 1.3, 0, TAU); } ctx.fill();
  ctx.beginPath(); ctx.arc(0, 7.2, 4.9, 0, TAU); ctx.fill(); ctx.fillRect(-2.9, 9, 5.8, 4.2);
  ctx.fillStyle = HW.bone;
  ctx.beginPath(); ctx.arc(-1.9, 7, 1.35, 0, TAU); ctx.arc(1.9, 7, 1.35, 0, TAU); ctx.fill();
  ctx.fillRect(-1.6, 11.2, 0.8, 2); ctx.fillRect(0.8, 11.2, 0.8, 2);
}

// Power badges: the same hexagon, moon cream with a coloured rim and glow
const NIGHT_POWER = {
  overclock: { rim: HW.pumpkin, glow: HW.ember },          // Witching Hour: a witch's hat
  amp:       { rim: HW.candy, glow: '255,95,162' },        // Double Treat: a sweet, x2
  stasis:    { rim: '#8FD8FF', glow: '143,216,255' },      // Frozen Time: an iced hourglass
  quake:     { rim: HW.slime, glow: HW.ghostGlow },        // Haunt: a ghost going boo
};
function drawPowerNight(ctx, kind) {
  const hex = [[0, -30], [26, -15], [26, 15], [0, 30], [-26, 15], [-26, -15]];
  const P = NIGHT_POWER[kind] || NIGHT_POWER.quake, IC = '#2A1838';
  halo(ctx, P.glow, 24, 44, 0.55);
  nightShadow(ctx, () => path(ctx, hex));
  const g = ctx.createRadialGradient(-8, -12, 2, 0, 0, 34);
  g.addColorStop(0, '#FFFBEA'); g.addColorStop(0.6, HW.moon); g.addColorStop(1, '#DCC27E');
  facet(ctx, hex, g);
  path(ctx, hex); ctx.strokeStyle = NIGHT_INK; ctx.lineWidth = 6.5; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = P.rim; ctx.lineWidth = 3.4; ctx.stroke();
  ctx.fillStyle = IC; ctx.strokeStyle = IC; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'overclock') {
    const cone = () => { ctx.beginPath(); ctx.moveTo(-10, 9); ctx.quadraticCurveTo(-6, -4, -1, -13); ctx.quadraticCurveTo(3, -19, 12, -16); ctx.quadraticCurveTo(4, -12, 4, -6); ctx.quadraticCurveTo(6, 2, 10, 9); ctx.closePath(); };
    ctx.beginPath(); ctx.ellipse(0, 10, 17, 4.2, 0, 0, TAU); ctx.fill();
    cone(); ctx.fill();
    ctx.save(); cone(); ctx.clip();
    ctx.beginPath(); ctx.moveTo(-12, 3.5); ctx.quadraticCurveTo(0, 7, 12, 3.5); ctx.strokeStyle = HW.pumpkin; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = HW.moon; ctx.lineWidth = 1.2; ctx.strokeRect(-2.2, 2.6, 4.4, 3.6);
  } else if (kind === 'amp') {
    ctx.beginPath(); ctx.moveTo(-5.5, -8); ctx.lineTo(-15, -13); ctx.lineTo(-15, -2); ctx.closePath();
    ctx.moveTo(5.5, -8); ctx.lineTo(15, -2); ctx.lineTo(15, -13); ctx.closePath();
    ctx.fillStyle = HW.candy; ctx.fill(); ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -7.5, 7.2, 0, TAU); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -7.5, 3.6, Math.PI * 0.2, Math.PI * 1.5); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = IC; ctx.font = '700 16px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('x2', 0, 12); ctx.textBaseline = 'alphabetic';
  } else if (kind === 'stasis') {
    const glass = () => { ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(8, -12); ctx.quadraticCurveTo(8, -4, 1.5, 0); ctx.quadraticCurveTo(8, 4, 8, 12); ctx.lineTo(-8, 12); ctx.quadraticCurveTo(-8, 4, -1.5, 0); ctx.quadraticCurveTo(-8, -4, -8, -12); ctx.closePath(); };
    glass(); ctx.fillStyle = 'rgba(143,216,255,0.3)'; ctx.fill();
    ctx.save(); glass(); ctx.clip(); ctx.fillStyle = '#6FC2EE';
    ctx.fillRect(-9, -8, 18, 8); ctx.beginPath(); ctx.moveTo(-8, 12); ctx.quadraticCurveTo(0, 4, 8, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
    glass(); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -14); ctx.lineTo(11, -14); ctx.moveTo(-11, 14); ctx.lineTo(11, 14); ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; ctx.moveTo(15 + Math.cos(a) * 4.5, -10 + Math.sin(a) * 4.5); ctx.lineTo(15 - Math.cos(a) * 4.5, -10 - Math.sin(a) * 4.5); }
    ctx.lineWidth = 1.6; ctx.stroke();
  } else if (kind === 'quake') {
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.arc(0, -4, 10, Math.PI, 0); ctx.lineTo(10, 12);
    ctx.quadraticCurveTo(6.67, 17.5, 3.33, 12); ctx.quadraticCurveTo(0, 17.5, -3.33, 12); ctx.quadraticCurveTo(-6.67, 17.5, -10, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFF8DE';
    ctx.beginPath(); ctx.ellipse(-3.6, -4.5, 2, 2.8, 0, 0, TAU); ctx.ellipse(3.6, -4.5, 2, 2.8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 3.5, 2.2, 3, 0, 0, TAU); ctx.fill();
    ctx.beginPath();
    for (const a of [-2.5, -1.95, -1.19, -0.64, -Math.PI / 2]) { ctx.moveTo(Math.cos(a) * 15.5, -2 + Math.sin(a) * 15.5); ctx.lineTo(Math.cos(a) * 20, -2 + Math.sin(a) * 20); }
    ctx.lineWidth = 2.4; ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// The Great Pumpkin, drawn live: a giant jack-o'-lantern whose face burns
// brighter the more it cracks, the candle inside beating like the Core's heart.
const BOSS_S = 2.2;
const BOSS_FACE = [
  [[-46, -6], [-13, -14], [-31, -36]], [[46, -6], [13, -14], [31, -36]],
  [[-7, 6], [7, 6], [0, -6]],
  [[-52, 10], [-36, 22], [-26, 22], [-26, 31], [-16, 31], [-16, 24], [16, 24], [16, 31], [26, 31], [26, 22], [36, 22], [52, 10],
    [44, 30], [30, 44], [14, 49], [14, 41], [4, 41], [4, 50], [-4, 50], [-4, 41], [-14, 41], [-14, 49], [-30, 44], [-44, 30]],
];
function drawGreatPumpkin(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  const k = 1 + Math.sin(b.ph * 2) * 0.015 + b.punch * 0.06;
  ctx.scale(k, k);
  ctx.rotate(Math.sin(b.ph * 0.4) * 0.05);
  const S = BOSS_S, heat = 1 - Math.exp(-b.hits / 10);
  const beat = Math.sin(b.ph * (2 + b.hits * 0.15));
  const heart = 20 + beat * 2 + b.punch * 5;
  const lum = Math.min(1, 0.38 + heat * 0.56 + beat * 0.05 + b.punch * 0.3);
  halo(ctx, HW.ember, 56, 112 + heart, 0.16 + heat * 0.24 + b.punch * 0.14, 0, 4);
  ctx.save(); ctx.translate(5, 10); pumpkinSil(ctx, S); ctx.fillStyle = NIGHT_SHADOW; ctx.fill(); ctx.restore();
  pumpkinBody(ctx, S, 2.6);
  pumpkinStem(ctx, S, 2.6);
  // candlelight on the rind round the face
  ctx.save(); pumpkinSil(ctx, S); ctx.clip();
  halo(ctx, '255,200,90', 0, 70 + heart, 0.16 + 0.3 * lum, 0, 14);
  // cracks in the rind: dark slits, the newest still leaking light
  const n = b.cracks.length;
  if (n) {
    const slits = (from) => { ctx.beginPath(); for (let i = from; i < n; i++) b.cracks[i].forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); };
    ctx.lineJoin = 'miter'; ctx.lineCap = 'round';
    slits(0);
    ctx.strokeStyle = rgba('255,150,50', 0.1 + 0.2 * lum); ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = '#3A1204'; ctx.lineWidth = 2.6; ctx.stroke();
    slits(Math.max(0, n - 6));
    ctx.strokeStyle = rgba('255,196,96', 0.45 + 0.5 * lum); ctx.lineWidth = 1.1; ctx.stroke();
  }
  // the face on top, burning brighter the more it is cut
  carve(ctx, BOSS_FACE, 1, 3.8, lum, 14, heart * (2.6 + heat * 1.6));
  ctx.restore();
  ctx.restore();
}
