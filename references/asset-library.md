# Use a project VFX library

Use this when an effect must follow an image reference and the project has a VFX gallery or a collection of prefabs.

1. Break the image into roles such as silhouette, underlay, core, directional streak, and residue. Select the smallest set of parts, meshes, beams, or emitters that can reproduce those roles. Compare each candidate's shape at the intended gameplay distance.
2. Treat the gallery as a source collection. Inspect it read-only and work in the explicitly named destination place. Save reusable selections as named `.rbxm` prefabs. For a Beam or Trail, include both of its Attachment endpoints and verify that the links survive import.
3. Review embedded scripts and dependencies before moving a prefab into a game. Extract visual instances and use the destination project's effect player for emission and cleanup. Keep unrelated camera, Lighting, and gameplay behavior out of the port.
4. Preserve Asset IDs and verify that required textures, meshes, and audio load in the destination experience. Keep source art and permission records in the project library. Publish or share assets according to their license and ownership.
5. If the library lacks a texture, use the [mockup and texture workflow](vfx-textures.md#generated-textures-from-a-mockup). For ground impacts, use the [ground-matched rocks reference](vfx-ground-rocks.md) alongside the chosen effect.
