# Tycoon recipe

Loaded by `game-spec` when the pitch is a tycoon (or a hybrid with one: idle-sim, brainrot/steal, restaurant/retail management). Numbers are starting defaults: they go into `Config` tables in the `*Logic` modules and get tuned from playtests. M0 (bootstrap, data layer, remotes, rate limiter, QA commands incl. `Data.reset` / `Data.reload`, blockout, lighting) is common; this file only adds to it.

Contents: Fantasy and references · Loop and pacing · Interview · Systems · Data schema · Economy and tuning · World · UI and input · FTUE · Monetization · Retention and social · Feature list skeleton · Playtest scripts · Design rules · Analytics.

## Fantasy and references

Fantasy: "I built this empire from one conveyor": a personal base that visibly grows with every purchase, runs itself, and can be shown off to everyone else on the server.

- Retail Tycoon 2 / Restaurant Tycoon 2 / My Restaurant: long-running management tycoons (stock, staff, customers, deep layout customization). Take: customization and a base other players can see are the retention engine; keep management depth optional.
- Sell Lemons (BloxByte): idle tycoon, grow -> process -> sell, buy a manager per station, "Ascend" prestige with a stacking investor multiplier and a second "Evolution" layer; reported to keep earning offline. Take: automation-first loop plus layered prestige.
- Steal a Brainrot: buy items from a shared conveyor, place them on base slots that earn cash per second, steal from unlocked bases (reported 30 s base lock, longer per rebirth), rebirth chain with big multipliers. Take: a tycoon base becomes social when others can threaten or admire it; the first spawn lets you do the verb.
- Grow a Garden: plot-based, timer-driven, shared restocks every 5 minutes (reported); its player-to-player trading economy was the weak point. Take: appointment timers work on tycoon plots; keep trading out.
- Adopt Me!-style plot homes and Brookhaven props show the platform's appetite for personal space: sell plot skins, not power.

## Loop and pacing

- Core loop (seconds): ore flows to the collector -> walk over the collector (cash pops) -> walk to the next button -> a new machine builds in -> income rises.
- Meta loop (minutes): tier gates (tier 1 workshop -> tier 4 mega factory), Dropper Value upgrades, Supply Drops (active bonus), boosts.
- Long-term loop (hours/days): rebirth (permanent x1.5 each), upgrades that survive rebirth, plot skins, leaderboards, daily/playtime/codes, offline welcome-back.
- Spawn on your own plot; first cash change within 5 s; first purchase at ~10 s (button 1 costs 25, start cash 15, the collector bridges the gap); 5 items by 60 s; tier 1 (12 items) done at ~2.3 min and tier 2 unlocks then, tier 3 unlocks at ~5.8 min, tier 4 at ~13 min; all 48 items at ~29 min; first rebirth at ~35 min (perfect-play estimate, expect up to 1.5x for real players). Later cycles 22-30 min for rebirths 2-6.
- Never idle: after item 3 the next button is always <= 110 s away (tier 4 worst case) and the player has something to do while waiting (collect, Supply Drop, upgrade, visit).
- Session length target 20-30 min; D1 return driven by offline welcome-back and the daily reward.

## Interview: questions that change the build

| Question | Options | Default (auto mode) |
|---|---|---|
| Style | A Classic (droppers -> conveyor -> collector, buttons); B Idle-sim (stations + managers, no walking income); C Steal hybrid (conveyor stock, slots, base lock, steals) | A |
| Theme/fantasy | Candy factory; pizza empire; space mining; lemonade stand; zoo | Candy factory |
| Plot assignment | Auto-assign at join and spawn there; claim pad; private-server style single plot | Auto-assign |
| Co-op | Solo plots only; shared server events; team plots | Solo plots + visiting |
| Prestige depth | One rebirth layer; rebirth + second layer (Ascend/Evolution) | One layer |
| Real-time interaction | Pure tycoon; add NPC customers (retail/restaurant); add PvP stealing | Pure tycoon |

Variant B: replace droppers with 6 stations; manager cost = 10x station cost; stations auto-run; income formula and rebirth unchanged. Variant C: see Systems notes.

## Systems

