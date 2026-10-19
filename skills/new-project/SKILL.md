---
name: new-project
description: "Scaffold a new Rojo-based Roblox project wired for Claude Code: pinned toolchain, strict Luau, test runner, CLAUDE.md, CI. Use when starting a new Roblox game or converting a folder into a Rojo project."
argument-hint: "<directory> [--name my-game]"
---

# New Roblox project

1. Confirm the target directory (it must be empty or not exist) and a project name. Default the name to the directory name.
2. Run:
   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/rbx-new.mjs" <directory> --name <name>
   ```
   It copies the template, trusts and installs the pinned toolchain with Rokit, runs `wally install`, generates `sourcemap.json`, and runs `git init`. Use `--no-install` if the user doesn't want tools downloaded.
3. Run `node tools/rbx-check.mjs` inside the new project and confirm it passes.
4. Tell the user the remaining manual steps:
   - Install the Rojo Studio plugin (from the Creator Store, or `rojo plugin install`), run `rojo serve`, and click **Connect** in Studio.
   - In Studio: Assistant → ⋯ → Manage MCP Servers → **Enable Studio as MCP server**.
   - Optional: fill `roblox-kit.json` (universe/place/test place IDs) and set the plugin's Roblox API key for cloud tools.

If the user already has a place built in Studio, don't overwrite it: scaffold the project, then move existing scripts out of Studio into `src/` deliberately (read them via `script_read`, write files, verify with a sync), one service at a time.
