# RPG recipe

Loaded by `game-spec` when the pitch is an RPG (action RPG, dungeon crawler, anime-style questing RPG) or a hybrid with one. Numbers are starting defaults: they go into `Config` tables in the `*Logic` modules and get tuned from playtests.

Contents: Fantasy and references · Loop and pacing · Interview · Systems · Data schema · Economy and tuning · World · UI and input · FTUE · Monetization · Retention and social · Feature list skeleton · Playtest scripts · Design rules · Analytics.

## Fantasy and references
Fantasy: "I start as a nobody with a wooden weapon and become the strongest in the world: zones, bosses, gear, and a build only I have."
- Blox Fruits: the genre's long-running benchmark. Level-gated seas and quest chains, one-tap quest givers, unlockable movesets. Lesson: every level range has an obvious next quest and next island.
- Sailor Piece: a fast-rising progression-fantasy anime RPG. Lesson: the thumbnail promise (noob becoming strong) must be true in the first minute.
- Arise Crossover: timed dungeon gates with ranks and collectible companions. Lesson: scheduled world events give the whole server a shared reason to gather.
- Dungeon Quest: instanced loot dungeons with class builds. Lesson: a repeatable 8-12 minute dungeon with a boss and a loot roll is the strongest endgame loop.
- Deepwoken: skill-based RPG with a very high skill ceiling. Lesson: depth in combat feel and build stats keeps D30 players; do not dilute it.
- Spec note: original worlds, characters, and move names only; no licensed IP.

## Loop and pacing
- Core (30-90 s): find mob pack -> M1 chain + skills + dodge -> kill -> XP/gold/loot pop -> next pack.
- Meta (10-30 min): accept quest -> clear area -> boss or dungeon run -> new gear -> allocate stat points -> unlock next area.
- Long term (days-weeks): weapon mastery trees, gear upgrades to +10, dungeon difficulty tiers, world boss, leaderboards, new zone every 2-3 weeks.
- Targets (pure-combat time): level 2 at 20 s; level 5 at 3 min; level 10 at about 12 min; level 30 at about 75 min; level 50 at about 3 h; level 70 (cap) at about 5 h. Zone boss every 15-25 levels; first dungeon run by minute 20.

## Interview: questions that change the build
| Question | Options | Default (auto mode) |
|---|---|---|
| Combat model | Hotbar skills + M1 combo / tab-target auto-attack / shooter-style | M1 combo + 3 skills + dodge, soft lock-on |
| Build axis | Weapon archetypes with mastery / classes chosen once / fruits-style powers | Weapon archetypes (Blade, Arcane, Fist) with mastery |
| Dungeon structure | In-place instanced copies / reserved-server dungeon place | In-place instanced copies; Teleport mode behind `DungeonConfig.MODE` |
| Co-op | Solo only / parties of 2-4 | Parties of 1-4 |
| PvP | None / opt-in duel zone / open world | None (opt-in duel pad as M4 stretch) |
| Randomness for sale | None / cosmetic crates | None; all drops are earned (no paid-random policy surface) |

