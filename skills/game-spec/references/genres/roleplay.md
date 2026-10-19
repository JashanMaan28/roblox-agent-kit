# Roleplay recipe

Loaded by `game-spec` when the pitch is a roleplay / hangout / life-sim game (or a hybrid with one). Numbers are starting defaults: they go into `Config` tables in the `*Logic` modules and get tuned from playtests.

Contents: Fantasy and references · Loop and pacing · Interview · Systems · Data schema · Economy and tuning · World · UI and input · FTUE · Monetization · Retention and social · Feature list skeleton · Playtest scripts · Design rules · Analytics.

## Fantasy and references

Live another life in a shared town: claim and furnish a home, hold a job, drive, dress up, and act out your own stories with friends and strangers.

- **Brookhaven RP**: the largest roleplay game by visits. One big town, abundant free houses and vehicles, passes that unlock extra tiers of houses and vehicles. Lesson: breadth of props and vehicles beats depth; the free tier must already feel complete.
- **Welcome to Bloxburg**: the plot-and-build life sim; regular plot 30 x 30 cells, a Large Plot pass 50 x 50, jobs that pay for building, build limited by a "plot data" budget with a paid top-up. Lesson: a build budget is both the progression axis and the monetization hook.
- **Adopt Me!**: homes you furnish, daily and seasonal events, items that carry social status. Lesson: a home is the identity, events are the reason to come back; its egg and pet-hatch mechanics are paid-random items under Roblox policy.
- **Empty-server lesson (all three)**: a roleplay server only works when it looks alive. Ambient NPCs, busy spawn plaza, and 16-24 player servers matter more than any single feature.

## Loop and pacing

- **Core loop (3-6 min)**: pick an activity (job shift, delivery, hang out, decorate), complete it with props and other players, get paid in cash and XP.
- **Meta loop (per session, 25-45 min)**: spend cash on furniture, vehicles, outfits; improve the home; level jobs; unlock the next job tier.
- **Long-term (days to months)**: home perfection and sharing, collections (outfits, vehicles, emotes), job ranks, seasonal events, visiting friends' houses.
- **Targets**: join to controllable avatar under 15 s; house claimed under 60 s; first furniture placed under 2 min; first job shift paid under 5 min; first vehicle drive under 6 min; daily claim after the first session minute 3.

## Interview: questions that change the build

| Question | Options | Default (auto mode) |
|---|---|---|
| Home model | Fixed prebuilt houses, no furnishing (Brookhaven) / prebuilt shell + grid furniture placement (Adopt Me style) / full wall-floor-roof build mode (Bloxburg) | Prebuilt shell + grid furniture placement |
| Income | Jobs pay cash / free allowance only / both | Jobs plus a small daily allowance |
| Vehicles | Garage spawn menu, 1 per player / dealership purchases / none | Garage spawn menu, 1 per player (2 with VIP) |
| Voice and free text | Text chat only, no free-form writing surfaces / add spatial voice (age-verified players) / allow drawing and signs | Text chat only, no free-form surfaces |
| Audience | All ages (Minimal/Mild label) / 16+ | All ages |
| Server shape | Public 24-player town / private-server-first | Public 24 players, private servers enabled |

## Systems

