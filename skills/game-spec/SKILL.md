---
name: game-spec
description: "Turn a one-line Roblox game pitch into a complete, buildable game design: a short interview (or an auto mode with genre defaults), then design/GAME_SPEC.md, a validated design/features.json build plan and a decision log. Use when starting a new game from an idea, writing a game design doc, or before build-game."
argument-hint: "<pitch> [--auto] [--mvp]"
---

# Game spec

Produces the three files `build-game` executes. The spec is the master prompt for the whole build: every later decision is checked against it, so it must be concrete, consistent and complete.

| File | What |
|---|---|
| `design/GAME_SPEC.md` | The design: identity, loops, rules, systems, data, economy, world, UI, FTUE, monetization, budgets ([template](references/spec-template.md)) |
| `design/features.json` | The build plan: milestones M0–M4, features with Given/When/Then acceptance criteria ([schema](references/features-schema.md)) |
| `design/DECISIONS.md` | Interview answers, auto-mode assumptions, approvals, revisions ([format](references/interview.md#decisionsmd-format)) |

## Inputs

- `$ARGUMENTS`: the pitch, plus optional `--auto` (no questions, recipe defaults) and `--mvp` (scope M0–M2).
- Where to write: the current Rojo project's root (`default.project.json`), else the directory the user names. `design/` may exist before the project is scaffolded: `rbx-new` accepts a directory that holds only `design/`.
- If `design/GAME_SPEC.md` already exists, this is a **revision**: read all three files, apply the change, follow [features-schema.md §6](references/features-schema.md#6-revisions), and keep finished work.

## Workflow

Copy this checklist and tick it off:

```
- [ ] 1. Match the pitch to genre recipes
- [ ] 2. Load design knowledge
- [ ] 3. Interview (or auto mode)
- [ ] 4. Write GAME_SPEC.md
- [ ] 5. Write features.json
- [ ] 6. Validate and self-review
- [ ] 7. Approval and handoff
```

### 1. Match genre recipes

| Recipe | Pitch signals |
|---|---|
| [obby](references/genres/obby.md) | obstacle course, parkour, stages, "escape", tower climb |
| [tycoon](references/genres/tycoon.md) | build a business/base on a plot, droppers, conveyors, earn while you build |
| [simulator](references/genres/simulator.md) | click/collect/upgrade, pets, rebirth, zones gated by stats, grow/harvest |
| [tower-defense](references/genres/tower-defense.md) | waves, place units/towers along a path, loadouts |
| [rpg](references/genres/rpg.md) | quests, levels and XP, enemies and bosses, dungeons, loot, abilities |
| [battlegrounds](references/genres/battlegrounds.md) | PvP fighting, combos, arenas, shooters, duels |
| [horror](references/genres/horror.md) | monster, escape, survive the night, co-op scares, rooms |
| [roleplay](references/genres/roleplay.md) | town life, houses, jobs, vehicles, hangout, family/pets RP |
| [round-based](references/genres/round-based.md) | rounds, intermission, minigames, elimination, roles (murderer/sheriff), disasters, hide and seek |

- **One clear match:** use it.
- **Hybrid** ("tycoon where you defend your base"): the primary recipe owns the core loop, data shape and pacing; take only the named systems from the secondary. Note the split in §0.
- **No match:** take the closest recipe's structure (sections, milestone shape, playtest approach) and design the systems from `roblox-game-design` (`references/full.md` §1–§8 and §11). Say the game is off-recipe in §0.

Read the chosen recipe file(s) completely.

### 2. Load design knowledge

Load `roblox-game-design` and `roblox-player-psychology` (quick references; open their `full.md` for the economy, FTUE and genre sections you need). Load `roblox-monetization` unless money is "None yet", and `roblox-growth-design` for the retention section. Confirm any engine API the spec depends on with `docs_search` / `docs_fetch` when you're not certain it's current.

### 3. Interview

Follow [interview.md](references/interview.md): round 1 (scope, art style, money, assets), round 2 (the recipe's highest-impact questions), an optional round 3. In auto mode ask nothing, take the recommended options and recipe defaults, and log them as assumptions. Write answers into `DECISIONS.md` as you go.

### 4. Write GAME_SPEC.md

Fill [spec-template.md](references/spec-template.md) section by section:

- The **pitch decides identity** (name, fantasy, theme, the unique mechanic, art direction); the **recipe decides structure and numbers** (loops, systems, schema, economy curves, pacing, monetization norms). Rename recipe content to the game's theme ("Lava Stage 7", not "Stage 7").
- The unique mechanic from the pitch gets its own system in §4, its own rules in §2 and its own features. It's the reason this game exists: make it central to the core loop, not a side feature.
- Every number is concrete. Compute the first values of every curve. Use the recipe's defaults unless the pitch or an answer says otherwise.
- Systems follow kit conventions (`new-system`): pure `*Logic` modules with `Config`, server systems own state, controllers render snapshots, remotes validated server-side, ProfileStore for persistence.
- Game name: short, searchable, describes the fantasy (2–4 words). Offer it in the approval summary.

### 5. Write features.json

Follow [features-schema.md](references/features-schema.md):

1. Start with the standard CORE features (M0), adapted to this spec.
2. Add the recipe's feature skeleton, rewritten for this game: real names, the spec's numbers in the acceptance criteria, Given/When/Then form, the right `verify` kinds, `skills` and `spec_refs`. The recipe's "Milestones" line (or its per-milestone tables) sets each feature's `milestone`; a `depends` of `M0` or `-` means the CORE features the feature actually needs (usually CORE-02 bootstrap, CORE-03 remotes, CORE-04 data, CORE-05 QA). Recipe features that duplicate standard ones (analytics wrapper, "launch readiness", publish checklist, performance pass) merge into CORE-10 and the LAUNCH features instead of being copied; keep their genre-specific checks as extra criteria there.
3. Add features for the pitch's unique mechanic and anything the interview added. Remove recipe features the answers ruled out (log it in `DECISIONS.md`).
4. End with the LAUNCH features (or the MVP subset).
5. Top level `spec_revision: 1`; every feature `status: "todo"`, `evidence: []`, `blocked_reason: null`.

### 6. Validate and self-review

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/game-plan.mjs" validate
node "${CLAUDE_PLUGIN_ROOT}/scripts/game-plan.mjs" status
```

(Inside a scaffolded project, `node tools/game-plan.mjs` is the same tool.) Fix every error and reconsider every warning. Then run the self-review checklist at the end of [spec-template.md](references/spec-template.md) and fix what it finds: traceability (rules → systems → features), data ownership, economy sources/sinks, numbers agreeing across sections, FTUE reachable with M1 features, no placeholders.

### 7. Approval and handoff

- **Interactive:** show the approval summary from [interview.md](references/interview.md#approval-interactive-mode) and ask once. Apply changes until approved; log the approval.
- **Auto mode:** log "approved by auto mode" and continue.
- If `build-game` called this skill, return to it. Otherwise tell the user: the spec is ready, `/roblox-agent-kit:build-game` builds it, and the three files can be edited by hand first (re-run `game-plan.mjs validate` after editing).

If the project is already a git repository, commit the `design/` folder: `Add game spec (revision 1)`.

## Rules

- The spec describes *what* and *why* with exact numbers; `build-game` decides file-level *how* within kit conventions. Name systems and modules, but don't write code in the spec.
- Defaults come from the recipe, not invention: when the recipe gives a number, use it unless there's a stated reason.
- High-impact choices (data schema, Robux products and prices, paid random items, Studio generation quota, Creator Store assets) are decided here and approved once, so the build can run without stopping.
- Products are created by the user (Creator Dashboard, or the Open Cloud developer-product/game-pass APIs with their explicit go-ahead); the spec lists them with prices and `build-game` wires them by name through `src/shared/Products.luau`.
- Paid random items follow `roblox-monetization`: odds shown before purchase and a `PolicyService` path for restricted players.
- Content stays inside what Roblox's Maturity & Compliance questionnaire allows for the intended audience; note the expected label in §14 (Minimal/Mild reach Roblox Kids and Select, Moderate reaches Select and 16+). Games whose primary activity is a social hangout, and free-form drawing/painting features, are limited to players 16+: keep roleplay games role-driven and say so in §0.
