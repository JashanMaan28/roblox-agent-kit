# Attribution

- Repository: https://github.com/TabooHarmony/roblox-brain (commit `ceee4aa`, 2026-10-14)
- Source path: `skills/core/roblox-performance/` (`SKILL.md`, `references/full.md`)
- License: MIT, Copyright (c) 2026 TabooHarmony (see `LICENSE`)

## Modifications

- Frontmatter reduced to `name` and `description`; `when_to_use` folded into `description`; `last_reviewed` and `sources` dropped (sources moved to the end of `references/full.md`).
- Fixed `Workspace.PlayerCharacterDestroyBehavior`: its default value is `Default`, not `Disabled`. Documented `Enabled`, which destroys replaced characters and leaving `Player` objects.
- Fixed `Workspace.ModelStreamingBehavior`: its default value is `Default` (currently Legacy behavior per the streaming guide), not Legacy. The skill now recommends setting `Improved` explicitly.
- Removed the unverifiable Script Profiler shortcut "Ctrl+Alt+F5" (the official docs open it from the Developer Console) and the MicroProfiler "Ctrl+Alt+F6" claim. Corrected that the Script Profiler measures CPU time only (allocations are in Luau heap), and corrected the server MicroProfiler path and the Developer Console tool list.
- Added a "Native code generation (`--!native`)" section based on the official native code generation docs.
- Added a note on `DataModel.ServerLowMemoryWarning`, which is in the engine API dump but not documented on the Creator Hub as of 2026-10-18.
- Replaced the `roblox-luau-patterns §10` section number with the section name.
