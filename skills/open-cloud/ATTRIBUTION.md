# Attribution

`SKILL.md` is kit-authored with a few facts adapted from community skills; `references/oauth-webhooks-secrets.md` is adapted from a community skill. All facts were re-checked against create.roblox.com docs on 2026-10-18.

| Source | Paths used | License | Copy |
|---|---|---|---|
| https://github.com/m4bwav/roblox-agent (commit 581a33a) | `skills/roblox-agent-cloud/SKILL.md`: Luau Execution limits (4 MB script/result, 450 KB logs, 24 h retention), "zero tests found is a setup failure", observed HTTP 409 while the place is open in Studio, shared DataStore budget | MIT | `LICENSE-m4bwav` |
| https://github.com/TabooHarmony/roblox-brain (commit ceee4aa) | `skills/tools/roblox-cloud/references/full.md` §1-8 (integration classification, API keys, OAuth PKCE, REST mechanics, HttpService + Secrets store, webhooks, security review, diagnosis order) → `references/oauth-webhooks-secrets.md` | MIT | `LICENSE-TabooHarmony` |

## Modifications

- Condensed and rewritten; cross-references renamed to this kit's skills (`roblox-data`, `roblox-networking`, `studio-mcp`); the source's TeleportService, BadgeService and Ads Manager sections were left out.
- Added the webhook signature recipe (HMAC-SHA256 over `timestamp.body`, `NotificationId` dedupe, 5 retries) from the official webhook docs.
- Corrected the kit's earlier claim that Luau Execution changes are never saved: they persist only through `AssetService:SavePlaceAsync`, which publishes by default unless `SaveWithoutPublish = true`.
- The 409 "Server is busy" upload error is an observation from the source (live run 2026-10-11), not documented; the documented 409 meaning is "place not part of the universe".
