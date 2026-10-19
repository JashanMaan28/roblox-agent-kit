# design/GAME_SPEC.md template

Fill every section. Concrete beats vague: numbers, names, studs, seconds, Robux. Section numbers are stable anchors: features cite them in `spec_refs` ("§4 Checkpoint"). Keep it to what the build needs (typically 250–500 lines); the genre recipe supplies defaults, the pitch and interview supply the identity.

## Contents
Template sections §0–§14, then the self-review checklist.

````markdown
# <Game name>

> <One-sentence pitch a player would repeat to a friend.>

Spec revision: 1 · Scope: launch | mvp · Genre: <primary> (+ <secondary>) · Recipes: <files used>

## §0 Identity
- **Fantasy:** what the player gets to be/do, in one line.
- **Pillars (3):** the non-negotiables every decision is checked against (e.g. "Every 30 s something new", "Fair deaths", "Show off").
- **Audience:** age band, experience level, what they play now.
- **Platforms:** phone first / PC / console; minimum supported phone width.
- **Server:** max players, solo-in-shared-server vs co-op vs competitive; private servers yes/no.
- **Session target:** first session length; return cadence.
- **Hook:** the moment in the first 60 s that makes them stay.

## §1 Loops
| Loop | Cadence | Player does | Gets |
|---|---|---|---|
| Core | seconds | … | … |
| Meta | minutes–hour | … | … |
| Long-term | days | … | … |

Pacing targets: first reward ≤ N s, first upgrade ≤ N min, first <milestone> ≤ N min, rebirth/prestige at ~N h.

## §2 Rules
The rules that code will enforce, numbered (R1, R2…), each one testable. Win/lose/fail conditions, cooldowns, limits, ownership, what persists.

## §3 Content
Lists with counts: stages/levels/zones, enemies, items/units/pets, quests, maps, cosmetics. Each with the stats that matter (table). Launch content = what M3 ships; growth content = later.

## §4 Systems
One block per system, named as in code:

### <SystemName>
- **Owns:** authoritative state and where it lives (`src/server/Systems/<Name>.luau`, pure rules in `src/shared/<Name>Logic.luau`).
- **Client:** what `src/client/Controllers/<Name>Controller.luau` shows and requests.
- **Remotes:** `<Name>Request(args: types)` → validation (type, range, rate, ownership); `<Name>Sync(snapshot)`.
- **Persists:** profile fields (→ §5) or "session only".
- **Config:** tunables with starting values.
- **Depends on:** other systems.
- **Abuse cases:** what an exploiter would try and why it fails.

## §5 Data
```luau
export type Profile = {
	version: number,
	-- every persisted field, with units and caps
}
```
Defaults, caps, migration notes, what is session-only, data-store names (ProfileStore store name + key format).

## §6 Economy
- Currencies (soft / premium / social) and caps.
- Sources and sinks table with rates per minute at early/mid/late game.
- Price and reward curves as formulas with the first 5 values computed.
- Inflation guard: what keeps old content relevant.

## §7 World and art direction
- Zones: name, purpose, size in studs, connections, landmarks, spawn points. Tags (`CollectionService`) used by systems.
- Scale: an R15 character is ~5 studs tall; doors ≥ 8 high × 5 wide; corridors ≥ 8 wide. Movement limits from the defaults (WalkSpeed 16, JumpHeight 7.2 → ~0.54 s airtime, ~8.7 studs of horizontal travel): required jumps stay ≤ 6 studs up and ≤ 7 studs across edge to edge unless the spec changes movement stats.
- Art direction: style, palette (5–7 hex colours with roles), materials, lighting technology, Atmosphere/ColorCorrection/Bloom values, time of day, skybox mood. Reference images in `art/refs/` if generated.
- Asset sources: built from parts / Studio generation / Creator Store (approved per §14).

## §8 UI and input
- HUD elements with positions (phone thumb zones) and what they show.
- Screens: name, how opened, contents, close behaviour.
- Input map: action → keyboard / gamepad / touch.
- Accessibility: text ≥ 18 px on phone, touch targets ≥ 44 px, colour not the only cue.

## §9 FTUE
Numbered beats with timestamps for the first 60 s and first 5 min. What teaches each mechanic (environment, highlight, arrow, NPC line) — no walls of text.

## §10 Monetization
| Item | Type (pass / product / subscription) | Price R$ | What it gives | Rule (no pay-to-win where…) |
|---|---|---|---|---|
Policy: paid random items (odds shown; `PolicyService` restricted path), receipts idempotent, products created by the user (Creator Dashboard, or Open Cloud with their go-ahead; ids go in `src/shared/Products.luau`). Prices are defaults: Managed Pricing may adjust them per region.

## §11 Social and retention
Daily/playtime rewards, codes, leaderboards, friends/party features, group or like rewards, chat features (TextChatService, filtering for any player-written text).

## §12 Analytics
Onboarding funnel steps, economy events (source/sink names), custom events and the questions they answer.

## §13 Technical budget
Max players, max NPCs/projectiles/parts at once, StreamingEnabled on/off and why, target server heartbeat and client FPS, network budget notes.

## §14 Decisions, assumptions and approvals
- Interview answers and auto-mode defaults (pointer to `DECISIONS.md` for the full log).
- Approved high-impact choices: data schema (§5), product list and prices (§10), paid random items yes/no, content maturity expectation, Studio asset generation allowed (quota), Creator Store assets allowed.
- Out of scope for this revision.
````

## Self-review before handing off

- [ ] Every rule in §2 is enforced by a system in §4 and tested by an acceptance criterion.
- [ ] Every system in §4 has at least one feature; every feature cites a section.
- [ ] Every persisted field in §5 is written by exactly one system.
- [ ] Every currency in §6 has at least one source and one sink; first 5 curve values are computed and sane.
- [ ] Every HUD element and screen in §8 is fed by a system; every action has keyboard, gamepad and touch.
- [ ] FTUE (§9) reaches the first reward within the §1 target using only M1 features.
- [ ] Numbers agree across sections (prices, rewards, caps, timers).
- [ ] No placeholders ("TBD", "etc.", "some") remain.
