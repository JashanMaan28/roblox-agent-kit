# Simulator recipe

Loaded by `game-spec` when the pitch is a simulator (collect/sell/upgrade/rebirth, pets, farming, fishing, "+1" stat games) or a hybrid with one. Numbers are starting defaults: they go into `Config` tables in the `*Logic` modules and get tuned from playtests. M0 (bootstrap, data layer, remotes, rate limiter, QA commands incl. `Data.reset` / `Data.reload`, blockout, lighting) is common; this file only adds to it.

Contents: Fantasy and references · Loop and pacing · Interview · Systems · Data schema · Economy and tuning · World · UI and input · FTUE · Monetization · Retention and social · Feature list skeleton · Playtest scripts · Design rules · Analytics.

## Fantasy and references

Fantasy: "I get stronger and richer every few seconds, and my collection proves it": a satisfying verb, big numbers, a pet or tool collection to show off, and a visible ladder of zones.

- Pet Simulator 99 (BIG Games): break things -> coins -> eggs -> pets that boost everything -> next zone -> rebirth; thousands of pets, enchants, a Huge/Titanic chase, luck passes in the 275-800 R$ band. Take: collection depth plus a visible rarity chase carries years of retention.
- Grow a Garden: plant -> timer -> harvest -> sell, shop stock shared per server and restocked every 5 minutes (reported), mutation multipliers as variable-ratio rewards, low-attention play. Take: all four reward schedules in one loop; its player-to-player trading economy was the failure point, so v1 ships without trading.
- Steal a Brainrot: the player does the verb on first spawn; conveyor purchases feed slots that earn per second; stealing makes the base social. Take: shortest possible path to the fantasy.
- Bee Swarm Simulator (Onett): years of steady players and very high ratings; deep synergies, bosses, no aggressive monetization. Take: depth plus player trust outlives hype.
- Fish It ("no fail conditions"): cast, reel, sell, upgrade; rod enchants for depth. Take: zero-fail loops are the lowest-friction onboarding.

## Loop and pacing

- Core loop (seconds): hit a node (0.35 s cooldown) -> units fill the backpack -> walk to a sell pad -> coins -> buy Power/Capacity -> repeat. One input only: tap/click a node or hold the Gather button.
- Meta loop (minutes): hatch eggs for pets (multiplier + auto-gather), unlock the next zone (x4 unit value), upgrade, boosts.
- Long-term loop (hours/days): rebirth (permanent x(1 + 0.5 n) coins, +1 pet slot every 2nd rebirth), collection index and shinies, leaderboards, free incubator eggs, daily/playtime rewards.
- Timings: first coins within 5 s; first upgrade (Power I, 15 coins) by ~20 s; first egg (100 coins) by ~90 s with a guaranteed Rare-or-better first pet; zone 2 at ~3.5 min, zone 3 at ~6 min, zone 4 at ~10 min, zone 5 at ~19 min; first rebirth at 20-30 min; later rebirths every 10-15 min through rebirth 4, then 40+ min (perfect-play numbers from the tuning simulation; real players take up to 1.5-2x).
- Session length target 25-35 min. A returning player sees a free egg (every 4 h, stores 2) and a boost waiting.

## Interview: questions that change the build

| Question | Options | Default (auto mode) |
|---|---|---|
| Archetype | A Collect + pets (Pet Sim); B Idle farm (Garden: plots, growth timers, restocks); C Casting/fishing (Fish It); D Conveyor/steal hybrid (see tycoon recipe) | A |
| Collection | Pets; tools/weapons; bees/units; plants | Pets |
| Trading | None; escrowed trading later | None in v1 |
| Rebirth layers | One; rebirth + prestige-of-prestige | One |
| Co-op feel | Parallel solo with friend boost; shared nodes (default); team goals | Shared nodes + friend boost |
| Audience | Kids-first (no paid random, softer pity); broad | Broad with paid-random compliance path |

