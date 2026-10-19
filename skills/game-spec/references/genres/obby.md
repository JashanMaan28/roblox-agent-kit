# Obby recipe

Loaded by `game-spec` when the pitch is an obby (obstacle course) or a hybrid with one. Numbers are starting defaults: they go into `Config` tables in the `*Logic` modules and get tuned from playtests. M0 (bootstrap, data layer, remotes, rate limiter, QA commands incl. `Data.reset` / `Data.reload`, blockout, lighting) is common; this file only adds to it.

Contents: Fantasy and references · Loop and pacing · Interview · Systems · Data schema · Economy and tuning · World · UI and input · FTUE · Monetization · Retention and social · Feature list skeleton · Playtest scripts · Design rules · Analytics.

## Fantasy and references

Fantasy: "I can beat this": a fair, readable skill challenge with instant retries, a visible stage counter and something to show for it (trail, rank, time). Failure is cheap, progress is saved, every death is the player's fault.

- Barry's Prison Run (PlatinumFalls): one-line fantasy ("escape the prison"), first-person, short complete-able run, nine badges, limited-time events and cosmetics as the revenue engine, with a long tail of steady players. Take: a strong theme plus event cadence beats a bigger course.
- +1 Speed Keyboard Escape (Candy & Chocolate): a top-charting obby hybrid. Obby plus an incremental stat (every step = +1 Speed), multipliers, codes, a gift button for liking and joining the group (reported). Take: a number that always goes up turns a course into a long-term loop.
- Tower of Hell: randomly assembled tower (6 sections; 12 in Pro), 8-minute round timer, no checkpoints, server-wide mutators bought with coins or Robux. Take: round-based replayability and pure skill with zero tutorial.
- Mega Easy Obby (825 stages): long linear checkpoint course, autosave, skips via developer product and like-milestone codes, prestige resets only the stage. Take: stage count is the progress bar; skips are the monetization.
- "Obby but you're on X" (Roller Skates: 100 stages, themed worlds, speedrun boards, unlockable powers): one twist verb applied to a whole course. Take: the twist is the marketing hook and the content multiplier.

## Loop and pacing

- Core loop (seconds): read the obstacle, jump, die or clear, respawn at the last checkpoint in <= 1.5 s, retry. Death-to-control must stay <= 1.5 s.
- Meta loop (minutes): clear stage, checkpoint chime, coins, stage counter ticks, next world gate; spend coins on trails/auras; optional speedrun of a cleared world.
- Long-term loop (days): 10 worlds x 10 stages, prestige (reset stage, keep cosmetics, +25% coins), leaderboards, daily/playtime rewards, seasonal cosmetics.
- First checkpoint reward within 20 s of spawn; first coin within 12 s. Stages 1-3 are zero-death by construction.
- First world (10 stages) in ~5 min; first cosmetic affordable at stage 9 (~4.5 min); first session 10-15 min (stage 12-20); stage clear time median 30 s at world 1 rising to 60-90 s at world 10.
- Death budget (median deaths per stage): stages 1-10: 1-3; 11-50: 4-10; 51-100: 8-20; boss stage (10th of each world): 15-30.
- Never more than 60 s of travel without a checkpoint; a world boss gauntlet ends each world.

## Interview: questions that change the build

| Question | Options | Default (auto mode) |
|---|---|---|
| Format | A Campaign (linear checkpoints); B Round tower (random sections, timer, no checkpoints); C Campaign + incremental stat (+1 Speed style) | A |
| Scale | 30 stages / 3 worlds (jam); 100 stages / 10 worlds; 300+ (long tail) | 100 stages / 10 worlds |
| Twist verb | None; vehicle (bike, skates, hover); grapple; gravity flip; speed stat | None (walk/jump); twist = world theme |
| Competition | Solo + ghost boards; live race (first to finish); co-op gates | Solo + leaderboards |
| Skip policy | No skips; contextual paid skip; free skip after N deaths | Contextual paid skip after 5 deaths on a stage, never on boss stages |
| Audience | Kids (<13 heavy): no paid random, softer difficulty; broad | Broad, still no paid random |

Variant B adds `Round` system and drops `Checkpoints`/`Prestige`; variant C adds `Training` (see Systems notes).

## Systems

