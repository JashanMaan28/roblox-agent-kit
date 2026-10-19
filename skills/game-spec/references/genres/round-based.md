# Round-based recipe

Loaded by `game-spec` when the pitch is a round-based party, elimination, or social-deduction game (or a hybrid with one). Numbers are starting defaults: they go into `Config` tables in the `*Logic` modules and get tuned from playtests.

Contents: Fantasy and references · Loop and pacing · Interview · Systems · Data schema · Economy and tuning · World · UI and input · FTUE · Monetization · Retention and social · Feature list skeleton · Playtest scripts · Design rules · Analytics.

## Fantasy and references

Every round is a fresh 3-minute story: nobody is safe, everyone knows the rules in 10 seconds, and the end screen makes you press "again".

- **Murder Mystery 2**: one Murderer, one Sheriff, the rest Innocents, up to 12 players, 30+ handcrafted maps, gun drops when the Sheriff dies, shooting an Innocent costs the Sheriff their life. Monetization is cosmetic knife and gun crates in rarity tiers that never touch gameplay. Take the role loop, the gun-drop hero beat, and the cosmetic-only economy.
- **Flee the Facility**: a Beast hunts survivors who hack about five computers to open exit doors; a failed hack skill check makes noise and highlights the survivor for the Beast; captured survivors can be freed. Take "mistakes reveal you" and rescue instead of dead time.
- **Natural Disaster Survival**: map plus a random disaster plus a survive timer; the simplest possible state machine. Take its round cadence and "last survivors win" clarity.
- **Hide and Seek Extreme / Epic Minigames** (format references; check current popularity before quoting): short phases, minigame rotation, kid-readable rules. Take the phase timer UI and fast rotation.
- **Forsaken / Violence District**: asymmetric rounds (nine and six players per server) with cooperative objectives and scarce stun tools. Take scarce shared tools as a cooperation driver.

## Loop and pacing

- **Core loop (3.5-4 min cycle)**: intermission 20 s with a map vote in the last 12 s, loading 4 s, countdown 5 s (roles revealed), active round, ending banner 3 s, results 8 s, cleanup 1 s, repeat.
- **Round lengths by mode**: Deduction 180 s; Survival (disasters) 15 s prep + 75 s disaster; Hide and Seek 30 s hide + 120 s seek; Beast 240 s; Minigames 45-60 s each, 5 per cycle.
- **Meta loop (per session, 20-40 min, 5-10 rounds)**: coins from rounds, open a coin crate every 7-8 rounds, equip cosmetics, climb level.
- **Long-term (days)**: collection (weapon skins by rarity), level and win streak, weekly leaderboard, event map pack, badges.
- **Targets**: join to first round under 40 s even on an empty server (practice round); intermission to active 31 s; "one more round" prompt on the results screen auto-advances.

## Interview: questions that change the build

| Question | Options | Default (auto mode) |
|---|---|---|
| Archetype | Social deduction (Murderer/Sheriff/Innocent) / Survival vs environment (disasters) / Hide and seek or Beast hunt / Minigame rotation | Social deduction first, Survival as the second mode |
| Player count | 4-12 / 2-24 / 2-6 | Min 4, max 12 (Survival min 2, max 24) |
| Secret roles | Hidden from everyone but the holder / public teams | Hidden (never replicated through Teams or attributes) |
| Trading | No trading / cosmetic trading | No trading in v1 |
| Paid randomness | Direct-buy only / earnable crates only / earnable crates + Robux crates with odds | Earnable coin crates + Robux gold crates with odds disclosure and policy branch |
| Empty-server behaviour | Practice rounds with bots / wait in lobby / matchmaking-only | Practice rounds with bots after 15 s alone |

## Systems

