# Tools and setup

How to do each step of the skill with what you have:

- the **Roblox Studio MCP**: `execute_luau` to build and run code, `screen_capture`
  to look at the viewport, `get_console_output` for errors and prints,
  `start_stop_play` for playtests, `insert_asset` and `upload_image`;
- a **shell** to run this skill's Node and Python scripts;
- **Blender** on the command line or through a Blender MCP, for textures and
  mesh shapes, and **PhotoCraft** for flipbook layers (`vfx-photocraft.md`).

`SKILL_DIR` below means this skill's folder (where `SKILL.md` is). Use its
absolute path in commands.

When the user matches a reference video, ask for still frames or a contact
sheet and read them as images: no tool here reads a clip. When a step says to
look, read the PNGs and `screen_capture` results as images yourself.

## Workspace preview in Studio Edit mode

Use this path when the user asks to inspect the effect in Workspace without Play.

1. List connected Studios and match the explicitly named place. Bind every call to that Studio ID and verify the place name or ID and Edit state before writing. If the named place is closed, leave it closed unless opening it is part of the request. Treat reference models as read-only.
2. Put the effect under one named Attachment or anchored model with a stable origin and a meaningful pose. Keep separate effects as sibling assets. An Edit-mode showcase needs only its visual instances and any preview code it uses. Install shared runtime helpers when the effect actually depends on them.
3. Use enabled native emitters and scrolling textured Beams for continuous layers. For a staged burst, use an Edit-only preview driver with a single timed update, one burst per beat, and a gap before the loop repeats. Provide an explicit replay entry point and a held pose for inspection. Disconnect on removal, replacement, or Play. Clear previous particles when replaying, and reuse the same generated objects across loops.
4. Capture the authored beats with the viewport in Edit mode, and verify that the preview can replay without accumulating instances. If a capture is blank, confirm the viewport is focused and the camera is framed on the asset. If green editor guides obscure fine detail, check Studio's Constraint Details overlay before changing the effect itself.
5. Leave the requested model in Workspace and remove temporary capture helpers. Give the Explorer path, the replay command if there is one, and the expected behavior after reopening. Editor connections are session-local. A saved pose or native layers can remain visible, and a procedural loop needs to be started again.

## Installing the player, builder and capture modules

Once per place, check `ReplicatedStorage.VFX` for `Emit`, `Build` and
`Capture`. For each one missing, create a ModuleScript with that name there
and set its `Source` to the file's text. The simplest way with only
`execute_luau`: read the file from `SKILL_DIR/templates/vfx/` and send

```luau
local folder = game.ReplicatedStorage:FindFirstChild("VFX") or Instance.new("Folder")
folder.Name = "VFX"; folder.Parent = game.ReplicatedStorage
local m = folder:FindFirstChild("Emit") or Instance.new("ModuleScript")
m.Name = "Emit"
m.Source = [==[
<contents of emit.lua>
]==]
m.Parent = folder
return "installed " .. m:GetFullName()
```

(If the file contained `]==]`, pick a longer bracket level. If your MCP has a
script-writing tool such as `multi_edit`, it works as well.)

- `Emit` and `Capture` are needed for every effect; `Build` whenever you
  build from JSON steps.
- `require` in edit mode keeps a ModuleScript's first result for the whole
  Studio session. After changing a module, destroy it and create it again
  (new instance) before testing; otherwise the old code runs.
- Templates live in `ReplicatedStorage.VFX` as before. `Build.run` creates a
  missing root as a Model; for the folder itself, create the Folder first as
  above.

## Building an effect from the JSON examples

```luau
local Build = require(game.ReplicatedStorage.VFX.Build)
return Build.run("game.ReplicatedStorage.VFX.Slam", [==[
[
  { "op": "create", "className": "Part", "name": "Root", "id": "root",
    "properties": { "Anchored": true, "CanCollide": false, "CanQuery": false, "Transparency": 1, "Size": [1, 1, 1] } },
  { "op": "create", "className": "Attachment", "name": "Center", "parent": "$root", "id": "c" },
  { "op": "create", "className": "ParticleEmitter", "name": "Flash", "parent": "$c",
    "properties": { "Rate": 0, "Enabled": false, "Lifetime": [0.06, 0.1], "Speed": 0.001,
      "LightEmission": 1, "Brightness": 10, "ZOffset": 3, "Color": [1, 0.95, 0.85],
      "Size": [{ "time": 0, "value": 4 }, { "time": 1, "value": 18 }],
      "Transparency": [{ "time": 0, "value": 0 }, { "time": 1, "value": 1 }] },
    "attributes": { "EmitCount": 1, "EmitDelay": 0.14 } }
]
]==])
```