| System | Milestone | Server owns | Client shows | Roblox APIs | Kit skills |
|---|---|---|---|---|---|
| Course (CourseBuilder, `StageDefs`, obstacle kit) | M1 | Generates `Workspace.Course` from seeded stage definitions; movers/spinners/disappearing platforms | Meshes/materials, ambient motion | `CollectionService`, `HingeConstraint`, `PrismaticConstraint`, `BasePart:SetNetworkOwner(nil)` | roblox-building, roblox-physics |
| Checkpoints | M1 | Stage state per player, plausibility checks, respawn target | Stage counter, flag VFX, toast | `Player.RespawnLocation`, `SpawnLocation`, `BasePart.Touched`, `Player:RequestStreamAroundAsync` | roblox-characters, roblox-security |
| Hazards | M1 | Kill detection (KillBrick, KillZone, void), death counter | Death poof, red flash | `Touched`, `WorldRoot:GetPartsInPart`, `Humanoid.Health` | roblox-physics |
| Coins/Rewards | M1 | First-clear and replay payouts, bonus coins | Coin burst, HUD tick | `AnalyticsService:LogEconomyEvent` | roblox-game-design, roblox-analytics |
| Worlds | M2 | World unlock gates, portal teleports | World select, locked-world peek | `Player:RequestStreamAroundAsync`, `PVInstance:PivotTo` | roblox-gui |
| Speedrun | M2 | Per-world run timer (`os.clock` deltas), personal bests, assist flag | Run timer, split | `os.clock`, `os.time` | roblox-data |
| Cosmetics | M2 | Ownership, equip, price validation | Shop, preview, trail render | `Trail`, `Attachment` | roblox-gui, roblox-animation-vfx |
| Leaderboards | M2 | Throttled OrderedDataStore writes | Hub boards (SurfaceGui) | `DataStoreService:GetOrderedDataStore` | roblox-server-data |
| Skips and Prestige | M2 | Skip tokens, eligibility, prestige reset | Skip button, prestige confirm | `MarketplaceService:PromptProductPurchase` | roblox-monetization |
| Rewards (daily, playtime, codes, group) | M4 | Day boundaries (`os.time`), code validation, group check | Reward panel, red dots | `Player:IsInGroupAsync`, `BadgeService:AwardBadgeAsync` | roblox-growth-design |
| Shop (passes, products, receipts) | M4 | Pass registry, `ProcessReceipt`, idempotent grants | Offer UI with live prices | `MarketplaceService`, `PolicyService` | roblox-monetization |

