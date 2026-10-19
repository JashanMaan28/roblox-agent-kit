# Foundation (M0)

How to implement the standard CORE features so every later feature has a home. Build them in id order; each one is verified and committed like any other feature. Where a project already has an equivalent (a data layer, a network wrapper), use it and adapt the criterion instead of adding a second one.

## Contents
1. Layout
2. CORE-01 toolchain
3. CORE-02 bootstrap
4. CORE-03 remotes and validation
5. CORE-04 player data
6. CORE-05 QA commands
7. CORE-06/07 world and lighting
8. CORE-08 UI shell
9. CORE-09 input
10. CORE-10 analytics, CORE-11 audio
11. Products

## 1. Layout

```
src/shared/            ReplicatedStorage.Shared
  Types.luau           shared payload/snapshot types
  <Name>Logic.luau     pure rules + Config (one per system)
  Remotes/             RemoteEvents as .model.json files
  Products.luau        product/pass names → ids (filled by the user)
  Theme.luau           UI tokens from the art direction
src/server/            ServerScriptService.Server
  init.server.luau     bootstrap
  Systems/<Name>.luau  server systems (own state, handle remotes)
  Data/                PlayerData (ProfileStore), Migrations
  Net/RateLimit.luau, Net/Validate.luau
  QACommands.luau
src/client/            StarterPlayer.StarterPlayerScripts.Client
  init.client.luau     bootstrap
  Controllers/<Name>Controller.luau
  UI/                  screens and components
world/                 world builder scripts (see world-building.md); not synced by Rojo
tests/                 *.spec.luau + TestRunner
```

## 2. CORE-01 toolchain

The scaffold already passes. Verify `node tools/rbx-check.mjs` and one TestRunner run (Studio or `cloud_run_tests`) with ≥1 spec. Add ProfileStore now so CORE-04 can use it: the official package is server-realm, so in `wally.toml` add `ProfileStore = "lm-loleris/profilestore@1.0.3"` under `[server-dependencies]` (check `wally search profilestore` for a newer `lm-loleris` version), run `wally install`, then regenerate the sourcemap. It lands in `ServerPackages/` → `ServerScriptService.ServerPackages.ProfileStore`.

## 3. CORE-02 bootstrap

Server and client bootstraps require every module in `Systems/` (or `Controllers/`), call `init()` on all of them, then `start()` on all of them, in a fixed order (sorted list in the bootstrap, not folder iteration order). `init` wires dependencies and remotes, never yields; `start` may spawn loops. Errors in one module's `start` are reported with the module name and don't stop the others (`task.spawn` + `xpcall` with `debug.traceback`). Print one ready line each:

