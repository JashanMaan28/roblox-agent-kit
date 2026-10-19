# Attribution

This skill is vendored and modified from community sources.

## Source

- Source repository: https://github.com/TabooHarmony/roblox-brain (commit ceee4aaa5004502e2a51d78b3c33bba44d84742b, 2026-10-14)
- Source path: `skills/core/roblox-architecture/` (`SKILL.md`, `references/full.md`)
- License: MIT (Copyright (c) 2026 TabooHarmony), see `LICENSE`

## Modifications

- Frontmatter reduced to `name` + `description`. Folded `when_to_use` into the description, dropped `last_reviewed`, and moved `sources` to the end of `references/full.md`.
- "Module-loader race pattern" field report reconciled with §6. The suggestion to `task.spawn` each init was removed, and initializers now run sequentially in a fixed order and fail visibly.
- Version-specific jecs claims dated "as of jecs v0.11, 2026". Release status re-checked against the GitHub releases API (v0.11.0, 2026-03-10, still latest in 2026-10).
- `OnRemove` structural-change pitfall annotated with source-verified behavior: it hard-errors on exclusive-relationship replacement and bulk removal, while a plain `world:remove` did not error in Lune testing. The rule is still to be treated as universal.
- Max-server-size field note reworded to "standard max 200; check your place settings".
- Added cross-references to `ecs-design`. Removed maintainer-only `<!-- temporal -->` markers.
