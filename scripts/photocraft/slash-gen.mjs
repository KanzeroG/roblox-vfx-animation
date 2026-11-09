// Procedural "Sword Slash" flipbook for PhotoCraft: four white 1024x1024 4x4 sheets
// (hot core, body, rim, glow) drawn as polygon paths with shape.create kind "path".
// Writes a steps file for mcp-client.mjs. All shapes are white; opacity is set per layer.
//
// Usage: node slash-gen.mjs [steps.json] [output dir under the PhotoCraft write root]
//   defaults: ./slash-steps.json and vfx_output/sword_slash
//
// Shape model (per frame, in cell-local px, y down):
//   centerline C(u), u in [0,1]: 0 = tail tip, 1 = head tip. A tilted, squashed spiral
//   arc whose radius grows toward the head, so the slash is never a symmetric crescent.
//   width W(v): a needle tail rising to a thick head, then a straight-sided wedge to a point
//   (see profile()). The body sits asymmetrically on the centerline (OUT outside, IN inside).
// Frames 1-4 grow, 5-8 hold at peak, 9-16 eat the body from the tail into drifting shards.
// Tune the constants below; the whole animation is fitted into the SAFE box per cell.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CELL = 256, GRID = 4, SAFE = 30;       // geometry stays inside [SAFE, CELL-SAFE] per cell
const A = 2.6;                               // tail thinness: higher = longer needle tail
const HOOK = 9;                              // px the head tip curls outward, like a blade tip
const OUT = 0.62, IN = 0.38;                 // lateral split of the body width
const WMAX = 48;                             // peak body width, px (before fit)
const R0 = 84;                               // arc radius at the tail, px (before fit)
const TAIL_ANG = 150, HEAD_ANG = 352;        // sweep, degrees (y-down: increasing = clockwise)
const TILT = -14, SQUASH = 0.74;             // ellipse tilt (deg) and vertical squash
const OPACITY = { core: 1.0, body: 0.8, rim: 0.95, glow: 0.55 };
const GLOW_BLUR = 5;                         // Gaussian Blur radius, px

// --- deterministic noise ---
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// Width profile: a long needle tail rising to a thick head at VP, then a straight-sided
// wedge to a sharp tip (the fall is linear at y = 1, so the tip is a point, never rounded).
const VP = 0.76;
function profile(v, vp = VP) {
  if (v <= 0 || v >= 1) return 0;
  if (v < vp) { const x = v / vp; return Math.pow(x, A) * Math.exp(A * (1 - x)); }
  const y = (v - vp) / (1 - vp);
  return Math.pow(1 - Math.pow(y, 1.5), 1.15);
}
// Same shape for the core and rim strips (s in [0,1] along the strip, head at s = 1).
function stripProfile(s, peak = 0.72) {
  if (s <= 0 || s >= 1) return 0;
  if (s < peak) { const x = s / peak; return Math.pow(x, 1.6) * Math.exp(1.6 * (1 - x)); }
  const y = (s - peak) / (1 - peak);
  return 1 - Math.pow(y, 1.3);
}

// centerline point and unit normal (pointing outward) at global u, with an extra rotation drift
function center(u, drift = 0, push = 0) {
  const ang = ((lerp(TAIL_ANG, HEAD_ANG, u) + drift) * Math.PI) / 180;
  // spiral: the tail curls tight, the radius opens toward the head, and the tip hooks outward
  const r = R0 * (0.68 + 0.46 * u + 0.08 * u * u) + HOOK * smooth((u - 0.82) / 0.18) + push;
  const lx = r * Math.cos(ang), ly = r * Math.sin(ang) * SQUASH;
  const t = (TILT * Math.PI) / 180;
  return [lx * Math.cos(t) - ly * Math.sin(t), lx * Math.sin(t) + ly * Math.cos(t)];
}
function frameAt(u, drift = 0, push = 0) {
  const e = 1e-4;
  const p = center(u, drift, push);
  const a = center(Math.max(0, u - e), drift, push), b = center(Math.min(1, u + e), drift, push);
  let tx = b[0] - a[0], ty = b[1] - a[1];
  const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
  // outward normal: away from the arc's centre (origin)
  let nx = -ty, ny = tx;
  if (nx * p[0] + ny * p[1] < 0) { nx = -nx; ny = -ny; }
  return { p, t: [tx, ty], n: [nx, ny] };
}

