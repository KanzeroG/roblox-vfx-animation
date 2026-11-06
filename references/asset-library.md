# Use a project VFX library

Use this when an effect must follow an image reference and the project has a VFX gallery or a collection of prefabs.

The bundled [VFX Pack](../assets/VFX-Pack-KanzeroGaming.rbxm) works as a source gallery for any Roblox project. Read it when the request gives a reference and asks you to build the effect. Inspect a project-specific library first when the user names one.

## Find and extract a layer

Import the pack into a test place using **Explorer → Insert → Import Roblox Model** and inspect the relevant parts in Studio. Alternatively, use [Lune](https://lune-org.github.io/docs/) to search and extract from the model file without opening it in Studio. Run these commands from the skill folder.

~~~sh
lune run scripts/inspect-pack.luau search assets/VFX-Pack-KanzeroGaming.rbxm "ice spike"
lune run scripts/inspect-pack.luau search assets/VFX-Pack-KanzeroGaming.rbxm "gigchain beam"
lune run scripts/inspect-pack.luau search assets/VFX-Pack-KanzeroGaming.rbxm "basichit particle"
~~~

The search shows each object's class, size for parts, and the image URI where present. For the long pointed ice example, inspect **VFXPack → ice spike\ → Model → Meshes/iceSpikesSav_Cone.002**. Its bounds are about **1.50 × 8.66 × 2.09 studs**. Preview it from more than one angle and align its long axis with the direction of the effect. Choose a broader piece if the reference calls for an ice wall.

Pass the selector returned by search to extract a single model. The example selector below matches the slim ice spike in the bundled file. Search again if the file changes.

~~~sh
lune run scripts/inspect-pack.luau extract assets/VFX-Pack-KanzeroGaming.rbxm 1/122/20/10 IceSpike.rbxm
~~~

When a selected Beam or Trail has sibling endpoints, extraction picks a parent containing both attachments and checks the links after serialization. A standalone emitter can be placed under an Attachment or BasePart in the destination.

## Apply the selected assets

1. Break the image into roles such as silhouette, underlay, core, directional streak, and residue. Select the smallest set of parts, meshes, beams, or emitters that can reproduce those roles. Compare each candidate's shape at the intended gameplay distance.
2. Treat the gallery as a source collection. Inspect it read-only and work in the explicitly named destination place. Import or copy the selected layers there when the user asks you to build the effect. Match their scale, color, orientation, and timing to the reference and the game's visual style.
3. Review embedded scripts and dependencies before moving a prefab into a game. Extract visual instances and use the destination project's effect player for emission and cleanup. Keep unrelated camera, Lighting, and gameplay behavior out of the port.
4. Preserve Asset IDs and verify that required textures, meshes, and audio load in the destination experience. Keep source art and permission records in the project library. Publish or share assets according to their license and ownership.
5. If the library lacks a texture, use the [mockup and texture workflow](vfx-textures.md#generated-textures-from-a-mockup). For ground impacts, use the [ground-matched rocks reference](vfx-ground-rocks.md) alongside the chosen effect.