Archetype B swaps nodes for 12 plot slots (seed stock restocked every 5 min with a server-seeded `Random`, `readyAt = os.time() + growSeconds`, harvest value = base x size x mutation, 5% mutation chance with fixed multipliers) and adds offline growth (passive, so offline fits). Archetype C swaps nodes for cast/reel (server rolls bite time 3-8 s and the catch; rod power replaces tool power).

## Systems

| System | Milestone | Server owns | Client shows | Roblox APIs | Kit skills |
|---|---|---|---|---|---|
| Nodes and Gather | M1 | Node hits left, respawn, range/cooldown validation, units per hit | Hit particles, number pops, node break | `CollectionService`, `Players`, `os.clock` | roblox-security, roblox-networking |
| Backpack and Sell | M1 | `backpackUnits`/`backpackValue`, sell payout | Backpack bar, full warning, sell pad VFX | `BasePart.Touched` | roblox-game-design |
| Upgrades | M1 | Levels, costs, effect | Upgrade panel with x1/x10/Max | none | roblox-gui |
| Zones | M2 | Unlock state, gate teleports | Zone gates with price, locked previews | `PVInstance:PivotTo`, `Player:RequestStreamAroundAsync` | roblox-building |
| Eggs and Hatch | M2 | RNG (`Random` injected), pity counters, spend, grant | Egg pedestals, odds panel, hatch animation | `Random`, `PolicyService` | roblox-player-psychology |
| Pets | M2 | Inventory, equip (slots), fusion, auto-gather tick | Follow models, inventory grid | `StringValue` replication, `RunService.RenderStepped` | roblox-animation-vfx |
| Rebirth | M2 | Eligibility, fee, reset, multiplier | Machine, confirm panel | `ProximityPrompt` | roblox-game-design |
| Boosts | M2 | Timers (`os.time`), multiplier cap | Timer chips | none | roblox-monetization |
| Index and Quests | M3 | Collection flags, daily quests | Index book, quest list | none | roblox-growth-design |
| Hub and boards | M3 | Throttled OrderedDataStore writes, friend boost | Boards, friend boost chip | `DataStoreService:GetOrderedDataStore`, `Player:IsFriendsWithAsync` | roblox-server-data |
| Shop | M4 | Pass registry, `ProcessReceipt`, idempotent grants, paid-random gating | Offers with live prices, odds | `MarketplaceService`, `PolicyService` | roblox-monetization |
| Rewards | M4 | Daily, playtime, free-egg incubator, codes, group | Reward panel | `Player:IsInGroupAsync`, `BadgeService:AwardBadgeAsync` | roblox-growth-design |

