# Flipbook layers in PhotoCraft

Use this path to draw particle textures and flipbooks with PhotoCraft running
headless through its MCP server. Draw shapes procedurally from polygon points,
or generate them with Codex and use PhotoCraft to clean them. The output is a
set of white, transparent 1024 × 1024 sheets. Each layer is tinted by the
emitter's `Color` in Roblox.

The rules in [vfx-textures.md](vfx-textures.md) still apply: white on
transparency, 4 × 4 at 1024 px, a few empty pixels inside each cell, and
asymmetric silhouettes that taper.

## Connect

PhotoCraft ships `photocraft-cli`. `photocraft-cli mcp` runs an MCP server on
stdio with a headless engine. The read and write roots are the only folders it
may touch. An omitted root denies that direction.

Register it once (Claude Code, user scope):

```sh
claude mcp add photocraft --scope user -- "<install dir>/photocraft-cli.exe" mcp --automation-read-root "<work dir>" --automation-write-root "<work dir>"
```

Start a new session to load the `mcp__photocraft__*` tools. Until then, or in a
client without them, `scripts/photocraft/mcp-client.mjs` speaks the same
protocol over stdio:

```sh
PHOTOCRAFT_CLI="<install dir>/photocraft-cli.exe" node SKILL_DIR/scripts/photocraft/mcp-client.mjs "<work dir>" -list
```

On Windows the installer may not add the CLI to `PATH`. The uninstall entry
can omit `InstallLocation`. Ask the user for the folder, or resolve it from the
MSI component paths. `ui_*` and `control_call` tools need bridge mode, which
means the desktop app running with `--control <port>`. Headless drawing does
not need them.

## Commands that matter

Tools: `doc_new`, `command_run`, `command_batch`, `doc_inspect`,
`render_preview`, `doc_save`, `doc_open`, `doc_place`, and `doc_close`.
`command_list` (or `photocraft-cli commands --json --filter <text>`) prints
each command's parameter string. Read it before using a command for the first
time.

- `doc_new {width: 1024, height: 1024, background: "transparent"}`.
- `shape.create {kind: "path", fill: "#ffffff", stroke: null, path: {subpaths: [{closed: true, op, knots: [[x, y], ...]}], fillRule}}`.
  `op` is `combine`, `subtract`, `intersect`, or `exclude`, applied in order.
  Use `subtract` subpaths to cut rips out of a body.
- **A path holds at most 4096 knots and subpaths.** Create one shape per frame,
  then `layer.mergeVisible` to make one pixel layer.
- `filter.blur.gaussianBlur {radius}` acts on the active pixel layer. Merge or
  rasterize before you blur.
- `layer.setProps {opacity: 0..1}` sets the layer's opacity. Export bakes it
  into the PNG alpha.
- `doc_save {path: "dir/name.png"}` exports by extension, relative to the
  write root. Create the folder first.
- `document.pixel {x, y}` returns the composite RGBA in 0..1. Use it for a
  quick check.
- Dark preview: export first. Then add `layer.newFillLayer.solidColor
  {color: "#14141c"}`, run `layer.arrange.sendToBack`, and call
  `render_preview {max_side: 1024}`. The exported PNG stays transparent.
  `render_preview` returns the image, so read it.

## Procedural layers from polygon points

Use this path for drawn matter that needs frame-to-frame coherence: slashes,
claws, crescents, shards, and streaks. `scripts/photocraft/slash-gen.mjs` is a
worked example. It writes a steps file that `mcp-client.mjs` runs:

```sh
node SKILL_DIR/scripts/photocraft/slash-gen.mjs steps.json vfx_output/sword_slash
PREVIEW_DIR=<preview dir> PHOTOCRAFT_CLI=... node SKILL_DIR/scripts/photocraft/mcp-client.mjs "<work dir>" steps.json
```

It draws four white sheets of a sword slash. Frames 1–4 grow, frames 5–8 hold
at the peak, and frames 9–16 break into shards:

| File | Content | Opacity |
| --- | --- | --- |
| `slash_hot_core.png` | Slim blade inside the head, offset toward the outer rim. | 100% |
| `slash_body.png` | Main body with torn edges, inner rips, and break-apart shards. | 80% |
| `slash_rim.png` | Hairline band on the clean front arc of the outer edge. | 95% |
| `slash_glow.png` | Body and core merged, with Gaussian Blur radius 5. | 55% |

Geometry rules, learned by drawing and reviewing the sheets:

