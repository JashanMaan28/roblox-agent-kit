# Attribution: roblox-building

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-building/`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Additional source: m4bwav/roblox-agent

- Repository: https://github.com/m4bwav/roblox-agent
- Path: `skills/roblox-agent-workflow/references/3d-models.md and skills/roblox-agent-workflow/LEARNINGS.md (L-001, L-002)`
- Commit: `581a33a065ad28d17037ac65a9c1376decea25f4`
- License: MIT (copy in `LICENSE-m4bwav`)

## Modifications (2026-10-18)

- Frontmatter reduced to `name` and `description`; the upstream `when_to_use` text was folded into `description`; `last_reviewed` and `sources` removed (the sources list now sits at the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names; links between `SKILL.md` and `references/` made relative markdown links.
- full.md: `roblox-studio-mcp` references changed to `studio-mcp`; MCP mode rewritten around `execute_luau` (Edit datamodel) and `list_roblox_studios`; added a Rojo note (don't build into Rojo-managed containers, never `multi_edit` Rojo-managed scripts) and an explicit offline fallback.
- full.md: replaced the third-party terrain import pipeline with a pointer to the new `references/terrain.md`.
- full.md: WedgePart orientation table replaced with a "verify in Studio" procedure (the API reference does not document it).
- full.md: removed the off-topic ProximityPrompt/ProximityPromptService section, leaving a one-line pointer to `roblox-security`; texture generation/segment_mesh noted as Studio MCP tools.
- references/3d-models.md: added from m4bwav/roblox-agent (MIT). Modified: removed polywright plugin links, `../SKILL.md`/`../RESEARCH.md` links and the roblox-agent-cloud reference; added pointers to studio-mcp and open-cloud.
- references/terrain.md: new file covering Terrain fills, ReadVoxels/WriteVoxels, heightmaps, MaterialService/MaterialVariant (signatures verified on the API pages), with the half-voxel occupancy offset and re-mesh notes from m4bwav LEARNINGS.md (MIT).
