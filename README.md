# Roblox Agent Kit

One Claude Code plugin that gives the agent the whole Roblox toolchain, and can take a one-line game idea to a tested, playtested Roblox game ([Make a game from one prompt](#make-a-game-from-one-prompt)):

| Piece | What Claude gets |
|---|---|
| `roblox-studio` MCP | Roblox Studio's **official built-in MCP server** (28 tools: script read/edit/grep, `execute_luau`, DataModel search/inspect, playtest start/stop, console output, screenshots, keyboard/mouse/character input, mesh/material/texture/procedural-model generation, Creator Store search/insert, Studio's own subagents and skills). A cross-platform launcher finds it on Windows and macOS. |
| `roblox-cloud` MCP | **Creator Docs** search + Markdown fetch (no setup), **Open Cloud Luau Execution** (headless server-side Luau), **cloud test runs**, **place upload/publish**, **read-only DataStore** inspection. Zero dependencies. |
| Hooks | After every `.luau` write/edit: **selene + luau-lsp strict type check** (Roblox definitions + Rojo sourcemap), with errors fed straight back to Claude. On session start: a status report (toolchain, Studio MCP, cloud config, and the progress of any game build in the folder). |
| Skills | 41 skills (see below): the kit's own workflow skills, including a pitch-to-game pipeline, plus the best community skill for each Roblox topic, fact-checked against the Creator Docs and fixed |
| Agent | `roblox-reviewer`: read-only reviewer for Luau changes (security, networking, data, performance, style) |
| Scripts | `rbx-new` (scaffold), `rbx-check` (StyLua, selene, luau-lsp, Rojo build), `opencloud` (CLI for CI), `refimage` (reference art via Codex CLI or image APIs, fitted to Roblox sizes), `game-plan` (validates and tracks a game's feature plan; refuses "done" without evidence, visual checks without a passing judge verdict, and requirement edits without a spec revision) |
| Project template | Rojo layout, Rokit-pinned rojo 7.7.1 / wally 0.3.2 / luau-lsp 1.70.1 / selene 0.32.0 / StyLua 2.6.0 / lune 0.11.0, strict `.luaurc`, dependency-free test runner, `AGENTS.md` (imported by `CLAUDE.md`), `roblox-kit.json`, VS Code settings, GitHub Actions CI |

## Skills

Claude loads these on demand; `roblox-kit` is the entry point and has the full index.

| Area | Skills |
|---|---|
| Kit workflow | `roblox-kit`, `roblox-get-started`, `studio-mcp`, `open-cloud`, `new-project`, `new-system`, `check`, `roblox-review`, `roblox-testing`, `roblox-tooling` |
| Whole-game pipeline | `game-spec` (pitch → interview → game design + build plan, with recipes for obby, tycoon, simulator, tower defense, RPG, battlegrounds, horror, roleplay, round-based), `build-game` (generates reference art for the look, then builds the plan feature by feature: implement, check, test, Studio playtest, an independent judge scoring screenshots against the references, commit; resumes across sessions) |
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
claude plugin marketplace add JashanMaan28/roblox-agent-kit
claude plugin install roblox-agent-kit@roblox-agent-kit
```

Restart Claude Code, then check `/mcp` for `roblox-studio` and `roblox-cloud`. You can leave the optional settings empty when asked.

In Studio: **Assistant → ⋯ → Manage MCP Servers → Enable Studio as MCP server**. Don't *also* switch on Studio's "Quick connect → Claude Code" or install Roblox's own `roblox-studio` plugin, or Claude will see the Studio tools twice.

## Make a game from one prompt

`build-game` turns an idea into a finished, launch-ready Rojo project. It designs the game with you, makes reference art for the look, then builds every feature and proves each one works before committing it: lint, type check, unit tests, a Studio playtest, and for anything visual an independent judge comparing screenshots to the reference art. It can run for hours and picks up where it left off in a new session.

### Before you start

- The plugin installed (above) and [Rokit](https://github.com/rojo-rbx/rokit) on your PATH.
- Roblox Studio open with a **baseplate** (File → New → Baseplate) and **Enable Studio as MCP server** switched on. Keep the Studio window visible, not minimised: screenshots of a minimised window come out black.
- The Rojo plugin in Studio (`rojo plugin install`, or from the Creator Store).
- Optional, for reference art: [Codex CLI](https://github.com/openai/codex) logged in, or one of `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`, `TOGETHER_API_KEY`. Without one, the build works from written art direction instead of images.
- Optional, for headless cloud tests: an Open Cloud key (see [Open Cloud](#open-cloud-optional)).

### 1. Start it

Make an empty folder, open Claude Code in it, and describe the game:

```
/roblox-agent-kit:build-game "tycoon where you run a candy factory on a floating island"
```

| Flag | Effect |
|---|---|
| `--auto` | No questions: genre defaults fill every gap and are listed in `design/DECISIONS.md` |
| `--mvp` | Smaller first build: foundation, core loop and progression (M0–M2) instead of the full launch build (M0–M4) |
| `--dir <folder>` | Build somewhere other than the current folder |

A good pitch names the genre (or a game it's like), the fantasy, and the one twist that makes it different: *"obby where the lava rises every 30 seconds and you can buy jetpacks"*, *"tower defense with cats defending a fish market"*, *"co-op horror in an abandoned mall, 4 players, mild scares"*. Built-in recipes cover obby, tycoon, simulator, tower defense, RPG, battlegrounds/PvP, horror, roleplay and round-based games; hybrids and other genres work too.

### 2. Answer a few questions

Up to about 10 multiple-choice questions in 2–3 rounds: scope, art style, how it makes Robux, what assets it may use (Studio's AI generation, Creator Store models, how many reference images), then the genre questions that matter most (for a tycoon, things like plot assignment and rebirth depth). Each has a recommended answer; pick it if you don't care.

### 3. Approve the design

You get a one-screen summary: the core loop, features per milestone, the save data, products and prices, the main assumptions, and a generated mood board showing the look. Approve it or say what to change. After this the build doesn't stop to ask about anything you already approved.

It writes:

| File | What |
|---|---|
| `design/GAME_SPEC.md` | The full design: loops, rules, systems, data, economy, world, UI, onboarding, monetization |
| `design/features.json` | The build plan: 30–60 features, each with the checks that prove it works |
| `design/DECISIONS.md` | Your answers, the defaults it chose, approvals, later changes |
| `design/PROGRESS.md` | The running log: current feature, visual debt, anything it needs from you |
| `art/refs/` | Reference images the game is built toward, with the camera angle for each |

### 4. Connect Rojo once

It scaffolds the project, starts `rojo serve`, and asks you to click **Connect** in Studio's Rojo plugin. That's the last thing it needs from you for a while.

### 5. Let it build

It works through the plan one feature at a time, milestone by milestone:

| Milestone | What gets built |
|---|---|
| M0 Foundation | Art direction and reference images, bootstrap, remotes and validation, player data, QA commands, world blockout, lighting, UI shell, input, analytics, audio |
| M1 Core loop | The moment-to-moment game, playable end to end |
| M2 Progression | Upgrades, unlocks, rebirth, collections: the reasons to keep playing |
| M3 Content and polish | Full content, juice and sound, onboarding, mobile and gamepad |
| M4 Launch | Monetization, social and retention features, security review, performance, store art, release report |

Every feature gets its own commit with its evidence in the message, and each milestone is tagged (`milestone/M1`, …). You can watch Studio while it plays the game.

- **Check progress** any time: `node tools/game-plan.mjs status`, or read `design/PROGRESS.md`.
- **Steer it** by just saying so ("make the lava more orange", "drop trading"). Design changes go through a spec revision, so finished work affected by the change gets verified again.
- **Save the place** in Studio when it reminds you at each milestone: the built world lives in the place file, and the scripts that rebuild it live in git.

### 6. Continue in a later session

Open Claude Code in the same folder. The session-start message shows the build status; say "continue" (or run `/roblox-agent-kit:build-game` again). It re-reads the progress log, checks everything still passes, and carries on with the next feature.

### 7. Ship it

The build ends with `design/RELEASE.md`: a READY / NOT READY verdict per release gate, plus the few things only you can do:

1. Save the place, then publish from Studio (File → Publish to Roblox).
2. Create the listed game passes and developer products and paste their IDs into `src/shared/Products.luau` (or ask it to create them through Open Cloud).
3. Fill in the Maturity & Compliance questionnaire; the report gives the expected label and why.
4. Upload the icon and thumbnails from `art/marketing/`.

It never publishes, creates products or touches live player data unless you ask in that conversation.

### Just the design

`/roblox-agent-kit:game-spec "<pitch>"` runs only the interview and writes the `design/` files. Edit them by hand if you like (`node tools/game-plan.mjs validate` checks the plan), then run `build-game` to build it. Run `game-spec` again on a finished game to add content or systems: it revises the spec and plan, and `build-game` builds the new parts.

## Other ways to use it

- New empty project: `/roblox-agent-kit:new-project my-game`
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
- A full `build-game` run against a live Studio session, including the judge's Studio captures. The `game-plan` script (with its evidence rules), the scaffold changes and the session-start build status were tested on their own.

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
