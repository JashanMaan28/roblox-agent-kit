# Roblox Localization: Full Reference

> **Code in this reference is illustrative. Adapt to your game and verify in Studio before production use.**

## LocalizationService

### Overview

LocalizationService handles engine-side translation lookups in Roblox. It stores LocalizationTable objects and provides methods for locale detection, translator creation, and country/region lookup. The experience's **cloud localization table** (managed in Creator Dashboard, filled by Automatic Text Capture, automatic translation and translators) is loaded alongside your own tables; `GetTranslatorForPlayerAsync` yields until it has loaded.

## Automatic translation (Roblox-side)

Roblox can localize an experience without any code:

1. **Set languages:** Creator Dashboard › your experience › Audience › Localization: choose the source language and supported languages.
2. **Capture strings:** turn on Automatic Text Capture (ATC) — "Capture text from experience UI while users play" — and/or, for immediate capture while you playtest, Studio's Window › Localization › Localization Tools › Automatic Text Capture (strings appear in the table within 1–2 minutes). ATC only captures text objects with `AutoLocalize` enabled; for `TextBox` it captures only `PlaceholderText`. It cannot capture default leaderboards and chat, items/tools owned by a player, text inside images, or badge/pass names and descriptions pulled from the platform — localize those with scripts.
3. **Translate:** enable automatic translation per language. It fills only blank entries, never overwrites manual translations, and is limited by per-character, per-language quotas (initial + monthly). Lock an entry to keep an approved translation from automatic updates.
4. **Show it:** enable **Use Translated Content**. Players' account-level Automatic Translations setting can also show translations for untranslated games.
5. ATC also cleans up stale auto-captured entries (usernames, retired events) unless you turn that off.

Engine lookup (below) is what actually swaps strings at runtime, using both the cloud table and any `LocalizationTable`s you ship.

For rare or generated strings that ATC will never capture, Roblox has an early-development **real-time translation Open Cloud API** ("Automatically translate dynamic content" guide): a server script calls it through the Open Cloud client package with the universe ID and the player's `LocaleId`. Treat it as subject to change, never send it unfiltered player text, and cache results.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `RobloxLocaleId` | string | Locale for core/internal features (e.g. `en-us`) |
| `SystemLocaleId` | string | Player's OS locale |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `GetTranslatorForPlayerAsync(player)` | `Translator` | Get translator for player's locale |
| `GetTranslatorForLocaleAsync(localeId)` | `Translator` | Get translator for a specific locale |
| `GetCountryRegionForPlayerAsync(player)` | `string` | Country/region code from IP geolocation |
| `GetCorescriptLocalizations()` | `Instances` | LocalizationTables for core scripts |
| `GetTableEntries(instance?)` | `Array` | Entries from the experience's localization tables |

`GetTranslatorForPlayer` (no `Async`) is deprecated; use `GetTranslatorForPlayerAsync`, which waits for the cloud table.

## LocalizationTable

### Overview

LocalizationTable stores translation entries. Each entry maps a source string to translations in multiple locales.

### Structure

Each entry (as returned by `GetEntries()` and accepted by `SetEntries()`) has:
- `Key`: unique identifier (optional; when empty, `Source` + `Context` identify the entry)
- `Source`: the original text string
- `Context`: optional `Instance:GetFullName()` path the automatic replacement uses to disambiguate identical source strings
- `Example`: optional example with argument placeholders filled in
- `Values`: dictionary of locale → translated text (`["pt-br"] = "..."`)

The table's own `SourceLocaleId` property records the language of `Source`; it is not an entry field.

### Setup

