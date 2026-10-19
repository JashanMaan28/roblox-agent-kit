---
name: ecs-design
description: "ECS design with jecs (Luau or roblox-ts): component granularity, tags vs data, relationships, system scope and ordering, query caching, archetype costs. Use when designing components, systems or entity structures for jecs."
---

# ECS Design Principles

Design guidance for [jecs](https://github.com/Ukendio/jecs) on Roblox (written against jecs v0.11.0, the current release as of 2026-10). Reference examples use roblox-ts (TypeScript), but the design concepts are the same in Luau. For API details, read the jecs repo's `how_to/` folder at the version the project pins.

## Luau equivalents

The TypeScript `world.method(...)` calls map one-to-one to Luau `world:method(...)`:

```luau
local jecs = require(ReplicatedStorage.Packages.jecs) -- path depends on your Wally/Rojo layout
local pair = jecs.pair

local world = jecs.world() -- jecs.world(true) = debug world with extra checks

-- Components: typed ids. A component with no data is used as a tag.
local Position = world:component() :: jecs.Id<Vector3>
local Velocity = world:component() :: jecs.Id<Vector3>
local Frozen = world:component()

local entity = world:entity()
world:set(entity, Position, Vector3.zero)
world:set(entity, Velocity, Vector3.new(0, 0, 2))
world:add(entity, pair(jecs.ChildOf, parentEntity)) -- relationship
local position = world:get(entity, Position) -- Vector3? (nil if absent)

-- Queries: build cached ones once at module scope, not inside the system
local moving = world:query(Position, Velocity):without(Frozen):cached()

local function movementSystem(dt: number)
	for e, pos, vel in moving do
		world:set(e, Position, pos + vel * dt)
	end
end
```

jecs gotchas (verified against the v0.11.0 source, 2026-10):

- `:with()` / `:without()` **replace** the filter, so pass every term in one call (`:with(A, B)`, not `:with(A):with(B)`).
- A plain (uncached) query object is **single-pass**: iterating it a second time yields nothing. Call `world:query(...)` again, or use `:cached()`.
- **v0.11 forbids structural changes (`add`/`remove`/`set` of new components) inside `OnRemove` hooks.** It hard-errors on some paths (exclusive-relationship replacement, bulk removal), and the release notes warn others can fail silently. Push the work into a queue that you flush at the next sync point.

## Core Mental Model

Think of ECS as a **columnar database**:

| Database | ECS                                      |
| -------- | ---------------------------------------- |
| Table    | Archetype (unique component combination) |
| Column   | Component type                           |
| Row      | Entity                                   |
| Query    | System iteration                         |

**Design question:** "Would I create a separate database column for this?"

## Core References

| Topic          | Description                                               | Reference                                                |
| -------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Database Model | ECS as columnar database, normalization, fragmentation    | [core-database-model](references/core-database-model.md) |
| Query Design   | Multi-entity queries, constraint decomposition, traversal | [core-query-design](references/core-query-design.md)     |

## Best Practices

| Topic            | Description                                                | Reference                                                            |
| ---------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| Component Design | Granularity decisions, when to split/combine, tags vs data | [best-practices-components](references/best-practices-components.md) |
| System Design    | Single responsibility, avoiding work, ordering, data flow  | [best-practices-systems](references/best-practices-systems.md)       |
| Entity Design    | When to create entities, lazy creation, scaling patterns   | [best-practices-entities](references/best-practices-entities.md)     |

## Quick Decision Guide

| Question                    | Answer                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| Should this be an entity?   | Only if it needs per-instance state that changes over time          |
| Split or combine?           | "Is there a system that needs A but not B?"                         |
| Tag or data component?      | Tags for stable classification (free to add/remove), data for state |
| Relationship or entity ref? | Relationship if reverse lookup needed, entity member otherwise      |
| Is fragmentation bad?       | Only if thousands of archetypes AND you query broadly               |
| When does DOD matter?       | Thousands of entities, per-frame, CPU-bound                         |

## Common Mistakes

| Mistake                               | Why it's bad                     | Fix                                   |
| ------------------------------------- | -------------------------------- | ------------------------------------- |
| Monolithic components                 | Cache waste, tight coupling      | Split by access pattern               |
| Over-atomic components                | Query complexity, invalid states | Combine semantic units                |
| Frequent add/remove on large entities | Copies all component data        | Mutate data component instead         |
| Relationships for every link          | Fragmentation without benefit    | Use entity members for forward-only   |
| Cached query inside system            | Creates new cache every frame    | Create cached queries at module scope |

## Key Principles

1. **Components by access pattern** — Group data that systems need together
2. **Archetype transitions copy data** — Adding/removing components copies all
   data to new archetype; cheap on small entities, expensive on large ones
3. **Entity members vs relationships** — Use entity members for forward lookup,
   relationships for reverse lookup or grouping
4. **Cache queries at module scope** — Never call `.cached()` inside a system
5. **Filter in query** — Use with/without, not code conditionals
6. **Fragmentation can help** — Relationships enable efficient grouped queries

<!--
Source references:
- https://github.com/SanderMertens/flecs/blob/master/docs/DesignWithFlecs.md
- https://github.com/SanderMertens/ecs-faq
-->
