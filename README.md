# Roblox Agent Kit

One Claude Code plugin that gives the agent the whole Roblox toolchain:

| Piece | What Claude gets |
|---|---|
| `roblox-studio` MCP | Roblox Studio's **official built-in MCP server** (28 tools: script read/edit/grep, `execute_luau`, DataModel search/inspect, playtest start/stop, console output, screenshots, keyboard/mouse/character input, mesh/material/texture/procedural-model generation, Creator Store search/insert, Studio's own subagents and skills). A cross-platform launcher finds it on Windows and macOS. |
| `roblox-cloud` MCP | **Creator Docs** search + Markdown fetch (no setup), **Open Cloud Luau Execution** (headless server-side Luau), **cloud test runs**, **place upload/publish**, **read-only DataStore** inspection. Zero dependencies. |
| Hooks | After every `.luau` write/edit: **selene + luau-lsp strict type check** (Roblox definitions + Rojo sourcemap), with errors fed straight back to Claude. On session start: a status report (toolchain, Studio MCP, cloud config). |
| Skills | 39 skills (see below): the kit's own workflow skills plus the best community skill for each Roblox topic, fact-checked against the Creator Docs and fixed |
| Agent | `roblox-reviewer`: read-only reviewer for Luau changes (security, networking, data, performance, style) |
| Scripts | `rbx-new` (scaffold), `rbx-check` (StyLua, selene, luau-lsp, Rojo build), `opencloud` (CLI for CI), `refimage` (reference art via Codex CLI or image APIs, fitted to Roblox sizes) |
| Project template | Rojo layout, Rokit-pinned rojo 7.7.1 / wally 0.3.2 / luau-lsp 1.70.1 / selene 0.32.0 / StyLua 2.6.0 / lune 0.11.0, strict `.luaurc`, dependency-free test runner, `CLAUDE.md`, `roblox-kit.json`, VS Code settings, GitHub Actions CI |

## Skills

Claude loads these on demand; `roblox-kit` is the entry point and has the full index.

| Area | Skills |
|---|---|
| Kit workflow | `roblox-kit`, `roblox-get-started`, `studio-mcp`, `open-cloud`, `new-project`, `new-system`, `check`, `roblox-review`, `roblox-testing`, `roblox-tooling` |
| Luau | `roblox-luau-core`, `roblox-luau-types`, `roblox-luau-patterns`, `roblox-architecture`, `ecs-design`, `roblox-ts` |
| Server & data | `roblox-networking`, `roblox-security`, `roblox-data`, `roblox-server-data`, `roblox-performance` |
| Gameplay & presentation | `roblox-gui`, `roblox-input`, `roblox-camera`, `roblox-physics`, `roblox-npc-ai`, `roblox-characters`, `roblox-animation-vfx`, `roblox-building`, `roblox-lighting`, `roblox-audio`, `roblox-localization`, `roblox-reference-art` |
| Design & business | `roblox-game-design`, `roblox-player-psychology`, `roblox-growth-design`, `roblox-analytics`, `roblox-monetization`, `roblox-publish-checklist` |

## Requirements

