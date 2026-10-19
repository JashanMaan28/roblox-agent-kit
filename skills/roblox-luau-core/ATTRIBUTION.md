# Attribution

This skill is vendored and modified from community sources.

## Primary source

- Source repository: https://github.com/TabooHarmony/roblox-brain (commit ceee4aaa5004502e2a51d78b3c33bba44d84742b, 2026-10-14)
- Source path: `skills/core/roblox-luau-core/` (`SKILL.md`, `references/full.md`)
- License: MIT (Copyright (c) 2026 TabooHarmony), see `LICENSE`

## Merged content

- Source repository: https://github.com/MSayib/roblox-dev-skill (commit 4a35b01cb07eb237081bee705455e19db37342d8, 2026-10-17)
- Source path: `references/luau-fundamentals.md`, lines 73-127 (the `if local` Studio beta, upstream Luau prototypes that are off on Roblox) and 142-146 (a trailing comment on a `--!strict` line disables it)
- License: MIT, see `LICENSE-MSayib`

## Modifications

- Frontmatter reduced to `name` + `description`. Folded `when_to_use` into the description and added deprecated-API migration so the skill triggers for it. Dropped `last_reviewed` and moved `sources` to the end of `references/full.md`.
- `--!native` scoping softened from "server-side only" to "primarily benefits server code; check the docs" (checked against create.roblox.com/docs/luau/native-code-gen, 2026-10).
- §10 (deprecated APIs): added a "Look it up, don't recall it" workflow using `docs_search` / `docs_fetch` and https://create.roblox.com/docs/reference/engine/deprecated.md (596 deprecated members with replacements). Added `getfenv`/`setfenv` and `collectgarbage` rows to the deprecated table. Mirrored a short version in SKILL.md.
- §11 (sandbox): `getfenv`/`setfenv` marked officially deprecated (not removed). Added rows for `loadstring` (present but disabled by default via `ServerScriptService.LoadStringEnabled`) and `unpack` (still a global). Verified against the LuaGlobals and ServerScriptService docs.
- buffer: replaced the long `readinteger`/`writeinteger` discussion with the verified fact that Roblox's buffer library has no such functions (checked against the Roblox buffer reference).
- New §15 "Directives, betas, and upstream features not on Roblox", condensed from the MSayib source. Did not take its claim that `pairs`/`ipairs` are deprecated (that is wrong).
- Review checklist renumbered to §16 and extended. SKILL.md quick reference gained bullets for the directive-comment trap and beta/prototype features.
- Removed maintainer-only `<!-- temporal -->` markers.