## Systems
| System | Milestone | Server owns | Client shows | Roblox APIs | Kit skills |
|---|---|---|---|---|---|
| CombatSystem | M1 | Skill state machine, cooldowns, mana, hit windows, damage, i-frames, poise | Animations, hit-stop, VFX, damage numbers, lock-on marker | `OverlapParams`, `WorldRoot:GetPartBoundsInBox`, `Spherecast`, `AnimationTrack` | roblox-physics, roblox-characters, roblox-animation-vfx |
| MobSystem | M1 | Spawners, mob rigs, AI state, aggro table, leash, respawn, death | Mob plates (HP, level), telegraphs, death FX | `PathfindingService`, `CollectionService`, `Humanoid` | roblox-npc-ai, roblox-performance |
| Progression | M1/M2 | XP, level, stat points, mastery, derived stats | Level-up burst, stat panel, mastery bar | ProfileStore | roblox-game-design, roblox-data |
| LootSystem | M2 | Drop tables, per-player instanced rolls, pity, gold | Loot pickup beams, rarity colors, toasts | `Random`, `RemoteEvent` | roblox-security |
| Inventory + Equipment | M2 | Item records, equip slots, upgrades, shop, sell | Inventory grid, compare tooltip | ProfileStore | roblox-gui |
| QuestSystem | M2 | Quest state, objective hooks, rewards, NPC prompt validation | Tracker, NPC marker, dialog | `ProximityPrompt` | roblox-game-design |
| BossSystem | M2 | Phase table, telegraph scheduler, poise, enrage, loot credit | Boss bar, ground telegraphs, intro camera | `TweenService`, `Debris` | roblox-npc-ai, roblox-camera |
| World (Waypoints, Zones, Events) | M2/M3 | Unlocked waypoints, fast travel, zone attribute, scheduled Gate/World Boss | Zone banners, lighting tween, event timers | `workspace:GetServerTimeNow()`, `os.time` | roblox-lighting, roblox-audio |
| DungeonSystem | M3 | Instance clone/offset, rooms, scaling, party, rewards, cleanup | Room doors, progress bar, results | `PivotTo`, `TeleportService:ReserveServerAsync` (Teleport mode) | roblox-building, roblox-server-data |
| PartySystem | M3 | Membership (max 4), shared credit, invites | Party frames, ping markers | `SocialService:PromptGameInvite`, `Players` | roblox-networking |
| Shop (Monetization) | M4 | Pass ownership, receipts, boosts | Shop UI | `MarketplaceService` | roblox-monetization |
| Meta (Daily, Boards, Codes) | M4 | Streak, quests of the day, board writes, codes | Panels | `OrderedDataStore` | roblox-server-data |
| Analytics + QA | M1 (QA), M4 | Events, QA commands | none | `AnalyticsService`, ServerStorage.QA | roblox-analytics, roblox-testing |

