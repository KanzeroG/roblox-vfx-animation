local fs = require("@lune/fs")
local process = require("@lune/process")
local roblox = require("@lune/roblox")

local mode, packPath, argument, output = table.unpack(process.args)
assert(
	(mode == "search" or mode == "extract") and packPath and argument,
	"Usage: lune run scripts/inspect-pack.luau search PACK.rbxm 'keywords'\n"
		.. "       lune run scripts/inspect-pack.luau extract PACK.rbxm SELECTOR OUTPUT.rbxm"
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

if mode == "extract" then
	assert(output and output:lower():match("%.rbxm$"), "Pass an .rbxm output path")
	assert(not fs.isFile(output) and not fs.isDir(output), "Output path already exists")
	assert(not argument:match("[^%d/]") and not argument:match("//"), "Invalid selector")
	assert(argument:match("^%d") and argument:match("%d$"), "Invalid selector")

	local children = roots
	local chosen
	for id in argument:gmatch("%d+") do
		chosen = assert(children[tonumber(id)], "Selector does not exist in this pack")
		children = chosen:GetChildren()
	end

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
