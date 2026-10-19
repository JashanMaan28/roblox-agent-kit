# Battlegrounds recipe

Loaded by `game-spec` when the pitch is a battlegrounds / fighting / PvP game (melee + abilities arena, duels, shooter-lite) or a hybrid with one. Numbers are starting defaults: they go into `Config` tables in the `*Logic` modules and get tuned from playtests.

Contents: Fantasy and references · Loop and pacing · Interview · Systems · Data schema · Economy and tuning · World · UI and input · FTUE · Monetization · Retention and social · Feature list skeleton · Playtest scripts · Design rules · Analytics.

## Fantasy and references
Fantasy: "I pick a fighter, learn its combos, read my opponent, and win the exchange: dash, block, punish, ultimate, ragdoll."
- The Strongest Battlegrounds (TSB): the template. Free-for-all arena, 4-hit M1 chain where the 4th hit launches (community-reported damage 3/3/4/5), side dash that cancels ragdoll on a long cooldown (community-reported 30 s), ultimate meter on G, ability-cancel combos. Lesson: depth comes from cancels and timing, not from many buttons.
- Jujutsu Shenanigans: character-per-moveset roster that keeps players returning; each new moveset update drives a return wave. Lesson: new movesets are the content treadmill; each needs a clear gimmick and fair counters.
- Rivals: competitive first-person duels, 1v1 to 5v5, first to 5 rounds, ELO ranked queues per mode, input-based matchmaking so mobile players are not thrown at keyboard veterans. Lesson: short rounds + ranked ladder + seasonal rewards.
- Untitled Boxing Game: skill-based stamina and timing boxing. Lesson: a single narrow verb with a high skill ceiling can carry a game; reuse the `CombatSystem` with stamina and no abilities for this variant.
- Spec note: original fighters, move names, and arenas; no licensed anime IP.

## Loop and pacing
- Core (5-20 s exchanges): approach -> bait/spacing -> M1 chain or skill -> block/dash/punish -> ult -> kill.
- Meta (10-30 min): kill streaks and bounty -> coins -> unlock a moveset or cosmetic -> try it in FFA -> queue ranked duels.
- Long term (weeks): ELO ladder with 28-day seasons, kill/ELO leaderboards, cosmetic collections, new moveset every 2-3 weeks.
- Targets: first hit landed within 15 s of spawn; first kill within 90 s (bots fill the server); time to fight after spawn < 8 s; average FFA life 40-90 s; duel round 45-90 s; queue-to-fight < 20 s (bot fallback).

## Interview: questions that change the build
| Question | Options | Default (auto mode) |
|---|---|---|
| Combat style | Melee + abilities (movesets) / shooter-lite (hitscan weapons) / boxing (stamina, timing) | Melee + abilities |
| Match format | Continuous FFA arena / best-of rounds duels / both | Both: FFA lobby arena + duels |
| Fighter model | Movesets as characters (fixed kit) / weapons + loadout | Movesets as characters |
| Ranked | None / local-server duel pods / cross-server queue + reserved servers | Local pods with bots; cross-server queue as a published-only stretch (BG-22) |
| Population strategy | Real players only / bot fill to a minimum | Bot fill to 8 combatants |
| Paid access | Cosmetics only / movesets purchasable (balanced equal) | Movesets earnable or purchasable, balance sim enforces equal power |

