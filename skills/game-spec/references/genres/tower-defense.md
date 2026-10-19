# Tower defense recipe

Loaded by `game-spec` when the pitch is a tower defense (or a hybrid with one). Numbers are starting defaults: they go into `Config` tables in the `*Logic` modules and get tuned from playtests.

Contents: Fantasy and references · Loop and pacing · Interview · Systems · Data schema · Economy and tuning · World · UI and input · FTUE · Monetization · Retention and social · Feature list skeleton · Playtest scripts · Design rules · Analytics.

## Fantasy and references
Fantasy: "I assemble a squad of collectible heroes, place them on a path, and watch a screen of enemies melt." Collection and loadout theorycraft feed a 5-10 minute co-op match.
- Anime Vanguards (Kitawari): the current genre template. Gacha units, per-map stages with Infinite mode, regular content drops (unit sets, dungeons). Lesson: the meta is the collection; ship units on a cadence.
- Anime Last Stand: units are rolled with stats and traits and re-rolled at lobby stations using currencies earned in play (stat cubes from Infinite mode and the pass). Lesson: a re-roll sink keeps duplicate units valuable.
- Toilet Tower Defense: meme-faction units with constant updates. Lesson: a strong, funny, original theme beats mechanical novelty for discovery.
- Tower Defense Simulator: the classic balanced model. Lesson: readable roles (damage, support, economy, control), difficulty tiers, and skill expression in placement and upgrade timing.
- Spec note: build original characters and factions; never copy licensed IP names, art, or move names.

## Loop and pacing
- Core (per match, 6-10 min): pick map + difficulty -> place towers on zones -> wave starts -> earn cash from kills -> upgrade/place -> boss wave -> win/lose -> rewards screen.
- Meta (per session, 20-40 min): matches -> coins/gems/unit XP -> summon new units -> reshape the 5-slot loadout -> unlock harder difficulty/new map -> repeat.
- Long term (days-weeks): collection index, Infinite-mode wave leaderboards, daily quests, weekly modifier map, new units and maps every 1-2 weeks.
- Targets: first tower placed within 20 s of spawn; first win within 4 min; first summon within 5 min; first Epic+ unit within 20 min; Normal map cleared in 6-8 min at 1x speed.

## Interview: questions that change the build
| Question | Options | Default (auto mode) |
|---|---|---|
| Match structure | In-place pods (several matches per server) / lobby place + reserved-server match place | In-place pods; Teleport mode behind `MatchConfig.MODE` |
| Party size | Solo only / 1-4 co-op | 1-4 co-op (pod holds 4) |
| Unit acquisition | Summon (gacha, disclosed odds + pity) / direct unlock by play | Summon + play unlocks, with the restricted-user path below |
| Theme | Anime-style original heroes / fantasy / meme / sci-fi | Anime-style original heroes |
| Placement | Free placement in zones (2-stud snap) / fixed pads | Free placement in tagged zones |
| Lanes | Single path / branching + air lane | Single path map 1-2, branching path from map 3, air from wave 8 |