Tricky parts:
- **Checkpoint persistence.** `ProgressLogic.advance(state, touchedStage, now)` is pure. Pads are parts tagged `Checkpoint` with attribute `Stage`; server `Touched` (debounced per player) calls the Checkpoints system. Accept only `touchedStage == stage + 1`; ignore `<= stage`; reject `> stage + 1` and reject if `now - lastClearAt < CourseLogic.minStageSeconds(stage)` (40% of the stage's par time). Rejections drop silently and log an analytics diagnostic. On accept: save stage in the profile, set `player.RespawnLocation` to that pad's `SpawnLocation` (Neutral = true, Duration = 0 so no ForceField bubble; RespawnLocation must be a Workspace descendant and neutral or team-matched).
- **Join and respawn.** Keep `CharacterAutoLoads = true`, `Players.RespawnTime = 1`. Show a loading cover until the profile is loaded; then `PivotTo` the saved checkpoint and call `RequestStreamAroundAsync(position)` before removing the cover. Respawns after death use `RespawnLocation` (no teleport flash).
- **Kill detection.** Kill parts are tagged `KillBrick` and connected through `GetTagged` + `GetInstanceAddedSignal` (works for streamed-in/generated parts). Handler: `hit.Parent:FindFirstChildOfClass("Humanoid")`, `Health > 0`, then `Health = 0` (bypasses ForceField, which only blocks `TakeDamage`), per-character debounce. `Touched` only fires on contact start and never between two anchored parts, so large `KillZone` volumes (lava floors, void) are also swept at 10 Hz per player with `WorldRoot:GetPartsInPart(rootPart, overlapParams)` (FilterType Include on `Workspace.Course.Hazards`) plus `rootPart.Position.Y < CourseLogic.voidY(world)`.
- **Moving obstacles.** Physics-driven and server-owned: spinners = `HingeConstraint` Motor, platforms = `PrismaticConstraint` Servo, parts `SetNetworkOwner(nil)`; disappearing platforms toggle `Transparency`/`CanCollide` on a server timer with a 0.4 s warning flash. Never tween movers client-side (desyncs kills from standing).
- **Jump feasibility is a unit test.** `CourseLogic.isJumpFeasible(gap, rise, walkSpeed, jumpHeight, gravity, safety)` uses air time = sqrt(2h/g) + sqrt(2(h - rise)/g) and reach = walkSpeed x airTime (defaults 16, 7.2, 196.2: 8.67 studs flat, 6.73 at rise 5). Edge-to-edge gap must satisfy `gap + 1.5 <= reach x safety` (safety 0.65 easy, 0.85 hard, 0.75 on mobile-critical stages). The spec iterates every `StageDefs` entry.
- **Players do not collide.** Register collision group `Players` at edit time, `CollisionGroupSetCollidable("Players","Players",false)`, assign on `CharacterAdded` (server only). Leave `TouchesUseCollisionGroups` false so hazards still fire.
- **Assist items** (coils, speed passes) set `profile.assistUsed` for the run: that run's time is not submitted to boards.
- **Variant B (round tower).** `Round` states: Intermission 20 s, Build (seeded pick of 6 sections from the pool, `Random.new(seed)` passed in), Climb 480 s, Results 10 s. No checkpoints: falling returns to the tower base. Finish order pays coins [100, 60, 40, 25, 15]; mutators are server-wide round modifiers with a 30 s cooldown.
- **Variant C (stat hybrid).** `Training` lane: distance run converts to `speedStat`; `WalkSpeed = 16 x min(2, 1 + 0.1 x log2(1 + speedStat / 100))` and `isJumpFeasible` uses the 2x cap so every jump stays valid at max speed.

## Data schema

```luau
export type ObbyProfile = {
	version: number, -- 1
	stage: number, -- current checkpoint, 1..MAX_STAGE
	bestStage: number,
	world: number, -- highest unlocked world
	prestige: number,
	coins: number,
	skipTokens: number,
	totalDeaths: number,
	deathsByStage: { [string]: number }, -- sparse, key = tostring(stage); feeds contextual skip
	worldBestSeconds: { [string]: number }, -- key = tostring(world)
	ownedCosmetics: { [string]: true },
	equipped: { trail: string?, aura: string? },
	ownedPasses: { [string]: true }, -- cache; truth is MarketplaceService
	daily: { day: number, streak: number, lastClaimDay: number, graceUsed: boolean },
	playtime: { dayKey: number, seconds: number, claimedMask: number },
	redeemedCodes: { [string]: true },
	flags: { tutorialDone: boolean, groupRewarded: boolean, starterPackBought: boolean },
	settings: { music: boolean, sfx: boolean, showTimer: boolean },
	purchaseIds: { string }, -- last 100 PurchaseIds (ReceiptHandler)
	lastSeen: number, -- os.time()
}
```

Session-only: run timer start, assist flag, per-stage debounce, `lastClearAt`, hazard debounces, loading-cover state. Leaderboard entries live in OrderedDataStores (`ObbyStage_v1`, `ObbyWorld<N>Weekly_<yyyyww>`), not in the profile.

## Economy and tuning defaults

Formulas (`CourseLogic`): `baseReward(n) = round(10 x 1.04^(n-1))` (10, 14 at stage 10, 68 at 50, 486 at 100; cumulative 106 by stage 9, 12,373 by stage 100). Payout on first clear = `baseReward x (1 + 0.25 x prestige) x passMult`; replays pay 20%; boss stages pay x3. Bonus coins sit on risky side routes: 5 coins x up to 3 per stage, once per stage per prestige.

| Constant | Default |
|---|---|
| `STAGES_PER_WORLD` / `WORLD_COUNT` | 10 / 10 |
| `MIN_STAGE_SECONDS` | 0.4 x par (par = 30 s at stage 1, +0.6 s per stage) |
| `SKIP_MIN_DEATHS` (same stage) | 5 |
| `RESPAWN_TIME` | 1 s |
| Cosmetic prices (coins) | common 100, rare 500, epic 2,000, legendary 8,000 |
| `PRESTIGE_REQUIRES` | stage 100 cleared; resets stage/world, keeps cosmetics |
| `PRESTIGE_BONUS` | +25% coins each, max 10 |
| Leaderboard write throttle | 60 s per player, flush on leave |

Sources: stage clears, bonus coins, daily/playtime/code rewards, coin packs. Sinks: cosmetics (the only coin sink, so tiers must reach 8,000), prestige re-clears. Skips cost Robux or tokens, not coins (coins buying progress would make the course optional).

## World

- **Hub** (80 x 80 studs): spawn pad, shop kiosk, daily reward board, two leaderboard walls (SurfaceGui), world portals (`WorldPortal`, attribute `World`), VIP lounge door. Hub is safe: no hazards.
- **World** n: a ribbon of 10 stage models, each <= 120 studs long, climbing in a gentle spiral so the whole course fits a 400 x 400 footprint; one theme per world (Grass, Candy, Ice, Lava, Sand, Space, Jungle, Neon, Clouds, Void). Each stage has an entry pad (checkpoint) and fits one screen of camera framing.
- Platform minimum 6 x 6 studs at stages 1-20, 4 x 4 after; gaps and rises per `isJumpFeasible` (design bands: easy <= 4 studs, hard <= 5.5, never > 6 flat; max rise 5). Moving platforms >= 6 studs wide, speed <= 12 studs/s.
- Hazard language (fixed across the game): neon red + Neon material = deadly; everything else safe. Checkpoints glow green and show the stage number on a BillboardGui. Boss stage = gauntlet of the world's mechanics with a gold pad.
- Lighting per world: Brightness 2.5-3, bright ClockTime 13-15 (Lava/Void worlds 18-20), Atmosphere Density 0.25, Bloom 0.3, ColorCorrection tint per theme. Style: chunky low-poly, SmoothPlastic, saturated palette, no more than 3 hues per world. Streaming: `StreamingEnabled` with each stage as a Model; checkpoint models `ModelStreamingMode = Persistent`.
- Tags: `Checkpoint`, `KillBrick`, `KillZone`, `Mover`, `Spinner`, `Disappearing`, `BonusCoin`, `WorldPortal`, `BossStage`. Part budget: <= 1,500 parts per stage, <= 12,000 total.

## UI and input

- HUD (top-left): `Stage 14/100` with world progress bar; (top-center): run timer when started; (top-right): coins; (bottom-center, only after 5 deaths on a stage): Skip button. Death counter small, under the stage label.
- Screens: Shop (Cosmetics / Boosts / Passes tabs), World select (locked worlds visible with best time), Daily reward, Settings (music, SFX, timer), Prestige confirm.
- Mobile: all HUD buttons >= 56 px, kept out of the bottom-left thumbstick and bottom-right jump zones; no gameplay requires two simultaneous taps; keep camera free (no auto-rotate hazards); test stage 1-20 gaps with safety 0.75. Gamepad: shop navigable with selection, B closes screens. Keyboard: `R` reset to checkpoint (instant respawn command through a validated remote, 3 s cooldown).

## FTUE

First 60 s:
1. 0-3 s: spawn on Stage 1 platform, camera facing the course, no logo or cutscene, HUD shows only the stage counter.
2. 3-10 s: a single glowing arrow along the path; first gap is 3 studs onto a wide platform, falling is safe (net below, respawn at start).
3. 10-20 s: reach the first checkpoint: chime, flag burst, `+10` coins, stage counter `1 -> 2`.
4. 20-40 s: Stage 2 introduces one red neon brick beside a wide safe path (Ki: seen, not lethal); Stage 3 forces a jump over it (Sho).
5. 40-60 s: Stage 3 clear, progress bar `3/10`, a locked trail silhouette shown in a corner ("100 coins").

First 5 min:
6. Stage 4-6: one new mechanic per stage (moving platform, spinner, disappearing platform), each with a safe intro; no popups, no text walls.
7. Stage 7: first side-route bonus coins (risk/reward).
8. Stage 9 (~4.5 min): coins reach 100, shop red dot pulses; first trail purchase and auto-equip (the trail shows immediately).
9. Stage 10 boss gauntlet; clear fires confetti, `World 1 complete`, portal to World 2 opens, World 2 peek visible.
10. Daily reward appears only after the tutorial flag (`tutorialDone`) is set at stage 3.

## Monetization

| Item | Type | Default price (R$) | Rule |
|---|---|---|---|
| Skip Stage | Developer product | 19 | Offered only after `SKIP_MIN_DEATHS` on that stage; never on boss stages; grants +1 stage via `ProgressLogic` |
| Skip Pack x5 | Developer product | 79 | Gives 5 skip tokens; same eligibility rules at use time |
| Coin Pack S (1,000 coins) | Developer product | 49 | Shown in the shop only |
| Coin Pack L (5,000 coins) | Developer product | 199 | Shown in the shop only |
| Starter Pack (3 tokens, 500 coins, Starter Spark trail) | Developer product, once | 99 | Offered after stage 10 and >= 8 min played; `starterPackBought` blocks repeats |
| 2x Coins | Game pass | 199 | Multiplies stage rewards only (not daily rewards) |
| Rainbow Trail | Game pass | 149 | Cosmetic |
| VIP | Game pass | 399 | Chat tag, lounge, VIP trail; no power |
| Assist Coils (speed + low gravity) | Game pass | 299 | Sets `assistUsed`: run not submitted to boards |

Policy: no paid random items in this genre recipe (no crates), so no `ArePaidRandomItemsRestricted` path is required; if a pitch adds crates, load `roblox-monetization` §6. Prompt from the client, grant only in the shared `ReceiptHandler` (PurchaseId stored in the same profile save), passes through one benefit registry. Never sell the finish: the final stage and the world-complete badge are unskippable.

## Retention and social

- Daily reward: 7-day cycle, coins [50, 100, 150, 200, 300, 400], day 7 = 1 skip token + Daily Trail; UTC day via `os.time()`; one forgiven missed day (`graceUsed`).
- Playtime rewards (per UTC day, cumulative seconds): 5 min 25 coins, 10 min 50, 15 min 75, 25 min 150, 40 min 1 skip token.
- Codes: `Config.CODES = { [code] = { reward, expiresAt } }`, server-validated, rate limited to 5/min, one redemption per profile. Like goals cannot be verified by API, so milestone codes (`LIKES10K`) are published when the milestone is reached and anyone can redeem them.
- Group reward: `Player:IsInGroupAsync(GROUP_ID)` on the server, once: 500 coins + Member trail (`groupRewarded`).
- Leaderboards: all-time best stage; weekly World 1 speedrun (key suffix `yyyyww`). Show 10 rows and the player's rank.
- Friends: after the first world clear, a non-blocking "Invite friends" button using `SocialService:CanSendGameInviteAsync` then `PromptGameInvite` (client). Join-friend teleport is the Roblox default; no reward gating.
- Badges: Welcome, World 1-10 Complete, Prestige 1, Speedrunner (sub-par World 1).

## Feature list skeleton

Milestones: M1 OBY-01–07 · M2 OBY-08–13 · M3 OBY-14–17 · M4 OBY-18–21, then the standard LAUNCH-01..05 from `features-schema.md`; variant B adds OBY-22 (M1) and OBY-23 (M2) and drops OBY-05 and OBY-12. `depends` uses the standard CORE-xx ids. Acceptance lists unit assertions (U) and playtest checks (P); `game-spec` rewrites them as Given/When/Then.

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| OBY-01 | Character, collision and respawn config | CORE-02 | P: `Players.RespawnTime == 1`, `PhysicsService:CollisionGroupsAreCollidable("Players","Players") == false`, loading cover visible until profile loaded; death-to-control <= 1.6 s over 5 deaths |
| OBY-02 | CourseLogic (reward, par, feasibility, anti-skip) | CORE-01 | U: `isJumpFeasible(gap, rise)` true for (4, 0) at safety 0.65, (5.5, 0) and (4, 5) at 0.85; false for (9, 0) and (6, 5); `baseReward` = 10, 14, 68, 486 at 1, 10, 50, 100; `minStageSeconds` monotone; NaN/negative rejected |
| OBY-03 | CourseBuilder + obstacle kit, World 1 | OBY-01, OBY-02, CORE-06 | U: every `StageDefs` entry passes feasibility with safety <= 0.85; P: `Workspace.Course` has 10 stage models, 10 `Checkpoint` tags with consecutive `Stage`; `screen_capture` of stages 1 and 5 shows green pads and red neon hazards |
| OBY-04 | Hazards (KillBrick, KillZone, void) | OBY-03 | P: QA `Course.teleportToStage` onto a KillBrick -> Humanoid dead within 0.5 s, `deathsByStage` +1; void drop kills; console clean |
| OBY-05 | Checkpoints and persistence | OBY-03, CORE-04, CORE-05 | U: `advance` accepts +1, ignores <= stage, rejects +2 and too-fast clears; P: touch pad 2 -> `stage == 2`, `player.RespawnLocation` = pad 2, death respawns there; `Data.reload` keeps stage |
| OBY-06 | Stage HUD and checkpoint feedback | OBY-05, CORE-08 | P: client `execute_luau` reads the stage label text `Stage 2/100` after clear; chime and flag VFX play (console shows no errors) |
| OBY-07 | Coins and first-clear rewards | OBY-05, CORE-04 | U: replay pays 20%, boss x3, prestige bonus; P: first clear of stage 1 -> coins 10, replay -> +2; economy event logged |
| OBY-08 | Worlds, gates and portals | OBY-05 | U: world unlock when stage >= 10 x world; P: QA `Stage.set 10` opens the portal, `PivotTo` lands in World 2 with streaming complete |
| OBY-09 | Speedrun timer and personal bests | OBY-08 | U: PB only improves, assist flag blocks submission; P: timer starts at stage 1 pad, finishes at stage 10, PB saved |
| OBY-10 | Cosmetics shop and trails | OBY-07 | U: price validation, double-buy rejected, insufficient funds rejected; P: buy common trail at 100 coins -> equipped, trail visible in capture |
| OBY-11 | Leaderboards | OBY-09, CORE-04 | U: write throttle (<= 1 per 60 s); P: hub board shows the test player's stage after QA set |
| OBY-12 | Prestige | OBY-08 | U: requires stage 100, resets stage/world only, +25%, max 10; P: QA `Stage.set 100` -> prestige -> `stage == 1`, cosmetics kept |
| OBY-13 | Contextual skip | OBY-05 | U: eligible only after 5 deaths, never on boss stages; P: 5 QA deaths -> button visible; `Skip.use` advances stage by one |
| OBY-14 | Worlds 2-10 content | OBY-08 | U: all stages feasible; P: capture of each world's first stage; per-world lighting preset applied |
| OBY-15 | Juice and audio pass | OBY-06 | P: death poof, checkpoint chime, confetti on world clear, music loop; capture shows no HUD overlap |
| OBY-16 | FTUE (stages 1-3, arrow, first shop beat) | OBY-06, OBY-07, OBY-10 | P: fresh profile -> zero deaths possible before stage 3, arrow visible, shop red dot at 100 coins; `tutorialDone` set at stage 3 |
| OBY-17 | Mobile pass | OBY-06, CORE-08 | P: `execute_luau` (Client) reports all HUD buttons >= 56 px at 390 x 844; capture in device emulation shows no overlap with thumb zones |
| OBY-18 | Shop, passes and receipts | OBY-10, OBY-13, CORE-04 | U: ReceiptHandler 5-case table (new, duplicate, grant false, unknown product, absent player); P: fake receipt grants a skip once |
| OBY-19 | Daily, playtime, codes, group reward | OBY-07, CORE-04 | U: streak/grace math, UTC day rollover, code single-use; P: QA `Daily.setDay 3` then claim -> coins 150 |
| OBY-20 | Analytics and funnels | OBY-05, OBY-07, CORE-10 | P: console shows funnel step and progression logs in order for a scripted run (events send only from published servers) |
| OBY-21 | Exploit-hardening pass | OBY-05, OBY-13, OBY-18 | U: `advance` and skip use reject stage 0, -1, NaN, 1e9, a string and +2 ahead; P: Client `execute_luau` fires the checkpoint, skip, prestige and shop remotes with those payloads, `PivotTo`-skips ahead and 60 calls/s; Server `stage`, `coins`, `skipTokens` unchanged and `get_console_output` shows no server errors |
| OBY-22 | (Variant B) Round loop and tower generator | OBY-03 | U: seeded `Random.new(seed)` picks 6 distinct sections deterministically; P: round runs Intermission -> Climb -> Results |
| OBY-23 | (Variant B) Mutators and finish-order rewards | OBY-22 | U: payouts [100, 60, 40, 25, 15]; mutator cooldown 30 s |

## Playtest scripts

QA commands added by this genre (`ServerStorage.QA:Invoke(name, player, ...)`): `Stage.set(n)`, `Course.teleportToStage(n)`, `Coins.grant(n)`, `Skip.grant(n)`, `Daily.setDay(n)`, `Prestige.force()`.

1. **First checkpoint.** `start_stop_play(true)`; `execute_luau` (Server): `QA:Invoke("Data.reset", p)`. `character_navigation` (Client) to the Stage 2 pad. `execute_luau` (Server) return `` `{profile.stage},{profile.coins}` `` expect `2,10`. `execute_luau` (Client) read HUD label expect `Stage 2/100`. `get_console_output` has no errors; `screen_capture`.
2. **Death and respawn.** `QA:Invoke("Course.teleportToStage", p, 3)` onto the stage 3 KillBrick: wait 2 s; Server returns `humanoid.Health > 0`, `player.RespawnLocation.Name == "Checkpoint3"`, `deathsByStage["3"] == 1`; repeat 5 times then Client returns Skip button `Visible == true`.
3. **Anti-skip.** From Server `QA:Invoke("Stage.set", p, 5)`, then `PivotTo` the character onto the stage 9 pad; expect `stage` stays 5 (rejection logged) and no coin change. Then walk the pad sequence legitimately via `character_navigation` and expect `stage` to advance only +1 per pad.
4. **Persistence.** `QA:Invoke("Stage.set", p, 7)`, `QA:Invoke("Data.reload", p)`, return `profile.stage` expect 7 and character spawns at pad 7. (Studio uses the Studio-scoped store name, never the production one.)

## Design rules

1. Every jump passes `isJumpFeasible` at the stage's safety band; the spec fails the build otherwise.
2. Death-to-control <= 1.5 s; no scripted delay, fade or popup on death.
3. Red neon means deadly and nothing else is red neon; checkpoints are always green.
4. Stages 1-3 contain no lethal hazard the player can reach by following the path.
5. One new mechanic per stage, introduced on a safe approach, tested one stage later (Ki, Sho, Ten, Ketsu per world).
6. No stage takes more than 60 s without a checkpoint; boss stages end a world, never the middle.
7. The server alone advances stage, pays coins and writes the profile; the client sends nothing the server cannot recompute.
8. Skips are contextual (after N deaths), exclude boss and final stages, and the course stays completable for free.
9. Assist items never reach the leaderboards.
10. Coins buy cosmetics only; nothing for coins skips content.
11. Moving obstacles are server-owned physics; deterministic timing so a pattern can be learned.
12. Mobile is the reference device: 56 px targets, safety 0.75 on any stage with consecutive jumps, no precision that needs a mouse.

## Analytics

- Onboarding funnel (`LogOnboardingFunnelStepEvent`): 1 Spawned, 2 Stage1Cleared, 3 Stage3Cleared, 4 FirstCoinsEarned, 5 Stage10Cleared, 6 FirstCosmeticBought, 7 WorldCleared2.
- Progression: `LogProgressionStartEvent` / `Complete` / `Fail` with path `World<N>`, stage number, stage name (fail = death, aggregated per stage and flushed every 60 s, not per death).
- Economy: currency `Coins` (source: `Gameplay` SKU `StageClear`/`BonusCoin`, `TimedReward` SKU `Daily`/`Playtime`/`Code`, `IAP` SKU pack ids; sink: `Shop` SKU cosmetic id); currency `SkipTokens` (source `IAP`/`TimedReward`, sink `Gameplay` SKU `SkipUsed`). Report the balance the mutation returned.
- Custom events (one name, fields for variants): `StageClearTime` (value seconds, field1 stage), `StageDeaths` (value count, field1 stage, field2 cause: kill/void), `SkipOffered`, `SkipUsed`, `PrestigeDone`, `RunSubmitted`, `SuspiciousSkip`.
- Purchase funnel `Shop`: OpenedShop, ViewedItem, ClickedBuy, Confirmed, Granted (same session id per attempt).
- Read it as: stages with median deaths above the band in Loop and pacing, or `StageClearTime` above 2x par, are the first balance targets.
