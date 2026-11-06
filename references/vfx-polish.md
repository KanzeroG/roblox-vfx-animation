# Polish pass for Roblox VFX

Read this when the effect needs a strong silhouette, a clear direction of motion, or a second visual pass. Use `vfx-design.md` for layer design and `vfx-craft.md` for engine settings and capture.

## Plan the read before building

- Sketch the silhouette at the distance the player will see it. Pick one dominant mass and one direction for the eye to follow. Mark the hottest accent, the saturated body, and the dark shapes that separate the two.
- Assign each layer a job. Build the silhouette with a small set of layers first, then add detail where a capture shows a gap. Reduce overlapping glow and broad translucent layers if they obscure the edge or flatten the value range.
- Keep a short timing map. Give each beat a start, peak, and exit. The eye should be able to follow a bright accent through the effect without tracking every layer at once.

## Impacts

- Start with a sharp flash around 0.05–0.13 s, then reveal a saturated body behind it. Offset the pressure wave and the debris by a few frames. Let low-value smoke finish last. Adjust the timings to the move's scale and read from the player's distance.
- Give the body volume above the ground. Use a few torn, offset plumes or crescents with different heights, pitches, and directions, plus a pressure wave near the floor. If the silhouette resembles a fountain, break the evenly spaced arches and vary how far each plume travels. Shape variation does more than adding another row of particles.
- Use a broad tinted wave with a fine bright edge and dark underlay. Give the edge gaps or tapered sections and keep some variation in radius or tilt. If the effect looks like concentric outlines, subordinate the secondary ring and spend that contrast on the plume or fractures.
- Keep the blast readable after the flash. If the post-flash body turns into a white blob, lower the bright layer's overlap, lifetime, or additive blend. Preserve a saturated edge and use shaded wisps to recover the silhouette. Check brightness against the target place's bloom.
- Separate the traveling source and the impact when the requested deliverable is an impact asset. Use a standalone origin and timeline. Keep damage, terrain changes, and camera effects out of visual previews unless the user requests them.

## Sustained energy and projectile wakes

- Make energy travel through the shape. Rotate layers at different speeds or axes, deform the bands, and move highlights along the bands and toward the end of the wake. Vary phase and lifetime so the lines feel driven by the same motion without moving in lockstep.
- A scrolling beam needs variation along its texture length. A uniform strip can soften the edges but will look stationary as it scrolls. When geometry is textureless, animate a short tapered highlight along the curve.
- Keep enough contrast for the trail to read against a bright floor. Use a narrow hot filament, a broader colored stream, and a softer dark wake with staggered lifetimes. Preserve the center's silhouette from front, side, and approach angles.

## Visual pass

1. Hold 4–6 meaningful frames and inspect both a detail view and the intended viewing angle. For an impact, capture the flash, body, pressure front, smoke, and a frame after the fade. Use the early, full, and fading wake for a projectile.
2. Name the main issue visible at each distance and change the responsible layer. Tune silhouette, then values, then timing, then secondary detail. Run the result at full speed in the requested preview mode and check that the first read survives motion.
3. Verify the fade, repeat behavior if provided, and cleanup. If a screenshot is unavailable or blank, distinguish the behavior verified through Studio state from the visual review still missing.
