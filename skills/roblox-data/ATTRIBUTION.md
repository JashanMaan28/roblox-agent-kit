# Attribution

- Repository: https://github.com/TabooHarmony/roblox-brain (commit `ceee4aa`, 2026-10-14)
- Source path: `skills/core/roblox-data/` (`SKILL.md`, `references/full.md`)
- License: MIT, Copyright (c) 2026 TabooHarmony (see `LICENSE`)

## Modifications

- Frontmatter reduced to `name` and `description`; `when_to_use` folded into `description`; `last_reviewed` and `sources` dropped (sources moved to the end of `references/full.md`).
- Cross-references renamed to this plugin's skills: `roblox-cloud` → open-cloud (plus the plugin's read-only `datastore_list` / `datastore_list_entries` / `datastore_get_entry` tools for inspecting live entries), `roblox-studio-mcp` → studio-mcp.
- Removed section-number references into other skills (`roblox-analytics §8`, `roblox-monetization §3`, `roblox-cloud §8.6`) and rewrote the restart-teleport sentence so it stands alone.
- Rewrote the save-lifecycle example (§7). `BindToClose` now saves all players in parallel and waits for every in-flight final save, including ones started by `PlayerRemoving`, bounded by a 25 s budget under the 30 s shutdown limit. Fixed the `for player in Players:GetPlayers()` iteration bug (it bound indices, not players). Clarified that the release call is wrapper-specific (ProfileService `Release()`, ProfileStore `Profile:EndSession()`, checked against the ProfileStore API docs) and that ProfileStore handles shutdown itself.
- The ProfileStore example's comment about the `closing` flag no longer depends on the §7 coordinator.
- SKILL.md quick reference updated to match (cancelled `UpdateAsync` writes, bounded shutdown wait, `EndSession`).
