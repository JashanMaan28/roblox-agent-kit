# Roblox Lighting & Atmosphere


> **Code in this reference is illustrative. Adapt to your game and verify in Studio before production use.**

Use this skill when configuring lighting, atmosphere, time of day, post-processing effects, or creating visual mood for a game.

## Lighting Service Properties

```luau
local Lighting = game:GetService("Lighting")

-- Time of day (24-hour format as string)
Lighting.ClockTime = 14          -- 2 PM (numeric, 0-24)
Lighting.TimeOfDay = "14:00:00"  -- same thing as string

-- Core lighting
Lighting.Brightness = 2          -- sun intensity (0-10, default 2)
Lighting.Ambient = Color3.fromRGB(70, 70, 70)      -- shadow color
Lighting.OutdoorAmbient = Color3.fromRGB(128, 128, 128) -- outdoor shadow fill
Lighting.ColorShift_Top = Color3.fromRGB(0, 0, 0)  -- sky color tint
Lighting.ColorShift_Bottom = Color3.fromRGB(0, 0, 0) -- ground bounce tint

-- Shadows
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.2    -- 0 = sharp, 1 = very soft
-- Environment
Lighting.EnvironmentDiffuseScale = 1  -- how much skybox colors affect surfaces
Lighting.EnvironmentSpecularScale = 1 -- skybox reflections on shiny surfaces
Lighting.ExposureCompensation = 0     -- -5..5 stops before tonemapping (1 = twice as bright, -1 = half)
```

### Lighting technology and style (set in Studio)

- **`Technology`** is non-scriptable and only modifiable in Studio's Properties window. Of its values, only **`Compatibility`** is deprecated (use `Voxel` plus a `ColorGradingEffect` set to `Retro` for that look). For new work choose **`Future`** (most advanced lights and shadows); `ShadowMap` and `Voxel` are cheaper options.
- **`LightingStyle`** (`Realistic` / `Soft`) and **`PrioritizeLightingQuality`** are the newer artistic-intent settings the current lighting guide describes (`ShadowSoftness` only applies with `Realistic`). Set them in the Properties window so they save with the place. The API reference lists both as script-writable, but whether changing them at runtime takes effect on every device is not documented — verify in a playtest before relying on runtime writes.

## Atmosphere

The `Atmosphere` object controls fog, haze, and sky color blending:

```luau
local atmo = Instance.new("Atmosphere")
atmo.Density = 0.3       -- fog thickness (0 = clear, 1 = opaque)
atmo.Offset = 0.25       -- how high fog starts (0 = ground, 1 = sky)
atmo.Color = Color3.fromRGB(199, 199, 199)  -- fog color (near)
atmo.Decay = Color3.fromRGB(92, 92, 92)     -- fog color (far/horizon)
atmo.Glare = 0           -- sun glare intensity (0-10)
atmo.Haze = 0            -- atmospheric haze (0-10)
atmo.Parent = Lighting
```

## Sky and clouds

- **`Sky`** (child of `Lighting`) replaces the default skybox: six faces (`SkyboxUp`/`Dn`/`Lf`/`Rt`/`Ft`/`Bk`, or the `...Content` variants), `SkyboxOrientation` to rotate it, `SunTextureId`/`MoonTextureId`, `SunAngularSize`/`MoonAngularSize`, `StarCount`, and `CelestialBodiesShown` to hide the sun and moon. With an `Atmosphere` in `Lighting`, the legacy `Lighting.Fog*` properties are hidden and the atmosphere tints the horizon.
- **`Clouds`** renders dynamic clouds only when parented under **`workspace.Terrain`**: `Cover` (0–1, how much sky is covered), `Density` (0–1, how opaque), `Color`, `Enabled`. Tween `Cover`/`Density` for weather.

```luau
local clouds = Instance.new("Clouds")
clouds.Cover = 0.6
clouds.Density = 0.4
clouds.Color = Color3.fromRGB(230, 230, 240)
clouds.Parent = workspace.Terrain -- clouds don't render anywhere else
```

## Post-Processing Effects

All post-processing goes as children of Lighting (or of the `Camera` for a per-client effect):

### BloomEffect
```luau
local bloom = Instance.new("BloomEffect")
bloom.Intensity = 0.5    -- glow strength (0-1)
bloom.Size = 24          -- glow spread (pixels)
bloom.Threshold = 0.8    -- brightness threshold to bloom (0-1)
bloom.Parent = Lighting
```

### ColorCorrectionEffect
```luau
local cc = Instance.new("ColorCorrectionEffect")
cc.Brightness = 0        -- -1 to 1
cc.Contrast = 0.1        -- -1 to 1
cc.Saturation = 0.1      -- -1 to 1 (negative = desaturated)
cc.TintColor = Color3.fromRGB(255, 255, 255) -- color overlay
cc.Parent = Lighting
```