## Systems
| System | Milestone | Server owns | Client shows | Roblox APIs | Kit skills |
|---|---|---|---|---|---|
| PathLogic + MapDefs | M0+ | Path polyline per map, distance->position, zone bounds | Nothing (shared pure module) | CollectionService tags `TDPathNode`, `TDPlacementZone`, `TDBase` | roblox-architecture, new-system |
| EnemySim | M1 | Enemy records as data (id, defId, spawnTime, hp, speed segments), leak/kill, bounty | Pooled enemy models, HP bars, status icons | `RunService.Heartbeat`, `workspace:GetServerTimeNow()`, `RemoteEvent`, `UnreliableRemoteEvent` | roblox-npc-ai, roblox-networking, roblox-performance |
| WaveDirector | M1 | Wave composition, spawn schedule, intermission, ready-vote, boss waves | Wave banner, countdown, next-wave preview | `task.delay`, `Players` | roblox-game-design |
| TowerSystem | M1 (upgrade/sell M2) | Placement validation, cooldowns, targeting, damage, buffs, sell refund | Ghost, range ring, projectile/hit FX, upgrade panel | `CollectionService`, `OverlapParams`, `RaycastParams` (placement only) | roblox-security, roblox-physics |
| MatchEconomy | M1 | Cash per player, bounties, wave bonus, farm income | Cash HUD, +$ popups | `Attributes` snapshot, `RemoteEvent` | roblox-analytics |
| MatchFlow | M1 pods / M2 lobby | Pod assignment, ready check, party, result, return to lobby | Lobby pods UI, results screen | `TeleportService:ReserveServerAsync`, `TeleportAsync`, `TeleportOptions`, `Player:GetJoinData` | roblox-server-data |
| Inventory + Loadout | M2 | Unit records, 5-slot loadout, unit XP | Collection grid, loadout bar, index | ProfileStore | roblox-data |
| Summon | M2 | RNG, pity counters, currency spend, odds table | Banner UI with odds popup, reveal animation | `PolicyService:GetPolicyInfoForPlayerAsync`, `Random` | roblox-monetization, roblox-player-psychology |
| Progression | M2 | Account XP/level, map/difficulty unlocks, first-clear rewards | Level bar, unlock toasts | ProfileStore | roblox-game-design |
| ShopSystem | M4 | Pass ownership, `ProcessReceipt`/`BindReceiptHandler`, products | Shop UI, offers | `MarketplaceService` | roblox-monetization |
| Meta (Daily/Quests/Codes/Boards) | M4 | Streak, quest progress, code redemption, board writes | Daily panel, quest list, boards | `OrderedDataStore`, `MemoryStoreService` | roblox-server-data |
| Analytics + QA | M1 (QA), M4 | Event logging; QA commands | Nothing | `AnalyticsService`, ServerStorage.QA `BindableFunction` | roblox-analytics, roblox-testing |

Tricky parts, exact approach:
- **Enemies are data, not instances, on the server.** `EnemySim` keeps parallel arrays and advances nothing per frame. `EnemyMotion.distanceAt(motion, t)` (pure, in `src/shared/EnemyMotionLogic.luau`) integrates piecewise-constant speed segments `{from: number, mult: number}` from `spawnTime`. Server and client call the same function; position = `PathLogic.positionAt(path, distance)`. The server evaluates it at tower ticks (10 Hz) and on leak/kill checks.
- **Replication is event-based.** Batched `EnemyEvents` RemoteEvent every 0.1 s carrying arrays: spawn `{id, defId, spawnTime}`, speed segment `{id, from, mult}`, death `{id, killerUserId}`. Late joiners get `MatchSync` with all live enemies. A drift-correction `EnemyDrift` UnreliableRemoteEvent (buffer: u16 id + f32 distance per enemy) fires every 3 s. Client renders models from a pool (size = `ENEMY_CAP_ALIVE`), sets `CFrame` per `RenderStepped` from `distanceAt(now)`, plays walk animation via `AnimationController`+`Animator` (no `Humanoid`, CanCollide off, CanQuery off).
- **Placement ladder** (`TowerSystem.place`): rate limit -> payload types (slot index 1-5 integer, `Vector3` finite) -> slot owned in the match loadout -> cap (`PLACE_CAP` 6 per player) -> cost <= cash -> point inside a `TDPlacementZone` (OBB test via `zone.CFrame:PointToObjectSpace`) -> distance to path polyline >= `PATH_CLEARANCE` (4) -> distance to other towers >= `TOWER_SPACING` (3.5) -> deduct, create tower record, replicate. Client ghost uses the same pure `PlacementLogic.check` for instant red/green feedback; the server decision wins.
- **Targeting tick**: server iterates towers at 10 Hz; for each tower off cooldown, filter live enemies by `distance XZ <= range`, flying/ground flag, stealth vs `detects`, then pick by mode `First | Last | Strongest | Weakest | Closest`. 150 enemies x 30 towers = 4.5k checks per tick, no physics queries. Damage is instant (hitscan); the client plays a projectile with travel time cosmetically. Splash = all enemies within radius of the target position.
- **Status stacking**: slow does not stack (strongest wins, refresh duration); buffs from Commander do not stack (highest wins); armor reduces `physical` by 50% and ignores `magic`; regen enemies heal 2% max HP/s when untouched 3 s.
- **Time scale**: match speed x1/x2/x3 scales the server accumulator (`dt * speed`) and is sent in `MatchSync` so clients scale animation `AdjustSpeed`. Host-only control; x3 requires the host to own the pass.
- **Lobby/Teleport mode** (`MatchConfig.MODE = "Teleport"`): lobby server calls `TeleportService:ReserveServerAsync(matchPlaceId)` then `TeleportAsync(matchPlaceId, players, options)` with `options.ReservedServerAccessCode` and `options:SetTeleportData({mapId, difficulty})` (max 50 players per call; it yields; wrap in `pcall`). Match server reads `player:GetJoinData().TeleportData`, never trusting it blindly: validate mapId/difficulty against `MapDefs` and the player's unlocks from their own profile. Handle `TeleportService.TeleportInitFailed` with a retry-once, then return the party to the lobby UI. `ReserveServerAsync` does not work in Studio playtests, so Studio always forces `MODE = "InPlace"`; Teleport mode is verified only after publishing a test place.
- **Profile + teleports**: the match server saves rewards through ProfileStore and ends the session before teleporting back; the lobby's `StartSessionAsync` waits for the lock release (see roblox-data).
- **Summon policy**: gems that can be bought with Robux make every summon a paid random item. The banner shows each unit with its numeric odds (percentages totaling 100) behind an "Info" button, including pity rules (pity is a probability modifier). In `Summon` check `PolicyService:GetPolicyInfoForPlayerAsync(player).ArePaidRandomItemsRestricted` in a `pcall` at join (treat failure as restricted). Auto-mode treatment for restricted players: hide gem packs and Robux-purchased summon currency, keep earnable-gem summons, and show a direct-purchase "Featured Unit" shop (specific units priced at their expected cost). Ask the user before choosing a different treatment.
- **QA commands** (registered in `QACommands`, call system APIs only): `TD.startMatch(player, mapId, difficulty)`, `TD.setCash(player, n)`, `TD.place(player, defId, cframe)`, `TD.spawnWave(n)`, `TD.skipToWave(n)`, `TD.clearEnemies()`, `TD.setLives(n)`, `TD.setTimeScale(n)`, `TD.grantGems(player, n)`, `TD.grantUnit(player, defId)`, `TD.state()` (returns one summary string: wave, lives, alive, cash by player, tower count).

