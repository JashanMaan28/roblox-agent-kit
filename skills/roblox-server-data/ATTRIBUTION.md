# Attribution

- Repository: https://github.com/TabooHarmony/roblox-brain (commit `ceee4aa`, 2026-10-14)
- Source path: `skills/core/roblox-server-data/` (`SKILL.md`, `references/full.md`)
- License: MIT, Copyright (c) 2026 TabooHarmony (see `LICENSE`)

## Modifications

- Frontmatter reduced to `name` and `description`; `when_to_use` folded into `description`; `last_reviewed` and `sources` dropped (sources moved to the end of `references/full.md`).
- Added the MemoryStore per-partition limit (~30,000 RU/min), the hash-map per-key limits (~5,000 write / ~15,000 read RU/min), and the per-structure limit (100,000 RU/min), checked against https://create.roblox.com/docs/cloud-services/memory-stores on 2026-10-18. Kept the docs' caveat that the partition and key limits are backend estimates, and noted that sorted maps and queues each live on one partition.
- Fixed the guild `UpdateAsync` example: it now returns a tagged outcome and reports a cancelled write (callback returned `nil`) to the caller separately from errors and success, tracking cancellation per transform run.
- Cross-references renamed to this plugin's skills (`roblox-cloud` → open-cloud); replaced the `roblox-data §1a` section number with the section name.
