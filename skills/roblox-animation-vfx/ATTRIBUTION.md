# Attribution: roblox-animation-vfx

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-animation-vfx/`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Modifications (2026-10-18)

- Frontmatter reduced to `name` and `description`; the upstream `when_to_use` text was folded into `description`; `last_reviewed` and `sources` removed (the sources list now sits at the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names; links between `SKILL.md` and `references/` made relative markdown links.
- full.md: Beam example now declares `local Debris = game:GetService("Debris")`.
- full.md: added Trail tuning notes, ParticleEmitter `Squash`/`TimeScale`/`Drag`/`Shape*` notes, a `Highlight` section (DepthMode, 255-per-client limit) and a camera-shake snippet that checks `GuiService.ReducedMotionEnabled` and layers on the default camera via `BindToRenderStep`.