## Data schema
```luau
--!strict
export type UnitRecord = {
	id: string, -- HttpService:GenerateGUID(false)
	defId: string,
	level: number, -- 1..50, statMult = 1 + 0.04 * (level - 1)
	xp: number,
	trait: string?, -- rolled at acquisition, one of TraitDefs
	locked: boolean,
}
export type QuestProgress = { id: string, progress: number, claimed: boolean }
export type TDProfile = {
	version: number,
	level: number,
	xp: number,
	coins: number, -- soft; unit XP + shop sink
	gems: number, -- hard; summon currency
	units: { [string]: UnitRecord },
	loadout: { string }, -- up to 5 unit ids
	pity: { epic: number, legendary: number, mythic: number }, -- summons since last hit
	maps: { [string]: { clearedDifficulty: number, bestInfiniteWave: number } },
	stats: { matches: number, wins: number, kills: number, wavesCleared: number },
	daily: { lastClaimDay: number, streak: number, questDay: number, quests: { QuestProgress } },
	redeemedCodes: { [string]: boolean },
	receipts: { [string]: number }, -- PurchaseId -> os.time(), pruned to newest 200
	ftue: { step: number, done: boolean },
	settings: { musicVolume: number, sfxVolume: number, damageNumbers: boolean },
}
```
Session-only (never saved): match cash, tower records, enemy arrays, ready votes, pod assignment, targeting-mode overrides, current summon reveal queue. Passes are read from `UserOwnsGamePassAsync` at join and cached per player, not stored. Migrations are pure functions in `src/shared/ProfileMigrations.luau`, one per version, each unit-tested against a fixture.

