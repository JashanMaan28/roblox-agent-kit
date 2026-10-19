---
name: roblox-reference-art
description: "Generate reference images via Codex CLI or image APIs: concept art, UI mockups, level layouts, turnarounds, textures, and icons, thumbnails and badges fitted to Roblox sizes. Use when a Roblox task needs a picture to work from."
---

# Reference art

`scripts/refimage.mjs` generates images with whichever provider is set up, adds Roblox-specific framing per preset, applies the project's art direction, and fits marketing images to Roblox's upload sizes. No dependencies beyond Node.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/refimage.mjs" detect                # which providers are ready
node "${CLAUDE_PLUGIN_ROOT}/scripts/refimage.mjs" presets               # preset list
node "${CLAUDE_PLUGIN_ROOT}/scripts/refimage.mjs" generate --prompt "<description>" \
  [--preset NAME] [--output art/refs/name.png] [--input ref.png]... [--ref NAME]... \
  [--provider codex|openai|gemini|xai|together] [--size WxH | --aspect W:H] [--quality low|medium|high] \
  [--variants 1-4] [--fit WxH | --no-fit] [--no-profile] [--dry-run] [--timeout S]
node "${CLAUDE_PLUGIN_ROOT}/scripts/refimage.mjs" fit in.png out.png 512x512   # cover-crop + resize a PNG
node "${CLAUDE_PLUGIN_ROOT}/scripts/refimage.mjs" history [N]
```

## Providers

Auto order: `codex`, `openai`, `gemini`, `xai`, `together`. Override per call with `--provider`, per project with `defaults.provider` in the style profile, or globally with `IMAGEGEN_PROVIDER`.

| Provider | Needs | Notes |
|---|---|---|
| `codex` | Codex CLI logged in (`codex login`) | Uses the user's ChatGPT plan, no API key. One agent turn per image (about 40 s to 3 min): run with a 10-minute timeout or in the background. Takes reference images. |
| `openai` | `OPENAI_API_KEY` | gpt-image-2, falls back to gpt-image-1. Takes reference images. About $0.01–0.25 per image. |
| `gemini` | `GEMINI_API_KEY` | Nano Banana. Native aspect ratios, good at keeping a character consistent across references. |
| `xai` | `XAI_API_KEY` | No reference images. |
| `together` | `TOGETHER_API_KEY` | FLUX.1-schnell-Free is free and rate-limited. No reference images. |

If `detect` shows nothing ready, show the user its hints and stop. Never ask for an API key in chat: keys go in environment variables.

## Presets

| Preset | Use for | Output |
|---|---|---|
| `concept`, `environment` | Key art, map/area concepts with scale cues | 16:9 |
| `level-layout` | Top-down plan of zones, paths, spawns | 1:1 |
| `ui-mockup`, `ui-mobile`, `ui-element` | HUD/menu targets before building UI; single buttons/panels | 16:9, 9:16, 1:1 |
| `turnaround`, `prop` | Front/side/back sheets and single props to model from | 16:9, 1:1 |
| `moodboard`, `skybox` | Palette/lighting/material direction; sky mood | 16:9 |
| `texture`, `decal` | Seamless tiles and part-face art | 1024×1024 |
| `icon` | Experience icon | 512×512 |
| `thumbnail` | Experience thumbnail (16:9 is required; other ratios get stretched) | 1920×1080 |
| `badge`, `pass-icon` | Badge, game pass and developer product images (trimmed to a circle on upload) | 512×512 |

Fitting is a center crop plus resize, done in-process (PNG only). If a provider returns JPEG/WebP, the output is left as is and the note says so; `fit` can be rerun on a PNG later.

## Workflow

1. **Check once per session:** `detect`. If a `.imagegen/style.json` exists it is applied to every prompt; don't restate its palette or aesthetic.
2. **Write the prompt for the job, not the preset.** Describe the subject, composition, camera, lighting, palette and mood in 2–4 sentences. The preset already adds the Roblox framing (circle-safe icons, tileable textures, orthographic turnarounds). Say "no text" for anything that isn't a UI mockup; image models misspell. Never put a game title into an icon or thumbnail prompt; add text in a real editor afterwards.
3. **Pick the output path:** `art/refs/` for working references (commit them or not as the user prefers), `art/marketing/` for icons/thumbnails/badges. Descriptive filenames.
4. **Run it.** One image per need; `--variants 2-4` only when the user wants to choose. Use `--dry-run` to see the final prompt for free.
5. **Look at the result** (Read the PNG) before using or reporting it. If it misses, refine the prompt once and say what changed; don't loop without asking.
6. **Report:** the path, the provider, and one line on what the image shows.

Each generation spends the user's money or plan quota. Ask before making more than about 5 images in one task, and prefer refining the prompt over generating more variants.

## Using the references

- **UI:** generate a `ui-mockup` (or `ui-mobile`), confirm it with the user, then build it in code against the image: layout, hierarchy, colors (sample the hex values you see), corner radii, spacing. Follow `roblox-gui` for the real implementation (scale-based sizing, safe insets, touch targets). Compare with a Studio `screen_capture` at the end.
- **Props and characters:** a `turnaround` or `prop` image is a modeling target for Blender or for describing the asset to Studio's generators. To pass it into Studio, `store_image` (absolute local path, ≤ 5 MB) returns an `IMAGEID_` URI that `generate_procedural_model` accepts as `attachedImageUri`; read the tool schema before passing it to other generators. Studio generation also costs quota: ask first (see `studio-mcp`).
- **Levels:** use `level-layout` or `environment` as the plan, then build with `roblox-building`. Keep the image beside the build and check landmarks and paths against it.
- **Textures and decals:** `texture` output is a starting point. Check that the tile repeats without visible seams before using it as a SurfaceAppearance or MaterialVariant colour map. Uploading images to Roblox is manual (Asset Manager) or needs an Open Cloud key with asset scopes, which this kit doesn't request.
- **Marketing:** `icon`, `thumbnail`, `badge` and `pass-icon` come out at upload size. Check readability at 150×150 for icons and keep everything important inside the central circle for badges and passes. `roblox-growth-design` covers what makes icons and thumbnails get clicks.

## Art direction (style profile)

`.imagegen/style.json`, found by walking up from the working directory. It uses the same format as the imagegen-in-cc plugin, so both tools share it:

```json
{
  "name": "Lava Escape",
  "aesthetic": "bright stylized low-poly Roblox look, chunky shapes, soft gradients",
  "palette": ["#FF6B1A", "#2B1B3D", "#FFD23F"],
  "avoid": "photorealism, text, watermarks",
  "notes": "Avatars are blocky R15 proportions",
  "defaults": { "provider": "codex", "quality": "medium" },
  "refs": { "mascot": "art/refs/mascot.png" }
}
```

Derive it from the game (existing art, the GDD, the user's words), confirm it with the user, then write it. `refs.<name>` registers a reference image, and `--ref <name>` attaches it so a mascot or logo stays consistent (needs codex, openai or gemini). Use `--no-profile` for deliberately off-style images. History goes to `.imagegen/history.jsonl` (`IMAGEGEN_NO_HISTORY=1` turns it off); suggest gitignoring it and committing `style.json`.

## Settings

| Env var | Effect |
|---|---|
| `IMAGEGEN_PROVIDER` | Default provider |
| `IMAGEGEN_CODEX_BIN` | Path to the Codex executable |
| `IMAGEGEN_CODEX_EFFORT` | Codex reasoning effort for image turns (default `low`; the image quality comes from the image model, not the reasoning) |
| `OPENAI_IMAGE_MODEL`, `GEMINI_IMAGE_MODEL`, `XAI_IMAGE_MODEL`, `TOGETHER_IMAGE_MODEL` | Model overrides |
| `IMAGEGEN_STYLE_FILE` | Use a specific style profile |

Codex saves to the requested path when its sandbox allows it. Otherwise the script copies the newest image from `$CODEX_HOME/generated_images` (default `~/.codex/generated_images`) that was created during the run.
