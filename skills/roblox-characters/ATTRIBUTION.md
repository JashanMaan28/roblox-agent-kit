# Attribution: roblox-characters

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: gamedev-skills/awesome-gamedev-agent-skills

- Repository: https://github.com/gamedev-skills/awesome-gamedev-agent-skills
- Path: `skills/other-engines/roblox-characters/`
- Commit: `0a70cfc64672d512c5b5b6006b5dcb5cf90dbdbd`
- License: Apache-2.0 (copy in `LICENSE`); NOTICE in `NOTICE`

## Additional source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-npc-ai/references/full.md (Avatar appearance section) for references/appearance.md`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE-TabooHarmony`)

## Modifications (2026-10-18)

- Dropped `agents/openai.yaml`.
- SKILL.md: description rewritten as a single line covering characters, avatars, humanoids, respawn, tools and appearance; cross-references rewritten (camera-systems -> roblox-camera, input-systems -> roblox-input, roblox-ui -> roblox-gui/roblox-input) and related skills added; code fences changed to `luau`.
- SKILL.md: added an "Appearance and rigs" section (HumanoidDescription with the current `ApplyDescriptionAsync`/`GetHumanoidDescriptionFromUserIdAsync`/`LoadCharacterWithHumanoidDescriptionAsync` names, `Player.CharacterAppearanceLoaded`, StarterCharacter/StarterHumanoid/StarterCharacterScripts), Animator-only loading (Humanoid:LoadAnimation is deprecated), and the HopperBin deprecation.
- references/appearance.md: new file built from the HumanoidDescription block moved out of TabooHarmony roblox-npc-ai (MIT), updated to the non-deprecated Async API names verified on the Humanoid/Players/Player/HumanoidDescription API pages, with spawning, appearance-loaded, custom-rig and legacy clothing notes.

Files derived from the Apache-2.0 source were modified as listed above; the Apache License, Version 2.0 and the upstream NOTICE apply to those portions.