// Fixed tooth sites in global u so tears stay coherent from frame to frame.
const TEETH = (() => {
  const r = rng(7), out = [];
  for (let u = 0.03; u < 0.97; u += 0.022 + r() * 0.026) out.push({ u, side: r() < 0.6 ? 1 : -1, k: 0.55 + r() * 0.9, back: 0.045 + r() * 0.04, notch: r() < 0.55 });
  return out;
})();
const RIPS = (() => {
  const r = rng(21), out = [];
  for (let i = 0; i < 16; i++) {
    const u0 = 0.12 + r() * 0.7;
    const lat = r() < 0.6 ? -0.04 - r() * 0.24 : 0.36 + r() * 0.14;   // avoid the core band
    out.push({ u0, len: 0.1 + r() * 0.18, lat, th: 0.03 + r() * 0.04 });
  }
  return out;
})();
// Shards are spread along the length on a jittered grid so they never stack into bars.
const SHARDS = (() => {
  const r = rng(99), out = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const lane = i % 5, u0 = 0.02 + (i / n) * 0.88 + lane * 0.011 + (r() - 0.5) * 0.02;
    const lat = -0.24 + lane * 0.16 + (r() - 0.5) * 0.06; // five lanes, staggered along u
    out.push({ u0, len: 0.08 + r() * 0.1, lat, th: 0.07 + r() * 0.07, drift: 4 + r() * 18, push: -6 + r() * 20, delay: r() * 0.2, speed: 0.7 + r() * 0.6 });
  }
  return out;
})();

// --- per-frame state ---
// stage: grow (1-4), peak (5-8), break (9-16)
function state(f) {
  if (f < 4) {
    const g = (f + 1) / 4;
    return { s0: 0, s1: lerp(0.3, 0.94, smooth(g) * 0.7 + g * 0.3), k: [0.3, 0.55, 0.78, 0.93][f], drift: lerp(-10, -2, g), tear: 0.25, local: true, core: 1, rim: 1, front: 0 };
  }
  if (f < 8) {
    const g = (f - 4) / 3;
    return { s0: lerp(0, 0.04, g), s1: 1, k: [0.98, 1.0, 1.0, 0.97][f - 4], drift: lerp(0, 4, g), tear: lerp(0.35, 0.6, g), local: true, core: 1, rim: 1, front: 0 };
  }
  const tb = (f - 8) / 7;   // 0..1 over frames 9-16
  const front = 0.06 + 0.98 * Math.pow(tb, 0.8);
  return { s0: front, s1: 1, k: lerp(0.95, 0.4, tb), drift: lerp(5, 16, tb), tear: lerp(0.75, 1.3, tb), local: false, core: clamp(1 - tb * 1.25, 0, 1), rim: clamp(1 - tb * 1.4, 0, 1), front, tb };
}

