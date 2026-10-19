# Attribution

This skill is kit-authored around material adapted from the MIT-licensed sources below. Every CLI flag and mapping rule was re-checked on 2026-10-18 against the kit's pinned tools (Rojo 7.7.1, Wally 0.3.2, Rokit 1.2.0, luau-lsp 1.70.1, selene 0.32.0, StyLua 2.6.0, Lune 0.11.0) by running `--help`, building test projects and reading the output back with Lune.

| Source | Paths used | License | Copy |
|---|---|---|---|
| https://github.com/afrxo/roblox-agent-skills (commit ff50be7) | `skills/roblox-toolchain/SKILL.md`: filesystem → DataModel mapping table, `init.luau` semantics, meta files, Wally realms and mounting, project-file keys | MIT | `LICENSE-afrxo` |
| https://github.com/TabooHarmony/roblox-brain (commit ceee4aa) | `skills/tools/roblox-tooling/references/full.md`: source-of-truth paradigms and `rojo syncback` (§1b), test-runner doctrine (§1c), Script Sync details (§1d), Wally resolution/realm/lockfile behaviour (§3) | MIT | `LICENSE-TabooHarmony` |
| https://github.com/m4bwav/roblox-agent (commit 581a33a) | `skills/roblox-agent-project/SKILL.md`: Script Sync vs Rojo route table, "one writer per script", Rokit trust in non-interactive shells, `--include-non-scripts` sourcemaps | MIT | `LICENSE-m4bwav` |

## Modifications

- Condensed and reorganised into `SKILL.md`, `references/rojo.md` and `references/packages-and-tools.md`; adapted to the kit template layout and `rbx-check.mjs`.
- Removed the source's `wally install --locked` (the flag doesn't exist in Wally 0.3.2) and its pesde deep-dive; pesde is mentioned only as an alternative.
- Corrected Wally section names to kebab-case (`[server-dependencies]`, `[dev-dependencies]`); one source used snake_case, which Wally silently ignores.
- The test-runner doctrine was rewritten around the kit's runtimes (TestRunner in Studio / Open Cloud, Lune, Studio MCP playtests) instead of a specific third-party runner.
- Cross-references renamed to this kit's skills (`check`, `new-project`, `roblox-testing`, `open-cloud`, `studio-mcp`, `roblox-architecture`).
