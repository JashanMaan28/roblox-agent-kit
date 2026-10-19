---
name: roblox-luau-core
description: "Luau language core for Roblox: tables, iteration, closures, strings, buffer, --!native, naming, and replacing deprecated APIs (wait, spawn, BodyMovers, LoadAnimation). Use when writing, reviewing or debugging any Luau."
---

# Luau Core Language

## When to Load

Load for Luau semantics and JS/Python translation. Types: `roblox-luau-types`; lifecycle: `roblox-luau-patterns`; engine APIs: domain skills.

## Quick Reference

- Only `false` and `nil` are falsy. `0`, `""`, and `{}` are truthy.
- Equality does not coerce types. `0 == "0"` is false. Inequality is `~=`.
- Array conventions are 1-based. `#array` is meaningful only for a sequence without nil gaps.
- Assigning `nil` removes a table key; assigning a table copies the reference; `table.clone` is shallow.
- Dictionary iteration order is unspecified. Do not make behavior depend on it.
- Dynamic keys require brackets: `record[field]`. Dot syntax uses a literal identifier.
- Missing arguments become `nil`; extra results and arguments can be discarded.
- Prefer an `if` expression over `condition and a or b` when `a` may be falsy.
- Locals start at their declaration; `repeat` locals reach `until`. Forward-declare mutual recursion.
- Luau string patterns are not regular expressions. Their syntax and capabilities differ.
- Backtick interpolation and `..` are valid. Join many fragments once in hot loops.
- NaN does not equal itself and defeats `<`/`>`; test with `x ~= x`.
- Binary data uses the `buffer` library: fixed size, 0-based offsets, explicit-width reads/writes. Roblox's `buffer` has no `readinteger`/`writeinteger` (upstream-only, flag-gated).
- For Base64, hashing, or compression use `EncodingService` (buffers, not strings; JSON via `HttpService`). Details: see full reference.
- Put nothing else on a `--!strict` line: `--!strict -- comment` makes the analyzer ignore the directive and silently fall back to nonstrict.
- Release notes are not Roblox availability. `if local`/`if const` is a Studio beta that won't compile in published games; `coroutine.finally`, exact tables, classes, and the `integer` library are upstream prototypes, off on Roblox. `const` (Luau 0.711) is shipped.

### Deprecated APIs: look them up, don't recall them

Before using or keeping an older API, check it rather than trusting memory: `docs_search` for the API, then `docs_fetch` the class page, or `docs_fetch` https://create.roblox.com/docs/reference/engine/deprecated.md (every deprecated member, about 600, with its replacement). Common ones: `wait`/`spawn`/`delay` → `task.*`, `BodyMover` family → constraint movers, `Humanoid:LoadAnimation` → `Animator:LoadAnimation`, `SetPrimaryPartCFrame` → `PivotTo`. Table and workflow: full reference §10.

```luau
local label = if enabled then "On" else "Off"
local message = `{name}: {score}`

local byId: {[number]: string} = {}
byId[userId] = name

for index, value in values do
    print(index, value)
end
```

### Translation traps

- JavaScript `===`, `!==`, `null`, optional chaining, spread, arrow functions, and array methods are not Luau syntax.
- Python `None`, zero-based list assumptions, list comprehensions, exceptions, and implicit tuple behavior do not translate directly.
- `x or fallback` tests truthiness, not only absence. It replaces a valid `false` value.
- `typeof(value)` recognizes Roblox datatypes; `type(value)` reports the underlying Luau type category.

### Review

Valid Luau, no nil gaps, no assumed dictionary order, no accidental aliases, no cross-language syntax, no fallbacks hiding `false` or `nil`, no deprecated APIs, no beta or prototype syntax.

> Detailed language traps and translation examples: [references/full.md](references/full.md)
