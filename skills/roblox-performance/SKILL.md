---
name: roblox-performance
description: "Roblox performance: MicroProfiler, Developer Console, frame budgets, --!native, Parallel Luau, memory leaks, StreamingEnabled, mobile tuning. Use when fixing low FPS, lag, memory growth or server heartbeat drops."
---

# Roblox Performance

## When to Load

Use for profiling and performance budgets. Pooling, throttling and other code-level patterns: roblox-luau-patterns. Remote payload budgets: roblox-networking.

## Quick Reference

### Profiling Tools
- **MicroProfiler (`Ctrl+F6`, `Cmd+F6` on macOS)**: frame breakdown of scripts, physics, rendering. Server captures: Developer Console → MicroProfiler → Server.
- **Developer Console (`F9`)**: Log, Memory, Luau heap snapshots, Network, Script Profiler.
- **Script Profiler** (no shortcut; Developer Console → ScriptProfiler, Client or Server): per-function CPU time. Allocations: Luau heap.
- **Labels**: `debug.profilebegin`/`debug.profileend` mark regions; `debug.setmemorycategory` labels memory. Gate instrumentation behind a flag.

### Performance Targets
| Metric | Starting target | Investigate at |
|--------|-----------------|----------------|
| Server heartbeat | < 16ms | > 33ms |
| Client FPS (desktop) | 60 | < 30 |
| Client FPS (mobile) | 45 | < 30 |
| Memory | device-specific | sustained growth |

Optimize measured hot paths, not folklore. Throttle from measurements; re-profile after shipping.

### Native code generation
- `--!native` at the top of a server script (or `@native` on one function) compiles to machine code. Helps compute-heavy Luau (math loops, tables, buffers); little gain for API-call-heavy code.
- Costs startup time and memory, with a game-wide size cap: use `@native` on profiled hot functions, not everywhere. Confirm with the Script Profiler `<native>` tag.

### Parallel Luau
- Use Actors only after profiling identifies isolatable CPU work.
- Workers compute; synchronize before restricted DataModel writes.
- Do not rely on shared module state across Actors. `SendMessage` copies data; SharedTable supports shared state and atomic updates.

### Hot-loop cost model
- Luau optimizes global imports; avoid folklore function hoisting/unrolling. Environment impurity can disable optimizations. Profile allocations as well as CPU; GC cost may occur later.

### Memory
- Clean up per-player connections/tables on `PlayerRemoving`/`CharacterRemoving`; set `Workspace.PlayerCharacterDestroyBehavior = Enabled` if you want the engine to destroy old characters and leaving `Player` objects (default value is `Default`).
- `game.ServerLowMemoryWarning` exists in the engine API but is undocumented: treat it as a best-effort hint to shed load and flush saves, not a fix (full.md).

### Object Pooling
Pre-clone and reuse. Canonical pool code (token-lease ownership): roblox-luau-patterns.

### StreamingEnabled Essentials
- **On by default** for new places. Container-scoped: only Workspace descendants stream. Set `ModelStreamingBehavior = Improved` explicitly (streams non-BasePart descendants with their parent Model); the property's default value is `Default`, which currently behaves like Legacy (BaseParts only).
- **Streamed-out = parented to nil**, not destroyed. Luau refs persist if it streams back.
- **Config (Studio)**: target defaults 1024, min 64; set `StreamingIntegrityMode`; tune from data.
- **Gotcha**: `FindFirstChild("DistantPart")` returns nil if streamed out. Use WaitForChild with timeout.

### Mobile
- Profile geometry, textures, particles, UI, shadows on low-end devices (MicroProfiler works on phones via its web UI).

> Full reference with code examples and API tables: [references/full.md](references/full.md)
