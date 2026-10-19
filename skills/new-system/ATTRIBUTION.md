# Attribution

`SKILL.md` is adapted from a community skill; `references/templates.md` is kit-authored code that follows its structure and borrows the token-bucket rate limiter from the same repository's example.

| Source | Paths used | License | Copy |
|---|---|---|---|
| https://github.com/ivar-anon/roblox-dev (commit c73640a) | `skills/new-system/SKILL.md` (vertical-slice procedure: shared types, validated server module, client controller, registration, output discipline); `examples/safe-remote/SafeRemote.luau` (token-bucket rate limiting) | MIT | `LICENSE` |

## Modifications

- Converted the `/roblox-dev:new-system` command into a skill with `name` and `argument-hint`; adapted paths to the kit template (`src/shared`, `src/server/Systems`, `src/client/Controllers`, `tests/*.spec.luau` in the kit TestRunner format).
- No longer assumes `Types.luau` exists (create it if missing); remotes are Rojo `.model.json` files instead of runtime-created instances.
- Added full, checked templates (luau-lsp strict with Roblox definitions and sourcemap, selene, StyLua, `rojo build`; the generated spec passed under the TestRunner's matchers) and an after-generation checklist (check, tests, playtest).
- Cross-references renamed to this kit's skills (`roblox-data` instead of roblox-datastores, plus `roblox-security`, `roblox-networking`, `roblox-testing`, `roblox-architecture`, `studio-mcp`, `check`).