| System | Milestone | Server owns | Client shows | Roblox APIs | Kit skills |
|---|---|---|---|---|---|
| Plots | M1 | Slot allocation, `OwnerUserId` attribute, claim/release, rebuild from profile | Plot name signs, own-plot highlight | `CollectionService`, `Player.RespawnLocation`, `PVInstance:PivotTo`, `Players.PlayerRemoving` | roblox-architecture, roblox-data |
| Purchases | M1 | Button list, cost, prerequisites, spend + grant | Price billboards, build-up animation, affordable glow | `BasePart.Touched`, `TweenService` | roblox-security, roblox-networking |
| Income | M1 | Tick, bank, collector, multipliers (analytic, no physical ore) | Cash pop, HUD numbers, cosmetic ore on conveyors | `os.clock`, `RunService.Heartbeat` | roblox-game-design |
| Tiers and content | M2 | Tier gates, item definitions | Elevator unlock, locked silhouettes | `ModelStreamingMode`, `CollectionService` | roblox-building |
| Upgrades | M2 | Level state, cost, effect | Upgrade panel | none | roblox-gui |
| Rebirth | M2 | Eligibility, fee, reset, multiplier | Altar, confirm panel showing gain | `ProximityPrompt` | roblox-game-design |
| Offline earnings | M2 | `lastSeen`, elapsed/cap/rate math (`os.time`) | Welcome-back popup | `os.time` | roblox-data |
| Boosts and Supply Drops | M2 | Boost timers, drop schedule (seeded Random), claim validation | Timer chips, falling crate | `Random`, `ProximityPrompt` | roblox-player-psychology |
| Hub and boards | M3 | Throttled OrderedDataStore writes | Boards, daily board, shop kiosk | `DataStoreService:GetOrderedDataStore` | roblox-server-data |
| Shop (passes, products, receipts) | M4 | Pass registry, `ProcessReceipt`, idempotent grants | Offers with live prices | `MarketplaceService`, `PolicyService` | roblox-monetization |
| Rewards | M4 | Daily/playtime/codes/group | Reward panel | `Player:IsInGroupAsync`, `BadgeService:AwardBadgeAsync` | roblox-growth-design |

Tricky parts:
- **Plot claim/release.** `PlotLogic.assign(slots, userId)` is pure: returns the first free slot index, or the user's previous slot if still free (so a rejoiner lands home), or `nil` when full. Slots live in `Workspace.Plots` (`Plot01`..`Plot12`, tag `Plot`, attribute `OwnerUserId`, 0 = free). On profile load: assign, `RespawnLocation` = plot `Spawn` (Neutral, Duration 0), rebuild owned items. On `PlayerRemoving`: save, `Destroy` dynamic children, set owner 0. If the server is full (max players <= 12 so it should not be), kick with a message rather than sharing a plot.
- **Rebuild from profile.** Plot = static shell + dynamic children cloned from `ServerStorage.TycoonItems[itemId]` and placed with `plot:GetPivot() * itemOffset`. Rebuild instantly in batches of 4 items/frame; animate only newly bought items. Buttons exist only for the next 2 unowned items (`TycoonLogic.availableButtons(owned)`), so the player always has a choice and part count stays low.
- **Purchases.** Pad `Touched` (server) -> `Tycoon.tryBuy(player, itemId)`: owner of this plot? item is one of `availableButtons`? `cash >= itemCost`? Spend and grant in one function; debounce 0.25 s per player. There is no purchase remote: walking onto the pad is the request. Mobile players tap-walk onto pads that are 8 x 8 studs.
- **Income is analytic.** `TycoonLogic.incomePerSecond(owned, upgrades, rebirths, boosts)` is pure. The Income system ticks every 1 s using `os.clock` delta (clamped to 2 s): `bank = min(bank + rate x dt, rate x BANK_CAP_SECONDS)`. No ore is ever a server instance, so economy never depends on physics or lag. The client spawns cosmetic ore (anchored, `CanCollide/CanQuery/CanTouch` false) along each conveyor's waypoint attributes, tweened, capped at 4 per dropper and only within 150 studs of the camera.
- **Collector.** Pad `Touched` by the plot owner -> `Income.collect`: `cash += bank`, `bank = 0`, fire a `CollectSync` with the amount for the cash-pop VFX. With Auto Collect, each tick adds straight to `cash`. A visible bank bar fills to `BANK_CAP_SECONDS` (600 s); a full bank pauses accrual (offline is separate).
- **Conveyor walkways** (tier transitions) are anchored parts with `AssemblyLinearVelocity` set: touching characters move with the belt (anchored-part velocity behaves as a conveyor).
- **Big numbers.** `MAX_CASH = 2^53`; every add is `min(MAX_CASH, a + b)`; all formatting through `NumberFormat.short(n)` (K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc).
- **Variant C (steal hybrid).** Shared server conveyor stock restocks every 15 s from a seeded `Random`; bought items occupy base slots (`slots = 10`, +1 per rebirth) earning cash/s; stealing = `ProximityPrompt` (HoldDuration 1.5) on another player's slot when their `lockUntil < now`; base lock 30 s after join/theft, +10 s per rebirth; a hit on the carrier returns the item. Server validates owner, lock, distance and carry state; thefts move the item record between profiles through a session-locked ledger (no cross-profile direct write).

