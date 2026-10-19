# Attribution

This skill is vendored and modified from community sources.

## Source

- Source repository: https://github.com/christopher-buss/skills (commit d6ba8c46ea40258e869afaeb5119867dd845e09e, 2026-10-06)
- Source path: `skills/ecs-design/`
- License: MIT (Copyright (c) 2026-PRESENT Christopher Buss; portions (c) 2025 Anthony Fu, antfu/skills), see `LICENSE`
- Upstream generation info (from the dropped `GENERATION.md`): generated 2026-01-30 from `SanderMertens/flecs` (`e90d9d09cdda2d0343439772d6c1a9df6130b6fc`) and `SanderMertens/ecs-faq` (`7258432a3faee3fdf64882ee8fc6fbf521c6714d`)

## Modifications

- Frontmatter reduced to `name` + `description`, and `metadata` dropped. The description now says the skill covers ECS design for jecs on Roblox, with roblox-ts examples whose concepts apply equally to Luau jecs.
- Added a "Luau equivalents" section to SKILL.md showing the Luau jecs API shape (world, component, entity, set/get/add, pair, cached query, system). It was checked against the jecs v0.11.0 source, type-checked with luau-lsp, and run in Lune. Also added jecs gotchas verified in Lune: `with`/`without` replace rather than accumulate, plain queries are single-pass, and v0.11 forbids structural changes inside `OnRemove` hooks.
- `references/best-practices-systems.md`:
  - `transform.add(velocity.mul(dt))` discarded its result, so it now writes the result back with `world.set`.
  - The spawn helper used a nonexistent `player.SpawnLocation` and a Player Instance as a pair target. It now takes a CFrame and an owner entity.
  - The spatial-partitioning example reused and re-filtered one query object inside a loop, so it now builds a fresh query per cell.
  - The async pathfinding example checks `world.contains` after yielding.
  - Added a note on jecs's tolerance for changes to the current entity during iteration.
- `references/core-database-model.md`: `.with(A).with(B)` (only B applied in jecs) changed to `.with(A, B)`.
- Removed the maintainer-only `GENERATION.md`. No references to the upstream `jecs` skill remained; SKILL.md points to the jecs repo and its `how_to/` docs.
