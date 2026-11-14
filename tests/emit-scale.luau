-- Headless checks for templates/vfx/emit.lua's scale and tint, run with
--   lune run tests/emit-scale.luau
-- Lune has Roblox datatypes and instances but no running engine, so this
-- covers the arithmetic only. Playback still needs a Studio check.

local fs = require("@lune/fs")
local luau = require("@lune/luau")
local roblox = require("@lune/roblox")

local Instance = roblox.Instance
local Vector3, CFrame, Color3 = roblox.Vector3, roblox.CFrame, roblox.Color3

local environment = {
	game = {
		GetService = function()
			return {}
		end,
	},
	Enum = roblox.Enum,
	Vector3 = Vector3,
	CFrame = CFrame,
	Color3 = Color3,
	NumberRange = roblox.NumberRange,
	NumberSequence = roblox.NumberSequence,
	NumberSequenceKeypoint = roblox.NumberSequenceKeypoint,
	ColorSequence = roblox.ColorSequence,
	ColorSequenceKeypoint = roblox.ColorSequenceKeypoint,
	warn = function() end,
}
local VFX = luau.load(fs.readFile("templates/vfx/emit.lua"), {
	debugName = "emit.lua",
	environment = environment,
})()

local failures = 0
local function near(actual, expected, label)
	if math.abs(actual - expected) > 1e-4 then
		failures += 1
		print(`FAIL {label}: expected {expected}, got {actual}`)
	end
end

local function build()
	local model = Instance.new("Model")
	local core = Instance.new("Part")
	core.Name = "Core"
	core.Size = Vector3.new(2, 4, 2)
	core.CFrame = CFrame.new(0, 3, 0) * CFrame.Angles(0, math.rad(90), 0)
	core.Color = Color3.new(1, 1, 1)
	core.Parent = model
	local attachment = Instance.new("Attachment")
	attachment.Position = Vector3.new(0, 1, 0)
	attachment.Parent = core
	local emitter = Instance.new("ParticleEmitter")
	emitter.Size = roblox.NumberSequence.new({
		roblox.NumberSequenceKeypoint.new(0, 2, 0.5),
		roblox.NumberSequenceKeypoint.new(1, 0),
	})
	emitter.Speed = roblox.NumberRange.new(10, 20)
	emitter.Acceleration = Vector3.new(0, -4, 0)
	emitter.Color = roblox.ColorSequence.new(Color3.new(1, 0.5, 1))
	emitter.Parent = attachment
	local beam = Instance.new("Beam")
	beam.Width0, beam.Width1 = 2, 1
	beam.Parent = core
	local light = Instance.new("PointLight")
	light.Range = 40
	light.Color = Color3.new(1, 1, 1)
	light.Parent = core
	return model, core, attachment, emitter, beam, light
end

-- Scale 2 about a pivot at the origin.
do
	local model, core, attachment, emitter, beam, light = build()
	VFX._scaleEffect(model, CFrame.new(), 2)
	near(core.Size.Y, 8, "part size")
	near(core.CFrame.Position.Y, 6, "part moves away from pivot")
	near(select(2, core.CFrame:ToEulerAnglesYXZ()), math.rad(90), "part keeps its rotation")
	near(attachment.Position.Y, 2, "attachment offset")
	near(emitter.Size.Keypoints[1].Value, 4, "particle size")
	near(emitter.Size.Keypoints[1].Envelope, 1, "particle size envelope")
	near(emitter.Speed.Max, 40, "particle speed")
	near(emitter.Acceleration.Y, -8, "particle acceleration")
	near(beam.Width0, 4, "beam width")
	near(light.Range, 60, "light range stops at 60")
end

-- Scaling about a pivot that is not the origin.
do
	local model, core = build()
	VFX._scaleEffect(model, CFrame.new(0, 2, 0), 0.5)
	near(core.CFrame.Position.Y, 2.5, "part moves toward an offset pivot")
end

-- Tint multiplies authored colours.
do
	local model, core, _, emitter, _, light = build()
	VFX._tintEffect(model, Color3.new(0.5, 1, 0.25))
	near(core.Color.R, 0.5, "part tint")
	local tinted = emitter.Color.Keypoints[1].Value
	near(tinted.R, 0.5, "particle tint red")
	near(tinted.G, 0.5, "particle tint green")
	near(tinted.B, 0.25, "particle tint blue")
	near(light.Color.B, 0.25, "light tint")
end

-- The self-test: a broken scale must be caught, or these checks prove nothing.
do
	local model, core = build()
	VFX._scaleEffect(model, CFrame.new(), 1)
	-- The same tolerance near() uses must see an unscaled part as wrong.
	if math.abs(core.Size.Y - 8) <= 1e-4 then
		print("FAIL self-test: the size check did not catch an unscaled part")
		failures += 1
	end
end

if failures > 0 then
	print(`{failures} check(s) failed`)
	error("emit-scale tests failed")
end
print("emit-scale: all checks passed")
