---
name: roblox-audio
description: "Roblox audio: Sound/SoundGroup and the modular audio API (AudioPlayer, emitters, listeners, wires, voice), spatial sound, music and SFX mixing. Use when adding or fixing audio, or a sound won't play, is too loud or loops wrongly."
---

# Roblox Audio

## When to Load

Load when implementing audio playback, spatial/3D sound, background music, sound effects, audio mixing (SoundGroups), or dynamic effects. Covers both legacy Sound objects and the newer modular AudioPlayer/Wire system.

## Quick Reference

**Two Systems**: Legacy (`Sound`/`SoundGroup`/`SoundEffect`): simpler. New modular (`AudioPlayer`/`AudioEmitter`/`Wire`/`AudioDeviceOutput`): preferred for new projects, required for voice chat.

**Sound Placement**: BasePart child → volumetric. Attachment/MeshPart → point source. SoundService/Workspace → global (BGM/UI).

**Legacy Setup**:
```luau
local s = Instance.new("Sound")
s.SoundId = "rbxassetid://ID"; s.Looped = true; s.Volume = 0.25
s.RollOffMode = Enum.RollOffMode.InverseTapered
s.RollOffMinDistance = 10; s.RollOffMaxDistance = 100
s.Parent = SoundService; s:Play()
```

**SoundGroups** (mixer): Nest `SoundGroup` under Master for player-adjustable Music vs SFX volume. `bgMusic.SoundGroup = musicGroup`. Effects (`ReverbSoundEffect`, `EqualizerSoundEffect`, `CompressorSoundEffect`, etc.) parent to Sound/SoundGroup. Ducking: `CompressorSoundEffect` with `SideChain = sfxGroup` on music.

**New Modular**: 2D: `AudioPlayer → Wire → AudioDeviceOutput`. 3D: `AudioPlayer → Wire → AudioEmitter` (on Part). Set `AudioPlayer.Asset` (`AssetId` is deprecated). Roll-off: `AudioEmitter.DistanceAttenuationMode` + `DistanceAttenuationBounds`, or a custom curve via `SetDistanceAttenuation()` (the property isn't scriptable). Buses: `AudioFader`; metering/visualizers: `AudioAnalyzer` (client only). Voice: `VoiceChatService.UseAudioApi` gives each player an `AudioDeviceInput`. Studio/plugin-only `SoundService.DefaultListenerLocation` controls the default listener; wire an explicit `AudioListener` for runtime control.

**Handy**: `Sound.PlaybackRegion`/`LoopRegion` play or loop a slice; `SoundService:PlayLocalSound(sound)` plays a local-only copy (UI clicks).

**One-Shot SFX**:
```luau
local function playSFX(parent, id)
    local s = Instance.new("Sound"); s.SoundId = id
    s.RollOffMode = Enum.RollOffMode.InverseTapered
    s.RollOffMinDistance = 10; s.RollOffMaxDistance = 80
    s.Parent = parent; s:Play()
    s.Ended:Once(function() s:Destroy() end)
end
```

**Preload**: `ContentProvider:PreloadAsync({sound1, sound2})`. **Client SFX**: `FireClient` → `OnClientEvent` creates invisible Part + `playSFX`.

**Pitfalls**: Server sounds have latency → play feedback on client. Default `RollOffMaxDistance`=10000 studs → set explicitly. Rapid-fire → check `IsPlaying`. Always `Destroy()` one-shots after `Ended`. Silent in one game but fine in another → audio asset permissions (private by default; grant the experience in Creator Dashboard). An agent can't hear: leave "sounds right" to the owner.

See [references/full.md](references/full.md) for detailed examples, effect table, faders/analyzers, voice, permissions, and client-side patterns. Hit timing with animation/VFX: `roblox-animation-vfx`.
