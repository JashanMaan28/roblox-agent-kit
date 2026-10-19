# Roblox Audio: Full Reference


> **Code in this reference is illustrative. Adapt to your game and verify in Studio before production use.**

## Legacy System (Sound Objects)

### Where to Place Sounds

| Location | Behavior | Use for |
|----------|----------|---------|
| Child of block/sphere/cylinder BasePart | Volumetric: emits from entire surface, volume changes with distance AND part size | Ambient zones, large area sounds |
| Child of Attachment, MeshPart, TrussPart, WedgePart | Point source: emits from single point, volume changes with distance | Footsteps, impacts, small objects |
| Within SoundService or Workspace | Global: same volume everywhere regardless of position | Background music, UI sounds |

### Basic Playback

```luau
-- Background music (global, in SoundService)
local SoundService = game:GetService("SoundService")
local bgMusic = Instance.new("Sound")
bgMusic.Name = "BackgroundMusic"
bgMusic.SoundId = "rbxassetid://1843463175"
bgMusic.Looped = true
bgMusic.Volume = 0.25
bgMusic.Parent = SoundService
bgMusic:Play()
```

```luau
-- Positional sound (3D, on a part)
local waterfall = Instance.new("Sound")
waterfall.SoundId = "rbxassetid://ASSET_ID"
waterfall.Looped = true
waterfall.Volume = 0.5
waterfall.RollOffMode = Enum.RollOffMode.InverseTapered
waterfall.RollOffMinDistance = 10  -- full volume within this range
waterfall.RollOffMaxDistance = 100 -- silent beyond this range
waterfall.Parent = workspace.WaterfallPart
waterfall:Play()
```

### RollOff Modes

| Mode | Behavior |
|------|----------|
| `Inverse` | Realistic falloff (1/distance). Drops quickly near source, slowly far away. |
| `Linear` | Linear falloff between min and max distance. |
| `InverseTapered` | Inverse near the source, tapers to silence at max. Most natural for games. |
| `LinearSquare` | Attempt at realistic with linear square curve. |

- `RollOffMinDistance`: distance (studs) where volume starts decreasing. Default 10.
- `RollOffMaxDistance`: distance where volume reaches zero. Default 10000 (effectively infinite).

### SoundGroups (Audio Mixer)

SoundGroups let you control volume of multiple sounds at once. Nest them for a mix tree.

```luau
-- Create mix hierarchy in SoundService
local master = Instance.new("SoundGroup")
master.Name = "Master"
master.Volume = 1
master.Parent = SoundService

local music = Instance.new("SoundGroup")
music.Name = "Music"
music.Volume = 0.5
music.Parent = master  -- nested under Master

local sfx = Instance.new("SoundGroup")
sfx.Name = "SFX"
sfx.Volume = 0.8
sfx.Parent = master

-- Assign a sound to a group
bgMusic.SoundGroup = music
```

Adjusting `master.Volume` affects ALL nested groups. Players can control Music vs SFX independently.

### Playing part of a sound, and local-only playback

- `Sound.PlaybackRegion` (`NumberRange`, seconds) plays only a slice of the asset — useful for one long file of cues; `Sound.LoopRegion` loops a sub-range (e.g. intro then loop body). Check the `Sound` reference for how out-of-range values are clamped.
- `SoundService:PlayLocalSound(sound)` plays a **copy** of a `Sound` only for the calling client, regardless of where the sound is parented; volume, speed, spatialization and SoundGroup effects carry over, `Looped` does not. Good for UI clicks and local feedback without creating instances.

```luau
local SoundService = game:GetService("SoundService")
local click = SoundService.UI.Click -- a Sound template
SoundService:PlayLocalSound(click)
```

### Dynamic Effects

Parent these to a Sound or SoundGroup to modify audio:

| Effect | What it does | Use for |
|--------|-------------|---------|
| `ReverbSoundEffect` | Simulates room reflections | Caves, large halls, bathrooms |
| `EqualizerSoundEffect` | Control volume of frequency bands | Muffled underwater, radio effect |
| `CompressorSoundEffect` | Reduces dynamic range | Consistent volume, ducking |
| `ChorusSoundEffect` | Thickens sound with copies | Ethereal voices, dream sequences |
| `DistortionSoundEffect` | Adds distortion/overdrive | Damaged radio, horror |
| `FlangeSoundEffect` | Sweeping comb filter | Sci-fi, psychedelic |
| `PitchShiftSoundEffect` | Changes pitch without speed | Chipmunk voice, deep voice |
| `TremoloSoundEffect` | Periodic volume modulation | Vibrato, pulsing |

```luau
-- Add reverb to all sounds in a cave zone
local caveGroup = Instance.new("SoundGroup")
caveGroup.Name = "Cave"
caveGroup.Parent = master

local reverb = Instance.new("ReverbSoundEffect")
reverb.DecayTime = 3.0
reverb.Density = 1.0
reverb.Diffusion = 1.0
reverb.WetLevel = -6  -- dB, how much reverb vs dry signal
reverb.Parent = caveGroup
```

### Ducking (Lower music when SFX plays)

Use CompressorSoundEffect with a SideChain:

```luau
-- Music ducks when SFX plays
local compressor = Instance.new("CompressorSoundEffect")
compressor.Threshold = -20
compressor.Ratio = 4
compressor.Attack = 0.01
compressor.Release = 0.2
compressor.SideChain = sfx  -- SFX group triggers the compression
compressor.Parent = music   -- Music group gets compressed
```

## New Modular System (Audio Objects)

The new system uses explicit wiring between audio components. Each object maps to a real-world audio device:

| Object | Real-world equivalent | Role |
|--------|----------------------|------|
| `AudioPlayer` | Media player / turntable | Produces audio from an asset |
| `AudioEmitter` | Speaker in 3D space | Emits audio positionally |
| `AudioListener` | Microphone | Picks up audio from 3D space |
| `AudioDeviceOutput` | Headphones/speakers | Plays to the real player |
| `AudioDeviceInput` | Physical microphone | Captures real player voice |
| `Wire` | Audio cable | Carries stream between objects |
| `AudioTextToSpeech` | TTS engine | Converts text to speech |
| `AudioEqualizer` | EQ pedal | Modifies frequency response |
| `AudioCompressor` | Compressor pedal | Controls dynamic range |
| `AudioReverb` | Reverb unit | Adds room reflections |
| `AudioFader` | Volume fader | Scales stream volume (0–3); a mix bus per category |
| `AudioAnalyzer` | Level meter / spectrum analyser | Measures `PeakLevel`, `RmsLevel`, `GetSpectrum()` (client only) |

### 2D Audio (non-positional)

```
AudioPlayer → Wire → AudioDeviceOutput
```

```luau
-- In SoundService:
local player = Instance.new("AudioPlayer")
player.Asset = "rbxassetid://MUSIC_ID" -- `AssetId` is deprecated (hidden)
player.Looping = true
player.Volume = 0.5
player.Parent = SoundService

local output = Instance.new("AudioDeviceOutput")
output.Parent = SoundService

local wire = Instance.new("Wire")
wire.SourceInstance = player
wire.TargetInstance = output
wire.Parent = SoundService

player:Play()
```

### 3D Audio (positional)

```
AudioPlayer → Wire → AudioEmitter (on Part)
AudioListener (on Camera/Character) → Wire → AudioDeviceOutput
```

```luau
-- On the part that emits sound:
local player = Instance.new("AudioPlayer")
player.Asset = "rbxassetid://SFX_ID"
player.Parent = workspace.CampfirePart

local emitter = Instance.new("AudioEmitter")
emitter.Parent = workspace.CampfirePart

local wire = Instance.new("Wire")
wire.SourceInstance = player
wire.TargetInstance = emitter
wire.Parent = workspace.CampfirePart

-- Studio/plugin-only SoundService.DefaultListenerLocation controls whether
-- Roblox creates and wires the default AudioListener and AudioDeviceOutput.
-- For runtime custom placement, create and wire an explicit AudioListener.

player:Play()
```