// Short arcs (the first grow frames) get a wedge at least HEAD_PX long, so the tip stays a point.
const HEAD_PX = 44;
function arcLen(u0, u1) {
  let len = 0, prev = center(u0);
  for (let i = 1; i <= 24; i++) { const q = center(lerp(u0, u1, i / 24)); len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
  return len;
}
const headVP = (st) => clamp(1 - HEAD_PX / Math.max(arcLen(st.s0, st.s1), 1), 0.45, VP);

// body width at global u for a state
function widthAt(st, u) {
  const span = st.s1 - st.s0;
  if (span <= 0.02 || u <= st.s0 || u >= st.s1) return 0;
  const v = (u - st.s0) / span;
  if (st.local) return WMAX * st.k * profile(v, headVP(st));
  // break: global shape, re-tapered to a point at the eaten front
  const taper = Math.pow(clamp((u - st.s0) / (0.3 * span + 0.02), 0, 1), 0.9);
  return WMAX * st.k * profile(u) * taper;
}

// Closed outline of the body with torn, back-raked teeth.
function bodyOutline(st) {
  const N = 110, outer = [], inner = [];
  const teeth = TEETH.filter((t) => t.u > st.s0 + 0.03 && t.u < st.s1 - 0.04);
  for (let i = 0; i <= N; i++) {
    const u = lerp(st.s0, st.s1, i / N);
    const w = widthAt(st, u);
    const { p, n } = frameAt(u, st.drift);
    outer.push({ u, pt: [p[0] + n[0] * w * OUT, p[1] + n[1] * w * OUT] });
    inner.push({ u, pt: [p[0] - n[0] * w * IN, p[1] - n[1] * w * IN] });
  }
  const addTeeth = (edge, side) => {
    const res = [];
    for (let i = 0; i < edge.length; i++) {
      res.push(edge[i].pt);
      const a = edge[i], b = edge[i + 1];
      if (!b) continue;
      for (const t of teeth) {
        if (t.side !== side || t.u < a.u || t.u >= b.u) continue;
        const v = (t.u - st.s0) / (st.s1 - st.s0);
        // tears live mostly on the tail half; the front arc stays clean for the rim
        const zone = side === 1 ? 1 - smooth((v - 0.38) / 0.18) : 1 - smooth((v - 0.7) / 0.2);
        const w = widthAt(st, t.u);
        const depth = (1.5 + w * 0.32) * t.k * st.tear * zone;
        if (depth < 1.5) continue;
        // tooth tip sits behind its base (toward the tail) and outside the edge: raked along the flow
        const ub = Math.max(st.s0, t.u - t.back * (0.7 + st.tear));
        const f = frameAt(ub, st.drift), wb = widthAt(st, ub);
        const off = side === 1 ? wb * OUT + depth : -(wb * IN + depth * 0.8);
        res.push([f.p[0] + f.n[0] * off, f.p[1] + f.n[1] * off]);
        if (t.notch) {
          // a sliver-shaped bite back into the body just ahead of the tooth: a tear, not a step
          const un = Math.min(b.u, t.u + t.back * 0.35);
          const g = frameAt(un, st.drift), wn = widthAt(st, un);
          const bite = Math.min(depth * 0.6, wn * 0.3);
          const offn = side === 1 ? wn * OUT - bite : -(wn * IN - bite);
          res.push([g.p[0] + g.n[0] * offn, g.p[1] + g.n[1] * offn]);
        }
      }
    }
    return res;
  };
  const o = addTeeth(outer, 1);
  const inn = addTeeth(inner, -1).reverse();
  // both ends collapse to a single point (w = 0 there), so the outline is tip-to-tip
  return dedupe([...o, ...inn.slice(1, -1)]);
}

// A thin lens following the arc: tapered to points at both ends.
function sliver(st, u0, u1, lat, th, drift = st.drift, push = 0, wScale = null) {
  const N = 18, a = [], b = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, u = lerp(u0, u1, s);
    const w = wScale ?? Math.max(widthAt(st, u), 0);
    const half = th * w * stripProfile(s, 0.65) * 0.5;   // needle behind, wedge in front: both ends pointed
    const { p, n } = frameAt(u, drift, push);
    const c = lat * w;
    a.push([p[0] + n[0] * (c + half), p[1] + n[1] * (c + half)]);
    b.push([p[0] + n[0] * (c - half), p[1] + n[1] * (c - half)]);
  }
  return dedupe([...a, ...b.reverse().slice(1, -1)]);
}

