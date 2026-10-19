# Attribution

## Primary source

- **Source repository:** https://github.com/TabooHarmony/roblox-brain
- **Source path:** `skills/design/roblox-monetization/` (`SKILL.md`, `references/full.md`)
- **License:** MIT (see `LICENSE` in this folder, copied from the source repository)

## Merged content

- **Source repository:** https://github.com/MSayib/roblox-dev-skill
- **Source path:** `references/worked-examples.md`, section 6 "Grant a developer product purchase" (the 5-case receipt verification table and its test procedure)
- **License:** MIT (see `LICENSE-MSayib` in this folder, copied from that repository)

## Modifications

- Frontmatter reduced to `name` and a single-line `description` (folded `when_to_use`; dropped `last_reviewed` and `sources`; sources moved to the bottom of `references/full.md`).
- Receipts: added the developer product price range, the documented `ProcessReceipt` delivery/retry rules (no timer retry; redelivery on the next purchase or rejoin; possible concurrent runs on two servers), the "legacy" wording from the `BindReceiptHandler` reference, the May 30, 2026 cross-game product sales change, and a worked `ApplyGrantOnce` example that stores the `PurchaseId` in the same session-locked profile save as the grant.
- Ported and adapted the MSayib 5-case receipt test table to that example.
- Subscriptions: added verified pricing tiers, Robux minimum, payout split (70% every month for Robux; 70% then 100% for local currency), hold periods, max 50 per game, price-change limits, refunds, and `PromptSubscriptionPurchaseFinished` semantics.
- Added a Rewarded Video Ads section verified against the docs (client-only availability check, server `CreateAdRewardFromDevProductId` + `ShowRewardedVideoAdAsync`, grant only in the receipt path with `ProductPurchaseChannel.AdReward`, eligibility and reward rules).
- Added a pricing reference (70% creator share; dated, unverified Robux bundle table moved here from `roblox-player-psychology`) and a price-optimization section (60,000 transactions / 30 days; re-test at least every 90 days).
- Added date stamps to Creator Rewards, Robux transfer, and other policy numbers; added the Active Spender definition and `IsPaidItemTradingAllowed`.
