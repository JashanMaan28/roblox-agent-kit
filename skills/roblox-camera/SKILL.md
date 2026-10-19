---
name: roblox-camera
description: "Roblox camera: default camera settings, Scriptable cameras, CFrame math, screen raycasts, first/third person, occlusion, cutscenes, screen shake. Use when scripting or fixing camera behavior."
---

# Roblox Camera

## When to Load

Load when scripting custom camera behavior (cutscenes, third-person follow, custom rotation), manipulating `CFrame` for placement/rotation, raycasting from the screen, or building a non-default player view. Client-only.

## Quick Reference

**The Camera**: `workspace.CurrentCamera`: one per client. Set `CameraType = Scriptable` to disable defaults and take full control. Without it, defaults overwrite your CFrame every frame.

**CameraType**: `Fixed`, `Attach`/`Watch`/`Track`/`Follow` (subject-following), `Custom` (default), `Scriptable` (no default), `Orbital` (fixed Y, rotates around player). `CameraSubject` cannot be `nil`: setting it reverts.

**Key properties**: `CFrame`, `CameraSubject`, `FieldOfView` (deg), `FieldOfViewMode` (`Vertical`/`Diagonal`), `NearPlaneZ`, `ViewportSize`, `HeadLocked`, `HeadScale`, `Focus`.

**CFrame essentials**:

| Operation | Luau |
| --- | --- |
| Position only | `CFrame.new(position)` |
| Look at target | `CFrame.lookAt(position, target, upVector)` |
| XYZ rotation | `CFrame.Angles(rx, ry, rz)` |
| Local to world | `cf * Vector3.new(0, 0, 10)` |
| Interpolate | `cf:Lerp(goal, alpha)` |
| Unit axes | `cf.LookVector`, `cf.RightVector`, `cf.UpVector` |

**Custom camera loop**: always `PreRender`, never `Heartbeat`:

```luau
camera.CameraType = Enum.CameraType.Scriptable
RunService.PreRender:Connect(function(dt)
    local desired = CFrame.lookAt(head.Position - offset, head.Position)
    camera.CFrame = camera.CFrame:Lerp(desired, math.min(dt * 10, 1))
end)
```

**Raycasting from camera**: `camera:ScreenPointToRay(mx, my)` (accounts for GUI inset) vs `camera:ViewportPointToRay(mx, my)` (raw, NO inset). `ScreenPointToRay` returns a unit Ray (1 stud); multiply `Direction` by length for the actual raycast.

**Customise before replacing**: `StarterPlayer`/`Player` `CameraMode` (`LockFirstPerson`), `CameraMinZoomDistance`/`CameraMaxZoomDistance`, `DevCameraOcclusionMode` (`Zoom`/`Invisicam`), `EnableMouseLockOption`/`DevEnableMouseLock` (shift-lock), `Humanoid.CameraOffset`. Layer effects on the default camera with `RunService:BindToRenderStep(name, Enum.RenderPriority.Camera.Value + 1, fn)`.

**Custom third-person**: raycast/spherecast from the focus to the desired camera position and pull in on hit (full.md "Occlusion").

**Accessibility**: check `GuiService.ReducedMotionEnabled` before shake, bob or sway.

**Pitfalls**:
- Client-only. Server sets silently dropped.
- Without `Scriptable`, defaults overwrite your CFrame every frame.
- `PreRender` for camera (visual sync). `Heartbeat` adds 1-frame lag. `RenderStepped` still works but is superseded by `PreRender`.
- `Camera.CFrame` lacks VR head rotation; use `GetRenderCFrame()` for the true view.
- `SetRoll` is outdated; apply roll via `CFrame.Angles(0, 0, roll)` on CFrame. `Interpolate`, `PanUnits`, `TiltUnits` are deprecated (tween `CFrame` with `TweenService`).
- `WorldToScreenPoint`/`WorldToViewportPoint` return a tuple `(Vector3, onScreen: boolean)`.
- `CFrame.new(pos, lookAt)` is legacy (back-compat only); use `CFrame.lookAt(at, lookAt)` for new code.

See [references/full.md](references/full.md) for default-camera settings, first/third-person recipes, occlusion, cutscenes, screen shake, mouse-look, full API. Input bindings: `roblox-input`.
