---
name: roblox-physics
description: "Roblox physics: constraints and attachments, vehicles, ragdolls, moving platforms, projectiles, raycast filtering, collision groups, network ownership. Use when parts fling, jitter, fall through floors or desync."
---

# Roblox Physics

## When to Load

Use this skill when building physics-driven gameplay: vehicles, ragdolls, projectiles, mechanical contraptions, elevators, swinging platforms, or anything using constraints and forces.

## Quick Reference

### Constraint Types
**Mechanical:** `HingeConstraint`, `PrismaticConstraint`, `CylindricalConstraint`, `BallSocketConstraint`, `UniversalConstraint`, `WeldConstraint`/`RigidConstraint`
**Motion:** `AlignPosition`, `AlignOrientation`, `LinearVelocity`, `AngularVelocity`, `VectorForce`, `Torque`
**Spring/Rope:** `SpringConstraint`, `RopeConstraint`, `RodConstraint`

### Attachment Pattern
Constraints connect via `Attachment` objects. Create one on each part, set `Attachment0`/`Attachment1`, and parent the constraint to part0. Hinge/prismatic/cylindrical axes are the attachments' **X** axis: orient attachments deliberately (e.g. `CFrame.Angles(0, 0, math.pi/2)` for a vertical slide) and enable `LimitsEnabled` where travel must stop. Actuator types include `None`, `Motor`, and `Servo`.

### Vehicles
Each wheel needs a joint that slides on the suspension axis and spins on the axle: a `CylindricalConstraint` (slide on `Attachment0` X, `InclinationAngle = 90` to spin on its Y, motor for drive, limits for travel) plus a `SpringConstraint` beside it. Servo `HingeConstraint` knuckles steer; `CustomPhysicalProperties` tune grip.

### Ragdoll
Track the joints and instances each ragdoll changes; recover only owned state, and coordinate overlapping effects before restoring movement. `Humanoid:ChangeState(Physics)` only works where the character's physics is owned: on the owning client for player characters (fire it a RemoteEvent), on the server for server-owned NPCs. Set `Humanoid.BreakJointsOnDeath = false` for death ragdolls. `BallSocketConstraint` recipe: full.md.

### Authority and Network Ownership
Classic projects: automatic ownership can give an unanchored assembly to a nearby player. `SetNetworkOwner(nil)` keeps it server-owned; `SetNetworkOwner(player)` gives a player simulation ownership. Treat player-owned physics as untrusted and validate gameplay outcomes.

Server Authority: set `Workspace.AuthorityMode = Server` with its required settings. Core objects can remain server-owned while prediction keeps controls responsive, so the classic secure-but-laggy trade-off does not apply. `SetNetworkOwner()` is not a substitute.

**Rule:** choose the model first. Keep NPC and gameplay-critical objects authoritative; give client ownership to non-critical physics only when the resulting behavior is acceptable and tested.

### Common Gotchas
- Constraints do nothing on Anchored parts
- Both Attachment0 AND Attachment1 required (missing one = silent fail)
- Over-constraining = jitter. Tune mass with `CustomPhysicalProperties`
- Use Raycast for hitscan, `Touched` only for slow physics projectiles
- Filter queries with `RaycastParams`/`OverlapParams` `ExcludeInstances`/`IncludeInstances` (`FilterDescendantsInstances` + `FilterType` are superseded)
- Legacy `Body*` movers are deprecated: use `LinearVelocity`, `VectorForce`, `AlignPosition`/`AlignOrientation`, `AngularVelocity`, `Torque`
- Always set a lifetime on physics projectiles

See [references/full.md](references/full.md) for recipes, API details, and checks; [references/queries-and-ownership.md](references/queries-and-ownership.md) for spatial queries, collision-flag policy and ownership testing. Character rigs and Humanoids: `roblox-characters`.