## Data schema

```luau
export type TycoonProfile = {
	version: number, -- 1
	cash: number,
	bank: number, -- uncollected, <= rate x BANK_CAP_SECONDS
	owned: { [string]: true }, -- "I01".."I48"
	upgrades: { dropperValue: number, offlineCap: number }, -- survive rebirth
	rebirths: number,
	totalEarned: number, -- lifetime, leaderboard
	boostUntil: number, -- os.time() when the x2 boost ends
	lastSeen: number, -- os.time()
	plotSkin: string,
	ownedPasses: { [string]: true }, -- cache; truth is MarketplaceService
	daily: { day: number, streak: number, lastClaimDay: number, graceUsed: boolean },
	playtime: { dayKey: number, seconds: number, claimedMask: number },
	redeemedCodes: { [string]: true },
	flags: { tutorialDone: boolean, groupRewarded: boolean, starterBought: boolean },
	settings: { music: boolean, sfx: boolean },
	purchaseIds: { string }, -- last 100 PurchaseIds (ReceiptHandler)
}
```

Session-only: plot slot, dynamic plot instances, active Supply Drop, debounces, pending offline reward until claimed, cosmetic ore. Leaderboards live in OrderedDataStores (`TycoonRebirths_v1`, `TycoonEarned_v1`).

## Economy and tuning defaults

Formulas (`TycoonLogic`, index i = 0..47, 4 tiers x 12):
- `itemCost(i) = floor(25 x 1.30^i)` (25, 32, 42 ... 5,666,013); `itemIncome(i) = 1.22^i` per second; free starter dropper = 1/s.
- `incomeMultiplier = (1 + 0.1 x dropperValueLevel) x 1.5^rebirths x (1 + 1 x has2xCash + 1 x boostActive)`. Upgrades and rebirth multiply; monetization bonuses are additive (max x3), never multiplicative with each other.
- `upgradeCost(track, L) = floor(3000 x 1.9^L)`; Dropper Value: +10% per level, max 20 levels; Offline Cap: +1 h per level, max 8.
- `rebirthFee(n) = floor(2.5e7 x 1.9^n)`; requires all 48 items; resets cash (to `START_CASH`), bank and owned; keeps upgrades, passes, skins, settings.
- Offline: `reward = incomePerSecond x min(elapsed, capSeconds) x 0.15`, cap = 4 h + upgrades (max 12 h); active play is always better.
- Supply Drop: every 75-105 s (seeded), lasts 20 s, pays 20 s of current income (~ +22% for an attentive player).
- Packs: `incomePerSecond x seconds`, minimum 1,000, clamp to `MAX_CASH` (scale with progress so they never go stale).

Simulated pacing (greedy buyer, no upgrades): tier 1 2.3 min (waits 10-16 s), tier 2 3.5 min (13-24 s), tier 3 7.4 min (25-51 s), tier 4 15.7 min (54-109 s); full base 28.9 min. Rebirth cycles (time to rebuild plus fee): #1 35 min, then 27.5, 23, 22, 23, 25, 30, 36, 45, 56. The spec `tests/TycoonEconomy.spec.luau` embeds this greedy simulation and asserts max wait <= 120 s, full base 25-32 min, first rebirth 30-40 min, each later cycle <= 60 min through rebirth 10.

