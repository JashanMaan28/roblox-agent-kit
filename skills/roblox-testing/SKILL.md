---
name: roblox-testing
description: "Testing Roblox games: pure logic plus thin shell, the kit TestRunner (Studio or cloud_run_tests), Jest Roblox, cheat remotes for QA, Studio MCP playtests, multiplayer checks. Use when writing tests or deciding how to verify a change."
---

# Roblox testing and QA

Roblox games are stateful, networked and hard to test from outside. The strategy: make logic **pure** where possible (unit-testable anywhere), keep the Roblox **shell thin**, and build **gated QA tooling** to reach every other state quickly. Then climb the verification ladder only as far as the change needs, and say which rung you reached.

## Verification ladder (what each runtime can prove)

| Rung | Run with | Proves | Cannot prove |
|---|---|---|---|
| 1. Static | PostToolUse hook; `check` skill (`rbx-check.mjs`) | Builds, types, lint, format | Behaviour |
| 2. Unit (pure logic) | TestRunner in Studio or `cloud_run_tests` (Lune also works for modules with no Roblox APIs) | Formulas, state machines, validators, migrations | Anything engine-dependent |
| 3. Engine | TestRunner/Jest on a real server: Studio playtest (`execute_luau` Server) or Open Cloud (`cloud_run_tests`) | Services, DataModel, instance setup, DataStores in a test universe | Input, rendering, multi-client |
| 4. Playtest (agent) | Studio MCP: `start_stop_play`, input tools, console, screenshots | Real single-client flow, UI, client/server interplay | Multiple players, real latency |
| 5. Multiplayer | Studio Test → Server & Clients (user starts it), or a team test | Replication, join order, ownership | Feel |
| 6. Human | A person playing | Feel, fun, readability | – |

Rules: gate on counts, not exit codes (**zero tests found = broken setup, not a pass**); never report a lower rung as a higher one; say what's still owed (e.g. "multi-client test not run").

## Design for testability: pure core, thin shell

Logic that touches no Roblox APIs can be tested anywhere, including CI:

```luau
--!strict
-- src/shared/LevelCurve.luau (pure: numbers in, numbers out)
local LevelCurve = {}

function LevelCurve.xpForLevel(level: number): number
	return math.floor(100 * level ^ 1.5)
end

function LevelCurve.levelFromTotalXp(xp: number): number
	local level = 1
	while xp >= LevelCurve.xpForLevel(level + 1) do
		level += 1
	end
	return level
end

return LevelCurve
```

- Push damage formulas, drop/pity tables, economy math, level curves, validation predicates and data migrations into pure modules under `src/shared` (or `src/server` if secret). Services, instances and remotes stay thin and are tested by playing.
- **Inject nondeterminism:** pure modules take `rng: () -> number` (or a `Random` object) and `now: () -> number` as parameters. Tests pass a seeded `Random.new(42)`; gameplay passes the real thing. Never call `math.random`/`os.clock` inside a formula under test.
- Inject collaborators (a `services` table, a fake DataStore) through parameters instead of monkey-patching globals.
- Test first where silent bugs cost most: money math, data migrations (every step against fixture profiles, see `roblox-data`), drop/pity tables, remote validation predicates.

## The kit's TestRunner

Kit projects (`new-project`) map `tests/` → `ServerStorage.Tests`, containing `TestRunner.luau` and `*.spec.luau` modules. A spec returns a function that receives `t`:

```luau
--!strict
-- tests/LevelCurve.spec.luau
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local LevelCurve = require(ReplicatedStorage.Shared.LevelCurve)

return function(t: any)
	t.test("starts at level 1 with 0 xp", function()
		t.expect(LevelCurve.levelFromTotalXp(0)).toBe(1)
	end)

	t.test("is consistent with xpForLevel at every boundary", function()
		for level = 2, 50 do
			local xp = LevelCurve.xpForLevel(level)
			t.expect(LevelCurve.levelFromTotalXp(xp)).toBe(level)
			t.expect(LevelCurve.levelFromTotalXp(xp - 1)).toBe(level - 1)
		end
	end)
end
```

Matchers: `toBe` (`==`), `toEqual` (deep table equality), `toBeTruthy`, `toThrow` (pass a function: `t.expect(function() parse("bad") end).toThrow()`). Property-style loops (like the boundary check) catch formula bugs far better than single values.

**Run in Studio** (start a playtest first; the Server datamodel only exists during play):

