# Interview

Turn a pitch into decisions with as few questions as possible. Ask only what changes systems, content or approvals; take everything else from the genre recipe and say so.

## Mechanics

- Use `AskUserQuestion`: 1–4 questions per call, 2–4 options each (the user can always type "Other"). Header ≤ 12 characters. Put the recommended option first with "(Recommended)" and a one-line reason in its description.
- At most 3 rounds and 10 questions total. Questions within a round must be independent of each other.
- If `AskUserQuestion` isn't available (headless or non-interactive run), switch to auto mode and say so.
- Answers that contradict the pitch or each other: ask one short follow-up in the next round, don't guess.
- Record every answer in `design/DECISIONS.md` as it comes in.

## Round 1: shape and approvals (always)

| Header | Question | Options (recommended first) |
|---|---|---|
| Scope | How far should the first build go? | **Launch-ready** (M0–M4: content, polish, monetization, store assets, release report) · **MVP** (M0–M2: playable core loop + progression, expand later) |
| Art style | Which visual direction? | Derive 3–4 from the pitch and genre: e.g. **Bright stylized** (smooth plastic + neon accents, saturated palette) · **Low-poly cozy** · **Dark atmospheric** · **Realistic** (Future lighting, PBR materials) |
| Money | How should it make Robux? | **Standard** (passes + products the genre expects, no pay-to-win in competitive modes) · **Cosmetic only** · **None yet** (systems built, no products) |
| Assets | What may the build use besides parts and code? (generation uses your Studio quota / image-provider plan) | **Everything** (Studio mesh/material generation, Creator Store models scanned for scripts, ~10–20 reference and store images via `roblox-reference-art`) · **No Creator Store** · **Images only** (concept art, icon, thumbnails) · **Parts and code only** |

If the genre is ambiguous, replace the least relevant question with: **Genre** — "Which game is this closest to?" with the 2–3 best-matching recipes (and a hybrid option).

## Round 2: genre decisions (always)

Take the recipe's "Interview: questions that change the build" table. Pick the 3–4 rows whose answers would change the most systems for *this* pitch; skip any the pitch already answers. Use the recipe's default as the recommended option.

For a hybrid, ask the primary recipe's top 2–3 and the secondary's top 1–2.

## Round 3: only if needed

Use it for (a) contradictions or gaps exposed by rounds 1–2, or (b) the pitch's unique mechanic, when it has a design fork that changes the build (e.g. "Does the lava rise on a timer or when someone touches the alarm?"). Skip the round if neither applies.

## Approval (interactive mode)

After writing the spec and feature list, show a compact summary:

```
<Game name> — <pitch>
Loop: <core> → <meta> → <long-term>
Scope: launch, 47 features (M0 11 · M1 9 · M2 10 · M3 10 · M4 7)
Data: Profile v1 {coins, stage, bestTime, …}  — store "PlayerData"
Products: VIP pass 199 R$, Skip Stage 25 R$, … (you create these in the Creator Dashboard)
Paid random items: none | yes (odds shown, restricted players get the alternative)
Assets: Studio generation yes, Creator Store yes, images ~15
Assumptions: <3–6 most important defaults>
```

Then one question, header "Approve": **Approve and build** · **Change something** (they type what). Changes → revise spec and features (still revision 1 before the build starts), show the summary again. Record the approval with the date in `DECISIONS.md` and §14.

## Auto mode

Triggered by `--auto`, "just build it", "no questions", "surprise me", or a non-interactive session.

- Don't ask. Use round 1 recommendations (Launch-ready, the art style that best fits the pitch, Standard money, Assets "Everything") and every recipe default.
- Don't expand the pitch beyond the recipe's launch content: the pitch sets identity, the recipe sets scope.
- Write every default you chose into `DECISIONS.md` under "Auto-mode assumptions" with the reason and how to change it. Mark §14 "Approved by: auto mode (user asked for no questions)".
- Continue straight into the build when called from `build-game`.

## DECISIONS.md format

```markdown
# Decisions

## Interview (2026-10-19)
- Scope: launch (user)
- Art style: bright stylized (user)
- Difficulty curve: 30 stages, 3 tiers (recipe default)

## Auto-mode assumptions
- <decision> — <why> — <how to change>

## Approvals
- 2026-10-19: spec revision 1 approved by user (data schema, products, assets)

## Revisions
- spec_revision 2: <what> — <why> — <features affected>
```
