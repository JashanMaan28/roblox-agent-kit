# Input Action System (InputContext / InputAction / InputBinding)

The **Input Action System (IAS)** is Roblox's declarative, cross-device input layer: you define
*actions* ("Sprint", "Shoot", "ToggleShop") at edit time and give each one a binding per device
family (keyboard/mouse, gamepad, touch). Gameplay code listens to the action, never to a key. It is
the recommended approach for new input work in **any** project; it is also the required path for
simulation-affecting input in Server Authority projects (see the end of this file).

IAS does **not** deprecate `UserInputService` or `ContextActionService`. Existing code that uses
them keeps working; prefer IAS for new actions, and keep `UserInputService` for raw device data
(gestures, sensors, per-touch tracking).

Adapted from MSayib/roblox-dev-skill (MIT); see `../ATTRIBUTION.md`. API checked against
https://create.roblox.com/docs/input/input-action-system and the `InputContext`, `InputAction`,
`InputBinding` class pages (2026-10).

## Key concepts

| Concept | Class / member | Notes |
|---|---|---|
| Context | `InputContext` | Collection of related actions (`PlayContext` for gameplay, `NavContext` for menus). `Enabled` toggles the whole group (disabling sends a final "end" signal for held inputs). `Priority` (higher runs first) + `Sink` (consume bound keys so lower-priority contexts never see them). Nested contexts have no effect. |
| Action | `InputAction` | A named mechanic. `Type` is an `Enum.InputActionType`: `Bool` (default), `Direction1D`, `Direction2D`, `Direction3D`, `ViewportPosition`. There is no `Button` item. `Enabled` resets state when set false. `DisplayName` for help/rebind UI. |
| Binding | `InputBinding` | Which hardware input drives the parent action. Several per action — one per device family. |
| Events | `Pressed`, `Released` (Bool only), `StateChanged(value)` (all types) | No `Activated`/`Deactivated` events. `GetState()` returns the current value. |
| Hints | `InputAction.PreferredBinding` (read-only) + `InputActionLabel` | Show the binding that matches the player's current device. |

An `InputAction` registers with its first `InputContext` ancestor (or a default context if none).

## Recommended structure (edit time)

IAS is designed to be arranged at edit time. Use Studio's **Input Action Manager** (Window ›
Input) or create the instances directly; under Rojo, author them as `.model.json` files so they
live on disk with the rest of the project.

```text
ReplicatedStorage/
└── Inputs/                    (Folder)
    └── PlayContext            (InputContext)
        ├── CharacterSprint    (InputAction — Type = Bool)
        │   ├── KeyboardBinding  (InputBinding — KeyCode = LeftShift)
        │   ├── GamepadBinding   (InputBinding — KeyCode = ButtonL3)
        │   └── TouchBinding     (InputBinding — UIButton = an on-screen GuiButton)
        └── CameraRotate       (InputAction — Type = Direction2D)
            ├── GamepadBinding   (KeyCode = Thumbstick2, ResponseCurve = 2)
            ├── MouseBinding     (KeyCode = MouseDelta, Scale = 0.01)
            └── TouchBinding     (KeyCode = TouchDelta, Scale = 0.01)
```

To make the **default character scripts** use IAS, select Workspace and set
`PlayerScriptsUseInputActionSystem` to `Enabled` in the Properties window. It is an
`Enum.RolloutState` (not a boolean) and is not script-accessible (Roblox-script security), so
neither game scripts, plugins, the command bar, nor `execute_luau` can read or set it — ask the user
to flip it. Your own `InputContext`s work without it.

## InputBinding properties worth knowing

| Property | Applies to | Purpose |
|---|---|---|
| `KeyCode` | all | The key/button/axis. Type should match the action (`E` for Bool, `Thumbstick1` for Direction2D). Special codes: `MouseDelta`, `TouchDelta` (pixels — scale them), `MousePosition`/`Touch` (ViewportPosition). |
| `Up`/`Down`/`Left`/`Right`/`Forward`/`Backward` | Direction1D/2D/3D | Composite directions, e.g. WASD into one Direction2D action. |
| `ClampMagnitudeToOne` (default `true`) | Direction types | Normalizes diagonals so W+D is not faster; set false for independent axes (freecam) or wheel velocity. |
| `PressedThreshold` (default `0.5`) / `ReleasedThreshold` (default `0.2`) | Bool from analog input | Trigger hysteresis: press fires at ≥ pressed, release at ≤ released. Pressed is clamped to be ≥ released. |
| `ResponseCurve` (1–10, default `1`) | Direction2D with `Thumbstick1`/`Thumbstick2` | Quadratic response curve: precise small stick movements, fast ramp at full deflection (camera aim). |
| `Scale`, `Vector2Scale`, `Vector3Scale` | Direction types | Uniform / per-component multipliers (both apply if set). |
| `PrimaryModifier`, `SecondaryModifier` | all | Required modifier `KeyCode`s (e.g. `LeftControl` + `S`). Order between the two modifiers does not matter; `KeyCode.Unknown` = none. |
| `UIButton` | Bool | A `GuiButton` whose press/release drives the action — the touch binding. |
| `UIModifier` | all | A `GuiButton` that must be held for the binding to fire — e.g. a touch thumbstick that only responds to touches starting in a region. |
| `DisplayName`, `DisplayImage` | all | Custom hint text/image; otherwise fall back to `GetStringForKeyCode`/`GetImageForKeyCode`. |
| `Type` (`Enum.InputBindingType`) | all | `Automatic` (hardware, default) or `Scriptable` (driven only by `InputBinding:Fire(state)`). |