| System | Milestone | Server owns | Client shows | Roblox APIs | Kit skills |
|---|---|---|---|---|---|
| RoundDirector (`Round`) | M1 | State machine, timers, roster freeze, eligibility, join/leave handling | Timer, state banner | `Players`, `Player:LoadCharacterAsync`, `Players.CharacterAutoLoads`, `Workspace:GetServerTimeNow` | new-system, roblox-architecture |
| Maps (`Maps`) | M1 | Map clone, spawn distribution, bounds, cleanup | Loading screen, map name | `ServerStorage`, `CollectionService`, `Model:PivotTo`, `ContentProvider:PreloadAsync` | roblox-building, roblox-performance |
| Roles (`Roles`) | M1 | Fair assignment, role table, win checks | Own role banner only | `Random`, remotes | roblox-security, roblox-networking |
| Combat (Deduction) | M1 | Stab, throw, shoot, cooldowns, gun drop | Weapon FX, cooldown ring | `Workspace:Raycast`, `Tool`, `Humanoid` | roblox-characters, roblox-physics |
| Spectate and chat rules | M1 | Alive set, dead-chat filter | Spectator bar, camera | `TextChannel.ShouldDeliverCallback`, `Camera.CameraSubject` | roblox-camera, roblox-localization |
| Profile and rewards | M2 | Coins, XP, stats, inventory | Results screen | ProfileStore | roblox-data |
| Vote (`Vote`) | M2 | Candidate selection, ballots, tally | Vote cards, tallies | remotes | roblox-gui |
| Crates and cosmetics | M2 | Roll, odds tables, dupes, equip | Crate screen, odds panel | `PolicyService:GetPolicyInfoForPlayerAsync`, `MarketplaceService` | roblox-monetization, roblox-player-psychology |
| AFK and bots | M2 | Idle detection, practice bots | AFK tag | `Humanoid:MoveTo` | roblox-npc-ai |
| Disasters (`Survival` mode) | M3 | Disaster timeline, hazards, elimination | Warnings, VFX, safe zones | `TweenService`, `Workspace:Raycast`, `GetPartBoundsInRadius` | roblox-animation-vfx, roblox-physics |
| Retention and monetization | M4 | Daily, quests, receipts, leaderboards | Daily popup | `MarketplaceService`, `BadgeService`, `OrderedDataStore` | roblox-monetization, roblox-server-data |

Tricky parts, exact approach:

- **Round state machine (`RoundLogic`, pure).** `next(state, ctx) -> state` where `ctx = { eligibleCount, aliveCount, now, config, winner? }`. Transitions: `Waiting -> Intermission` when `eligibleCount >= MIN_PLAYERS` for 2 s stable; `Intermission -> Waiting` if eligibility drops below the minimum; `Intermission -> Loading` at 0 s; `Loading -> Countdown` when the map is ready (hard timeout 6 s); `Countdown -> Active` at 0; `Active -> Ending` on `mode.checkWin(ctx)` or timeout; `Ending -> Results -> Cleanup -> Intermission/Waiting`. The roster is frozen at `Loading`. Time uses `GetServerTimeNow` stamps so late clients render the same timer.
- **Spawning is owned by the director.** Set `Players.CharacterAutoLoads = false`; the director calls `player:LoadCharacterAsync()` on join and at `Cleanup` (lobby spawn), and teleports the roster into the map at `Countdown` with `character:PivotTo(spawnCFrame + Vector3.new(0, 4, 0))`. Dead players are not respawned until `Cleanup`; they spectate.
- **Eligibility and late joiners.** Eligible = character loaded, not AFK, not opted out (`Playing` toggle in the lobby, default on). Anyone joining after `Loading` is `Spectating` with a "Joining next round" banner. A leaver mid-round is removed from the alive set; if the Murderer leaves the round ends with an Innocent win; if the Sheriff leaves the gun drops at their last position.
- **Fair roles (`RoleLogic.assign(rng, candidates, history, slots)`, pure).** Weight per candidate for a scarce role: `w = clamp(0.25 + 0.25 * roundsSinceRole, 0.25, 2.0)` (new players start at `roundsSinceRole = 4`); hard rule: a player who held the scarce role last round gets weight 0 when the pool has at least 5 players. Sample without replacement with `rng:NextNumber()`; Murderer first, then Sheriff from the rest, everyone else Innocent. Role history is per server session.
- **Role secrecy.** Roles live only in the server's `roles[participantId]` table. Send each player their own role with `RoleAssigned:FireClient(player, role)`; never put roles in attributes, `Teams`, leaderstats, tool names, or remotes fired to all. The weapon `Tool` is created server-side and handed over at `Active`. Reveal everyone's roles only in the Results payload.
- **Combat validation (server).** Stab: `StabRequest()`, cooldown 0.8 s, range `STAB_RANGE = 7` plus lag slack `min(ping, 0.2) * 16`, target in front (dot > 0), attacker alive and holds the knife. Throw: `ThrowRequest(dir)`, `dir` must be a finite non-zero vector, normalized on the server, cooldown 5 s, projectile simulated server-side at 100 studs/s, max range 120, hit radius 2. Shoot: `ShootRequest(dir)`, Sheriff only, cooldown 2.5 s, range 300, raycast from the Sheriff's head with the Sheriff excluded; hit Murderer -> Innocents win; hit Innocent -> the Sheriff dies and the gun drops; hit nothing -> cooldown still applies. A dead Sheriff or leaver drops a `GunDrop` (prompt, 1 s hold); the first alive Innocent becomes the new Sheriff.
- **Spectate and dead chat.** `SpectatorLogic.nextTarget(aliveList, current, dir)` cycles living participants; spectators see names and alive/dead only. On `RBXGeneral`, the server sets `ShouldDeliverCallback` to withhold messages whose sender is dead from living recipients during `Active` (sender is `message.TextSource`, recipient is the `textSource` argument; return `true` to deliver). Dead-to-dead chat stays open.
- **AFK (`AfkLogic`, pure).** Sample root position every 1 s; moved under 1.5 studs for 30 s in `Waiting`/`Intermission` marks the player AFK and excludes them from the roster; 60 s in `Active` marks them AFK (a Murderer idle for 45 s aborts the round as an Innocent win with no stats); 600 s total idle kicks with `Player:Kick`.
- **Practice bots.** If fewer than `MIN_PLAYERS` are eligible for 15 s, the director fills with labeled bot Innocents (Humanoid rigs on waypoint routes, no pathfinding) up to the minimum, forces the first-time player's role per the FTUE script, and halves rewards. Bots are `Participant{ kind = "Dummy" }` entries, which is also how QA simulates a full lobby.
- **Map vote (`VoteLogic`, pure).** `pickCandidates(rng, maps, history, 3)`: filter maps by `MinPlayers <= roster <= MaxPlayers`, weight `map.Weight * (playedInLast3 and 0.25 or 1)`, sample 3 distinct. A ballot is one integer in 1..3, one per player, changeable until the window closes. Tally ties break with the seeded rng; no ballots picks by weight.
- **Disasters (Survival).** Each disaster is a pure config plus a thin runner. Flood: a translucent anchored plane rises 40 studs over 60 s; a player is eliminated when the head stays below the plane for 3 s. Meteors: 1 impact per 1.2 s, radius 10, red marker 2 s before impact, damage 100. Acid rain: every 0.5 s raycast up 80 studs from the head; no roof hit means 8 damage per second. Earthquake: parts tagged `Breakable` unanchor in sequence from 15 to 60 s. Blizzard: speed x0.6 and 6 damage per second unless within 20 studs of a `HeatSource`. Every map has at least one `SafeZone` reachable within the warning window, and maps list `AllowedDisasters`.
- **Crates (`CrateLogic`, pure).** One table per crate with integer weights summing to exactly 100,000 (0.001 % resolution). The odds panel is generated from the same table (`weight / 1000` percent), so UI and roll can never diverge. Duplicates convert to coins by rarity.

## Data schema

