# Hollow Purple VFX archive

Use this local reference when designing sustained orbs, fast projectile wind, lightning accents, or ground reactions. The measurements and examples can be used on their own.

## Read the effect in layers

- **Silhouette.** Two camera-facing outlines counter-rotate at approximately +455 and -455 deg/s. Both live for 0.4 s and emit around 20 per second. A darker power layer, a saturated body, and a glow give the bright edges room to read.
- **Wind.** One `VelocityPerpendicular` wind emitter runs at 45 particles/s with a 0.25 s lifetime and spin randomized from -655 to +655 deg/s. That is roughly 11 live sprites at steady state before engine limits. Replacing a fading sprite while the previous one is still visible keeps motion continuous. Other wind layers combine solid and additive strokes.
- **Lightning.** Four layers have roughly 0.35–0.60 s lifetimes, lower rates than the main wind, and different depth offsets. Most face the camera, with one oriented in the effect plane. The intermittent flashes read as accents over the continuous swirl.
- **Movement.** The separate Purple Trail has a lifetime of approximately 0.35 s. The short history gives direction while preserving the head's silhouette. For geometry-driven variants, move highlights along the wake as well as rotating the head bands.
- **Fade.** The archived projectile contains 34 emitters. The sample includes rate, lifetime, rotation, brightness, and the first size and transparency keys. Use the minimum set that preserves the visual beats at game scale. [Measured particle properties](particle-samples.json)

## Coordinate the handoff

The inspected cast code uses release to trigger the crater near the caster, fade the previous point light over 0.1 s, and switch off the preceding emitters. It then parents the fired projectile and starts the ground trail on that projectile. Start the new focal point at release, retire the previous one promptly, and make traveling, ground-following, and impact layers separately callable.

For a projectile-only request, start at the moving visual. For a ground-impact-only request, begin at the contact point and sample the surface there. The crater in this particular reference triggers at release. [Ground-matched crater and debris patterns](../vfx-ground-rocks.md)

## Rebuild from the observations

1. Make the dark body and readable outline, then add wind with slightly offset spin, opacity, and lifetime. Verify continuity at game speed from near the camera and from the approach angle.
2. Add a small set of intermittent bolts at different depths and keep a short directional trail. Tint the visual in-engine using white or neutral sprites when recoloring is useful.
3. For a custom sprite, make a visual mockup first, then follow the texture generation and Studio preview workflow. [Custom sprite workflow](../vfx-textures.md#generated-textures-from-a-mockup)

The archive is a design and tuning reference. Exact visual reconstruction would also need the original textures and full curves.
