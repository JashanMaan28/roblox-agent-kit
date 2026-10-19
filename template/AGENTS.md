# {{name}}

Roblox experience built with Rojo. Files on disk are the source of truth; Studio is a live view.

## Layout
- `src/shared` → `ReplicatedStorage.Shared` (server + client)
- `src/server` → `ServerScriptService.Server` (server only)
- `src/client` → `StarterPlayer.StarterPlayerScripts.Client`
- `tests` → `ServerStorage.Tests` (`*.spec.luau` + `TestRunner.luau`)
- `world` → `ServerStorage.WorldBuilders` (optional: map/terrain/lighting builder modules that build `Workspace.World`)
- `Packages` → `ReplicatedStorage.Packages` (Wally; never edit by hand)

## Rules
- Every file starts with `--!strict`. Use `game:GetService`, never `game.Workspace`-style service access.
- The server is authoritative. Validate every RemoteEvent/RemoteFunction argument on the server (type, range, rate, ownership). Never trust client-sent prices, damage, positions or IDs.
- Wrap DataStore calls in `pcall` with retries; save on `PlayerRemoving` and `game:BindToClose`.
- Sync route: Rojo (`default.project.json`; files are the source of truth). Edit scripts only on disk; never edit a script that lives in this repo from Studio or with `multi_edit` (Rojo won't write it back and the next sync overwrites it). Studio-only content (maps, models, UI built in Studio) is edited through the Studio MCP tools. One writer per script.
- Toolchain versions are pinned in `rokit.toml`. Run tools from the repository root (Rokit only resolves them where the manifest lists them).
- Check unfamiliar or recently-changed APIs with `docs_search` / `docs_fetch` before using them.

## Game design and build plan
If `design/` exists, the game is specified there and built feature by feature:
- `design/GAME_SPEC.md` – the design (source of truth for rules, numbers, systems)
- `design/features.json` – the build plan; change status only with `node tools/game-plan.mjs` (`next`, `start`, `done`, `block`), and requirements only through a spec revision
- `design/PROGRESS.md` – read first when resuming; append a line after each feature
- `design/DECISIONS.md` – interview answers, assumptions, approvals, revisions

## Commands
- `rojo serve` – live-sync into Studio (Rojo plugin must be connected)
- `node tools/rbx-check.mjs [--fix]` – StyLua, selene, luau-lsp types, Rojo build
- `node tools/rbx-cloud.mjs test` – run `tests/` on Roblox servers via Open Cloud (needs `ROBLOX_API_KEY` + `roblox-kit.json`)
- `wally install` – install packages from `wally.toml`
- `node tools/game-plan.mjs status` – build progress (`validate`, `next`, `guard` before committing plan changes)

## Definition of done
1. `node tools/rbx-check.mjs` passes.
2. Tests pass (Studio: `execute_luau` running `require(game.ServerStorage.Tests.TestRunner).run(game.ServerStorage.Tests)`, or `rbx-cloud test`).
3. For gameplay changes: playtested via Studio MCP (start play, check console output, screenshot).
