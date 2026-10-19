# The feature loop

One feature at a time, from `todo` to `done` with evidence, then a commit. The loop is the same for systems, UI, world and content; only the verification kinds differ.

## Contents
1. Steps
2. Implementation patterns by category
3. Verification recipes
4. Evidence strings
5. When verification fails
6. Test and criteria integrity
7. Commit and progress

## 1. Steps

```
1. node <plan> next                → read the feature, its criteria, skills and spec_refs
2. node <plan> start <ID>
3. Read: the cited GAME_SPEC sections, the listed skills (SKILL.md, plus full.md parts you need),
   and the existing code the feature touches (owners first: reuse before adding)
4. Contract (3–6 lines in your head or PROGRESS.md): files to add/change, remotes, data fields,
   QA commands, which criterion each check proves
5. Implement: pure Logic + spec first, then server, client, UI/world, QA entries
6. Static: fix everything the edit hook reports; node tools/rbx-check.mjs --fix, then without --fix
7. Unit/engine: run the TestRunner; count must rise by the new specs, 0 failed
8. Playtest: the recipe for each playtest criterion (§3); clean up probes; stop play
9. Regression: re-run the full TestRunner; for M1+ also one quick pass of the core loop smoke test
10. node <plan> done <ID> --evidence "<AC>=<result>" … (one per criterion)
11. node <plan> guard ; git add -A ; git commit
12. Append a line to design/PROGRESS.md
```

`<plan>` is `tools/game-plan.mjs` in a scaffolded project (or `"${CLAUDE_PLUGIN_ROOT}/scripts/game-plan.mjs"`).

## 2. Implementation patterns by category

| Category | Pattern |
|---|---|
| `system` | `new-system` vertical slice: Types → `<Name>Logic` (pure, `Config`) + spec → remotes → server system (handler ladder, snapshot on join) → controller → QA commands → bootstrap registration |
| `data` | Change the template and add a migration step + fixture spec in the same feature; never change a field's meaning in place |
| `ui` | Theme tokens and shared components only; one screen module per screen; opened through the router; touch/gamepad/keyboard paths; text from a strings table if localization is in scope |
| `world` | Builder script per zone (`world-building.md`); geometry respects the spec's scale and movement limits; tags/attributes for anything a system reads |
| `content` | Data tables (stages, enemies, items) in `*Logic.Config` or `src/shared/Content/<Name>.luau`, validated by a spec (unique ids, monotonic curves, every reference resolves) |
| `juice` | Client-side only: tweens, particles, camera shake, sounds, number pop-ups, triggered by server snapshots or remote events; never gates gameplay. `roblox-animation-vfx`, `roblox-audio` |
| `monetization` | `Products.luau` names, `MarketplaceService` prompts from the client, `ProcessReceipt` on the server: idempotent (purchase id recorded in the profile before granting), grants through system APIs, returns `PurchaseGranted` only after the profile holds the grant |
| `social` | Server-side checks for every cross-player action; filter all player-written text (`TextService:FilterStringAsync`) before others see it |
| `analytics` | Events fire inside the function that changes the state they describe |

Load the feature's `skills` before writing code, and `roblox-security` + `roblox-networking` for any new remote.

## 3. Verification recipes

**Unit/engine (TestRunner).** Start a playtest, then `execute_luau` on `Server`:

```luau
local Tests = game:GetService("ServerStorage").Tests
local s = require(Tests.TestRunner).run(Tests)
local lines = { `{s.passed} passed, {s.failed} failed` }
for _, r in s.results do
	if not r.ok then
		table.insert(lines, `FAIL {r.name}: {r.err}`)
	end
end
return table.concat(lines, "\n")
```

Without Studio: `cloud_run_tests` (needs the API key and `testPlaceId`). Zero tests found is a failure.

**Playtest.** Follow `studio-mcp` and `roblox-testing`:

