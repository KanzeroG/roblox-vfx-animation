// Review image: chosen frames at 2x. Top row composites glow < body < rim < core with a
// sample tint on dark; bottom row shows the body alone with the cell border in red.
// Expects slash_glow/body/rim/hot_core.png in <dir> (rename the list below for other sets).
// Usage: node sheet-review.mjs <dir> <out.png> <frame,frame,...>   (frames are 1-based)
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

function readPng(file) {
  const buf = readFileSync(file);
  let pos = 8, w, h; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8), d = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); }
    if (type === "IDAT") idat.push(d);
    pos += 12 + len;
  }
  const ch = 4, stride = w * ch, raw = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * ch);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? px[y * stride + x - ch] : 0, b = y > 0 ? px[(y - 1) * stride + x] : 0, c = x >= ch && y > 0 ? px[(y - 1) * stride + x - ch] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, px };
}
function crc32(b) { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = ~0; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return ~r >>> 0; }
function chunk(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePng(file, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}

const [dir, out, list] = process.argv.slice(2);
const frames = list.split(",").map(Number);
// sample Roblox tints: glow and body blue, rim pale cyan, core white
const layers = [
  ["slash_glow.png", [60, 140, 255]],
  ["slash_body.png", [90, 170, 255]],
  ["slash_rim.png", [200, 240, 255]],
  ["slash_hot_core.png", [255, 255, 255]],
].map(([f, tint]) => ({ img: readPng(`${dir}/${f}`), tint }));
const Z = 2, C = 256, W = frames.length * C * Z + (frames.length + 1) * 8, H = C * Z * 2 + 24;
const rgb = Buffer.alloc(W * H * 3, 0);
for (let i = 0; i < W * H; i++) { rgb[i * 3] = 20; rgb[i * 3 + 1] = 20; rgb[i * 3 + 2] = 28; }
frames.forEach((f, k) => {
  const cx = ((f - 1) % 4) * C, cy = Math.floor((f - 1) / 4) * C, ox = 8 + k * (C * Z + 8);
  for (let row = 0; row < 2; row++) {          // row 0: composite, row 1: body alpha alone with cell border
    const oy = 8 + row * (C * Z + 8);
    for (let y = 0; y < C * Z; y++) for (let x = 0; x < C * Z; x++) {
      const sx = cx + Math.floor(x / Z), sy = cy + Math.floor(y / Z), o = ((oy + y) * W + ox + x) * 3;
      let r = rgb[o], g = rgb[o + 1], b = rgb[o + 2];
      const set = row === 0 ? layers : [{ img: layers[1].img, tint: [255, 255, 255] }];
      for (const L of set) {
        const i = (sy * L.img.w + sx) * 4, a = L.img.px[i + 3] / 255;
        r = r + (L.tint[0] - r) * a; g = g + (L.tint[1] - g) * a; b = b + (L.tint[2] - b) * a;
      }
      if (row === 1 && (x < Z || y < Z || x >= C * Z - Z || y >= C * Z - Z)) { r = 255; g = 60; b = 60; }   // cell edge
      rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b;
    }
  }
});
writePng(out, W, H, rgb);
console.log(`wrote ${out} (${W}x${H})`);
