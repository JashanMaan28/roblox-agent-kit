# Attribution: roblox-gui

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-gui/`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Additional source: gamedev-skills/awesome-gamedev-agent-skills

- Repository: https://github.com/gamedev-skills/awesome-gamedev-agent-skills
- Path: `skills/other-engines/roblox-ui/references/responsive-layout.md (plus layout, focus and quality-gate material from skills/other-engines/roblox-ui/SKILL.md and references/input-navigation.md)`
- Commit: `0a70cfc64672d512c5b5b6006b5dcb5cf90dbdbd`
- License: Apache-2.0 (copy in `LICENSE-gamedev-skills`); NOTICE in `NOTICE-gamedev-skills`

## Modifications (2026-10-18)

- Frontmatter reduced to `name` and `description`; the upstream `when_to_use` text was folded into `description`; `last_reviewed` and `sources` removed (the sources list now sits at the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names; links between `SKILL.md` and `references/` made relative markdown links.
- full.md: `GuiService:IsTenFootInterface()` described as discouraged for console detection, not deprecated (per the API reference).
- full.md: replaced the ~90-line purchase-reconciliation example with a short request/response sketch and a pointer to `roblox-monetization`.
- full.md: SelectionBox example now gets `Players` via `game:GetService`; input-layer guidance updated to present the Input Action System as the general cross-device layer; test-runner pointer changed to `roblox-testing`.
- references/responsive-layout.md: new file adapted from gamedev-skills (Apache-2.0). Modified: removed the `../assets` Rojo fixture section; merged the narrow/wide composition example, modal-focus steps, visual quality gates and common-failures table from the upstream roblox-ui SKILL.md and input-navigation.md; replaced GamepadEnabled/TouchEnabled UI-mode selection with `UserInputService.PreferredInput`; corrected the claim that `AddSelectionParent`/`AddSelectionTuple`/`RemoveSelectionGroup` are deprecated (they are documented, not deprecated); added studio-mcp verification notes; code fences changed to `luau`.

Files derived from the Apache-2.0 source were modified as listed above; the Apache License, Version 2.0 and the upstream NOTICE apply to those portions.
