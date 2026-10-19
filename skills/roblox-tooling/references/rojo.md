# Rojo reference (7.7)

Loaded on demand from `../SKILL.md`. Behaviour below was checked against Rojo 7.7.1 (the kit's pin) on 2026-10-18 by building test projects and reading the result back with Lune. Parts are adapted from MIT-licensed community skills; see `../ATTRIBUTION.md`.

## 1. Project file (`default.project.json`)

```json
{
  "name": "my-game",
  "tree": {
    "$className": "DataModel",
    "ReplicatedStorage": {
      "Shared": { "$path": "src/shared" },
      "Packages": { "$path": { "optional": "Packages" } }
    },
    "ServerScriptService": {
      "Server": { "$path": "src/server" }
    },
    "ServerStorage": {
      "Tests": { "$path": "tests" }
    },
    "StarterPlayer": {
      "StarterPlayerScripts": {
        "Client": { "$path": "src/client" }
      }
    },
    "Workspace": {
      "$properties": { "Gravity": 196.2 },
      "$attributes": { "Mode": "lobby" }
    }
  }
}
```

That is the kit template plus a `Workspace` node. Node keys:

| Key | Meaning |
|---|---|
| `$path` | File or folder on disk mounted at this instance. `{ "optional": "X" }` skips the node (with a warning) when `X` doesn't exist, e.g. `Packages` before `wally install` |
| `$className` | Instance class. Optional for services, and when `$path` determines the class |
| `$properties` | Property values. Implicit form `"Anchored": true` or explicit `"Anchored": { "Bool": true }` when the type is ambiguous |
| `$attributes` | Attributes on the instance |
| `$ignoreUnknownInstances` | `true` = leave instances Rojo didn't create alone instead of deleting them on sync. Useful when mapping into a service that also holds Studio-built content |
| any other key | A child instance |

Top-level fields worth knowing: `name` (required), `tree` (required), `servePort` (default 34872), `servePlaceIds` (only allow `rojo serve` to sync into these place IDs, which prevents syncing into the wrong place), `placeId` / `gameId`, `globIgnorePaths` (e.g. keep `**/*.spec.luau` out of a production build), `emitLegacyScripts` (default `true`: `.server`/`.client` files become `Script`/`LocalScript`; `false` emits `Script` with `RunContext`), and `syncbackRules`. Check the Rojo docs (https://rojo.space/docs/v7/project-format/) before using anything rarer.

Keep the mapping small and readable: the path on disk should tell you where code runs. Several targets (game, test place, plugin) each get their own `*.project.json`; pass the file to `rojo build` / `rojo serve`.

## 2. File → instance mapping

| Path on disk | Becomes |
|---|---|
| directory | `Folder` |
| `x.luau` (or legacy `.lua`) | `ModuleScript` `x` |
| `x.server.luau` | `Script` `x` |
| `x.client.luau` | `LocalScript` `x` (with `emitLegacyScripts` true, the default) |
| `dir/init.luau` | `ModuleScript` named `dir`; the directory's other entries become its children |
| `dir/init.server.luau` / `dir/init.client.luau` | `Script` / `LocalScript` named `dir`, with children |
| `x.model.json` | Instance(s) described in JSON, e.g. `{ "className": "RemoteEvent" }` |
| `x.rbxm` / `x.rbxmx` | Binary / XML model |
| `x.json` (not `.model.json`/`.project.json`/`.meta.json`) | `ModuleScript` returning the decoded table |
| `x.toml` | `ModuleScript` returning the decoded table |
| `x.csv` | `LocalizationTable` |
| `x.txt` | `StringValue` |
| `x.project.json` | Nested project, composed in place |
| `x.meta.json` | Metadata for the sibling `x.*` (see §3) |

`init.*` example:

```
src/shared/Inventory/
├── init.luau        → ModuleScript "Inventory"
├── add.luau         →   ModuleScript "add" (child of Inventory)
└── Types.luau       →   ModuleScript "Types"
```

Only one `init.*` file per directory. A bare `x.luau` placed in a client folder is a ModuleScript and does nothing until something `require`s it; use `x.client.luau` for an entry point. Match script type to container (no `init.client.luau` under `ServerScriptService`).

## 3. Meta files

`x.meta.json` attaches data to `x.luau` / `x.model.json` / folder `x`; `dir/init.meta.json` attaches to the directory instance itself.

```json
// src/shared/Sword/init.meta.json: the folder becomes a Tool
{ "className": "Tool", "properties": { "CanBeDropped": false }, "attributes": { "Damage": 10 } }
```

```json
// src/client/Debug.meta.json: ship the script disabled
{ "properties": { "Disabled": true } }
```

```json
// src/shared/Legacy.meta.json: don't delete Studio-made children under it
{ "ignoreUnknownInstances": true }
```

`className` only works in `init.meta.json` (a folder can become any class; a script file's class comes from its extension). `properties` and `attributes` work on any non-model file.

## 4. serve, build, sourcemap

- `rojo serve [project]`: live sync disk → Studio while the Rojo Studio plugin is connected. Install the plugin with `rojo plugin install` or from the Creator Store, version-matched to the CLI. Only disk → Studio: edits made in Studio to mapped instances are **not** written back and are overwritten on the next change/reconnect.
- `rojo build [project] -o build/place.rbxl` (or `.rbxm` for a model project): reproducible artifact for CI, cloud tests and publishing. Built place files are CI artifacts; don't commit them (binary diffs are useless).
- `rojo sourcemap [project] -o sourcemap.json --include-non-scripts`: maps instances to files so luau-lsp can resolve `require(ReplicatedStorage.Shared.X)` and instance paths. `--include-non-scripts` adds folders, models and data files, which code often indexes. Regenerate after adding/removing files, changing mounts or installing packages. Editors with the luau-lsp extension can autogenerate it (the kit template's `.vscode/settings.json` turns that on). Gitignored.

## 5. Converting an existing place: `rojo syncback`

Since Rojo 7.7.0, `rojo syncback` converts a saved Roblox file into files under the project's mapping. It's a one-time offline pull from a file, not live two-way sync.

1. The user saves the place to a file (File → Save to File As… → `place.rbxl`), or you build/download one.
2. Make sure the project file maps every subtree you want pulled (scripts in `ServerScriptService`, `ReplicatedStorage`, `StarterPlayer`, etc.). Instances outside mapped paths aren't written; tune what's included with `syncbackRules` in the project file.
3. Commit or stash first: syncback can rewrite and delete mapped files.
4. **Preview:** `rojo syncback --dry-run --list --input place.rbxl` (project defaults to the current directory). The file list goes to stdout; progress and the "Would write N files/folders and remove M" summary go to stderr.
5. Apply: `rojo syncback --input place.rbxl` (asks for confirmation; `-y`/`--non-interactive` skips the prompt; only with the user's go-ahead).
6. Review the git diff, run `check`, then `rojo serve` and confirm Studio matches.

For a place that is only open in Studio, an alternative is moving one service at a time: `script_read` each script via Studio MCP, write it under `src/`, sync, verify, then delete the Studio copy (see `new-project`).

## 6. Script Sync (Studio built-in) in detail

- Set per folder in Studio (Explorer → right-click → Sync to… → choose a directory). That's the user's action; afterwards you edit the files.
- Syncs only `Script`, `LocalScript`, `ModuleScript` and `Folder`. Scripts with attributes or tags are ignored, which Roblox warns can lose data around creates/deletes: don't sync those.
- File names: `x.luau` ModuleScript; `x.server.luau` Script (Server RunContext); `x.client.luau` Script (Client RunContext); `x.local.luau` LocalScript; `x.legacy.luau` Script (Legacy RunContext); `x.plugin.luau` Script (Plugin RunContext); `x/init.*.luau` a script with children.
- On start/resume with differences, Studio shows a Keep Studio vs Keep Disk dialog listing adds/modifies/deletes per side. It's a choice, not a merge; the user answers it.
- Limits: 10,000 scripts per top-level synced instance, 128 top-level synced instances. Concurrent editing of the same synced script in Team Create can overwrite each other.
- Roblox positions Script Sync as editing support, not a Rojo replacement: when files must be the full source of truth (data, models, CI builds), use Rojo. Script Sync alone doesn't give luau-lsp a sourcemap; the Luau Language Server Companion Studio plugin can supply live instance types.

## 7. Common mistakes

| Mistake | Fix |
|---|---|
| Editing a mapped script in Studio or with `multi_edit` | Edit the file; Rojo overwrites Studio |
| Two `init.*` files in one folder | One entry script per folder; use child modules |
| Server packages mounted only under `ReplicatedStorage` | Mount `ServerPackages` under a server container (see packages reference) |
| `Packages` mount fails before `wally install` | `"$path": { "optional": "Packages" }` |
| Stale sourcemap → luau-lsp "unknown require" | Regenerate (`rbx-check.mjs` does) |
| Committing `sourcemap.json`, `Packages/`, `*.rbxl` | Gitignore them |
| Running Rojo and Script Sync on the same folder | Pick one writer per script |
