# Attribution

`SKILL.md` is based on a community skill and extended with kit-authored material; `references/jest-roblox.md` is kit-authored, paraphrasing the Jest Roblox documentation.

| Source | Paths used | License | Copy |
|---|---|---|---|
| https://github.com/ivar-anon/roblox-dev (commit c73640a) | `skills/roblox-testing/SKILL.md`: command-bar trap, gated cheat remotes, pure core / thin shell with injected RNG, multiplayer and late-join playtest checks, bug reproduction discipline, review red flags | MIT | `LICENSE-ivar-anon` |
| https://github.com/m4bwav/roblox-agent (commit 581a33a) | `skills/roblox-agent-checks/SKILL.md` (verification ladder); `skills/roblox-agent-cloud/SKILL.md` and `references/run-jest.luau` (Jest over Open Cloud: `LoadStringEnabled`, counts as evidence, zero tests = setup failure) | MIT | `LICENSE-m4bwav` |
| https://github.com/TabooHarmony/roblox-brain (commit ceee4aa) | `skills/tools/roblox-tooling/references/full.md` §1c (which runtime can prove what; gate on counts; inject, don't intercept) | MIT | `LICENSE-TabooHarmony` |
| https://github.com/Roblox/jest-roblox (docs, CHANGELOG) | Package names/versions, runCLI usage, Luau deviations (`.never`, `jest.fn()` two return values, `.each`), loadmodule → loadstring fallback | MIT | `LICENSE-jest-roblox` |

## Modifications

- Replaced the source's TestEZ section (TestEZ is archived) with the kit's dependency-free TestRunner (`tests/*.spec.luau`, run via Studio `execute_luau` or `cloud_run_tests`) and Jest Roblox as the upgrade path, including a kit-authored adapter that keeps the `TestRunner.run(root)` contract.
- Fixed the source's advice to add a "`debug.profilebegin`/log line": `debug.profilebegin` only labels MicroProfiler regions; logging is `print`/`warn`.
- Added Studio MCP playtest automation and the verification ladder; renamed cross-references to this kit's skills (`roblox-data`, `roblox-security`, `studio-mcp`, `open-cloud`, `new-system`, `check`).
- Code samples adapted to the kit template layout (`src/shared` → `ReplicatedStorage.Shared`, `tests` → `ServerStorage.Tests`) and checked with luau-lsp (strict), selene and StyLua.
