# Horror recipe

Loaded by `game-spec` when the pitch is a co-op horror / escape game (or a hybrid with one). Numbers are starting defaults: they go into `Config` tables in the `*Logic` modules and get tuned from playtests.

Contents: Fantasy and references · Loop and pacing · Interview · Systems · Data schema · Economy and tuning · World · UI and input · FTUE · Monetization · Retention and social · Feature list skeleton · Playtest scripts · Design rules · Analytics.

## Fantasy and references

Two to four friends push through a place that wants them dead: read the room, learn each monster's tell, hide at the right second, share light and loot, and survive "one more run".

- **Doors**: a linear run of procedurally chained room prefabs, lethal entities that always announce themselves (light flicker, sound), a counter that always works (hide, look away), item-driven puzzles, audio-led tension. Build the room chain and the tell/counter contract exactly this way.
- **Pressure**: a generated facility run with loot containers, dark rooms that need a light source, and rare-variant entities. Lesson: loot containers + light management make exploration a decision.
- **99 Nights in the Forest / 3008**: day-explore, night-defend survival loops with a shared base object (campfire). Lesson: a shared resource clock gives a co-op team a reason to split and regroup.
- **Forsaken / Violence District**: round-based asymmetric chase (survivors do objectives while one killer hunts; scarce stun tools force cooperation). Lesson: visible chaser + objectives + short rounds.
- **Animal Hospital (Anomaly)**: 4-player night-shift observation horror. Lesson: spot-the-change content is cheap to author and low-fear, so it fits a Mild label.
- **Piggy / The Mimic**: chapter maps with a learnable chaser and key/lock objectives; story chapters are expensive per hour of content, so ship fewer and replay them with modifiers.

## Loop and pacing

- **Core loop (20-40 s per room)**: enter room, scan hazards and hide spots, search containers (batteries, keys, revive tokens, coins), solve the exit lock, open the next door. An entity encounter lands every 3-6 rooms: tell (2.5-5 s), counter (hide / look away / run), aftermath (loot, breather).
- **Run (18-22 min)**: 50 rooms in 3 tiers (1-20, 21-40, 41-50 + final chase). Safe room (shop, checkpoint, revive vending) at room 25. Failure ends the run with partial rewards.
- **Meta loop (per session, 2-3 runs)**: results screen, Coins and XP, buy a flashlight upgrade or consumable, pick a loadout, re-board the elevator.
- **Long-term (days)**: rank unlocks (new items, floors, entity bestiary), cosmetic collection, weekly modifier (e.g. "lights out"), best-room leaderboard, badges.
- **Targets**: join to first room under 25 s; first entity tell under 70 s; first run complete (tutorial run, 12 rooms) at about 4 min; first shop purchase at about 5 min; elevator fill timer 30 s (10 s when the party is full).

## Interview: questions that change the build

| Question | Options | Default (auto mode) |
|---|---|---|
| Structure | Linear procedural room run (Doors/Pressure) / fixed escape map + chaser (Piggy) / asymmetric killer vs survivors | Linear procedural room run |
| Fear ceiling (sets maturity label and art) | Mild: stylized entities, jump scares, no realistic blood / Moderate: disfigured or realistic gore | Mild (stylized, no gore, Kids/Select-eligible) |
| Party | Solo-viable 1-4 / duo-4 only / 6-8 | Solo-viable, `MaxPlayers` 4 |
| Darkness model | Flashlight battery only / battery + sanity meter / lantern oil + sanity | Flashlight battery only; sanity is a flag (`Config.SANITY_ENABLED = false`) |
| Death model | Downed + revive + spectate / permadeath until run ends / checkpoint respawn | Downed + revive + spectate |
| Session shape | One run per server, in-place lobby / lobby place + `TeleportService` reserved servers | One run per server, in-place (Studio cannot playtest teleports) |

## Systems