```luau
export type RoundProfile = {
	version: number,
	coins: number,
	xp: number,
	level: number,
	stats: {
		rounds: number,
		wins: number,
		survivals: number,
		kills: number,
		sheriffHits: number,
		winsByRole: { Murderer: number, Sheriff: number, Innocent: number },
		bestWinStreak: number,
		bestSurvivalSeconds: number,
	},
	inventory: { [string]: boolean }, -- cosmetic id -> owned
	equipped: { knife: string, gun: string, killEffect: string, trail: string },
	crates: { coinOwned: number, goldOwned: number, coinOpened: number, goldOpened: number },
	daily: { lastClaimDay: number, streak: number, quests: { { id: string, progress: number, claimed: boolean } }, questDay: number },
	settings: { playing: boolean, showHints: boolean },
	receipts: { [string]: boolean },
	tutorialDone: boolean,
}
```

Session-only: roster, roles, alive set, cooldowns, vote ballots, role history, AFK samples, bot entries, current map. Rewards are computed from session state at `Results` and committed once per round.

## Economy and tuning defaults

Formulas (`RewardLogic`): `roundCoins = min(COINS_CAP, PARTICIPATE + (survived and SURVIVE or 0) + (won and WIN or 0) + kills * KILL + pickups)`; practice rounds multiply by 0.5; `xp = 20 + (won and 30 or 0)`; `xpForLevel(l) = floor(60 * l^1.5)`; `directPrice = ceil(cratePrice / itemProbability)`.

| Key | Default |
|---|---|
| `MIN_PLAYERS` (Deduction / Survival / Hide and Seek) | 4 / 2 / 4 (QA override to 1, Studio or authorized only) |
| `INTERMISSION` / `VOTE_WINDOW` / `LOADING_MAX` / `COUNTDOWN` / `ENDING` / `RESULTS` | 20 / 12 / 6 / 5 / 3 / 8 s |
| `ACTIVE` Deduction / Survival | 180 s / 15 s prep + 75 s disaster |
| `PARTICIPATE` / `SURVIVE` / `WIN` / `KILL` | 10 / 20 / 40 / 15 coins |
| Coin pickups per round / cap per player | 40 on map / 20 |
| `COINS_CAP` per round | 120 |
| Coin crate price (earnable) | 500 coins (about 7 rounds) |
| Duplicate refund by rarity | 25 / 75 / 200 / 500 / 1,500 / 5,000 coins |
| Direct-buy cosmetic prices (coins) | Common 300, Rare 1,200, Epic 3,000 |
| Server size | 12 (Deduction), 24 (Survival) |

Crate table (both crates share rarity odds by default; disclose per crate): Common 55.000 %, Uncommon 25.000 %, Rare 12.000 %, Epic 6.000 %, Legendary 1.900 %, Mythic 0.100 % (sum 100.000). Sources: rounds, daily, quests, free tutorial crate. Sinks: coin crates, direct-buy cosmetics, trails. Coins are never sold for Robux, so coin crates are not paid-random; gold crates (Robux) are.

## World

- **Lobby**: 100 x 100 studs, bright and warm. Vote board (3 cards), spectate screen, crate kiosk, practice targets, 24 `LobbySpawn` pads, play/opt-out toggle. Safe zone (no combat).
- **Map contract** (`ServerStorage.Maps.<Name>`, folder with attributes `DisplayName`, `Weight`, `MinPlayers`, `MaxPlayers`, `AllowedModes`): `Spawns` (at least 16 parts tagged `MapSpawn`, 6+ studs apart), `Bounds` (a part tagged `MapBounds`; leaving it for 3 s or falling below its floor eliminates), `CoinSpawns` (at least 40 `CoinSpawn`), optional `SafeZone`, `Breakable`, `HeatSource`, and lighting attributes (`ClockTime`, `Ambient`, `Brightness`, optional `Atmosphere` density). Deduction map footprint 120-180 studs per side, no sightline over 120 studs, 3+ routes between any two areas, no spawn within 25 studs of another. Survival maps are vertical: 60+ studs of climbable height.
- **Launch set**: 8 maps for Deduction, 4 for Survival. Part budget 15,000 per map; collision fidelity Box on decor.
- **Lighting**: lobby `Brightness` 2, `ClockTime` 14; each map applies its lighting attributes at `Loading` and the lobby restores them at `Cleanup`.
- **Tags**: `LobbySpawn`, `MapSpawn`, `CoinSpawn`, `MapBounds`, `SafeZone`, `Breakable`, `HeatSource`, `GunDrop`, `VoteBoard`, `CrateKiosk`.

