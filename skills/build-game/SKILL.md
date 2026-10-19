---
name: build-game
description: "Build a complete Roblox game from a one-line pitch or an existing design/ spec: game-spec interview, Rojo scaffold, then every feature implemented, lint/type-checked, unit-tested, playtested in Studio and committed, through polish, review and a release report. Resumes across sessions. Use when the user wants an agent to make a whole game, or to continue a build in progress."
argument-hint: "<pitch | --resume> [--auto] [--mvp] [--dir <folder>]"
---

# Build a game

Takes a game from pitch to a verified, launch-ready Rojo project. The build is long: it runs across many context windows and sessions, so all state lives in files (`design/`, git), never only in the conversation.

```
pitch ─▶ game-spec ─▶ design/GAME_SPEC.md + design/features.json (approved)
      ─▶ scaffold (rbx-new) ─▶ M0 Foundation ─▶ M1 Core loop ─▶ M2 Progression
      ─▶ M3 Content, juice, FTUE ─▶ M4 Monetization, social, launch ─▶ release report
         each feature: next ▶ start ▶ implement ▶ check ▶ test ▶ playtest ▶ done ▶ commit
```

`<plan>` below means `node tools/game-plan.mjs` inside the project (or `node "${CLAUDE_PLUGIN_ROOT}/scripts/game-plan.mjs"` before scaffolding).

## Autonomy contract

Once the spec is approved, build without stopping for permission. Decide implementation details yourself from the spec, the recipe and the kit skills; record non-obvious choices in `design/DECISIONS.md`. Stop and ask only for:

1. Spec approval (interactive mode; skipped with `--auto`).
2. Outward-facing or irreversible actions: publishing, creating products/passes, writing to live DataStores, spending beyond the asset budget approved in spec §14.
3. Things only the user can do: open Studio / enable its MCP server, connect the Rojo plugin, restore a minimised Studio window, provide ids.

Everything else (bugs, failing tests, design gaps inside the spec's intent) you resolve.

## Phase 0: Preflight

1. Load `roblox-kit` (the loop, rules, skill index) and `studio-mcp`.
2. Find or choose the project directory: `--dir`, the current Rojo project, or a new folder named after the game.
3. Studio: `list_roblox_studios` (retry for ~30 s), pick the Studio with the target place, `get_studio_state`. The build needs a connected Studio for playtests: if none is connected, ask the user once to open Studio with a baseplate (or their place) and enable *Studio as MCP server*; `studio-mcp` and `roblox-get-started` cover fixes.
4. Rojo: after scaffolding, run `rojo serve` in the background (Bash `run_in_background`) from the project root and ask the user once to click **Connect** in Studio's Rojo plugin; confirm by checking `ServerScriptService.Server` exists via `inspect_instance`.
5. Capabilities, noted in PROGRESS.md: cloud tests (`cloud_config_status`), image generation for reference art (`node "${CLAUDE_PLUGIN_ROOT}/scripts/refimage.mjs" detect`).

## Phase 1: Spec

- `design/features.json` exists → this is a resume: go to "Session start" below.
- Otherwise load `game-spec` and run it with the pitch and flags (`--auto`, `--mvp`). It writes `design/GAME_SPEC.md`, `design/features.json`, `design/DECISIONS.md` and gets approval. Write `design/PROGRESS.md` with the header line.

## Phase 2: Scaffold

If the directory isn't a Rojo project: `node "${CLAUDE_PLUGIN_ROOT}/scripts/rbx-new.mjs" <dir> --name <name>` (it accepts a folder holding only `design/`). Then `node tools/rbx-check.mjs`, `<plan> validate`, and the first commit: `Scaffold <game> and add game spec`. Then connect Rojo (Preflight step 4). Existing project: keep its conventions; the CORE features adapt to what's there.

## Phase 3: Build loop

Work features strictly one at a time in `<plan> next` order, following [references/feature-loop.md](references/feature-loop.md):

```
next → start → read spec refs + skills + existing code → implement (Logic+spec first)
→ rbx-check → TestRunner → playtest each criterion → regression → done --evidence → guard → commit → PROGRESS.md
```

- M0 features: [references/foundation.md](references/foundation.md). CORE-00 creates the style profile and reference images everything is built toward: [references/art-direction.md](references/art-direction.md). World, terrain, lighting and assets: [references/world-building.md](references/world-building.md).
- Every `visual` criterion goes to an independent judge subagent that captures the shot and scores it against the reference: [references/visual-review.md](references/visual-review.md).
- Genre systems: the recipe named in the spec header (`${CLAUDE_PLUGIN_ROOT}/skills/game-spec/references/genres/<genre>.md`) has the tricky-part notes, QA commands and playtest scripts for this genre; read the relevant section before each genre feature.
- After the last feature of each milestone: the milestone gate in [references/milestones-and-release.md](references/milestones-and-release.md).
- Use the task list for the current feature's steps; `features.json` stays the source of truth.
- Delegate read-only work (searching a large codebase, the `roblox-reviewer` audit) to subagents; keep Studio-driving and edits in the main session (one Studio, one writer).

## Session start (every new session or after a context reset)

1. `cat design/PROGRESS.md`; `<plan> status`; `git log --oneline -15`; `git status`.
2. Uncommitted changes: inspect them against the in-progress feature. Finish and verify them, or revert them deliberately (`git restore`), never commit unverified work as done.
3. Preflight steps 3–4 (Studio and Rojo connected).
4. `node tools/rbx-check.mjs` and the full TestRunner; then the core-loop smoke test if M1 is done. Fix any regression before new work.
5. Continue with `<plan> next`.

## Phase 4: Release

M4 ends with the LAUNCH features: reviewer pass, performance budget, store art, a fresh-player full-journey playtest, and `design/RELEASE.md` ([milestones-and-release.md §5](references/milestones-and-release.md#5-launch-readiness-m4)). Then give the final report ([§6](references/milestones-and-release.md#6-final-report)). Don't publish unless the user explicitly asks in this conversation.

## Guardrails

- **Done means evidence.** A feature is `done` only through `<plan> done` with one evidence string per acceptance criterion, observed after the final code change. Never write status or evidence into `features.json` by hand.
- **Requirements are frozen.** Never edit criteria, delete tests or loosen assertions to get green. A wrong spec gets a revision (`game-spec` features-schema §6) with the reason; `<plan> guard` runs before every commit.
- **One feature in progress.** Finish, or `block` with a reason, before starting another.
- **Aim at the references.** Look-changing work starts from its reference image in `art/refs/` and isn't done until the judge passes it; the builder never grades its own screenshots.
- **Verify like a player.** QA commands set up the `given`; the `when` is done through character, keyboard, mouse and UI input. Assert on server state, client state and console, plus screenshots for visuals.
- **Kit rules apply everywhere:** server authority and validated remotes, `--!strict`, ProfileStore Mock in Studio, `task` library, cleanup, reuse before adding (`roblox-kit`).
- **Clean every experiment.** Stop playtests, remove probes and temporary parts, keep `Workspace.World` owned by the builders.
- **Commit per feature** with the evidence summary; tag milestones. The repo must always build and pass tests at every commit.
- **Report honestly.** Blocked features, unrun checks and things only the user can do go in PROGRESS.md and the final report.
