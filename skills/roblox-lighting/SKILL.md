---
name: roblox-lighting
description: "Roblox lighting: Lighting properties, Technology, Atmosphere, Sky, Clouds, post-processing, day/night cycles, local lights, lighting performance. Use when a scene looks flat, dark or washed out, or when setting a mood."
---

# Roblox Lighting & Atmosphere

## When to Load

Load for Roblox lighting, atmosphere, sky/clouds, day/night, or post-processing (Bloom, ColorCorrection, ColorGrading, DepthOfField).

## Quick Reference

### Lighting Service
```luau
Lighting.ClockTime = 14            -- 0-24 numeric
Lighting.Brightness = 2            -- 0-10, default 2
Lighting.Ambient = Color3.fromRGB(70, 70, 70)        -- shadow fill
Lighting.OutdoorAmbient = Color3.fromRGB(128, 128, 128)
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.2      -- 0=sharp, 1=soft (Realistic style only)
Lighting.ExposureCompensation = 0  -- -5..5 stops; prefer this over cranking Brightness
```
**Technology/style:** set in the Properties window. `Technology` is Studio-only (not scriptable); only its `Compatibility` value is deprecated — choose `Future` for new work. `LightingStyle` (`Realistic`/`Soft`) and `PrioritizeLightingQuality` are listed as script-writable, but runtime writes may not take effect everywhere — verify in a playtest.

### Atmosphere
```luau
local atmo = Instance.new("Atmosphere")
atmo.Density = 0.3    -- 0=clear, 1=opaque (keep <0.5)
atmo.Offset = 0.25    -- 0=ground, 1=sky
atmo.Color = Color3.fromRGB(199, 199, 199)   -- near fog
atmo.Decay = Color3.fromRGB(92, 92, 92)      -- far/horizon
atmo.Glare = 0        -- 0-10
atmo.Haze = 0         -- 0-10
atmo.Parent = Lighting
```

### Post-Processing (all parented to Lighting)
| Effect | Key Properties |
|--------|---------------|
| `BloomEffect` | Intensity (0-1), Size (px), Threshold (>0.7 recommended) |
| `ColorCorrectionEffect` | Brightness, Contrast, Saturation (-1 to 1), TintColor |
| `DepthOfFieldEffect` | FarIntensity, FocusDistance, InFocusRadius, NearIntensity |
| `SunRaysEffect` | Intensity (0-1), Spread (0-1) |
| `ColorGradingEffect` | TonemapperPreset (`Default` vivid / `Retro` flatter pre-2019 look); one per Lighting |

**Sky & clouds:** `Sky` in `Lighting` (skybox faces, sun/moon textures and sizes, `StarCount`, `CelestialBodiesShown`). `Clouds` only renders under `workspace.Terrain` (`Cover`, `Density`, `Color`).

### Day/Night Cycle
Don't write `ClockTime` every frame on the server (each write replicates). Step it about once a second, or let clients compute it from a shared start time (full.md).
```luau
local DAY_LENGTH_MINUTES = 12
local HOURS_PER_SECOND = 24 / (DAY_LENGTH_MINUTES * 60)
task.spawn(function()
    while true do
        task.wait(1)
        Lighting.ClockTime = (Lighting.ClockTime + HOURS_PER_SECOND) % 24
    end
end)
```

### Local Lights
| Light | Use | Key Props |
|-------|-----|-----------|
| `PointLight` | Lamps, torches | Range, Brightness, Color |
| `SpotLight` | Flashlights | Range, Angle, Face |
| `SurfaceLight` | Screens, panels | Range, Angle, Face |

**Perf:** Limit shadow-casting lights to 4-6 visible. Use `Shadows=false` on most. Neon material = cheap glow.

**With studio-mcp:** lighting lives in the place file, not Rojo code (unless the project maps `Lighting`). `screen_capture` a fixed camera position first, then `execute_luau` (`datamodel_type: "Edit"`) to set `Lighting`/`Atmosphere`/effect properties in one small batch and return the old values, then `screen_capture` the same position to compare. Check phone-class graphics in a playtest before keeping a change. Offline: give the user a property list or a command-bar snippet.

### Common Pitfalls
- Brightness >3 washes out. Density >0.5 = soup. Max 2-3 post effects.
- Avoid black Ambient. One `ColorCorrectionEffect` (tweened) beats stacking several.

### References
- Mood presets (Day, Golden Hour, Night, Horror, Underwater, Sci-Fi), zone tweens, sky/clouds, full examples: [references/full.md](references/full.md)
- Terrain materials and `MaterialVariant`: `roblox-building`; frame-time budgets: `roblox-performance`.
