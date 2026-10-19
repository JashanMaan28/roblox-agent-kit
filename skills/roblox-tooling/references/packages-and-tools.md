# Packages, toolchain, lint/type/format, Lune, test runtimes

Loaded on demand from `../SKILL.md`. CLI flags were checked against the kit's pinned versions on 2026-10-18 (Rokit 1.2.0, Wally 0.3.2, luau-lsp 1.70.1, selene 0.32.0, StyLua 2.6.0, Lune 0.11.0). Parts are adapted from MIT-licensed community skills; see `../ATTRIBUTION.md`.

## 1. Rokit (tool versions)

`rokit.toml` pins exact tool versions per project; commit it. Rokit's shims resolve a tool only inside a folder whose manifest lists it, so run tools from the project root. Rokit reads existing `aftman.toml` / `foreman.toml`; Aftman is archived, so new projects use `rokit.toml`, but don't migrate an existing project unasked.

| Command | Use |
|---|---|
| `rokit install` | Install everything in the manifest |
| `rokit add owner/repo[@version] [alias]` | Add and install a tool (`--global` for user-wide) |
| `rokit update [tool]` | Bump versions (review the change; versions are part of the build) |
| `rokit trust owner/repo` | Mark a tool trusted. First installs prompt for trust; a non-interactive agent shell can't answer, so run this (after the user agrees) |
| `rokit install --no-trust-check` | CI only: skip trust prompts (the kit's `ci.yml` does this) |
| `rokit list`, `rokit system-info` | What's installed and where |

Installing Rokit itself is a user decision: GitHub release + `rokit self-install` (adds `~/.rokit/bin` to PATH; open a new shell), or the `install.sh` script on macOS/Linux.

## 2. Wally (packages)

```toml
[package]
name = "scope/my-game"          # lowercase scope/name
version = "0.1.0"
registry = "https://github.com/UpliftGames/wally-index"
realm = "shared"                # this package's own realm: "shared" or "server"

[dependencies]                  # shared realm → Packages/
Promise = "evaera/promise@4.0.0"

[server-dependencies]           # server realm → ServerPackages/
# ProfileStore = "<scope>/<name>@<version>"   (look up the real name with `wally search`)

[dev-dependencies]              # dev realm → DevPackages/ (tests, tooling)
# Jest = "jsdotlua/jest@3.10.0"
```

- **Section names are kebab-case.** `[server_dependencies]` / `[dev_dependencies]` parse without error and are silently ignored (checked with `wally manifest-to-json`).
- **A bare version is a caret range.** `"a/b@1.0.0"` resolves as `>=1.0.0, <2.0.0`. Use `=1.0.0` to pin exactly; either way commit `wally.lock` and review its diff (it's where unrequested upgrades show up).
- **Realms:** `shared` packages replicate to clients, `server` ones stay on the server, `dev` ones are for tests/tools. There is no client realm. A shared `[dependencies]` entry can only be satisfied by a `shared`-realm package; server and dev sections accept any realm. A realm mismatch fails at install, which is a manifest error, not a code bug.
- **Resolver doesn't backtrack.** "All possible candidates … conflicted" names the incompatible pair: fix the constraint in `wally.toml`. Deleting `wally.lock` throws away the reviewed graph; only do it deliberately, with the user's agreement.
- **Commands:** `wally install` (after any manifest change), `wally update [names]`, `wally search <query>`, `wally package --list` (preview what a publish would ship; there's no `publish --dry-run`), `wally publish`. **There is no `wally install --locked`.**
- **Never edit `Packages/`** (or the `_Index` inside it); it's regenerated.
- Before adding a dependency, check its owner, license, maintenance and whether the project already has something equivalent. Vendoring a single-file module with a provenance comment (URL + version) is also acceptable.

Mount each output folder in `default.project.json` (the kit template mounts only `Packages`):

```json
"ReplicatedStorage": {
  "Shared": { "$path": "src/shared" },
  "Packages": { "$path": { "optional": "Packages" } },
  "DevPackages": { "$path": { "optional": "DevPackages" } }
},
"ServerScriptService": {
  "Server": { "$path": "src/server" },
  "ServerPackages": { "$path": { "optional": "ServerPackages" } }
}
```

Mount `DevPackages` only in a test project file (or exclude it from release builds) if you don't want test frameworks shipped. Regenerate the sourcemap after `wally install` so luau-lsp sees package types; for full types of Wally packages some projects add `wally-package-types` (only if the project already uses it or the user agrees).

pesde is a newer alternative (multi-runtime targets, can install Wally packages through `[wally_indices]`); follow it if the project already uses it, don't switch mid-project.

## 3. luau-lsp (type checking)

The kit's `rbx-check.mjs` runs, in effect:

```
luau-lsp analyze --platform=roblox --formatter=plain \
  --definitions=@roblox=<globalTypes.None.d.luau> \
  --sourcemap=sourcemap.json \
  --ignore=Packages/** --ignore=**/_Index/** \
  src tests
```

- Definitions: `https://raw.githubusercontent.com/JohnnyMorganz/luau-lsp/main/scripts/globalTypes.None.d.luau` (the kit caches it in `~/.roblox-agent-kit/`). Without them every Roblox global is unknown.
- Sourcemap: from `rojo sourcemap … --include-non-scripts`. Without it, `require(ReplicatedStorage.Shared.X)` can't resolve.
- `.luaurc` (`{ "languageMode": "strict" }` in the template) sets the default mode; `--!strict` per file still wins. Other options: `--settings` (LSP-style settings JSON), `--base-luaurc`, `--flag:KEY=VALUE`, `--no-strict-dm-types`.
- Editors: the VS Code "Luau Language Server" extension with `luau-lsp.platform.type = "roblox"` and sourcemap autogeneration (template `.vscode/settings.json`).

## 4. selene (lint)

```toml
# selene.toml (kit template)
std = "roblox"
exclude = ["Packages/*", "DevPackages/*", "ServerPackages/*"]
```

`std = "roblox"` is essential: it loads the Roblox globals (selene fetches/generates the definitions itself; older versions wrote a `roblox.yml` into the project, which the template gitignores). Per-rule settings go under `[config]` (check the selene docs for each lint's options); use an inline `-- selene: allow(rule_name)` comment for a justified exception. Run `selene src tests`.

## 5. StyLua (format)

```toml
# stylua.toml (kit template)
column_width = 120
line_endings = "Unix"
indent_type = "Tabs"
indent_width = 4
quote_style = "AutoPreferDouble"
call_parentheses = "Always"
```

`stylua --check src tests` in CI (never silently rewrite in CI); `stylua src tests` (or `rbx-check.mjs --fix`) locally. `.styluaignore` excludes generated folders. Optional `[sort_requires] enabled = true` sorts require blocks; don't turn it on in an existing project without asking (it touches every file).

## 6. Lune (standalone Luau)

Lune runs Luau outside Roblox, for build scripts, data generation, place-file processing and pure-logic tests.

- `lune run <name> [args]` runs `.lune/<name>.luau` (or `lune/<name>.luau`); `lune run path/to/file.luau` also works. `lune list` shows available scripts; `lune setup` writes editor type definitions.
- Built-in libraries: `@lune/fs`, `@lune/process` (`process.args`, `process.exec`), `@lune/net`, `@lune/serde`, `@lune/stdio`, `@lune/task`, and `@lune/roblox`, which reads and writes place/model files as data:

```luau
local fs = require("@lune/fs")
local roblox = require("@lune/roblox")

local game = roblox.deserializePlace(fs.readFile("build/place.rbxl"))
local count = #game:GetService("ServerScriptService"):GetDescendants()
print(`ServerScriptService has {count} descendants`)
```

`@lune/roblox` has a limited instance API and no running engine: no physics, no services' behaviour, no `require` of game modules. Use it for file transforms and inspection, not for gameplay tests.

## 7. What each test runtime can prove

Split suites by what the runtime actually provides; partial mocks of Roblox instances produce confident wrong tests.

| Suite | Runs in | Can prove | Cannot prove |
|---|---|---|---|
| Pure logic | Any Luau VM: Lune, or the kit's TestRunner inside Roblox | Algorithms, state machines, validators, formulas | Anything that touches engine APIs |
| Scripts / tooling | Lune (`@lune/roblox`, `@lune/fs`, `@lune/net`) | File transforms, place-file inspection, HTTP glue | A live instance tree with running simulation |
| Engine | Studio (`execute_luau`; Server/Client during a playtest) or Open Cloud Luau Execution (`cloud_run_tests`: a real game server, `RunService:IsServer()` true) | Engine APIs, services, the DataModel, DataStores in a test universe, place fixtures | Input, hover, rendering, mobile sensors, multi-client replication |
| Playtest | Studio playtest driven by Studio MCP (single client), or Studio's Server & Clients test (user-started) | Real input, UI, client/server interplay | Production scale and network conditions |

Rules that follow:

- **Gate CI on parsed counts, not exit codes alone.** A run that exits 0 with zero tests, or exits 0 on a class of failure, is green while testing nothing. The kit's TestRunner prints `N passed, M failed`; treat `N + M == 0` as a broken setup.
- **Inject, don't intercept.** Pass fakes in through parameters (a `clock`, an `rng`, a `services` table) instead of monkey-patching globals. That is what makes headless runs possible.
- **Flaky tests:** isolate timing (fixed clock, seeded RNG), then environment (paths, locale, network), then quarantine or delete. Never mask with blanket retries.
- **Pin the runner** like any other tool (Rokit or Wally lockfile): a framework version change is a silent behaviour change.

TestEZ is archived: keep it where a project already uses it, don't introduce it. The kit default is its dependency-free TestRunner, with Jest Lua as the upgrade path: see `roblox-testing`.

## 8. CI shape

The kit's `.github/workflows/ci.yml` (from `new-project`): install Rokit → `rokit install --no-trust-check` → `wally install` → `node tools/rbx-check.mjs` (StyLua check, selene, sourcemap + luau-lsp, `rojo build`), then optionally cloud tests via `node tools/rbx-cloud.mjs test` when repo secrets/variables are set (see `open-cloud`). Each step must fail the job on error; a green run means pinned tools, formatted, lint-clean, type-clean, builds, and tests ran with a non-zero count.
