# Attribution

## Primary source

- Repository: https://github.com/TabooHarmony/roblox-brain (commit `ceee4aa`, 2026-10-14)
- Source path: `skills/core/roblox-security/` (`SKILL.md`, `references/full.md`)
- License: MIT, Copyright (c) 2026 TabooHarmony (see `LICENSE`)

## Merged content

- Repository: https://github.com/m4bwav/roblox-agent (commit `581a33a`)
- Source path: `skills/roblox-agent-workflow/SKILL.md` (Step 5, "assets, plugins and backdoors")
- License: MIT, Copyright (c) 2026 Mark Rogers (see `LICENSE-m4bwav`)

## Modifications

- Frontmatter reduced to `name` and `description`; `when_to_use` folded into `description`; `last_reviewed` and `sources` dropped (sources moved to the end of `references/full.md`).
- Added a "Free-model / Toolbox backdoors" section (full reference plus a SKILL.md summary), built on m4bwav's red-flag list (`require(<number>)`, `loadstring`, `getfenv`/`setfenv`, HttpService loaders, obfuscated strings) and extended with more indicators and a scan procedure using the Studio MCP tools `search_game_tree`, `script_grep`, and `script_read`. Dropped the source's unverified claim that Studio sandboxes Creator Store inserts by default; the text now says script capabilities are an opt-in beta, off by default. Dropped the polywright mesh workflow.
- Added a backdoor-scan item to the audit checklist.
- Removed the text-filtering workflow section (moved to roblox-localization) and left a one-line pointer; the checklist item points there too.
- Replaced the uncited "a public gist" reference with a neutral statement about community-reported rollback vectors.
- Replaced the `roblox-networking §0` section number with the section name; made the session-lock mitigations consistent with the existing "no bare JobId lock" guidance.
