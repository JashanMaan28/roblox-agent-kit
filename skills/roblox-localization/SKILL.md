---
name: roblox-localization
description: "Roblox localization and player text: translation, LocalizationTables, TextChatService chat and commands, text filtering of player-typed text, RichText safety. Use for translations, chat features, or showing player text to others."
---

# Roblox Localization, Chat & Player Text

## When to Load

Multi-language support, translation, locale-specific content, region detection, TextChatService chat features, and anything that shows player-typed text to other players.

## Quick Reference

### Locale Detection
- `player.LocaleId`: the player's Roblox locale (`en-us`, `pt-br`, `ja-jp`); `Translator.LocaleId` is what lookups use.
- `LocalizationService.RobloxLocaleId` (core UI) and `SystemLocaleId` (OS locale).
- `LocalizationService:GetCountryRegionForPlayerAsync(player)`: country code (`US`, `BR`) — async, `pcall`; not proof of location (VPNs).
- Compliance (paid random items, ads, trading, subscriptions): use `PolicyService:GetPolicyInfoForPlayerAsync(player)`, not country codes.

### Two separate layers: automatic translation vs engine lookup
1. **Automatic translation (Roblox-side, no code):** Automatic Text Capture (ATC) collects strings from UI with `AutoLocalize` on — from live players (enable "Capture text from experience UI" in Creator Dashboard › Localization › Settings) or immediately during Studio playtests (Localization Tools › Automatic Text Capture). Captured strings land in the experience's **cloud localization table**, are machine-translated for enabled languages (quota-limited), and display once **Use Translated Content** is on. Manual translations always win; lock entries you approved. Players with the account-level Automatic Translations setting may already see translated text.
2. **Engine lookup (your data/code):** `LocalizationTable` instances under `LocalizationService` (plus the cloud table) feed the automatic replacement on `GuiBase2d` text with `AutoLocalize = true`, and `Translator` lookups (`GetTranslatorForPlayerAsync` → `Translate(context, text)` / `FormatByKey(key, args)`) for strings built in code. Set `AutoLocalize = false` on names, user text and anything that must not be translated.

### Table entries
- Entry fields: `Key`, `Source`, `Context` (an `Instance:GetFullName()` path for disambiguation), `Example`, `Values` (`{ ["pt-br"] = "...", ... }`). `SourceLocaleId` is a property of the **table**, not an entry field.
- Edit in the Creator Dashboard translator portal or export/import CSV; `SetEntries`/`GetEntries` for code.

### Manual Translation
```luau
local ok, translator = pcall(LocalizationService.GetTranslatorForPlayerAsync, LocalizationService, player)
if ok then
    label.Text = translator:FormatByKey("coins_count", { count })
end
```

### Chat (TextChatService)
- Channels (`TextChannel`), commands (`TextChatCommand`, parented under `TextChatService`), bubble chat, and per-message decoration via `OnIncomingMessage`. Legacy `Chat` is retired.
- Player messages sent through `TextChannel:SendAsync` are filtered by the engine and **auto-translated** for recipients who have chat translation on (`TextChatMessage.Translation`, `TextChatService.ChatTranslationEnabled`). `DisplaySystemMessage` text is neither filtered nor localized — localize it yourself.
- Details: [references/chat.md](references/chat.md).

### Text filtering (non-chat player text)
- Signs, pet names, custom inputs shown to others: server-side `TextService:FilterStringAsync(text, fromUserId, context)`, then `GetNonChatStringForBroadcastAsync()` (everyone) or `GetNonChatStringForUserAsync(userId)` (one viewer). Fail closed; refilter stored text on display.
- Never enable `RichText` on player-supplied text.
- Details: [references/text-filtering.md](references/text-filtering.md).

### Pitfalls
- Missing entries fall back to source text silently; log missing keys in development.
- Code-built strings and `DisplaySystemMessage` don't pass through automatic replacement: use a `Translator`.
- ATC can't capture default leaderboards/chat, player-owned item names, text baked into images, or badge/pass names from the platform.
- Translated strings run longer; test overflow (`roblox-gui`) with Studio's Player Emulator (Locale, Pseudolocalize, Elongate).

**Need more detail?** [references/full.md](references/full.md) (localization), [references/chat.md](references/chat.md), [references/text-filtering.md](references/text-filtering.md).