| Constant | Default |
|---|---|
| `START_CASH` / `START_INCOME` | 15 / 1 per s |
| `BANK_CAP_SECONDS` | 600 |
| `TICK_SECONDS` | 1 |
| `OFFLINE_RATE` / `OFFLINE_BASE_CAP` | 0.15 / 4 h |
| `PLOT_COUNT` | 12 |
| `BUY_DEBOUNCE` | 0.25 s |

Sources: collector/auto tick, Supply Drops, rewards, offline, packs. Sinks: items, upgrades, rebirth fee. Sinks outrun sources only at tier 4 and rebirth fees by design; the Dropper Value track (costs up to 5.9e8) is the late sink.

## World

- **Ring layout.** 12 plots of 96 x 96 studs on a ring of radius 232 studs (120 studs spacing), all facing the hub, so everyone sees others' bases. Hub (radius 40 studs) at the center: shop kiosk, rebirth altar, daily board, codes terminal, two leaderboard walls, plot-teleport map. No walls between plots; the owner's plot has a glowing floor ring, others show name signs.
- **Plot vertical layout.** Footprint stays 96 x 96; tiers stack 24 studs apart (workshop ground, mezzanine, upper floor, rooftop) joined by elevators/stairs/conveyor walkways, so every tier unlock reveals more of the base from far away.
- Item footprint grid 8 studs; button pads 8 x 8 studs, neon-edged, price billboard; collector pad 12 x 12 studs with a rising bank bar.
- Lighting: Brightness 3, ClockTime 14, Atmosphere Density 0.25, Bloom 0.3, soft shadows only. Style: toy-like, SmoothPlastic with one hero color per tier (candy pink, mint, gold, electric blue), neon accents for affordable buttons.
- Tags: `Plot`, `PlotSpawn`, `Collector`, `Button`, `Conveyor` (attributes for waypoints), `RebirthAltar`, `SupplyDropZone`, `Pending` (hidden item). Part budget: <= 600 parts per fully built plot, <= 8,000 total.

## UI and input

