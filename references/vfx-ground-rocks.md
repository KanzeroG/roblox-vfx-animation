# Ground-matched rock effects

Use this reference for craters, slams, landing debris, and ground trails. Keep the effect separate from damage and terrain editing.

## Archived Hollow Purple reference

The reference implementation splits surface sampling, crater slabs, flying debris, and the ground trail into separate modules. See the [Hollow Purple archive](hollow-purple/README.md) for the release handoff and other visual layers.

- `GroundProbe` excludes character models and its own effects folder from raycasts. Its appearance result is a color and a material. For a part it reads `Color` and `Material`. For Terrain it uses the hit's `Material` with `Terrain:GetMaterialColor(material)`.
- `CraterEffect` aligns its ring plane to the center hit normal and casts again at individual slabs. Mixed surfaces can therefore yield different rocks in the same ring. It adds small shade variation, sometimes turns grass into exposed soil, raises the slabs, and later sinks and fades them.
- `DebrisEffect` gives flying chips the sampled source color and material. `GroundTrailEffect` samples the left, right, and center at distance intervals. The two side rocks use the ground look. The center scorch uses a deliberately dark tint and Ground material.
- The server signals the crater and tags the moving projectile. The client spawns the cosmetic parts. The trail has a distance gate, a per-frame slice cap, and a timeout.

## Surface appearance contract

- Take the hit position and normal from the raycast. Sample each large slab near its final contact point when slopes, steps, or material boundaries matter. Skip missing samples at ledges and airborne impacts, or keep a smaller generic puff when the design needs it.
- `Material` and `Color` make a new primitive resemble the ground using Roblox's material appearance. The archived probe transfers those two fields. Use the same `BasePart.MaterialVariant` when a compatible tiling variant must match. A `SurfaceAppearance` or mesh texture depends on the source mesh's UVs. A `Texture` or `Decal` is assigned to a face. Use an authored mapping or an approximate material on the rock for those cases.
- Use the Terrain hit's material and the terrain material tint. Skip water when sampling solid ground. `GetMaterialColor` rejects Air and Water. Terrain-specific blending and detail maps may still render differently on parts.
- Verify two materials across a seam, a slope, Terrain, a missing hit, and cleanup after repeated use. Inspect ground rocks from the player's camera and under the map lighting.

[Roblox raycasting](https://create.roblox.com/docs/workspace/raycasting) · [Terrain material tint](https://create.roblox.com/docs/reference/engine/classes/Terrain#GetMaterialColor) · [Roblox materials and PBR mapping](https://create.roblox.com/docs/parts/materials)

## Reuse the pattern

- Use client-side cosmetics, short lifetimes, and anchored or scripted trajectories by default. Keep ordinary visual rocks non-colliding and out of queries. Add real physics only when it changes the look materially. The archived example uses deprecated body movers for flying debris. Prefer current APIs or simple scripted motion in a new implementation.
- For a moving trail, emit by distance and preserve the distance remainder across frames so spacing stays steady at different frame rates. Cap catch-up and active pieces, cull by distance, and stop when the source disappears. Reuse the project's pool for frequent effects and reset the previous color, material variant, and trail history on reuse.
- Start with the archived shape and timing ideas. Treat its scale, long rock lifetimes, and sound or texture assets as scene-specific.

## External references

- LxckyDev's Rock Module V1.0 is a close public comparison for crater rings, radial debris, and per-rock sampling. It copies part color, material, and transparency. Its author lists Terrain as unsupported, so use the archived probe as the better reference for mixed Part and Terrain maps. [Published source on Roblox DevForum](https://devforum.roblox.com/t/rock-module-v10-craters-explosions-and-more-effects/3041562)
- Pyseph's ObjectCache is a reusable part and model pool for frequent debris. It provides allocation and reuse primitives. The effect still needs a surface probe and its own shape, timing, and cleanup policy. [GitHub source](https://github.com/Pyseph/ObjectCache) · [Wally registry entry](https://github.com/UpliftGames/wally-index/blob/main/pyseph/objectcache)
