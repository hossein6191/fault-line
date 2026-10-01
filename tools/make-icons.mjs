// Renders the icon to PNG without any image library: shape tests with 4x4
// supersampling and a hand-rolled PNG encoder. Geometry mirrors icon.svg.
//   node tools/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const PAPER = [245, 241, 242], INK = [22, 22, 22], PLUM = [61, 39, 49], LIGHT = [194, 154, 175], MAUVE = [130, 90, 109], GRID = [222, 210, 215];

// the fault: the line through (118,318) and (394,198); the orb is a circle around its midpoint
const ax = 118, ay = 318, bx = 394, by = 198, cx = 256, cy = 258, R = 150;
const side = (x, y) => (bx - ax) * (y - ay) - (by - ay) * (x - ax);   // > 0 below the line
function sample(x, y) {
  // stroke
  const blade = [[52, 352], [58, 336], [470, 158], [462, 180]];
  let inside = false;
  for (let i = 0, j = blade.length - 1; i < blade.length; j = i++) {
    const [xi, yi] = blade[i], [xj, yj] = blade[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  if (inside) return INK;
  // upper half, slipped up-left; lower half, slipped down-right
  for (const [dx, dy, upper, fill] of [[12, 14, false, MAUVE], [-12, -12, true, LIGHT]]) {
    const px = x - dx, py = y - dy, d = Math.hypot(px - cx, py - cy), s = side(px, py);
    if (d <= R + 5 && (upper ? s <= 0 : s >= 0)) {
      const edge = Math.abs(s) / Math.hypot(bx - ax, by - ay);
      return d >= R - 5 || edge <= 5 ? PLUM : fill;
    }
  }
  if (Math.abs((x % 128) - 0) < 1 || Math.abs((y % 128) - 0) < 1) return GRID;
  return PAPER;
}
function render(size, scale) {
  const px = new Uint8Array(size * size * 3), SS = 4, k = 512 / size / scale, off = (512 - 512 / scale) / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const c = sample((x + (sx + 0.5) / SS) * k + off, (y + (sy + 0.5) / SS) * k + off);
      r += c[0]; g += c[1]; b += c[2];
    }
    const i = (y * size + x) * 3;
    px[i] = r / 16; px[i + 1] = g / 16; px[i + 2] = b / 16;
  }
  return px;
}
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0; Buffer.from(px.buffer, y * size * 3, size * 3).copy(raw, y * (size * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
for (const [name, size, scale] of [['icon-180.png', 180, 1], ['icon-192.png', 192, 1], ['icon-512.png', 512, 1], ['maskable-512.png', 512, 0.78]]) {
  writeFileSync(join(root, name), png(size, render(size, scale)));
  console.log('wrote', name);
}