## Systems
| System | Milestone | Server owns | Client shows | Roblox APIs | Kit skills |
|---|---|---|---|---|---|
| CombatSystem | M1 | Combatant state machine, cooldowns, guard, ult, stun, combo scaling, damage | Predicted swing animations, hit-stop, VFX | `RunService.Heartbeat`, `AnimationTrack`, RemoteEvent | roblox-characters, roblox-networking |
| HitDetection | M1 | Position history, rewind, hitbox math, occlusion ray | Hit confirms | `workspace:GetServerTimeNow()`, `Player:GetNetworkPing`, `Raycast`, `GetPartBoundsInBox` | roblox-networking, roblox-physics |
| Movement actions (Dash, Ragdoll, Knockback) | M1 | Dash validation, i-frames, ragdoll state, knockback constraint | Dash FX, ragdoll visuals | `LinearVelocity`, `BallSocketConstraint`, `Humanoid:ChangeState` | roblox-physics, roblox-characters |
| Client combat controller | M1 | - | Input, lock-on, camera, prediction, UI | Input Action System, `ContextActionService`, `CameraType` | roblox-input, roblox-camera |
| ArenaSystem (FFA) | M1 | Spawn selection, respawn, streaks, bounty, kill feed | Feed, banners, scoreboard | `CollectionService`, `Players` | roblox-game-design |
| MovesetSystem | M2 | Defs, unlocks, equipped moveset, skill table | Selection UI, previews | ProfileStore | roblox-data |
| BotSystem | M2 | Bot combatants using the same action API | Bot rigs (named like players) | `PathfindingService`, `Humanoid` | roblox-npc-ai |
| DuelSystem + Ranked | M2 | Pods, queue, rounds, ELO, season | Queue UI, round banner, rank card | `OrderedDataStore`, optional `MemoryStoreService`, `TeleportService` | roblox-server-data |
| Progression + Economy | M2 | Coins, XP, unlocks, quests | Shop, collection | ProfileStore | roblox-data |
| AntiCheat | M2 | Speed/teleport/cooldown/rate checks, suspicion score | none | `RunService`, `Players:BanAsync` (manual review only) | roblox-security |
| Shop (Monetization) | M4 | Receipts, passes | Shop UI | `MarketplaceService` | roblox-monetization |
| WeaponSystem (shooter-lite option) | M4 | Hitscan with rewind, ammo, recoil seed | Viewmodel, crosshair | `Raycast`, `OverlapParams` | roblox-physics |
| Analytics + QA | M1 (QA), M4 | Events, QA commands | none | `AnalyticsService`, ServerStorage.QA | roblox-analytics, roblox-testing |

