# Attribution

`SKILL.md` and the plugin agent `agents/roblox-reviewer.md` are adapted from:

| Source | Paths used | License | Copy |
|---|---|---|---|
| https://github.com/ivar-anon/roblox-dev (commit c73640a) | `skills/review/SKILL.md` (procedure, severity scale, honesty rules); `agents/roblox-reviewer.md` (four-lens audit checklist and reporting rules) | MIT | `LICENSE` |

## Modifications

- Converted the user-only `/roblox-dev:review` command into a model-invocable skill named `roblox-review` with an `argument-hint`; added diff and Studio-only-script targets.
- Added a fifth lens, "currency" (deprecated APIs checked against the engine's deprecated-API list; new type solver), and `ProcessReceipt` checks under data safety.
- Added a failure-scenario column to the findings table and inline-review fallback when the agent isn't used.
- The agent was adapted to the kit's Rojo layout, given a prompt-injection rule, and its cross-references renamed to this kit's skills (`roblox-security`, `roblox-networking`, `roblox-data`, `roblox-monetization`, `roblox-performance`, `roblox-luau-types`, `roblox-luau-core`, `roblox-testing`).
