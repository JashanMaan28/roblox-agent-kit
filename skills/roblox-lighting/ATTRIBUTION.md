# Attribution: roblox-lighting

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-lighting/`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Modifications (2026-10-18)

- Frontmatter reduced to `name` and `description`; the upstream `when_to_use` text was folded into `description`; `last_reviewed` and `sources` removed (the sources list now sits at the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names; links between `SKILL.md` and `references/` made relative markdown links.
- SKILL.md/full.md: reconciled the LightingStyle/PrioritizeLightingQuality guidance (set in Properties; listed as script-writable, verify runtime writes); `Technology` described as Studio-only with only its `Compatibility` value deprecated, `Future` recommended for new work.
- full.md: added Sky, Clouds (must be under Terrain), ColorGradingEffect (TonemapperPreset) and `ExposureCompensation`.
- SKILL.md/full.md: day/night cycle no longer writes `ClockTime` every frame on the server (1-second step, or client-driven from a shared start time).
- SKILL.md: replaced the vague MCP line with a concrete studio-mcp workflow (screen_capture, execute_luau in Edit, compare).