There is **no `Deadzone` property** on `InputBinding`. For a stick deadzone, use `ResponseCurve`
to soften small inputs, or apply a deadzone in code to the value from `GetState()` (see the
thumbstick deadzone helper in `full.md`).

Scripted input: `InputBinding:Fire(state)` on a `Scriptable` binding updates the action and fires its
events (the state type must match the action type; the action and its context must be enabled).
`InputAction:Fire()` is deprecated in favour of this.

## Listening to actions

```luau
--!strict
-- Client code (LocalScript, or Script with RunContext = Client).
-- Assumes the hierarchy above exists (authored in Studio or as Rojo model files).
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local playContext = ReplicatedStorage:WaitForChild("Inputs"):WaitForChild("PlayContext")
local sprintAction = playContext:WaitForChild("CharacterSprint") :: InputAction
local cameraRotate = playContext:WaitForChild("CameraRotate") :: InputAction

sprintAction.Pressed:Connect(function()
	-- begin sprinting (client feel); the server still validates speed
end)
sprintAction.Released:Connect(function()
	-- stop sprinting
end)

-- StateChanged fires once per change, so a stick held still fires once.
-- For continuous analog input, poll GetState() every frame and scale by dt.
RunService:BindToRenderStep("CameraRotate", Enum.RenderPriority.Camera.Value + 1, function(dt)
	local state = cameraRotate:GetState() :: Vector2
	if state.Magnitude > 0 then
		-- rotate a custom camera by state * sensitivity * dt
	end
end)
```

Building instances from code uses the same classes (property is `Type`, not `ActionType`; class is
`InputBinding`, not `InputActionBinding`; set `KeyCode` directly):

```luau
--!strict
local action = Instance.new("InputAction")
action.Name = "CharacterSprint"
action.DisplayName = "Sprint"
action.Type = Enum.InputActionType.Bool
action.Parent = playContext

local binding = Instance.new("InputBinding")
binding.KeyCode = Enum.KeyCode.LeftShift
binding.Parent = action
```

## Worked example: open a menu from an action

"Press B to open the shop", "a gamepad button that toggles the inventory", "make my menu work on
console and mobile":

1. **Build the action at edit time:** under `ReplicatedStorage/Inputs/PlayContext`, add an
   `InputAction` named `ToggleShop` (`Type = Bool`) with one `InputBinding` per device family:
   `KeyCode = B` for keyboard, `KeyCode = ButtonY` for gamepad, and for touch a binding whose
   `UIButton` points at an on-screen button.
2. **Listen to the action, not the key.** One `Pressed` handler covers every device.
3. **The toggle is client-only.** Opening a menu changes nothing anyone else can see; what happens
   when the player *buys* from it is a server request (see `roblox-networking`/`roblox-monetization`).

```luau
--!strict
-- StarterPlayerScripts/ShopToggle.client.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")
local shopGui = playerGui:WaitForChild("ShopGui") :: ScreenGui
local inputs = ReplicatedStorage:WaitForChild("Inputs")
local toggleShop = inputs:WaitForChild("PlayContext"):WaitForChild("ToggleShop") :: InputAction

shopGui.Enabled = false
toggleShop.Pressed:Connect(function()
	shopGui.Enabled = not shopGui.Enabled
end)
```

While the menu is open, enable a higher-`Priority` `NavContext` with `Sink = true` (or disable
`PlayContext`) so gameplay actions bound to the same keys do not fire under the menu.

**Verification:** playtest and press the key, the gamepad button (Controller Emulator), and the touch
button (Device Emulator); `shopGui.Enabled` should toggle false → true → false. If nothing toggles,
check that the `InputContext` is `Enabled` and that a higher-`Priority` context with `Sink` is not
consuming the key.

## Showing bindings to the player

- **`InputActionLabel`** (beta at time of writing; enable under File › Beta Features): a no-code
  `GuiObject` — set its `InputAction` property and it renders the right glyph/text for the current
  device, updating on device switch or rebinding.
- **`InputAction.PreferredBinding`**: read-only; the child binding that best matches
  `UserInputService.PreferredInput`. Listen with
  `GetPropertyChangedSignal("PreferredBinding")`, then show `binding.DisplayName`/`DisplayImage` or
  fall back to `UserInputService:GetStringForKeyCode(binding.KeyCode)` /
  `GetImageForKeyCode(binding.KeyCode)`.

Build rebinding/hint UI from these public members only.

## Server Authority projects

With `Workspace.AuthorityMode = Server` (which requires `PlayerScriptsUseInputActionSystem`,
`UseFixedSimulation`, deferred signals, streaming and next-generation replication), Input Actions are
the primary way a client affects the core simulation: they are sent to the server and replayed
during client resimulation.

- Use `InputAction`s for **all** simulation-affecting input; do not use
  `UserInputService.InputBegan` (or a stream of `RemoteEvent`s) inside the core simulation.
- `InputContext`s must be descendants of the owning `Player` so the engine knows who owns them — for
  example, clone a `ReplicatedStorage.Inputs` folder into each player from a server `Script` on
  `PlayerAdded`.
- Read the actions inside `RunService:BindToSimulation()` on both client and server, sanity-check
  them before applying, and trigger animations/sounds/effects from a separate `RenderStepped`
  function that reads the simulation result.
- The binding is never a trust boundary: the server still validates every resulting action.

See `roblox-networking` for the wider client/server model.
