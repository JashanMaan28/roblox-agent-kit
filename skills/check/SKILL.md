---
name: check
description: "Run the full Roblox project check without Studio: StyLua, selene, luau-lsp strict type check and a Rojo build. Use before calling Luau work done, or when asked to lint, type-check or format."
argument-hint: "[--fix] [paths...]"
---

# Check the project

From the project root run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/rbx-check.mjs" $ARGUMENTS
```

- `--fix` formats with StyLua first; `--json` gives machine-readable output.
- Fix every **error** (type errors, selene errors, failed build). Fix warnings when they point at real bugs (unused results, shadowing, deprecated APIs); otherwise mention them.
- If a tool is reported as skipped, run `rokit install` in the project and re-run.
- Re-run until it prints `PASS`, then report the final summary line.
