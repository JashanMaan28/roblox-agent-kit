# Attribution

`SKILL.md` is kit-authored; its "Working style" section and `references/working-style.md` adapt material from the sources below.

| Source | Paths used | License | Copy |
|---|---|---|---|
| https://github.com/TabooHarmony/roblox-brain (commit ceee4aa) | `skills/core/roblox-collaboration-mode/SKILL.md` (mode inference, peer vs autonomous, "bravery scales with risk" table, process rules); `references/full.md` (mode-inference table, bravery examples, process examples, checkable collaboration rules) | MIT | `LICENSE-TabooHarmony` |
| https://github.com/gamedev-skills/awesome-gamedev-agent-skills (commit 0a70cfc) | `skills/other-engines/roblox-studio-workflow/SKILL.md` (workflow steps incl. "Clean the experiment", "Reuse before adding", execution-location map, verification ladder, common-failures table) | Apache-2.0 | `LICENSE-gamedev-skills`, `NOTICE-gamedev-skills` |

## Modifications

- Condensed and reworded; merged into this kit's edit → check → test → playtest loop.
- The source's advice to edit scripts with `multi_edit` was restricted: Rojo-managed scripts are edited on disk only.
- The verification ladder was extended with the kit's own rungs (PostToolUse hook, `rbx-check.mjs`, TestRunner / `cloud_run_tests`, Studio MCP playtest tools) and notes what the single-client MCP playtest cannot prove.
- Cross-references renamed to this kit's skills (`roblox-review`, `roblox-monetization`, `roblox-testing`, `check`).
- Added kit-specific rows to the common-failures table (`multi_edit` anchor failures, edit tools failing during a playtest).