| System | Milestone | Server owns | Client shows | Roblox APIs | Kit skills |
|---|---|---|---|---|---|
| RunDirector (`Run`) | M1 | Run state machine Lobby / Boarding / Running / Results, seed, room index, party roster, reconnect window | Room counter, results, elevator ready-up | `Players`, `Workspace:GetServerTimeNow`, `Players.CharacterAutoLoads`, `Player:LoadCharacterAsync` | new-system, roblox-architecture |
| Rooms (`Rooms`) | M1 | Seeded room chain, prefab placement, cleanup behind the party | Rooms as replicated models | `Model:PivotTo`, `GetPartBoundsInBox`, `CollectionService`, `Random` | roblox-building, roblox-performance |
| Doors | M1 | Door state, key/lock/puzzle state, open validation | Prompts, door animation | `ProximityPrompt`, `TweenService` | roblox-networking, roblox-security |
| Hiding | M1 | Hide-spot occupancy, hidden flag, exit rules | Hide camera, prompt, hidden vignette | `ProximityPrompt`, character attributes | roblox-characters |
| Entities (`EntityDirector`) | M1-M2 | Spawn schedule, entity timelines, kill checks, stalker AI | Entity visuals, tell VFX/SFX | `PathfindingService`, `Workspace:Raycast`, `GetServerTimeNow` | roblox-npc-ai, roblox-animation-vfx |
| Vitals | M1 | HP, downed timer, revive, spectate target list | HP bar, downed UI, spectate camera | `Humanoid`, `Humanoid:TakeDamage`, `Player:LoadCharacterAsync` | roblox-characters, roblox-camera |
| Items and loot | M1 | Containers, drops, inventory (4 slots), battery, usage | Hotbar, container UI, item viewmodels | `Tool`/custom inventory, `ProximityPrompt` | roblox-characters, roblox-gui |
| Light and sanity | M2 | Battery drain, dark-room flag, sanity value | Flashlight beam, vignette, hallucinations (cosmetic) | `SpotLight`, `PointLight`, attributes | roblox-lighting |
| Profile and progression | M2 | Coins, XP, rank, unlocks, shop purchases | Shop, results, rank-up | ProfileStore, `AnalyticsService` | roblox-data, roblox-monetization |
| Party and lobby | M2 | Elevator slots, ready-up, fill timer, scaling | Elevator UI, party list | `SocialService:PromptGameInvite` | roblox-gui |
| Audio director | M3 | Tell triggers (server time stamps) | Ambient beds, spatial tells, heartbeat | `AudioPlayer`, `AudioEmitter`, `Wire`, `SoundService` | roblox-audio |
| Retention and monetization | M4 | Daily, quests, receipts, leaderboard, badges | Daily popup, quest list | `MarketplaceService`, `BadgeService`, `OrderedDataStore` | roblox-monetization, roblox-server-data |

Tricky parts, exact approach:

- **Seeded room chain.** The server picks `seed = Random.new():NextInteger(1, 2^31-1)` per run and builds all choices from `Random.new(seed)`, so a run is reproducible in tests. `RoomLogic.pickNext(rng, pool, history, state)` is pure: filter by `MinRoom <= index <= MaxRoom` and tier, drop any prefab used in the last 3 rooms, drop a turn if the last 2 rooms turned the same way, weight by prefab `Weight` attribute. Prefabs are Models tagged `RoomPrefab` with attributes `Weight`, `MinRoom`, `MaxRoom`, `Tier`, and two child Parts named `Entry` and `Exit` (their CFrames define the join). Place with `PivotTo` so `Entry` coincides with the previous `Exit`. Before committing, `workspace:GetPartBoundsInBox` on the footprint (excluding the previous room) must return nothing; reroll up to 5 times, then fall back to the straight `Hall_Straight` prefab.
- **Lazy generation.** Generate room N+1 when any player opens door N; keep at most 4 rooms alive; destroy room N-2 when door N+1 opens; doors lock behind the party (one-way). Keep `StreamingEnabled` off (small live set); if on, set `ModelStreamingMode = Atomic` on room models.
- **Tell and counter contract (fairness).** Every lethal entity has `tellSeconds >= 2.5` of audio plus light flicker before it can reach any player, and a counter that always works when executed. Every room prefab must have a `HideSpot` within 25 studs walking distance of `Entry` and of `Exit`; `RoomLogic.validatePrefabMeta` and the QA command `Rooms.validateAll` enforce it.
- **Deterministic entity motion.** Rush-type entities follow a polyline (`EntityWaypoint` parts, ordered by attribute `Order`, assembled across the next 3 rooms). `EntityLogic.positionAt(polyline, speed, t)` is pure. The server sends `EntitySpawn(id, kind, polyline, speed, serverStartTime)`; clients render with `workspace:GetServerTimeNow()`; the server checks kills every 0.1 s using the same function (hit radius 5 studs, skipped for hidden players). No per-frame replication of entity position.
- **Hiding.** A `ProximityPrompt` on a `HideSpot` fires `Triggered`; the prompt does not guarantee range, so the server re-checks `(root.Position - spot.Position).Magnitude <= 10`, capacity, player state, then anchors the root part inside the spot and sets attribute `Hidden = true`. Exit needs a request and a 0.5 s cooldown. Hidden state is evaluated at the instant the entity's path reaches the player's position, so hiding after the tell begins is the intended counter; a hidden player is skipped by kill checks.
- **Downed, not dead.** HP 0 sets `Downed` for 30 s (bleed-out). Teammates hold a prompt 4 s to revive (back at 40 HP, 3 s of invulnerability). Solo: a Revive Token self-revives. All members downed or dead ends the run. Dead players spectate living teammates (`SpectatorLogic.nextTarget`).
- **Stalker AI.** `PathfindingService:CreatePath({AgentRadius = 2.5, AgentHeight = 6, AgentCanJump = false})`, recompute at most every 0.5 s and cache until the target moves 8 studs; doors get a `PathfindingModifier` with `PassThrough = true`; `ComputeAsync` in `pcall`; stagger entities across frames. Stalker only chases a target it detected by distance (60 studs) then cone (110 degrees) then raycast.
- **Light.** Flashlight is a server-owned toggle (`Lit` attribute); battery drains 1.0 %/s lit, picked-up batteries restore 35 %. Dark rooms (`DarkRoom` tag) lower ambient; the Lighter item (oil 90 s) always works. Sanity (when enabled): -1.0/s in darkness, +2.0/s lit, +1.0/s near an ally; below 40 spawns client-only decoy silhouettes that cannot hurt; sanity never kills.
- **Reconnect.** A leaver's loadout and room index stay in `session.members[userId]` for 90 s; rejoin inside the window respawns them in the current room as Downed-free. Late joiners spectate until Results.
- **Scale by party.** `partyScale = {0.8, 0.9, 1.0, 1.1}` multiplies the encounter budget, never entity speed.

## Data schema

```luau
export type HorrorProfile = {
	version: number,
	coins: number,
	xp: number,
	rank: number,
	stats: {
		runsStarted: number,
		runsCompleted: number,
		bestRoom: number,
		roomsTotal: number,
		revives: number,
		downs: number,
		encounters: { [string]: number }, -- entity kind -> survived count
	},
	unlocked: {
		items: { [string]: boolean },
		cosmetics: { [string]: boolean },
		floors: { [string]: boolean },
		bestiary: { [string]: boolean },
	},
	loadout: { slots: { string }, cosmetic: string? }, -- up to 3 starting items
	consumables: { reviveTokens: number, spareBatteries: number },
	daily: { lastClaimDay: number, streak: number, quests: { { id: string, progress: number, claimed: boolean } }, questDay: number },
	settings: { brightness: number, reduceJumpScares: boolean, subtitles: boolean },
	receipts: { [string]: boolean }, -- PurchaseId -> granted (prune oldest beyond 200)
	tutorialDone: boolean,
}
```