Volume over distance: pick a preset with `AudioEmitter.DistanceAttenuationMode` (`InverseTapered`, `Linear`, `LinearSquared`, `Inverse`) plus `DistanceAttenuationBounds` (`NumberRange`, default 4–10000 studs — set it, or the sound carries across the map), or keep `Custom` (the default mode) and supply a curve with `emitter:SetDistanceAttenuation({ [0] = 1, [20] = 0.5, [80] = 0 })` (distance → volume 0–1, up to 400 points, linearly interpolated). The `DistanceAttenuation` property itself is not scriptable; read the curve with `GetDistanceAttenuation()`. `SetAngleAttenuation` does the same for direction.

### Mixing with AudioFader

Route each category through its own `AudioFader` before the output so one setting scales a whole bus:

```
AudioPlayer (music) → Wire → AudioFader "MusicBus" → Wire → AudioDeviceOutput
AudioPlayer (sfx)   → Wire → AudioFader "SfxBus"   → Wire → AudioDeviceOutput
```

Set `MusicBus.Volume` from the player's settings (0–3, 1 = unchanged). Effects (`AudioEqualizer`, `AudioCompressor`, `AudioReverb`, ...) are wired into the chain the same way.

### Reacting to audio with AudioAnalyzer

Wire a stream into an `AudioAnalyzer` (it has an input pin but no output, so also wire the source to your output) and read `RmsLevel`/`PeakLevel` each frame, or `GetSpectrum()` with `SpectrumEnabled = true`, to drive visualizers, mouth flaps, or speaking indicators. Audio processing is disabled on the server: analyzers return zeros there, so run this on the client.

```luau
-- Client: pulse a part with the music level.
local RunService = game:GetService("RunService")
local analyzer = Instance.new("AudioAnalyzer")
analyzer.Parent = musicPlayer

local tap = Instance.new("Wire")
tap.SourceInstance = musicPlayer
tap.TargetInstance = analyzer
tap.Parent = analyzer

RunService.RenderStepped:Connect(function()
    speakerPart.Size = Vector3.one * (2 + analyzer.RmsLevel * 4)
end)
```

### Voice chat