## UI and input

- **HUD**: timer and phase banner (top-center), alive count (top-right), role banner during countdown (full-width, 3 s), weapon cooldown ring above the action button, coin counter for the round, "Spectating <name>" bar with previous/next.
- **Screens**: vote cards (map thumbnail, name, live tallies), results board (winner banner, role reveal list, coin breakdown, level bar, "Next round in 8" with a skip), crate opening (odds shown before spending via an "Odds" or "Details" labeled button, never a bare icon), inventory/equip, settings.
- **Mobile**: large stab and throw buttons on the right, gun aim assist (client picks the nearest target within 10 degrees and sends a direction; the server still validates the direction and raycasts), spectator arrows 64 px. **Gamepad**: `ButtonR2` stab/shoot, `ButtonL2` throw, bumpers cycle spectate targets, selection highlight on all menus.

## FTUE

First 60 s:
1. 0-5 s: spawn in the lobby, a big "Starting soon" banner; if fewer than `MIN_PLAYERS` are present, a practice round auto-queues at 15 s.
2. 15-25 s: practice round 1; the player is the Murderer with 3 labeled bot Innocents; a single prompt "Tap to stab".
3. 25-55 s: stab 3 bots; the win banner and results (coin breakdown) appear; a free tutorial crate is granted.
4. 55-60 s: the crate opens with its odds panel and equips the item.

First 5 min: practice round 2 as Sheriff (aim assist, shoot the Murderer bot), practice round 3 as Innocent (hide and avoid the bot Murderer, with a pulsing escape route), then the first real vote and round. Practice rounds never punish: no HP loss for the player, rewards at 50 %.

## Monetization

| Item | Type | Default price (R$) | Rule |
|---|---|---|---|
| Gold Crate x1 | Developer product (paid random) | 75 | Show all outcomes and numerical odds before the purchase prompt; policy branch below |
| Gold Crate x5 | Developer product (paid random) | 325 | Same table; no guaranteed outcome, so same disclosure |
| Direct-buy weapon skin (Rare/Epic/Legendary) | Developer product (one-time unlock, owned check before prompt) | 625 / 1,250 / 3,948 (`ceil(75 / probability)`) | Always available; the non-random route |
| 2x Coins | Game pass | 249 | Coins only, never XP gates |
| VIP (chat tag, lobby lounge, +25 % coins) | Game pass | 399 | No combat or role advantage |
| Kill effect / trail pack | Game pass | 199 | Cosmetic |
| Boombox (lobby music) | Game pass | 99 | Lobby only |
| Private servers | Dashboard setting | free | Min players override 2 on private servers |

Policy notes: paid random items are any random outcome bought with Robux, directly or through currency bought with Robux; luck boosts and pity systems also count, so v1 ships neither. Before purchase show every outcome with percentages totaling exactly 100 %; use a labeled "Odds" or "Details" button for the long list. Call `PolicyService:GetPolicyInfoForPlayerAsync(player)` and, when `ArePaidRandomItemsRestricted` is true, apply a documented treatment: the free coin-crate path already satisfies "earnable path", and the direct-buy skins satisfy "guaranteed purchase of specific outcomes" with `directPrice = ceil(cratePrice / probability)` for Rare through Legendary; Mythic is milestone-earnable only for restricted users, and the Gold Crate button is hidden for them. If trading is ever added, gate paid items on `IsPaidItemTradingAllowed`. Purchases grant only through `BindReceiptHandler` or `ProcessReceipt` with `PurchaseId` stored in the same save. Maturity: stabbing and shooting are violence; implied or stylized (no blood, characters pop into parts) counts as mild and repeated mild violence yields a Mild label; any realistic blood raises it.

