---
name: roblox-input
description: "Roblox input: Input Action System, ContextActionService, UserInputService, touch/gamepad/keyboard, PreferredInput hints. Use when binding actions across devices or when controls fail on mobile or console."
---

# Roblox Input

## When to Load

Touch, gamepad, keyboard, mouse or motion input, on-screen action buttons, cross-platform binding. Input is client-only; the server validates the resulting actions.

## Quick Reference

- **Events:** `InputBegan/Changed/Ended` give `(input, gameProcessedEvent)`; filter it for gameplay. Wheel fires only `InputChanged`.
- **Bindings:** for new actions use the Input Action System — the general cross-device layer: an `InputAction` per mechanic with a keyboard, gamepad and touch `InputBinding`, grouped in `InputContext`s you enable per game phase (`Priority`/`Sink` for menus). Mandatory for simulation input in Server Authority projects (`RunService:BindToSimulation()`). See [references/input-action-system.md](references/input-action-system.md).
- **Existing CAS code:** `ContextActionService:BindAction(name, handler, touchButton, ...keys)` still works; gate on `state` (touch is `KeyCode.Unknown`); stack order, so `BindActionAtPriority`.
- **Mobile first, hybrid aware:** show controls from `UserInputService.PreferredInput` (`Enum.PreferredInput`), observed with `GetPropertyChangedSignal`, not from `TouchEnabled` cached once.
- **Touch action buttons:** fire only for touches that began on the button; camera drags across it never fire. Place from the measured jump button under `PlayerGui.TouchGui`; clear the thumbstick zone.
- **Gate gameplay:** block attacks while a game window is open, a `TextBox` is focused, `GuiService.MenuIsOpen`, or `GuiService.SelectedObject` is set.
- **Cancel is not release:** holds cancel on window open, `Cancel`, unequip, focus loss, input switch or pad disconnect.
- **Gamepad tools:** default controls bind `ButtonR2` through `BindActivate`; `Tool.ManualActivationOnly = true` disables it. Aim from the screen center on gamepad, not `GetMouseLocation()`.
- **Hints:** `GetStringForKeyCode(key, Enum.KeyCodeStringFormat.Abbreviated)`, `GetImageForKeyCode`, or `InputActionLabel`; never hardcode Xbox names.
- **Deprecated:** `UserInputService.ModalEnabled` → `GuiService.TouchControlsEnabled`; `BodyForce` → `VectorForce`. Prefer explicit `Enum.KeyCode` bindings over legacy `Enum.PlayerActions`.
- **Test:** Device Simulator + Controller Emulator; menu focus is in `roblox-gui`; custom cameras in `roblox-camera`.

> Details: [references/full.md](references/full.md)
> Input Action System guide: [references/input-action-system.md](references/input-action-system.md)