### DepthOfFieldEffect
```luau
local dof = Instance.new("DepthOfFieldEffect")
dof.FarIntensity = 0.3   -- blur at far distance
dof.FocusDistance = 50    -- studs where focus is sharpest
dof.InFocusRadius = 30   -- studs of sharp focus range
dof.NearIntensity = 0    -- blur at near distance
dof.Parent = Lighting
```

### ColorGradingEffect (tonemapping)
```luau
local grading = Instance.new("ColorGradingEffect")
grading.TonemapperPreset = Enum.TonemapperPreset.Retro -- Default = vivid post-2019 look; Retro = flatter pre-2019 look
grading.Parent = Lighting -- ignored elsewhere; only the most recently parented one applies
```

Pair it with `Lighting.ExposureCompensation` for overall scene exposure instead of pushing `Brightness`.

### SunRaysEffect
```luau
local rays = Instance.new("SunRaysEffect")
rays.Intensity = 0.1     -- ray visibility (0-1)
rays.Spread = 0.5        -- ray spread angle (0-1)
rays.Parent = Lighting
```

## Mood Presets

### Bright Day (default/casual)
```luau
Lighting.ClockTime = 14
Lighting.Brightness = 2
Lighting.Ambient = Color3.fromRGB(128, 128, 128)
Lighting.OutdoorAmbient = Color3.fromRGB(128, 128, 128)
-- Atmosphere: light haze
atmo.Density = 0.2
atmo.Offset = 0.5
atmo.Color = Color3.fromRGB(200, 220, 255)
```

### Golden Hour (warm, cinematic)
```luau
Lighting.ClockTime = 17.5
Lighting.Brightness = 2
Lighting.Ambient = Color3.fromRGB(80, 60, 40)
Lighting.OutdoorAmbient = Color3.fromRGB(150, 120, 80)
Lighting.ColorShift_Top = Color3.fromRGB(255, 200, 100)
-- Atmosphere: warm fog
atmo.Density = 0.3
atmo.Offset = 0.3
atmo.Color = Color3.fromRGB(255, 200, 150)
atmo.Decay = Color3.fromRGB(200, 100, 50)
-- Post: warm tint
cc.TintColor = Color3.fromRGB(255, 240, 220)
cc.Contrast = 0.1
bloom.Intensity = 0.4
bloom.Threshold = 0.7
```

### Night (dark, moody)
```luau
Lighting.ClockTime = 0
Lighting.Brightness = 0.5
Lighting.Ambient = Color3.fromRGB(30, 30, 50)
Lighting.OutdoorAmbient = Color3.fromRGB(20, 20, 40)
-- Atmosphere: dark blue fog
atmo.Density = 0.4
atmo.Offset = 0.1
atmo.Color = Color3.fromRGB(20, 20, 50)
-- Post: blue tint, low saturation
cc.TintColor = Color3.fromRGB(180, 190, 255)
cc.Saturation = -0.2
cc.Brightness = -0.05
```

### Horror (oppressive, claustrophobic)
```luau
Lighting.ClockTime = 22
Lighting.Brightness = 0.3
Lighting.Ambient = Color3.fromRGB(10, 10, 15)
Lighting.OutdoorAmbient = Color3.fromRGB(5, 5, 10)
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.1 -- sharp shadows = scarier
-- Atmosphere: thick dark fog
atmo.Density = 0.5
atmo.Offset = 0
atmo.Color = Color3.fromRGB(10, 10, 10)
-- Post: desaturated, dark
cc.Saturation = -0.4
cc.Contrast = 0.2
cc.Brightness = -0.1
-- No bloom (bloom = cheerful)
```

### Underwater
```luau
Lighting.ClockTime = 12
Lighting.Brightness = 1
Lighting.Ambient = Color3.fromRGB(20, 60, 80)
-- Atmosphere: heavy blue-green
atmo.Density = 0.7
atmo.Offset = 0
atmo.Color = Color3.fromRGB(30, 100, 120)
atmo.Decay = Color3.fromRGB(10, 40, 60)
-- Post: blue tint, blur
cc.TintColor = Color3.fromRGB(150, 200, 255)
cc.Saturation = -0.3
-- DepthOfField for murky distance
dof.FarIntensity = 0.5
dof.FocusDistance = 30
dof.InFocusRadius = 20
```

### Sci-Fi (clean, high-tech)
```luau
Lighting.ClockTime = 12
Lighting.Brightness = 3
Lighting.Ambient = Color3.fromRGB(100, 100, 120)
-- Atmosphere: minimal, clean
atmo.Density = 0.1
atmo.Color = Color3.fromRGB(200, 210, 255)
-- Post: slight blue, high contrast
cc.TintColor = Color3.fromRGB(230, 240, 255)
cc.Contrast = 0.15
bloom.Intensity = 0.6
bloom.Threshold = 0.6
bloom.Size = 30
```

