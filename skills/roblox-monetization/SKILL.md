---
name: roblox-monetization
description: "Roblox purchases: game passes, developer products, ProcessReceipt, subscriptions, rewarded ads, paid random item policy, pricing. Use when adding or debugging purchases, pricing items, or checking monetization rules."
---

# roblox monetization

## When to Load

Load when adding a Game Pass, Developer Product, subscription, rewarded video ad, private server, Robux transfer, Creator Rewards-related product decision, price change, or purchase eligibility check.

## Quick Reference

- Prompt purchases from the client, but grant value only from server-owned code.
- Passes: one server-owned ID→benefit registry; join and purchase refresh use the same idempotent benefit path. full.md §2a.
- Developer Products (1 to 1,000,000,000 Robux): repeatable consumables. Grant through one server-owned receipt path: `ProcessReceipt` (docs now call it legacy) or `BindReceiptHandler` with `Enum.ReceiptType.DeveloperProduct`. `PromptProductPurchaseFinished` is not purchase confirmation.
- `ProcessReceipt` has **no timer retry**: a `NotProcessedYet` receipt is delivered again only when the user starts another purchase or rejoins, and the callback can run on two servers at once. Use a **session-locked** profile and store the `PurchaseId` in the same save as the grant (full.md §3, worked example + 5-case test table).
- Rewarded video ads: availability check on the client, `CreateAdRewardFromDevProductId` + `ShowRewardedVideoAdAsync` on the server, grant **only** in the receipt handler (`ProductPurchaseChannel.AdReward`). Reward must be a dev product, not random, not a progress gate. full.md §4a.
- Subscriptions: Robux (≥49 R$, 70% every month) or local currency ($2.99/$4.99/$7.99/$9.99/$14.99, 70% month one then 100%); max 50 per game; Robux price changes once per 60 days. Reconcile with `GetUserSubscriptionStatusAsync` + `Players.UserSubscriptionStatusChanged`. full.md §4 (as of Oct 2026 — re-check).
- For eligibility-sensitive purchases, check `PolicyService` and current Roblox guidance. Paid random items need all outcomes + numerical odds before purchase; if `ArePaidRandomItemsRestricted` is true, offer the documented choices (earnable path, known non-random sequence, direct purchase, ...). Do not default to hiding or blocking the feature; handle the affected purchase path without stopping unrelated work.
- Pricing: creators generally earn 70% of Robux sales in their game; fetch prices at runtime (Managed Pricing); price optimization needs ~60,000 transactions in 30 days. full.md §6.
- Creator Rewards is a platform program, not a grant API: 5 R$ per qualifying Active Spender day, 35% of an attributed new/reactivated user's first $100, 60-day hold (as of Oct 2026 — re-check). Engagement-Based Payouts is historical.
- Test failed/duplicate grants, absent players, and interrupted saves. A receipt handler's presence is not proof of correctness; inspect its ownership, durable idempotent grant, and retry paths for unknown products or absent players.

**Need the details?** Load [references/full.md](references/full.md) for purchase flows and failure handling. Player data and session locking → `roblox-data`; pricing psychology → `roblox-player-psychology`.
