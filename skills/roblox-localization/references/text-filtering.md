# Filtering player-entered text

Read this whenever text typed by one player is shown to anyone else (signs, pet or team names, trade notes, custom inputs, chat-adjacent UI). Moved from the TabooHarmony `roblox-security` skill (MIT); see `../ATTRIBUTION.md`. Remote validation and rate limits: `roblox-security`.

## Text filtering as a workflow (audience-selected result methods)

Player-typed text displayed to other players — signs, pet names, trading chat,
name inputs, chat-adjacent UI — is the developer's filtering responsibility.
TextChatService filters messages sent through `TextChannel:SendAsync` (see `chat.md`); custom surfaces do not.

The contract is two steps, and the second is where compliance bugs live:

1. `TextService:FilterStringAsync(text, fromUserId, context)` yields and
   returns a `TextFilterResult`.
2. Choose the result method by **audience**, not convenience:
   - `result:GetNonChatStringForBroadcastAsync()` — the text will be shown to
     everyone on the server/world (signs, leaderboards, global feeds).
   - `result:GetNonChatStringForUserAsync(userId)` — non-chat text shown to one specific recipient, such as a pet name.
   A per-user result must not be shown to everyone. A broadcast result is the conservative choice for globally visible non-chat text. `GetChatForUserAsync` is deprecated and returns an empty string; player chat belongs in TextChatService, not a custom non-chat filtering pipeline.

Workflow rules:

- **Stored text needs a retrieval policy.** The text-filtering guide says stored text must be filtered when retrieved, while `FilterStringAsync` currently requires the author to be online on this server. Do not turn a previously filtered string into permanent clearance. Preserve provenance; when current filtering cannot be completed, show a safe predefined placeholder or withhold the text instead of substituting another author's UserId. Resolve the offline-author case against current Roblox guidance before shipping persistent public text.
- **Filter once per submission**, not per keystroke. From that result, obtain the appropriate audience-specific output; a per-user string is not a broadcast string. Do not blindly retry service failures: the method already implements internal retries.
- **Fail closed**: if `FilterStringAsync` throws or the pcall fails, display
  nothing. Never fall back to the raw unfiltered string; store nothing and
  prompt the author to retry.

```luau
local TextService = game:GetService("TextService")

-- Illustrative server-side sign editor; validate type, length, authorization,
-- and rate limits at the remote boundary before calling this function.
local function setSignText(player: Player, proposedText: string): boolean
	local ok, filtered = pcall(function()
		local result = TextService:FilterStringAsync(proposedText, player.UserId)
		return result:GetNonChatStringForBroadcastAsync()
	end)
	if not ok or type(filtered) ~= "string" then
		return false -- fail closed: sign keeps its previous (filtered) text
	end
	signs[player.UserId] = filtered -- filtered display state for this session
	return true
end
```

## Related rules

- Filter on the **server**. A `TextBox`'s `Text` is raw player input; never trust a client that says it already filtered.
- The optional third argument is a `TextFilterContext` (`PublicChat` or `PrivateChat`); pass the one that matches the audience.
- Never set `RichText = true` on a label that renders player-entered text: markup in the input would render as styling (`<font color=...>` spoofing system messages). Escape `<`/`&` or strip tags; apply formatting only from trusted code.
- Player-entered text should have `AutoLocalize = false` so it isn't captured into localization tables or "translated" by the UI localizer.
- Usernames and display names come from Roblox and are already moderated; text a player types about another player is not.

## Primary references

- https://create.roblox.com/docs/ui/text-filtering
- https://create.roblox.com/docs/reference/engine/classes/TextService
- https://create.roblox.com/docs/reference/engine/classes/TextFilterResult