| System | Milestone | Server owns | Client shows | Roblox APIs | Kit skills |
|---|---|---|---|---|---|
| Plots (`Plots`) | M1 | Plot assignment, lock state, ban list, visitor checks | Plot signs, claim prompt, lock UI | `CollectionService`, `Player:IsFriendsWithAsync`, `GetPartBoundsInBox` | new-system, roblox-security |
| Furniture (`Furniture`) | M1 | Occupancy grid, validation, build budget, save, spawn of models | Build mode, ghost preview, catalog | `ProximityPrompt`, `Model:PivotTo`, `Workspace:Raycast` | roblox-building, roblox-networking, roblox-camera |
| Wallet and profile | M1 | Cash, XP, owned items, purchases | HUD cash, shop | ProfileStore, `MarketplaceService` | roblox-data, roblox-monetization |
| Vehicles | M1 | Spawn limits, ownership, lock, despawn, speed caps | Garage menu, speedo | `VehicleSeat`, `Seat`, `PhysicsService` collision groups | roblox-physics |
| Interactables | M1 | Seat/prop state, use validation | Prompts, animations | `ProximityPrompt`, `Seat`, `Humanoid` | roblox-characters, roblox-animation-vfx |
| Jobs (`Jobs`) | M2 | Shift state, tasks, pay, AFK end, uniforms | Task markers, shift HUD | `Teams`, `Player.Team`, `Humanoid:ApplyDescriptionAsync` | roblox-game-design, roblox-characters |
| Outfits | M2 | Slot storage, catalog validation, application | Wardrobe UI | `HumanoidDescription`, `Players:GetHumanoidDescriptionFromUserIdAsync` | roblox-characters |
| Identity text (`Identity`) | M2 | RP name and bio storage, filtering, display strings | Overhead tag, profile card | `TextService:FilterStringAsync`, `TextFilterResult` | roblox-localization |
| Social | M3 | Chat channels, `/me`, emote validation | Chat, bubbles, emote wheel | `TextChatService`, `TextChannel`, `SocialService` | roblox-localization, roblox-input |
| World life | M3 | Day clock, ambient NPC routes | Sky, street lights, NPCs | `Lighting`, `PathfindingService` | roblox-lighting, roblox-npc-ai |
| Moderation (`Admin`) | M4 | Rank checks, mute/kick/ban, house bans, private-server owner powers | Admin panel, report button | `Players:BanAsync`, `Player:GetRankInGroupAsync`, `game.PrivateServerOwnerId` | roblox-security |
| Retention and monetization | M4 | Daily, quests, receipts, likes leaderboard | Daily popup, shop | `MarketplaceService`, `BadgeService`, `OrderedDataStore` | roblox-monetization, roblox-server-data |

Tricky parts, exact approach:

