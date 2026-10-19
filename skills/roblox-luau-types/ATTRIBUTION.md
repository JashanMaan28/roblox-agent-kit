# Attribution

This skill is vendored and modified from community sources.

## Source

- Source repository: https://github.com/TabooHarmony/roblox-brain (commit ceee4aaa5004502e2a51d78b3c33bba44d84742b, 2026-10-14)
- Source path: `skills/core/roblox-luau-types/` (`SKILL.md`, `references/full.md`)
- License: MIT (Copyright (c) 2026 TabooHarmony), see `LICENSE`

## Modifications

- Frontmatter reduced to `name` + `description`. Folded `when_to_use` into the description, dropped `last_reviewed`, and moved `sources` to the end of `references/full.md`.
- Deleted the maintainer-only checklist item about `<!-- temporal -->` markers and removed the markers themselves.
- `@deprecated` attribute: replaced "treat Studio warning behavior as still settling" with a verified status. The RFC is marked Implemented, luau.org/attributes documents both forms, and it is a lint/autocomplete signal only. Roblox's creator docs don't cover it, so the agent is told to confirm it in its toolchain. Clarified that it applies to function declarations, including table/class methods.
- `--!native` scoping softened to "primarily benefits server code; check the docs".
- SKILL.md footer link made a relative Markdown link.
