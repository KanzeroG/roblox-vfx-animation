# Roblox VFX Animation

An Agent Skill for building Roblox visual effects and character animation in Claude Code and Codex. Use it to turn an image reference into a layered effect, tune an existing VFX asset, or build an animation with a repeatable Studio preview.

It covers impacts and explosions, beams and trails, wind and lightning, flipbooks, ground-matched debris, and R15, R6, and custom rigs. The reference notes include measured examples for Hollow Purple, Explosion, and Lightning.

## Install

Choose the command for your client. Run both commands if you use both clients.

**Windows PowerShell**

```powershell
git clone https://github.com/KanzeroG/roblox-vfx-animation.git "$env:USERPROFILE/.claude/skills/roblox-vfx-animation"
git clone https://github.com/KanzeroG/roblox-vfx-animation.git "$env:USERPROFILE/.agents/skills/roblox-vfx-animation"
```

**macOS or Linux shell**

```sh
git clone https://github.com/KanzeroG/roblox-vfx-animation.git ~/.claude/skills/roblox-vfx-animation
git clone https://github.com/KanzeroG/roblox-vfx-animation.git ~/.agents/skills/roblox-vfx-animation
```

If the skill directory already exists, keep a backup of any local changes before replacing it. Start a fresh session, then invoke `/roblox-vfx-animation` in Claude Code or `$roblox-vfx-animation` in Codex.

[Claude Code skill discovery](https://code.claude.com/docs/en/skills) · [Codex skill directories](https://developers.openai.com/api/reference/cli#use-the-cli-from-a-coding-agent)

## Connect Roblox Studio

Install Roblox Studio and connect its built-in MCP server to your client. The [Roblox Studio MCP guide](https://create.roblox.com/docs/studio/mcp) covers Quick Connect for Claude Code and Codex CLI. The workflow uses `execute_luau` and `screen_capture` for authoring and visual review.

Node.js 18 or later is needed for the bundled animation and texture tools. Blender is optional for custom mesh shapes and authored flipbooks.

## Try it

> Use the Roblox VFX Animation skill in my test place. Make a ground slam from this reference image. Use a brief flash, a widening shockwave, and debris that matches the surface. Leave an Edit-mode preview so I can inspect the effect.

A project can supply its own asset gallery as a `.rbxl` or smaller `.rbxm` prefabs. The skill can inspect it for useful meshes, emitters, beams, and trails. [Using an asset library](references/asset-library.md)

## Download the VFX Pack

[Download VFX-Pack-KanzeroGaming.rbxm](https://github.com/KanzeroG/roblox-vfx-animation/raw/refs/heads/main/assets/VFX-Pack-KanzeroGaming.rbxm) and import it into Roblox Studio with **Explorer → Insert → Import Roblox Model**. The library contains particle emitters, meshes, beams, and trails. Use it as a gallery when selecting layers for a new effect.

The migrated image references point to assets owned by **@KanzeroGaming**. Roblox checks access to restricted images, meshes, and sounds in the destination experience. The asset owner can grant access or set eligible assets to Open Use. A few texture slots are empty because the source image was unavailable or was referenced through a place-local alias. [Roblox asset permissions](https://create.roblox.com/docs/projects/assets/privacy)

## Source and license

This project builds on [adnvli/vfxskill](https://github.com/adnvli/vfxskill) and keeps its original [MIT license](LICENSE) and [third-party notices](third_party/roblox-brain-LICENSE.txt). See [credits](CREDITS.md) for the upstream revision. Referenced Roblox assets retain their own terms and permissions.
