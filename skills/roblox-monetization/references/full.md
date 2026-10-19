# roblox monetization: full reference

> Code examples are illustrative. Adapt them to your project and verify in Studio before production use.

This guide focuses on the server-side correctness of Roblox's purchase APIs. Product catalog setup and current policy requirements change over time; use the linked Creator Hub pages as the authority for eligibility and configuration details. Numbers in this file were checked against the docs on 2026-10-18 (as of Oct 2026 — re-check the linked doc before relying on them).

## 1. Pick the product type

- **Pass:** durable ownership for an experience.
- **Developer Product:** repeatable consumable purchase.
- **Subscription:** recurring benefit with a subscription-specific lifecycle.
- **Private server or paid access:** access configuration rather than an item grant.
- **Rewarded video ad reward:** a Developer Product granted through the receipt path when a player finishes an opt-in ad (§4a).
- **Robux transfer:** a Roblox Plus feature with its own receipt types (§6).
- **Creator Rewards:** a platform program with its own eligibility and reporting rules (§7).

Do not model all of these as one "purchase" table. Their ownership, renewal, refund, and retry behavior differ.

## 2. Keep prompting separate from granting

The client owns the presentation and can request a prompt. The server owns the entitlement. A button click or `PromptProductPurchaseFinished` event is never proof of a Developer Product grant.

```luau
-- LocalScript: presentation only
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

buyButton.Activated:Connect(function()
    MarketplaceService:PromptProductPurchase(Players.LocalPlayer, PRODUCT_ID)
end)
```

For a Game Pass, the server can check ownership before enabling a durable feature.

```luau
local MarketplaceService = game:GetService("MarketplaceService")

local function ownsPass(player: Player, passId: number): (boolean?, string?)
    local ok, owns = pcall(function()
        return MarketplaceService:UserOwnsGamePassAsync(player.UserId, passId)
    end)
    if not ok then
        return nil, tostring(owns) -- unknown; do not cache as non-ownership
    end
    return owns == true, nil
end
```

Cache a successful result when appropriate, but provide an invalidation or refresh path for purchases made during the session. Handle API failure as "not confirmed yet," not as a permanent denial or grant.

## 2a. Centralized Game Pass benefits

Operator/design pattern, grounded in the official [passes flow](https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/production/monetization/passes.md): one server owner maintains a pass-ID→benefit registry and the corresponding confirmed entitlement state. Features ask this owner for access rather than each implementing a purchase listener. Keep this registry distinct from repeatable Developer Product grants.

- On `Players.PlayerAdded`, check configured pass ownership with `UserOwnsGamePassAsync` and reconcile benefits. Also cover players already present when the owner starts; prevent duplicate initialization. A failed request means unknown, not “does not own.” Never persist that failure as a negative entitlement.
- Connect `MarketplaceService.PromptGamePassPurchaseFinished` once on the server. For a registered pass and successful purchase, invalidate your application’s stale negative cache and run the same benefit reconciliation used on join. The engine updates its ownership-query cache when this event fires. Server event results reflect the final purchase outcome; LocalScript results must not authorize benefits.
- A benefit setter should be idempotent: “VIP access enabled” or “this pass contributes multiplier X,” not “add X again whenever a callback runs.” Compose multiple benefits from their sources instead of stacking them every respawn or refresh. Reapply character-specific presentation through the existing character lifecycle without duplicating the entitlement grant.
- An external purchase during an existing session can take several minutes to propagate through the engine ownership cache. Define a bounded refresh path; reconnecting starts a new ownership check. Do not promise that an application cache invalidation bypasses Roblox’s cache.
- Validate configured IDs and keep unknown passes from authorizing arbitrary benefits. Remove per-player caches at departure and ignore stale asynchronous results for a player/session that has ended. Keep subscriptions and paid consumables on their own lifecycle paths.

Test existing ownership on join, purchase/cancel in-session, a query failure, repeated refresh, character respawn, player leave during the query, and two passes contributing to one benefit. Centralization removes duplicate plumbing, not product-specific rules or server validation.

## 3. Centralize Developer Product receipts

