local fs = require("@lune/fs")
local process = require("@lune/process")
local roblox = require("@lune/roblox")
local serde = require("@lune/serde")

local mode, packPath, argument, output = table.unpack(process.args)
assert(
	(mode == "search" or mode == "extract" or mode == "recipe") and packPath and argument,
	"Usage: lune run scripts/inspect-pack.luau search PACK.rbxm 'keywords'\n"
		.. "       lune run scripts/inspect-pack.luau extract PACK.rbxm SELECTOR OUTPUT.rbxm\n"
		.. "       lune run scripts/inspect-pack.luau recipe PACK.rbxm SELECTOR OUTPUT.json"
)

local roots = roblox.deserializeModel(fs.readFile(packPath))

local function contains(root, instance)
	while instance do
		if instance == root then
			return true
		end
		instance = instance.Parent
	end
	return false
end

local function members(root)
	local objects = root:GetDescendants()
	table.insert(objects, root)
	return objects
end

local function verifyLinks(root)
	local count = 0
	for _, instance in members(root) do
		assert(not instance:IsA("LuaSourceContainer"), "Selection contains executable source")
		if instance:IsA("Beam") or instance:IsA("Trail") then
			assert(
				contains(root, instance.Attachment0) and contains(root, instance.Attachment1),
				"Select a common ancestor that contains both endpoints for " .. instance.Name
			)
			count += 1
		end
	end
	return count
end

local function textureURI(instance)
	for _, property in { "TextureContent", "ColorMapContent", "ImageContent", "Texture", "TextureID", "TextureId" } do
		local ok, value = pcall(function()
			return instance[property]
		end)
		if ok then
			if typeof(value) == "Content" then
				local read, uri = pcall(function()
					return value.Uri
				end)
				if read and uri and uri ~= "" then
					return uri
				end
			elseif type(value) == "string" and value ~= "" then
				return value
			end
		end
	end
	return nil
end

-- Properties a recipe carries, named one by one: a generic property dump
-- misses most of an emitter. A MeshPart comes back as a plain Part holding
-- its effects, because a script cannot set MeshId; take meshes with `extract`.
local RECIPE_PROPERTIES = {
	Model = {},
	Folder = {},
	Part = { "Size", "Color", "Material", "Transparency", "Shape", "CastShadow" },
	Attachment = { "CFrame" },
	ParticleEmitter = {
		"Enabled", "Rate", "Lifetime", "Speed", "SpreadAngle", "Rotation", "RotSpeed",
		"Size", "Squash", "Transparency", "Color", "LightEmission", "LightInfluence",
		"Brightness", "Texture", "Orientation", "EmissionDirection", "Shape", "ShapeInOut",
		"ShapeStyle", "ShapePartial", "Acceleration", "Drag", "VelocityInheritance",
		"LockedToPart", "ZOffset", "TimeScale", "FlipbookLayout", "FlipbookMode",
		"FlipbookFramerate", "FlipbookStartRandom", "WindAffectsDrag",
	},
	Beam = {
		"Enabled", "Color", "Transparency", "LightEmission", "LightInfluence", "Brightness",
		"Texture", "TextureLength", "TextureMode", "TextureSpeed", "Width0", "Width1",
		"CurveSize0", "CurveSize1", "Segments", "FaceCamera", "ZOffset",
	},
	Trail = {
		"Enabled", "Color", "Transparency", "LightEmission", "LightInfluence", "Brightness",
		"Texture", "TextureLength", "TextureMode", "Lifetime", "MinLength", "MaxLength",
		"WidthScale", "FaceCamera",
	},
	PointLight = { "Enabled", "Brightness", "Color", "Range", "Shadows" },
	SpotLight = { "Enabled", "Brightness", "Color", "Range", "Shadows", "Angle", "Face" },
	SurfaceLight = { "Enabled", "Brightness", "Color", "Range", "Shadows", "Angle", "Face" },
}

local function round(value)
	return math.floor(value * 1e5 + 0.5) / 1e5
end