1. Write the assertion first (from the criterion's `then`).
2. `get_studio_state`; `start_stop_play` with `is_start: true`; wait for `[server] ready` / `[client] ready` in `get_console_output`.
3. Reach the `given` state with QA: `execute_luau` (Server) → `return game.ServerStorage.QA:Invoke("setStat", game.Players:GetPlayers()[1], "Stage", 4)`.
4. Perform the `when` like a player: `character_navigation` to a tagged target's position, `user_keyboard_input` / `user_mouse_input` for actions and UI. Use QA shortcuts only for the `given`, never for the `when`.
5. Assert the `then` on both sides: `execute_luau` (Server) returning the system snapshot; `execute_luau` (Client) returning UI text/visibility (`PlayerGui` paths); `get_console_output` for errors; `screen_capture` for anything visual.
6. Abuse criteria: from `execute_luau` (Client) fire the remote with forged arguments, then assert server state is unchanged and the console has no error spam.
7. `start_stop_play` with `is_start: false`; `get_studio_state` shows Edit; remove any probe instances.

**Multiplayer behaviour.** Studio MCP drives one client. Prove multi-player rules with engine tests on the pure logic (N players as data) and QA commands that simulate the other players' actions through the same system APIs (e.g. `QA:Invoke("simulateJoin", fakeUserId)` where the system supports a test stand-in). Note in PROGRESS.md which features should also get a real 2-player Studio test by the user (Test → Clients and Servers).

**Visual criteria.** `screen_capture` with an explicit camera position/target from the spec's hero angles; describe what the image shows against the criterion (zone present, colours match the palette, UI fits). A black capture means the Studio window is minimised: ask the user to restore it.

## 4. Evidence strings

One `--evidence` per criterion, specific enough that someone else could repeat it:

```
OBY-03-AC1=TestRunner 71 passed 0 failed incl. StageLogic.spec 'advance only to next stage' (4 cases)
OBY-03-AC2=playtest: QA setStat Stage=1; walked to Checkpoint2; Server Stage=2, leaderstats=2; reset → respawn 0.9 s at 3.1 studs from pad; no console errors
CORE-08-AC2=screenshots phone 390x844 and desktop 1920x1080: HUD inside safe area, coins counter top-left, 0 overlaps
```

## 5. When verification fails

1. Read the actual output (console, returned values, test failure text) before changing code.
2. Fix the cause in the implementation; re-run the failing check, then the full TestRunner.
3. After three distinct fix attempts on the same criterion, step back: re-read the spec section and the relevant skill, check assumptions with `docs_fetch`, simplify the approach. Then try again.
4. Mark a feature `blocked` (`game-plan.mjs block <ID> --reason "…"`) only when it needs something outside the build: Studio not connected, an asset id or product id only the user can provide, a quota decision. Move to the next ready feature; blocked ones are reported at the end.
5. If the spec itself is wrong (a number that can't work, a rule that contradicts another), make a revision (`game-spec` features-schema §6) with the reason, then continue.

## 6. Test and criteria integrity

- Never delete, skip or loosen a test or assertion to get green; never edit acceptance criteria outside a logged revision. `game-plan.mjs guard` fails the commit if requirements changed without a revision bump.
- A new spec should fail before the implementation exists (write it first, run it once).
- Tests target behaviour through public functions with the spec's numbers; no tests that only restate the implementation.
- Evidence is what you observed in this session after the final change. If code changed after a check ran, run it again.

## 7. Commit and progress

- One commit per feature: `<ID>: <title>` with a body listing the evidence summary. Include `design/features.json` and `design/PROGRESS.md` in the same commit.
- `design/PROGRESS.md` is the handoff log a fresh session reads first. Keep a short header and append entries:

```markdown
# Progress
Now: M2 · last done SIM-07 · next SIM-08 · blocked: SIM-15 (needs product ids)

## Log
- 2026-10-19 SIM-07 Pet equip slots — done; 3 slots, equip/unequip remote validated; tests 88/0
- 2026-10-19 SIM-08 started — notes: hatch animation uses ViewportFrame
```

Update the `Now:` line every time. Write down anything the next session needs that isn't obvious from code: half-finished work, workarounds, things to recheck.