- Build a whole effect (or one beat of it) per call: every call re-reads the
  conversation, so fewer, larger calls are cheaper.
- A Beam or Trail is linked with `{"op": "link", "target": "$trail",
  "attachment0": "$a", "attachment1": "$b"}` in the same batch.
- The build is one undo step. A failed build is rolled back and the result
  names the step that failed.

## Checking an effect: the VFXCapture flow

`vfx-craft.md` section 6 says what to look for. This is how to see it:

1. **Aim and start** (one `execute_luau`):
   ```luau
   local VFX = require(game.ReplicatedStorage.VFX.Emit)
   local Capture = require(game.ReplicatedStorage.VFX.Capture)
   Capture.aim(workspace.SlamPreview, 30, 20)   -- close: target, distance, degrees above, yaw
   return Capture.start(VFX.play(game.ReplicatedStorage.VFX.Slam, CFrame.new(0, 3, 0)))
   ```
   For the player's view use `Capture.aimFromPlayer(casterPos, effectPos)`.
2. **For each moment, in rising order** (two calls each):
   - `execute_luau`: `return require(game.ReplicatedStorage.VFX.Capture).step(0.1)`
     returns `"<time reached>|done"` (or `stalled`: the effect ended; `capped`:
     ran out of time).
   - `screen_capture`, then look at it.

   Trails: `step(t, 0.04, false)` so the effect keeps creeping and the trail
   stays drawn.
