// Everything that gets tossed across the chart. Stained glass (tinted,
// see-through, rounded or pointed) is to be cut. The redaction block (solid
// ink, square, padlocked) is shielded and must not be. Each type draws itself
// centred on the origin; the game caches them as sprites so a phone only pays
// for drawImage while playing.

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

export const POWERS = {
  overclock: { name: 'Overclock', text: 'glass from every side', dur: 6 },
  amp:       { name: 'Amplifier', text: 'every point counts double', dur: 8 },
  stasis:    { name: 'Stasis', text: 'time slows, the clock stops', dur: 5 },
  quake:     { name: 'Quake', text: 'everything shatters', dur: 0 },
};

// Power: a white badge with a mauve rim, unlike anything else in the air
function drawPower(ctx, kind) {
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
export const TYPES = {
  orb:   { name: 'Orb', r: 36, pad: 46, pts: 1, draw: drawOrb },
  lens:  { name: 'Lens', r: 38, pad: 48, pts: 1, draw: drawLens },
  prism: { name: 'Prism', r: 34, pad: 48, pts: 1, draw: drawPrism },
  dart:  { name: 'Dart', r: 30, pad: 46, pts: 1, draw: drawDart },
  star:  { name: 'Star', r: 30, pad: 46, pts: 2, draw: drawStar },
  block: { name: 'shielded block', r: 34, pad: 50, forbidden: true, draw: drawBlock },
  power: { name: 'power-up', r: 32, pad: 46 },
  boss:  { name: 'The Core', r: 84 },
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
