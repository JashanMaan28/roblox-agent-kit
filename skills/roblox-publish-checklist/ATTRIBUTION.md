# Attribution

- **Source repository:** https://github.com/TabooHarmony/roblox-brain
- **Source path:** `skills/tools/roblox-publish-checklist/` (`SKILL.md`, `references/full.md`)
- **License:** MIT (see `LICENSE` in this folder, copied from the source repository)

## Modifications

- Frontmatter reduced to `name` and a single-line `description` (folded `when_to_use`; dropped `last_reviewed` and `sources`; sources moved to the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names (roblox-cloud → `open-cloud`, roblox-studio-mcp → `studio-mcp`).
- Added "Using this kit's tools": `check`, `cloud_run_tests` on the test place, `cloud_upload_place` with `publish: false` then `publish: true` only with explicit user approval, Studio-only publishing for EditableImage/EditableMesh/PartOperation/SurfaceAppearance/BaseWrap changes, and live-version verification (`game.PlaceVersion`, version history).
- Added a dated "Current platform requirements" block verified against the Creator Docs on 2026-10-18: 16+ release requirements (age check, 2-day-old account, questionnaire; no maturity info restricts playability), all-ages Kids and Select requirements, content labels including Restricted and Content May Vary, the generative-AI interaction questions, the 5-new-games-per-day release limit, and icon/thumbnail/video specs.