-- Encodes a value in the shapes templates/vfx/build.lua reads.
local function encode(value)
	local kind = typeof(value)
	if kind == "number" then
		return round(value)
	elseif kind == "boolean" or kind == "string" then
		return value
	elseif kind == "EnumItem" then
		return value.Name
	elseif kind == "Content" then
		local ok, uri = pcall(function()
			return value.Uri
		end)
		return if ok and uri then uri else nil
	elseif kind == "Color3" then
		return { round(value.R), round(value.G), round(value.B) }
	elseif kind == "Vector3" then
		return { round(value.X), round(value.Y), round(value.Z) }
	elseif kind == "Vector2" then
		return { round(value.X), round(value.Y) }
	elseif kind == "NumberRange" then
		return { round(value.Min), round(value.Max) }
	elseif kind == "NumberSequence" then
		local keys = {}
		for _, key in value.Keypoints do
			table.insert(keys, { time = round(key.Time), value = round(key.Value), envelope = round(key.Envelope) })
		end
		return keys
	elseif kind == "ColorSequence" then
		local keys = {}
		for _, key in value.Keypoints do
			table.insert(keys, { time = round(key.Time), value = encode(key.Value) })
		end
		return keys
	elseif kind == "CFrame" then
		local components = { value:GetComponents() }
		for index, number in components do
			components[index] = round(number)
		end
		return components
	end
	return nil
end