```luau
-- execute_luau, datamodel_type "Server"
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

**Run headless:** `cloud_run_tests` (builds with Rojo, uploads a Saved version of the test place, runs the same runner on a Roblox server; CLI: `node tools/rbx-cloud.mjs test`). Read the `N passed, M failed` log line and fail on `N + M == 0`. Setup and limits: `open-cloud`.

## Upgrade path: Jest Roblox

When a project outgrows the TestRunner (needs `describe`/`beforeEach`, mocks, `.each`, snapshots, timers), move to Jest Roblox, the Luau port of Jest 27 that Roblox maintains (MIT). Its Wally packages are `roblox/jest` + `roblox/jest-globals` (3.20.x); `jsdotlua/jest` + `jsdotlua/jest-globals` 3.10.0 are the older community releases of the same API. Setup, runner script, Luau deviations (`.never`, `jest.fn()` returning two values) and the `LoadStringEnabled` requirement: [references/jest-roblox.md](references/jest-roblox.md). TestEZ is archived: keep it only where a project already uses it.

## Gated cheat remotes (reach live states fast)

`require` from the Studio command bar (and, likely, from `execute_luau`) gets a **separate module instance** from the running game: mutating it doesn't change live state. For state-dependent QA, use server-side QA commands:

```luau
--!strict
-- src/server/QACommands.luau
local RunService = game:GetService("RunService")

local QA_USER_IDS: { [number]: true } = {
	-- [12345678] = true,
}

local function isAuthorized(player: Player): boolean
	return RunService:IsStudio() or QA_USER_IDS[player.UserId] == true
end
-- Every handler starts with: if not isAuthorized(player) then return end
```

- The gate lives **server-side in every handler**; hiding the UI is not a gate (any client can fire any remote, see `roblox-security`).
- Handlers call the **same system APIs** as gameplay (`Economy.addCoins(player, n)`), never raw data, or you're testing a path players never run.
- Cover: grant/remove currency and items, set progression, trigger rare events (pity thresholds, level-ups), spawn/clear NPCs, god mode, **reset profile to default**.
- **Agent access:** `execute_luau` on the Server datamodel sees the live DataModel (instances, attributes, players), but a `require` from it can return a separate module copy, like the command bar. Let the QA module also serve its commands through a Studio-only `BindableFunction`; the handler runs inside the game's own module instances:

```luau
-- in QACommands, after defining `commands: { [string]: (Player, ...any) -> any }`
if RunService:IsStudio() then
	local qa = Instance.new("BindableFunction")
	qa.Name = "QA"
	qa.OnInvoke = function(command: string, player: Player, ...: any)
		local handler = commands[command]
		assert(handler, `unknown QA command {command}`)
		return handler(player, ...)
	end
	qa.Parent = game:GetService("ServerStorage")
end
-- from execute_luau (Server, during a playtest):
-- return game.ServerStorage.QA:Invoke("Economy.addCoins", game.Players:GetPlayers()[1], 500)
```

When you implement a gameplay system, also produce its QA command entries and specs for its pure logic (`new-system` scaffolds both).

## Playtest automation with Studio MCP

Details and safety: `studio-mcp`. The pattern:

1. State the assertion first ("buying the sword deducts 100 coins and equips it").
2. `start_stop_play` (`is_start: true`); `get_studio_state` to confirm Server/Client exist.
3. Reach the state through the game's own code: `execute_luau` (Server) calling `game.ServerStorage.QA:Invoke(...)`, not `require` of a system module.
4. Drive the player: `character_navigation` (Client), `user_keyboard_input`, `user_mouse_input` (can target a UI instance path).
5. Assert: `execute_luau` on Server and Client returning one summary string; `get_console_output` for errors; `screen_capture` for visuals.
6. Stop (`is_start: false`), confirm with `get_studio_state`, remove temporary probes, report values and log lines.

Never write persistence from a playtest probe: with Studio API access on, the Server datamodel reaches live DataStores.

## Multiplayer checks (rung 5; the user runs them)

- **Server & Clients** with 2+ players catches replication assumptions: state never replicated, remotes assuming one player, UI showing A's data to B.
- **Join order both ways:** works when A joins before B *and* after. Late-joiner sync is the most common multiplayer bug; every system needs a "send full snapshot on join" path, not just incremental updates.
- **Leave/rejoin mid-interaction** (trade, dungeon, open shop): cleanup and session locks break only in these windows.
- **Streaming:** with StreamingEnabled, walk a client far away and back; does the system survive its instances streaming out and in?

## Bug reproduction discipline

1. Reach the exact state with QA commands (level, items, currency) in seconds instead of grinding.
2. Add a temporary `print`/`warn` with context (player, values, branch taken) at the suspect boundary, reproduce, read `get_console_output`, then remove it. (`debug.profilebegin`/`profileend` only label MicroProfiler regions; use them for performance questions, not logging.) For breakpoints, `skill` → `rbx-debug`.
3. Fix, then add the cheapest permanent guard: an assertion, a validation check, or a spec for the pure logic.

## Review red flags

| Red flag | Problem |
|---|---|
| "Run this in the command bar" to test live state | Separate module instance; results are fiction. Use QA commands (via the `QA` BindableFunction from `execute_luau`) |
| QA remotes gated only by hiding UI | Any client can fire them; gate server-side (UserId + `IsStudio`) |
| QA handlers mutating raw data tables | Bypasses real code paths; call system APIs |
| Economy/drop math inline in event handlers | Untestable; extract to pure modules with specs |
| `math.random` inside formulas under test | Inject the RNG |
| "Tests pass" with 0 tests run | Broken mapping or naming; fix the setup |
| Multiplayer feature shipped without a multi-client test | Late-join and replication bugs |
