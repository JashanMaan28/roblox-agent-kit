# Art direction and reference images (CORE-00)

The first M0 feature turns spec §7 into pictures the whole build aims at: a style profile, a reference set and a manifest. Every world, UI and juice feature is later judged against these images ([visual-review.md](visual-review.md)), so they must show a look the game can actually reach in Roblox.

## Contents
1. Budget and fallback
2. Style profile
3. The reference set
4. Writing the prompts
5. Reviewing each image
6. Manifest
7. Acceptance for CORE-00

## 1. Budget and fallback

- Use the image budget approved in spec §14 (interview "Assets"; default ~15–20 images for a launch build, ~8 for MVP). Count every generation, including retries and LAUNCH-03 store art; keep a running total in `art/refs/README.md`.
- Provider: `node "${CLAUDE_PLUGIN_ROOT}/scripts/refimage.mjs" detect` (`roblox-reference-art`). Codex CLI images take 40 s–3 min each: run generations in the background and keep working on code meanwhile.
- If §14 says "Parts and code only", or no provider is ready: skip generation, still write the style profile and the manifest with written target descriptions per shot, and judge with `ref=none` against them. Note it once in PROGRESS.md.

## 2. Style profile

Write `.imagegen/style.json` from spec §7 so every image shares one look (format in `roblox-reference-art`):

```json
{
  "name": "Lava Tower Obby",
  "aesthetic": "Roblox in-engine screenshot look: chunky part-built geometry, SmoothPlastic and Neon materials, soft Future lighting, clean readable silhouettes, saturated but limited palette",
  "palette": ["#FF5A1F", "#2B1B3D", "#FFD23F", "#3DDC97", "#F2F2F2"],
  "avoid": "photorealism, painterly brush detail, film grain, tiny clutter, text, logos, watermarks",
  "notes": "R15 blocky avatars about 5 studs tall for scale; hazards are neon orange-red; safe platforms are cool grey",
  "defaults": { "quality": "medium" }
}
```

- `palette` is the spec §7 palette verbatim (the spec stays the source of truth; CORE-08 theme tokens use the same hex values).
- `aesthetic` always describes an *in-engine* Roblox look. Concept-art polish the engine can't reproduce makes every later visual check fail.
- Add `.imagegen/history.jsonl` to `.gitignore`; commit `style.json` and `art/refs/`.

## 3. The reference set

| Shot | Preset | Count | Judged by |
|---|---|---|---|
| Key art / mood board: palette, lighting, materials, the fantasy in one frame | `moodboard` | 1 (reuse the one `game-spec` made for approval, if any) | Every visual check (overall look) |
| Each zone from its hero angle (spawn view, zone overview) | `environment` | 1 per zone in spec §7 (max 6; group similar zones) | CORE-06/07, zone and detail-pass features |
| HUD on a phone in landscape, plus one main screen (shop or inventory) | `ui-mobile`, `ui-mockup` | 2–3 | CORE-08 and UI features |
| Hero props or characters that carry the theme (the egg, the boss, the tower) | `prop`, `turnaround` | 0–4 | Features that build them; Studio generation (`attachedImageUri`) |
| Signature moment (big reward, boss intro, round win) | `concept` | 0–1 | The juice feature for that moment |

Skip a shot when the genre doesn't need it; never generate more than the budget. Store art (icon, thumbnails) waits for LAUNCH-03, when real screenshots exist to describe.

## 4. Writing the prompts

Each prompt: subject, composition, **camera**, lighting, palette roles, and what must read at a glance, in 2–4 sentences. The style profile adds the aesthetic.

- **Name the camera the game will reproduce:** "eye level from the spawn pad, 3/4 view toward the first jump, character small in the lower third" or "top-down 55° over the whole map". The screenshot for the visual check uses the same framing.
- **Stay buildable:** "geometry built from blocks, wedges and cylinders", "large simple shapes", "few materials". Ask for silhouettes and colour blocking, not texture detail.
- **Assign palette roles:** which hex is ground, hazard, accent, sky, UI panel.
- **UI mockups:** list the exact HUD elements and positions from spec §8 (coins top-centre, gather button bottom-right above jump); say "placeholder text shapes, no readable words" to avoid misspelled text.
- Save to `art/refs/<id>.png` with ids like `mood`, `zone-spawn`, `zone-lava`, `ui-hud-phone`, `ui-shop`, `prop-egg`.

## 5. Reviewing each image

Read the PNG before accepting it. Keep it only if all hold:
1. **On brief:** shows the shot asked for, with the spec's palette roles and mood.
2. **Achievable:** buildable from parts/simple meshes with Roblox lighting at the spec's scale; nothing depends on painterly detail, complex organic modelling or post effects Roblox lacks.
3. **Consistent:** matches the mood board and the other refs (same lighting temperature, material language, saturation).
4. **Readable:** gameplay elements (paths, hazards, interactables, HUD hierarchy) are distinguishable at phone size.

Otherwise refine the prompt once (say what changed) and regenerate; if the second try still misses, keep the better one and write the gap into the manifest's notes so the visual judge knows. Register the mood board and any hero prop in `style.json` `refs` (`--ref mood`) so later images stay consistent.

## 6. Manifest

`art/refs/README.md`:

```markdown
# Reference images
Budget: 18 approved · 9 used

| id | file | shows | hero camera (position → look-at) | used by |
|---|---|---|---|---|
| mood | mood.png | key art: lava tower at dusk, neon hazards | – | all visual checks |
| zone-spawn | zone-spawn.png | spawn pad toward stage 1 | (0, 12, -30) → (0, 6, 20) | CORE-06, CORE-07, OBY-03 |
| ui-hud-phone | ui-hud-phone.png | HUD, phone landscape | device: phone landscape | CORE-08, OBY-06 |

Notes: zone-lava sky is more purple than the palette allows; judge against palette, not the sky hue.
```

Hero cameras are filled in during CORE-06, once the blockout exists: pick the position that reproduces the reference framing, then record it so every later check uses the same shot.

## 7. Acceptance for CORE-00

- `.imagegen/style.json` palette equals spec §7 palette; `aesthetic` describes an in-engine Roblox look (`review`).
- Every shot listed in spec §7 exists in `art/refs/` and in the manifest with its purpose and consumers, within budget (`review`); or, without images, the manifest has a written target per shot.