-- Turns an effect into build.lua steps, placed so its first part sits at the origin.
local function recipe(root)
	local steps, ids, skipped, missing, standIns = {}, {}, {}, {}, {}
	local origin
	for _, instance in members(root) do
		if instance:IsA("BasePart") then
			origin = instance.CFrame.Position
			break
		end
	end
	origin = origin or roblox.Vector3.new(0, 0, 0)

	local function visit(instance, parentId)
		local className = instance.ClassName
		local names = RECIPE_PROPERTIES[className]
		if instance:IsA("MeshPart") then
			-- Keep the emitters, beams and trails it carries on a plain Part in its place.
			className, names = "Part", {}
			for _, name in RECIPE_PROPERTIES.Part do
				if name ~= "Shape" then
					table.insert(names, name)
				end
			end
			standIns[instance.Name] = true
		end
		if not names then
			skipped[instance.ClassName] = (skipped[instance.ClassName] or 0) + 1
			return
		end
		local id = "i" .. (#steps + 1)
		ids[instance] = id
		local properties = {}
		for _, name in names do
			local ok, value = pcall(function()
				return instance[name]
			end)
			local encoded = if ok then encode(value) else nil
			if name == "Texture" then
				-- Newer files keep the texture in TextureContent; build.lua sets either.
				encoded = textureURI(instance)
			end
			if encoded ~= nil then
				properties[name] = encoded
			else
				missing[instance.ClassName .. "." .. name] = true
			end
		end
		if instance:IsA("BasePart") then
			properties.Anchored = true
			properties.CanCollide = false
			properties.CFrame = encode(instance.CFrame - origin)
		end
		local step = { op = "create", className = className, name = instance.Name, id = id, properties = properties }
		if parentId then
			step.parent = "$" .. parentId
		end
		-- build.lua sets attributes as they are, so only plain values travel.
		local attributes = {}
		for name, value in instance:GetAttributes() do
			if type(value) == "number" or type(value) == "string" or type(value) == "boolean" then
				attributes[name] = value
			else
				missing[instance.ClassName .. " attribute " .. name] = true
			end
		end
		if next(attributes) then
			step.attributes = attributes
		end
		table.insert(steps, step)
		for _, child in instance:GetChildren() do
			visit(child, id)
		end
	end
	visit(root, nil)

	for instance, id in ids do
		if instance:IsA("Beam") or instance:IsA("Trail") then
			local a0, a1 = ids[instance.Attachment0], ids[instance.Attachment1]
			if a0 and a1 then
				table.insert(steps, { op = "link", target = "$" .. id, attachment0 = "$" .. a0, attachment1 = "$" .. a1 })
			end
		end
	end
	return steps, skipped, missing, standIns
end

local function pick(selector)
	assert(not selector:match("[^%d/]") and not selector:match("//"), "Invalid selector")
	assert(selector:match("^%d") and selector:match("%d$"), "Invalid selector")
	local children = roots
	local chosen
	for id in selector:gmatch("%d+") do
		chosen = assert(children[tonumber(id)], "Selector does not exist in this pack")
		children = chosen:GetChildren()
	end
	return chosen
end

if mode == "recipe" then
	assert(output and output:lower():match("%.json$"), "Pass a .json output path")
	assert(not fs.isFile(output) and not fs.isDir(output), "Output path already exists")
	local chosen = pick(argument)
	verifyLinks(chosen)
	local steps, skipped, missing, standIns = recipe(chosen)
	fs.writeFile(output, serde.encode("json", steps, true))
	local notes = {}
	for class, count in skipped do
		table.insert(notes, string.format("%s x%d", class, count))
	end
	local unread = {}
	for name in missing do
		table.insert(unread, name)
	end
	table.sort(notes)
	table.sort(unread)
	print(string.format("Wrote %d build steps for %s [%s]", #steps, chosen.Name, chosen.ClassName))
	if #notes > 0 then
		print("Skipped, with their children: " .. table.concat(notes, ", "))
	end
	local meshes = {}
	for name in standIns do
		table.insert(meshes, name)
	end
	table.sort(meshes)
	if #meshes > 0 then
		print("MeshParts rebuilt as plain Parts (a script cannot set MeshId; extract them): " .. table.concat(meshes, ", "))
	end
	if #unread > 0 then
		print("Not in this file, left at defaults: " .. table.concat(unread, ", "))
	end
	return
end

if mode == "extract" then
	assert(output and output:lower():match("%.rbxm$"), "Pass an .rbxm output path")
	assert(not fs.isFile(output) and not fs.isDir(output), "Output path already exists")
	local chosen = pick(argument)

	-- A Beam or Trail exported by itself cannot retain references to sibling Attachments.
	-- Walk upward only as far as necessary to keep the referenced endpoints.
	local selected = chosen
	while chosen do
		local complete = true
		for _, instance in members(chosen) do
			if instance:IsA("Beam") or instance:IsA("Trail") then
				if not (contains(chosen, instance.Attachment0) and contains(chosen, instance.Attachment1)) then
					complete = false
					break
				end
			end
		end
		if complete then
			break
		end
		chosen = chosen.Parent
	end
	assert(chosen, "A referenced attachment is missing from the model file")
	assert(chosen == selected or not chosen:IsA("Folder"), "Select a smaller self-contained effect")
	local linked = verifyLinks(chosen)
	local encoded = roblox.serializeModel({ chosen })
	local checked = roblox.deserializeModel(encoded)
	assert(#checked == 1 and checked[1].Name == chosen.Name, "Export failed to round trip")
	assert(verifyLinks(checked[1]) == linked, "Attachment link count changed on export")
	fs.writeFile(output, encoded)
	print(string.format("Exported %s [%s] with %d verified Beam/Trail links", chosen.Name, chosen.ClassName, linked))
	return
end

local words = {}
for word in argument:lower():gmatch("%S+") do
	table.insert(words, word)
end
assert(#words > 0, "Enter at least one search keyword")

local function matches(haystack)
	for _, word in words do
		if not haystack:find(word, 1, true) then
			return false
		end
	end
	return true
end

local results = {}
local function visit(children, path, prefix)
	for index, child in children do
		local location = if path == "" then child.Name else path .. " > " .. child.Name
		local selector = if prefix == "" then tostring(index) else prefix .. "/" .. index
		local label = (child.Name .. " " .. child.ClassName):lower()
		if matches(location:lower() .. " " .. child.ClassName:lower()) then
			table.insert(results, {
				instance = child,
				location = location,
				selector = selector,
				direct = matches(label),
			})
		end
		visit(child:GetChildren(), location, selector)
	end
end
visit(roots, "", "")

table.sort(results, function(a, b)
	if a.direct ~= b.direct then
		return a.direct
	end
	return #a.location < #b.location or (#a.location == #b.location and a.selector < b.selector)
end)

print(string.format("%d matches for %q (showing up to 30)", #results, argument))
for index = 1, math.min(#results, 30) do
	local row = results[index]
	local instance = row.instance
	local line = string.format("%s  %s [%s]", row.selector, row.location, instance.ClassName)
	if instance:IsA("BasePart") then
		local size = instance.Size
		line ..= string.format("  %.2f × %.2f × %.2f studs", size.X, size.Y, size.Z)
	end
	local uri = textureURI(instance)
	if uri then
		line ..= "  " .. uri
	end
	print(line)
end
