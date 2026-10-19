---
name: roblox-tooling
description: "Roblox file toolchain: Rojo project files and file mapping, sourcemaps, rojo syncback, Script Sync, Wally, Rokit, luau-lsp, selene, StyLua, Lune. Use when editing project files, adding packages or tools, or fixing sync or build problems."
---

# Roblox tooling reference

Kit projects (from `new-project`) pin everything in `rokit.toml`: rojo 7.7.1, wally 0.3.2, luau-lsp 1.70.1, selene 0.32.0, StyLua 2.6.0, lune 0.11.0. To *run* the checks use the `check` skill (`rbx-check.mjs`), not hand-assembled commands. This skill explains what the files mean and how to change them.

**Match the project.** If a repo already uses Aftman, Foreman, pesde, a different layout or no tooling, extend what's there; don't migrate unprompted. Mention optional tools when the user is hand-doing what they automate; don't impose them.

## Source of truth: one writer per script

| Route | Source of truth | Syncs | Use when |
|---|---|---|---|
| Rojo (`rojo serve` + Studio plugin) | Files on disk / git | Anything in the project file: scripts, models, properties, JSON/CSV/TOML data | Git and CI are the truth, packages are used, code must build without Studio. **Kit projects use this.** |
| Studio Script Sync (built in) | The place; scripts mirrored to a folder both ways | Script, LocalScript, ModuleScript, Folder only | The team builds in Studio and wants files for editing only |
| Studio only | The open place | – | No file layer; edit via Studio MCP |

- With Rojo serving, edit mapped scripts **on disk only**. Never change them with `multi_edit` or by hand in Studio: the next sync overwrites one side.
- With Script Sync, edit the files and let the user resolve any Keep Studio / Keep Disk dialog; never choose for them.
- Never run Rojo and Script Sync on the same scripts.
- Use Studio MCP for what isn't on disk (maps, models, UI built in Studio, terrain).
- Naming differs: in Rojo 7 (`emitLegacyScripts` defaults to true) `x.client.luau` becomes a **LocalScript**; in Script Sync it becomes a Script with `RunContext = Client` (`x.local.luau` is its LocalScript).

## Rojo essentials

| On disk | Instance |
|---|---|
| directory | `Folder` |
| `x.luau` / `x.server.luau` / `x.client.luau` | `ModuleScript` / `Script` / `LocalScript` named `x` |
| `dir/init.luau` (or `init.server.luau`, `init.client.luau`) | The directory itself becomes that script; other files become its children. One `init.*` per directory |
| `x.meta.json` / `dir/init.meta.json` | Properties, attributes or `ignoreUnknownInstances` for `x`; `className` only in `init.meta.json` (turns the folder into e.g. a `Tool`) |
| `x.model.json` / `x.rbxm` / `x.rbxmx` | Hand-written JSON model (e.g. a `RemoteEvent`) / binary / XML model |
| `x.json`, `x.toml` / `x.csv` / `x.txt` | `ModuleScript` returning the data / `LocalizationTable` / `StringValue` |
| `x.project.json` | Nested project |

In `default.project.json`: `$path` mounts a file/folder (`{ "optional": "Packages" }` tolerates a missing folder), `$className` names the class (optional for services or when `$path` resolves it), `$properties` sets properties, `$ignoreUnknownInstances` leaves non-Rojo instances alone. Details, meta files, `syncback` and sourcemaps: [references/rojo.md](references/rojo.md).

## Everyday commands (from the project root)

```
rokit install                 # install pinned tools (non-interactive shells: rokit trust <owner/repo> first,
                              # or in CI: rokit install --no-trust-check)
wally install                 # after any wally.toml change; regenerates Packages/ (never edit by hand)
rojo serve                    # live sync into Studio (user clicks Connect in the Rojo plugin)
rojo build -o build/place.rbxl
rojo sourcemap default.project.json -o sourcemap.json --include-non-scripts
rojo syncback --dry-run --list --input place.rbxl   # preview converting a place file into files
lune run <script>             # runs .lune/<script>.luau (or lune/<script>.luau)
```

`wally install --locked` does not exist (Wally 0.3.2 has no lockfile-enforcement flag); commit `wally.lock` and review its diff instead.

Wally, Rokit, luau-lsp, selene, StyLua, Lune and the test-runtime table: [references/packages-and-tools.md](references/packages-and-tools.md).

## Rules of thumb

- Generated, not edited: `Packages/`, `ServerPackages/`, `DevPackages/`, `sourcemap.json`, built `.rbxl`. Keep them gitignored; commit `rokit.toml`, `wally.toml`, `wally.lock`.
- Regenerate the sourcemap after adding/removing files, changing mounts or installing packages (`rbx-check.mjs` does it for you).
- Wally manifest sections are kebab-case: `[dependencies]`, `[server-dependencies]`, `[dev-dependencies]`. A snake_case `[server_dependencies]` is silently ignored.
- `selene.toml` needs `std = "roblox"`; otherwise every Roblox global is flagged.
- Don't quote rarer project-file or CLI flags from memory: check `<tool> --help` (all are on PATH via Rokit inside the project) or the tool's docs.

## Related

`check` (run lint/types/build), `new-project` (scaffold), `roblox-testing` (test strategy, TestRunner, Jest Lua), `open-cloud` (CI and cloud tests), `studio-mcp` (Studio-only content), `roblox-architecture` (what goes where at runtime).