```luau
-- Create a LocalizationTable
local locTable = Instance.new("LocalizationTable")
locTable.Name = "GameTranslations"
locTable.Parent = game:GetService("LocalizationService")

-- Add entries programmatically (rare; usually done via CSV import in Studio)
locTable:SetEntries({
    {
        Key = "welcome",
        Source = "Welcome to the game!",
        Values = {
            ["en-us"] = "Welcome to the game!",
            ["pt-br"] = "Bem-vindo ao jogo!",
            ["ja-jp"] = "ゲームへようこそ！",
            ["es-es"] = "¡Bienvenido al juego!",
        },
    },
    {
        Key = "coins_count",
        Source = "You have {0} coins",
        Example = "You have 100 coins",
        Values = {
            ["en-us"] = "You have {0} coins",
            ["pt-br"] = "Você tem {0} moedas",
            ["ja-jp"] = "{0}コイン持っています",
        },
    },
})
```

## Auto-Translation (GUI)

### How It Works

1. Keep `AutoLocalize` true on the GUI object and every `GuiBase2d` ancestor
2. Set `RootLocalizationTable` on a GUI object (or an ancestor)
3. When `TextLabel.Text` is set, the engine looks up the source text in the table
4. If a translation exists for the player's locale, it replaces the displayed text
5. If no translation exists, the source text is shown

```luau
-- Set up auto-translation on a ScreenGui
local screenGui = player.PlayerGui:WaitForChild("MainMenu")
local locTable = game.LocalizationService:WaitForChild("GameTranslations")
screenGui.AutoLocalize = true
screenGui.RootLocalizationTable = locTable

-- Text auto-translates based on player's locale
local welcomeLabel = screenGui:WaitForChild("WelcomeLabel")
welcomeLabel.Text = "Welcome to the game!" -- engine replaces with translation
```

### Scope
- Automatic replacement works on `GuiBase2d` text (TextLabel, TextButton, TextBox placeholder, ...) and other objects with a `RootLocalizationTable`/`AutoLocalize` (for example `ProximityPrompt`).
- It does not touch strings your code builds and passes elsewhere (notifications, `DisplaySystemMessage`, attribute-driven labels): translate those with a `Translator`.
- **Player chat is different:** messages sent through TextChatService are translated by the chat system itself for recipients with chat translation on (`TextChatMessage.Translation`); see [chat.md](chat.md).

### RichText and localization

Enable `RichText` per object and write markup into `Text` (`<b>`, `<i>`, `<font color="#FF7800">`, `<br/>`, escapes `&lt;`/`&amp;` for literal angle brackets). Two trust rules:

- Never enable `RichText` for strings containing player input or other untrusted text. Markup tags in such strings render as styling, not characters — a player can inject `<font color="...">` to imitate system messages. Escape (`&lt;`) or strip before display; store plain text and apply tags only at render time from trusted code.
- Localization strips rich-text tags from translated strings: re-apply tags to localized variants manually, or the formatting silently disappears in non-English locales.

## Manual Translation

### Getting a Translator

```luau
local LocalizationService = game:GetService("LocalizationService")

-- For the local player (client-side)
local translator = LocalizationService:GetTranslatorForPlayerAsync(game.Players.LocalPlayer)

-- For a specific locale
local translator = LocalizationService:GetTranslatorForLocaleAsync("pt-br")
```

### Translating Strings

```luau
-- Simple translation
local welcome = translator:Translate(game, "Welcome to the game!")

-- With format arguments
local coinsMsg = translator:FormatByKey("coins_count", {coinCount})

-- Using a specific LocalizationTable (not the default hierarchy)
local customTable = game.LocalizationService:WaitForChild("QuestTranslations")
local questName = translator:Translate(customTable, "Dragon Slayer Quest")
```

## Country/Region Detection

### Use Cases
- Region-flavoured presentation (local events, default units)
- Region-locked events or features

Do **not** use country codes for compliance decisions. Use `PolicyService:GetPolicyInfoForPlayerAsync(player)` (server, `pcall`), which returns per-player policy flags such as `ArePaidRandomItemsRestricted`, `IsPaidItemTradingAllowed`, `AreAdsAllowed`, `IsEligibleToPurchaseSubscription`, and `IsSubjectToChinaPolicies`. Robux prices are set per product, not per country, in your code.