## Economy and tuning defaults
Formulas (all in `src/shared/WaveLogic.luau`, `TowerLogic.luau`, `EconomyLogic.luau`):
- `hpMult(w) = 1.09^(w-1)` (wave 10 = 2.2, wave 30 = 12.2, wave 40 = 28.8). Enemy HP = `def.baseHp * hpMult(w) * difficulty.hpMult`. Boss waves (`w % 10 == 0`): one boss with `bossHpMult` 18x walker HP plus escorts.
- `count(w) = min(80, floor(6 + 1.6 * w))`; spawn gap 0.8 s (0.5 s from wave 20); alive cap `ENEMY_CAP_ALIVE = 120` (spawns queue).
- Bounty = `round(def.bounty * (1 + 0.03 * (w - 1)))`; wave clear bonus = `75 + 20 * w` cash split equally among connected players.
- Upgrade cost multiples of base cost: L1 0.8, L2 1.4, L3 2.4, L4 4.0. Damage multiples: 1.5 / 2.3 / 3.6 / 6.0. Upgrade marginal DPS-per-cash stays >= 0.55 of placement efficiency, so slots (not cash) cap power.
- Sell refund 70% of total spent. Rarity cost multiplier 1.0 / 1.2 / 1.5 / 1.9 / 2.4 (Common..Mythic); DPS per placed cash (splash counted at 3 targets) stays inside 0.04-0.10 for every damage-role definition (single, sniper, splash; support/economy/control/utility are exempt) and varies at most 25% between rarities of the same role (rarity buys range, utility, abilities; not efficiency).
- Lives: leak damage 1 (normal), 5 (elite), 20 (boss). Rewards: coins `20 + 6 * waveReached` x difficulty reward mult; gems 10 on first clear of each map-difficulty, 2 per later win.
- Unit XP: `30 + 4 * wavesCleared` per loadout unit per match; `unitXpToNext(L) = floor(60 * L^1.4)`. Account XP per match `40 + 8 * wavesCleared`; `xpToNext(L) = floor(80 * L^1.5)`.
- Summon odds (single/10-pull, 50 gems each): Common 58.5%, Rare 28%, Epic 10%, Legendary 3%, Mythic 0.5%. Pity: Epic+ guaranteed by pull 10 (counter resets on any Epic+), Legendary+ by pull 60, Mythic by pull 200. Duplicates convert to 25/60/150/400/1000 coins by rarity.

Launch roster (Common-rarity base numbers; rarity multiplies cost, trait/stat rolls add +-8%):

| Tower | Role | Cost | Damage x cooldown | Range | Notes |
|---|---|---|---|---|---|
| Scout | Single target, ground+air | 150 | 6 x 0.6 s | 16 | The FTUE unit |
| Marksman | Sniper | 350 | 38 x 1.8 s | 30 | Ground+air; +50% vs Strongest-mode target |
| Bomber | Splash r5 | 400 | 16 x 1.4 s | 20 | Ground only; hits up to 6 |
| Frost | Control | 300 | 2 x 1.0 s | 16 | 35% slow for 1.5 s, non-stacking |
| Commander | Support | 500 | none | 14 aura | +20% damage to towers in aura, highest wins |
| Farm | Economy | 250 | none | none | +$60 per wave at L0 |
| Detector | Utility | 200 | 3 x 1.0 s | 18 | `detects` stealth enemies |

Enemy roster: Walker (40 HP, 8 studs/s, bounty 10), Runner (28 HP, 12, 12), Tank (160 HP, 5, 25, armored), Flyer (50 HP, 9, 14, air), Ghost (60 HP, 8, 18, stealth), Healer (80 HP, 7, 20, regen aura), Splitter (120 HP, 7, 22, spawns 2 Walkers on death); bosses 18x Walker HP, 4 studs/s.

| Key | Easy | Normal | Hard | Nightmare |
|---|---|---|---|---|
| Waves | 20 | 30 | 40 | 50 |
| hpMult | 0.7 | 1.0 | 1.5 | 2.2 |
| Start cash / lives | 800 / 30 | 600 / 20 | 450 / 10 | 400 / 5 |
| Reward mult | 0.6 | 1.0 | 1.7 | 2.6 |
| Unlock | start | map clear Easy | clear Normal + level 10 | clear Hard + level 25 |

Sources: kills, wave bonuses, farm towers (L0 $60/wave rising 100/170/280/450), match rewards, daily/quests, codes. Sinks: placement/upgrades (match-local), summons (gems), unit leveling (coins), duplicate-trait rerolls (trait shards, coins), shop cosmetics. A `BalanceSim` spec (see TD-23) greedily spends cash on a reference loadout and asserts it clears every wave of Normal with 20-40% life margin and fails Nightmare without Epic+ units; retune `HP_GROWTH` first.

