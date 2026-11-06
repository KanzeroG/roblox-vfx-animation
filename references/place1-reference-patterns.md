# Archived team VFX patterns

These observations preserve the team's blue, Explosion1, and MainExplosion references for use from the skill folder. Measurements describe the historical examples and depend on scene bloom, camera distance, and textures.

## `blue` for a sustained orb

- One Attachment carries nine enabled emitters and two point lights. The long-lived contrast layers last 3 s, while the plasma layers recycle every 1 s.
- The flat layers use `VelocityPerpendicular`, `LockedToPart`, and very small positive speeds (about 0.0014 to 0.086 studs/s). This fixes the planes around their anchor while preserving the direction needed by that orientation mode.
- Small, deliberate `ZOffset` steps separate the dark silhouette from the additive accents. The rotating plasma layer uses `RotSpeed` from -50 to +75 deg/s while several companion layers hold still. Offset the timing and rotation so the layers read as separate flows.

## `Explosion1` for wind and flowing lines

See the [Explosion1 archive](explosion-patterns/README.md#explosion1-for-layered-movement-and-contrast) for dark underlays, wind speeds, and the flash-to-body handoff.

## `MainExplosion` for accents that read

See the [MainExplosion archive](explosion-patterns/README.md#mainexplosion-for-a-compact-burst) for burst counts, staggered flares, and the smoke fade.

## Hollow Purple for moving wind and intermittent lightning

See the [local Hollow Purple archive](hollow-purple/README.md) for the projectile layers, release handoff, and measured settings.

## Workspace preview in Studio Edit mode

- When asked for a Workspace example like `blue`, leave one clearly named Attachment or anchored model that the artist can inspect in Explorer. Use enabled native emitters and Beams with `TextureSpeed` and visible variation along the texture's length. Confirm movement in Edit mode without entering Play.
- When a procedural effect needs a session-only editor update loop, disconnect it if the preview is removed or Studio starts running. Leave a useful pose and native motion in the saved model so it is visible when reopened. Keep any runtime projectile code separate from the preview.
- These references contain custom textures. For an asset-independent deliverable, reproduce their roles with procedural curves and verified engine-bundled textures. Inspect existing reference assets without changing or running their scripts.
