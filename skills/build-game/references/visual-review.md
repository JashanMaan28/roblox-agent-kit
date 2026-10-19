# Visual review

How a `visual` acceptance criterion is checked: a separate judge captures the game in Studio from the reference's framing, scores it against the reference with a fixed rubric, and the builder fixes until it passes. The builder never grades its own screenshots.

## Contents
1. When
2. Set up the shot
3. The judge
4. Rubrics
5. Pass, fix, debt
6. Evidence

## 1. When

Every acceptance criterion with `verify: ["visual"]`: zone blockout and lighting (CORE-06/07), UI shell and screens (CORE-08 and UI features), detail and juice passes, signature moments, store art (LAUNCH-03), and the hero-angle re-check at each milestone gate from M1 on.

## 2. Set up the shot

- **World shots:** world built from the builders, lighting applied, no probes or debug parts. Use the hero camera from `art/refs/README.md` (Edit datamodel is fine; play mode when characters, NPCs or effects should be in frame).
- **UI shots:** start a playtest, reach the state the mockup shows through QA (currency, items, an open shop), set the device with `StudioDeviceSimulatorService` (`skill` → `rbx-device-simulator-lua`) to the mockup's device and orientation.
- **Moments:** trigger the moment through QA and capture at its peak (the judge times its capture from your note, e.g. "0.3 s after `QA:Invoke('Reward.grant', p, 'Big')`" — or pause the effect with a QA freeze command if the game has one).
- Studio's window must be visible (minimised windows capture black). SurfaceGui/BillboardGui text can be missing from captures: check those through `inspect_instance` instead and tell the judge to ignore missing world-space text.

## 3. The judge

Spawn a subagent on a smaller model (e.g. Sonnet) for each check, in the foreground, and wait for it. It has the Studio MCP tools, so it takes the screenshot itself. Give it this brief, filled in, and nothing that predicts the verdict:

```
You are a strict art director for a Roblox game. Review one in-game shot against its reference.
Read-only: do not edit files, scripts or the place. Use only Read, list_roblox_studios,
get_studio_state and screen_capture.

1. Read the reference image <art/refs/ID.png> (or, if "none", this written target: <text>)
   and the rubric section "<World|UI|Moment|Store>" of <path to visual-review.md>.
2. Take the shot: screen_capture on studio <studio_id>, capture_id "<id>",
   camera_position <[x,y,z] or omit>, look_at_position <[x,y,z] or omit>. <timing note if any>
   Ignore missing world-space text (BillboardGui/SurfaceGui). <manifest notes for this ref>
3. Judge whether the shot reads as the same game as the reference at its intended quality,
   not pixel equality. Score every rubric line 1-5 with the anchors.
4. Reply with exactly:
   line 1: visual ref=<ref path or none> judge=<your model> <line>=<score> ... (every rubric line)
   then up to 5 fixes, most impactful first, each concrete: what, where, and the target
   (a hex colour, a Lighting property value, a size in studs, a UI position).
```

If the judge reports a black or empty capture, fix the setup (window visible, correct `studio_id`, camera inside the map) and rerun; that round doesn't count.

## 4. Rubrics

Anchors: **5** matches the reference's intent with nothing to fix · **4** clearly the same look, small fixes only · **3** recognisably the target but a noticeable gap · **2** major gap (wrong mood, palette or hierarchy) · **1** unrelated or broken.

**World** (zones, lighting, detail passes)
- `palette`: dominant colours and their roles match (ground, hazard, accent, sky)
- `lighting`: time of day, contrast, shadow softness, atmosphere/haze, colour temperature
- `readability`: walkable, hazardous, interactable and decorative surfaces are distinguishable at a glance; the next objective is visible
- `composition`: the hero framing shows the same landmarks, layout and depth layering
- `materials`: material language and level of detail match (no plain grey placeholder parts left in frame)
- `mood`: the fantasy from spec §0 comes across

**UI** (HUD, screens)
- `hierarchy`: the most important information is the most prominent, as in the mockup
- `legibility`: text and icons readable at the device size; contrast is sufficient
- `layout`: positions match the mockup and spec §8; nothing under thumbs, clipped, or outside the safe area
- `palette`: theme colours, corner radius and strokes match the style
- `polish`: consistent spacing, alignment and iconography; no default Roblox-looking widgets left

**Moment** (rewards, boss intros, round wins)
- `impact`: the moment reads as big as its importance (scale, flash, particles, camera)
- `clarity`: what happened and what was gained is readable through the effects
- `palette`, `mood`: as for World

**Store** (icon, thumbnails)
- `clarity`: subject and fantasy readable at 150×150 (icon) / 480×270 (thumbnail)
- `focus`: one clear subject, uncluttered background, nothing important outside the safe circle (icon)
- `palette`, `appeal`: on-style, saturated, inviting; no text or logos baked in

## 5. Pass, fix, debt

- **Pass:** every score ≥ 4. Record the verdict as evidence.
- **Fix rounds:** otherwise apply the judge's fixes (most impactful first), rebuild/recapture, and send a **new** judge the same brief. Up to 3 rounds. Between rounds, change the cause, not the camera: lighting values (`roblox-lighting`), materials and colours, geometry and landmarks (`roblox-building`), UI tokens and layout (`roblox-gui`), effects (`roblox-animation-vfx`).
- **After round 3:** if every score is ≥ 3, record the best verdict with the word `debt` and the open fixes, and add them to the "Visual debt" list in `design/PROGRESS.md`; the M3 polish gate clears that list. Any score still below 3 means the approach is wrong: re-read the reference and spec §7, rethink the build (different geometry or lighting strategy), and keep going. If the reference itself is unreachable in Roblox, regenerate it within budget (log the reason in DECISIONS.md) and judge against the new one.
- `game-plan.mjs done` refuses visual evidence without `ref=` (an existing file or `none`), `judge=`, at least 3 scores, any score below 3, or a score below 4 without `debt`.

## 6. Evidence

```
CORE-07-AC2=visual ref=art/refs/zone-spawn.png judge=sonnet palette=5 lighting=4 readability=4 composition=4 materials=4 mood=5 round=2
OBY-06-AC3=visual ref=art/refs/ui-hud-phone.png judge=sonnet hierarchy=4 legibility=5 layout=4 palette=4 polish=3 round=3 debt: button strokes inconsistent, coin icon off-style
```

Write one line per check in PROGRESS.md too, so the visual history of the build is readable without opening `features.json`.