Developer Products are priced from 1 to 1,000,000,000 Robux ([Developer Products](https://create.roblox.com/docs/production/monetization/developer-products)). Since May 30, 2026, cross-game developer product sales are disabled; use [Robux transfers](https://create.roblox.com/docs/production/monetization/robux-transfers) for cross-game mechanics.

Use one server-owned Developer Product receipt path. The example below uses `ProcessReceipt`; alternatively, [`BindReceiptHandler`](https://create.roblox.com/docs/reference/engine/classes/MarketplaceService#BindReceiptHandler) accepts `Enum.ReceiptType.DeveloperProduct` with an optional product-ID filter. The `BindReceiptHandler` reference describes it as "an alternative to the legacy `ProcessReceipt` callback": a matching bound handler takes precedence, and unmatched receipts fall through to `ProcessReceipt`, so you can migrate incrementally. Whichever path owns the receipt must:

1. identify the product and player;
2. determine whether this receipt was already granted;
3. grant through the authoritative data service;
4. record the receipt or transaction id with the grant;
5. acknowledge the receipt only after durable success.

For `ProcessReceipt`, return `Enum.ProductPurchaseDecision` values as below. For `BindReceiptHandler`, return `Enum.ReceiptDecision` values.

```luau
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local productGrants = {
    [COIN_PRODUCT_ID] = { coins = 500 },
}

MarketplaceService.ProcessReceipt = function(receiptInfo)
    local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
    if not player then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    local productGrant = productGrants[receiptInfo.ProductId]
    if not productGrant then
        warn("Unhandled product", receiptInfo.ProductId)
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    local transactionId = tostring(receiptInfo.PurchaseId)
    local granted = ReceiptStore:ApplyGrantOnce(
        transactionId,
        player.UserId,
        productGrant
    )
    if not granted then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end
    return Enum.ProductPurchaseDecision.PurchaseGranted
end
```

`ApplyGrantOnce` is a project-specific persistence boundary. It must make the
transaction ID and entitlement mutation one durable, idempotent operation, and
must treat an already-granted ID as success. Do not implement it as "grant,
then separately record": a crash or failed record between those operations can
duplicate value on retry.

Cross-owner atomicity: atomic receipt recording for one profile is not an atomic exchange between two profiles; for trading or gifting across profiles, see `roblox-data` full reference, section Cross-owner atomicity limits.

With `BindReceiptHandler`, filtered handlers claim their configured product IDs; a catch-all handles remaining products. A matching bound handler takes precedence over `ProcessReceipt`; unmatched receipts can fall through to it. Duplicate registrations for the same receipt type/product combination or catch-all fail. Keep routing ownership explicit during migration instead of registering competing callbacks. Retain the returned `RBXScriptConnection` for intentional teardown, not routine disconnection while receipts remain outstanding.

When wrapping a grant/save operation inside your receipt handler, `pcall` success means that operation did not throw, not that its domain result confirms a successful grant. Inspect both the protected-call flag and the returned domain result before acknowledging.

**Delivery and retry (documented on the `ProcessReceipt` reference):**
- `ProcessReceipt` is called for unresolved purchases when a purchase completes, when a successful purchase prompt appears, and when the user joins a server. It has **no time-based retry**: after `NotProcessedYet`, it runs again on the same server only if the user starts another developer product purchase, or when they rejoin any server of the game.
- The user must be on the server for the callback to run. Unresolved purchases are not removed or refunded when escrow expires.
- The callback for one purchase **can run on two servers at the same time** if the user joins a second server before the first returns, and a `PurchaseGranted` result can still fail to record on the backend (the purchase then stays unresolved). This is why grants must be idempotent per `PurchaseId` and written under a **session lock** (only the server holding the player's profile may grant).
- If no `ProcessReceipt` callback exists, receipts are auto-acknowledged and cannot be recovered.
- Bound handlers (`BindReceiptHandler`) that return `Enum.ReceiptDecision.NotProcessedYet` are redelivered "on a later opportunity or the next time the buyer joins a server". Do not promise the two APIs have identical delivery timing.

### 3b. Worked example: the PurchaseId lives in the same save as the grant

One concrete way to implement `ApplyGrantOnce` with a session-locked player profile (ProfileStore, ProfileService, or your own lock; see `roblox-data`). The grant and the `PurchaseId` are written into the same profile document, so they persist together or not at all, and only the server holding the session lock can write them.

`DataService` below is the project's existing profile owner. It must provide `waitForProfile(player)` (returns the active, session-locked profile, or `nil` if the lock was not acquired or the player left) and `saveAndConfirm(player)` (yields until a save containing the current data is confirmed; returns `false` on failure). With ProfileStore, the session lock comes from starting the profile session and `profile:IsActive()` reports whether this server still holds it; map `saveAndConfirm` onto the library's save API and its save-completion signal as documented for the version you use.

```luau
--!strict
-- ServerScriptService/ReceiptHandler (ModuleScript)
local Players = game:GetService("Players")
local DataService = require(script.Parent.DataService) -- project-owned, session-locked profiles

local PURCHASE_ID_HISTORY = 100 -- most recent receipt IDs kept per player

local ReceiptHandler = {}

-- productId -> grant applied to profile data. Must not yield and must be all-or-nothing:
-- return true only after the whole grant is applied, false (with no changes) otherwise.
ReceiptHandler.grants = {} :: { [number]: (data: any, receipt: { [string]: any }) -> boolean }

function ReceiptHandler.process(receipt: { [string]: any }): Enum.ProductPurchaseDecision
	local player = Players:GetPlayerByUserId(receipt.PlayerId)
	if not player then
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	local grant = ReceiptHandler.grants[receipt.ProductId]
	if not grant then
		warn(`[ReceiptHandler] unhandled product {receipt.ProductId}`)
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end
	local profile = DataService.waitForProfile(player)
	if not profile or not profile:IsActive() then
		return Enum.ProductPurchaseDecision.NotProcessedYet -- another server holds the lock, or the player left
	end

	local purchaseId = tostring(receipt.PurchaseId)
	local data = profile.Data
	if not table.find(data.PurchaseIds, purchaseId) then
		if not grant(data, receipt) then
			return Enum.ProductPurchaseDecision.NotProcessedYet
		end
		table.insert(data.PurchaseIds, purchaseId) -- same document as the grant
		while #data.PurchaseIds > PURCHASE_ID_HISTORY do
			table.remove(data.PurchaseIds, 1)
		end
	end

	-- Acknowledge only after a save that contains both the grant and the PurchaseId.
	if DataService.saveAndConfirm(player) then
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end
	return Enum.ProductPurchaseDecision.NotProcessedYet
end

return ReceiptHandler
```

```luau
--!strict
-- ServerScriptService/Receipts.server.luau: the ONLY script that sets ProcessReceipt
local MarketplaceService = game:GetService("MarketplaceService")
local ServerScriptService = game:GetService("ServerScriptService")
local ReceiptHandler = require(ServerScriptService:WaitForChild("ReceiptHandler") :: ModuleScript)

local COINS_100 = 0 -- your developer product ID

ReceiptHandler.grants[COINS_100] = function(data)
	data.Coins += 100
	return true
end

MarketplaceService.ProcessReceipt = ReceiptHandler.process
```

Why this is safe: a redelivered receipt finds its `PurchaseId` (in memory on this server, or in the saved profile on another) and skips the grant; a failed save leaves the receipt unresolved without having persisted half a grant; a concurrent call on a server without the lock returns `NotProcessedYet`. Keep `PurchaseIds` in the profile template (default `{}`) so old profiles reconcile. Update `leaderstats` and UI from the profile owner's change path, never as the source of truth.

**Verification (adapted from [MSayib/roblox-dev-skill](https://github.com/MSayib/roblox-dev-skill), MIT):** test the logic directly; you do not need a real purchase. In a Studio playtest with DataStore access enabled and a test profile, `execute_luau` (Server) can `require` the module (it gets its own copy, so register a test grant on that copy) and call `process` with a fake receipt whose `PlayerId` is the test player:

| Call | Expected |
|---|---|
| New `PurchaseId`, grant returns `true` | `PurchaseGranted`, grant ran once |
| The **same** `PurchaseId` again | `PurchaseGranted`, grant did **not** run again |
| Grant returns `false` | `NotProcessedYet` |
| Unknown `ProductId` | `NotProcessedYet` |
| `PlayerId` of someone not in the server | `NotProcessedYet` |

Use `PurchaseId`s with a `test-` prefix so they cannot collide with real purchases, and remove them from the test profile afterwards.

### 3c. Receipt failure tests

For every receipt implementation, force these cases in a test place:

- the player is absent;
- the product is unknown or its handler is missing;
- the grant succeeds but recording the transaction fails;
- the same transaction is delivered twice;
- the server shuts down between grant and acknowledgement.

Receipt failures can be silent in normal play: the player paid and nothing arrived. Treat the durable idempotency record as load-bearing. Do not acknowledge an unknown product or a grant that was not durably recorded, and verify duplicate delivery returns success without granting twice.

## 4. Subscriptions and recurring benefits

Subscriptions need explicit entitlement checks and renewal handling. Keep these separate from one-time Game Pass ownership. A subscription benefit should have:

- a server-side entitlement check;
- a clear expiration or renewal state;
- behavior when the subscription API is unavailable;
- a downgrade path that does not delete unrelated player data;
- UI that describes the actual cadence and benefit.

Use the current subscription documentation for platform eligibility. Do not hard-code assumptions about age, region, or payment availability.

### Pricing, payouts, and limits

From [Subscriptions](https://create.roblox.com/docs/production/monetization/subscriptions) (as of Oct 2026 — re-check the linked doc):

| | Priced in Robux | Priced in local currency |
|---|---|---|
| Eligibility | All creators | Account verified by ID or phone number |
| Price | Any amount ≥ 49 Robux | Fixed tiers: $2.99, $4.99, $7.99, $9.99, or $14.99 |
| Regional pricing | On by default, cannot be turned off | Not available |
| Your payout | 70% of the subscription value every month | 70% in the first month, then 100% from the second month (earned in Robux at US $0.01 per Robux of the base price) |
| Platforms / countries | All | Web, App Store, Google Play; unavailable in some countries (listed on the doc) |
| Hold period | Same as passes and products (~5 days) | 30 days, released after the term is delivered |
| Price changes | Once every 60 days; increases take effect after users get at least 30 days' notice | Not possible: delete and recreate |
| Refunds | Not eligible | Possible through bank/app store; deducted from your balance if outside the hold |

- **Max 50 subscriptions per game** (active and inactive combined). Mutually exclusive tiers ("Bronze/Silver/Gold") are not supported; each subscription must be a distinct benefit set.
- Guidelines: honor the benefit for the full term, offer the same benefit on every platform, don't direct users to buy elsewhere, and don't gate paid benefits behind extra tasks.
- `MarketplaceService:PromptSubscriptionPurchase(player, subscriptionId)` opens the prompt; `MarketplaceService.PromptSubscriptionPurchaseFinished(user, subscriptionId, didTryPurchasing)` fires when the prompt closes. It reports only that the user *tried*, not that payment succeeded; the docs' sample re-checks status after a delay. Status checks with `GetUserSubscriptionStatusAsync` must run on the server.
- Only offer subscriptions where they are purchasable; users in unsupported regions/platforms can see but not complete the purchase.
- Subscriptions can't be cross-sold by other games and aren't eligible for affiliate fees. Cloud webhooks exist for purchased, renewed, cancelled, and refunded events.

### Subscription status reconciliation

Query `MarketplaceService:GetUserSubscriptionStatusAsync(player, subscriptionId)` on the server at join. The result separates `IsSubscribed` (active entitlement) from `IsRenewing` (whether it will renew); cancellation of renewal is not immediate loss of a paid current term.

Even a successful query returns `IsSubscribed = false` while an initial payment is processing **or has failed**. Do not equate that response with a confirmed cancellation, and never grant a new paid benefit before active status is confirmed. Operator guidance: show pending status after purchase, reconcile again through the documented status event and bounded retries, and make any grace policy for previously confirmed benefits explicit rather than extending access indefinitely.

Listen to **`Players.UserSubscriptionStatusChanged(player, subscriptionId)`**, then query the current status again. It is not a `MarketplaceService.SubscriptionStatusChanged` event carrying a trusted new-status argument. Prompt closure is not payment confirmation.

This event is server-only and is recognized after the subscription purchase modal closes; an external purchase during play may need the documented prompt/refresh flow. Do not assume it is a push notification for every external billing change.

Apply/revoke through one benefit reconciler, with separate ownership for permanent pass benefits and temporary subscription benefits. A failed lookup is unknown: surface and retry within a bounded policy rather than deleting unrelated data or treating it as confirmed expiry. On replacing a pass with a subscription, preserve legacy passholders’ permanent benefits. If a plan grants currency once per paid period, use the documented payment/history contract and a durable period-specific deduplication record; do not grant again on every status check.

## 4a. Rewarded video ads

Players opt in to watch a 6–30-second ad and receive a Developer Product as the reward ([Rewarded video ads](https://create.roblox.com/docs/production/promotion/rewarded-video-ads), [AdService](https://create.roblox.com/docs/reference/engine/classes/AdService)). Earnings come from impressions (EPM).

**Eligibility (as of Oct 2026 — re-check the linked doc):**
- Publisher: 13+, account in good standing, 2-Step Verification enabled, and ID verification.
- Game: public and unrestricted, no free-form user creation, an approved Maturity & Compliance Questionnaire, and an average of at least **2,000 unique visitors per month**. Resubmitting the questionnaire temporarily removes ads eligibility while it is reviewed.
- Enable serving in Creator Dashboard → Monetization → Ads → Settings, and pick the reward product (created in the same universe).

**Reward rules:** the reward must be a Developer Product that would normally be purchasable in your shop, never Robux and never a randomized item; it must not inflate the economy; it is granted immediately after the ad completes. The player must take a clear action (a button) to start the ad, with an unambiguous disclosure of the reward ("Watch an ad to earn 10 diamonds!"). Never force an ad as a progress gate, take over the screen, or promise fraudulent rewards. Pause damage or show ads only in safe zones. Roblox suggests rewards worth roughly 3–10 Robux, offered at natural breaks.

**Flow:**
1. **Client** (a script with client run context; the API is client-only): call `AdService:GetAdAvailabilityNowAsync(Enum.AdFormat.RewardedVideo)` as close as possible to showing the offer (for example, when the shop opens). Show the button only if `result.AdAvailabilityResult == Enum.AdAvailabilityResult.IsAvailable`. One `IsAvailable` result covers one ad play.
2. **Client → server:** the button fires a remote. Rate-limit it per player on the server.
3. **Server:** `local reward = AdService:CreateAdRewardFromDevProductId(PRODUCT_ID)` then `AdService:ShowRewardedVideoAdAsync(player, reward, placementId?)`. The returned `ShowAdResult` (for example `AdNotReady`, `ShowCompleted`) is for UI only. **Do not grant from it.**
4. **Receipt path:** when the ad completes, Roblox delivers a normal Developer Product receipt with `receiptInfo.ProductPurchaseChannel == Enum.ProductPurchaseChannel.AdReward`. Grant there, through the same idempotent, session-locked path as §3b. Check the channel to tell ad rewards from Robux purchases of the same product (for analytics, or if the two should differ).

```luau
-- Server Script (illustrative)
local AdService = game:GetService("AdService")
local REWARD_PRODUCT_ID = 0 -- developer product in this universe

watchAdRemote.OnServerEvent:Connect(function(player: Player)
	if not adCooldown:tryConsume(player) then -- project-owned per-player rate limit
		return
	end
	local ok, result = pcall(function()
		local reward = AdService:CreateAdRewardFromDevProductId(REWARD_PRODUCT_ID)
		return AdService:ShowRewardedVideoAdAsync(player, reward)
	end)
	watchAdRemote:FireClient(player, ok, result) -- UI feedback only; the grant happens in the receipt handler
end)

-- In ReceiptHandler.grants (§3b):
ReceiptHandler.grants[REWARD_PRODUCT_ID] = function(data, receipt)
	if receipt.ProductPurchaseChannel == Enum.ProductPurchaseChannel.AdReward then
		data.AdRewardsClaimed += 1 -- optional bookkeeping
	end
	data.Diamonds += 10
	return true
end
```

The ad docs show `ProcessReceipt`; the `BindReceiptHandler` reference's receipt table does not list `ProductPurchaseChannel`, so verify the field is present before relying on it in a bound handler. Optional: `AdService:RegisterAdOpportunityAsync` (client) and Creator Hub placements to measure each ad spot, and the dashboard toggle that excludes likely purchasers when the reward is also sold. Roll new placements out with an experiment.

## 5. Private servers and paid access

Private-server prompts, paid access, and item purchases solve different problems. Decide whether the player is buying access, a server instance, or an in-game entitlement. Keep access enforcement on the server and test owners, invited players, and expired or unavailable configurations.

## 6. Policy and presentation

Eligibility-sensitive products may require `PolicyService` checks (`PolicyService:GetPolicyInfoForPlayerAsync(player)` returns, among others, `ArePaidRandomItemsRestricted` and `IsPaidItemTradingAllowed`; when the latter is false, the user must not trade paid items or the outcomes of paid random items). Treat a failed policy lookup conservatively for the affected feature, and update the implementation when Roblox changes the documented requirements.

Purchase UI should make the price, cadence, contents, and meaningful restrictions clear. For randomized paid content, the current policy documentation requires outcome and numerical-odds disclosure before purchase, and classifies broad item types as paid random items, including probability modifiers such as luck boosts and pity systems. Do not rely on a color, rarity label, or marketing phrase as a substitute for a required disclosure.

When `ArePaidRandomItemsRestricted` is true for a user, Roblox lists several treatments: an unpaid earnable path to the item, a disclosed non-random sequence, guaranteed direct purchase of specific outcomes, hiding the paid-random feature, blocking that purchase with a message, or removing the user from the affected part of the game. Present the options and their trade-offs instead of defaulting to the most disruptive one. Do not unilaterally hide or remove a feature when a less disruptive documented option fits the game.

If the restriction applies, odds disclosure alone is not one of the listed treatments. Ask which documented option suits the game. If the requested purchase flow conflicts with the restriction, explain that once and keep working on unaffected parts; do not silently disable the feature or treat an unverified policy check as a pass.

Platform program names and payout rules change. Engagement-Based Payouts is historical/deprecated material, not a current implementation target; consult the current Creator Rewards documentation when working on platform payouts.

### Pricing reference

- **Revenue share:** creators generally earn 70% of anything they sell for Robux in their game ([Monetize](https://create.roblox.com/docs/monetize); as of Oct 2026 — re-check the linked doc). Subscriptions differ (§4); Robux transfers pay the game 10% (below).
- **Robux bundles (what players pay to get Robux):** approximate US prices reported in Aug 2026, not verified against an official page; as of Aug 2026 — re-check roblox.com/upgrades/robux before building a model on them. Regional pricing changes these per country.

| Spend | On web | In app |
|---|---|---|
| $4.99 | 500 R$ | 400 R$ |
| $9.99 | 1,000 R$ | 800 R$ |
| $19.99 | 2,000 R$ | 1,700 R$ |
| $49.99 | 5,250 R$ | 4,500 R$ |

- Pricing psychology (charm pricing, anchoring, ladders) → `roblox-player-psychology`. Value design → `roblox-game-design`.

### Price optimization

[Price optimization](https://create.roblox.com/docs/production/monetization/price-optimization) is part of Managed Pricing (as of Oct 2026 — re-check the linked doc):
- It needs enough data: in most cases **at least 60,000 transactions over the previous 30 days** (sum of product sales).
- It only works on developer products and passes (not subscriptions), and only on prices fetched at runtime; run the **Dynamic Price Check** first to find hard-coded prices.
- A test splits users into price groups for about 3 weeks; prices are applied only if total incremental revenue is positive. Tests then run automatically **at least every 90 days**, or sooner when prices may no longer be optimal. You can't change tested products' prices during a test.
- Smaller games: use qualitative value research and scoped experiments instead.

### Dynamic prices and transfer arbitrage

With Managed Pricing, fetch displayed product/pass prices at runtime from a client script using `MarketplaceService:GetProductInfoAsync` (and the matching `Enum.InfoType`); do not hard-code the default price in custom UI. Handle lookup failure as unavailable pricing rather than inventing an amount. Test with Creator Dashboard’s Dynamic Price Check and disable its test configuration afterward. Official source: [regional pricing](https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/production/monetization/regional-pricing.md).

For transferable paid items, price differences create a separate trading/gifting risk. Use `GetUsersPriceLevelsAsync` to inform the server’s transfer policy; map results by user ID and handle missing/failed results explicitly. Fetch at join and do not carry price-level caches across sessions. These levels do not replace item ownership checks, and a price-difference threshold is a design choice, not universal Roblox policy.

### Robux transfers are a distinct receipt flow

Official [Robux transfers](https://create.roblox.com/docs/production/monetization/robux-transfers) use server-only `MarketplaceService:PromptRobuxTransferAsync(sender, receiverUserId, amount)` with Roblox-controlled confirmation and eligibility. Use the actual requesting player as sender; validate the recipient, finite positive integer amount, supported bounds, authorization and prompt frequency before calling. Do not confuse a transfer request ID with settlement. As documented when reviewed, the supported transaction range is 10–500 Robux (as of Oct 2026 — re-check the linked doc). <!-- temporal: 2026-10 -->

Transfers are a Roblox Plus subscriber feature. The current documented split is 10% to the game and 90% to the recipient (as of Oct 2026 — re-check the linked doc); game earnings are DevEx-eligible and Roblox takes no transfer fee. Model reward economics against the appropriate sent/received amount, not a presumed 100% recipient payout. <!-- temporal: 2026-10 -->

Register separate `BindReceiptHandler` handlers for `Enum.ReceiptType.RobuxTransferSender` and `Enum.ReceiptType.RobuxTransferReceiver`. Correlate using `TransferRequestId`; use the receipt’s unique `PurchaseId` for durable duplicate protection and distinguish receipt side/user so sender and receiver processing cannot suppress each other. Return `Enum.ReceiptDecision.Processed` only after any promised persistent benefit is committed; otherwise keep it `NotProcessedYet`. Do not use `Enum.ProductPurchaseDecision` for bound handlers.

Receipts can settle after receiver approval and arrive on whichever server the relevant user is currently in, or on their next join if offline. Handle receipts without depending on the originating server’s in-memory request table. Sender `CurrencySpent` is sent amount; receiver `CurrencySpent` is received amount, so they are not interchangeable. Platform eligibility and limits remain Roblox-owned: do not fabricate age/subscription approval or direct Robux payouts.

## 7. Creator Rewards

Creator Rewards is a platform program rather than an in-experience purchase API. As documented (verified 2026-10-18; as of Oct 2026 — re-check [Creator Rewards](https://create.roblox.com/docs/creator-rewards)), it has two parts:

- **Daily Engagement Rewards:** 5 Robux when an Active Spender spends at least 10 minutes in the experience during a day and the experience is one of the first three they launch that day. An Active Spender has made qualifying purchases of at least $9.99 anywhere on Roblox in the past 60 days and was not a New or Reactivated User in that window.
- **Audience Expansion Rewards:** a 35% revenue share on the first $100 of qualifying purchases by an attributed New User or Reactivated User during their first 60 days, subject to the experience's 10-minute, attribution, and average-100-DAU-for-60-days conditions. Attribution comes from your game's Share Links, direct links, or searches for its exact name (acquisition tactics → `roblox-growth-design` §9).

Creator Rewards data is surfaced in Creator Dashboard and has a 60-day holding period. There is no server callback that grants the reward to a player and no purchase receipt to process. Do not make Creator Rewards the source of truth for coins, products, or player entitlements.

Treat the program terms as changeable policy. Do not automate engagement, manipulate teleports, encourage alternate accounts, or design an idle loop solely to manufacture reward activity. Review the current eligibility, anti-fraud, and DevEx terms before making a business or content decision.

## 8. Economy design

Monetization changes the economy even when the product is cosmetic:

- faucets increase supply;
- sinks remove supply;
- multipliers change time-to-earn;
- tradeable rewards can create secondary markets;
- limited offers can concentrate demand and support load.

Model the ordinary player path before choosing prices. Track purchases and grants separately so an analytics event cannot become the source of truth for inventory.

## 9. Testing matrix

Test in a non-production place with representative data:

- prompt cancelled;
- ownership API errors;
- unknown product id;
- player leaves before receipt processing;
- receipt callback called twice (same server, and concurrently on a second server);
- rewarded-ad receipt (`ProductPurchaseChannel.AdReward`) granted once and only through the receipt path;
- grant succeeds but receipt recording fails;
- save or shutdown begins during a grant;
- subscription entitlement changes;
- policy lookup denies or cannot determine eligibility.
- Creator Rewards eligibility and dashboard reporting reviewed when the experience is relying on it.

Keep test product IDs and test entitlements out of production configuration.

## Monetization checklist

- [ ] Prompting is client-side, granting is server-side.
- [ ] Receipt routing has one owner per product/type; passes share a benefit reconciler.
- [ ] Grants are idempotent and receipt identifiers are recorded.
- [ ] Product configuration is trusted server data.
- [ ] Policy and eligibility checks use current official documentation.
- [ ] Prices, cadence, contents, and disclosures are visible before purchase.
- [ ] Failures leave the receipt retryable instead of silently acknowledging it.

## Catalog eligibility and deferred fulfilment

### Separate catalog and purchase states

Define display, selection, acquisition, purchase, ownership, and equip eligibility separately. An earn-only reward can remain visible with its actual acquisition path while the server rejects an invalid purchase. Test card creation, retained selection, action labels, ownership changes, and equipping together; a hidden card cannot exercise its existing acquisition-button code.

### Isolate optional diagnostics

Optional telemetry must not break an authoritative grant, trigger a duplicate grant, or cause an owed entitlement to disappear. Keep grant/idempotency state inside its established durable transaction boundary and isolate diagnostic failures from that result. Inject a telemetry failure into the purchase test; a successful counter test does not verify grant safety.

### Settle delayed entitlements deliberately

Model reserved, started, confirmed-delivered, cancelled, and recoverable states for paid effects. Identify operations bought with saved credits as well as those with receipt IDs; retries and duplicate callbacks must find the same authoritative operation.

Define the effect-delivery boundary and the recovery policy for a started operation whose outcome is unknown. Do not promise exactly-once world execution when effect delivery and persistence cannot commit atomically. Do not refund merely because the buyer leaves if an already-running effect can still complete. Do not mark an effect delivered after shutdown cancellation prevented it from running.

Test disconnect before and after start, explicit cancellation, duplicate completion, crash-left saved state, rejoin recovery, and shutdown ordering. Verify the actual owed entitlement after each case through the real save validator and grant owner; see `roblox-data`. Keep fulfilment of the game's owed item or credit distinct from a platform payment refund.

## Sources

Reviewed 2026-10-18.

- [MarketplaceService](https://create.roblox.com/docs/reference/engine/classes/MarketplaceService) (BindReceiptHandler, ProcessReceipt, PromptSubscriptionPurchaseFinished)
- [Passes](https://create.roblox.com/docs/production/monetization/passes)
- [Developer Products](https://create.roblox.com/docs/production/monetization/developer-products)
- [Subscriptions](https://create.roblox.com/docs/production/monetization/subscriptions)
- [Rewarded video ads](https://create.roblox.com/docs/production/promotion/rewarded-video-ads)
- [AdService](https://create.roblox.com/docs/reference/engine/classes/AdService)
- [Regional pricing](https://create.roblox.com/docs/production/monetization/regional-pricing)
- [Price optimization](https://create.roblox.com/docs/production/monetization/price-optimization)
- [Robux transfers](https://create.roblox.com/docs/production/monetization/robux-transfers)
- [Paid random items policy](https://create.roblox.com/docs/production/monetization/paid-random-items)
- [PolicyService](https://create.roblox.com/docs/reference/engine/classes/PolicyService)
- [Monetize on Roblox](https://create.roblox.com/docs/monetize)
- [Creator Rewards](https://create.roblox.com/docs/creator-rewards)
- [DevForum: Creator Rewards is live](https://devforum.roblox.com/t/creator-rewards-is-live/3838257)
- Receipt test table adapted from [MSayib/roblox-dev-skill](https://github.com/MSayib/roblox-dev-skill) `references/worked-examples.md` (MIT)
