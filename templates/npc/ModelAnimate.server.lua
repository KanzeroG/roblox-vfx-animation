-- ModelAnimate: plays an NPC's idle, walk and run from its Humanoid's speed.
-- Put this Script (RunContext Server) inside the NPC's Model. Every clone carries it.
--
-- Roblox's Animate LocalScript runs only under a player, so an NPC needs its own loader.
-- It reads these attributes on the Model; change them at any time to rewire it:
--   AnimIdle, AnimWalk, AnimRun   "rbxassetid://<id>" (unset: Roblox's default for the rig)
--   AnimWalkSpeed, AnimRunSpeed   the gait's ground speed in studs/s, from animate.mjs's
--                                 groundSpeed; unset: the gait plays at its own pace
-- A gait plays at the model's speed divided by its ground speed, from half to twice as
-- fast, so the feet keep pace. With both gaits timed, the run plays above the speed
-- halfway between their ground speeds. Animations cross-fade over FADE seconds.

local FADE = 0.2
local STAND_SPEED = 0.75 -- studs/s below which the model counts as standing
local DEFAULTS = {
	R15 = { AnimIdle = "rbxassetid://507766388", AnimWalk = "rbxassetid://507777826", AnimRun = "rbxassetid://507767714" },
	R6 = { AnimIdle = "rbxassetid://180435571", AnimWalk = "rbxassetid://180426354", AnimRun = "rbxassetid://180426354" },
}

local model = script.Parent
local humanoid = model:WaitForChild("Humanoid") :: Humanoid
local animator = humanoid:FindFirstChildOfClass("Animator") or Instance.new("Animator")
animator.Parent = humanoid

local tracks: { [string]: AnimationTrack } = {}
local current: string? = nil
local speed = 0

local function load(slot: string): AnimationTrack?
	local rig = if humanoid.RigType == Enum.HumanoidRigType.R6 then "R6" else "R15"
	local id = model:GetAttribute(slot) or DEFAULTS[rig][slot]
	if typeof(id) ~= "string" or id == "" then
		return nil
	end
	local old = tracks[slot]
	if old and old.Animation and old.Animation.AnimationId == id then
		return old
	end
	if old then
		old:Stop(0)
		old:Destroy()
	end
	local animation = Instance.new("Animation")
	animation.AnimationId = id
	local track = animator:LoadAnimation(animation)
	track.Priority = if slot == "AnimIdle" then Enum.AnimationPriority.Idle else Enum.AnimationPriority.Movement
	track.Looped = true
	tracks[slot] = track
	return track
end

local function choose(): (string, number)
	if speed < STAND_SPEED then
		return "AnimIdle", 1
	end
	local walk, run = model:GetAttribute("AnimWalkSpeed"), model:GetAttribute("AnimRunSpeed")
	local slot, ground = "AnimWalk", walk
	if typeof(walk) == "number" and typeof(run) == "number" and speed > (walk + run) / 2 then
		slot, ground = "AnimRun", run
	elseif typeof(walk) ~= "number" and typeof(run) == "number" then
		slot, ground = "AnimRun", run
	end
	local rate = if typeof(ground) == "number" and ground > 0 then math.clamp(speed / ground, 0.5, 2) else 1
	return slot, rate
end

local function update()
	local slot, rate = choose()
	local track = load(slot)
	if not track then
		return
	end
	if current ~= slot then
		if current and tracks[current] then
			tracks[current]:Stop(FADE)
		end
		track:Play(FADE)
		current = slot
	end
	track:AdjustSpeed(rate)
end

humanoid.Running:Connect(function(newSpeed)
	speed = newSpeed
	update()
end)
model.AttributeChanged:Connect(function(name)
	if string.sub(name, 1, 4) == "Anim" then
		current = nil -- reload and restart the chosen animation
		for _, track in tracks do
			track:Stop(FADE)
		end
		update()
	end
end)
update()