```luau
-- Server-side country detection
game.Players.PlayerAdded:Connect(function(player)
    local success, country = pcall(function()
        return game:GetService("LocalizationService"):GetCountryRegionForPlayerAsync(player)
    end)
    if success then
        print(player.Name .. " is from " .. country)
        if country == "US" then
            -- e.g. show a US-holiday event banner
        elseif country == "BR" then
            -- e.g. default to metric units / local event
        end
    end
end)
```

### Key Rules
- `GetCountryRegionForPlayerAsync` is async and can fail, so always pcall
- Uses IP geolocation, so VPNs/proxies give wrong results
- Returns ISO 3166-1 alpha-2 country codes (US, GB, JP, BR, etc.)

## Locale List

Common Roblox locales (automatic translation currently supports Arabic, Chinese Simplified/Traditional, English, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Polish, Portuguese, Russian, Spanish, Thai, Turkish, Vietnamese — see the language-codes page for the full list):

| Code | Language |
|------|----------|
| `en-us` | English (US) |
| `en-gb` | English (UK) |
| `pt-br` | Portuguese (Brazil) |
| `es-es` | Spanish (Spain) |
| `es-mx` | Spanish (Mexico) |
| `ja-jp` | Japanese |
| `ko-kr` | Korean |
| `zh-cn` | Chinese (Simplified) |
| `zh-tw` | Chinese (Traditional) |
| `fr-fr` | French |
| `de-de` | German |
| `it-it` | Italian |
| `ru-ru` | Russian |
| `tr-tr` | Turkish |
| `id-id` | Indonesian |
| `th-th` | Thai |
| `vi-vn` | Vietnamese |

Check `player.LocaleId` against this list to determine which translations to provide.

## Workflow

1. **Capture strings**: Automatic Text Capture (live or in Studio playtests) fills the cloud table; strings built in code need keys you add yourself
2. **Translate**: automatic translation for blank entries, then translators or CSV export/import for review and manual fixes
3. **Test**: Studio's **Player Emulator** (Test menu, enable Test Profile) has **Locale** (play in another language), **Pseudolocalize** (marks every string that goes through translation, exposing unlocalized text) and **Elongate** (stretches strings to find overflow); it also emulates content policies for `PolicyService` checks
4. **Ship**: enable Use Translated Content; for any `LocalizationTable` you ship in the place, parent it under `LocalizationService` (or point `RootLocalizationTable` at it)

## Pitfalls

- **Missing translations**: fall back to source text silently. Log missing keys during development.
- **Code-built text**: automatic replacement doesn't cover notifications, `DisplaySystemMessage`, or other strings your code assembles. Use a `Translator`. (Player chat via TextChatService is translated by the chat system.)
- **Translating player text**: don't put player-typed text through your localization tables; filter it (`text-filtering.md`) and leave chat translation to TextChatService. `TextService:FilterAndTranslateStringAsync` is no longer supported.
- **Async calls**: `GetTranslatorForPlayerAsync` and `GetCountryRegionForPlayerAsync` are async; cache results, don't call per-frame.
- **VPN/proxy**: country detection via IP is unreliable behind VPNs. Don't use for security-critical decisions.
- **Argument formatting**: use `{0}`, `{1}` placeholders in source text. `FormatByKey` replaces them in order.
- **Locale coverage**: not all locales are supported. Check `player.LocaleId` and handle unsupported locales gracefully.

## Sources (upstream SKILL.md)

Sources listed by the upstream skill (TabooHarmony/roblox-brain); later edits in this plugin were checked against the current Creator Hub API reference.

- https://create.roblox.com/docs/reference/engine/classes/LocalizationService
- https://create.roblox.com/docs/reference/engine/classes/LocalizationTable
- https://create.roblox.com/docs/reference/engine/classes/Player