Tricky parts:
- **Gather validation.** Remote `GatherRequest(nodeId)` (limiter 4/s, burst 6): type check, node tagged `Node` and alive, `(root.Position - node.Position).Magnitude <= GATHER_RANGE (14) + 4 slack`, per-player cooldown `>= 0.35 x 0.8` from `os.clock`, backpack not full. The server computes `unitsPerHit(profile)`; the client never sends amounts. A node has `hits = 6..10`; the last hit pays a break bonus (+50% units, 5% chance of gems). Nodes are shared: whoever hits gets paid per hit, so co-op needs no ownership rule.
- **Backpack value.** Units picked in zone z are worth `ZONE_VALUE[z]` each; the profile stores `backpackUnits` and `backpackValue`, so sell pads in every zone pay exactly what was earned. Sell: `coins = backpackValue x rebirthMult x (1 + bonus)`.
- **Auto-gather.** A 1 Hz server tick credits `AUTO_PER_POWER (0.25) x sum(equippedPetPower)` units/s while the player stands inside a zone volume and the backpack has room; it consumes no nodes (pets visibly fly to nodes on the client). Analytic, so 12 players x 8 pets cost nothing.
- **Multiplier categories (fixed).** units per hit = `(1 + powerLevel) x (1 + sum(petPower))`; coins on sell = `value x (1 + 0.5 x rebirths) x (1 + bonus)` where `bonus = 1 (2x Coins pass) + 1 (coin boost) + friendBoost <= 0.25`, capped at +2.25. No other multiplier may be added without a spec that proves the cap.
- **Hatch.** `HatchRequest(eggId, count)`: `count` in {1, 3}, 3 needs the Triple Hatch pass; the egg must be unlocked; coins >= cost x count; rate limit 2/s. `SimLogic.rollEgg(egg, luck, pity, rng)` is pure, rng injected (`Random.new()` in game, seeded in tests), returns species and new pity. Luck multiplies the weight of every non-Common tier then renormalizes. First hatch (`eggsOpened == 0`) is floored at Rare (an earnable, disclosed free path).
- **Pity.** Per egg: hard pity Legendary at 30 hatches, Mythic at 150; counters reset on a hit of that tier or better, are shown as `34/150`, and persist across sessions.
- **Pet follow replication.** The server writes equipped species ids (comma-separated) into a `StringValue` named `EquippedPets` under each `Player` (replicates to everyone, no per-pet instances). Each client builds pet models from `ReplicatedStorage.Pets` locally (anchored, `CanCollide/CanQuery/CanTouch` false), springing toward semicircle slots behind the root each `RenderStepped`. Own pets always render; other players' pets only within 80 studs and at most 30 total.
- **Rebirth.** Resets coins, backpack, Power/Capacity levels and zone unlocks; keeps pets, gems, index, shinies, pass benefits, settings. Requires zone 5 unlocked and `rebirthFee(n) = floor(2e6 x 4^n)` coins.
- **No trading in v1.** Trade, gift and "give pet" paths duplicate value across profiles; add only with an escrow ledger and atomic two-profile commit (`roblox-data`).
- **Paid-random compliance.** Under Roblox policy, Robux that buys luck (Lucky pass, Luck Boost) or buys the currency used for hatching (coin packs) makes egg hatches paid random items: every egg shows its full odds (base and boosted) before hatching; at join, `PolicyService:GetPolicyInfoForPlayerAsync(player).ArePaidRandomItemsRestricted` is cached; for restricted players the default treatment is to block those purchase prompts with a message and keep a free earnable path (playtime luck boost every 30 min). Needs explicit sign-off in non-auto mode.

## Data schema

```luau
export type PetRecord = { species: string, shiny: boolean, locked: boolean, obtainedAt: number }

export type SimProfile = {
	version: number, -- 1
	coins: number,
	gems: number,
	backpackUnits: number,
	backpackValue: number,
	upgrades: { power: number, capacity: number },
	zoneUnlocked: number, -- highest unlocked zone, 1..6
	rebirths: number,
	pets: { [string]: PetRecord }, -- key = server-generated GUID
	equipped: { string }, -- pet GUIDs, length <= slots
	eggsOpened: number,
	pity: { [string]: { legendary: number, mythic: number } }, -- key = eggId
	index: { [string]: true }, -- species discovered
	boosts: { coinsUntil: number, luckUntil: number }, -- os.time()
	incubator: { stored: number, nextAt: number }, -- free eggs, max 2
	stats: { hits: number, nodesBroken: number, coinsEarned: number },
	ownedPasses: { [string]: true }, -- cache; truth is MarketplaceService
	daily: { day: number, streak: number, lastClaimDay: number, graceUsed: boolean },
	playtime: { dayKey: number, seconds: number, claimedMask: number },
	quests: { dayKey: number, progress: { [string]: number }, claimed: { [string]: true } },
	redeemedCodes: { [string]: true },
	flags: { tutorialDone: boolean, groupRewarded: boolean, starterBought: boolean },
	settings: { music: boolean, sfx: boolean, skipHatchAnim: boolean },
	purchaseIds: { string },
	lastSeen: number,
}
```