## World
- Lobby hub 220x220 studs: spawn plaza, 4 pod pads (each a ring with ready button, 4 slots), summon altar, collection kiosk, shop, daily board, leaderboards, a visible "Infinite" gate teaser. SpawnLocation at plaza center; ForceField duration 0.
- Maps (3 at launch), each a cloned `ServerStorage.TDMaps.<MapId>` placed at pod offset `(podIndex-1) * 600` studs on X. Size 220x160 studs, path length 260-340 studs (walker crosses in 33-42 s at 8 studs/s), 6-9 turns, `TDPlacementZone` parts covering 35-45% of the floor on both sides, base gate at path end. Pod cameras use a fixed top-down 55 degree angle (user-pannable within 20 studs).
- Lighting: `ClockTime` 14, `Brightness` 2.5, `Atmosphere` density 0.25, `Bloom` 0.3, `ColorCorrection` saturation +0.15. Per-map palette: meadow green/yellow, desert orange/teal, frozen ice blue; high contrast between path (light), floor (mid), zones (subtle grid decal) so mobile screens read.
- Art direction: chunky stylized heroes ~5 studs tall, enemies readable by silhouette and color (ground = warm, air = cool, boss = 2.5x scale). Avoid particle-heavy ground decals; no transparent overlap on the path.
- Tags: `TDPathNode` (attribute `Index`), `TDPlacementZone`, `TDBase`, `TDSpawn`, `TDPod` (attribute `PodIndex`), `TDEnemyVisual`, `TDTowerVisual`.

## UI and input
- HUD (top): wave `12/30`, lives with heart, cash; (bottom) 5 loadout slot cards with cost and hotkeys 1-5; (right) speed toggle x1/x2/x3, ready/skip, settings. Selecting a placed tower opens a bottom-center panel: name, level, DPS, targeting mode cycle button, upgrade (cost) and sell (refund) buttons; range ring on the world.
- Placement: tap/click slot, ghost follows pointer/finger with green/red tint; confirm by click or the on-screen Place button on mobile; right-click/X cancels. `ContextActionService`/Input Action System contexts: `Placement` at higher priority than camera.
- Mobile: UI via Scale + `UIAspectRatioConstraint`; minimum tap target 44 px; cap simultaneous projectile FX at 40 and hide damage numbers over 25 on screen; lower enemy model detail (no accessories) when `UserGameSettings.SavedQualityLevel` <= 4. Gamepad: stick moves a placement cursor, A place, X upgrade, Y sell, bumpers cycle selected tower.
- Screens: lobby, pod ready, loadout, collection index, summon (odds "Info" popup), results (waves, kills, damage per player, rewards), shop, daily.

## FTUE
First 60 s:
1. 0-5 s: spawn directly into a 3-wave Practice Field (no menus); one highlighted zone and a pulsing arrow; starting cash exactly one Scout.
2. 5-15 s: place Scout (arrow -> ghost -> tap). Wave 1 starts instantly; first kill shows `+$20` pop and a coin sound.
3. 15-35 s: cash reaches upgrade cost; the upgrade button pulses; one-line text "Upgrade!" (<= 4 words).
4. 35-60 s: wave 2 introduces a fast runner; teach targeting mode via a pulsing "First" button only if a runner leaks; wave 3 is a mini boss that cannot be lost (lives locked at 1 until it dies).
First 5 min:
5. 1:00 reward: free 10-pull summon reveal with guaranteed Epic; auto-equip to loadout.
6. 1:45 lobby: pulsing pod; map 1 Easy selected by default; party auto-fills solo.
7. 2:00-6:00 first real match Easy, 20 waves at x2 speed prompt (x2 free).
8. 6:00 results: level-up, daily quest reveal, "Next unlock: Normal" teaser.
Tutorial is mandatory but skippable after the first completion on any account; state saved in `ftue.step` so a rejoin resumes the right step.

## Monetization
| Item | Type | Default price (R$) | Rule |
|---|---|---|---|
| 2x Coins | Game pass | 299 | Multiplies match coin rewards only |
| 2x Gems | Game pass | 399 | Multiplies match gem rewards only |
| x3 Match Speed | Game pass | 349 | Host-only convenience |
| +50 Unit Storage | Game pass | 149 | Default storage 100 |
| VIP | Game pass | 499 | Chat tag, lobby aura, +10% account XP |
| Gem packs 500 / 1200 / 3500 | Dev product | 99 / 199 / 499 | Hidden for `ArePaidRandomItemsRestricted` players |
| Starter Pack | Dev product (once) | 249 | 5 summons-worth of gems, 1 Rare unit, 30-min 2x coins; stored by PurchaseId |
| Lives refill (1x per match) | Dev product | 79 | Restores 10 lives; one per match |
| Featured Unit (direct) | Dev product | 799 | Specific rotating unit, no RNG; shown to everyone, the only unit offer for restricted players |
| Coin boost 30 min | Dev product | 49 | Timer stored as server time |