- **Grid placement.** `PlacementLogic` is pure and shared: client ghost and server use the same code. Cell size 2 studs; the lot is 24 x 24 cells (48 x 48 studs; Large Plot 32 x 32) and holds the shell plus a yard for outdoor items; interior furniture uses the shell's interior grid (Cottage 12 x 12, Townhouse 16 x 16, Villa 20 x 20 cells). An item def has `w`, `d` (cells), `kind` (`Floor`, `Wall`, `Surface`, `Ceiling`), `weight` (build points). `canPlace(plot, def, cx, cz, rot, level)` returns `true` or `false, reason` where reason is one of `bounds`, `overlap`, `budget`, `count`, `kind`, `locked`. Footprint rotates by `rot` in 0..3 (90 degree steps). Occupancy is a set keyed `level*1e6 + cz*1e3 + cx`. Wall items need an adjacent wall cell flag; `Surface` items must sit on a `Floor` item flagged `surface = true`. Cell world position = `plotOrigin + Vector3.new(cx * 2 + w, y, cz * 2 + d)`; preview snaps with `math.floor`; there is no free float placement.
- **Server validation ladder** (remote `PlaceRequest(itemId, cx, cz, rot, level)`): rate limit 8 per second, burst 12 -> `typeof` checks and `math.floor(x) == x` and finite -> `itemId` exists in `FurnitureCatalog` -> player owns at least one unplaced copy (`owned.furniture[itemId] - placedCount(itemId) > 0`) -> player is the plot owner or has build permission -> player within 80 studs of the plot center -> `canPlace` -> mutate state, spawn model from `ServerStorage.Furniture[itemId]`, tag `PlacedFurniture`, replicate delta -> mark profile dirty. Cost is never sent by the client. Pickup (`RemoveRequest`) and move are the same ladder.
- **Storage.** Items are stored as `{ id, cx, cz, rot, level }` (small integers); cap 400 items per plot; budget `buildPoints = 300 + 100 * upgradeLevel + passBonus`. Rebuild the plot from the list on claim; late joiners get a full snapshot of every claimed plot's item list on join (not incremental only). Furniture models are `Model`s with `ModelStreamingMode = Atomic` if `StreamingEnabled` is on.
- **Houses and permissions.** Plot lock states `Open`, `Friends`, `Locked` plus a `banned` list. A door `ProximityPrompt` opens a door only if `PlotLogic.canEnter(lock, isOwner, isFriend, isBanned)`. Every 1 s the server runs `GetPartBoundsInBox` on each claimed interior and moves any uninvited player to the plot's front door (anti-trespass). Friend checks use `Player:IsFriendsWithAsync` cached per session. Plots release on `PlayerRemoving` after the final save.
- **Vehicles.** The garage menu sends `SpawnVehicle(vehicleId)`; server checks ownership, rate limit (1 per 3 s), per-player cap (1; 2 with VIP), then clones from `ServerStorage.Vehicles`, places it with a raycast to ground 12 studs ahead of the player, sets attribute `OwnerUserId`, `Locked`. `VehicleSeat` `MaxSpeed`, `Torque`, `TurnSpeed` come from the catalog (Sedan 70, SUV 60, Sports 110, Supercar 140 studs/s). Despawn on owner leave, on a new spawn, or 120 s after last occupant left. When `Occupant` changes, the server ejects non-owners from `Locked` vehicles. Keep automatic network ownership for the driver and never base damage or scoring on client-reported vehicle position. Register collision groups `Characters` and `Vehicles`; `Characters` does not collide with `Characters`, and a vehicle does not collide with unseated characters, so cars cannot fling players.
- **Jobs.** `JobLogic` is a pure state machine `Off -> OnShift -> Off` with task queue, pay, and timeouts. Stations are tagged `JobStation` with attributes `JobId`, `TaskId`. A task completes only if the player is within 12 studs, on shift, and the task is the next expected one. Role = a `Team` per job (Citizen is `AutoAssignable`; job teams are set server-side by `Player.Team`), uniform applied with `ApplyDescriptionAsync` on the server and the original `HumanoidDescription` restored on end. AFK rule: no task or movement of 90 s ends the shift without bonus. Role switching cooldown 10 s.
- **Names, bios, and any player text.** Server flow in `Identity`: validate length (name 2-16 letters/spaces, bio at most 120), rate limit 1 change per 30 s, then `pcall` `TextService:FilterStringAsync(text, player.UserId)` and read `GetNonChatStringForBroadcastAsync()` (all viewers see it). It throws unless the author is online on this server, so text is filtered when the author joins and when they edit; the raw text lives only in the author's profile and is never replicated. On failure, keep the previous filtered value or show `Guest_<n>`. Overhead tags use `RichText = false` and `AutoLocalize = false`.
- **Chat.** Use default `TextChatService` channels; the engine filters `TextChannel:SendAsync` messages. `DisplaySystemMessage` text is not filtered: use it only for static developer text. `/me` is a server-handled `TextChatCommand`; its argument is untrusted and goes through the same filter before display. Enable bubble chat via `BubbleChatConfiguration`.
- **Moderation.** `AdminLogic.canUse(rank, command)` is pure; ranks come from `Config.AdminUserIds` and a group rank read with `Player:GetRankInGroupAsync`. Commands (`/mute`, `/kick`, `/ban`, `/tp`, `/bring`, `/announce`, `/jail`) are server `TextChatCommand`s that check rank first. Bans call `Players:BanAsync` in `pcall` (needs `Players.BanningEnabled`). Private-server owner (`game.PrivateServerOwnerId == player.UserId`, with `game.PrivateServerId ~= ""`) gets kick and house-lock powers in that server only.
- **Empty server fix.** Ambient NPCs: 12 citizens on looping waypoint routes using `Humanoid:MoveTo`, no per-frame pathfinding; tagged `AmbientNPC`; paused when the server has more than 16 players. Set `Players.MaxPlayers` 24 (dashboard) and spawn everyone in a busy plaza.

