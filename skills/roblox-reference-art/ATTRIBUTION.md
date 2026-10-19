# Attribution

| Source | Paths used | License | Copy |
|---|---|---|---|
| https://github.com/JashanMaan28/imagegen-in-cc (commit 2ff2368) | `skills/imagegen/SKILL.md`, `skills/imagegen/providers.md`, `scripts/imagegen.sh` | MIT | `LICENSE-imagegen-in-cc` |

## Modifications

- The bash + python3 + Pillow dispatcher was rewritten as a dependency-free Node script (`scripts/refimage.mjs`) so it runs natively on Windows. It keeps the provider APIs, the model fallbacks, Codex `exec` driving and the `.imagegen/style.json` format.
- Codex output is now recovered from `$CODEX_HOME/generated_images` when the sandbox blocks the write. Prompts go over stdin, reference images are attached with `codex exec -i`, and reasoning effort is set to low for image turns.
- Added Roblox presets (concept, environment, level layout, UI mockups, turnarounds, props, mood boards, textures, decals, icon, thumbnail, badge, pass icon). The sizes come from the Creator Docs: 512×512 icons, badges and pass/product icons with circular trimming; 16:9 1920×1080 thumbnails; texture sizes.
- Added a pure-Node PNG cover-fit to replace Pillow crop/resize.
- Dropped web-specific features (og cards, favicons, placeholders, white-key transparency, WebP conversion) and the `gemini-cli` provider.
- The skill text is rewritten for Roblox workflows (UI from mockups, Studio `store_image` → generators, building from layouts, marketing assets).