Policy: every receipt through one idempotent `BindReceiptHandler`/`ProcessReceipt` path keyed by `PurchaseId` in the profile (roblox-monetization §3b). No Robux-sold match cash, tower power, or luck boosts. Summon odds disclosure and the restricted-player path are mandatory (see Systems). Do not publicize "top spender" boards.

## Retention and social
- Daily login: 7-day cycle (gems 30/40/50/60/80/100, day 7 = free 10-pull); missing a day resets to day 1 unless a streak-save dev product (R$ 49) is bought.
- Quests: 3 dailies (win 2 matches, kill 300 enemies, place 20 towers) giving 30 gems total; 1 weekly (clear a modifier map with 3 unit types) giving 200 gems and a trait shard. Quest progress is server-incremented from match results.
- Leaderboards: per-map best Infinite wave (weekly reset) and total wins; `OrderedDataStore` written at match end by the server, throttled, cached 60 s.
- Social: parties through pods; `SocialService:PromptGameInvite` button on the pod; shared damage/kill scoreboard on results; ready-vote with 15 s timeout.
- Codes: server-side table `{ [code]: {gems, expiresAt} }`, one redeem per account stored in `redeemedCodes`; launch codes `WELCOME` (100 gems).
- Content cadence: ship a new unit pair + weekly modifier every 7 days; new map every 14-21 days; event banner every 28 days.

## Feature list skeleton
M0 additions: map blockout is authored with tagged path nodes and zones (TD-01), definitions load-validated at boot (TD-02).

