# Attribution

## Primary source

- Repository: https://github.com/TabooHarmony/roblox-brain (commit `ceee4aa`, 2026-10-14)
- Source path: `skills/core/roblox-networking/` (`SKILL.md`, `references/full.md`)
- License: MIT, Copyright (c) 2026 TabooHarmony (see `LICENSE`)

## Merged content

- Repository: https://github.com/afrxo/roblox-agent-skills (commit `ff50be7`)
- Source path: `skills/roblox-dev/references/buffer-library.md` → `references/buffers.md`
- License: MIT, Copyright (c) 2026 afrxo (see `LICENSE-afrxo`)

## Modifications

- Frontmatter reduced to `name` and `description`; `when_to_use` folded into `description`; `last_reviewed` and `sources` dropped (sources moved to the end of `references/full.md`).
- Description no longer claims chat; removed §10 "Text chat: TextChatService (modern) and legacy Chat" from `references/full.md` and replaced it with a pointer to roblox-localization.
- Added `references/buffers.md` (from afrxo's buffer-library reference), checked against the official buffer library page: replaced "writes truncate" with the documented per-width input ranges, corrected the `fill` value range, noted there is no `readinteger`/`writeinteger`, replaced the incorrect "pack into a buffer, `tostring`, store in a DataStore" use case (binary strings are not valid UTF-8 and fail to save), and added a pack/unpack example with server-side length and NaN validation.
- Linked `buffers.md` from `SKILL.md` and from §7c of `references/full.md`.
- Added ByteNet to the networking-library list.
- The edit-mode mock example now uses `RunService:IsEdit()` instead of a project-specific `Shared.RunContext` module; SKILL.md wording fixed to match.
- Added cross-reference lines to roblox-data and roblox-tooling.
