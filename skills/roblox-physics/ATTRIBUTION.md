# Attribution: roblox-physics

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-physics/`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Additional source: gamedev-skills/awesome-gamedev-agent-skills

- Repository: https://github.com/gamedev-skills/awesome-gamedev-agent-skills
- Path: `skills/other-engines/roblox-physics/references/queries-and-ownership.md`
- Commit: `0a70cfc64672d512c5b5b6006b5dcb5cf90dbdbd`
- License: Apache-2.0 (copy in `LICENSE-gamedev-skills`); NOTICE in `NOTICE-gamedev-skills`

## Modifications (2026-10-18)

- Frontmatter reduced to `name` and `description`; the upstream `when_to_use` text was folded into `description`; `last_reviewed` and `sources` removed (the sources list now sits at the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names; links between `SKILL.md` and `references/` made relative markdown links.
- full.md: car example rebuilt: each wheel uses a CylindricalConstraint (slide on the suspension axis, spin on the axle via InclinationAngle) with explicit attachment orientation and travel limits, plus a SpringConstraint alongside; removed the wheel rotation that laid wheels flat.
- full.md: elevator attachments rotated so the prismatic axis points up; LimitsEnabled/limits, TargetPosition and server network ownership added.
- full.md: ragdoll now states that `Humanoid:ChangeState(Physics)` must run where the character's physics is owned (owning client for player characters), adds `BreakJointsOnDeath = false`, and wraps the previously undefined `character` cleanup snippet in a function.
- full.md: LineForce example attachment names corrected (Attachment0 is on the part that receives the force).
- references/queries-and-ownership.md: added from gamedev-skills (Apache-2.0). Modified: added current `RaycastParams`/`OverlapParams` filtering (`ExcludeInstances`/`IncludeInstances`, with `FilterDescendantsInstances`+`FilterType` noted as superseded), Spherecast/Blockcast/Shapecast guidance, legacy Body* mover deprecation, and studio-mcp verification notes.

Files derived from the Apache-2.0 source were modified as listed above; the Apache License, Version 2.0 and the upstream NOTICE apply to those portions.