Milestones: M0 TD-01–02 · M1 TD-03–09 · M2 TD-10–15, TD-23 · M3 TD-16–18 · M4 TD-19–22.

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| TD-01 | PathLogic + map blockout (nodes, zones, base) | - | Spec: `length` equals sum of segments; `positionAt(path, 0)` is first node, `positionAt(path, length+10)` clamps to last; `distanceToPath` of a point on the path is 0, of a point 10 studs off is 10 (+-0.01). Playtest: `execute_luau` Server returns node count == `#CollectionService:GetTagged("TDPathNode")` and >= 6; screen_capture of top-down map shows path/zones contrast |
| TD-02 | Definitions: EnemyDefs, TowerDefs, MapDefs, Config | TD-01 | Spec iterates every def: required fields present, `dpsPerCost` in 0.04-0.10 for damage-role defs (see Economy), cost/rarity multipliers monotone, enemy speed > 0, boss waves defined; failure names the offending id |
| TD-03 | EnemyMotion + EnemySim server | TD-01, TD-02 | Spec: `distanceAt` with a 50% slow from t=2 to t=4 equals analytic value (+-1e-6); two slows keep the strongest; enemy at distance >= length is reported leaked exactly once. Playtest: `TD.spawnWave(1)`, after 5 s `TD.state()` shows alive > 0 and no console errors |
| TD-04 | Client enemy renderer (pool, interpolation, HP bars) | TD-03 | Playtest: Client `execute_luau` counts models tagged `TDEnemyVisual` == server alive count (+-1); screen_capture shows enemies on the path; after 120 enemies pool size stays <= `ENEMY_CAP_ALIVE`; no `Humanoid` descendants |
| TD-05 | Tower placement + match cash | TD-02, TD-03 | Spec: `PlacementLogic.check` rejects off-zone, on-path (< 4 studs), overlapping (< 3.5), over cap, insufficient cash, NaN/inf position; accepts valid. Playtest: `TD.setCash(player, 150)`, place Scout via remote at valid and invalid points; Server shows 1 tower, cash 0, invalid placements return no state change |
| TD-06 | Targeting + attacks (single, splash, slow, buff) | TD-03, TD-05 | Spec: all 5 modes pick the expected enemy from a fixture; splash radius includes/excludes boundary enemy; flying ignored by ground-only; stealth ignored without `detects`. Playtest: wave 1 with 4 Scouts kills all 7 enemies, lives unchanged |
| TD-07 | WaveDirector (composition, intermission, boss, ready-skip) | TD-03 | Spec: `count`, `hpMult` at w=1,10,30,40 match table values; boss on every 10th wave; alive cap respected by spawn queue. Playtest: `TD.skipToWave(10)` spawns boss with hp == baseHp*bossMult*hpMult(10) (+-1) |
| TD-08 | Match state machine and results (win/lose, lives, rewards) | TD-07 | Spec: `EconomyLogic.rewards` for each difficulty/wave matches the table; rewards never negative, capped on Infinite. Playtest: `TD.setLives(1)` then let one enemy leak -> state `Defeat`, results event fired to client, profile mocks received coins |
| TD-09 | Match HUD + placement UX (desktop, mobile layout) | TD-05, TD-06 | Playtest: click slot 1, ghost visible, red over path / green over zone (screen_capture each), click places; HUD shows wave/lives/cash matching Server values; `UIAspectRatioConstraint` present on root frame |
| TD-10 | Upgrade, sell, targeting mode | TD-06 | Spec: upgrade cost/damage tables per level; cannot upgrade past L4 or without cash; sell refund = floor(0.7 * spent). Playtest: upgrade a Scout 4 times via remotes, Server DPS == 6.0 x base; sell returns expected cash |
| TD-11 | Profile, units, loadout, migrations | TD-02 | Spec: new profile equals template; v1->vN migrations preserve units; loadout validation rejects ids not owned, duplicates, >5. Playtest: `TD.grantUnit`, rejoin, unit persists (ProfileStore mock in Studio) |
| TD-12 | Lobby pods, ready check, party, Teleport mode | TD-08, TD-11 | Playtest (InPlace): two QA players join pod 1, ready, match starts at offset `0*600`, pod 2 starts independently; Studio forces `MODE=InPlace`. Teleport mode: code review of TeleportOptions + validation of join data; spec rejects unknown mapId/locked difficulty |
| TD-13 | Summon with odds, pity, policy path | TD-11 | Spec: with `Random.new(42)` 10k pulls land within 1.5 pts of table; Epic+ guaranteed by pull 10, Legendary+ by 60, Mythic by 200; odds sum to 100. Playtest: `TD.grantGems`, pull 10, Server gems -500, 10 units added, console clean; restricted flag hides gem packs |
| TD-14 | Account XP, level, map/difficulty unlocks | TD-08, TD-11 | Spec: `xpToNext` boundaries (property loop 1-50); unlocks gated by clear + level. Playtest: win Easy via `TD.skipToWave`, Normal unlocks and toast shown |
| TD-15 | Infinite mode + enemy traits (armor, regen, flying, stealth) | TD-07, TD-06 | Spec: wave 41+ uses the same formulas, no overflow at wave 200 (finite numbers); armor halves physical only. Playtest: `TD.skipToWave(45)` runs 30 s without errors; best wave saved |
| TD-16 | Content pass: 3 maps, 12 towers, 15 enemies, 3 bosses | TD-02, TD-15, TD-23 | Spec content checks pass for all defs; BalanceSim (TD-23) green; playtest each map once: path length 260-340, no tower can be placed on path |
| TD-17 | Juice and audio (hits, kills, upgrades, wave banners, boss intro) | TD-09 | Playtest: kill sound + FX trigger (console log of FX events count > 0); camera shake respects `GuiService.ReducedMotionEnabled`; screen_capture of boss intro |
| TD-18 | FTUE (Practice Field, guided beats, resume) | TD-10, TD-13 | Playtest: fresh profile completes step 1-4 by scripted placements in < 75 s; `ftue.step` persists after leave/rejoin mid-tutorial; skip allowed after done |
| TD-19 | Daily rewards, quests, codes | TD-14 | Spec: streak math at day boundaries (UTC), missed day reset, code single-use. Playtest: QA fast-forward day, claim gives expected gems exactly once |
| TD-20 | Leaderboards (infinite wave, wins) | TD-15 | Playtest: finish run, board entry readable via `execute_luau` Server; throttled to <= 1 write per player per match |
| TD-21 | Monetization: passes, products, receipts, starter pack | TD-13, TD-14 | Spec on receipt handler with the 5-case table (duplicate, absent player, save fail, unknown product, grant ok) from roblox-monetization; Studio: pass benefit applied via `PromptGamePassPurchaseFinished`-independent ownership path |
| TD-22 | Analytics, perf pass, publish checklist | TD-21 | Spec: event payload builders pure and under field limits; playtest with 120 enemies + 24 towers keeps server heartbeat < 8 ms (MicroProfiler label via `debug.profilebegin`); mobile emulation screenshot has no overlapping HUD |
| TD-23 | BalanceSim spec | TD-07, TD-10 | Spec simulates greedy spending on reference loadouts (launch roster; re-run after every content change): clears Normal with 20-40% life margin, Nightmare fails with Common-only, DPS/cost band holds |