## Dynamic Lighting

### Day/Night Cycle

Don't write `ClockTime` every frame on the server: each write replicates to every client. Either step it at a modest rate from the server, or have each client compute the time locally from a shared start time (smooth and free of network traffic).

```luau
-- Server: one authoritative clock, stepped every second.
local Lighting = game:GetService("Lighting")

local DAY_LENGTH_MINUTES = 12 -- real minutes per in-game day
local STEP_SECONDS = 1
local HOURS_PER_SECOND = 24 / (DAY_LENGTH_MINUTES * 60)

task.spawn(function()
    while true do
        task.wait(STEP_SECONDS)
        Lighting.ClockTime = (Lighting.ClockTime + HOURS_PER_SECOND * STEP_SECONDS) % 24
    end
end)
```

```luau
-- Client-driven alternative: the server publishes the cycle start once
-- (workspace:SetAttribute("DayStart", workspace:GetServerTimeNow())), and each client derives the time.
local Lighting = game:GetService("Lighting")
local RunService = game:GetService("RunService")

local DAY_LENGTH_SECONDS = 12 * 60
local START_HOUR = 8

RunService.Heartbeat:Connect(function()
    local start = workspace:GetAttribute("DayStart")
    if not start then return end
    local elapsed = workspace:GetServerTimeNow() - start
    Lighting.ClockTime = (START_HOUR + elapsed / DAY_LENGTH_SECONDS * 24) % 24
end)
```

If both run, the server's replicated writes and the client's local writes fight; pick one.

### Zone-Based Lighting (indoor/outdoor)

```luau
-- Client: tween lighting when entering zones
local function transitionToIndoor()
    TweenService:Create(Lighting, TweenInfo.new(1), {
        Brightness = 1,
        Ambient = Color3.fromRGB(100, 90, 70),
    }):Play()
    TweenService:Create(atmo, TweenInfo.new(1), {
        Density = 0,
    }):Play()
end

local function transitionToOutdoor()
    TweenService:Create(Lighting, TweenInfo.new(1), {
        Brightness = 2,
        Ambient = Color3.fromRGB(128, 128, 128),
    }):Play()
    TweenService:Create(atmo, TweenInfo.new(1), {
        Density = 0.3,
    }):Play()
end
```

## Local Lights

### Light Types

| Light | Use for | Key properties |
|-------|---------|---------------|
| `PointLight` | Lamps, torches, orbs | Range, Brightness, Color |
| `SpotLight` | Flashlights, stage lights | Range, Angle, Face |
| `SurfaceLight` | Screens, panels, signs | Range, Angle, Face |

### Practical Light Setup

```luau
local function createTorch(part: BasePart)
    -- Neon glow (visual only, no actual light)
    part.Material = Enum.Material.Neon
    part.Color = Color3.fromRGB(255, 150, 50)

    -- Actual light emission
    local light = Instance.new("PointLight")
    light.Color = Color3.fromRGB(255, 170, 80)
    light.Brightness = 2
    light.Range = 20
    light.Shadows = true -- expensive, use sparingly
    light.Parent = part
end
```

### Performance Note

- Shadows on lights are expensive. Limit to 4-6 shadow-casting lights visible at once.
- PointLight.Shadows = false is much cheaper than true.
- Use Neon material for visual glow without the performance cost of actual lights.
- On mobile, consider disabling light shadows entirely.

## Common Mistakes

- **Brightness too high**: Values above 3 wash out everything. Start at 2.
- **Atmosphere Density too high**: Above 0.5 makes everything look like soup. Subtle is better.
- **Too many post-processing effects**: Each one costs frame time. Pick 2-3 max.
- **Bloom on everything**: High bloom + low threshold = everything glows. Use threshold > 0.7.
- **No Ambient light**: Setting Ambient to black makes shadows pitch black (unrealistic). Always have some fill.
- **Lighting technology settings**: `Technology` is set in Studio only (not scriptable); its `Compatibility` value is deprecated — use `Future` for new work. Set `LightingStyle` and `PrioritizeLightingQuality` in Properties; the API lists them as script-writable, but verify any runtime change in a playtest. Check the result on desktop and mobile.
- **Writing `ClockTime` every frame on the server**: floods replication. Step it every 0.5–1 s, or drive it on clients.
- **Stacking ColorCorrection**: Multiple ColorCorrectionEffects multiply. Use one and tween its properties.
- **Not testing on mobile**: Lighting that looks great on desktop can be invisible or washed out on mobile screens.

## Sources (upstream SKILL.md)

Sources listed by the upstream skill (TabooHarmony/roblox-brain); later edits in this plugin were checked against the current Creator Hub API reference.

- https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/environment/lighting.md
- https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/environment/atmosphere.md
- https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/environment/post-processing-effects.md
