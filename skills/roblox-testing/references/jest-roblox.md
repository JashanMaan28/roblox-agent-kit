# Jest Roblox in a kit project (Luau)

Loaded on demand from `../SKILL.md`. Checked 2026-10-18 against the Jest Roblox repository and docs (https://github.com/Roblox/jest-roblox, docs at https://roblox.github.io/jest-roblox/) and the community distribution (https://github.com/jsdotlua/jest-lua, docs at https://jsdotlua.github.io/jest-lua/). The adapter below is kit-authored and has not been run end-to-end; verify on first use.

## Which package

| Wally package | Status |
|---|---|
| `roblox/jest` + `roblox/jest-globals` (`^3.20.0`, 3.20.1 latest) | Maintained by Roblox, MIT, published to Wally since July 2026; runs in Studio and in Open Cloud Luau Execution. **Prefer this.** |
| `jsdotlua/jest` + `jsdotlua/jest-globals` (`3.10.0`, Dec 2024) | Earlier community release of the same code and API. Fine for existing projects; no newer releases |

Both are a Luau port of Jest 27.4.7. Any project already on one should stay on it unless the user wants to move.

## 1. Install

```toml
# wally.toml
[dev-dependencies]
Jest = "roblox/jest@^3.20.0"
JestGlobals = "roblox/jest-globals@^3.20.0"
```

`wally install` puts them in `DevPackages/`. Mount that folder and enable `LoadStringEnabled` in a **separate test project file**, so neither ships in the production build. Jest loads each spec module through `debug.loadmodule` when the context allows it and falls back to `loadstring` otherwise (game-server contexts such as Open Cloud tasks), and without `LoadStringEnabled` every suite fails with "loadstring() is not available".

```json
// test.project.json: default.project.json plus the test-only bits
{
  "name": "my-game-tests",
  "tree": {
    "$className": "DataModel",
    "ReplicatedStorage": {
      "Shared": { "$path": "src/shared" },
      "Packages": { "$path": { "optional": "Packages" } },
      "DevPackages": { "$path": "DevPackages" }
    },
    "ServerScriptService": {
      "$properties": { "LoadStringEnabled": true },
      "Server": { "$path": "src/server" }
    },
    "ServerStorage": {
      "Tests": { "$path": "tests" }
    },
    "StarterPlayer": {
      "StarterPlayerScripts": {
        "Client": { "$path": "src/client" }
      }
    }
  }
}
```

For Studio runs, sync `test.project.json` (`rojo serve test.project.json`) into a **test place**, not the production place.

## 2. Config and specs

`tests/jest.config.luau` becomes a ModuleScript named `jest.config` in `ServerStorage.Tests`:

```luau
return {
	testMatch = { "**/*.spec" },
}
```

A spec (`tests/LevelCurve.spec.luau`). Everything comes from `JestGlobals` explicitly; there are no implicit globals:

```luau
--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local JestGlobals = require(ReplicatedStorage.DevPackages.JestGlobals)
local describe = JestGlobals.describe
local it = JestGlobals.it
local expect = JestGlobals.expect
local jest = JestGlobals.jest

local LevelCurve = require(ReplicatedStorage.Shared.LevelCurve)

describe("levelFromTotalXp", function()
	it("starts at level 1", function()
		expect(LevelCurve.levelFromTotalXp(0)).toBe(1)
	end)

	it("never goes below 1", function()
		expect(LevelCurve.levelFromTotalXp(-50)).never.toBeLessThan(1)
	end)
end)

describe("mocks", function()
	it("records calls", function()
		local mock, mockFn = jest.fn()
		mockFn(3)
		expect(mock).toHaveBeenCalledWith(3)
	end)
end)
```

Luau deviations from JavaScript Jest worth remembering:

- `.never` replaces `.not` (`not` is a keyword).
- `jest.fn()` returns two values: the mock object (a callable table, used in `expect`) and a plain forwarding function (pass this where real code requires a function).
- `.toBeFalsy()` passes only for `false`/`nil` (`0` is truthy); prefer `.toBeNil()` / `.never.toBeNil()`.
- `test.each` takes a list of tables or a `'a | b | expected'` header string instead of tagged templates.
- `.toMatch` / `expect.stringMatching` take Luau string patterns (or Jest's RegExp).
- Also available: `beforeEach`/`afterEach`/`beforeAll`/`afterAll`, `describe.each`, `test.only`/`skip`/`todo`, `jest.useFakeTimers()`, snapshots, `.toMatchInstance(props)` for Roblox instances.

## 3. Keep the kit's `run(root)` contract

The kit's `cloud_run_tests`, `tools/rbx-cloud.mjs test`, CI and docs all call `require(ServerStorage.Tests.TestRunner).run(ServerStorage.Tests)` and read `passed` / `failed` / `results`. Replace `tests/TestRunner.luau` with an adapter so all of that keeps working, and migrate every spec at once (the old runner would report Jest-style specs as "failed to load", and vice versa):

```luau
--!strict
-- tests/TestRunner.luau: Jest-backed adapter that keeps the kit's TestRunner.run(root) contract.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Jest = require(ReplicatedStorage.DevPackages.Jest)

export type Result = { name: string, ok: boolean, err: string? }
export type Summary = { passed: number, failed: number, results: { Result } }

local TestRunner = {}

function TestRunner.run(root: Instance): Summary
	local status, result = Jest.runCLI(root, { verbose = false, ci = true }, { root }):awaitStatus()
	if status == "Rejected" then
		return { passed = 0, failed = 1, results = { { name = "jest", ok = false, err = tostring(result) } } }
	end
	local r = result.results
	local failed = r.numFailedTests
	local results: { Result } = {}
	if r.numFailedTestSuites > 0 and r.numFailedTests == 0 then
		-- A suite that fails to load reports no failed tests; count it so it can't pass silently.
		failed += r.numFailedTestSuites
		table.insert(results, { name = "jest", ok = false, err = `{r.numFailedTestSuites} suite(s) failed to run; see the output` })
	end
	return { passed = r.numPassedTests, failed = failed, results = results }
end

return TestRunner
```

Jest prints per-test failures to the output/logs itself; the adapter returns the counts. `numPassedTests`, `numFailedTests`, `numFailedTestSuites` and `numTotalTests` are the AggregatedResult fields the Jest Roblox docs' runner scripts use; `result.results.success` is the overall flag.

## 4. Running

- **Studio:** sync `test.project.json` into a test place, start a playtest, then `execute_luau` (Server) with the same snippet as the kit runner in `../SKILL.md`.
- **Open Cloud:** `cloud_run_tests` with `project: "test.project.json"` (uploads a Saved version of the test place and runs `TestRunner.run`). CLI: `node tools/rbx-cloud.mjs test --project test.project.json`.
- **Zero tests:** if `passed + failed == 0`, the mapping, `testMatch` or `jest.config` is wrong. That's a failure.

`run-in-roblox` and `roblox-cli` appear in older Jest docs; this kit uses Studio MCP and Open Cloud instead.