## Playtest scripts
1. **Core loop** - `start_stop_play` true; `execute_luau` Server `return game.ServerStorage.QA:Invoke("TD.startMatch", Players:GetPlayers()[1], "Meadow", "Normal")`; `TD.setCash` 600; `character_navigation`/`user_mouse_input` to click slot 1 then a zone (or QA `TD.place` for determinism); `TD.spawnWave(1)`; wait 25 s; Server `return game.ServerStorage.QA:Invoke("TD.state")` expecting `alive=0 lives=20 towers>=1`; `get_console_output` has no errors; `screen_capture`.
2. **Loss and result** - `TD.setLives(1)`, `TD.spawnWave(3)` with no towers; assert Server state `Defeat`, Client `execute_luau` reads the results ScreenGui `Enabled == true`; stop play.
3. **Stress** - `TD.setTimeScale(3)`, `TD.skipToWave(25)`, spawn with `TD.place` 24 towers; Client counts `TDEnemyVisual` <= 120 and average frame time from `RunService.RenderStepped` sampling (1 s) under 25 ms; `get_console_output` clean.
4. **Summon** - `TD.grantGems(player, 500)`; fire the summon request through the client controller via `execute_luau` Client; assert Server unit count +10, gems 0, pity counters updated; open odds popup and `screen_capture` to confirm percentages visible and totaling 100.

## Design rules
1. Every tower role must be readable at 40 px: distinct silhouette and a one-icon role badge (damage, splash, slow, support, economy, detector).
2. A wave preview (enemy icons + counts + traits) is visible during intermission so every loss is the player's fault.
3. Placement feedback is instant and explains rejection (red tint + reason text) without a modal.
4. Within a role, a higher rarity never exceeds a 25% DPS-per-cash advantage over Common; rarity unlocks utility, range, abilities.
5. Matches never exceed 12 min at x1 for Normal; Infinite shows a "run ends after 40 min" hard cap to protect servers.
6. The server never trusts the client for cost, slot, targeting mode, or position; client ghost is advisory.
7. Late joiners receive a full `MatchSync` (waves, towers, enemies, cash) and the first frame renders correctly.
8. Every gem source has a matching sink and a weekly gem income estimate in the economy sheet (target 600-900 gems/week free).
9. Boss waves are the only unavoidable difficulty spikes; others scale smoothly (<= 12% HP step per wave).
10. Mobile first: all match actions possible with one thumb, no hover-only UI, UI hidden behind thumbs on the bottom corners is non-critical.
11. A disconnected player's towers persist 60 s then convert to refund-to-pool; no match is lost to one player leaving.
12. Summon odds are visible in one tap and match the actual table (spec compares UI strings to `SummonLogic.Config`).

## Analytics
- Onboarding funnel (`LogOnboardingFunnelStepEvent`): 1 Spawn, 2 FirstPlace, 3 FirstKill, 4 FirstUpgrade, 5 Wave3Clear, 6 FirstSummon, 7 FirstRealMatch, 8 FirstWin.
- Match: `LogProgressionStartEvent/Complete/Fail` with path `MapId`, level = difficulty index, name = wave reached; custom event `MatchEnd` value = duration, fields: map, difficulty, party size.
- Economy: currencies `Coins`, `Gems` only (two of five). Sources `Gameplay` (match, daily), `IAP`, `TimedReward`; sinks `Shop` (summon, leveling). SKU examples `Summon10`, `UnitLevel`, `GemPack500`.
- Custom: `TowerPlaced` (field 1 = defId, field 2 = wave bucket), `TowerSold`, `WaveLeak` (field 1 = enemy def), `SummonPull` (field 1 = rarity, field 2 = banner), `PityHit`, `LivesRefillUsed`, `ReadySkipUsed`.
- Segmenting: `GetPlayerSegmentsAsync` to show extra FTUE hints for new users only. Events are server-only and not sent from Studio; validate payload builders by spec and event delivery on a published test place.