- **No symmetric crescent.** Run the centerline on a tilted, squashed spiral.
  The radius opens toward the head and the tip hooks slightly outward. Split
  the width unevenly across the centerline, for example 62% outside and 38%
  inside.
- **Thick head, long needle tail.** A width profile of the form
  `x^A · e^{A(1−x)}` rises from the tail to a peak near 76% of the length.
- **Both ends taper to a point.** After the peak, the width falls along a
  straight-sided wedge, `(1 − y^1.5)^1.15`, which is linear at the tip. A
  `(1−v)^b` falloff with b below 1 leaves a rounded nose. On short arcs, such
  as the first grow frames, keep the wedge at least about 44 px long or the
  head reads as cut flat.
- **Torn edges follow the flow.** Put each tooth's tip behind its base, toward
  the tail, and outside the edge. A depth of about `1.5 + 0.32 × width` with a
  back offset several times longer rakes the tooth along the swing. A deeper
  tooth sticks out like a hair. Follow some teeth with a small bite into the
  body. Keep the front arc smooth where the rim runs.
- **Inner rips** are thin slivers cut with `subtract`. Keep them out of the
  core band and only where the body is at least about 6 px wide.
- **Shards** are slivers with the same needle-to-wedge profile, so both ends
  are pointed. Short slivers drawn with a sine profile read as dots. Spread
  shards along the length in staggered lanes. Shards that share a range of the
  length read as parallel bars. Each shard thins faster than it shortens, and
  drifts forward with the swing at its own speed.
- Fix tooth, rip, and shard sites in the global length parameter with a
  seeded random number generator. They then stay put from frame to frame
  instead of flickering.
- Fit every frame of every layer into one safe box per cell, with one shared
  scale. The example uses a 30 px inset, which leaves room for the glow blur.

## Generated layers from Codex, fixed in PhotoCraft

Use this path when the look matters more than exact frame-to-frame geometry:
painterly smoke, fire tongues, magic wisps, or a style the user supplies as a
reference. Follow [Generated textures from a mockup](vfx-textures.md#generated-textures-from-a-mockup).
Generate one layer at a time with the Codex CLI. The `gpt-image` skill wraps
this when it is installed. Describe each layer in the prompt: white on
transparent, its role (core, body, rim, or glow), the shape and edge, its
orientation, and the empty padding.

Then open each result with `doc_open`, from the read root, and fix it in
PhotoCraft before it becomes a sheet:

- **Force white.** Apply `layer.layerStyle.colorOverlay {color: "#ffffff"}`,
  then flatten on export. Keep the alpha as the shape.
- **Crisp drawn matter.** Generated edges are often soft or haloed. Threshold
  the alpha, or redraw the silhouette as a path over the image and keep that.
- **Assemble the grid.** Use `doc_place` (`scale`, `fit`, `center`) to put each
  frame inside its 256 px cell with the margin.
- **Glow.** Duplicate the core and body, blur them, and set the opacity, as in
  the procedural path.

This path has not been run end to end yet. Check each command's parameters with
`command_list` before relying on it, and expect to correct the frames by hand.

Choose by case. Procedural shapes give exact tapers, coherent frames, and
guaranteed margins. Generated shapes give texture and style but need cleanup.
They can be mixed: generate a textured body, and draw the core, rim, and
shards procedurally on top.

## Check before delivering

1. `node SKILL_DIR/scripts/photocraft/sheet-verify.mjs <dir> 4` checks every
   PNG in the folder. It confirms 1024 × 1024 and white-only colour, and
   reports the empty margin and coverage of each cell. Any pixel with alpha
   above 0 counts, including blur tails. It exits 1 on a failure. Empty
   trailing cells of a layer that fades early can be intentional.
2. `node SKILL_DIR/scripts/photocraft/sheet-review.mjs <dir> review.png 1,3,6`
   renders chosen frames at 2× with a sample tint, plus the body alone with
   red cell borders. Read it, and fix anything that is blunt, symmetric, hairy,
   or stacked.
3. Copy each sheet as `<name>.flipbook.png` and run
   `node SKILL_DIR/scripts/texture-tool.mjs check <dir>`. It checks the grid
   and cut-off frames and prints the ParticleEmitter settings.
4. Preview in Studio without uploading: `texture-tool.mjs preview <dir>`
   prints `rbxasset://textures/vfx-preview/...` addresses. Put the sheets on
   stacked ParticleEmitters with `Rate = 0`, `Grid4x4`, `OneShot`, and
   `ZOffset` ordering glow < body < rim < core, then `Emit(1)`. Those
   addresses work only on the computer that made them, so upload the sheets
   before shipping.
