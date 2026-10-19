# design/features.json

The machine-readable build plan. `game-spec` writes it; `build-game` works through it one feature at a time; `game-plan.mjs` validates it and guards it. JSON on purpose: it is harder to "tidy up" by accident than Markdown.

## Contents
1. Shape
2. Field rules
3. Writing acceptance criteria
4. Granularity and ordering
5. Standard features (CORE, LAUNCH)
6. Revisions

## 1. Shape

```json
{
  "schema_version": 1,
  "game": "Lava Tower Obby",
  "spec_revision": 1,
  "scope": "launch",
  "milestones": [
    { "id": "M0", "title": "Foundation" },
    { "id": "M1", "title": "Core loop playable" },
    { "id": "M2", "title": "Progression and meta" },
    { "id": "M3", "title": "Content, juice and FTUE" },
    { "id": "M4", "title": "Monetization, social and launch readiness" }
  ],
  "features": [
    {
      "id": "OBY-03",
      "milestone": "M1",
      "title": "Checkpoints save the furthest stage",
      "description": "Touching a stage's checkpoint pad sets the player's stage if it is exactly the next one; respawns put the player on their furthest checkpoint. Stage is persisted.",
      "category": "system",
      "depends_on": ["CORE-04", "OBY-01"],
      "skills": ["roblox-data", "roblox-characters"],
      "spec_refs": ["§4 Checkpoint", "§5 Data"],
      "acceptance": [
        {
          "id": "OBY-03-AC1",
          "given": "StageLogic with a player on stage 4 of 30",
          "when": "advance(state, 5) then advance(state, 7) then advance(state, 3)",
          "then": "stage becomes 5; skipping to 7 returns nil, \"not next stage\"; going back to 3 leaves stage 5",
          "verify": ["unit"]
        },
        {
          "id": "OBY-03-AC2",
          "given": "a playtest with the player set to stage 1 via QA",
          "when": "the character walks onto the stage 2 checkpoint, then is killed",
          "then": "server profile Stage == 2, leaderstats Stage == 2, and the character respawns within 1.5 s within 6 studs of checkpoint 2",
          "verify": ["playtest"]
        }
      ],
      "status": "todo",
      "evidence": [],
      "blocked_reason": null,
      "notes": ""
    }
  ]
}
```

## 2. Field rules

| Field | Rule |
|---|---|
| `schema_version` | `1` |
| `spec_revision` | Starts at `1`; bumped by every requirements change (see §6) |
| `scope` | `launch` (M0–M4) or `mvp` (M0–M2). An MVP plan contains only M0–M2 features; M3/M4 get added later in a revision |
| `milestones` | Exactly the five above for `launch`, M0–M2 for `mvp`; order is build order |
| `id` | `PREFIX-NN`. `CORE`/`LAUNCH` for the standard features, the genre prefix (`OBY`, `TYC`, `SIM`, `TD`, `RPG`, `BG`, `HOR`, `RP`, `RND`) or a 2–4 letter prefix for the game's own systems. Never renumber or reuse an id |
| `title` | Player-visible behaviour, not a file name ("Checkpoints save the furthest stage", not "CheckpointService") |
| `description` | 1–3 sentences: what exists when this is done and the rule that matters |
| `category` | One of `foundation`, `system`, `world`, `ui`, `content`, `juice`, `audio`, `monetization`, `social`, `data`, `analytics`, `launch` |
| `depends_on` | Feature ids that must be `done` first. No cycles; never depend on a later milestone |
| `skills` | Kit skills `build-game` loads before implementing (e.g. `roblox-networking`, `roblox-gui`) |
| `spec_refs` | Sections of `GAME_SPEC.md` this implements (traceability both ways) |
| `acceptance` | 1–4 criteria; ids `<feature id>-AC<n>` |
| `status` | `todo` → `in_progress` → `done`, or `blocked` (with `blocked_reason`). Only `build-game` changes it, through `game-plan.mjs` |
| `evidence` | Appended by `game-plan.mjs done`: `{ "ac", "result", "at" }`. Every acceptance id needs at least one entry before `done` |

Frozen fields (`milestone`, `title`, `description`, `depends_on`, `acceptance`) change only through a revision. `game-plan.mjs guard` enforces this against the last commit.

