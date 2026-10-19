# Attribution: roblox-localization

This skill is vendored into the roblox-agent-kit plugin from the following source(s) and modified.

## Primary source: TabooHarmony/roblox-brain

- Repository: https://github.com/TabooHarmony/roblox-brain
- Path: `skills/gameplay/roblox-localization/ (base), skills/core/roblox-networking/references/full.md section 10 (references/chat.md), skills/core/roblox-security/references/full.md "Text filtering as a workflow" (references/text-filtering.md), skills/gameplay/roblox-gui/references/full.md RichText section`
- Commit: `ceee4aaa5004502e2a51d78b3c33bba44d84742b`
- License: MIT (copy in `LICENSE`)

## Modifications (2026-10-18)

- Skill widened to localization + TextChatService chat + text filtering; SKILL.md rewritten with a single-line description and new sections.
- Frontmatter reduced to `name` and `description`; `last_reviewed`/`sources` removed (sources at the bottom of `references/full.md`).
- SKILL.md/full.md: corrected LocalizationTable entry fields (Key, Source, Context, Example, Values; `SourceLocaleId` is a table property).
- SKILL.md/full.md: separated Roblox-side automatic translation (Automatic Text Capture, cloud localization table, quotas, Use Translated Content) from engine lookup (LocalizationTable/AutoLocalize/Translator); added Studio Player Emulator testing and the early real-time translation API.
- SKILL.md/full.md: corrected the claim that chat is not auto-translated (TextChatService translates chat: `TextChatMessage.Translation`, `ChatTranslationEnabled`).
- full.md: compliance decisions pointed at `PolicyService:GetPolicyInfoForPlayerAsync` instead of country codes; removed country-based pricing examples.
- full.md: added the RichText safety rules from TabooHarmony roblox-gui.
- references/chat.md: copied from the networking reference's TextChatService section; heading levels adjusted; added a chat-translation section and references.
- references/text-filtering.md: copied from the security reference's text-filtering section; added related rules (server-side, TextFilterContext, RichText, AutoLocalize) and references.
