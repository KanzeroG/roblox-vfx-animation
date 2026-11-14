# Engine traps

Each trap below was measured in Roblox Studio (Edit mode, an unsaved test
place, 2026-11-14) unless it says otherwise. The list started from the traps
another skill set reports (rxz VFX + SFX and rxz Animation + Cutscenes, by
1nird). Only the ones that reproduced here are written as rules. The ones that
did not reproduce are listed at the end, so nobody adds them back without
measuring again.

## VFX

- **`rbxasset://textures/smoke.png` loads nothing.** `ContentProvider:PreloadAsync`
  returns `AssetFetchStatus.Failure` for it. The particle textures under
  `rbxasset://textures/particles/`, such as `smoke_main.dds` and
  `sparkles_main.dds`, load with `Success`. Preload a built-in path once before
  you rely on it.
- **An Attachment under a Model or Folder sits at the world origin.** Its
  `WorldPosition` equals its own `Position` (an Attachment at `5, 5, 5` reports
  `5, 5, 5`), whatever the model's pivot is. Parent every Attachment that an
  emitter, beam or trail uses to a BasePart. Under a part at `10, 0, 0`, the
  same Attachment reports `15, 5, 5`.
- **A script's `Source` must be under 200,000 characters.** Setting it to
  250,000 characters fails with `Unable to assign property Source. Provided
  string length (250000) is greater than or equal to max length (200000)`.
  This limits a generated module, such as a recipe table baked into Luau. Keep
  recipes as JSON for `build.lua`, and split a module before it reaches the
  limit.
- **Read an emitter by naming its properties.** A generic property dump can
  leave out most of a ParticleEmitter. `scripts/inspect-pack.luau recipe` lists
  every property it carries, per class. To copy an effect, use that list or
  `extract`, not a dump. (Reported by rxz for a Studio MCP property reader. Not
  measured here.)
- **Tint multiplies.** `VFX.play(..., { tint = ... })` in
  `templates/vfx/emit.lua` multiplies each authored colour. It recolours a white
  texture and only darkens a texture that already has colour. This is why the
  skill draws white layers ([vfx-photocraft.md](vfx-photocraft.md)).

## Animation

- **Legacy `Cubic` easing runs backwards. `CubicV2` does not.** Sampled at a
  quarter of the way through a 0°–90° pose pair, as a fraction of the turn:

  | Style | In | Out |
  | --- | --- | --- |
  | Linear | 0.25 | 0.25 |
  | Cubic | 0.6 | 0.0 |
  | CubicV2 | 0.0 | 0.6 |

  `CubicV2` `In` starts slow and `Out` starts fast, as the names say. Use
  `CubicV2`. `scripts/animate.mjs` models the reversal for legacy `Cubic` only.
  Do not swap `In` and `Out` for any other style.
- **Pose a rig in Edit mode with the animator, not by hand.** Register the
  KeyframeSequence (`AnimationClipProvider:RegisterAnimationClip`), load it,
  `Play(0)`, `AdjustSpeed(0)`, set `TimePosition`, then call
  `Animator:StepAnimations(0)`. The rig's `Motor6D.Transform` then holds that
  frame. Wait until `track.Length > 0` before you set `TimePosition`.
- **A full-body track at a high priority hides the default walk.** Priority
  wins per joint ([full.md](full.md#2-priorities-and-markers)). An idle at
  `Action` that keys the legs stops the default `Animate` walk from showing on
  those legs. Key only the joints the idle needs, or play it at `Idle`. (From
  the documented priority rules. Not measured here.)

## Studio MCP

- **Send a large module over localhost.** `HttpService:GetAsync` inside
  `execute_luau` can read `http://127.0.0.1:<port>/` in Edit mode. Serve a
  folder with `python -m http.server 8765 --bind 127.0.0.1`, read the file with
  `GetAsync`, and set it as a ModuleScript's `Source`. This avoids pasting a
  10–20 KB module into one call. Bind to `127.0.0.1` only, serve a folder that
  holds only those files, and stop the server when you are done.

## Reported elsewhere, not reproduced here

- A `print` after a yield in `execute_luau` still reached the console.
- `workspace.CurrentCamera.CFrame`, set in Edit mode, still held the new value
  0.5 s later.

These two can still depend on the MCP build or on whether the Studio window has
focus. When a print or a camera move seems to vanish, check the console or read
the camera back before you assume this list is wrong.
