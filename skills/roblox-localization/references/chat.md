# TextChatService: chat channels, commands, and chat translation

Read this when building chat features: custom channels, `/commands`, system messages, bubble chat, custom chat UI, or migrating legacy chat. Moved from the TabooHarmony `roblox-networking` skill (MIT); see `../ATTRIBUTION.md`. Remote/networking design in general: `roblox-networking`.

[TextChatService](https://create.roblox.com/docs/reference/engine/classes/TextChatService) is the current chat system. The legacy chat system was retired April 30, 2025: Roblox auto-migrates experiences still on `ChatVersion.LegacyChatService`, and custom integrations that bypass TextChatService break or get moderated ([migration announcement](https://devforum.roblox.com/t/migrate-to-textchatservice-removing-support-for-legacy-chat-and-custom-chat-systems/3237100), [status update](https://devforum.roblox.com/t/update-on-legacy-chat-deprecation-and-textchatservice-migration/3376880)). <!-- temporal: 2025-05 --> `TextChatService.ChatVersion` is not scriptable; set it in Studio. Never build new chat features on the legacy `Chat` service.

## Instance tree

Default runtime tree when `TextChatService.CreateDefaultTextChannels` and `CreateDefaultCommands` are true (both are Studio properties, not scriptable):

- `TextChatService.TextChannels` (Folder): `RBXGeneral` (player messages), `RBXSystem` (system messages; red when `TextChatMessage.Metadata` contains "Error"), `RBXTeam[BrickColor]` per team, `RBXWhisper:[UserId1]_[UserId2]` per whisper pair.
- `TextChatService.TextChatCommands` (Folder): `RBXClearCommand`, `RBXEmoteCommand`, `RBXHelpCommand`, `RBXMuteCommand`, `RBXTeamCommand`, `RBXWhisperCommand`, and others (`/e`, `/t`, `/w`, `/mute`, ...).
- Configuration singletons directly under `TextChatService`: `ChatWindowConfiguration`, `ChatInputBarConfiguration`, `BubbleChatConfiguration`, `ChannelTabsConfiguration`.

You can add your own `TextChannel` and `TextChatCommand` instances even with defaults on. A `TextChatCommand` must be parented to `TextChatService` to function.

## Client/server split ([TextChannel](https://create.roblox.com/docs/reference/engine/classes/TextChannel))

- `TextChannel:SendAsync(message, metadata)` (client only). Sends a player message to the server; the engine filters it server-side, and clients receive "the result of the filtered message from the server". Metadata over 200 characters means the message is not delivered.
- `TextChannel:DisplaySystemMessage(message, metadata)` (client only). Visible only to that local user and **not** automatically filtered or localized.
- `TextChannel.MessageReceived` / `TextChatService.MessageReceived` (client only).
- `TextChannel:AddUserAsync(userId)` (server only). Adds a `TextSource`; returns `nil, false` when the user has chat off or is not in the server.
- Server-side delivery control: `TextChannel.ShouldDeliverCallback(message, textSource)` (return `false` to withhold from a recipient) plus `TextChatService:CanUserChatAsync` / `CanUsersChatAsync` / `CanUsersDirectChatAsync` for platform permission gates.

`OnIncomingMessage` (on both `TextChatService` and `TextChannel`) is documented client-only: it decorates or replaces messages for display by returning `TextChatMessageProperties`; returning `nil` leaves the message unchanged. `TextChatService.OnIncomingMessage` runs before any `TextChannel.OnIncomingMessage`. Define each callback exactly once: multiple bindings override one another nondeterministically. Messages are not replicated to a custom UI by themselves; the default chat UI consumes `MessageReceived` for you, and a custom UI must render those payloads itself.

## Filtering rules

- Player messages sent via `TextChannel:SendAsync` are filtered by the engine server-side; do not double-filter before `SendAsync`.
- `DisplaySystemMessage` strings are not filtered. Static developer-authored text is fine. If a system message embeds player input (names, item names), filter that input server-side with `TextService:FilterStringAsync` first; the same rule applies as for any other user-generated text.

## Example: custom channel plus `/heal` command

```luau
-- ServerScriptService (server)
local TextChatService = game:GetService("TextChatService")
local Players = game:GetService("Players")

local battleChannel = Instance.new("TextChannel")
battleChannel.Name = "Battle"
battleChannel.Parent = TextChatService.TextChannels

local healCommand = Instance.new("TextChatCommand")
healCommand.Name = "HealCommand"
healCommand.PrimaryAlias = "/heal"
healCommand.Parent = TextChatService.TextChatCommands

healCommand.Triggered:Connect(function(textSource: TextSource, unfilteredText: string)
	local player = Players:GetPlayerByUserId(textSource.UserId)
	if not player then return end
	-- unfilteredText is attacker-controlled: parse/validate before use.
	-- Apply the heal server-side; check cooldown and permission here.
end)

Players.PlayerAdded:Connect(function(player)
	battleChannel:AddUserAsync(player.UserId)
end)
```

```luau
-- StarterPlayerScripts (client)
local TextChatService = game:GetService("TextChatService")

local channels = TextChatService:WaitForChild("TextChannels")
local battleChannel = channels:WaitForChild("Battle")

battleChannel.MessageReceived:Connect(function(message: TextChatMessage)
	print(message.Text) -- default UI renders messages; a custom UI mirrors this
end)

-- Local confirmation that only this user sees:
battleChannel:DisplaySystemMessage("You are healed", "Heal")

TextChatService.OnIncomingMessage = function(message: TextChatMessage)
	if string.find(message.Metadata, "Error") then
		local props = Instance.new("TextChatMessageProperties")
		return props -- decorate error messages here
	end
	return nil
end
```

When a sent message matches a `TextChatCommand` alias, the command sinks it server-side: `Triggered` fires and the message is not replicated to other users.

## Chat translation

TextChatService translates player chat automatically: recipients whose chat translation is on see messages in their preferred language. You don't need localization tables or a translator for chat.

- `TextChatMessage.Translation` holds the translated (and filtered) text for the receiving user; it is an empty string when no translation happened (same language, or a language without filter support).
- `TextChatService.ChatTranslationEnabled` (client-only, read it from a LocalScript) reflects the user's own preference; use it to adapt a custom chat UI.
- A custom UI or `OnIncomingMessage` that rewrites `Text` should also set `TextChatMessageProperties.Translation`, or translated users see the untranslated version.
- `DisplaySystemMessage` strings and command feedback you generate are **not** translated: run them through a `Translator` (see `full.md`) before displaying.
- `TextService:FilterAndTranslateStringAsync` is no longer supported; chat translation exists only through TextChatService.

## Legacy Chat (deprecated; migration reference only)

- `Chat:Chat(partOrCharacter, message, color?)` fires `Chat.Chatted` and drives the legacy bubble-chat LocalScript. Replace with `TextChatService:DisplayBubble()` and `BubbleChatConfiguration`.
- `Chat:FilterStringAsync` / `Chat:FilterStringForBroadcast` filter legacy chat text; the client-side call form is deprecated. Replace with server-side `TextService:FilterStringAsync` ([Chat](https://create.roblox.com/docs/reference/engine/classes/Chat)).
- `Chat:RegisterChatCallback` (`OnServerReceivingMessage`, `OnClientFormattingMessage`) customizes the legacy Luau chat pipeline. There is no 1:1 port; re-model the logic on `TextChannel.ShouldDeliverCallback` and the `OnIncomingMessage` callbacks.

## Primary references

- https://create.roblox.com/docs/chat/in-experience-text-chat
- https://create.roblox.com/docs/reference/engine/classes/TextChatService
- https://create.roblox.com/docs/reference/engine/classes/TextChannel
- https://create.roblox.com/docs/reference/engine/classes/TextChatMessage
