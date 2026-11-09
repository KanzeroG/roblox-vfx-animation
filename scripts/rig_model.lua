-- Joins a model's loose pieces into an animatable rig, and writes its AnimRig declarations.
-- Run with execute_luau after editing CONFIG below; then read the rig with read_rig.lua
-- and pass the reading to `node scripts/animate.mjs --rig-json`.
--
-- What it does, as one undo step:
--   * optionally removes an importer rig (a RootPart every piece hangs from, `<piece>_Node`
--     models, the upload's AnimationController and InitialPoses)
--   * one Motor6D per joint, Part0 = the parent piece, Part1 = the piece, both C0 and C1 at
--     the pivot, so nothing moves; riders in `with` are welded to their piece
--   * an invisible HumanoidRootPart jointed to the root piece by a Motor6D named "Root"
--   * the controller: a Humanoid (root free, HipHeight from the rest pose) for a creature
--     that walks or is moved with MoveTo, or an AnimationController (root anchored) for one
--     that flies, swims or stays put; each with an Animator
--   * the AnimRig attribute: from PLAN ("quadruped" or "custom") merged with DECLARATIONS
-- With JOINTS empty it only writes AnimRig (and, for a skinned mesh whose Bones are its
-- joints, adds the root and controller when CONTROLLER is set). It refuses before changing
-- anything when names repeat, a part is left loose, the joints do not form one tree, or a
-- pivot lies outside both pieces; the result lists every problem.

local CONFIG = {
	model = "game.Workspace.Dog", -- << the Model to rig
	controller = "Humanoid", -- "Humanoid" | "AnimationController" | nil (declare only)
	plan = "quadruped", -- "quadruped" | "custom"
	replaceImporter = false, -- true for an uploaded model (Blender GLB, Meshy, ...)
	pivotSpace = "world", -- "world" | "import" (pivots measured from the model's own origin)
	-- each joint: the piece it moves, the piece it hangs from, the pivot in studs, an optional
	-- name (default: the piece's name) and riders welded to the piece
	joints = {
		-- { part = "Head", parent = "Body", pivot = { 0, 3.1, -1.6 }, name = "Neck", with = { "EarLeft", "EarRight" } },
		-- { part = "FrontLeftUpper", parent = "Body", pivot = { -0.6, 2.4, -1.2 }, name = "FrontLeft" },
		-- { part = "FrontLeftLower", parent = "FrontLeftUpper", pivot = { -0.6, 1.6, -1.2 }, name = "FrontLeftKnee" },
	},
	declarations = nil, -- optional AnimRig sections that override the plan's, e.g. { limits = { Tail = "free" } }
}

local function main(): string
	local HttpService = game:GetService("HttpService")
	local PIVOT_TOLERANCE = 0.5 -- studs a pivot may lie outside the two pieces' boxes
	local LEGS = { "FrontLeft", "FrontRight", "HindLeft", "HindRight" }

	local function resolve(path: string): Instance?
		local node: Instance? = game
		for name in string.gmatch(path, "[^%.]+") do
			if name ~= "game" then
				node = node and node:FindFirstChild(name)
			end
		end
		return node
	end

	local function fail(problems: { string })
		return HttpService:JSONEncode({ ok = false, problems = problems })
	end

	local model = resolve(CONFIG.model)
	if not model or not model:IsA("Model") then
		return fail({ CONFIG.model .. " is not a Model" })
	end

	-- The model's origin before anything changes, for pivotSpace "import".
	local importer = model:FindFirstChild("RootPart", true)
	local origin = if importer and importer:IsA("BasePart") then importer.CFrame else model:GetPivot()

	local function parts(): { [string]: BasePart }
		local byName, problems = {}, {}
		for _, d in model:GetDescendants() do
			if d:IsA("BasePart") and d.Name ~= "RootPart" and d.Name ~= "HumanoidRootPart" then
				if byName[d.Name] then
					table.insert(problems, "two parts are named " .. d.Name .. "; rename one")
				end
				byName[d.Name] = d
			end
		end
		return byName, problems
	end

	-- Validate everything before changing anything.
	local byName, problems = parts()
	local moved, jointNames, children = {}, {}, {}
	for i, j in CONFIG.joints do
		local part, parent = byName[j.part], byName[j.parent]
		if not part then table.insert(problems, `joint {i}: no part named {j.part}`) end
		if not parent then table.insert(problems, `joint {i}: no parent part named {j.parent}`) end
		if part and moved[part] then table.insert(problems, `{j.part} is moved by two joints`) end
		local name = j.name or j.part
		if name == "Root" then table.insert(problems, `joint {i}: "Root" is reserved for the root joint`) end
		if jointNames[name] then table.insert(problems, `two joints are named {name}`) end
		jointNames[name] = true
		if part then moved[part] = j end
		if part and parent then
			children[parent] = children[parent] or {}
			table.insert(children[parent], part)
			local pivot = Vector3.new(j.pivot[1], j.pivot[2], j.pivot[3])
			if CONFIG.pivotSpace == "import" then pivot = origin:PointToWorldSpace(pivot) end
			local inside = false
			for _, p in { part, parent } do
				local localPoint = p.CFrame:PointToObjectSpace(pivot)
				local half = p.Size / 2 + Vector3.one * PIVOT_TOLERANCE
				if math.abs(localPoint.X) <= half.X and math.abs(localPoint.Y) <= half.Y and math.abs(localPoint.Z) <= half.Z then
					inside = true
				end
			end
			if not inside then table.insert(problems, `joint {name}: the pivot lies outside both {j.part} and {j.parent}`) end
			j._pivot = pivot
		end
		for _, rider in j.with or {} do
			if not byName[rider] then table.insert(problems, `joint {name}: no rider part named {rider}`) end
		end
	end

	local rootPiece: BasePart? = nil
	if #CONFIG.joints > 0 then
		local roots = {}
		for _, j in CONFIG.joints do
			local parent = byName[j.parent]
			if parent and not moved[parent] and not table.find(roots, parent) then table.insert(roots, parent) end
		end
		if #roots ~= 1 then
			local names = {}
			for _, p in roots do table.insert(names, p.Name) end
			table.insert(problems, `the joints must hang from one root piece, found {#roots}: {table.concat(names, ", ")}`)
		else
			rootPiece = roots[1]
		end
		-- every part is the root, moved by a joint, a rider, or already welded to one of those
		local placed = {}
		if rootPiece then placed[rootPiece] = true end
		for part in moved do placed[part] = true end
		for _, j in CONFIG.joints do
			for _, rider in j.with or {} do if byName[rider] then placed[byName[rider]] = true end end
		end
		for _, d in model:GetDescendants() do
			if (d:IsA("WeldConstraint") or d:IsA("Weld")) and d.Part0 and d.Part1 then
				local a, b = d.Part0, d.Part1
				local jointedA, jointedB = moved[a] or a == rootPiece, moved[b] or b == rootPiece
				if jointedA and jointedB then
					table.insert(problems, `a weld holds two jointed pieces, {a.Name} and {b.Name}; remove it`)
				end
				if placed[a] then placed[b] = true elseif placed[b] then placed[a] = true end
			end
		end
		for name, part in byName do
			if not placed[part] then table.insert(problems, `{name} has no place: joint it, add it to a piece's "with", or weld it`) end
		end
	end
	if #problems > 0 then return fail(problems) end

	local ChangeHistory = game:GetService("ChangeHistoryService")
	local recording = nil
	pcall(function() recording = ChangeHistory:TryBeginRecording("Rig " .. model.Name) end)

	-- Remove an importer rig.
	if CONFIG.replaceImporter then
		for _, d in model:GetDescendants() do
			if d:IsA("Motor6D") and d.Part0 and d.Part0.Name == "RootPart" then d:Destroy() end
		end
		for _, d in model:GetDescendants() do
			if d:IsA("Model") and string.match(d.Name, "_Node$") then
				for _, c in d:GetChildren() do c.Parent = model end
				d:Destroy()
			end
		end
		for _, d in model:GetChildren() do
			if d.Name == "InitialPoses" or d:IsA("AnimationController") or (d:IsA("BasePart") and d.Name == "RootPart") then
				d:Destroy()
			end
		end
	end

	local created = {}
	local frame = model:GetPivot().Rotation -- joint frames follow the model's axes at rest
	for _, j in CONFIG.joints do
		local part, parent = byName[j.part], byName[j.parent]
		local pivotCF = CFrame.new(j._pivot) * frame
		local motor = Instance.new("Motor6D")
		motor.Name = j.name or j.part
		motor.Part0, motor.Part1 = parent, part
		motor.C0 = parent.CFrame:ToObjectSpace(pivotCF)
		motor.C1 = part.CFrame:ToObjectSpace(pivotCF)
		motor.Parent = part
		table.insert(created, motor.Name)
		for _, riderName in j.with or {} do
			local weld = Instance.new("WeldConstraint")
			weld.Part0, weld.Part1 = part, byName[riderName]
			weld.Parent = byName[riderName]
		end
	end

	-- Root and controller.
	local hipHeight = nil
	if CONFIG.controller then
		if not rootPiece then
			-- a skinned mesh: its Bones are the joints, the root holds the mesh
			for _, d in model:GetDescendants() do
				if d:IsA("MeshPart") and d:FindFirstChildWhichIsA("Bone", true) then rootPiece = d break end
			end
		end
		if not rootPiece then
			if recording then ChangeHistory:FinishRecording(recording, Enum.FinishRecordingOperation.Cancel) end
			return fail({ "no root piece: give joints, or use a skinned MeshPart with Bones" })
		end
		local old = model:FindFirstChild("HumanoidRootPart")
		if old then old:Destroy() end
		local hrp = Instance.new("Part")
		hrp.Name = "HumanoidRootPart"
		hrp.Size = Vector3.new(math.min(rootPiece.Size.X, 2), math.min(rootPiece.Size.Y, 2), math.min(rootPiece.Size.Z, 2))
		hrp.CFrame = CFrame.new(rootPiece.CFrame.Position) * frame
		hrp.Transparency, hrp.CanCollide, hrp.CanQuery, hrp.CanTouch = 1, false, false, false
		hrp.Parent = model
		local root = Instance.new("Motor6D")
		root.Name = "Root"
		root.Part0, root.Part1 = hrp, rootPiece
		root.C0 = CFrame.identity
		root.C1 = rootPiece.CFrame:ToObjectSpace(hrp.CFrame)
		root.Parent = hrp
		model.PrimaryPart = hrp
		for _, d in model:GetDescendants() do
			if d:IsA("BasePart") and d ~= hrp then
				d.Anchored, d.Massless, d.CanCollide = false, true, false
			end
		end
		for _, d in model:GetChildren() do
			if d:IsA("Humanoid") or d:IsA("AnimationController") then d:Destroy() end
		end
		local controller = Instance.new(CONFIG.controller)
		Instance.new("Animator").Parent = controller
		controller.Parent = model
		if CONFIG.controller == "Humanoid" then
			hrp.Anchored = false
			hrp.CanCollide = true
			local lowest = math.huge
			for _, d in model:GetDescendants() do
				if d:IsA("BasePart") and d ~= hrp then
					local cf, size = d.CFrame, d.Size / 2
					for _, sx in { -1, 1 } do for _, sy in { -1, 1 } do for _, sz in { -1, 1 } do
						lowest = math.min(lowest, cf:PointToWorldSpace(Vector3.new(sx * size.X, sy * size.Y, sz * size.Z)).Y)
					end end end
				end
			end
			hipHeight = (hrp.CFrame.Position.Y - hrp.Size.Y / 2) - lowest
			controller.HipHeight = math.max(hipHeight, 0)
		else
			hrp.Anchored = true
		end
		table.insert(created, "Root")
	end

	-- Declarations.
	local decl: any = { version = 1 }
	if CONFIG.plan == "quadruped" then
		local function jointFor(partName: string): string?
			for _, j in CONFIG.joints do
				if j.part == partName then return j.name or j.part end
			end
			for _, d in model:GetDescendants() do -- an existing rig: the joint whose Part1 is the piece
				if d:IsA("Motor6D") and d.Part1 and d.Part1.Name == partName then return d.Name end
			end
			return nil
		end
		decl.feet, decl.hinges, decl.limbs, decl.limits = {}, {}, {}, {}
		for _, leg in LEGS do
			local front = string.sub(leg, 1, 5) == "Front"
			local single, upper, lower = jointFor(leg), jointFor(leg .. "Upper"), jointFor(leg .. "Lower")
			if upper and lower then
				local foot = byName[leg .. "Foot"] and leg .. "Foot" or leg .. "Lower"
				table.insert(decl.feet, foot)
				decl.hinges[lower] = { axis = "X", flex = if front then -1 else 1 }
				decl.limbs[upper] = { hinge = lower }
				decl.limits[upper] = { turn = 120 }
				decl.limits[lower] = if front then { min = -150, max = 10 } else { min = -10, max = 150 }
				local footJoint = byName[leg .. "Foot"] and jointFor(leg .. "Foot")
				if footJoint then decl.limbs[upper].foot = footJoint end
			elseif single then
				table.insert(decl.feet, leg)
				decl.limits[single] = { turn = 90 }
			end
		end
		for name, turn in { Head = 70, Jaw = 35 } do
			local j = jointFor(name)
			if j then decl.limits[j] = { turn = turn } end
		end
		for partName in byName do
			if string.match(partName, "^Tail%d*$") then
				local j = jointFor(partName)
				if j then decl.limits[j] = { turn = 90 } end
			end
		end
		if #decl.feet == 0 then decl.feet = nil end
		if next(decl.hinges) == nil then decl.hinges = nil end
		if next(decl.limbs) == nil then decl.limbs = nil end
	end
	for section, value in CONFIG.declarations or {} do
		if type(value) == "table" and type(decl[section]) == "table" and #value == 0 then
			for k, v in value do decl[section][k] = v end
		else
			decl[section] = value
		end
	end
	local encoded = HttpService:JSONEncode(decl)
	model:SetAttribute("AnimRig", encoded)

	if recording then ChangeHistory:FinishRecording(recording, Enum.FinishRecordingOperation.Commit) end
	return HttpService:JSONEncode({
		ok = true,
		model = model:GetFullName(),
		joints = created,
		rootPiece = rootPiece and rootPiece.Name,
		controller = CONFIG.controller,
		hipHeight = hipHeight,
		AnimRig = decl,
		next = "Turn each joint 30 degrees each way to check its pivot, then read the rig with read_rig.lua",
	})
end

-- execute_luau shows the returned text; the Command Bar shows the print.
local result = main()
print(result)
return result
