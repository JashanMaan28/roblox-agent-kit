---
name: roblox-gui
description: "Roblox UI: ScreenGui/SurfaceGui/BillboardGui, layouts and constraints, safe insets, mobile-first responsive design, gamepad selection, RichText. Use when building or fixing menus, HUDs and shops, or UI that breaks on phone, TV or controller."
---

# roblox gui

## When to Load

HUDs, menus, shops, dialogs, world UI, and layout bugs on phone, tablet, desktop or TV.

## Quick Reference

- Mobile first: design on the smallest landscape phone with touch controls, then grow (full.md §11).
- Reserve top bar, thumbstick, jump, chat; interactive UI in `CoreUISafeInsets`; place by measured `AbsolutePosition`/`AbsoluteSize`.
- Check every element pair that can show together; reflow, don't shrink.
- Gamepad: one `SelectedObject` owner, `SelectionGroup` bounds, restored focus, layered Back (§8).
- Console: TV-safe area, `ViewportDisplaySize`, no chat window.
- Layouts own repeated layout; UI shows server state; a button is not an authority boundary.
- Reactive UI: per-screen cleanup; repeat open/close to test leaks. Loading UI in `ReplicatedFirst`.
- Pick hints/focus mode from `UserInputService.PreferredInput`, not `TouchEnabled`/`GamepadEnabled`.
- TextBox submit, grids, truncation, RichText safety, deprecated APIs: full.md. Purchase flows: `roblox-monetization`; cross-device action binding: `roblox-input`; text filtering and localization: `roblox-localization`.

> Details: [references/full.md](references/full.md)
> Responsive composition, flex, breakpoints, modal focus, verification matrix: [references/responsive-layout.md](references/responsive-layout.md)