With `VoiceChatService.UseAudioApi = Enabled`, voice runs on the audio API: Roblox creates an `AudioDeviceInput` under each voice-eligible `Player` (the microphone stream; `Player`, `Muted`, `Volume`, and `SetUserIdAccessList` with `AccessType` to control who hears whom), an `AudioEmitter` on each of their characters, and an `AudioListener` under `workspace.CurrentCamera`, all wired by default. Set `VoiceChatService.EnableDefaultVoice = false` to build your own graph — radios, walkie-talkies, megaphones (route a player's `AudioDeviceInput` through effects to an emitter elsewhere). Voice eligibility is per user (`VoiceChatService:IsVoiceEnabledForUserIdAsync`); always design a non-voice fallback.

### Audio assets and permissions

Uploaded audio is private to the uploader by default: an experience can only play it if the asset belongs to the same creator/group or has been granted to that experience in Creator Dashboard (Development Items › Audio › asset › Permissions). A sound that loads in Studio but is silent in another creator's game, or an Output permission error naming the asset, is a permissions problem, not a broken file. Creator Store audio marked free-to-use plays anywhere. Uploads are classified as sound effects or songs and go through moderation; only use audio you have rights to. The Images/Decals/Meshes "Asset Privacy" setting does not change audio defaults.

### Triggering Audio from Scripts

```luau
-- Basic trigger pattern
local audioPlayer = script.Parent -- AudioPlayer
local part = audioPlayer.Parent

part.Touched:Connect(function(hit)
    if hit.Parent:FindFirstChildOfClass("Humanoid") then
        audioPlayer:Play()
    end
end)
```

## Patterns

### Preloading Critical Audio

```luau
local ContentProvider = game:GetService("ContentProvider")

local criticalSounds = {
    Instance.new("Sound"), -- temp instances for preloading
    Instance.new("Sound"),
}
criticalSounds[1].SoundId = "rbxassetid://HIT_SOUND"
criticalSounds[2].SoundId = "rbxassetid://JUMP_SOUND"

ContentProvider:PreloadAsync(criticalSounds)
-- Now these assets are cached and play instantly
```

### One-Shot SFX (auto-cleanup)

```luau
local function playSFX(parent: BasePart, soundId: string)
    local sound = Instance.new("Sound")
    sound.SoundId = soundId
    sound.RollOffMode = Enum.RollOffMode.InverseTapered
    sound.RollOffMinDistance = 10
    sound.RollOffMaxDistance = 80
    sound.Parent = parent
    sound:Play()
    sound.Ended:Once(function()
        sound:Destroy()
    end)
end
```

### Client-Side Playback

Play sounds on the client for zero-latency feedback. Server tells client WHAT to play:

```luau
-- Server
SFXRemote:FireClient(player, "hit", workspace.Enemy.HumanoidRootPart.Position)

-- Client
SFXRemote.OnClientEvent:Connect(function(sfxName: string, position: Vector3)
    local part = Instance.new("Part")
    part.Position = position
    part.Anchored = true
    part.Transparency = 1
    part.CanCollide = false
    part.Parent = workspace
    playSFX(part, SFX_IDS[sfxName])
    task.delay(3, function() part:Destroy() end)
end)
```

## Common Mistakes

- **Playing sounds on the server for feedback**: Server sounds have network latency. Play on client for responsive SFX. Server only for sounds ALL players must hear identically.
- **No RollOff configuration**: Default RollOffMaxDistance is 10000 studs (basically infinite). Set it explicitly or sounds bleed across the entire map.
- **Stacking rapid sounds**: Playing the same sound 10x in 0.1s creates ear-splitting overlap. Check `sound.IsPlaying` or use a cooldown.
- **Forgetting Looped = false on one-shots**: Default is false, but if you clone from a template that has Looped = true, your SFX plays forever.
- **Not destroying one-shot sounds**: Sounds parented to destroyed parts get GC'd, but sounds in SoundService accumulate. Always Destroy() after Ended.
- **Using `AudioPlayer.AssetId` or writing `AudioEmitter.DistanceAttenuation`**: use `Asset`, and `SetDistanceAttenuation()` / `DistanceAttenuationMode` + `DistanceAttenuationBounds`.
- **Loudness by guesswork**: `Sound.Volume` ranges 0–10 (default 0.5). Balance levels by ear in context and with SoundGroups/faders rather than pushing individual volumes up.
- **Using legacy system for voice chat integration**: The new AudioPlayer/Wire system is required for voice chat features (AudioDeviceInput, AudioSpeechToText).
- **No SoundGroup hierarchy**: Without groups, players can't independently control music vs SFX volume in settings.

## Review and regression checks

- An agent cannot hear: a sound that loads, or a measured level, does not prove it is the right cue or feels right. Keep "sounds right" as an owner listening check, and say so when it is unverified.
- Check sliced cues (`PlaybackRegion`) for clicks at the start/end, and align the audible attack with the visual event.
- Reproduce loudness complaints from the listener's actual position and event path (launch, fly-by, impact, victim-local playback), and test every action slot that has its own cue.

## Sources (upstream SKILL.md)

Sources listed by the upstream skill (TabooHarmony/roblox-brain); later edits in this plugin were checked against the current Creator Hub API reference.

- https://create.roblox.com/docs/reference/engine/classes/SoundService
- https://create.roblox.com/docs/audio/objects
- https://create.roblox.com/docs/audio/effects
- https://create.roblox.com/docs/sound/groups
- https://create.roblox.com/docs/sound/dynamic-effects
- https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/reference/engine/classes/Sound.yaml
