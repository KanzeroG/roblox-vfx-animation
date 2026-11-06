# Cloud-to-ground lightning sequence

Use this for a staged lightning cast with rotating clouds, a short charge, repeated strikes, and a clear finisher. The timings were read from the Lightning reference at 60 frames/s and verified in a client playtest.

## Author the timeline

| Beat | Time | Layer |
| --- | --- | --- |
| Buildup | 0–1.03 s | Rotate cloud layers at different rates. Fade in the local light, haze, and charge beams. |
| First contact | 1.03 s | Turn off charge emission, fire the strike beams, and emit an initial impact burst. |
| Pulse train | 1.03–2.83 s | Ten pulses spaced 0.20 s apart. Give each pulse a fast crest, a ground shockwave, and a brief fade. |
| Finisher | Last pulse | Use a distinct final burst and a short whiplash flipbook. |
| Aftermath | 4.70–9.70 s | Emit remaining particles and fade the clouds and local light. Remove the cast once the last layer has cleared. |

- Keep the brightest beam narrow enough for the lightning shape to read. Vary width, texture offset, and the top attachment's rotation across pulses. Decay the beam brightness and texture speed between hits so the next pulse reads.
- Pair the vertical strike with a lower expanding ring or blur stroke on each beat. Use a short-lived local PointLight when the ground needs a visible hit response. Keep cloud motion as a continuous layer around the staccato strikes.
- For a camera-free version, preserve the in-world clouds, charge, beams, and impact layers. Use local lights only. Check the charge and final pulse from the normal player camera.

## Port visual assets safely

- Read the original timeline and copy only visual instances needed by the requested effect. Rebind `Beam.Attachment0` and `Attachment1` to the new attachments when transferring between places. Verify mesh offsets, anchor transforms, and the ordered IDs of any decal flipbook.
- Check the actual client with `ContentProvider:PreloadAsync` when available. Pass mesh instances for mesh validation. An Edit-mode raw content ID check can report failures for assets that load in the client.
- Verify pulse count, separate input bindings, and cleanup. The reference assets may live in a disposable Studio place. This local guide preserves the timing and layer roles.
