# Responsive Roblox UI

Read this when a screen must adapt across viewport sizes, when layout defects appear outside the
author's primary monitor, or when wiring gamepad/touch focus for a menu. This reference targets
Roblox's rolling platform APIs. Adapted from the gamedev-skills roblox-ui skill (Apache-2.0); see
`../ATTRIBUTION.md`.

## Choose structure before coordinates

1. Identify persistent regions: HUD edge groups, header, primary content, secondary detail,
   footer/action row, modal layer.
2. Decide what changes on narrow screens. Reflow or collapse secondary regions; do not only scale
   the desktop composition down.
3. Anchor edge-owned regions to their edge (`AnchorPoint` must match `Position`). Put siblings in
   layouts instead of manually positioning each child.
4. Use offsets for bounded component dimensions and spacing; use scale for proportional placement
   and flexible region size. Inspect `AbsoluteSize`, not device names, for layout breakpoints.
5. Author a readable hierarchy: the screen shell should be named, editable Instances (on disk as
   Rojo `.model.json`/`.rbxmx` or built by a small module), with procedural generation reserved for
   genuinely data-driven repetition such as item cells.

```text
StarterGui
└── InventoryGui (ScreenGui; ResetOnSpawn = false)
    ├── Root (Frame)
    │   ├── Header
    │   ├── Content
    │   │   ├── CategoryList
    │   │   ├── ItemGrid (ScrollingFrame)
    │   │   └── DetailsPanel
    │   └── Footer
    └── InventoryController (LocalScript)
```

## Roblox layout primitives

| Need | Primitive | Check |
|---|---|---|
| vertical/horizontal flow | `UIListLayout` | `Padding`, alignment, flex behavior, content size |
| distribute a row/column's spare space | `UIListLayout` `HorizontalFlex`/`VerticalFlex` | set fill direction first; `UIFlexAlignment` Fill/SpaceBetween/SpaceAround/SpaceEvenly |
| align or stretch items across their line | `UIListLayout` `ItemLineAlignment` | Stretch fills the cross-axis; aligns uneven item heights/widths |
| make one item absorb the variable space | `UIFlexItem` (`FlexMode`) | child of the flexing item; `UIFlexMode` Fill/Grow/Shrink/Custom |
| uniform collection | `UIGridLayout` | cell size at narrow/wide bounds; scroll canvas |
| true rows and columns | `UITableLayout` | headers and cell alignment; avoid for card collections |
| inner spacing | `UIPadding` | use one spacing scale; include it in width calculations |
| content-driven object | `AutomaticSize` | localization, wrapping, and circular dependencies |
| content-driven scrolling | `AutomaticCanvasSize` | scrolling direction and bottom reachability |
| proportional shape/media | `UIAspectRatioConstraint` | avoid constraining text-heavy containers |
| min/max component size | `UISizeConstraint` | test both limits, not only preferred width |
| bounded text scaling | `UITextSizeConstraint` | still test localization and TV distance |
| deliberate subtree zoom | `UIScale` | avoid using one scale as the entire responsive system |

### Flex distribution

Flex lets a `UIListLayout` share a row or column's spare space without manual
`AbsoluteSize` math. Set the fill direction, then set `HorizontalFlex` (or `VerticalFlex`)
to a `UIFlexAlignment` value to distribute space along that axis, and `ItemLineAlignment`
to align or stretch items across the line. To make one specific item absorb the variable
space (fixed labels at both ends, a flexible bar between), parent a `UIFlexItem` to that
item and set its `FlexMode`.

```luau
-- Tab bar whose tabs share the width equally, whatever the count:
tabBar.UIListLayout.FillDirection = Enum.FillDirection.Horizontal
tabBar.UIListLayout.HorizontalFlex = Enum.UIFlexAlignment.Fill

-- Slider row: the labels keep their size, the track fills the gap between them.
local grow = Instance.new("UIFlexItem")
grow.FlexMode = Enum.UIFlexMode.Fill
grow.Parent = sliderTrack -- a sibling under the row's UIListLayout
```

Prefer a `UIGridLayout` when cells must align strictly in both axes; reach for flex only
where a row/column genuinely needs variable distribution, since it adds a small layout
cost when resizing or adding/removing items.

### Layout that survives content and viewport changes

Switch composition at a breakpoint measured from the container's own `AbsoluteSize`:

```luau
-- Authored properties on ItemGrid (ScrollingFrame):
--   AutomaticCanvasSize = Enum.AutomaticSize.Y
--   CanvasSize = UDim2.fromOffset(0, 0)
-- Children: UIPadding + UIGridLayout
local grid = itemGrid.UIGridLayout
local projectBreakpoint = 700 -- derive from where this composition stops being usable

local function applyComposition()
    local narrow = root.AbsoluteSize.X < projectBreakpoint
    categoryList.UIListLayout.FillDirection = if narrow
        then Enum.FillDirection.Horizontal
        else Enum.FillDirection.Vertical
    categoryList.Size = if narrow
        then UDim2.new(1, 0, 0, 40)
        else UDim2.new(0, 148, 1, 0)
    itemGrid.Position = if narrow then UDim2.fromOffset(0, 52) else UDim2.fromOffset(164, 0)
    itemGrid.Size = if narrow
        then UDim2.new(1, 0, 1, -52)
        else UDim2.new(0.58, -164, 1, 0)
    detailsPanel.Visible = not narrow -- open details as a separate narrow-screen state

    local width = itemGrid.AbsoluteSize.X
    local columns = if width < 520 then 2 elseif width < 820 then 3 else 4
    local gap = 12
    local usable = width - itemGrid.UIPadding.PaddingLeft.Offset
        - itemGrid.UIPadding.PaddingRight.Offset - gap * (columns - 1)
    grid.CellSize = UDim2.fromOffset(math.floor(usable / columns), 112)
    grid.CellPadding = UDim2.fromOffset(gap, gap)
end

root:GetPropertyChangedSignal("AbsoluteSize"):Connect(applyComposition)
applyComposition()
```

## Safe areas and reserved controls

For interactive `ScreenGui` content, retain `ScreenInsets = CoreUISafeInsets` unless the design
has a measured reason not to. Decorative backgrounds may intentionally bleed into `None`, but put
interactive descendants in a separate inset-aware `ScreenGui` or safe root.
`GuiService:GetInsetArea(Enum.ScreenInsets.CoreUISafeInsets)` returns the actual inset rectangle when
custom positioning needs it — the `ScreenInsets` argument is required, and which inset set you ask
for is the point of the call. `GuiService.TopbarInset` gives the topbar rectangle on its own.

Mobile tests must include the bottom-left movement control and bottom-right jump/action region.
Console tests must consider viewing distance and overscan, not just a desktop window enlarged to TV
resolution.

Do not choose breakpoints from device labels. Choose them where the composition loses usable width:
for example, a sidebar + grid + detail view must switch to a horizontal category strip, full-width
grid, and separate detail state before any region becomes token-width. On touch, relocate bottom
actions away from reserved controls and remove irrelevant controller hint rows.

## Picking the UI mode: PreferredInput, not capability flags

Choose hints, focus behavior, and touch-only controls from `UserInputService.PreferredInput`
(`KeyboardAndMouse`, `Gamepad`, `Touch`, `MicroGamepad`) and listen for changes. Capability flags
such as `GamepadEnabled`, `TouchEnabled`, and `KeyboardEnabled` only say a device *exists*: a touch
laptop or a phone with a paired controller reports several at once, and Device Emulator can expose
keyboard capability while touch controls are showing.

```luau
local GuiService = game:GetService("GuiService")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local function wantsSelection(): boolean
    local mode = UserInputService.PreferredInput
    return mode == Enum.PreferredInput.Gamepad or mode == Enum.PreferredInput.MicroGamepad
end

local function openInventory()
    root.Visible = true
    task.spawn(function()
        RunService.RenderStepped:Wait() -- selection target must be rendered and selectable
        if root.Visible and wantsSelection() then
            GuiService.SelectedObject = firstItemButton
        end
    end)
end

local function closeInventory()
    GuiService.SelectedObject = nil
    root.Visible = false
end

UserInputService:GetPropertyChangedSignal("PreferredInput"):Connect(function()
    if not wantsSelection() and GuiService.SelectedObject then
        GuiService.SelectedObject = nil -- drop stale gamepad focus when switching away
    end
end)
```

Prefer `Activated` over separate mouse/touch handlers. Set `NextSelectionUp/Down/Left/Right`
when automatic navigation is ambiguous, especially around grids, sidebars, and modals.

## Modal focus

When a modal opens:

1. remember the prior selected object if it still belongs to the underlying screen;
2. prevent interaction with the screen beneath it;
3. select the modal's first safe (non-destructive) control;
4. keep directional navigation inside the modal;
5. on close, restore the prior object or a stable fallback.

To keep directional navigation inside the modal, set `GuiBase2d.SelectionGroup = true` on the modal
root and set its `SelectionBehaviorUp`/`Down`/`Left`/`Right` to `Enum.SelectionBehavior.Stop`. This
property-based approach is the simplest for new work. The older imperative
`GuiService:AddSelectionParent()`/`AddSelectionTuple()`/`RemoveSelectionGroup()` methods are still
documented (not deprecated) and also restrict navigation to a named group; if you use them, always
remove the group on close.

Inspect Roblox's default selection adornment in context. If it overwhelms the interface, assign a
project-owned `SelectionImageObject`; it must remain a valid visible `GuiObject` (it can live
offscreen as the reusable template). Keep focus feedback visible rather than disabling it.

## Density and visual rhythm

Derive a small spacing scale from the existing game (for example 4/8/12/16/24, not a mandated
universal scale). Reuse it for padding, gaps, icon-to-label space, and section separation. A larger
gap signals a stronger grouping boundary. Choose text roles (title, section, body, metadata) and
keep role sizes/weights stable. Use consistent icon boxes even when source art has different bounds.

Visual quality gates:

- Establish hierarchy through size, weight, contrast, grouping, and whitespace before adding
  decoration.
- Preserve the game's fonts, palette, icons, radii, and strokes. If none exist, define a compact
  token module; do not improvise per component.
- Avoid nested card-on-card shells, universal pills, arbitrary gradients/glows/shadows, neon
  outlines, excessive transparency/blur, oversized headings, meaningless icons, and huge empty panels.
- Buttons with different importance should not look identical.
- Motion communicates open/close, focus, confirmation, or spatial relationship. Keep it short and
  interruptible; honor `GuiService.ReducedMotionEnabled` by replacing movement with an instant
  state or a short opacity change.

## Required verification matrix

| Configuration | Inspect |
|---|---|
| desktop, mouse + keyboard | hover/pressed, resizing, ultrawide or tall extreme |
| narrow mobile portrait (if the game allows portrait) | reflow, touch reach, wrapping, scrolling, safe cutouts |
| mobile landscape | reserved controls, low vertical space, modal height |
| tablet-like | density and excessive empty space |
| console/gamepad | initial focus, every directional edge, back action, TV readability |

For every configuration, exercise open/close, content-empty/content-full, long localized-like text,
disabled and error states, scrolling to both ends, and character respawn. Record observed defects
and the exact change that fixed them. With `studio-mcp`, read `AbsolutePosition`/`AbsoluteSize` via
`execute_luau` during a playtest and use `screen_capture` to judge the rendered result; Device
Emulator and Controller Emulator are still the way to switch device profiles.

## Common failures

| Symptom | Likely cause | Remedy |
|---|---|---|
| UI disappears or duplicates after respawn | wrong `ResetOnSpawn` policy or stale clone | choose policy; reacquire from `PlayerGui`; clean old bindings |
| Phone layout clips | desktop offsets/global scale used as layout | add narrow composition, layouts, bounds, and Device Emulator checks |
| Content hidden under topbar/notch | insets ignored or `ScreenInsets = None` | use `CoreUISafeInsets` for interactive UI; inspect intentional bleed |
| Scroll ends early | fixed `CanvasSize` | use `AutomaticCanvasSize` or layout `AbsoluteContentSize` |
| Controller gets stuck | no entry selection or bad neighbor graph | set initial `SelectedObject`; define and test focus edges/modal trap |
| UI looks generated | decoration substituted for hierarchy | remove effects; align, reduce nesting, fix density and component roles |
| Increasing connection/tween count | screen rebinds without cleanup | own connections per screen lifecycle; disconnect/cancel on teardown |

## Primary references

- https://create.roblox.com/docs/ui/on-screen-containers
- https://create.roblox.com/docs/ui/position-and-size
- https://create.roblox.com/docs/ui/size-modifiers
- https://create.roblox.com/docs/ui/list-flex-layouts
- https://create.roblox.com/docs/production/publishing/adaptive-design
- https://create.roblox.com/docs/reference/engine/classes/GuiService
- https://create.roblox.com/docs/reference/engine/enums/PreferredInput
