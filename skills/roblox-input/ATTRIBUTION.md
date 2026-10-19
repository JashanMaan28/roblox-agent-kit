# Attribution: roblox-input

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-input/`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Additional source: MSayib/roblox-dev-skill

- Repository: https://github.com/MSayib/roblox-dev-skill
- Path: `references/project-structure.md (Input Action System section) and references/worked-examples.md (example 8)`
- Commit: `4a35b01cb07eb237081bee705455e19db37342d8`
- License: MIT (copy in `LICENSE-MSayib`)

## Modifications (2026-10-18)

- Frontmatter reduced to `name` and `description`; the upstream `when_to_use` text was folded into `description`; `last_reviewed` and `sources` removed (the sources list now sits at the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names; links between `SKILL.md` and `references/` made relative markdown links.
- full.md: `UserInputService.ModalEnabled` marked deprecated (superseded by `GuiService.TouchControlsEnabled`; it hid touch controls, it never blocked all input).
- full.md: accelerometer example uses `VectorForce` instead of deprecated `BodyForce`.
- full.md: mouse-look composes `CFrame.Angles(0, x, 0) * CFrame.Angles(y, 0, 0)` (no roll).
- full.md and SKILL.md: the Input Action System is presented as the general cross-device input layer, with Server Authority as one case that requires it; ContextActionService kept for existing code.
- full.md: resolved the TouchEnabled contradiction in Common Mistakes in favour of `PreferredInput`; `Enum.PlayerActions` described as legacy rather than deprecated (the enum page does not mark it deprecated).
- references/input-action-system.md: new file built from MSayib/roblox-dev-skill (MIT). Modified: removed the security-hardening.md reference and the MCP `execute_luau`/`user_keyboard_input` verification steps; removed unverifiable release dates; documented that `InputBinding` has no `Deadzone` property; added `PressedThreshold`/`ReleasedThreshold`, `ResponseCurve`, `PrimaryModifier`/`SecondaryModifier`, `UIButton`/`UIModifier`, `Scale`, `ClampMagnitudeToOne`, `Scriptable` bindings and `InputBinding:Fire()` (InputAction:Fire is deprecated), PreferredBinding/InputActionLabel, and Server Authority requirements, all checked against the InputBinding/InputAction/InputContext API pages and the Input Action System guide.
