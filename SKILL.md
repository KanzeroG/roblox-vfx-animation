---
name: roblox-vfx-animation
description: Use for any Roblox visual effect or animation work through a Roblox Studio MCP - particles, beams, trails, slashes, hits, explosions, spells, auras, abilities, combat effects, camera shake, VFX textures and flipbooks, and R15/R6/creature animations (attacks, idles, walks, runs). Load before building or tuning any effect or animation, even a small one.
---

# Roblox VFX and animation

Works with a stock Roblox Studio MCP plus a shell. The references record what
experienced Roblox VFX artists do, measured from about 5,000 particle emitters
in published effects.

**Read `references/tools.md` first, every time.** The references name tools from
the original toolkit (`build_instances`, `capture_moments`, the `animation` and
`blender` tools, `upload_assets`). `tools.md` maps each one to the Studio MCP
and this skill's scripts. This folder is `SKILL_DIR` in `tools.md`.

## VFX workflow

Follow these steps for every effect: a hit, slash, explosion, spell, aura, or
pickup.

1. **Brief.** Settle what the effect is for, where it plays (a gameplay event
   or an Edit-mode preview), the viewing distance, and the reference images.
   Check the place's lighting. Load [vfx-design.md](references/vfx-design.md)
   and [vfx-craft.md](references/vfx-craft.md).
2. **Plan the layers.** Break the effect, or its reference, into roles in the
   order they appear: anticipation, flash or core, body, rim, glow, debris,
   residue. Give each role its timing and budget. Keep silhouettes asymmetric,
   with tapers.
3. **Source each layer**, cheapest first:
   - **The VFX Pack or a project library.** Search
     `assets/VFX-Pack-KanzeroGaming.rbxm` or the project's pack for meshes,
     emitters, beams, and trails ([asset-library.md](references/asset-library.md)).
   - **Its own sprites or flipbook.** If a PhotoCraft MCP (`mcp__photocraft__*`)
     or `photocraft-cli` is available, use [vfx-photocraft.md](references/vfx-photocraft.md).
     Draw white layers from polygon points, or generate a layer with Codex and
     clean it in PhotoCraft. Otherwise draw with Blender and numpy, or generate
     from a mockup ([vfx-textures.md](references/vfx-textures.md)). For a lit
     volume, render a flipbook from a 3D scene
     ([vfx-rendered-flipbooks.md](references/vfx-rendered-flipbooks.md)).
   - **Meshes** such as crescents, rings, swirls, and domes:
     [vfx-mesh-shapes.md](references/vfx-mesh-shapes.md).
4. **Build in Studio.** Install the emit module (`templates/vfx/emit.lua`) and
   build the instances with `templates/vfx/build.lua`. Load the topics the
   effect needs:
   - [vfx-motion.md](references/vfx-motion.md) for projectiles, trails, beams,
     slashes, dashes, orbs, and auras;
   - [vfx-camera-world.md](references/vfx-camera-world.md) for camera shake,
     FOV, impact frames, lights, craters, and cast poses;
   - [vfx-ground-rocks.md](references/vfx-ground-rocks.md) for debris that
     matches the surface;
   - measured archives: [Hollow Purple](references/hollow-purple/README.md),
     [Explosion](references/explosion-patterns/README.md),
     [Lightning](references/lightning-sequence.md), and
     [team patterns](references/place1-reference-patterns.md).
5. **Review.** Hold 4–6 meaningful moments with `templates/vfx/capture.lua`.
   Screenshot them from close up and from the viewing distance, then check
   full-speed timing ([vfx-polish.md](references/vfx-polish.md)). When matching
   a reference, compare at most twice, then fix what the comparison shows most
   clearly.
6. **Deliver.** Leave a [Workspace Edit-mode preview](references/tools.md#workspace-preview-in-studio-edit-mode),
   or wire the effect into the project's VFX entry point and test it in the
   mode it runs in. Upload only settled textures, meshes, and animations.
   Every upload is permanent and moderated, so say how many you will upload
   first. Report the preview mode, the checks you completed, how to replay
   the effect, and what is approximated. Roblox has no custom shaders, so
   distortion, heat haze, and refraction can only be approximated.

Rules for every effect:
- A burst `ParticleEmitter` has `Rate = 0` and fires through the emit module
  (`EmitCount`, `EmitDelay`).
- Effects are presentation. The server fires an `UnreliableRemoteEvent` with
  the effect's name and a CFrame, and each client calls `VFX.play`. Damage
  never waits on an effect.

## Animation workflow

1. Check which rig the place's players use (R15 or R6). Load
   [character-animation.md](references/character-animation.md). For a creature
   or any non-stock model, also load
   [creature-animation.md](references/creature-animation.md), read its rig with
   `scripts/read_rig.lua`, and pass `--rig-json`.
2. Write the pose JSON from the closest recipe. Run `scripts/animate.mjs` with
   `--sheet`, look at the sheet, and fix it until every check passes.
3. Send the Luau it writes with `execute_luau`, and preview the animation on a
   dummy.
4. Load tracks through an `Animator` on a `Humanoid` or `AnimationController`,
   and set `AnimationTrack.Priority` deliberately. Fire gameplay cues, such as
   a hit landing, and the attack's effect from `GetMarkerReachedSignal()` on a
   keyframe's `markers`. A keyframe's `name` is not a marker. Playback details:
   [full.md](references/full.md).

## Files

| Path | What it is |
| --- | --- |
| `references/` | The topic guides linked above, plus `tools.md`. |
| `templates/vfx/` | `emit.lua` (`VFX.play`, `VFX.emit`, slow-mo, hitstop), `build.lua` (instances from JSON steps), `capture.lua` (holds moments for screenshots). |
| `scripts/animate.mjs` | Pose compiler, motion checks, contact sheet, and Luau output (Node 18+). |
| `scripts/read_rig.lua` | Reads a creature's rig for `animate.mjs --rig-json`. |
| `scripts/blender_job.py`, `scripts/vfx_blender.py` | Run a Blender job with the `fx.*` texture and mesh helpers. |
| `scripts/photocraft/` | PhotoCraft MCP stdio client, sword-slash layer generator, sheet margin verifier, and review render. |
| `scripts/texture-tool.mjs` | Checks flipbook sheets, and previews textures in Studio without uploading. |
| `scripts/upload.mjs` | Open Cloud uploads of textures, meshes, and animations. |
| `scripts/inspect-pack.luau` | Searches the VFX Pack and extracts one model, with Lune (pinned in `aftman.toml`). |
| `assets/VFX-Pack-KanzeroGaming.rbxm` | The bundled VFX Pack of emitters, meshes, beams, and trails. |