- Claude Code, Node.js 18+
- Roblox Studio (Windows or macOS) for the Studio tools
- [Rokit](https://github.com/rojo-rbx/rokit) for the toolchain

## Install

```sh
claude plugin marketplace add <path-or-github-repo-of-this-folder>
claude plugin install roblox-agent-kit@roblox-agent-kit
```

Restart Claude Code, then check `/mcp` for `roblox-studio` and `roblox-cloud`. You can leave the optional settings empty when asked.

In Studio: **Assistant → ⋯ → Manage MCP Servers → Enable Studio as MCP server**. Don't *also* switch on Studio's "Quick connect → Claude Code" or install Roblox's own `roblox-studio` plugin, or Claude will see the Studio tools twice.

## Use

- New game: `/roblox-agent-kit:new-project my-game`
- Existing Rojo project: open Claude Code in it; the session-start hook detects it.
- Check everything: `/roblox-agent-kit:check --fix`
- Example asks: "add a coin pickup system with server-side validation, then playtest it and show me a screenshot", "why does player 12345's save have no inventory? (read the PlayerData DataStore)", "run the tests in the cloud".

## Open Cloud (optional)

Create a key at https://create.roblox.com/dashboard/credentials, restricted to your experience (and IP if you can), with only the scopes you need:

| Feature | Scope |
|---|---|
| `cloud_run_luau` | `universe.place.luau-execution-session:write` |
| `cloud_upload_place` | `universe-places:write` |
| `cloud_run_tests` | `universe-places:write` + `universe.place.luau-execution-session:write` |
| `datastore_list` / `_list_entries` / `_get_entry` | `universe-datastores.control:list`, `universe-datastores.objects:list`, `universe-datastores.objects:read` |

Set it via `/config` → Roblox Agent Kit (stored in the OS keychain) or `ROBLOX_API_KEY`. Put IDs in the project's `roblox-kit.json` (`universeId`, `placeId`, and a separate `testPlaceId` for cloud tests).

CI: projects created with `new-project` include `.github/workflows/ci.yml`. Checks run on every push. Cloud tests run when the repo has secret `ROBLOX_API_KEY` and variables `ROBLOX_UNIVERSE_ID` + `ROBLOX_TEST_PLACE_ID`.

## Settings

| Env var | Effect |
|---|---|
| `ROBLOX_AGENT_KIT_HOOK=off` | Disable the after-edit lint/type-check hook |
| `ROBLOX_STUDIO_MCP=<path>` | Use a specific `mcp.bat` / `StudioMCP` binary |

Roblox type definitions for luau-lsp are cached in `~/.roblox-agent-kit/` and refreshed weekly.

## Optional extras

- Reference art (`roblox-reference-art`): works with no setup if [Codex CLI](https://github.com/openai/codex) is installed and logged in (uses your ChatGPT plan). Alternatively set `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY` or `TOGETHER_API_KEY`.

- 3D modeling: a Blender MCP server (e.g. [ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp)) for Blender → FBX/OBJ → Studio
- Full test framework: swap the bundled `TestRunner` for Roblox's [Jest](https://github.com/Roblox/jest-roblox) via Wally (`roblox-testing` has an adapter that keeps `cloud_run_tests` working)

Don't also install the community skill packs the kit draws from; their content is already merged here with fixes, so you'd get duplicates and the original errors.

## Status

Tested on Windows 11 with Studio's MCP server, Rokit 1.2, and Node 24:
- Studio MCP handshake and tool listing
- Docs tools
- Scaffold + `rbx-check`
- Both hooks inside a live Claude Code session
- Reference art through Codex CLI 0.162 (generation and reference-image edits, fitted to 512×512)

Not yet tested:
- The Open Cloud tools (Luau Execution, upload, DataStores) against a real API key. They follow the documented endpoints and fail with clear errors.
- The macOS Studio path and CI workflow.

## Third-party content

Most skills adapt material from open-source skill packs. Each such skill folder has an `ATTRIBUTION.md` (source repo, path, commit, list of changes) and the upstream `LICENSE` (plus `NOTICE` for Apache-2.0 sources).

| Source | License |
|---|---|
| [TabooHarmony/roblox-brain](https://github.com/TabooHarmony/roblox-brain) | MIT |
| [MSayib/roblox-dev-skill](https://github.com/MSayib/roblox-dev-skill) | MIT |
| [m4bwav/roblox-agent](https://github.com/m4bwav/roblox-agent) | MIT |
| [ivar-anon/roblox-dev](https://github.com/ivar-anon/roblox-dev) | MIT |
| [afrxo/roblox-agent-skills](https://github.com/afrxo/roblox-agent-skills) | MIT |
| [christopher-buss/skills](https://github.com/christopher-buss/skills) | MIT |
| [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | Apache-2.0 |
| [Roblox/roblox-studio-agent-plugin](https://github.com/Roblox/roblox-studio-agent-plugin) | MIT |
| [Roblox/jest-roblox](https://github.com/Roblox/jest-roblox) | MIT |
| [JashanMaan28/imagegen-in-cc](https://github.com/JashanMaan28/imagegen-in-cc) | MIT |

`scripts/refimage.mjs` is a Node rewrite of imagegen-in-cc's dispatcher (see `skills/roblox-reference-art/ATTRIBUTION.md`). The rest of the kit (scripts, hooks, template, kit-owned skills) is MIT.
