# Attribution

This skill is vendored and modified from community sources.

## Primary source

- Source repository: https://github.com/TabooHarmony/roblox-brain (commit ceee4aaa5004502e2a51d78b3c33bba44d84742b, 2026-10-14)
- Source path: `skills/core/roblox-luau-patterns/` (`SKILL.md`, `references/full.md`)
- License: MIT (Copyright (c) 2026 TabooHarmony), see `LICENSE`

## Merged content

- Source repository: https://github.com/ivar-anon/roblox-dev (commit c73640a28e014411d146b86ace88edef8c8b4142, 2026-09-10)
- Source path: `skills/roblox-performance/SKILL.md`, lines 31-49 (the `makeMaid` cleanup sketch), used as the basis for the typed cleanup helper
- License: MIT (Copyright (c) 2026 Ivar), see `LICENSE-ivar-anon`

## Modifications

- Frontmatter reduced to `name` + `description`. Folded `when_to_use` into the description, dropped `last_reviewed`, and moved `sources` to the end of `references/full.md`.
- Added "A typed cleanup boundary (Maid/Trove-style)" to §5: a `--!strict` `newCleaner` helper handling `RBXScriptConnection`, `Instance`, `thread` (via `task.cancel`, skipping non-suspended threads per the task docs), and functions, with LIFO release, re-entrancy safety during teardown, and reuse. Type-checked with luau-lsp 1.70.1 (old and new solver) and runtime-tested in Lune.
- Instance-typed attributes / `InstanceHandle`: marked clearly as a Studio beta, `ObjectValue` made the default for shipped code, and details added from the InstanceHandle engine reference.
- Stale cross-reference `roblox-cloud` changed to `open-cloud`.
- Removed maintainer-only `<!-- temporal -->` markers.