```luau
print(`[server] ready ({#systems} systems)`)
```

The server bootstrap calls `require(ServerStorage.WorldBuilders).ensureBuilt()` before starting systems once the world pipeline exists ([world-building.md §4](world-building.md#4-runtime-fallback)). Client: wait for the character only inside the controllers that need it; handle `CharacterAdded` for respawns (`roblox-characters`).

## 4. CORE-03 remotes and validation

- One `.model.json` per RemoteEvent in `src/shared/Remotes/` (`new-system` template); `UnreliableRemoteEvent` for high-frequency cosmetic updates.
- `Net/Validate.luau`: pure predicates (`isFiniteNumber`, `isInteger`, `inRange`, `isStringMax`, `isOneOf`, `isInstanceOf`), tested against NaN, ±inf, fractions, negative, huge, wrong types, and over-long strings.
- `Net/RateLimit.luau`: per-player token bucket keyed by remote name, cleaned on `PlayerRemoving`.
- Handler ladder in every system: rate limit → types → ranges → ownership/plausibility → mutate → replicate. Bad input is dropped silently (no error spam an exploiter can use to flood logs).
- No RemoteFunction invoked server → client. Client → server RemoteFunctions only for request/response UI flows, with the same ladder.

## 5. CORE-04 player data

Load `roblox-data`. ProfileStore with:
- `PROFILE_TEMPLATE` from spec §5, `version` field, `Migrations` module (ordered functions vN → vN+1, each with a fixture spec).
- Studio: use `ProfileStore.Mock` unless the user explicitly asked for real data in Studio, so playtests never touch live DataStores.
- Load on join with `StartSessionAsync` (cancel when the player leaves first); on failure kick with a friendly message (never fall back to defaults that would later save over real data). `OnSessionEnd` kicks the player. `Reconcile()` fills new template fields.
- `PlayerData.get(player)` returns the live profile data; systems own their fields and mutate through their own API only.
- `leaderstats` (if the spec shows them) mirror profile fields; they're never the source of truth.

## 6. CORE-05 QA commands

The pattern from `roblox-testing`: `src/server/QACommands.luau`, gated by `RunService:IsStudio()` or a UserId allowlist in every handler, exposed to agents through the Studio-only `ServerStorage.QA` BindableFunction. Commands call system APIs, never raw data. Start with `help`, `resetProfile`, `grant(currency, amount)`, `setStat(name, value)`, `teleport(zone)`, `getState(system)` (returns the system's snapshot as a string), and add each system's commands with the system. Also add a chat command or debug panel only if the spec asks for one.

## 7. CORE-06/07 world and lighting

Follow [world-building.md](world-building.md). CORE-06 delivers the blockout of every zone at true scale with spawn, boundaries and the tags systems will use; art passes come with the features that need them. CORE-07 applies the art direction's lighting values from spec §7 (Lighting, Atmosphere, Sky, ColorCorrection, Bloom, SunRays) through the same world pipeline, and is verified with a screenshot from the hero angle.

## 8. CORE-08 UI shell

Load `roblox-gui`. One `ScreenGui` per layer (HUD, Screens, Overlays, Toasts) with `IgnoreGuiInset` decided once, `ResetOnSpawn = false`, safe-area aware layout (`ScreenInsets`), `UIScale` driven by viewport size, and the theme as UI Styling: one `StyleSheet` with tokens (palette hex values from spec §7, font family, text sizes, corner radius, stroke) and rules for the shared components, attached to every ScreenGui with a `StyleLink`. `Theme.luau` keeps the same tokens for code that needs them (tweens, generated colours). A small component set: button (with hover/press feedback and a click sound hook), panel, label, icon-counter, progress bar, toast. A screen router so only one modal screen is open at a time and gamepad selection moves into it. Build UI with code-driven components or Rojo `.model.json`, whichever the project uses; keep them inspectable in Explorer during play.

Verify with screenshots at a phone-sized viewport and a desktop viewport: switch devices with `StudioDeviceSimulatorService` from `execute_luau` (Edit or Client datamodel; Studio's `skill` tool has `rbx-device-simulator-lua` with the exact calls), then `screen_capture`.

## 9. CORE-09 input

Load `roblox-input`. Use the Input Action System (`InputContext` / `InputAction` / `InputBinding`) for gameplay actions where the engine supports it; otherwise `ContextActionService`. Every action from spec §8 gets keyboard + gamepad + touch (on-screen button sized ≥ 44 px, in the right-thumb zone). One input module owns the bindings; controllers subscribe to actions, not raw keys.

## 10. CORE-10 analytics, CORE-11 audio

- Analytics (`roblox-analytics`): one `Analytics.luau` server module wrapping `AnalyticsService` (`LogOnboardingFunnelStepEvent`, `LogFunnelStepEvent`, `LogEconomyEvent`, `LogCustomEvent`) with the step and event names from spec §12 as constants. Events are only recorded from servers of the published game, so in Studio the wrapper also prints each payload (`[analytics] …`) — that print is the CORE-10 evidence. Economy events fire inside the same function that changes the balance; keep custom event names few and put variation in custom fields.
- Audio (`roblox-audio`): `SoundService` groups Music, SFX, UI, Ambience; a `Sounds.luau` registry of names → asset ids (from the Creator Store audio library or the user's uploads) so features reference sounds by name; settings volumes persisted in the profile.

## 11. Products

`src/shared/Products.luau` maps every product and pass name from spec §10 to an id, defaulting to `0`. The ids come from the user: created in the Creator Dashboard, or through Open Cloud (`POST /developer-products/v2/universes/{universeId}/developer-products` and `POST /game-passes/v1/universes/{universeId}/game-passes`, scopes `developer-product:write` / `game-pass:write`) — creating them is outward-facing, so only with the user's explicit go-ahead in this conversation. Purchase UI hides or disables items whose id is `0` and logs one warning listing the missing names; `ProcessReceipt` (server, `roblox-monetization`) is idempotent and grants through system APIs. The release report lists the products for the user to create and where to paste the ids.