## 3. Writing acceptance criteria

Each criterion is a Given/When/Then that a single command or playtest can check, with the verification kind spelled out:

| `verify` | Means | Typical evidence |
|---|---|---|
| `static` | `rbx-check` passes on the touched files | "rbx-check: 0 errors" |
| `unit` | TestRunner spec on a pure `*Logic` module | "TestRunner 63 passed, 0 failed (StageLogic.spec 9 tests)" |
| `engine` | Spec or `execute_luau` probe that needs a live server (instances, services, ProfileStore Mock) | returned values from the probe |
| `playtest` | Studio MCP: drive the character/UI, then assert server and client state | returned state + console lines + screenshot description |
| `review` | `roblox-reviewer` (or the stated checklist) finds no Critical/High issue | reviewer summary line |
| `visual` | A separate judge captures the shot in Studio and scores it against a reference image with a fixed rubric (build-game `visual-review.md`) | `visual ref=art/refs/zone-spawn.png judge=sonnet palette=5 lighting=4 …` |

Rules:
- **Observable `then`.** Name the exact state, value, instance, attribute, UI text or timing that proves it ("Coins == 70 and Inventory has exactly 1 Sword"). Never "works", "feels good", "is correct".
- **Cover the abuse case** for anything a client can request: one criterion where a forged or out-of-range request changes nothing ("FireServer with amount = -5, NaN, 1e9 → balance unchanged, no error spam").
- **Server truth over pixels.** A screenshot supports UI and world criteria; state assertions prove gameplay. Use both for player-facing flows.
- **Numbers come from the spec.** Criteria quote the Config values from `GAME_SPEC.md` (cost 25, cooldown 1.5 s), so tuning later is a revision, not a silent edit.
- **Visual criteria** name the reference image and the shot: "Given the Spawn zone built and lit, when captured from the `zone-spawn` hero camera, then the judge scores ≥ 4 on every World rubric line against `art/refs/zone-spawn.png`". Every feature that changes how the game looks (zones, lighting, detail passes, HUD and screens, signature moments, store art) gets one; recipe acceptance that says "screen_capture shows …" becomes a visual criterion. State and behaviour stay in non-visual criteria.
- **Persistence criteria** run against ProfileStore's Mock store (or Studio without API access) and check load → mutate → leave → rejoin values through the data layer.

## 4. Granularity and ordering

- One feature = one behaviour a player (or the build) can observe, small enough to implement and verify in one sitting: typically one system's vertical slice (Logic + spec + server + client + remotes + QA entries), one screen, one zone, one content pack.
- Launch scope lands at 30–60 features; MVP at 15–30. Fewer means features are too big to verify; more means they are tasks, not features.
- Order inside a milestone: data and server rules → client presentation → content that uses them. M1 must reach a playable core loop as early as possible (first reward on screen) before any meta system.
- Put cross-cutting juice (sound, VFX, tweens) on the feature it belongs to when it's part of the feel ("coin pickup pops and plays a sound"), and in an M3 juice feature only when it spans systems.

## 5. Standard features

Every plan starts with these M0 features (adapt descriptions and criteria to the game; keep the ids), then the genre's features, then the LAUNCH features. Drop a CORE feature only if the spec makes it irrelevant (e.g. CORE-09 in a game with no custom input), and note it in `DECISIONS.md`.

