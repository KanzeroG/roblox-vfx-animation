// Proves scripts/photocraft/sheet-verify.mjs passes a clean 4x4 sheet and fails the
// defects it exists to catch. Run with: node tests/sheet-verify.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const verify = new URL("../scripts/photocraft/sheet-verify.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
// An RGBA PNG; paint(x, y) returns [r, g, b, a].
function png(size, paint) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y);
      raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// A white dot in the middle of each 256 px cell, `inset` px from the cell edge at its nearest.
function dots(inset, colour = [255, 255, 255]) {
  return (x, y) => {
    const cx = x % 256, cy = y % 256;
    const inside = cx >= inset && cx < 256 - inset && cy >= inset && cy < 256 - inset;
    return inside ? [...colour, 255] : [0, 0, 0, 0];
  };
}

const cases = [
  { name: "clean", paint: dots(20), expect: 0 },
  { name: "margin", paint: dots(2), expect: 1 },
  { name: "coloured", paint: dots(20, [255, 120, 40]), expect: 1 },
];
const work = mkdtempSync(join(tmpdir(), "sheet-verify-"));
let failures = 0;
for (const { name, paint, expect } of cases) {
  const dir = join(work, name);
  mkdirSync(dir);
  writeFileSync(join(dir, `${name}.png`), png(1024, paint));
  let code = 0;
  try {
    execFileSync(process.execPath, [verify, dir, "4"], { stdio: "pipe" });
  } catch (error) {
    code = error.status ?? -1;
  }
  if (code !== expect) {
    failures++;
    console.log(`FAIL ${name}: exit ${code}, expected ${expect}`);
  }
}
rmSync(work, { recursive: true, force: true });
console.log(`sheet-verify: ${cases.length} cases, ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