- HUD: cash (top center, large, `NumberFormat.short`), income/s beneath it, bank bar near the collector, next-purchase beam (Beam from the player's root to the cheapest affordable button, always on), boost timer chip, rebirth button appears only when eligible.
- Screens: Upgrades, Shop (Boosts / Packs / Passes / Skins), Rebirth confirm (shows multiplier now -> after, fee, what is kept), Daily, Welcome-back, Settings.
- Mobile: buttons >= 56 px outside the thumbstick/jump zones; purchase is walk-over, no tapping small UI; cash pop and price text >= 22 px; collector large; elevator calls use `ProximityPrompt`. Gamepad: panels selectable, `ButtonX` default prompt.

## FTUE

First 60 s:
1. 0-5 s: spawn on your own plot at its `Spawn`, cash `15`, the starter dropper already running, collector glowing with a single arrow; no popups.
2. 5-12 s: walk over the collector: cash pops (+10 after 10 s of income, cash 25), arrow now points to button 1.
3. ~12-20 s: step on button 1 (25): build-up animation (parts drop in, sound), income 1 -> 2/s; arrow points to button 2.
4. 20-60 s: buttons 2-5 follow every 13-26 s; the tier 2 elevator door is visible with a lock and `12 items`; HUD shows income rising; locked tier silhouettes visible on the skyline.

First 5 min:
5. ~90 s: first Supply Drop lands next to the player with a single arrow (+20 s income).
6. ~2 min: tier 1 complete, elevator animates open, tier 2 buttons appear.
7. ~4 min: first Dropper Value upgrade (cost 3,000) becomes affordable: panel pulse, one tap.
8. ~5 min: tier 3 unlocked; daily reward appears (after `tutorialDone`, set at the first purchase); rebirth altar visibly glows locked with `Own every item` as the long-term goal.
9. Show others: leaderboard wall shows rebirths of players on this server.

## Monetization

| Item | Type | Default price (R$) | Rule |
|---|---|---|---|
| Auto Collect | Game pass | 199 | Convenience; income goes straight to cash |
| 2x Cash | Game pass | 499 | Additive bonus (max x3 with boost), income only |
| VIP | Game pass | 999 | Tag, lounge, +4 h offline cap, neon floor; no income power |
| Neon Plot skin | Game pass | 149 | Cosmetic |
| Cash Pack S (10 min of income) | Developer product | 29 | Scales with `incomePerSecond`, min 1,000 |
| Cash Pack M (45 min) | Developer product | 99 | Same rule |
| Cash Pack L (3 h) | Developer product | 349 | Same rule |
| 2x Boost 30 min | Developer product | 49 | Extends `boostUntil` from `max(now, boostUntil)` |
| Starter Bundle (30 min boost + Pack M + Neon skin) | Developer product, once | 99 | Offered after 8 min played; `starterBought` blocks repeats |

Policy: no paid random items (Supply Drops are free), so no `ArePaidRandomItemsRestricted` path is needed; if a pitch adds mystery crates, load `roblox-monetization` §6. Prompt from the client, grant in the shared `ReceiptHandler`, passes through one benefit registry; show prices from `GetProductInfoAsync`. Never gate the main item path behind a pass: every one of the 48 items is buyable with cash.

## Retention and social

- Daily reward (7-day cycle): minutes of current income [5, 10, 15, 20, 30, 45], day 7 = 60 min of income + free 30-min boost; UTC days from `os.time()`; one forgiven missed day.
- Playtime rewards per UTC day: 5 min = 3 min of income, 10 = 5, 20 = 10, 30 = 15, 45 = free 15-min boost.
- Offline welcome-back at every join after > 5 min: shows elapsed, reward, a claim button (reward is granted on claim; closing the popup claims it).
- Codes: server table with expiry, 5 redemptions/min limit, one use per profile; like goals are not verifiable by API, so publish milestone codes.
- Group reward: `Player:IsInGroupAsync(GROUP_ID)`, once: Neon skin + 30-min boost.
- Leaderboards: rebirths and lifetime earned (all-time). Visiting: hub map teleports to any plot (`PivotTo` near its edge); visitors cannot buy or collect.
- Friends: invite button after tier 2 (`SocialService:CanSendGameInviteAsync` then `PromptGameInvite`, client); friends spawn into their own plots on the same server when possible (default join behavior).
- Badges: Welcome, Tier 2/3/4, First Rebirth, Rebirth 5.

## Feature list skeleton

Milestones: M1 TYC-01–07 · M2 TYC-08–13 · M3 TYC-14–17 · M4 TYC-18–22, then the standard LAUNCH-01..05 from `features-schema.md`. `depends` uses the standard CORE-xx ids. Acceptance lists unit assertions (U) and playtest checks (P); `game-spec` rewrites them as Given/When/Then.

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| TYC-01 | TycoonLogic and Config (costs, income, multipliers, fees, offline) | CORE-01 | U: `itemCost(0..2) = 25, 32, 42`, `itemCost(47) = 5666013`; `incomeMultiplier` stacks upgrade x rebirth x additive bonuses, max x3 bonus; offline caps at 4 h x 0.15; NaN/negative/inf rejected; greedy simulation within the pacing bands above |
| TYC-02 | NumberFormat | CORE-01 | U: 999 -> `999`, 1_000 -> `1K`, 1.5e6 -> `1.5M`, 2^53 -> a Dc/No string, never returns `inf`/`nan` |
| TYC-03 | PlotLogic and Plots system | CORE-04, CORE-06 | U: first free slot; previous slot reused; full -> nil; release frees; P: join -> `Plot01.OwnerUserId == UserId`, player spawns at `Spawn`; leaving frees the slot |
| TYC-04 | Plot template, item models, rebuild from profile | TYC-01, TYC-03 | P: QA `Tycoon.grantItems I01..I10`, `Data.reload` -> exactly those 10 models exist, buttons for I11/I12 only, rebuild < 2 s, parts < 600 |
| TYC-05 | Purchase buttons and build-up animation | TYC-04, CORE-03 | U: reject unavailable/unaffordable/not-owner; P: QA `Cash.grant 10` (cash 25), walk onto button 1 -> `owned.I01`, cash 0, build animation plays, console clean |
| TYC-06 | Income tick, bank and collector | TYC-01, TYC-04 | U: tick math with dt clamp 2 s, bank cap; P: wait 10 s -> `bank` within +-1 of `rate x 10`; walk on collector -> `cash` += bank, bank 0 |
| TYC-07 | HUD, next-purchase beam | TYC-05, TYC-06, TYC-02, CORE-08 | P: client reads cash label `25`, beam target is button 1; after purchase retargets to button 2 |
| TYC-08 | Tier gates and tiers 2-4 content (items 13-48) | TYC-05 | U: tier N+1 buttons absent until 12 owned of tier N; P: QA `Tycoon.grantItems I01..I12` -> elevator opens, tier 2 buttons exist; capture of each tier |
| TYC-09 | Upgrades (Dropper Value, Offline Cap) | TYC-06 | U: cost `floor(3000 x 1.9^L)`, max levels, effect math; P: QA `Cash.grant 3000`, buy -> rate x1.1 |
| TYC-10 | Rebirth | TYC-08, TYC-09 | U: requires 48 items, fee `floor(2.5e7 x 1.9^n)`, resets cash/bank/owned, keeps upgrades; multiplier `1.5^n`; P: QA `Tycoon.grantItems all`, `Cash.grant 3e7` -> rebirth -> `rebirths == 1`, plot rebuilt empty, income x1.5 on first item |
| TYC-11 | Offline earnings and welcome-back | TYC-06, TYC-09 | U: `reward = rate x min(elapsed, cap) x 0.15`; clock going backwards -> 0; P: QA `Offline.simulate 3600` + `Data.reload` -> popup shows the computed amount; claim once only |
| TYC-12 | Boosts and monetization multiplier cap | TYC-06 | U: pass + boost -> bonus 2 (x3 total), expired boost -> 0, extend math; P: QA `Boost.grant 1800` -> rate doubles then returns after expiry |
| TYC-13 | Supply Drops | TYC-06 | U: seeded schedule within 75-105 s, reward = 20 s of income; P: QA `Drop.spawn` -> crate on plot, claim pays once, despawns after 20 s |
| TYC-14 | Cosmetic ore, conveyor visuals and juice | TYC-06 | P: capture shows ore moving on conveyors, cash pop on collect, build-up shake/sound; client part count within budget |
| TYC-15 | Hub, leaderboards and plot visiting | TYC-10 | U: board write throttle; P: boards render the test player's rebirths; map teleport moves character near another plot |
| TYC-16 | FTUE | TYC-07, TYC-08, TYC-09 | P: fresh profile -> first purchase <= 15 s, 5 items by 65 s, arrow always points to a real target, tier 2 open by ~2 min with QA time compression |
| TYC-17 | Mobile pass and performance | TYC-14, CORE-08 | P: HUD buttons >= 56 px at 390 x 844; client `execute_luau` part count and `Stats` memory within budget with 12 simulated plots |
| TYC-18 | Shop, passes, receipts | TYC-12, CORE-04 | U: ReceiptHandler 5-case table; pack grant scales with income and clamps at `MAX_CASH`; P: fake receipt grants once |
| TYC-19 | Daily, playtime, codes, group reward | TYC-06, CORE-04 | U: streak/grace math, UTC rollover, code single-use; P: QA `Daily.setDay 3` -> claim pays 15 min of income |
| TYC-20 | Analytics and funnels | TYC-05, TYC-10, CORE-10 | P: console shows funnel steps in order for a scripted run; collector income aggregated per minute, not per tick |
| TYC-21 | Exploit-hardening pass | TYC-05, TYC-10, TYC-11, TYC-18, TYC-19 | U: `tryBuy` rejects another player's plot, unavailable and unaffordable items; collect cannot pay one bank twice; P: Client `execute_luau` fires the rebirth, reward-claim, code, skin-equip and offline-claim remotes with forged, duplicate and out-of-range input (NaN, -1, 1e9, strings, 60 calls/s) and teleports onto another plot's pads; Server `cash`, `owned`, `rebirths` unchanged and no server errors in the console |
| TYC-22 | Plot skins | TYC-18 | U: ownership/equip validation; P: equip Neon skin -> plot floor material changes, persists across `Data.reload` |

## Playtest scripts

QA commands added by this genre: `Cash.grant(n)`, `Tycoon.grantItems(idsOrAll)`, `Tycoon.buy(id)`, `Boost.grant(seconds)`, `Drop.spawn()`, `Offline.simulate(seconds)`, `Daily.setDay(n)`, `Rebirth.try()`.

1. **First purchase.** `start_stop_play(true)`, Server `QA:Invoke("Data.reset", p)`. Server returns `plot.OwnerUserId == p.UserId` and `profile.cash`. `character_navigation` (Client) to the button 1 pad (find via `search_game_tree` path `Workspace.Plots.Plot01.Buttons`). Server returns `profile.owned.I01 == true, profile.cash`; expect `true, 0`. `screen_capture` shows the new machine; console has no errors.
2. **Income and collector.** After script 1 (income now 2/s: starter 1 + item I01 1), wait 10 s; Server returns `profile.bank`, expect 20 +-2 and equal to `rate x elapsed` from `TycoonLogic.incomePerSecond(owned, ...)`; `character_navigation` onto `Collector`; Server returns `cash`, expect an increase equal to the earlier bank (+-1) and `bank == 0`.
3. **Tier and rebirth.** `QA:Invoke("Tycoon.grantItems", p, "all")`, `QA:Invoke("Cash.grant", p, 3e7)`; navigate to the altar and fire the prompt (or `Rebirth.try`); Server returns `rebirths, ownedCount, cash`; expect `1, 0, 15` (reset to `START_CASH`). Client reads the HUD income and compares to `1.5 x` the pre-rebirth first-item income. `screen_capture` of the empty rebuilt plot.
4. **Offline.** `QA:Invoke("Offline.simulate", p, 7200)`; `QA:Invoke("Data.reload", p)`; Client reads the welcome-back text; Server asserts `pendingOffline == rate x 7200 x 0.15` (rate from `incomePerSecond`), then claim and assert `cash` rose by that amount exactly once.

## Design rules

1. The player always has a next purchase affordable within 110 s and something to do while waiting.
2. Income is computed from state, never from physical parts; visuals are cosmetic and client-side.
3. Players spawn on their own plot; claiming is never a step in the tutorial.
4. Every purchase is a server call: owner, availability, cost, then spend and grant in one function.
5. Rebirth shows the permanent gain (multiplier now -> after) and what is kept before confirming, and never wipes passes, skins or upgrades.
6. Monetization bonuses are additive and capped (x3); packs scale with current income; no purchase is required to finish the main item path.
7. Plots sit within 120 studs of each other facing a shared hub; the skyline shows other players' progress.
8. Offline earnings are capped (4 h base) and slower than active play (0.15).
9. Numbers are safe: `MAX_CASH = 2^53`, formatted with suffixes, no floating display of integers.
10. Tier unlocks are visible from the start (locked silhouettes) so progression is never invisible.
11. Money moments are juiced (walk-over collection, cash pop, build-up animation); no proximity-prompt pickups for cash.
12. Anything hybrid with PvP (stealing) must be server-validated end to end and give the victim a recovery path.

## Analytics

- Onboarding funnel: 1 PlotAssigned, 2 FirstCollect, 3 FirstPurchase, 4 Item6, 5 Tier2Unlocked, 6 FirstUpgrade, 7 Tier4Unlocked, 8 FirstRebirth.
- Economy: currency `Cash` (sources: `Gameplay` SKU `Collector` aggregated per minute per player, `SupplyDrop`; `TimedReward` SKUs `Daily`, `Playtime`, `Offline`, `Code`; `IAP` SKU pack ids; sinks: `Gameplay` SKUs `Item_I01`..`Item_I48`, `Upgrade_DropperValue`, `Upgrade_OfflineCap`, `Rebirth`). Under 100 SKUs. Report the balance the mutation returned.
- Custom events: `TierUnlocked` (field1 tier), `RebirthDone` (value = rebirth count), `OfflineClaimed` (value seconds), `SupplyDropClaimed`, `PlotFull` (join failure), `BoostStarted` (field1 source).
- Purchase funnel `Shop`: OpenedShop, ViewedItem, ClickedBuy, Confirmed, Granted.
- Health: sink/source ratio per tier, median seconds between purchases (target <= 110 s), share of players who rebirth within 60 min of D1 start, offline claims per returning player.