## Data schema

```luau
export type RoleplayProfile = {
	version: number,
	cash: number,
	level: number,
	xp: number,
	identity: { rpName: string, bio: string }, -- raw text; only filtered values are displayed
	outfits: { { name: string, slots: { [string]: number } } }, -- up to 5, catalog IDs only
	owned: {
		furniture: { [string]: number }, -- itemId -> count
		vehicles: { [string]: boolean },
		clothing: { [string]: boolean },
		emotes: { [string]: boolean },
	},
	house: {
		shell: string, -- "Cottage" | "Townhouse" | "Villa"
		upgradeLevel: number,
		lock: string, -- "Open" | "Friends" | "Locked"
		banned: { number },
		items: { { id: string, cx: number, cz: number, rot: number, level: number } },
		likes: number,
	},
	jobs: { [string]: { level: number, xp: number, shifts: number } },
	daily: { lastClaimDay: number, streak: number, quests: { { id: string, progress: number, claimed: boolean } }, questDay: number },
	settings: { cameraTilt: boolean, showNames: boolean },
	receipts: { [string]: boolean },
	tutorialDone: boolean,
}
```

Session-only: current plot, build mode flag, current job and task queue, spawned vehicle, last request timestamps, filtered display strings of other players, admin mute set. Global moderation data (bans list, house likes ordering) lives in separate stores (`roblox-server-data`).

## Economy and tuning defaults

Formulas: `taskPay = floor(basePay * (1 + 0.05 * min(jobLevel, 20)) * premiumMult * vipMult)`; `shiftBonus = SHIFT_BONUS` when all tasks of a shift complete; `xpForLevel(l) = floor(80 * l^1.5)`; `upgradeCost(level) = round(2500 * 1.6^(level - 1))`; `furnitureCost = round(basePrice * tierMult)`.

| Key | Default |
|---|---|
| Starting cash | 1,000 |
| Base task pay / tasks per shift / shift bonus | 8 / 15 / 50 (about 170 cash in 4-5 min) |
| Premium (`Player.MembershipType == Premium`) pay mult | 1.10 |
| VIP pay mult | 1.25 |
| Job level cap / XP per task | 20 / 4 |
| Daily allowance | 200 to 600 over 7 days |
| Build points base / per upgrade / Large Plot pass | 300 / +100 / 32 x 32 plot |
| Item weight range | 1 (plant) to 12 (large appliance) |
| Furniture prices | chair 60, table 120, bed 300, sofa 250, TV 400, fridge 450 |
| House shells (interior grid) | Cottage free (12 x 12 cells), Townhouse 8,000 (16 x 16), Villa 40,000 (20 x 20) |
| Vehicles | Scooter free, Sedan 3,000, SUV 6,500, Sports 18,000, Supercar VIP |
| Outfit slots | 3 free, up to 5 with a pass |
| Server size | 24 players |

Sources: jobs, daily, quests, event rewards. Sinks: furniture, shell upgrades, vehicles, clothing, emotes. Income is about 2,000 cash per hour; Townhouse at about 4 hours, Villa at about 25 hours. No rent or bills.

## World

- **Town**: about 800 x 800 studs. Plaza spawn (80 x 80, busy, 12 `SpawnLocation`s), Downtown (cashier shop, cafe, pizza), Residential (24 `PlotSlot`s, each 48 x 48 studs lot with 12-stud driveway, 8-stud road gaps), Beach/park, Garage. Roads 24 studs wide with two lanes and sidewalks; no dead ends.
- **Streaming**: `StreamingEnabled` on, `StreamingMinRadius` 64 (default), `StreamingTargetRadius` 512 for mobile (default is 1024). Interiors and vehicles `ModelStreamingMode = Atomic`.
- **Lighting**: 24-minute day cycle, bright clean look: `Brightness` 2, `Technology` Future, `Atmosphere` Density 0.25, `ColorCorrection` Saturation +0.1, warm sunset tint at `ClockTime` 17-19, street lights on from 18 to 6. Update `ClockTime` about once per second server-side, or compute from `DayStart` on clients.
- **Art direction**: toy-like, rounded, bright palette; every prop readable at phone size; per-job color accents.
- **Tags**: `PlotSlot`, `PlacedFurniture`, `JobStation`, `Vehicle`, `VehicleSpawn`, `Seat`, `StreetLight`, `AmbientNPC`, `NPCWaypoint`, `Interactable`, `HouseDoor`.