## Retention and social

- **Daily reward**: coins 50, 75, 100, 150, 200, 300; day 7 a free coin crate; claim on the results screen after the first round.
- **Quests**: 3 per day (win as Innocent, collect 60 coins, get 2 kills), 1 weekly (win 10 rounds); coins plus XP.
- **Leaderboards**: weekly wins (`OrderedDataStore`), friends first. Never a "most Robux spent" board.
- **Friends**: `SocialService:PromptGameInvite`; a "join friend" button; private servers for custom games.
- **Events**: weekly map pack rotation and a limited cosmetic set earnable through event quests.
- **Codes**: server-side table with expiry, one redemption per profile.
- **Badges**: First Win, Win as each role, 10 / 100 wins, Open First Crate, Survive 10 Survival rounds.

## Feature list skeleton

M0 additions (genre-specific):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RND-01 | Lobby and map contract with validator | - | Unit: `MapLogic.validateMeta` rejects missing `Spawns` (<16), `CoinSpawns` (<40), missing `Bounds`. Playtest: QA `Maps.validateAll` returns `ok` for every map in `ServerStorage.Maps`. |
| RND-02 | QA harness: min-player override, skip timers, dummy participants, force roles | - | Playtest: QA `Round.setMin 1`, `Round.addDummies 3`, `Round.skipIntermission`, `Round.forceStart` exist and return values; commands are gated by `RunService:IsStudio()` or the QA user list (unauthorized call returns nothing). |

M1 (core loop playable):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RND-03 | `RoundLogic` state machine | - | Unit: every transition in the table; `Waiting` when eligible < min; `Intermission -> Waiting` on drop; timers monotonic; unknown state rejected; input state not mutated. |
| RND-04 | RoundDirector, eligibility, join/leave, spawning | RND-02, RND-03 | Playtest: QA `Round.setMin 1`; Server `Round.state` goes Intermission, Loading, Countdown, Active; leaving player removed from the roster (QA `Round.removeParticipant`); late joiner (QA `Players.addDummyLate`) is `Spectating`. |
| RND-05 | Map manager: clone, spawns, bounds, cleanup | RND-01, RND-04 | Playtest: after Loading `workspace.CurrentMap` exists; every roster character within 3 studs of a distinct `MapSpawn`; at Cleanup `workspace:FindFirstChild("CurrentMap") == nil` and `#workspace:GetChildren()` equals its pre-round count (no leaked parts). |
| RND-06 | `RoleLogic` fair roles and secrecy | RND-03 | Unit: 2,000 seeded rounds with 8 candidates: each player's Murderer frequency within +-20 % of 1/8; no consecutive Murderer when pool >= 5; weights clamp at 0.25 and 2.0. Playtest: Client `execute_luau` shows only its own role; other roles absent from every replicated attribute, Team and leaderstat. |
| RND-07 | Deduction combat and win conditions | RND-05, RND-06 | Unit: `CombatLogic` stab range with slack, cooldowns, direction validation (NaN, zero, inf rejected), sheriff-hits-innocent rule, `checkWin` for every case. Playtest: QA `Round.setRole me Murderer`, dummies Innocent; stab a dummy via `user_mouse_input`; dummy dead; kill all and state becomes `Ending` with winner Murderer; shooting an Innocent with `Combat.shoot` kills the Sheriff and creates a `GunDrop`. |
| RND-08 | Spectator and dead-chat rule | RND-07 | Unit: `SpectatorLogic.nextTarget` wraps and skips dead. Playtest: QA `Chat.simulate` returns `delivered = false` for dead sender to living recipient during `Active`, `true` for dead to dead and for any pair outside `Active`. |
| RND-09 | Rewards and results screen | RND-07 | Unit: `RewardLogic.roundCoins` for 10 cases incl. cap and practice 0.5; Playtest: after Ending `Results` payload lists roles and coin deltas (screenshot). |