Tricky parts, exact approach:
- **Combatants are abstract.** `Combatant` records (player, bot, dummy) share one state table: `{ state, stateUntil, hp, guard, ult, cooldowns, invulnUntil, blockStartedAt, comboCount, lastHitBy }`. Players, bots, and training dummies all act through `CombatSystem.act(combatant, action, aimDir, now)`, so bots and QA use the real path.
- **State machine**: `Idle -> Startup -> Active -> Recovery -> Idle`, plus `Blocking`, `Dashing`, `Stunned`, `Ragdolled`, `Dead`. Each skill def has `startup`, `active`, `recovery`, `cooldown`, `hitbox`, `damage`, `stun`, `knockback`, `unblockable`. The client plays its animation instantly; the server timeline from the request time is authoritative and animation markers are never trusted.
- **Position history + rewind**: every `Heartbeat` each combatant's root `CFrame` and velocity are pushed into a ring buffer of 36 samples (about 0.6 s). On an attack's active frame the server computes `rewind = clamp(ping + INTERP, 0, REWIND_MAX)` with `ping = player:GetNetworkPing()` (round-trip seconds), `INTERP = 0.1`, `REWIND_MAX = 0.35`, then samples each candidate target's pose at `serverNow - rewind` (linear interpolation between samples; `workspace:GetServerTimeNow()` is the shared clock). The attacker's own pose is the live server pose. The hit test is pure math: target root point inside the attacker's oriented box (`hitbox = {size, offset}`) padded by 1.5 studs (forgives the target's own upstream latency). Candidates are the arena's combatants (<= 24), no physics query needed; non-combatant targets (destructibles) use `GetPartBoundsInBox`. After a geometric hit, a world `Raycast` from attacker chest to target chest with `RaycastParams` (`FilterType = Enum.RaycastFilterType.Exclude`, `FilterDescendantsInstances = {all combatant characters}`) rejects hits through walls.
- **Tolerance, not trust**: reject a skill request when `skillId` is not in the player's moveset, `seq` is not strictly increasing, cooldown/mana not ready, state forbids action, or aim magnitude is not 0.9-1.1. `Config.SIMULATED_PING` overrides `GetNetworkPing` in Studio so rewind is testable at 0 real latency.
- **Block and dash timing under latency**: the effective start of `Blocking` and of dash i-frames is `receivedAt - min(ping/2, 0.1)`, so a defender who pressed in time is not punished by their own latency. Perfect block = block start within 0.15 s before the hit's contact time.
- **Combo rules** (pure, in `CombatLogic`): consecutive hits on a stunned victim scale damage by `max(0.4, 0.9^(n-1))` and stun by `0.9^(n-1)`; after hit 6 or 3.0 s of continuous stunlock the victim gets wakeup invulnerability 0.5 s and a knockback burst; the 4th M1 knocks down (ragdoll 1.2 s, 40 studs/s launch).
- **Ragdoll and knockback on player characters**: the server sets attribute `Ragdoll = true` and swaps `Motor6D`s for `BallSocketConstraint`s (with `RigidConstraint` fallbacks restored on recovery); the owning client sets `Humanoid:ChangeState(Physics)` (a player's physics is simulated by their client). Knockback is a server-created `LinearVelocity` constraint on the root (MaxForce set, Debris lifetime 0.12-0.3 s) that replicates and is simulated by the owner; cosmetic prediction hint goes to the victim as an `UnreliableRemoteEvent`. Ragdoll cancel = dash input at >= 0.25 s into ragdoll, cooldown 30 s (tunable); wakeup after ragdoll = 0.4 s get-up with 0.4 s invulnerability. Dead characters use `BreakJointsOnDeath = false` plus the same ragdoll.
- **Bots**: server-driven combatants on `Humanoid` rigs. State machine `approach -> spacing -> attack -> block/dash reaction -> retreat`. Difficulty = reaction delay 0.45 / 0.30 / 0.18 s, block chance on seen windup 0.2 / 0.5 / 0.8, combo length 2 / 3 / 4. They only call `CombatSystem.act`. Bot fill keeps the arena at `MIN_COMBATANTS = 8` and removes bots as real players join.
- **Remotes and budgets**: `CombatInput` RemoteEvent (`action: number`, `seq: number`, `aim: Vector3`), rate limit 20/s burst 10. `CombatEvents` RemoteEvent batched per Heartbeat to clients within 120 studs: hit confirm, block result, stun, ragdoll, death. Cosmetics through `UnreliableRemoteEvent`. Late joiners get a snapshot of nearby combatants' state.
- **Spawn safety**: FFA respawn picks the spawn farthest from the nearest enemy (>= 60 studs preferred), 2 s spawn protection ended early by attacking; no spawn-camp scoring (kills within 3 s of a spawn give 0 coins).
- **Duel pods**: lobby `BGDuelPod` pads queue players; two matched players get a cloned duel arena at `x = podIndex * 400`, 3 s countdown, best-of-3 rounds, round reset restores HP/guard/ult/cooldowns; leaving forfeits. Rematch button. `Teleport` queue (BG-22) uses bucketed `MemoryStoreQueue`s (`AddAsync(ticket, 60)`, `ReadAsync(2, true, 0)` for atomic pairing, `RemoveAsync` after pairing), `ReserveServerAsync` + `TeleportAsync`, and `MessagingService` so each player's current server teleports its own player; verify only on a published test place.
- **QA commands**: `BG.spawnBot(player, difficulty, offsetStuds)`, `BG.spawnDummy(player, offset)`, `BG.setHp(name, n)`, `BG.setUlt(player, n)`, `BG.setSimulatedPing(player, seconds)`, `BG.setMoveset(player, id)`, `BG.forceAction(botName, action)`, `BG.startDuel(playerA, playerB)`, `BG.finishDuel(winner, loser)`, `BG.grantCoins(player, n)`, `BG.unlockMoveset(player, id)`, `BG.state(player)`.

## Data schema
```luau
--!strict
export type Rating = { elo: number, games: number, peak: number, seasonId: number }
export type BGProfile = {
	version: number,
	level: number,
	xp: number,
	coins: number,
	rating: Rating,
	stats: { kills: number, deaths: number, assists: number, wins: number, losses: number, bestStreak: number, damageDealt: number },
	equippedMoveset: string,
	movesets: { [string]: { unlocked: boolean, kills: number, mastery: number } },
	cosmetics: { owned: { [string]: boolean }, equipped: { skin: string?, killEffect: string?, emote: string?, title: string? } },
	quests: { day: number, ids: { string }, progress: { [string]: number }, claimed: { [string]: boolean } },
	login: { lastClaimDay: number, streak: number },
	redeemedCodes: { [string]: boolean },
	receipts: { [string]: number },
	ftue: { step: number, done: boolean },
	settings: { lockOn: boolean, shiftLock: boolean, damageNumbers: boolean, musicVolume: number, sfxVolume: number },
}
```
Session-only: combatant state, position history, assist tables, current arena/duel, queue ticket, bot state, simulated ping. Never save HP, cooldowns, or streaks. Migrations are pure per-version functions with fixtures; `rating.seasonId` mismatch triggers the pure `SeasonLogic.softReset`.

## Economy and tuning defaults
Pure rules in `CombatLogic`, `HitboxLogic`, `RewindLogic`, `EloLogic`, `EconomyLogic`:
- Max HP 100 (damage numbers read as percent). M1 chain 3 / 3 / 4 / 5 (4th launches); skills 8-14; ultimate 35-45 total; full combo burst about 45-60; target TTK 10-18 s against competent blocking.
- M1 timing: startup 0.10 s, active 0.10 s, recovery 0.18 s per hit (0.38 s cycle), chain window 0.60 s, after hit 4 endlag 0.9 s, reach 6 studs, hitbox 5x5x7 studs in front of the root.
- Hit stun 0.38 s (hits 1-3); knockdown ragdoll 1.2 s; hit-stop 0.06 s on both sides.
- Block: hold `F`; frontal only (120 degree arc); guard 100; blocked hit costs `damage * 4` guard (skills `* 3`); zero HP damage while guard > 0; guard break = stunned 1.5 s with guard reset to 50; guard regen 20/s after 1 s of no blocking; walk speed x0.5 while blocking; unblockable moves telegraph with a red glow 0.4 s.
- Perfect block (start within 0.15 s before contact): attacker stunned 0.6 s, no guard cost.
- Dash `Q` (direction from movement input): 18 studs in 0.22 s, cooldown 2.5 s, i-frames 0.15 s from start; forward dash is a gap-closer without i-frames.
- Ultimate: meter 0-100, gain `0.8 per damage dealt, 0.4 per damage taken`; press `G` at 100 for a 12 s transformation (+25% damage, cooldowns -30%), meter drains to 0 on use; resets on death.
- Walk speed 16, jump power 50; the anti-cheat speed cap is 24 studs/s horizontal outside dashes/knockback/ragdoll.
- Elo: `expected = 1 / (1 + 10^((Rb - Ra)/400))`, `new = Ra + K*(score - expected)`, `K = 48` for the first 10 games then `24`; start 900; tiers Bronze <1000, Silver 1000-1199, Gold 1200-1399, Platinum 1400-1599, Diamond 1600-1799, Master 1800+. Season 28 days; soft reset `900 + (elo - 900) * 0.5`. Matchmaking window starts at +-100 and widens by 50 every 5 s of waiting; bot opponent offered at 15 s (unranked, no Elo change).
- Coins: kill 20 (+5 per streak step, capped +50), assist 8 (>= 20% of the victim's HP dealt within 8 s), duel win 100, loss 30, daily quest 150-300, first win of the day +100. XP: kill 25, assist 10, win 60, `xpToNext(L) = 100 + 40*L`, cap level 50.
- Unlocks: two free movesets at start; others 3,000 / 6,000 / 10,000 / 15,000 coins (about 50 min to 4 h of play) or Robux; cosmetics 500-5,000 coins.

| Moveset | Role | Skills (damage / cooldown) | Ultimate |
|---|---|---|---|
| Brawler | Close range, grapple | Uppercut 10 / 6 s, Ground Slam 12 + stun 1.0 s / 10 s, Rush Combo 14 / 12 s, Grab 9 unblockable / 14 s | Berserk: faster M1 (0.30 s), +25% damage |
| Duelist | Reach, counters | Lunge 9 / 6 s, Parry Stance 0 (counter 12) / 9 s, Crescent Wave 11 projectile / 10 s, Flash Cut 13 / 13 s | Blade Storm: 3 hit AoE r10 |
| Pyromancer | Ranged zoning | Fire Bolt 8 projectile / 4 s, Flame Ring 10 r9 / 10 s, Blink 0 / 8 s, Meteor 14 delayed r7 / 14 s | Inferno: persistent AoE r12, 12 s |
| Shadowstep | Speed, mixups | Dash Slash 9 / 5 s, Shadow Swap 0 (teleport behind target within 30) / 9 s, Fan of Knives 10 / 10 s, Execute 16 vs <30% HP / 14 s | Phantom: untargetable 2 s then burst |

Sources: kills, wins, quests, login streaks. Sinks: movesets, cosmetics, emote packs, rename. A `MovesetBalanceSim` spec runs bot-vs-bot mirror and cross matchups in the pure combat model and asserts every moveset's win rate against the field lies in 45-55%.

## World
- Lobby "Arena Hall" 160x160 studs: Training Room door, 4 duel pods (`BGDuelPod`), ranked board, shop kiosk, moveset preview dummies, spawn center. Server MaxPlayers 20.
- FFA arenas (3): 280x280 studs, 14-18 `BGSpawn` points, central plaza plus ring of cover (pillars 8-14 studs, low walls 4 studs), ledges 6-12 studs high with ramps (no one-way fall deaths), kill plane at y = -50 with 5 s respawn.
- Duel arenas (2): 110x110 flat with 4 pillars, spawns 60 studs apart, soft boundary ring (leaving for 3 s deals 10 HP/s).
- Lighting: `ClockTime` 17.8 golden hour (clear silhouettes), `Atmosphere` density 0.2, `Bloom` 0.4, `ColorCorrection` contrast +0.1 saturation +0.15, strong key light; floor tint dark, characters high-contrast, hit FX saturated.
- Art direction: stylized fighters (`HumanoidDescription` defaults per moveset or a custom rig), big readable hit sparks, ground rings for AoE, minimal clutter so combat reads from the camera.
- Tags: `BGSpawn`, `BGArena` (attr `ArenaId`), `BGDuelPod`, `BGQueuePad`, `BGDummy`, `BGKillPlane`, `BGTrainingZone`.

## UI and input
- HUD: top-center own HP and guard bars, left ult ring, bottom skill icons 1-4 with cooldown sweep and key hint, billboard HP bars over enemies within 60 studs (hidden in duels except target), kill feed top-right, streak banner, damage numbers, ping label (from `GetNetworkPing`), lock-on reticle.
- Screens: moveset select, cosmetics, queue (Ranked/Unranked/Bot), rank card, shop, quests, settings.
- Input via Input Action System `Combat` context: M1 (LMB/RT), skills 1-4 (number keys/face buttons), `G` ult, `Q` dash, `F` block, `T` lock-on, with priority above defaults. Camera: over-the-shoulder shift-lock default; lock-on keeps the target in frame within 40 studs and rotates the character toward it.
- Mobile: right cluster big M1 and Dash, skills as a 4-button arc, Block as hold button, automatic lock-on to the nearest enemy within 30 studs and a 25 degree aim assist (the client only turns the character; hit forgiveness comes from the server's shared hitbox padding). Gamepad: stick move, RT M1, LT block, face buttons skills, RB dash, R3 lock-on.

## FTUE
First 60 s:
1. 0-5 s: spawn in the Training Room (no menus), moveset Brawler equipped, dummy 6 studs ahead with a pulsing hint "Click".
2. 5-20 s: land a full 4-hit chain; the 4th hit launches the dummy (big hit-stop, shake); ult meter fills visibly.
3. 20-35 s: dummy begins attacking with a red windup; hint "F to block" appears once; successful block pops "Blocked!" with a ping sound.
4. 35-50 s: dash taught by a telegraphed dummy slam; dash through it for "Dodged!".
5. 50-60 s: queue to the Arena with 7 easy bots; first kill within 90 s.
First 5 min:
6. 1:00-3:00 FFA with easy bots (protected newbie lobby: first 5 matches have only Easy/Normal bots and half bounty damage on the new player); first kill, first assist, first coins popup.
7. 3:00-4:00 unlock preview: Pyromancer dummy fight offered for free once; coins to 3,000 shown as a progress bar.
8. 4:00-5:00 first bot duel (unranked), win shown with rank card teaser (900 Elo, "Play 10 to get ranked"), daily quests granted.
Tutorial is skippable after first completion; `ftue.step` persists.

## Monetization
| Item | Type | Default price (R$) | Rule |
|---|---|---|---|
| Moveset (Pyromancer / Shadowstep / later) | Dev product (unlock once) | 399 / 599 / 799 | Access only; balance sim enforces equal power; also earnable with coins |
| 2x Coins | Game pass | 299 | Coins only, not XP or Elo |
| VIP | Game pass | 499 | Chat tag, lobby aura, +10% coins, 1 extra cosmetic slot |
| Emote pack | Game pass | 149 | Cosmetic |
| Kill effects / skins | Dev product (direct) | 99-499 | Cosmetic, no random outcomes |
| Season pass (28 days) | Dev product | 499 | Cosmetic reward track, no power; entitlement stored with season id |
| Coin packs S / M / L | Dev product | 49 / 149 / 399 | Skips the cosmetic/moveset grind only |

Policy: never sell damage, cooldowns, HP, or Elo; no ranked advantages. No Robux crates in the default build (they are paid random items needing odds disclosure and `ArePaidRandomItemsRestricted` handling); if the user adds crates, add that path in the same milestone. No public "most Robux spent" boards. Enable paid private servers on the experience page. All receipts through one idempotent handler keyed by `PurchaseId`.

## Retention and social
- Daily quests (3 of 10): get 15 kills, win 2 duels, use the ultimate 3 times, block 20 hits; 150-300 coins each plus a weekly chest of cosmetics earned by completing 15 dailies.
- Login streak 7 days: coins, emote, title on day 7.
- Leaderboards (server-written `OrderedDataStore`, cached 60 s): weekly kills, season Elo, best streak. Season rewards by tier (title, effect, aura) at season end.
- Social: friend duel challenge via `ProximityPrompt` or party UI; rematch button; killcam showing the killer's last 3 s; clan tag from Roblox group; `SocialService:PromptGameInvite` button in the lobby.
- Bounty: players on a 7+ streak get a map-visible beacon and +100 coins to whoever ends it.
- Codes: server table with expiry, one redeem each. Content cadence: new moveset every 2-3 weeks, new arena every 4 weeks, seasonal event with limited cosmetics.

## Feature list skeleton
M0 additions: arena/pod blockout tags and definition validation (BG-01, BG-02).

Milestones: M0 BG-01–02 · M1 BG-03–10 · M2 BG-11–15, BG-19 · M3 BG-16–18 · M4 BG-20–24 (BG-23 only when shooter-lite is chosen).

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| BG-01 | Definitions + Config (MovesetDefs, SkillDefs, CosmeticDefs, ArenaDefs) | - | Spec iterates every skill: `startup/active/recovery > 0`, cooldown >= `startup+active+recovery`, hitbox sizes positive, moveset has 4 skills + ult, ids unique; failure names the id |
| BG-02 | Lobby, FFA arena, duel arena, training room blockout with tags | BG-01 | Playtest: Server `execute_luau` counts `BGSpawn` >= 14 per arena, `BGDuelPod` == 4, `BGKillPlane` present; screen_capture of arena readability |
| BG-03 | CombatLogic: pure damage, combo scaling, stun, guard, and ult rules | BG-01 | Spec: M1 chain 3/3/4/5; combo scale `0.9^(n-1)` floor 0.4; guard cost x4/x3; guard break at 0; perfect block window edge (0.149 ok, 0.151 not); ult gain 0.8/0.4 and cap 100; never negative HP; NaN rejected; inputs not mutated |
| BG-04 | CombatSystem: state machine, M1 chain, remotes, rate limit | BG-03 | Playtest: `BG.spawnDummy`, `user_mouse_input` click x4 at 0.4 s spacing; dummy HP drops by 15 (+- combo scale), 4th hit sets knockdown; spamming 60 clicks/s yields accepted actions <= burst + rate; console clean |
| BG-05 | HitDetection: history buffer, rewind, hitbox math, occlusion ray | BG-04 | Spec: ring buffer returns exact sample at stored time, interpolates midpoints, clamps beyond range; hitbox accepts/rejects boundary points (+-0.01); rewind clamps to 0.35. Playtest: `BG.setSimulatedPing(p, 0.15)`, bot strafes at 16 studs/s, attacker aims at displayed position, server registers the hit; with ping 0.6 (over cap) the same swing misses; wall between attacker and target blocks the hit |
| BG-06 | Block, perfect block, dash, i-frames | BG-04 | Spec: block arc 120 degrees, back hit not blocked, unblockable ignores block, dash cooldown 2.5 s, i-frame 0.15 s. Playtest: `BG.forceAction(bot, "M1")` while holding F (`user_keyboard_input`) -> 0 HP lost, guard -12; press F 0.1 s before contact -> perfect block, bot stunned 0.6 s; dash through a skill takes 0 damage |
| BG-07 | Ragdoll, knockback, ragdoll cancel, wakeup | BG-04 | Spec: ragdoll durations, cancel cooldown 30 s, wakeup invulnerability. Playtest: land 4th hit, victim attribute `Ragdoll == true`, Motor6D replaced by BallSockets then restored (Server counts), dash cancel works once then is refused for 30 s; no leftover constraints (count == 0 after recovery) |
| BG-08 | Client combat controller: input, prediction, hit-stop, lock-on camera | BG-04, BG-06 | Playtest: pressing LMB plays the swing track instantly (Client `execute_luau` lists playing tracks); lock-on `T` sets target and camera subject; mobile layout buttons exist when `TouchEnabled` simulated; reduced-motion disables shake |
| BG-09 | HUD: HP, guard, ult, skills, kill feed, damage numbers | BG-08 | Playtest: Client bars equal Server values after `BG.setHp`; kill feed shows a line after `BG.setHp(botName, 0)`; screen_capture with no overlapping elements at 16:9 and phone aspect |
| BG-10 | FFA arena loop: spawn selection, respawn, streaks, bounty, scoring | BG-04 | Spec: spawn chooser picks farthest from enemies, ties deterministic; streak/coin formula; spawn-camp rule (kill within 3 s gives 0). Playtest: kill a bot with `BG.setHp`, respawn after 3 s with 2 s protection (Server `invulnUntil`), streak counter increments |
| BG-11 | Movesets 1-4 with skills and ultimates | BG-05, BG-06, BG-07 | Spec: each skill respects cooldown and unlock; Execute only <30% HP; Shadow Swap range 30. Playtest: for each moveset cast all skills on a dummy and assert damage within +-10% of def and cooldown attributes set; screen_capture per ultimate |
| BG-12 | BotSystem + bot fill | BG-04, BG-10 | Spec: reaction delay and block chance per difficulty with injected RNG. Playtest: lobby with 1 real player has 8 combatants; joining a second QA player removes one bot; Hard bot blocks > Easy bot over 30 attempts (counts via Server) |
| BG-13 | Profile, progression, economy, moveset unlocks | BG-03, BG-10 | Spec: migrations; XP/level boundaries; coin formulas incl. cap; unlock cost checks. Playtest: `BG.grantCoins`, buy moveset, equip, rejoin persists |
| BG-14 | Duel pods, rounds, Elo, seasons | BG-10, BG-13 | Spec: Elo expected/new values for fixtures (900 vs 900 win with K 48 -> 924), K switch at game 10, soft reset formula, matchmaking window widening. Playtest: `BG.startDuel`, play best-of-3 via QA `BG.finishDuel`, ratings change, arena cleaned up, players returned to lobby |
| BG-15 | AntiCheat plausibility checks | BG-05 | Spec: speed/teleport detector with synthetic position traces (legit dash passes, 40 studs/s fly flagged), suspicion score decays and requires threshold; Playtest: Server `execute_luau` teleports a QA character 200 studs, suspicion event logged, action rejected, no kick |
| BG-16 | Content: 3 FFA maps, 2 duel maps, 6 movesets, 30 cosmetics | BG-11, BG-14, BG-19 | BG-01 validators green; MovesetBalanceSim (BG-19) green; each map loaded once, spawns valid (no spawn inside geometry via overlap check) |
| BG-17 | Juice and audio: hit sparks, hit-stop, camera shake, ult cinematic, kill effects | BG-08 | Playtest: FX counters increase on hit, ult has camera lerp and ends cleanly (no stuck FOV), pooled FX count returns to baseline |
| BG-18 | FTUE and Training Room | BG-06, BG-12 | Playtest: scripted 60 s tutorial completes; `ftue.step` persists across rejoin; first FFA includes only Easy/Normal bots for the first 5 matches |
| BG-19 | MovesetBalanceSim spec | BG-11 | Spec runs mirror and cross matchups for N=500 seeded fights per pair; asserts each moveset win rate 45-55% vs the field and TTK median 10-18 s |
| BG-20 | Monetization: passes, products, receipts, season pass | BG-13 | Spec: receipt handler 5-case table; moveset grant idempotent by `PurchaseId`; season pass entitlement keyed by season id |
| BG-21 | Daily quests, login streak, leaderboards, codes | BG-14 | Spec: UTC day boundary, quest pool seeding, code single-use. Playtest: QA day advance, quests regenerate, rewards granted once; board readable via `execute_luau` Server |
| BG-22 | Cross-server ranked queue (published-only) | BG-14 | Spec: bucket math and window widening are pure; code review of `ReadAsync(2, true, 0)` pairing, `RemoveAsync`, reserved teleport with `SetTeleportData`; validated on a published test place; Studio path stays on local pods |
| BG-23 | Shooter-lite WeaponSystem (only if chosen) | BG-05 | Spec: ray-vs-capsule rewind fixtures (hit/miss/headshot), falloff table. Playtest: bot at 40 studs takes expected damage; shots behind a wall do nothing |
| BG-24 | Analytics, performance and publish readiness | BG-20 | Spec: payload builders; playtest with 20 combatants (12 bots) all spamming M1 keeps server heartbeat < 8 ms; no per-hit Instance creation without pooling |

## Playtest scripts
1. **M1 chain** - start play; `QA:Invoke("BG.spawnDummy", p, 6)`; face the dummy with `character_navigation`; `user_mouse_input` left click x4 at 0.4 s spacing; Server `execute_luau` returns dummy `hp` expecting `100 - (3+3+4+5)*scale`, state `Ragdolled`; `get_console_output` clean; `screen_capture` mid-hit-stop.
2. **Block and dash** - `BG.spawnBot(p, "Hard", 8)`; `BG.forceAction(bot, "M1")` repeatedly; hold `F` with `user_keyboard_input`; assert Server `guard` decreases and `hp` stays 100; release, tap `Q` as the bot swings, assert `hp` unchanged and dash cooldown attribute > 0.
3. **Lag compensation** - `BG.setSimulatedPing(p, 0.15)`; `BG.spawnBot(p, "Normal", 6)` set to strafe; `BG.forceAction(p, "M1")` aimed at the bot's rewound position; Server returns `hit=true`; repeat with ping 0.6 expecting `hit=false`; wall-test by placing a part between.
4. **Duel and Elo** - `BG.startDuel(a, b)` with a QA second player (bot-controlled for the test), `BG.finishDuel(a, b)` x2; assert ratings (924 and 876 after the first win from 900/900) and that the arena instance is destroyed.
5. **Population** - join with one player; assert `BG.state` shows 8 combatants (7 bots); add a QA player; assert 7 combatants.

## Design rules
1. Every attack has a startup of at least 0.1 s and a visible tell; no instant hits except grabs with an extra 0.2 s telegraph.
2. The server decides all hits; the client is allowed to predict presentation only, and the server rewind is capped.
3. Every move has a counter: block, dash, spacing, or a punish window; unblockables are slow and telegraphed.
4. No combo is infinite: combo damage scaling, stun decay, and a wakeup burst end any stunlock within 3 s.
5. Movesets are equal in power; unlock paths (coins or Robux) buy variety, never strength. The balance sim runs on every moveset change.
6. New players meet bots or lower-tenure opponents first; the first 5 matches never put them against veterans.
7. An empty server never looks empty: bots fill to 8 combatants and are removed as humans join.
8. Time to fight after death is under 8 s; time to queue to duel under 20 s with a bot fallback.
9. Latency compensation is symmetrical: attacker's hits that looked good register (up to the cap), defender's blocks/dashes pressed in time count.
10. Kill streaks give visible bounties, not stats, so snowballing creates targets instead of runaways.
11. Cosmetic reads win: moveset silhouettes and hit effects are recognizable at 60 studs on a phone.
12. Everything cleans up: ragdoll constraints, knockback movers, FX, duel arenas, and bot rigs are destroyed on exit/disconnect/timeout.

## Analytics
- Onboarding funnel: 1 Spawn, 2 FirstM1Chain, 3 FirstBlock, 4 FirstDash, 5 FirstKill, 6 FirstDuel, 7 FirstMovesetUnlock.
- Combat custom events: `Kill` (field 1 = moveset, field 2 = victim type human/bot), `Death` (field 1 = killer moveset), `UltUsed`, `PerfectBlock`, `GuardBreak`, `DuelEnd` (value = seconds; field 1 = result).
- Matchmaking: `QueueTime` (value seconds; field 1 = mode), `BotFallbackUsed`, `MatchAbandoned`.
- Economy: currencies `Coins` only (plus optional `Tokens`); sources `Gameplay` (SKU `Kill`, `Win`, `Quest`, `Login`), `IAP`; sinks `Shop` (SKU `Moveset_<id>`, `Cosmetic_<id>`).
- Balance telemetry: win rate per moveset and per Elo band, TTK distribution, share of players per moveset, rejected-action counts per cause (cooldown, rate, state, implausible), suspicion events per 1,000 matches.
- Analytics are server-only and not sent from Studio; validate payload builders by spec and delivery on a published test place.