Session-only: `RunSession` (seed, room index, members, entity timelines, containers), in-run inventory (4 slots), HP, battery, sanity, downed timers, hidden flag. Run results are computed from session state and committed to the profile once, at Results.

## Economy and tuning defaults

Formulas (all in `ProgressionLogic`): `runCoins = floor(roomsCleared * COIN_PER_ROOM * partyBonus) + (completed and COMPLETION_BONUS or 0) + pickedGold + (firstRunEver and FIRST_RUN_BONUS or 0)`; `partyBonus = 1 + 0.1 * (partySize - 1)`; `xpForRank(r) = floor(100 * r^1.5)`; `runXp = roomsCleared * 10 + (completed and 200 or 0)`; `upgradeCost(tier) = round(200 * 2.2^(tier - 1))` (200, 440, 968, 2130).

| Key | Default |
|---|---|
| `COIN_PER_ROOM` | 4 |
| `COMPLETION_BONUS` | 150 |
| `FIRST_RUN_BONUS` | 100 |
| Gold pickup (in-run, converts 1:1 to Coins) | 1-5, about 6 per run average |
| Lighter price / Revive Token price | 120 / 150 Coins |
| Flashlight battery upgrade tiers | +25 % capacity each, max tier 4 |
| Max Revive Tokens carried / purchasable per run | 3 / 2 |
| Encounter budget per room | `4 + roomIndex * 0.35` (entity cost 3-9) |
| Min rooms between encounters | 2 |
| Player HP / downed timer / revive hold | 100 / 30 s / 4 s |
| Rusher speed / damage | 110 studs/s / lethal (down) if not hidden |
| Screecher damage / Stalker damage + i-frames | 25 / 34, 1.2 s |
| Jump scare cap | 1 per 3 min, none in first 90 s |

Sources: runs, daily reward, quests. Sinks: shop items and upgrades, cosmetics, Revive Tokens. Keep a 2-run (about 45 min) horizon to the first meaningful upgrade.

## World