## UI and input

- **HUD**: cash (top-right), level bar, shift tracker when on shift, compass or arrow to the next task, chat (default `TextChatService` UI), bottom menu bar: Home, Build, Garage, Outfits, Jobs, Emotes, Settings.
- **Build mode**: catalog tabs by kind, ghost preview green/red with the failing reason as text, rotate button (R key / on-screen), pickup, undo of the last 10 placements, budget meter `used / total`, top-down orbit camera clamped to the plot.
- **Mobile**: large touch buttons, tap-to-place with drag, two-finger rotate not required (button), UI sized with Scale + `UIAspectRatioConstraint`. **Gamepad**: thumbstick cursor in build mode, `ButtonA` place, `ButtonR1` rotate, D-pad cycles catalog tabs, selection highlight on all menus.

## FTUE

First 60 s:
1. 0-10 s: spawn on the plaza, avatar controllable, one rotating highlight arrow to the nearest free house; pick-name screen is skippable (auto `Guest_<n>`).
2. 10-30 s: walk 40 studs to the house, claim prompt, door opens, instant starter cash 1,000.
3. 30-60 s: a glowing bed is the only highlighted shop item (300); buy and place it in 3 taps; a "Sleep" prompt plays an animation.

First 5 min:
4. Minute 2: a bubble offers the Cashier job at the plaza; the first shift has 5 tasks (not 15) with doubled pay; finish pays about 100.
5. Minute 3.5: unlock the Scooter in the garage; the arrow shows a loop to the beach.
6. Minute 4-5: daily reward appears (never at spawn), the build budget meter is revealed, and the town map shows locked jobs and the Townhouse as targets. No popups before step 6.

## Monetization

| Item | Type | Default price (R$) | Rule |
|---|---|---|---|
| Large Plot | Game pass | 249 | Lot 32 x 32 cells (more yard space) |
| Build Points +150 | Game pass | 99 | Permanent budget increase |
| Multiple Floors | Game pass | 349 | Enables `level = 1` |
| VIP (VIP houses, 2 vehicles, tag, +25 % pay, 5 outfit slots) | Game pass | 799 | No exclusive progress gates |
| Sports Pack / Emergency Pack vehicles | Game pass | 399 / 299 | Cosmetic and speed within catalog caps |
| Emote Pack | Game pass | 149 | Cosmetic |
| Cash packs 2,000 / 10,000 / 50,000 / 250,000 | Developer products | 25 / 99 / 399 / 1,499 | Receipt handler, `LogEconomyEvent` |
| Name color / chat tag | Developer product | 99 | Cosmetic |
| Private servers | Dashboard setting | free | Enable in Access Settings; not combinable with paid access |

Policy notes: grants only from the server receipt path with `PurchaseId` stored in the same save; passes are checked with `MarketplaceService:UserOwnsGamePassAsync` on join and on `PromptGamePassPurchaseFinished`. No paid random items by default. If an egg, mystery box or pet-hatch is added, show every outcome and numerical odds before purchase (percentages totaling 100 %), and branch on `ArePaidRandomItemsRestricted` from `PolicyService:GetPolicyInfoForPlayerAsync`; respect `IsPaidItemTradingAllowed` if trading exists. Maturity: the questionnaire classifies a game whose primary activity is talking with other players as a social hangout (16+, or 18+ age-verified with private spaces) and treats freehand drawing, spray paint, pixel canvases and writing on visible surfaces as free-form user creation (16+); describe the game as a town with jobs, homes and vehicles, avoid "hangout" in title and description, ship no free-form surfaces, and answer the questionnaire for the most mature content a player can meet.

