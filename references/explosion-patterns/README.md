# Explosion1 and MainExplosion VFX archive

Use these references to plan the visual hierarchy and timing of an impact. Values come from archived property reads. Judge the result against the target place's bloom and gameplay camera. [Emitter samples](emitter-samples.json)

## Explosion1 for layered movement and contrast

- **Build the dark structure first.** A sampled `Underlay2` sits at `ZOffset = -3` with Brightness 0 and a 2 s lifetime. Nearby crack, swirl, and shadow layers make space for hot stars and rings. One sampled ring has Brightness 55. Some layers go higher, so treat these as reference measurements and tune bright accents in the target scene.
- **Give the wind a direction.** Sampled curved Beams have `TextureSpeed` values of 3, 6, and 8. A solid Trail with `LightEmission = 0` and two additive Trails with `LightEmission = 1` are sampled at 0.5–0.6 s lifetimes. A useful combination is a dark stroke for weight, a saturated moving layer for direction, and a thin hot edge for separation.
- **Keep flash and mass on separate clocks.** Sampled `Rays2` and `Glow` live 0.1–0.2 s, while several rings and bursts live 1–1.5 s. The highlight can clear quickly while the impact retains an outline.
- **Inventory context.** The model contains 561 ParticleEmitters, 6 Beams, and 4 Trails. The archive contains 42 emitter samples. The inventory alone gives no measure of what plays simultaneously or what the effect costs in a game.

## MainExplosion for a compact burst

- **Use a quick flash and a short offset.** `Flares8` has a 0.10 s lifetime and its size falls from 15 to 0. Two other flare emitters have an authored delay of 0.02 s. Short offsets create a second readable accent inside the same hit.
- **Break up the fast particles.** `Flares1` sends longer streaks outward with a sampled speed of 90–180 studs/s and a lifetime of 0.65–1.3 s. Some stars put zero-size keys between larger sizes, so a spark can blink as it travels.
- **Let darker shapes carry the finish.** The smoke layers grow from 3 to about 17 studs and last 1.2–2.4 s in the sampled cut-smoke pair. Low-brightness crescents last 1.2–1.8 s. Use the dark silhouette and slower fade to retain mass after the white flash clears.
- **Read the burst counts separately from Rate.** The 20 emitters were authored disabled and their `EmitCount` attributes sum to 134. That sum describes the template. Actual runtime emission and simultaneous visibility depend on its playback.

## Apply the two patterns together

1. Use MainExplosion's timing as a starting point. Flash, let fast fragments carry the direction of force, and leave lower-value smoke to finish.
2. Use Explosion1's moving layers where they clarify the shape. Pair a dark stroke with a flowing accent and give two adjacent lines different speeds or phase.
3. Check the flash, expanding body, and lingering smoke at gameplay distance. When the body disappears after the flash, strengthen its silhouette and value before adding emitters. [VFX polish guide](../vfx-polish.md)

The archive preserves measured properties and design observations. Exact reconstruction would also need the original textures, complete curves, and playback scripts.

## Long-form Explosion charge from the video reference

- The earliest runes appear around 0.7 s in the recording. The main release flash is around 12.3 s, giving roughly 11.6 s of visible charge. Hold the largest rune bright through most of the chant. Stack smaller counter-rotating circles along the vertical axis, then tighten and brighten the release.
- Separate the first contact flash from the large fire body. The video shows a small point of light before release, then a ground flash, then a taller fire crown. Build the crown and the floor ring with separate positions and timing. Keep the floor ring expanding after the crown rises, and cool both into lingering ash.
- The video shows a caster seal and a distant target stack. The tested Place1 adaptation puts all runes at the target per the user's preference. A 30-stud offset kept the effect close enough for the regular player camera. Let the requested targeting and staging override the reference composition.
- Additive blend made the original black-background rune strokes transparent around their edges. Saturated, less additive procedural rings provided the red-orange accents without showing the texture rectangles. Check imported sprites against both the sky and the ground.