- **Lobby**: 70 x 70 studs hub with an elevator (4 slots), shop kiosk, bestiary wall, practice hide spot. Safe zone, warm light.
- **Rooms**: footprints up to 60 x 40 studs, ceilings 14-18, halls 12-16 wide, doors 6 x 10, hide spots interior 4 x 7 x 3 studs. 12 prefabs at M1-M3 blockout, 24 at M3 content. Mixed corridor, lounge, library-style rooms, dark rooms (10 % of rooms), puzzle rooms (lever, key, code) at least every 8 rooms.
- **Lighting defaults** (mobile-readable, based on the kit's horror preset): `ClockTime` 22, `Brightness` 0.3, `Ambient` (26, 26, 34), `OutdoorAmbient` (10, 10, 16), `GlobalShadows` true, `ShadowSoftness` 0.1, `Atmosphere` Density 0.35 Color (14, 14, 18), `ColorCorrection` Saturation -0.25 Contrast 0.15, no Bloom. Each room has 2-3 warm `PointLight`s (Range 20, Brightness 1.2, color 255,190,120), at most 6 shadow-casting lights in view. Dark rooms drop `Ambient` to (14, 14, 20). Never go darker than the Ambient floor; the settings screen has a brightness slider (client `ExposureCompensation` -1..+1).
- **Art**: stylized low-poly, desaturated palette with one accent color per tier; entities are readable silhouettes with an emissive tell color (red for lethal, amber for warning).
- **Tags**: `RoomPrefab`, `HideSpot`, `Lootable`, `DoorExit`, `KeyLock`, `DarkRoom`, `EntityWaypoint`, `FlickerLight`, `ElevatorSlot`, `Checkpoint`. Attributes on instances, not name parsing.

## UI and input

- **HUD**: HP bar and downed ring (bottom-left), hotbar of 4 slots (bottom-center), battery % beside the flashlight slot, room counter "Room 23 / 50" (top-center), objective line, party list with name and state icons (top-left), interaction prompt (center). No minimap.
- **Screens**: elevator ready-up, results (rooms, coins, XP bar, items found), shop, bestiary, settings (brightness, reduce jump scares, subtitles with visual direction cues such as "Rush from the left").
- **Mobile**: prompts as large touch buttons, hide button 80 x 80 px bottom-right, jump button kept, flashlight toggle button, UI via Scale + `UIAspectRatioConstraint`. **Gamepad**: prompt default `ButtonX`, hotbar on D-pad, selection highlight on every menu.

## FTUE

First 60 s:
1. 0-5 s: spawn already inside the moving elevator, no menu; the Room 1 door opens.
2. 5-20 s: Room 1 is a lit corridor with one flashlight pickup (auto-equips, glowing); no text beyond a 5-word prompt "Hold E to pick up".
3. 20-45 s: Room 2-3: a locked door with a key on a visible table; an arrow-less glow guides to it.
4. 45-70 s: lights flicker and the tutorial Rusher telegraphs for 6 s while an outlined closet sits 8 studs away; hide prompt appears; the pass is guaranteed survivable (tutorial damage ignored).

First 5 min: the tutorial run is 12 rooms and finishes at about 4 min; results grant 148 Coins (12 x 4 + 100 first-run bonus; tutorial runs skip `COMPLETION_BONUS`); the shop opens on the Lighter (120 Coins) and "buy" is the only highlighted button; then the elevator opens to a real run with the same party or solo. Zero-death first session: tutorial entities down but never end the run.

## Monetization

| Item | Type | Default price (R$) | Rule |
|---|---|---|---|
| Revive Token x1 | Developer product | 25 | Consumable; cap 2 purchased uses per run; usable from room 5 |
| Revive Token x5 | Developer product | 99 | Same cap |
| Starter Pack (Lighter, 3 Revive Tokens, 500 Coins) | Developer product, one-time via profile flag | 99 | Offered after the first run only |
| 2x Coins | Game pass | 199 | Applies to run coins only; never to XP-gated unlocks |
| Coin packs 500 / 1,500 / 5,000 | Developer products | 49 / 99 / 249 | Grant through receipt handler, add `LogEconomyEvent` |
| Flashlight skin / elevator skin / entity-kill trail | Developer product or pass | 75-399 | Cosmetic only |
| VIP (chat tag, double daily reward, extra loadout slot) | Game pass | 399 | No survival advantage |
| Private servers | Dashboard setting | free | Enable for friends runs (not combinable with paid access) |

Policy notes: grant only from the server receipt handler (`MarketplaceService:BindReceiptHandler` or `ProcessReceipt`) with `PurchaseId` stored in the same profile save. No paid random items by default; if a mystery chest is added, show every outcome and numerical odds before purchase and branch on `PolicyService:GetPolicyInfoForPlayerAsync(player).ArePaidRandomItemsRestricted` (see `roblox-monetization`). Content maturity: the questionnaire rates fear by intensity and frequency. Screaming, creepy NPCs, jump scares, ominous music and suspense are Mild fear; realistic blood with disfigured features, visible organs or open wounds is Moderate fear. Repeated Mild fear yields a Mild label (Kids and Select eligible); Moderate drops the game to Select and 16+. Answer for the most mature content a player can encounter and keep entities stylized.

## Retention and social

- **Daily reward**: 7-day cycle 50, 75, 100, 150, 200, 300 Coins, day 7 a cosmetic; claim after the first run, never at spawn.
- **Quests**: 3 per day (reach room 20, revive a teammate, survive 3 Rusher passes), 1 weekly (complete a run with a modifier); 40-120 Coins each.
- **Modifier of the week**: lights out, double entities, no hide spots in tier 3; +50 % coins.
- **Leaderboards**: weekly best room (`OrderedDataStore`, `roblox-server-data`), friends-only view first.
- **Friends**: invite with `SocialService:CanSendGameInviteAsync` then `PromptGameInvite`; party fills the elevator.
- **Codes**: none at launch; add a server-validated table later.
- **Badges**: First Run, Room 25, Room 50, Revive 10 teammates, Survive a Stalker (awarded server-side with `BadgeService:AwardBadgeAsync`).

## Feature list skeleton

M0 additions (genre-specific):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| HOR-01 | Room prefab contract and blockout kit | - | Unit: `RoomLogic.validatePrefabMeta` rejects missing Entry/Exit, no HideSpot, footprint over 60 x 40; passes for all prefabs. Playtest: QA `Rooms.validateAll` returns `ok` for 12 prefabs. |
| HOR-02 | Horror lighting preset and brightness setting | - | Playtest: `execute_luau` (Server) returns `Lighting.Ambient` equal to the default and no Bloom effect; `screen_capture` of room 1 shows readable floor; client brightness slider changes `ExposureCompensation` within -1..+1. |

M1 (core loop playable):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| HOR-03 | Run state machine and QA force-start | HOR-01 | Unit: `RunLogic.next` covers Lobby, Boarding, Running, Results transitions and rejects Running with 0 members. Playtest: QA `Run.forceStart` (1 player, seed 1234, 8 rooms) sets state `Running`. |
| HOR-04 | Seeded room chain | HOR-01, HOR-03 | Unit: `pickNext` with `Random.new(1234)` is identical across 2 calls, never repeats a prefab inside 3 rooms, respects MinRoom/MaxRoom. Playtest: after QA `Run.advance` x5, `Workspace.Run.Rooms` child count is at most 4 and no two room bounding boxes overlap. |
| HOR-05 | Doors, keys and locks | HOR-04 | Unit: `DoorLogic.canOpen` false without key, true with key, rejects a locked door re-open. Playtest: walk to a locked door, press E, door stays closed; QA `Items.give key`, press E, door `Open` attribute true. |
| HOR-06 | Hiding | HOR-04 | Unit: `HideLogic.canHide` rejects occupied spot, distance over 10, downed player. Playtest: press E at a `HideSpot`; `execute_luau` shows `Hidden == true` and root anchored; press E again after 0.5 s, `Hidden == false`. |
| HOR-07 | Rusher entity with tell | HOR-04, HOR-06 | Unit: `EntityLogic.positionAt` returns start at t=0, end at t=len/speed, clamped; `tellSeconds >= 2.5` asserted for every config. Playtest: QA `Entity.spawn Rusher`; console shows tell log, then pass; unhidden player ends Downed, hidden player HP unchanged (100). |
| HOR-08 | Vitals, downed, revive, spectate | HOR-03, HOR-07 | Unit: `VitalsLogic` damage to 0 yields `Downed`, bleed-out after 30 s yields `Dead`, revive restores 40 HP. Playtest: QA `Vitals.setHealth 0`; Downed UI visible (screenshot); QA `Vitals.revive` restores. |
| HOR-09 | Items, containers, flashlight and battery | HOR-04 | Unit: `LightLogic.drain(100, 10, lit)` gives 90; battery pickup caps at 100. Playtest: loot a `Lootable`, hotbar slot 1 shows item; toggle flashlight, `Lit` attribute true and battery decreases after 5 s. |
| HOR-10 | Run results and rewards | HOR-03, HOR-08 | Unit: `ProgressionLogic.runCoins` matches the formula for 8 cases incl. first-run bonus. Playtest: QA `Run.complete`; results screen (screenshot) shows coins; server state `state == "Results"`. |

M2 (progression and meta):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| HOR-11 | Profile, coins, XP, rank | HOR-10 | Unit: migration v1 to v2 fixture; `xpForRank` boundary loop 1..50. Playtest (`ProfileStore.Mock`): QA `Profile.grant coins 500`, `Profile.save`, `Profile.reload` returns coins 500; cross-session persistence is proven by `cloud_run_tests` in the test universe, never by writing production data. |
| HOR-12 | Shop and loadout | HOR-11 | Unit: `ShopLogic.buy` rejects insufficient coins, owned item, unknown id; boundary 0 / -1 / NaN. Playtest: buy Lighter with 120 Coins, coins become 0, loadout slot lists it. |
| HOR-13 | EntityDirector budget and 3 more entities (Watcher, Screecher, Ambusher) | HOR-07 | Unit: `nextEncounter` never schedules within 2 rooms of the last, cost never exceeds budget, same seed same schedule. Playtest: QA `Run.setRoom 30` then `Run.advance`; log shows scheduled encounter kinds from the seeded list. |
| HOR-14 | Stalker pathfinding and final chase | HOR-13 | Unit: stalker state machine transitions (idle, patrol, chase, lose-target). Playtest: spawn Stalker 40 studs away with LOS; `execute_luau` shows state `chase` and distance decreasing; after hiding for 10 s, state `search`. |
| HOR-15 | Party elevator, ready-up, scaling | HOR-03 | Unit: `PartyLogic.fillTimer` 30 s, 10 s when full; `partyScale` values. Playtest: QA `Party.addDummy` x2; elevator UI lists 3 members; run starts after timer. |
| HOR-16 | Dark rooms and optional sanity | HOR-09 | Unit: sanity clamp 0..100, drain/regen rates, never reduces HP. Playtest: enter `DarkRoom`, `Lighting` local ambient lower (screenshot), sanity decreases; flashlight restores. |

M3 (content, juice, FTUE):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| HOR-17 | Audio director and spatial tells | HOR-07 | Unit: `AudioLogic.heartbeatRate(distance)` is monotonic (closer is faster) and clamped 0.8..2.0. Playtest: during the Rusher tell, console logs `AudioDirector: tell` once, an `AudioEmitter` exists on the entity, no console errors; `Config.Audio` asset IDs all load via `ContentProvider:PreloadAsync` without failures. |
| HOR-18 | Content pass: 24 rooms, 3 tiers, 4 puzzles | HOR-04, HOR-09 | Unit: every prefab passes `validatePrefabMeta`. Playtest: QA `Run.forceStart rooms 50` then `Run.advanceTo 50` with no console errors; part count under 12,000 in live rooms. |
| HOR-19 | FTUE tutorial run | HOR-07, HOR-10 | Playtest: fresh profile, `Run` is `Tutorial`; entity cannot end run; coins after completion = 148; `tutorialDone == true`. |
| HOR-20 | HUD, mobile, gamepad and accessibility | HOR-08, HOR-09 | Playtest: `screen_capture` at 1280x720 and a phone-sized emulation shows HUD within safe area; settings toggle `reduceJumpScares` flips attribute; subtitles show direction cue. |

M4 (monetization, social, launch):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| HOR-21 | Monetization and receipts | HOR-12 | Unit: `ReceiptLogic` grants once per `PurchaseId`, returns NotProcessedYet if profile missing; 5-case table. Playtest: QA `Receipt.simulate` twice for one id; tokens increase once. |
| HOR-22 | Daily, quests, leaderboard, badges | HOR-11 | Unit: `DailyLogic.claim` day roll-over and streak reset; quest progress clamps. Playtest: QA `Daily.setDay` then claim; leaderboard write queued, badge call logged. |
| HOR-23 | Social, private servers, launch readiness | HOR-15, HOR-21 | Playtest: invite button calls `CanSendGameInviteAsync`; maturity questionnaire answered Mild; analytics events listed below appear in a console trace; `roblox-publish-checklist` run, result recorded. |

## Playtest scripts

All scripts use the QA BindableFunction through `game.ServerStorage.QA:Invoke(cmd, player, ...)` from `execute_luau` (datamodel_type "Server"). QA commands needed: `Run.forceStart(player, {seed, rooms})`, `Run.advance`, `Run.advanceTo`, `Run.setRoom`, `Run.complete`, `Rooms.validateAll`, `Entity.spawn(kind)`, `Items.give(id)`, `Vitals.setHealth`, `Vitals.revive`, `Party.addDummy`, `Profile.grant`, `Profile.reset`, `Daily.setDay`, `Receipt.simulate(productId)`.

1. **Core loop smoke.** `start_stop_play` start; `get_console_output` empty of errors; Server: `QA:Invoke("Run.forceStart", p, {seed = 1234, rooms = 8})` and return `Run.state`; `character_navigation` to the first `Exit`; Server: assert `roomIndex == 2`; repeat via `Run.advance`; `screen_capture` room 3; stop play and confirm with `get_studio_state`.
2. **Tell and counter.** Force-start; `Entity.spawn("Rusher")`; poll Server every 0.5 s for `entity.phase` (expect `tell` then `pass`); during `tell`, `character_navigation` to the nearest `HideSpot`, `user_keyboard_input` key `E`; Server: assert `Hidden == true`; after pass assert HP == 100. Repeat without hiding; assert state `Downed` and `get_console_output` shows `[Vitals] downed`.
3. **Revive and failure.** Set HP 0, assert `Downed`; `Items.give("ReviveToken")`; use token; assert HP == 40 and `Downed == false`; set HP 0 again with 0 tokens and a 1-player party; assert run state `Results` and `Profile.coins` increased by `runCoins`.
4. **Persistence (mock store).** `Profile.reset`, `Profile.grant("coins", 500)`, `Profile.save`, `Profile.reload`; assert coins == 500 and `version` equals the current schema version.

## Design rules

1. Every lethal entity has a tell of at least 2.5 s and a counter that always works; `Config` asserts it in a spec.
2. Never spawn an entity inside the first 6 s of a room or within 8 s of a revive.
3. Every room prefab places a hide spot within 25 studs of both `Entry` and `Exit`.
4. No death in the first 90 s of a new profile; the tutorial run cannot fail.
5. Darkness never goes below the `Ambient` floor; players can raise brightness and reduce jump scares.
6. Jump scares are rate-limited (1 per 3 min) and always follow a build-up.
7. The run is winnable solo: encounter budget scales by party size and a solo Revive Token exists.
8. Entities move deterministically from a replicated timeline, never from per-frame client authority.
9. Rooms are generated from a seed; the same seed gives the same chain in tests.
10. Paid items are consumables and cosmetics; no purchase makes an entity ignore a player.
11. Keep entity art stylized so the content label stays Mild unless the owner explicitly chooses Moderate.
12. Late joiners and reconnectors never crash the run: spectate or restore within the 90 s window.

## Analytics

- `LogOnboardingFunnelStepEvent`: 1 Spawn, 2 PickupFlashlight, 3 FirstTell, 4 HideSuccess, 5 TutorialComplete, 6 FirstPurchase.
- `LogProgressionStartEvent` at run start, `LogProgressionCompleteEvent` on a completed run, `LogProgressionFailEvent` on failure, all on path `Hotel` with `level = roomIndex` and `levelName = tier name`.
- `LogEconomyEvent` (flow Source/Sink, currency `Coins`; at most 5 currencies): run payout, daily, shop, revive purchase; `transactionType` from `Enum.AnalyticsEconomyTransactionType` names.
- `LogCustomEvent`: `EntityEncounter` (value 1; fields kind, hidden, room), `PlayerDowned` (room, cause), `RunEnded` (value = rooms, fields reason, partySize), `ReviveUsed`, `BrightnessChanged`, `ReduceJumpScaresToggled`.
- `LogFunnelStepEvent` "ShopPurchase" with a per-open session id: OpenedShop, ViewedItem, ClickedBuy, Confirmed.
