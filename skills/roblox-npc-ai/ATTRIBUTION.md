# Attribution: roblox-npc-ai

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-npc-ai/`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Modifications (2026-10-18)

- Frontmatter reduced to `name` and `description`; the upstream `when_to_use` text was folded into `description`; `last_reviewed` and `sources` removed (the sources list now sits at the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names; links between `SKILL.md` and `references/` made relative markdown links.
- SKILL.md and full.md: `Workspace.PathfindingUseImprovedSearch` documented as a ReadWrite enum property (Default/Disabled/Enabled), not a non-scriptable Studio setting.
- full.md: moved the HumanoidDescription/BodyColors/clothing block to `roblox-characters` (references/appearance.md) and dropped the deprecated HopperBin section.
- full.md: added missing `game:GetService` calls (ServerStorage in the spawner and wave examples, RunService in the update loop); `ComputeAsync` wrapped in `pcall`; line-of-sight raycast uses `ExcludeInstances`.