function rips(st) {
  const out = [];
  for (const r of RIPS) {
    const u0 = r.u0, u1 = r.u0 + r.len * (0.7 + st.tear * 0.4);
    if (u0 < st.s0 + 0.05 || u1 > st.s1 - 0.06) continue;
    // the rip must sit inside the body over its whole length
    let ok = true;
    for (let s = 0; s <= 1; s += 0.1) { const w = widthAt(st, lerp(u0, u1, s)); if (w < 6) ok = false; }
    if (!ok) continue;
    out.push(sliver(st, u0, u1, r.lat, r.th * (0.8 + st.tear * 0.5)));
  }
  return out;
}

// Core: a slim hot blade inside the head, offset toward the outer rim.
function core(st) {
  if (st.core <= 0.05) return null;
  const span = st.s1 - st.s0;
  const u0 = st.s0 + span * lerp(0.42, 0.62, 1 - st.core), u1 = st.s0 + span * 0.975;
  if (u1 - u0 < 0.05) return null;
  const N = 40, a = [], b = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, u = lerp(u0, u1, s);
    const w = widthAt(st, u);
    const half = w * 0.16 * st.core * stripProfile(s, 0.7);   // needle behind, sharp wedge in front
    const { p, n } = frameAt(u, st.drift);
    const c = w * 0.14;
    a.push([p[0] + n[0] * (c + half), p[1] + n[1] * (c + half)]);
    b.push([p[0] + n[0] * (c - half), p[1] + n[1] * (c - half)]);
  }
  return dedupe([...a, ...b.reverse().slice(1, -1)]);
}

// Rim: a hairline band hugging the clean front arc of the outer edge.
function rim(st, scale) {
  if (st.rim <= 0.05) return null;
  const span = st.s1 - st.s0;
  const u0 = st.s0 + span * lerp(0.4, 0.7, 1 - st.rim), u1 = st.s0 + span * 0.99;
  const N = 50, a = [], b = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, u = lerp(u0, u1, s);
    const w = widthAt(st, u);
    const thick = Math.min(4.2 / scale, w * 0.3) * st.rim * stripProfile(s, 0.78);
    const { p, n } = frameAt(u, st.drift);
    const edge = w * OUT;
    a.push([p[0] + n[0] * edge, p[1] + n[1] * edge]);
    b.push([p[0] + n[0] * (edge - thick), p[1] + n[1] * (edge - thick)]);
  }
  return dedupe([...a, ...b.reverse().slice(1, -1)]);
}

// Break-apart shards: thin slivers peeled off behind the eaten front, drifting with the swing.
function shards(st) {
  if (st.tb === undefined) return [];
  const out = [];
  const peak = { s0: 0, s1: 1, k: 1, local: true };
  for (const s of SHARDS) {
    const born = s.u0 + s.len * 0.5;                          // shard frees when the front passes it
    const g = ((st.front - born) / 0.5 - s.delay) * s.speed;   // age 0..1
    if (g <= 0 || g >= 1) continue;
    const thin = Math.pow(1 - g, 1.2);
    // it streaks forward: the trailing end catches up faster than the leading end moves
    const u0 = s.u0 + s.len * 0.45 * g, u1 = s.u0 + s.len * (1 + 0.25 * g);
    if (u1 > 1) continue;
    const pts = sliver(peak, u0, u1, s.lat, s.th * thin, st.drift + s.drift * g, s.push * g);
    out.push(pts);
  }
  return out;
}

function dedupe(pts) {
  const r = [];
  for (const p of pts) {
    const q = r[r.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.05) r.push(p);
  }
  return r;
}

