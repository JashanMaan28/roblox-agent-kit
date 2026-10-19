# Attribution: roblox-camera

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-camera/`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Modifications (2026-10-18)

- Frontmatter reduced to `name` and `description`; the upstream `when_to_use` text was folded into `description`; `last_reviewed` and `sources` removed (the sources list now sits at the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names; links between `SKILL.md` and `references/` made relative markdown links.
- full.md: `WorldToScreenPoint`/`WorldToViewportPoint` documented as returning `(Vector3, boolean)`.
- full.md: `Interpolate`, `PanUnits`, `TiltUnits`, `GetPanSpeed`, `GetTiltSpeed` marked deprecated (not "editor methods"); `ZoomToExtents` documented as a usable framing method.
- full.md: fixed the mouse-wheel zoom snippet so the zoom distance is actually applied (with easing).
- full.md: added an occlusion example (spherecast from focus to desired camera position, pull in) using `RaycastParams.ExcludeInstances`.
- full.md: added "Customise the default camera" (CameraMode, zoom limits, DevCameraOcclusionMode, EnableMouseLockOption/DevEnableMouseLock, Humanoid.CameraOffset, BindToRenderStep at Camera+1) and Reduce Motion handling via `GuiService.ReducedMotionEnabled` for screen shake.
- full.md: the Studio MCP section is now an optional preview workflow (`execute_luau` on the Client datamodel + `screen_capture`).
