# Use a project VFX library

Use this when an effect must follow an image reference and the project has a VFX gallery or a collection of prefabs.

The bundled [VFX Pack](../assets/VFX-Pack-KanzeroGaming.rbxm) works as a source gallery for any Roblox project. Read it when the request gives a reference and asks you to build the effect. Inspect a project-specific library first when the user names one.

## Find and extract a layer

Import the pack into a test place using **Explorer → Insert → Import Roblox Model** and inspect the relevant parts in Studio. Alternatively, use [Lune](https://lune-org.github.io/docs/) to search and extract from the model file without opening it in Studio. Run these commands from the skill folder. With [Aftman](https://github.com/LPGhatguy/aftman), run `aftman install` there first; `aftman.toml` pins the Lune version the script was tested with.

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

## Export a layer as a recipe

`recipe` writes the same selection as JSON steps for `templates/vfx/build.lua`, so you can read, diff and tune every emitter value as text and rebuild it in any place:

~~~sh
lune run scripts/inspect-pack.luau recipe assets/VFX-Pack-KanzeroGaming.rbxm 1/43 HealAoe.json
~~~

- Each class has a fixed property list, named property by property: Part, Attachment, ParticleEmitter, Beam, Trail and the three lights, plus number, string and boolean attributes. Other classes are skipped with their children, and the command lists them.
- The first part goes to the origin. Parts come back anchored and non-colliding.
- A MeshPart comes back as a plain Part that holds its emitters, beams and trails, because a script cannot set `MeshId`. Take the mesh itself with `extract`.
- Beam and Trail links become `link` steps.
- Build it with `Build.run("game.ReplicatedStorage.VFX.HealAoe", json)`, then play it with `VFX.play` and its `scale`, `tint` and `countScale` options ([tools.md](tools.md)).
- Pack emitters usually carry no `EmitCount` or `EmitDuration`, so `VFX.play` has nothing to fire. Before you play the effect, add those attributes in the JSON, and `Rate: 0` on burst layers.

Checked 2026-11-14: HealAoe (5 emitters) and a linked Beam rebuilt in Studio with every texture and both links in place.

## Apply the selected assets

1. Break the image into roles such as silhouette, underlay, core, directional streak, and residue. Select the smallest set of parts, meshes, beams, or emitters that can reproduce those roles. Compare each candidate's shape at the intended gameplay distance.
2. Treat the gallery as a source collection. Inspect it read-only and work in the explicitly named destination place. Import or copy the selected layers there when the user asks you to build the effect. Match their scale, color, orientation, and timing to the reference and the game's visual style.
3. Review embedded scripts and dependencies before moving a prefab into a game. Extract visual instances and use the destination project's effect player for emission and cleanup. Keep unrelated camera, Lighting, and gameplay behavior out of the port.
4. Preserve Asset IDs and verify that required textures, meshes, and audio load in the destination experience. Keep source art and permission records in the project library. Publish or share assets according to their license and ownership.
5. If the library lacks a texture, use the [mockup and texture workflow](vfx-textures.md#generated-textures-from-a-mockup). For ground impacts, use the [ground-matched rocks reference](vfx-ground-rocks.md) alongside the chosen effect.
