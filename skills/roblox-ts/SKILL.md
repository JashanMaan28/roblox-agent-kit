---
name: roblox-ts
description: "roblox-ts (TypeScript to Luau) reference: missing JS APIs, typeIs/classIs, DataType math, LuaTuple, Luau interop, typing the game tree. Only for TypeScript projects; use when writing or reviewing roblox-ts code."
---

> Based on roblox-ts v3.0.0 docs, generated 2026-01-31. **roblox-ts projects only.** If the project is plain Luau (no `tsconfig.json` / `@rbxts/*` packages), use `roblox-luau-core` and `roblox-luau-types` instead.

TypeScript-to-Luau transpiler for Roblox. Source lives in `.ts`/`.tsx` files and `rbxtsc` compiles it to Luau (usually into `out/`), which Rojo syncs. Edit the TypeScript, never the generated Luau. This is "Roblox with TypeScript
syntax", not full JavaScript - many JS APIs don't exist.

## Core References

| Topic          | Description                                             | Reference                                                |
| -------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| JS Differences | Missing APIs, assert() truthiness, any type, typeof     | [core-js-differences](references/core-js-differences.md) |
| Type Checking  | typeIs, classIs, RemoteEvent validation                 | [core-type-checking](references/core-type-checking.md)   |
| Constructors   | new syntax, DataType math (.add/.sub), collections      | [core-constructors](references/core-constructors.md)     |
| Utility Types  | satisfies, InstancePropertyNames, Services, ExtractKeys | [core-utility-types](references/core-utility-types.md)   |

## Features

| Topic          | Description                                               | Reference                                                      |
| -------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Luau Interop   | $tuple, LuaTuple, type declarations, callbacks vs methods | [feature-luau-interop](references/feature-luau-interop.md)     |
| Game Hierarchy | Typing Workspace children with services.d.ts              | [feature-game-hierarchy](references/feature-game-hierarchy.md) |
