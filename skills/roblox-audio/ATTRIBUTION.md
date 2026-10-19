# Attribution: roblox-audio

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-audio/`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Modifications (2026-10-18)

- Frontmatter reduced to `name` and `description`; the upstream `when_to_use` text was folded into `description`; `last_reviewed` and `sources` removed (the sources list now sits at the bottom of `references/full.md`).
- Cross-references rewritten to this plugin's skill names; links between `SKILL.md` and `references/` made relative markdown links.
- full.md: `AudioPlayer.AssetId` replaced with `AudioPlayer.Asset` (AssetId is deprecated/hidden).
- full.md: `AudioEmitter.DistanceAttenuation` (not scriptable) replaced with `DistanceAttenuationMode`/`DistanceAttenuationBounds` and `SetDistanceAttenuation()`.
- SKILL.md/full.md: removed the unsupported "Volume > 1 clips" claims (`Sound.Volume` ranges 0-10).
- full.md: added AudioFader, AudioAnalyzer, voice chat via AudioDeviceInput/VoiceChatService.UseAudioApi, `Sound.PlaybackRegion`/`LoopRegion`, `SoundService:PlayLocalSound`, and audio asset permission notes; trimmed the review checklist.