| Id | Title | depends | Acceptance (summarised; write full Given/When/Then) | verify |
|---|---|---|---|---|
| CORE-00 | Art direction and reference images | – | `.imagegen/style.json` palette equals spec §7; every shot in spec §7's reference list exists in `art/refs/` with a manifest entry (or a written target when images are off), within the approved budget | review |
| CORE-01 | Project builds, lints and runs tests | – | `rbx-check` passes; TestRunner finds ≥1 spec and reports 0 failed | static, unit |
| CORE-02 | Bootstrap starts every system in order | CORE-01 | Playtest console shows `[server] ready (<n> systems)` and `[client] ready (<n> controllers)`, no errors or warnings from game code | playtest |
| CORE-03 | Remotes, validation and rate limiting | CORE-02 | Remote folder exists from Rojo files; validator specs reject NaN, ±inf, fractions, out-of-range, wrong types, oversize strings; token bucket rejects the (N+1)th call within its window | unit, engine |
| CORE-04 | Player data loads, saves and migrates | CORE-02 | New player gets the versioned template; a v0 fixture migrates to the current version (spec); leave → rejoin restores mutated values via the Mock store; a failed load kicks with a message instead of using defaults | unit, engine |
| CORE-05 | QA commands for every state | CORE-04 | `ServerStorage.QA:Invoke("help")` lists commands; grant/reset/set commands change state through system APIs; a non-Studio, non-allowlisted caller is refused | engine |
| CORE-06 | World blockout matches the spec layout | CORE-00, CORE-02 | Every zone in spec §7 exists under `Workspace.World.<Zone>` built from the repo (see build-game world-building); spawn places the player in the start zone; hero cameras recorded in the refs manifest; judge: `composition` and `readability` ≥ 4 against each zone ref | playtest, visual |
| CORE-07 | Lighting and atmosphere match the art direction | CORE-06 | Lighting/Atmosphere/post-processing values equal spec §7; judge: World rubric ≥ 4 from each hero camera | engine, visual |
| CORE-08 | UI shell, theme and HUD frame | CORE-00, CORE-02 | Theme tokens (colours, fonts, corner radius) in one StyleSheet; HUD shows placeholders for spec §8 elements; fits the safe area on a phone and a desktop viewport; toast helper works; judge: UI rubric ≥ 4 against the HUD mockup | playtest, visual |
| CORE-09 | Input actions for every platform | CORE-02 | Every action in spec §8 input map has keyboard, gamepad and touch bindings; triggering each action from keyboard reaches its handler (console line) | playtest |
| CORE-10 | Analytics events helper | CORE-04 | Onboarding funnel steps and economy events from spec §12 go through one module; calling it in Studio logs the event payloads without errors | engine |
| CORE-11 | Audio groups and settings | CORE-08 | Music/SFX/UI SoundGroups exist; settings toggles change group volume and persist in the profile | playtest |

M4 always ends with:

| Id | Title | depends | Acceptance (summarised) | verify |
|---|---|---|---|---|
| LAUNCH-01 | Security, data and purchase review is clean | all M1–M4 systems | `roblox-reviewer` over `src/` reports no Critical or High findings (fixes applied and re-reviewed) | review |
| LAUNCH-02 | Performance budget holds | LAUNCH-01 | With QA-spawned worst-case load (spec §13 numbers): server heartbeat ≥ 55 Hz, client ≥ 55 FPS in Studio, no instance count or memory growth across 3 rounds/loops of the core loop | engine, playtest |
| LAUNCH-03 | Store page assets exist | CORE-07 | Icon 512×512 and ≥3 thumbnails 1920×1080 in `art/marketing/`; judge: Store rubric ≥ 4 for each | visual |
| LAUNCH-04 | Fresh-player full journey | LAUNCH-01, LAUNCH-02 | With a reset profile: FTUE beats in spec §9 happen in order, the first reward arrives inside the target time, the full core loop and first meta upgrade complete with zero console errors; screenshots at each beat | playtest |
| LAUNCH-05 | Release report is written | LAUNCH-04 | `roblox-publish-checklist` run; `design/RELEASE.md` lists READY/NOT READY per gate, the dashboard steps for the user (product creation and ids, questionnaire, publish), and how to roll back | review |

In the JSON, `depends_on` lists real ids: LAUNCH-01 depends on the last feature of every system it reviews.

For `mvp` scope, the plan ends with LAUNCH-01 and LAUNCH-04 only, placed in M2 (same ids; LAUNCH-04 then depends on LAUNCH-01 alone).

## 6. Revisions

Requirements change only through a revision, during `game-spec` or when `build-game` finds the spec wrong or impossible:

1. Edit the frozen fields (or add/remove features), increment `spec_revision`.
2. Every changed feature that was `done` goes back to `todo` with its old evidence kept; it is verified again.
3. Append to `design/DECISIONS.md`: `spec_revision <n>: <what changed> — <why> — <features affected>`.
4. `game-plan.mjs guard` must pass before the commit.

Never edit acceptance criteria to make a failing implementation pass. If a criterion is wrong (a number that plays badly, a check that can't be observed), the revision says so explicitly.