Tricky parts, exact approach:
- **Server-run hit windows, client-played animations.** `UseSkill(skillId, aimDir)` remote: rate limit (12/s, burst 6) -> types (`skillId` string in the player's loadout, `aimDir` finite Vector3 with magnitude 0.9-1.1, flattened) -> alive and not stunned -> cooldown and mana -> start a server `SkillInstance`. The skill table gives `windup`, `activeStart`, `activeEnd`, `shape`. During the active window (evaluated on `Heartbeat`) the server runs `workspace:GetPartBoundsInBox(CFrame.lookAt(root.Position + dir * size.Z/2, ...), size + Vector3.new(3, 0, 3), overlap)` where `overlap` is an `OverlapParams` with `FilterType = Enum.RaycastFilterType.Include`, `FilterDescendantsInstances = {workspace.Mobs}` and `MaxParts = 40`; parts map to mob models via `FindFirstAncestorOfClass("Model")`, deduped per skill hit (`hitSet`; multi-hit skills reset it on their interval). The extra 3 studs of padding forgives mob latency. The client plays its animation immediately; the server timeline is authoritative and animation markers are presentation only.
- **Projectiles** are server records swept per `Heartbeat` with `workspace:Spherecast(prev, radius, step, params)` plus an initial `GetPartBoundsInRadius` at spawn (casts miss initial overlaps); max lifetime 2 s; the client renders a visual with the same speed.
- **Dodge**: Q, 12 studs over 0.3 s via a server-created `LinearVelocity` (MaxForce set, Debris 0.3 s) so the owning client simulates it; i-frames are server state `invulnUntil = now + 0.2`; cooldown 1.2 s. Mobs ignore players with `invulnUntil` in their hit resolution.
- **Mob AI**: state machine `idle -> chase -> windup -> attack -> recover -> return -> dead`. Tick at 8 Hz staggered by `mob.id % 8`; only mobs within `ACTIVE_RANGE` (140 studs) of a player tick, others sleep. Direct `Humanoid:MoveTo` when a clear `Raycast` to target exists, else `PathfindingService` with a retry cap. `SetNetworkOwner(nil)` after unanchoring. Leash: return and heal fully when > 60 studs from spawn or no target for 6 s. Server cap 150 live mobs; spawners respect it. Attack windup is visible 0.35-0.6 s (color flash + sound) so damage feels fair.
- **Aggro/credit**: threat table by damage; party members share threat. XP/gold go to players with >= 15% of the mob's max HP in damage within 100 studs of the kill; loot is rolled separately per eligible player.
- **Poise and bosses**: bosses are immune to stagger until `poise` (100) breaks (light hits 4, skills 15); a break stuns 1.5 s then poise resets. Phases trigger at HP thresholds from `BossDefs` (e.g. 100/66/33%); each phase adds an attack to the telegraph scheduler. Telegraph = server-created decal/part on the ground 0.9-1.5 s before damage, damage resolved by a server overlap at the end. Enrage at 180 s multiplies damage by 1.5. Boss HP scales `x (1 + 0.55 * (partySize - 1))`.
- **Dungeon instancing (in place)**: `DungeonSystem.create(defId, tier, party)` clones `ServerStorage.Dungeons.<id>` into `workspace.DungeonInstances` at `x = instanceIndex * 2000, y = 300`; party `PivotTo` entry after the client reports `ArenaReady` (client `WaitForChild` on the room primary part, 8 s timeout) behind a loading overlay; rooms lock doors until their mob tag count is 0; on completion/abandon/all-dead the instance is destroyed and players return to the gate. Teleport mode uses `ReserveServerAsync` + `TeleportAsync` with `SetTeleportData({defId, tier})`, validated on arrival (same rules as any join data); it cannot be tested in Studio.
- **Quests**: objective hooks are events (`MobKilled`, `ItemCollected`, `BossKilled`, `ZoneEntered`) fired by systems into `QuestSystem`; never poll. `ProximityPrompt.Triggered` handlers re-check distance <= `MaxActivationDistance + 3` against the server position and quest prerequisites (prompts are untrusted input).
- **Scheduled world events**: slot index `floor(os.time() / 1200)`; `Gate` opens on even slots for 6 min, `World Boss` every third hour-slot; every server derives the same schedule, so no cross-server messaging is needed.
- **QA commands**: `RPG.spawnMob(player, defId, offsetStuds)`, `RPG.spawnBoss(player, bossId)`, `RPG.grantXp(player, n)`, `RPG.setLevel(player, n)`, `RPG.setStats(player, {str=..})`, `RPG.grantGold(player, n)`, `RPG.grantItem(player, defId, rarity)`, `RPG.setHp(player, n)`, `RPG.godMode(player, bool)`, `RPG.dealDamage(modelName, amount)`, `RPG.acceptQuest(player, id)`, `RPG.startDungeon(player, defId, tier)`, `RPG.clearRoom(instanceId, index)`, `RPG.state(player)` (returns one summary string).

## Data schema
```luau
--!strict
export type ItemRecord = {
	id: string, -- GUID
	defId: string,
	rarity: number, -- 1 Common .. 5 Legendary
	itemLevel: number,
	plus: number, -- 0..10, deterministic upgrades
	rolls: { [string]: number }, -- bonus stats rolled at drop, e.g. { crit = 3 }
	locked: boolean,
}
export type QuestState = { id: string, step: number, progress: { [string]: number }, accepted: number }
export type RPGProfile = {
	version: number,
	level: number,
	xp: number,
	statPoints: number,
	stats: { str: number, vit: number, spi: number, agi: number },
	weaponMastery: { [string]: { level: number, xp: number } }, -- keyed by weapon type
	gold: number,
	gems: number, -- cosmetic-shop currency from achievements and dailies (not sold for Robux)
	inventory: { ItemRecord },
	inventoryCap: number, -- default 60
	equipment: { weapon: string?, armor: string?, accessory: string? }, -- ItemRecord ids
	hotbar: { string }, -- skill ids bound to Z X C + ult
	quests: { active: { QuestState }, completed: { [string]: boolean }, daily: { day: number, ids: { string }, done: { [string]: boolean } } },
	waypoints: { [string]: boolean },
	bossKills: { [string]: number },
	dungeonClears: { [string]: { [string]: number } }, -- defId -> tier -> count
	pity: { bossEpic: number },
	login: { lastClaimDay: number, streak: number },
	redeemedCodes: { [string]: boolean },
	receipts: { [string]: number },
	ftue: { step: number, done: boolean },
	settings: { autoAttack: boolean, damageNumbers: boolean, musicVolume: number, sfxVolume: number },
}
```
Session-only: current HP/mana, cooldown end times, combo index and timers, `invulnUntil`, aggro tables, party, dungeon instance id, spawn protection, last damage time. Derived stats are recomputed from profile + equipment on change (`StatsLogic.derive`), never saved.

## Economy and tuning defaults
Pure formulas live in `StatsLogic`, `CombatLogic`, `LootLogic`, `EconomyLogic`:
- `xpToNext(L) = floor(25 * L^1.6)`; `xpPerKill(e) = floor(10 + 4.5 * e) * clamp(1 + 0.1 * (e - L), 0.1, 1.3)` (grey mobs give 10%). Party bonus +10% per extra member in range.
- Derived: `maxHp = 100 + 20*(L-1) + 15*vit`; `maxMana = 50 + 3*L + 5*spi`; `attackPower = weaponPower * (1 + 0.012*str)` for Blade/Fist, `* (1 + 0.012*spi)` for Arcane; `critChance = min(0.5, 0.05 + 0.0015*agi)`, crit x1.5; `def = armorPower + 2*vit`.
- `weaponPower(item) = basePower * 1.07^itemLevel * (1 + 0.08*plus) * rarityMult` with rarityMult 1.0 / 1.15 / 1.35 / 1.6 / 2.0.
- Damage: `floor(attackPower * skillMult * rand(0.95, 1.05) * (crit and 1.5 or 1) * (1 - mitigation))`, `mitigation = def / (def + 40 + 12 * attackerLevel)`, RNG injected.
- Mob: `hp(L) = floor(10 * L^1.2 + 20)`, `damage(L) = 6 + 2.6 * L`, `gold(L) = floor(3 + 1.6 * L)`, bosses `hp x 40`, `damage x 1.6`, party scaling `x (1 + 0.55 * (n - 1))`. Dungeon tiers Normal/Heroic/Mythic: stat x 1 / 1.5 / 2.2, loot weight shift toward higher rarity x 1 / 1.3 / 1.7.
- Stat points: 3 per level. Mastery: `masteryXp = 1 per kill, 5 per boss`; `masteryToNext(m) = 20 + 12*m`; skills unlock at mastery 1 / 3 / 7 and ult at 12.
- Combat timings: M1 chain 4 hits with multipliers 0.9 / 0.9 / 1.0 / 1.4, 0.38 s per hit, combo resets after 0.9 s idle, final-hit recovery 0.55 s, hit-stop 0.05 s, mob stagger 0.25 s (not bosses), player post-hit i-frames 0.35 s, dodge cooldown 1.2 s with 0.2 s i-frames, potion heals 40% max HP with 12 s cooldown, respawn 3 s with 2 s spawn protection.
- Loot: mob item drop 6% (weights Common 70 / Uncommon 22 / Rare 7 / Epic 1); boss guaranteed item (Uncommon 40 / Rare 40 / Epic 17 / Legendary 3); pity: 10 consecutive boss rolls without Epic+ guarantees Epic. Luck is a gear stat only and is never sold. Upgrades are deterministic: `upgradeCost(itemLevel, plus) = floor(60 * 1.12^itemLevel * 1.5^plus)`, no failure, no item loss.
- Shop: potion `20 + 2.5*L` gold, waypoint teleport free once unlocked (5 s cast, cancelled by damage), stat respec 2000 gold or a Respec Token, sell price 25% of upgrade-inclusive value.

Sources: kills, quests, boss/dungeon rewards, daily/login, codes. Sinks: upgrades, potions, respec, shop gear, cosmetics, inventory expansion (gold sink in 10-slot steps). Target gold flow: about 15-20k gold/hour at levels 20-30 against about 66k to reach +10 on a level-20 weapon, so a full upgrade is a 3-4 hour sink while drops keep replacing gear.

| Config key | Default |
|---|---|
| `PLAYER_MAX_LEVEL` | 70 |
| `ACTIVE_RANGE` / `LEASH_RANGE` | 140 / 60 studs |
| `MOB_CAP` per server | 150 |
| `MAX_PLAYERS` per server | 24 |
| `PARTY_MAX` | 4 |
| `INVENTORY_CAP` | 60 (+30 pass) |
| `CRIT_CAP` | 0.5 |
| `LevelPacing` kill rate assumption | 8 kills/min early, 10 mid |

## World
- Hub "Emberfall Town" 300x300 studs: waypoint crystal at spawn, 6 NPCs (Quest Giver, Blacksmith, Potion Seller, Stat Trainer, Dungeon Warden, Daily Board), safe zone volume (no damage, no mobs), dungeon gates on an outer ring.
- Zones (each bounded by `ZoneVolume` parts, walkable corridors between, all 8-12 min walk end to end at 16 studs/s):

| Zone | Levels | Size (studs) | Mobs | Boss | Dungeon |
|---|---|---|---|---|---|
| Verdant Meadow | 1-10 | 600x600 | Slime, Boar, Bandit | Slime King (L8) | Goblin Warren (10+) |
| Whisperwood | 10-25 | 700x700 | Wolf, Spider, Cultist | Elder Treant (L22) | - |
| Sunscar Dunes | 25-45 | 800x800 | Scorpion, Mummy, Sand Wraith | Pharaoh Golem (L42) | Crypt of Ash (30+) |
| Frostspire Peaks | 45-70 | 800x800 | Yeti, Ice Mage, Frost Hound | Frost Wyrm (L68) | Dragon Spire (55+) |

- Layout rules: spawners 40-60 studs apart with 3-5 mobs of one type; a waypoint every 250 studs; first mobs within 20 studs of the hub exit; landmarks visible from each waypoint; level-gated paths blocked by cliffs/water/bosses (soft gate: higher-level mobs, not invisible walls).
- Lighting: `ClockTime` 14 (Meadow), 17.5 warm sunset (Dunes), 6 blue dawn (Frostspire), 20 moonlit (Whisperwood); `Atmosphere` density 0.3 and haze tinted per zone; `Bloom` intensity 0.35, `ColorCorrection` saturation +0.2 and contrast +0.05, `SunRays` 0.1. The server sets `Player:SetAttribute("Zone", id)` from point-in-volume tests every 1 s; the client tweens lighting over 2 s.
- Art direction: stylized anime look, bold color blocking with neon trim accents, saturated enemy tints per zone, big readable telegraphs, silhouettes distinct per mob family.
- Tags: `Mob`, `MobSpawner` (attrs `DefId`, `Max`, `Respawn`, `Radius`), `QuestNPC` (attr `NpcId`), `BossArena`, `Waypoint`, `SafeZone`, `ZoneVolume` (attr `ZoneId`), `LootChest`, `DungeonGate`, `ShopNPC`, `DungeonRoom`.

## UI and input
- HUD: bottom-left HP/mana bars, top-center zone name, bottom hotbar (M1, Z, X, C, Ult, Dodge, Potion) with cooldown radials, top-left level + XP bar and quest tracker (3 lines), mini compass; floating damage numbers (white normal, yellow crit, red taken), mob plates above heads (name, level, HP bar) only within 40 studs.
- Screens: character (stats, allocate), inventory + compare tooltips, quest log, map with waypoints, dungeon select, shop, party, settings.
- Input via Input Action System: `Combat` context (`Attack`, `Dodge`, `Skill1-3`, `Ultimate`, `Potion`, `LockOn`, `Interact`) with priority above defaults. Soft lock-on: nearest mob in a 40 degree cone within 25 studs gets a marker; `aimDir` snaps to it.
- Mobile: right-thumb cluster with large Attack button (hold = auto-chain), three skill buttons, Dodge above it; auto-attack toggle in settings; interact prompt as large button; lock-on automatic. Gamepad: RT attack, X/Y/B skills, A dodge, LT lock-on, d-pad potion and menu.

## FTUE
First 60 s:
1. 0-8 s: weapon archetype pick (3 cards with 2-second preview loops); the choice sets hair/color accent too.
2. 8-15 s: spawn on the Meadow edge with the weapon equipped and a slime 12 studs ahead (soft lock-on marker pulsing); prompt "Tap to attack" (3 words).
3. 15-35 s: kill 3 slimes; first kill pops `+XP`, level 2 at about 20 s with a burst and a stat point auto-allocated to the archetype's main stat (editable later).
4. 35-60 s: unlock Z skill via mastery 1 (kill 2 more); hint pulses once; level 3.
First 5 min:
5. 1:00-2:30 first quest from a visible NPC with a floating arrow; objective is 6 boars and 1 collectible; level 4.
6. 2:30-3:30 dodge taught by the first bandit's visible windup (pulsing "Dodge" button once).
7. 3:30-5:00 Slime King mini-fight (shielded tutorial boss: cannot kill the player below 1 HP once, then normal); drops the first Rare weapon, auto-equip prompt; level 5; Dungeon Gate teased in the distance with a glowing portal; daily board unlocked.
Zero required reading; every beat is an action. Death during the FTUE respawns on the spot with no penalty.

## Monetization
| Item | Type | Default price (R$) | Rule |
|---|---|---|---|
| 2x XP | Game pass | 399 | Not stackable with the XP boost product; applies to XP only |
| 2x Gold | Game pass | 299 | Gold from kills/quests only |
| VIP | Game pass | 599 | Chat tag, cosmetic aura, +10% mastery XP, +10 inventory |
| Inventory +30 | Game pass | 149 | Default cap 60 |
| Extra hotbar preset | Game pass | 199 | Convenience, no power |
| Gold pack S / M / L | Dev product | 25 / 99 / 399 | Amount = N minutes of the player's level income, capped at 50k |
| XP boost 30 min | Dev product | 49 | Server-time timer persisted |
| Respec Token | Dev product | 49 | Resets stats; consumable |
| Dungeon revive (1) | Dev product | 29 | Max 2 per dungeon run |
| Starter pack (once) | Dev product | 199 | Weapon skin, 20k gold, 5 potions, 30-min 2x XP; PurchaseId stored |
| Weapon skins / auras | Dev product (direct) | 99-499 | Cosmetic only, no random outcomes |

Policy: no Robux-sold stats, luck, or chance-based enhancement (all would be paid random items). All receipts go through one idempotent handler keyed by `PurchaseId`. Show prices from `GetProductInfoAsync` at runtime.

## Retention and social
- Daily quests: 3 from a pool of 12, seeded by UTC day (kill N of a family, clear a dungeon, deal boss damage); rewards gold + potions + 20 gems.
- Login streak (7 days): gold, potions, Respec Token on day 7; reset on a missed day.
- Leaderboards: highest level (cached 5 min), fastest dungeon clear per tier (weekly), World Boss damage (per event).
- World events every 20 min (Gate) and every 3 hours (World Boss) give server-wide gather points; announce with a banner 60 s before.
- Social: party invite via `SocialService:PromptGameInvite`, party frames, shared loot credit, emotes at waypoints. Codes: server-side table with expiry, one redeem each, `WELCOME` grants 5k gold and 3 potions.
- Content cadence: new zone + dungeon every 2-3 weeks; seasonal gear sets; weekly dungeon modifier.

## Feature list skeleton
M0 additions: tagged zone/spawner blockout and definition validation (RPG-01, RPG-02).

Milestones: M0 RPG-01–02 · M1 RPG-03–08 · M2 RPG-09–14, RPG-24 · M3 RPG-15–20 · M4 RPG-21–23.

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RPG-01 | Definitions + Config (SkillDefs, MobDefs, ItemDefs, QuestDefs, BossDefs, ZoneDefs) | - | Spec iterates every def: required fields, ids unique, skill windows `windup < activeStart < activeEnd`, mob levels inside zone ranges, drop weights sum > 0; failure names the def |
| RPG-02 | Zone blockout, spawner and waypoint tags | RPG-01 | Playtest: `execute_luau` Server returns counts of tagged `MobSpawner` >= 6 in Meadow, `Waypoint` >= 2, `SafeZone` == 1; screen_capture of hub |
| RPG-03 | StatsLogic + CombatLogic + level curve | RPG-01 | Spec: `xpToNext` property loop 1-69, `levelFromXp` consistent at every boundary; damage with `Random.new(42)` within [0.95,1.05] band and crit rate within 1 pt over 10k rolls; mitigation 0 when def 0, < 1 always; party scaling; NaN/negative inputs rejected |
| RPG-04 | CombatSystem: M1 chain, skills, cooldowns, mana, hit windows | RPG-03 | Spec: cooldown and mana gating, combo index reset after 0.9 s, hitSet dedupe. Playtest: `RPG.spawnMob`, click M1 x4 with `user_mouse_input`; Server mob HP drops by exactly the 4-hit sum within the variance band; Z skill consumes mana and goes on cooldown (Server attribute) |
| RPG-05 | MobSystem: spawners, AI, aggro, leash, respawn | RPG-01, RPG-04 | Playtest: standing 20 studs away mobs aggro and chase; walking 70 studs from spawn leashes and heals; killing a mob respawns it after 10 +- 1 s; mob count never > 150 |
| RPG-06 | Player health, death, respawn, dodge, i-frames | RPG-04 | Spec: i-frame windows, spawn protection, post-hit i-frames. Playtest: `RPG.setHp(player,1)`, let a mob hit -> death, respawn at waypoint after 3 s with full HP and no gold change; dodge through a hit takes 0 damage (Server) |
| RPG-07 | Combat client controller (input, animation, lock-on, hit feedback) | RPG-04 | Playtest: keyboard Q/Z/click produce animation tracks playing (Client `execute_luau` lists `Animator:GetPlayingAnimationTracks()` > 0); damage numbers appear (screen_capture); console clean; remote rate limited (spam 50 fires -> Server accepted <= burst) |
| RPG-08 | HUD: bars, hotbar, XP, mob plates, damage numbers | RPG-07 | Playtest: Client reads HP bar `Size` equals health ratio after `RPG.setHp`; mobile layout check via `UIAspectRatioConstraint` and no overlap in screen_capture |
| RPG-09 | Profile, progression, stat allocation, mastery | RPG-03 | Spec: migrations v1->vN, stat allocation cannot exceed points or go negative, mastery unlock thresholds. Playtest: `RPG.grantXp(player, xpToNext(1))` -> level 2, points +3, allocate via remote, derived stats update; rejoin persists (mock store) |
| RPG-10 | LootSystem: drops, gold, instanced rolls, pity | RPG-05, RPG-09 | Spec: 100k mob rolls with `Random.new(7)` Epic share within 0.2 pt of 1% table share; boss pity triggers at exactly the 10th miss and resets; each eligible player rolls independently. Playtest: kill 20 mobs -> gold increases, item count consistent with Server log |
| RPG-11 | Inventory, equipment, upgrades, shop | RPG-10 | Spec: cap enforced, equip slot validation, `upgradeCost` table for plus 0-9, cannot exceed +10, sell price rule. Playtest: buy potion with gold, equip weapon, upgrade +1, Server gold and power match the formula |
| RPG-12 | Quest system, NPC prompts, tracker | RPG-05, RPG-09 | Spec: objective progress events, one-time completion, prerequisite gating, daily seed deterministic per day. Playtest: accept via NPC prompt (`character_navigation` to NPC, `user_keyboard_input` E), kill 6 boars, turn in, reward granted once |
| RPG-13 | BossSystem: phases, telegraphs, poise, enrage | RPG-05, RPG-10 | Spec: phase thresholds fire once, poise break logic, party scaling. Playtest: `RPG.spawnBoss`, `RPG.dealDamage` to 66% -> phase 2 attribute set; telegraph part exists before damage; kill drops loot for each eligible player |
| RPG-14 | Waypoints, fast travel, zone attributes, lighting transitions | RPG-02, RPG-09 | Playtest: unlock a waypoint by touching crystal, fast travel with 5 s cast cancelled by damage, `Player:GetAttribute("Zone")` updates when crossing a volume; lighting differs between zones (screenshots) |
| RPG-15 | DungeonSystem: instancing, rooms, scaling, rewards | RPG-13, RPG-11 | Spec: party scaling, tier multipliers, room lock logic. Playtest: `RPG.startDungeon`, `RPG.clearRoom` x3, boss, complete -> rewards in inventory, instance destroyed (descendant count of `DungeonInstances` == 0), two parties get distinct offsets |
| RPG-16 | PartySystem: invite, frames, shared credit | RPG-15 | Spec: credit threshold 15%, XP bonus formula. Playtest: two QA players party, kill mob with one, both receive XP, each gets an independent roll |
| RPG-17 | World events: Gate and World Boss | RPG-13, RPG-14 | Spec: slot function maps timestamps to open/closed deterministically. Playtest: QA sets time offset, Gate opens, banner shown, World Boss spawns and de-spawns on timeout |
| RPG-18 | Content pass: 4 zones, 24 mobs, 4 bosses, 3 dungeons, 60 items | RPG-14, RPG-15, RPG-24 | RPG-01 validators green; each zone playtested once (spawn, kill, boss); LevelPacing sim (RPG-24) green |
| RPG-19 | Juice, audio, camera (hit-stop, shake, telegraph FX, level-up) | RPG-07 | Playtest: hit-stop and shake fire on hit (console counter); `GuiService.ReducedMotionEnabled` disables shake; screen_capture of boss telegraph |
| RPG-20 | FTUE | RPG-12, RPG-13 | Playtest: fresh profile reaches level 5 in 4-5 min via scripted combat; `ftue.step` persists across rejoin; death in FTUE has no penalty |
| RPG-21 | Monetization: passes, products, receipts | RPG-11 | Spec: receipt handler 5-case table (duplicate, absent player, save fail, unknown product, grant ok); gold pack amount formula bounds; boost timers respect server time |
| RPG-22 | Daily quests, login streak, leaderboards, codes | RPG-12 | Spec: UTC day boundary streak math, code single-use; Playtest: QA advances day, rewards granted exactly once |
| RPG-23 | Analytics, performance pass, publish readiness | RPG-21 | Spec: payload builders; playtest with 100 mobs and 8 QA dummy players keeps server heartbeat < 10 ms; no unbounded tables after 5 min (memory counts stable) |
| RPG-24 | LevelPacing sim spec | RPG-03, RPG-05 | Spec simulates kills/min and asserts level 10 in 10-15 min, 30 in 60-90 min, 50 in 2.5-3.5 h, gold flow within 12-24k/h at level 25 |

## Playtest scripts
1. **Combat basics** - start play; Server `QA:Invoke("RPG.setLevel", p, 5)` and `RPG.spawnMob(p, "Slime", 10)`; `user_mouse_input` left click x4 spaced 0.45 s; Server `execute_luau` returns mob HP before/after and expects delta between `0.9*0.95*P + 0.9*0.95*P + 1.0*0.95*P + 1.4*0.95*P` and the 1.05 equivalent (P = attackPower); finish kill; assert `xp` increased by `xpPerKill`; `get_console_output` clean.
2. **Death and recovery** - `RPG.setHp(p, 1)`, `RPG.spawnMob(p, "Bandit", 6)`; wait; assert state `Dead` then after 3.5 s `Alive`, `health == maxHealth`, gold unchanged, `invulnUntil > now`.
3. **Boss + loot** - `RPG.godMode(p, true)`, `RPG.spawnBoss(p, "SlimeKing")`; `RPG.dealDamage("SlimeKing", 0.4 * maxHp)`; assert phase 2; `screen_capture` of telegraph; kill; assert inventory +1 item, `bossKills.SlimeKing == 1`, `pity.bossEpic` incremented.
4. **Dungeon run** - `RPG.setLevel(p, 12)`, `RPG.startDungeon(p, "GoblinWarren", "Normal")`; for i = 1..3 `RPG.clearRoom`; boss kill; assert rewards, player back at the gate, `DungeonInstances` empty.
5. **Quest** - `RPG.acceptQuest(p, "boars_1")` or via prompt (`character_navigation`, E); kill 6 boars with `RPG.spawnMob`; turn in; assert completed once and XP/gold granted.

## Design rules
1. Every level range has a visible next objective (quest arrow or tracked mob family) within 15 s of finishing the previous one.
2. Every mob attack has a visible windup of at least 0.35 s; a death must always be avoidable by information the player had.
3. No stat or damage value comes from the client; `aimDir` is the only combat input and it is clamped and flattened.
4. Rewards scale with level delta so low-level farming is never optimal (grey mobs give 10%).
5. Gear upgrades are deterministic; nothing chance-based is sold for Robux.
6. A dead server must still feel alive: ambient NPCs, mobs at every spawner, and scheduled events that do not need many players.
7. Early-game speed beats late-game balance: level 10 inside 15 minutes, first loot drop inside 3 minutes.
8. Skill count stays small (M1 + 3 skills + ult + dodge per archetype); depth comes from mastery, stats, and gear.
9. All instanced content (dungeons) is destroyed on exit, disconnect, or timeout; no instance leaks.
10. Each boss has one mechanic the player must learn and a way to practice it (a lower-tier version earlier).
11. Mobile parity: every action reachable with two thumbs, with auto-attack and lock-on on by default.
12. Content cadence is planned before launch: at least one dungeon and one zone beyond the initial release are specified in `GAME_SPEC.md` so the progression curve has a runway.

## Analytics
- Onboarding funnel: 1 Spawn, 2 PickedArchetype, 3 FirstKill, 4 Level2, 5 FirstQuestDone, 6 Level5, 7 FirstBossKill, 8 FirstDungeonGateSeen.
- Progression: `LogProgressionStartEvent/Complete/Fail` with path `Dungeon_<id>`, level = tier index, name = room index; `LevelReached` custom event (value = level) plus `TimeToLevel` (value = seconds).
- Economy: currencies `Gold`, `Gems`. Sources `Gameplay` (SKU `MobKill`, `Quest`, `Boss`, `DailyLogin`), `IAP`; sinks `Shop` (SKU `Potion`, `Upgrade`, `Respec`, `InventorySlots`).
- Custom: `BossAttempt` funnel (Started, Phase2, Phase3, Defeated), `PlayerDeath` (field 1 = zone, field 2 = killer def), `ItemDrop` (field 1 = rarity, field 2 = source), `QuestCompleted` (field 1 = id), `WorldEventJoined`, `FastTravelUsed`.
- Tune from: death hotspots by zone, time-to-level by level band, gold hoarding at level bands, dungeon fail room index.
- Analytics are server-only and not sent from Studio; validate payloads by spec and delivery on a published test place.
