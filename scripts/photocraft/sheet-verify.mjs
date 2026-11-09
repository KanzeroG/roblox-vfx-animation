// Check exported 4x4 flipbook PNGs: size 1024x1024, white-only colour, and per cell the
// empty margin to the cell edge (any pixel with alpha > 0 counts, blur included) and coverage.
// Exits 1 when a sheet fails. Empty cells are reported; a layer that fades out early may
// leave its last cells empty on purpose.
// Usage: node sheet-verify.mjs <dir> [margin=4]
import { readFileSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";

function readPng(file) {
  const buf = readFileSync(file);
  let pos = 8, w, h, bitDepth, colorType;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 4)) throw new Error(`${file}: unsupported PNG (depth ${bitDepth}, type ${colorType})`);
  const ch = colorType === 6 ? 4 : 2, stride = w * ch;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(w * h * ch);
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
  return { w, h, ch, px };
}

const dir = process.argv[2], MARGIN = +(process.argv[3] ?? 4);
let fail = false;
for (const name of readdirSync(dir).filter((f) => f.endsWith(".png")).sort()) {
  const { w, h, ch, px } = readPng(`${dir}/${name}`);
  const cell = w / 4, issues = [], empty = [];
  if (w !== 1024 || h !== 1024) issues.push(`size ${w}x${h}`);
  let nonWhite = 0, maxA = 0;
  const cells = [];
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    let minGap = Infinity, cover = 0;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const i = ((cy * cell + y) * w + cx * cell + x) * ch;
      const a = ch === 4 ? px[i + 3] : px[i + 1];
      if (!a) continue;
      cover++; maxA = Math.max(maxA, a);
      if (ch === 4 && a > 8 && (px[i] < 250 || px[i + 1] < 250 || px[i + 2] < 250)) nonWhite++;
      minGap = Math.min(minGap, x, y, cell - 1 - x, cell - 1 - y);
    }
    cells.push({ minGap, cover: (cover / (cell * cell) * 100).toFixed(1) });
    if (cover === 0) empty.push(cy * 4 + cx + 1);
    else if (minGap < MARGIN) issues.push(`cell ${cy * 4 + cx + 1} gap ${minGap}px < ${MARGIN}`);
  }
  if (nonWhite) issues.push(`${nonWhite} non-white pixels`);
  fail ||= issues.length > 0;
  const gaps = cells.map((c) => (c.minGap === Infinity ? "-" : c.minGap));
  console.log(`${name}: ${issues.length ? "FAIL " + issues.join("; ") : "OK"}${empty.length ? ` (note: empty cells ${empty.join(",")})` : ""} | max alpha ${maxA} | min gap per cell [${gaps.join(" ")}] | coverage % [${cells.map((c) => c.cover).join(" ")}]`);
}
process.exit(fail ? 1 : 0);