Session-only: node hits, cooldown timestamps, zone-volume membership, friend boost cache, cached policy flags, rendered pets. Leaderboards live in OrderedDataStores (`SimRebirths_v1`, `SimPetPower_v1`, `SimCoins_v1`).

## Economy and tuning defaults

Formulas (`SimLogic`):
- `powerCost(L) = floor(15 x 1.55^L)`, `capacityCost(L) = floor(25 x 1.6^L)`; `power = 1 + L`, `capacity = 10 + 10 L`; max level 50 each.
- Zone value per unit [1, 4, 16, 64, 256, 1024]; unlock cost [0, 400, 6,000, 80,000, 1.2M, 18M]. Egg cost per zone [100, 1,500, 20,000, 260,000, 4M, 60M].
- Pet rarity weights [55, 27, 12, 5, 1] (Common..Mythic, the kit's 5-tier ladder); pet power by rarity [0.25, 0.7, 2.2, 7, 30] x zone scale [1, 3.5, 12, 45, 170, 650]; shiny x1.5 (fusion of 5 identical non-shiny, deterministic, free).
- Pet slots 3 (+1 at rebirth 1, 3, 5, ...; max 8, or 10 with the Pet Slots pass +2). Inventory 100.
- `rebirthFee(n) = floor(2e6 x 4^n)`; coin multiplier `1 + 0.5 n`.
- Gems: 5% chance on a node break (1 + zone index), daily rewards, quests; sinks: Gem Egg (150 gems, same species table with Legendary+ weights x2, odds disclosed), slot unlocks (100, 250, 500).
- Packs: coins = `SimLogic.estimateCoinsPerSecond(profile) x seconds` (10, 45, 180 min), minimum 1,000.

Tuning simulation (greedy buyer, no boosts; the spec `tests/SimEconomy.spec.luau` embeds it): zone 2 at 3.3 min, zone 3 at 6.1, zone 4 at 10.3, zone 5 at 18.7; rebirth cycles 21.5, 9.4, 12.4, 13.2, 40.6 min. Assertions: first rebirth 15-30 min, cycles 2-5 each <= 45 min, every purchase pays back within 5 min until zone 5. The pacing is a target band; adjust constants, never the assertions' intent.

| Constant | Default |
|---|---|
| `ACTION_COOLDOWN` / `GATHER_RANGE` | 0.35 s / 14 studs |
| `AUTO_PER_POWER` | 0.25 units/s |
| `NODE_HITS` / `NODE_RESPAWN` | 6-10 / 10 s |
| `PITY_LEGENDARY` / `PITY_MYTHIC` | 30 / 150 |
| `MAX_COINS` | 2^53 |
| `MAX_BONUS` | 2.25 |
| `FREE_EGG_INTERVAL` / max stored | 4 h / 2 |

Sources: sells, quests, daily/playtime, codes, packs. Sinks: Power/Capacity (primary), zone unlocks, eggs, rebirth fee, gem eggs/slots. Hoarding check: zone unlock cost / current coins-per-minute must stay under 15 min.

## World

- **Hub** (100 x 100 studs): spawn, sell pad, rebirth machine, hatchery with one egg pedestal per unlocked zone (locked ones show silhouette and price), leaderboards, shop kiosk, daily board, incubator.
- **Zones** (6, each 200 x 200 studs) as spokes around the hub, ordered Meadow, Beach, Mushroom Forest, Ice Peaks, Volcano, Cloud Kingdom; each has 40 nodes tagged `Node` (attribute `Zone`), a sell pad at the entrance, an egg pedestal, a gate (`ZoneGate`) with price billboard. Gate zones are visible from the previous zone's skyline.
- Lighting: bright cartoon, Brightness 3, ClockTime 14, Atmosphere Density 0.2, Bloom 0.35, per-zone ColorCorrection tint; avoid Future lighting on mobile. Style: chunky, saturated, SmoothPlastic, one hero color per zone; numbers in a rounded bold font with outline.
- Tags: `Node`, `SellPad`, `ZoneGate`, `ZoneVolume`, `EggPedestal`, `RebirthMachine`, `LeaderboardWall`. Budget: <= 300 parts per zone plus nodes, <= 60 node models per zone, `StreamingEnabled` on, zones as streamable models.

## UI and input

- HUD: coins (top center, large), backpack bar `37/60` (turns red with a "SELL" arrow when full), gems (top right), pet slots strip (bottom center), rebirth button when eligible, boost chips. Number pops at the node on every hit (`+12`), bigger for break.
- Input: tap/click a node, or hold the large Gather button (auto-targets the nearest node in range, repeats at the cooldown). Keyboard `E` = gather, `R` = open hatch. Gamepad `ButtonR2` = gather.
- Screens: Upgrades (x1/x10/Max), Pets (grid, equip, lock, fuse), Eggs (odds table, pity counters, Hatch x1/x3), Index, Quests, Shop, Daily, Rebirth confirm (before -> after multiplier and what is kept).
- Mobile: all buttons >= 56 px, Gather button bottom-right above the jump button, panels fit 390 x 844 safe area, hatch animation skippable after the first.

## FTUE

First 60 s:
1. 0-5 s: spawn facing a glowing node 8 studs away; no logo, no text wall; HUD shows only coins and backpack.
2. 5-12 s: gather: hit particles, `+1` pops, backpack `10/10` bar pulses green, arrow to the sell pad.
3. 12-20 s: sell: coin burst, coins 10 -> next sell reaches 15 -> Power I glows; one tap upgrades (units per hit 1 -> 2).
4. 20-60 s: two more sells; Capacity I (25) affordable; a locked egg pedestal with `100` and a pet silhouette is visible in the hub; zone 2 gate visible beyond.

First 5 min:
5. ~90 s: egg affordable: tap egg, hatch animation, guaranteed Rare-or-better pet, auto-equipped, follows the player; first `+auto` units appear.
6. ~2 min: Power/Capacity upgrades every ~15 s; shop and quests stay hidden (progressive disclosure).
7. ~3.5 min: zone 2 gate affordable (400): teleport, new color palette, node values x4.
8. ~4 min: second pet slot fills; index book opens with 3 of 9 species found.
9. ~5 min: daily reward appears (after `tutorialDone`, set at first hatch); the rebirth machine is visible, locked, labeled `Zone 5`.

## Monetization

| Item | Type | Default price (R$) | Rule |
|---|---|---|---|
| Auto Gather | Game pass | 299 | Auto-taps at the normal cooldown (same server validation) |
| Auto Hatch | Game pass | 299 | Convenience; respects odds panel |
| Triple Hatch | Game pass | 499 | `count = 3`; same odds, same pity |
| 2x Coins | Game pass | 499 | Additive bonus group (cap +2.25) |
| Pet Slots +2 | Game pass | 399 | Slots 3 -> 5 start |
| Lucky (x1.25 luck) | Game pass | 499 | Paid-random: odds disclosure + `ArePaidRandomItemsRestricted` handling |
| VIP | Game pass | 999 | Tag, VIP hub corner, exclusive non-random pet (Rare power), +10% gems; no coin power |
| Coin Pack S/M/L (10/45/180 min) | Developer product | 29 / 99 / 349 | Scales with `estimateCoinsPerSecond`; makes coin eggs paid random (odds + restricted path) |
| Coin Boost x2 30 min | Developer product | 49 | Extends `coinsUntil`; adds +1 to the bonus group |
| Luck Boost x2 15 min | Developer product | 49 | Paid-random; also earnable free every 30 min of playtime |
| Starter Bundle (one specific Rare pet, 30 min coin boost, 300 gems) | Developer product, once | 99 | Offered after 8 min and first hatch; `starterBought`; direct purchase, not random |
| Instant Incubator | Developer product | 29 | Opens stored free eggs now |

Policy: no pet or crate is sold directly as a random outcome for Robux, but coin packs and luck purchases still make hatching paid random, so odds disclosure and the restricted-player path are mandatory; Gem Eggs use earned gems only (gems are not sold, so hatching has no direct Robux price). Odds always visible; paid luck blocked for restricted users with a free earnable luck boost as the alternative. Prompt from the client, grant in the shared `ReceiptHandler`, passes through one benefit registry. Do not publicize top spenders on boards.

## Retention and social

- Daily reward (7 days): gems [10, 15, 20, 25, 30, 40], day 7 = Epic-power "Day-7 Pup" (specific pet, non-random); UTC `os.time()`; one forgiven day.
- Playtime rewards per UTC day: 5 min = Coin Boost 10 min, 10 = 50 gems, 20 = 1 free egg, 30 = Luck Boost 15 min, 45 = 100 gems.
- Free Incubator egg every 4 h (stores 2): the appointment hook, shown in the welcome-back popup with the time to next egg.
- Daily quests (3): break 100 nodes, hatch 5 eggs, sell 5 times: 20 gems each; achievements for index milestones.
- Codes (server table, expiry, 5/min limit, one use per profile); like goals are not API-verifiable, so publish milestone codes. Group reward: `IsInGroupAsync`, once: 100 gems + group pet slot skin.
- Friend boost: +5% coins per friend in the server (`IsFriendsWithAsync`, cached at join), max +25% (inside the +2.25 cap). Invite button after first rebirth (`SocialService:CanSendGameInviteAsync` then `PromptGameInvite`).
- Boards: rebirths, top pet power, lifetime coins. Badges: Welcome, First Hatch, Zone 3/5, Rebirth 1/5, Mythic Pet, Index 50%.

## Feature list skeleton

Milestones: M1 SIM-01–06 · M2 SIM-07–11 · M3 SIM-12–17 · M4 SIM-18–21, then the standard LAUNCH-01..05 from `features-schema.md`. `depends` uses the standard CORE-xx ids. Acceptance lists unit assertions (U) and playtest checks (P); `game-spec` rewrites them as Given/When/Then.

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| SIM-01 | SimLogic and Config (units, sell, upgrades, multipliers, rebirth, packs) | CORE-01 | U: `powerCost(0..2) = 15, 23, 36`, `capacityCost(0) = 25`; units per hit `(1+L)(1+sum pets)`; bonus cap 2.25; NaN/negative/inf rejected; greedy sim meets the pacing bands |
| SIM-02 | NumberFormat | CORE-01 | U: 999 -> `999`, 1_000 -> `1K`, 1.5e6 -> `1.5M`; never `inf`/`nan` |
| SIM-03 | Zone 1 nodes and Gather | SIM-01, CORE-03, CORE-06 | U: range/cooldown/alive predicates; P: walk to node, `GatherRequest` x10 -> `backpackUnits == 10`, node hits drop, respawn after 10 s; far/forged/fast requests change nothing |
| SIM-04 | Backpack and Sell | SIM-03, CORE-04 | U: full backpack blocks gather, value tagged per zone; P: sell pad pays `backpackValue` once, bar resets |
| SIM-05 | Upgrades (Power, Capacity) | SIM-04, SIM-02 | U: costs, max level, x10/Max batch math; P: QA `Coins.grant 15`, buy Power I -> units per hit 2 |
| SIM-06 | HUD and gather juice | SIM-04, SIM-05, CORE-08 | P: client reads `37/60`-style label; number pop, hit particles, sell burst play; console clean; capture |
| SIM-07 | Zones 2-6 (gates, teleports, content) | SIM-04 | U: unlock sequence and costs; P: QA `Coins.grant 400`, gate -> `zoneUnlocked == 2`, character in zone 2, streamed in |
| SIM-08 | Eggs, hatch RNG, pity, odds UI | SIM-01, SIM-07 | U: seeded `Random.new(42)` over 100k rolls within 1% of [55, 27, 12, 5, 1]; luck renormalizes to 100%; hard pity at 30/150; first hatch >= Rare; P: odds panel sums to 100% |
| SIM-09 | Pets: inventory, equip, fusion, follow, auto-gather | SIM-08 | U: equip <= slots, unknown GUID rejected, 5 identical -> shiny x1.5; P: hatched pet auto-equips, `EquippedPets` replicates, client shows follower; auto units accrue |
| SIM-10 | Rebirth | SIM-07, SIM-09 | U: requires zone 5, fee `floor(2e6 x 4^n)`, keeps pets/gems/index, multiplier `1 + 0.5 n`, slots +1 at 1, 3, 5; P: QA `Zone.set 5`, `Coins.grant 2e6`, rebirth -> `rebirths == 1`, `zoneUnlocked == 1`, pets kept |
| SIM-11 | Boosts and bonus cap | SIM-04 | U: pass + boost + friend never exceed +2.25; expiry; extend math; P: QA `Boost.grant coins 1800` doubles sell payout then reverts |
| SIM-12 | Collection index | SIM-09 | U: discovery flags, set completion; P: new species adds an index entry once; book UI shows count |
| SIM-13 | Daily quests and achievements | SIM-12 | U: day rollover resets progress; P: QA completes a quest, claim pays 20 gems once |
| SIM-14 | Hub, leaderboards, friend boost | SIM-10 | U: board write throttle; friend boost math; P: boards show the test player |
| SIM-15 | Hatch animation, VFX and audio pass | SIM-09 | P: skippable animation, rarity-scaled effects (Mythic largest), no frame stalls reported in console |
| SIM-16 | FTUE | SIM-06, SIM-08, SIM-05 | P: fresh profile -> first sell <= 20 s, upgrade <= 30 s, first hatch <= 100 s with QA time compression, pet >= Rare |
| SIM-17 | Mobile pass and performance | SIM-09 | P: HUD buttons >= 56 px at 390 x 844; other players' pet cap enforced (client count <= 30) |
| SIM-18 | Shop, passes, receipts, paid-random gating | SIM-11, SIM-08, CORE-04 | U: ReceiptHandler 5-case table; policy flag true -> luck/coin-pack prompts blocked, false -> allowed, lookup failure -> blocked; P: fake receipt grants once |
| SIM-19 | Daily, playtime, incubator, codes, group | SIM-13, CORE-04 | U: streak/grace, UTC rollover, incubator math (max 2, 4 h), code single-use; P: QA `Incubator.advance 14400` -> 1 stored egg |
| SIM-20 | Analytics and funnels | SIM-08, SIM-10, CORE-10 | P: console shows funnel steps in order for a scripted run; hits aggregated per minute |
| SIM-21 | Exploit-hardening pass | SIM-03, SIM-08, SIM-09 | P: Client `execute_luau` spams `GatherRequest`/`HatchRequest`/`EquipRequest` with bad payloads; Server counters unchanged, no errors |

## Playtest scripts

QA commands added by this genre: `Coins.grant(n)`, `Gems.grant(n)`, `Zone.set(n)`, `Pet.give(species, shiny)`, `Boost.grant(kind, seconds)`, `Egg.forceNext(rarity)`, `Incubator.advance(seconds)`, `Rebirth.try()`, `Daily.setDay(n)`.

1. **Gather, sell, upgrade.** `start_stop_play(true)`, Server `QA:Invoke("Data.reset", p)`. `character_navigation` (Client) to the first node; `user_mouse_input` on `PlayerGui.Hud.GatherButton` held for 4 s. Server returns `backpackUnits, nodeHitsLeft`; expect `10` units. Navigate to the sell pad; Server returns `coins` expect 10; `QA:Invoke("Coins.grant", p, 5)`; buy Power I via `user_mouse_input` on the upgrade button; Server returns `upgrades.power == 1`. `screen_capture` of the HUD.
2. **First hatch.** `QA:Invoke("Coins.grant", p, 100)`; navigate to the zone 1 pedestal, click Hatch; Server returns `eggsOpened == 1`, pet count 1, rarity index >= 2, coins 0, `#equipped == 1`. Client returns that the `EquippedPets` StringValue is non-empty and a follower model exists near the character. Open the odds panel: text percentages sum to 100.
3. **Rebirth.** `QA:Invoke("Zone.set", p, 5)`, `QA:Invoke("Coins.grant", p, 2e6)`, `QA:Invoke("Pet.give", p, "meadow_common", false)`; `Rebirth.try`; Server returns `rebirths, zoneUnlocked, coins, petCount, slots`; expect `1, 1, 0, 1, 4`.
4. **Exploit rejection.** From Client `execute_luau` fire `GatherRequest` with a node 200 studs away, a nonexistent id, 50 calls in one frame, and `HatchRequest` with `count = 99`, `eggId = 7`; Server returns unchanged `coins, backpackUnits, eggsOpened` and `get_console_output` has no server errors.

## Design rules

1. Rewards appear in 5 s, first upgrade by 30 s, first hatch by 90 s with a guaranteed Rare or better; the loop is one input.
2. RNG is server-side with an injected `Random`; odds, luck effect and pity counters are always visible.
3. Multiplier categories are fixed (units: power x pets; coins: rebirth x capped additive bonus); a spec proves the +2.25 cap.
4. Zone value grows x4 while unlock cost grows ~13-15x; every zone must feel strictly better than the last at its price.
5. The server owns range, cooldown, node state and payout; clients send ids, never amounts.
6. No trading, gifting or pet transfer in v1; collections change owner only through purchases or hatches.
7. Pets are client-rendered followers with caps; no per-pet server instance or physics.
8. Rebirth never deletes the collection and always previews the gain before confirming.
9. Upgrades support x1/x10/Max so late levels never mean 50 taps; each visible upgrade moves the rate by >= 5% or is batched.
10. Big numbers are clamped (`MAX_COINS = 2^53`) and formatted; no float noise on screen.
11. Paid luck or Robux-funded hatching always carries odds disclosure and the restricted-user path; a free earnable alternative exists.
12. Progression is visible from minute one: locked zones, egg silhouettes and the rebirth machine are on screen early.

## Analytics

- Onboarding funnel: 1 Spawned, 2 FirstGather, 3 FirstSell, 4 FirstUpgrade, 5 FirstHatch, 6 PetEquipped, 7 Zone2Unlocked, 8 FirstRebirth.
- Economy: currency `Coins` (sources: `Gameplay` SKU `Sell_Z1`..`Sell_Z6` aggregated per minute, `TimedReward` SKUs `Daily`/`Playtime`/`Quest`/`Code`, `IAP` SKU pack ids; sinks: `Shop` SKUs `PowerUp`, `CapacityUp`, `Egg_Z1`..`Egg_Z6`, `ZoneUnlock_Z2`..`Z6`, `Rebirth`); currency `Gems` (sources `Gameplay` `NodeBreak`, `TimedReward`; sinks `Shop` `GemEgg`, `PetSlot`). Report the returned balance.
- Custom events: `EggHatched` (value count, field1 egg id, field2 rarity), `PityReached` (field1 tier), `PetFused`, `ZoneUnlocked` (field1 zone), `RebirthDone` (value = count), `PaidRandomBlocked` (policy path), `FreeEggClaimed`.
- Purchase funnel `Shop`: OpenedShop, ViewedItem, ClickedBuy, Confirmed, Granted.
- Health: time between purchases per zone (target <= 5 min), coins hoarded vs next unlock cost, hatches per player per session, Mythic rate observed vs 1% (+ pity), share of players reaching rebirth 1 within D1.