## Retention and social

- **Daily reward**: cash 200, 250, 300, 400, 500, 600 and a furniture item on day 7; claim after minute 3; 24 h cooldown.
- **Quests**: 3 daily (finish 2 shifts, drive 500 studs, place 5 items), 1 weekly (visit 3 friends' houses); cash plus XP.
- **Leaderboards**: house likes this week (`OrderedDataStore`; visitors like once per house per day), job level; never a "most Robux spent" board.
- **Friends**: join-friend button, `SocialService:PromptGameInvite`, friend-only house lock state.
- **Events**: monthly themed item set (limited furniture and clothing) with a 3-task event quest line; earnable by play.
- **Codes**: server-side table with expiry, one redemption per profile.
- **Badges**: Welcome, First Home, 10 Items Placed, First Shift, Level 10 Cashier, Visited 10 Houses.

## Feature list skeleton

M0 additions (genre-specific):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RP-01 | Town blockout, plots and tags | - | Playtest: `execute_luau` (Server) counts 24 `PlotSlot`-tagged models each with attributes `Index` and an `Origin` part; plaza has 12 spawn locations; `screen_capture` of the plaza. |
| RP-02 | Catalogs (furniture, vehicles, clothing, jobs) in `Config` | - | Unit: every catalog entry has unique `id`, positive price, `w,d >= 1`, `weight` 1..12, `kind` from the enum. |

M1 (core loop playable):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RP-03 | `PlacementLogic` | RP-02 | Unit: in-bounds placement ok; reasons `bounds`, `overlap`, `budget`, `count`, `kind` each returned; rotation swaps `w`/`d`; NaN, fractional, negative and huge cells rejected; input state unchanged. |
| RP-04 | Plot claim, lock, release | RP-01 | Unit: `PlotLogic.canEnter` truth table (owner, friend, banned, lock states). Playtest: QA `Plot.claim` assigns index 1; second claim returns `already owns`; leaving frees the slot. |
| RP-05 | Furniture placement system (server + client build mode) | RP-03, RP-04 | Playtest: QA `Cash.grant 1000`, `Plot.give chair 2`; client sends valid `PlaceRequest`, Server count of `PlacedFurniture` is 1; a duplicate cell request is rejected and count stays 1; forged remote with `itemId = 99999` and `cx = 1e9` changes nothing; console shows no errors. |
| RP-06 | Wallet, profile, house save | RP-02, RP-05 | Unit: v1 to v2 migration; cash never negative; serialize/deserialize items round-trips. Playtest (`ProfileStore.Mock`): place 3 items, `Profile.save`, `Profile.reload`, the same 3 models respawn at the same cells. |
| RP-07 | Vehicles | RP-02 | Unit: `VehicleLogic.canSpawn` rejects not owned, over cap, cooldown; despawn rule at 120 s. Playtest: QA `Vehicle.spawn Sedan`; sit the humanoid; hold W for 3 s with `user_keyboard_input`; speed <= 70 studs/s; owner leaves and vehicle count 0. |
| RP-08 | Interactables (seats, props) | RP-01 | Playtest: trigger a `Seat` prompt; `Humanoid.Sit == true`; interact from 30 studs away is ignored (server distance check). |

M2 (progression and meta):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RP-09 | Jobs and shifts | RP-06, RP-08 | Unit: `JobLogic` start/complete/timeout; out-of-order task rejected; pay formula matches table for levels 1, 10, 20 and Premium. Playtest: QA `Job.start Cashier`, `Job.completeTask` x5; cash increased by `5 * taskPay + shiftBonus`; `Player.Team.Name == "Cashier"`. |
| RP-10 | Roles and uniforms | RP-09 | Playtest: shift start applies uniform (`GetAppliedDescription().Shirt` changes) and shift end restores the original; role switch within 10 s returns `cooldown`. |
| RP-11 | Outfits and wardrobe | RP-06 | Unit: `OutfitLogic.validate` rejects non-catalog ids and more than 5 slots. Playtest: save outfit, change, load, applied description equals the saved one. |
| RP-12 | RP name and bio with filtering | RP-06 | Unit: `NameLogic.validate` (length, charset). Playtest: QA `Name.set "Test"` returns the filtered string; QA `Name.simulateFilterFailure` leaves the previous value; the overhead tag has `RichText == false`. |
| RP-13 | Progression: levels, job ranks, build upgrades, house shells | RP-09 | Unit: `xpForLevel` boundary loop 1..30; `upgradeCost(1..3)` = 2500, 4000, 6400; purchase rejects insufficient cash. Playtest: QA `Cash.grant 3000`, buy build upgrade 1 (cash 500, budget 400); buy Townhouse (8,000) returns `insufficient`; grant 8,000, buy it, interior grid becomes 16 x 16 cells and existing items re-validate. |

M3 (content, juice, FTUE):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RP-14 | Chat, bubbles, emotes, `/me` | RP-12 | Playtest: send `/me waves` from the client; Server channel message arrives filtered; `DisplaySystemMessage` used only for static text (grep check in code review). |
| RP-15 | Ambient NPCs and day cycle | RP-01 | Playtest: QA `Time.set 19`; street lights `Enabled`; 12 `AmbientNPC` exist and move (positions differ after 10 s); disabled when 17+ players via QA `Players.addDummy`. |
| RP-16 | FTUE | RP-05, RP-09 | Playtest: fresh profile; arrow targets nearest free `PlotSlot`; after claim cash == 1000; first shift has 5 tasks; no popup before minute 4 (console funnel steps in order). |
| RP-17 | HUD, mobile and gamepad | RP-05 | Playtest: build mode on a phone-sized viewport (`screen_capture`) has all buttons inside the safe area; gamepad `ButtonA` places an item. |
| RP-18 | Content pass: 4 jobs, 40 furniture, 6 vehicles, 30 clothing | RP-09, RP-07 | Unit: catalog validation passes; every job has at least 5 `JobStation`s; part count in the town under 60,000. |

M4 (monetization, social, launch readiness):

| ID | Title | Depends | Acceptance |
|---|---|---|---|
| RP-19 | Passes, cash packs, receipts | RP-06 | Unit: `ReceiptLogic` grants once per `PurchaseId`; unknown product returns NotProcessedYet; 5-case table. Playtest: QA `Receipt.simulate cash_10000` twice; cash +10,000 once. |
| RP-20 | Admin and moderation | RP-14 | Unit: `AdminLogic.canUse` rank matrix; non-admin `/ban` ignored. Playtest: QA `Admin.setRank 2`, `/mute` dummy; muted dummy's message is not delivered (`ShouldDeliverCallback`). |
| RP-21 | Private servers and owner powers | RP-20 | Unit: `AdminLogic.ownerPowers(privateServerId, ownerId, userId)` true only for the owner in a private server. Playtest: QA `Server.simulatePrivate` makes the player owner and `/kick` on a dummy works; the real `game.PrivateServerId` path is a sign-off step in the published test place. |
| RP-22 | Daily, quests, likes leaderboard, badges | RP-06 | Unit: `DailyLogic` streak and day roll-over. Playtest: QA `Daily.setDay`, claim; a like writes once per visitor per day. |
| RP-23 | Launch readiness: maturity answers, analytics, checklist | RP-19, RP-21 | Console trace shows each analytics event listed below; questionnaire answers recorded as "no free-form surfaces, text chat only"; `roblox-publish-checklist` run result stored. |

## Playtest scripts

QA commands (called as `game.ServerStorage.QA:Invoke(cmd, player, ...)` from `execute_luau` with datamodel_type "Server"): `Plot.claim`, `Plot.give(itemId, n)`, `Plot.place(itemId, cx, cz, rot)`, `Plot.state`, `Cash.grant`, `Vehicle.spawn(id)`, `Job.start(jobId)`, `Job.completeTask`, `Name.set`, `Name.simulateFilterFailure`, `Admin.setRank`, `Time.set`, `Players.addDummy`, `Profile.save/reload/reset`, `Receipt.simulate`, `Daily.setDay`, `Server.simulatePrivate`.

1. **Claim and furnish.** `start_stop_play`; Server: `Plot.claim`, `Plot.give chair 2`; Client `execute_luau` fires `PlaceRequest("chair", 4, 4, 0, 0)`; Server asserts `#CollectionService:GetTagged("PlacedFurniture") == 1`; fire again at the same cell and assert still 1; fire `PlaceRequest("chair", 1e9, 0, 0, 0)` and `PlaceRequest(123, 0, 0, 0, 0)` and assert 1; `screen_capture` the room; `get_console_output` clean.
2. **Drive.** Server: `Vehicle.spawn Sedan`; Server `seat:Sit(humanoid)`; `user_keyboard_input` hold `W` 3 s; Server returns `AssemblyLinearVelocity.Magnitude` <= 71; `Players.addDummy` a second player, set `Locked`, dummy sit attempt returns ejected.
3. **Shift.** `Job.start Cashier`; `character_navigation` to a `JobStation`; press `E`; or `Job.completeTask` x5; assert cash delta and `Team`; wait 91 s idle (QA `Time.skip`) and assert shift ended without bonus.
4. **Text safety.** `Name.set "Test Name"` returns a string; `Name.simulateFilterFailure` then `Name.set "x"` returns the previous value; client inspects overhead tag `RichText == false`.

## Design rules

1. Everything a visitor can see from player text is the filtered result; raw text is never replicated.
2. Placement validity is decided by the same pure module on client (preview) and server (authority); the server never trusts client cost, item id, or position.
3. Every placed item and every vehicle has an owner attribute and is cleaned up on leave.
4. A new player owns a bed, a seat and a job on minute 1; the free tier looks complete.
5. Servers always look alive: plaza spawn, ambient NPCs, 24-player cap, friends-join button.
6. Players can lock their house, ban visitors, and report others without leaving the game.
7. Cars cannot fling, trap, or kill players; collision groups enforce it.
8. Cash paid for time is competitive with cash packs; packs speed up but never gate core content.
9. No free-form drawing or writing surfaces unless the owner chose a 16+ audience.
10. Premium and VIP bonuses are small multipliers; never exclusive access to jobs or houses needed for progress.
11. Moderation rank is checked on the server in every command handler.
12. No paid random items in v1; if added, odds and `ArePaidRandomItemsRestricted` handling ship together.

## Analytics

- `LogOnboardingFunnelStepEvent`: 1 Spawn, 2 ClaimedHouse, 3 FirstPlaced, 4 FirstShiftStarted, 5 FirstShiftPaid, 6 FirstVehicle, 7 FirstPurchase.
- `LogEconomyEvent` (currency `Cash`; Source: job, daily, quest, event; Sink: furniture, vehicle, clothing, upgrade) with `itemSku`; Robux cash packs logged with `Enum.AnalyticsEconomyTransactionType.IAP.Name`.
- `LogCustomEvent`: `ShiftCompleted` (value tasks, field jobId), `ItemPlaced` (field itemId), `PlacementRejected` (field reason), `VehicleSpawned`, `HouseVisited` (field relation friend/stranger), `HouseLiked`, `ChatFilterFailure`, `AdminAction`.
- `LogFunnelStepEvent` "ShopPurchase" with per-open session id: OpenedShop, ViewedItem, ClickedBuy, Confirmed.
- Watch: placement rejection reasons (UX tuning), plot claim time, share of shifts abandoned for AFK, percentage of sessions with at least 5 players in view of the plaza.