3. **Stop**: `return require(game.ReplicatedStorage.VFX.Capture).stop()`.
4. Repeat 1-3 from the other view (close and player's camera).

Pick the 4-6 moments that matter: anticipation, the flash (~0.03 s), the
peak, the body at ~0.3 s, the smoke, and a time just past the end to see
nothing is left behind. Each step costs two tool calls, so don't capture more
than you will judge.

If `screen_capture` shows the Studio window rather than the viewport, frame
the effect larger with `Capture.aim` (smaller distance) so detail survives.

## Animations

The pose compiler is bundled as `scripts/animate.mjs` (Node 18+):

```bash
node SKILL_DIR/scripts/animate.mjs Slash.json --grounded --sheet Slash.png --out Slash.lua
```

- Write the animation JSON (the format in `character-animation.md`) to a
  file. Start from the closest recipe there.
- Flags: `--locomotion` for walks and runs, `--grounded` for anything done
  standing, `--waive id,id` to accept a failing check on purpose,
  `--parent game.ServerStorage` for where the KeyframeSequence goes,
  `--rig-json reading.json` for a creature or any non-stock rig.
- It prints JSON: `ok`, `failing` checks with measurements, and the `sheet`
  times. Exit 0 means every check passed, 3 means checks failed, 1 means the
  format was refused (`errors` say where).
- **Look at the contact sheet** (`--sheet`, a PNG: three-quarter view on top,
  front or side below). This replaces the original attached preview.
- `--out` writes Luau that builds the KeyframeSequence under
  `<parent>.Animations` and registers a temporary preview id with
  `AnimationClipProvider:RegisterAnimationClip`. Read the file and send its
  text with `execute_luau`. The id plays in Studio (edit and playtest) on
  this computer only.
- For the live game the user must publish it: right-click the
  KeyframeSequence > Save to Roblox (or Animation Editor > Publish), or
  Save to File and `upload.mjs Animation`. It must belong to the place's
  owner to play in the live game. Say so when you hand an animation over.

**Creatures and custom rigs:** set `MODEL_PATH` in `scripts/read_rig.lua`,
run it with `execute_luau`, save the returned JSON verbatim to a file, and
pass it with `--rig-json`. The model needs its Motor6Ds (or
AnimationConstraints) and an AnimationController or Humanoid. To join loose
parts into a rig, edit `CONFIG` in `scripts/rig_model.lua` and run it with
`execute_luau` first: it makes the Motor6Ds, the root and the controller, and
writes the `AnimRig` declarations (`creature-animation.md`). An NPC that walks
takes the loader in `templates/npc/ModelAnimate.server.lua`
(`character-animation.md`, "NPCs").

**Previewing on a dummy in Studio:**

```luau
local seq = game.ServerStorage.Animations.Slash
local dummy = workspace.Rig   -- an R15 rig with a Humanoid
local animator = dummy.Humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator", dummy.Humanoid)
local anim = Instance.new("Animation")
anim.AnimationId = seq:GetAttribute("PreviewId")
local track = animator:LoadAnimation(anim)
track:Play()
return track.Length
```

## Textures and mesh shapes in Blender

**Command line (preferred; runs in the background like the original jobs):**

```bash
blender -b --factory-startup --python SKILL_DIR/scripts/blender_job.py -- job.py ./vfx-out [--export]
```

On Windows Blender is usually
`"C:\Program Files\Blender Foundation\Blender 4.x\blender.exe"`; find it with
`where blender` or by listing that folder. Ask the user for the path if it is
not there.

- `job.py` is the script the references show: `bpy`, `numpy`, `OUTPUT_DIR`
  and `fx` are defined.
- `--export` writes every mesh left in the scene as `<name>.glb` (one
  MeshPart each) and `scene.json` with sizes in studs and triangle counts.
- It prints the files written. A traceback means the script failed: fix the
  cause and run again; after two failures on the same texture, stop and
  report.
- Then **look at every texture** (read the PNGs as images) and run
  `node SKILL_DIR/scripts/texture-tool.mjs check ./vfx-out`. Fix every
  "Problem" before uploading; weigh each "Note". Its last line per sheet is
  the ParticleEmitter settings to use.

**Blender through an MCP** (`execute_blender_code` or similar) runs in the
user's open Blender. Make a scratch scene so their file is untouched, and
load the helpers first in the same code:

```python
import bpy, numpy, os, types
SKILL_DIR = r"<absolute skill path>"
OUTPUT_DIR = os.path.expanduser("~/vfx-out"); os.makedirs(OUTPUT_DIR, exist_ok=True)
_h = {"__name__": "fx", "_OUTPUT_DIR": OUTPUT_DIR}
exec(compile(open(os.path.join(SKILL_DIR, "scripts", "vfx_blender.py"), encoding="utf-8").read(), "vfx_blender.py", "exec"), _h)
fx = types.SimpleNamespace(**{k: v for k, v in _h.items() if callable(v) and not k.startswith("_") and getattr(v, "__module__", None) == "fx"})
scene = bpy.data.scenes.new("VFXJob"); bpy.context.window.scene = scene
# ... the job ...
```

Remove the scratch scene afterwards. Prefer the command line when Blender is
installed: it cannot disturb the user's open file.

**Previewing textures before uploading:**
`node SKILL_DIR/scripts/texture-tool.mjs preview ./vfx-out` copies the PNGs
into every Studio install's `content/textures/vfx-preview/` (Windows only)
and prints an `rbxasset://textures/vfx-preview/<job>-<name>.png` address for
each. Set `ParticleEmitter.Texture` to it: it plays as an upload would, on
this computer only. Studio keeps a file's first image for the session, so a
redraw gets a new preview (a new job prefix). Replace every preview address
with the uploaded `rbxassetid://<imageId>` before calling the work done.

## Uploading

Every upload is moderated and permanent. Upload only settled files, and say
how many uploads you are about to make before making them.

- **Textures:** try the Studio MCP's `upload_image` first. Otherwise
  `node SKILL_DIR/scripts/upload.mjs Decal file.png` and use the printed
  `imageId` as `rbxassetid://<imageId>` (never the decal id).
- **Meshes:** `node SKILL_DIR/scripts/upload.mjs Model shape.glb`, then
  `insert_asset` with the asset id, then read its size back and scale it.
- **Animations:** see above.

`upload.mjs` needs `ROBLOX_API_KEY` (an Open Cloud key with Assets read and
write) and `ROBLOX_USER_ID` or `ROBLOX_GROUP_ID` (the place's owner) in the
environment. If they are not set, tell the user what is needed rather than
asking them to paste a key into the chat; they can set it in their shell or
upload the files themselves.

## Leftovers to check before calling an effect done

- No `rbxasset://textures/vfx-preview/` address left in the place (scan
  `game:GetDescendants()` for ParticleEmitter, Beam, Trail, Decal and Texture
  whose `Texture` starts with it).
- Remove temporary preview markers and the `_VFXCapture` folder. Keep any Workspace asset the user requested as a deliverable.
- `get_console_output` shows no `VFXEmit` warnings.
- The camera is back to `Custom` (`Capture.stop()` does it).