M2 (progression and meta):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RND-10 | Profile, coins, XP, level, stats | RND-09 | Unit: migration fixture; `xpForLevel` boundary loop; stats increments immutable. Playtest (`ProfileStore.Mock`): QA `Profile.grant coins 600`, save, reload shows 600. |
| RND-11 | `VoteLogic` and vote UI | RND-05 | Unit: candidates distinct, weights drop for recent maps, ties seeded, range checks 0, 4, NaN rejected. Playtest: QA `Vote.cast 2` during Intermission; the winning map loads. |
| RND-12 | Inventory and equip | RND-10 | Unit: `InventoryLogic.equip` rejects unowned and wrong slot. Playtest: grant item, equip, knife model shows the skin (screenshot). |
| RND-13 | Crates, odds panel, policy branch | RND-12 | Unit: every table sums to exactly 100,000; 100,000 seeded rolls match expected rarity within tolerance; dupes refund correctly. Playtest: odds panel text derived from the table totals 100.000 %; QA `Policy.simulate restricted` hides Gold Crate and shows direct-buy. |
| RND-14 | AFK handling and practice bots | RND-04 | Unit: `AfkLogic` thresholds 30/60 s, murderer 45 s abort. Playtest: QA `Round.setMin 4` alone for 15 s triggers a practice round with 3 labeled bots at 0.5 rewards. |
| RND-15 | Weekly leaderboard and stats | RND-10 | Playtest: a win writes once; leaderboard read returns sorted rows; budget guarded by `GetRequestBudgetForRequestType`. |

M3 (content, juice, FTUE):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RND-16 | Survival mode with disasters | RND-05, RND-09 | Unit: `DisasterLogic` timelines (flood height at t, meteor schedule with seed). Playtest: QA `Round.forceStart {mode = "Survival", disaster = "Flood"}`; standing on ground for 60 s eliminates (state Spectating); standing on `SafeZone` survives. |
| RND-17 | Coin pickups, juice, audio | RND-09 | Playtest: coin pickup increments round coins by 1 and caps at 20; kill/win VFX and SFX instances created (console log); no console errors. |
| RND-18 | FTUE practice rounds | RND-14, RND-13 | Playtest: fresh profile in an empty server reaches an active practice round within 20 s as Murderer, then Sheriff, then Innocent; `tutorialDone` true after round 3; free tutorial crate granted once. |
| RND-19 | HUD, mobile and gamepad | RND-07 | Playtest: `screen_capture` at phone viewport shows buttons inside safe area; role banner and timer readable; gamepad button stabs. |
| RND-20 | Map content pass (8 + 4 maps) | RND-01 | Unit: `Maps.validateAll` ok; part count per map under 15,000; every Survival map has a `SafeZone`. |

M4 (monetization, social, launch readiness):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RND-21 | Passes, Gold Crates, direct buys, receipts | RND-13 | Unit: `ReceiptLogic` idempotent per `PurchaseId`, NotProcessedYet on missing profile; 5-case table. Playtest: QA `Receipt.simulate gold_crate_1` twice grants one crate. |
| RND-22 | Daily, quests, badges | RND-10 | Unit: `DailyLogic` roll-over and streak; quest clamp. Playtest: QA `Daily.setDay`, claim; badge call logged on first win. |
| RND-23 | Friends, private servers, opt-out | RND-04 | Playtest: invite button checks `CanSendGameInviteAsync`; QA `Server.simulatePrivate` sets min 2 and works with 2 dummies. |
| RND-24 | Launch readiness: maturity, analytics, checklist | RND-21 | Console trace shows each analytics event below; questionnaire answered for stylized violence, paid random items handled; `roblox-publish-checklist` result recorded. |

## Playtest scripts

All QA calls go through `game.ServerStorage.QA:Invoke(cmd, player, ...)` from `execute_luau` (datamodel_type "Server"). A Studio playtest has one player, so start every script with `Round.setMin 1` and `Round.addDummies n`.