// --- build all frames in abstract px, then fit uniformly into the safe box ---
function buildFrames(scale) {
  const frames = [];
  for (let f = 0; f < 16; f++) {
    const st = state(f);
    const body = st.s1 - st.s0 > 0.1 ? bodyOutline(st) : null;
    frames.push({ body, rips: body ? rips(st) : [], core: core(st), rim: rim(st, scale), shards: shards(st) });
  }
  return frames;
}
function bbox(frames) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const fr of frames) for (const poly of [fr.body, fr.core, fr.rim, ...fr.rips, ...fr.shards]) if (poly) for (const [x, y] of poly) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}
let frames = buildFrames(1);
let bb = bbox(frames);
const avail = CELL - 2 * SAFE;
const scale = Math.min(avail / (bb.x1 - bb.x0), avail / (bb.y1 - bb.y0));
frames = buildFrames(scale);
bb = bbox(frames);
const ox = SAFE + (avail - (bb.x1 - bb.x0) * scale) / 2 - bb.x0 * scale;
const oy = SAFE + (avail - (bb.y1 - bb.y0) * scale) / 2 - bb.y0 * scale;

const place = (poly, f) => {
  const cx = (f % GRID) * CELL, cy = Math.floor(f / GRID) * CELL;
  return poly.map(([x, y]) => [+(cx + ox + x * scale).toFixed(2), +(cy + oy + y * scale).toFixed(2)]);
};
const sub = (poly, f, op = "combine") => ({ closed: true, op, knots: place(poly, f) });

// One path per frame (PhotoCraft caps a path at 4096 knots).
function layerPath(kind, only) {
  const subpaths = [];
  frames.forEach((fr, f) => {
    if (only !== undefined && f !== only) return;
    if (kind === "body" || kind === "glow") {
      if (fr.body) { subpaths.push(sub(fr.body, f)); for (const r of fr.rips) subpaths.push(sub(r, f, "subtract")); }
      for (const s of fr.shards) subpaths.push(sub(s, f));
    }
    if ((kind === "core" || kind === "glow") && fr.core) subpaths.push(sub(fr.core, f));
    if (kind === "rim" && fr.rim) subpaths.push(sub(fr.rim, f));
  });
  return { subpaths, fillRule: "nonzero" };
}

const STEPS_FILE = resolve(process.argv[2] ?? "slash-steps.json");
const OUT_DIR = process.argv[3] ?? "vfx_output/sword_slash";
const LAYERS = [
  { kind: "core", file: "slash_hot_core.png" },
  { kind: "body", file: "slash_body.png" },
  { kind: "rim", file: "slash_rim.png" },
  { kind: "glow", file: "slash_glow.png" },
];
const steps = [];
for (const L of LAYERS) {
  steps.push({ tool: "doc_new", args: { width: 1024, height: 1024, background: "transparent", name: L.kind } });
  for (let f = 0; f < 16; f++) {
    const path = layerPath(L.kind, f);
    if (path.subpaths.length) steps.push({ tool: "command_run", args: { id: "shape.create", params: { kind: "path", name: `${L.kind}_${f + 1}`, fill: "#ffffff", stroke: null, path } }, quiet: true });
  }
  steps.push({ tool: "command_run", args: { id: "layer.mergeVisible", params: {} }, quiet: true });
  if (L.kind === "glow") steps.push({ tool: "command_run", args: { id: "filter.blur.gaussianBlur", params: { radius: GLOW_BLUR } }, quiet: true });
  steps.push({ tool: "command_run", args: { id: "layer.setProps", params: { opacity: OPACITY[L.kind] } }, quiet: true });
  steps.push({ tool: "doc_save", args: { path: `${OUT_DIR}/${L.file}` } });
  // dark preview for review only (after export, so the PNG stays transparent)
  steps.push({ tool: "command_run", args: { id: "layer.newFillLayer.solidColor", params: { color: "#14141c" } }, quiet: true });
  steps.push({ tool: "command_run", args: { id: "layer.arrange.sendToBack", params: {} }, quiet: true });
  steps.push({ tool: "render_preview", args: { max_side: 1024 }, saveImageAs: `preview_${L.kind}.png` });
  steps.push({ tool: "doc_close", args: {} });
}
writeFileSync(STEPS_FILE, JSON.stringify(steps));
console.log(`${STEPS_FILE}: scale ${scale.toFixed(3)}, subpaths:${LAYERS.map((L) => `${L.kind}=${layerPath(L.kind).subpaths.length}`).join(" ")}`);