1. **Full Deduction round.** `start_stop_play`; QA `Round.setMin 1`, `Round.addDummies 3`, `Round.setRole me Murderer`, `Round.skipIntermission`; poll `Round.state` until `Active` (expect Loading, Countdown first); Client: assert role banner shown and `Role == "Murderer"` for the local player only; `character_navigation` to the nearest dummy; `user_mouse_input` click; Server: assert the dummy `Humanoid.Health == 0`; kill all three; assert `Round.state == "Ending"` then `Results`; assert coins delta equals `roundCoins`; `get_console_output`; stop play.
2. **Sheriff mistake and gun drop.** Set role Sheriff, dummies Innocent and one Murderer; QA `Combat.shoot` at an Innocent dummy; assert the Sheriff is dead (state `Spectating`) and a `GunDrop` exists; walk an Innocent dummy (QA `Combat.pickGun dummy`) and assert a new Sheriff; shoot the Murderer and assert Innocent win.
3. **Leave and late join.** During `Active`, QA `Round.removeParticipant murderer`; assert `Ending` with winner Innocent and no stats written; QA `Players.addDummyLate`; assert it is `Spectating` and enters the next roster.
4. **Survival.** QA `Round.forceStart {mode = "Survival", disaster = "Flood", map = "Towers"}`; `execute_luau` samples `FloodPlane.Position.Y` at 0, 30, 60 s (monotonic rise to +40); stand on `SafeZone` and survive; repeat on ground and assert elimination after the 3 s rule.
5. **Policy and odds.** `Crate.odds goldCrate` returns rows totaling 100000; QA `Policy.simulate restricted` then `Shop.state` shows Gold Crate hidden and direct-buy visible.

## Design rules

1. The server owns the clock, roster, roles, and every outcome; clients render.
2. Roles are secret until Results: never replicated through attributes, `Teams`, leaderstats, or shared remotes.
3. A round never starts below `MIN_PLAYERS` except in labeled practice rounds with bots at half rewards.
4. Any leaver, AFK player, or late joiner resolves deterministically: end the round, drop the gun, or spectate.
5. Role assignment uses the weighted no-repeat rule so nobody gets the scarce role twice in a row in a pool of 5 or more.
6. Dead players spectate and cannot talk to the living; the dead keep a chat among themselves.
7. Maps meet the contract (spawns, coins, bounds, safe zones) and fail `Maps.validateAll` otherwise.
8. Time from intermission start to active round stays under 35 s; results auto-advance.
9. Cosmetics never change hitboxes, speeds, or visibility; rarity affects only looks.
10. Paid random items show every outcome and numerical odds before purchase, from the same table that rolls, and respect `ArePaidRandomItemsRestricted`.
11. Disasters announce themselves for 5 s, and every map has a reachable safe zone inside the warning window.
12. Round reward totals are capped per round, and practice rounds never farm currency.

## Analytics

- `LogOnboardingFunnelStepEvent`: 1 Spawn, 2 PracticeStarted, 3 FirstStab, 4 FirstRoundEnd, 5 FirstCrateOpened, 6 FirstRealRound.
- `LogFunnelStepEvent` "RoundFlow" per round id: Queued, Voted, Active, Ended, ClickedNext (shows leaving at the results screen).
- `LogEconomyEvent` (currency `Coins`; Source: round, daily, quest; Sink: crate, shop); Robux crates logged as `IAP` with `itemSku` = crate id.
- `LogCustomEvent`: `RoundEnded` (value = seconds; fields mode, map, winner, rosterSize), `RoleAssigned` (field role), `MapVoted` (field mapId), `CrateOpened` (fields crate, rarity), `PolicyRestricted` (once per session), `AfkRemoved`, `PracticeRound`.
- `LogProgressionCompleteEvent` on each level-up, path `Level`, `level = new level`.
- Watch: rounds per session, share of rounds under 4 players, quit rate in intermission, results-screen drop-off, crate conversion by price.
