# Roblox physics queries, collision policy, and ownership

Read this when designing collision groups, query filters, a physical gameplay object, or a
multiplayer ownership/security test. Adapted from gamedev-skills `roblox-physics` (Apache-2.0);
see `../ATTRIBUTION.md`.

## Separate the three flags

`CanCollide` controls physical response, `CanTouch` controls touch event participation, and
`CanQuery` controls spatial-query eligibility (subject to query parameters; `CanQuery` can only be
turned off when `CanCollide` is off). Define each by role. Typical sensor parts do not collide but
may touch/query; visual-only geometry may do neither. Use named collision groups through
`PhysicsService` (see `full.md` "Collision groups") and verify the actual matrix in Studio.

## Query selection

- `workspace:Raycast(origin, direction, params)` for the first surface along a segment. Direction
  magnitude is range.
- `workspace:Spherecast` / `Blockcast` / `Shapecast` for swept volumes (thick bullets, melee arcs,
  camera collision). Casts do not detect geometry that already overlaps the starting shape; handle
  initial overlap separately.
- `GetPartBoundsInRadius` / `GetPartBoundsInBox` (cheap, bounding-box) and `GetPartsInPart` (exact
  geometry) for volume candidates. Deduplicate assemblies or target models, and refine if
  bounding-box false positives matter.
- Reuse a `RaycastParams`/`OverlapParams` where the filter is stable; update it when character
  generations or streamed containers change.

### Filtering: current API

`RaycastParams` and `OverlapParams` filter with **`ExcludeInstances`** and **`IncludeInstances`**
(arrays; descendants are covered). They can be combined — include a large folder but exclude
specific children — and exclusions win when an instance matches both. `IncludeInstances = nil`
includes everything; `IncludeInstances = {}` includes nothing. `CollisionGroup`, `IgnoreWater`
(raycast), `RespectCanCollide`, and `MaxParts` (overlap) complete the filter.

```luau
local params = RaycastParams.new()
params.ExcludeInstances = { shooter.Character } -- never hit yourself
params.IgnoreWater = true

local hit = workspace:Raycast(muzzle.Position, aimDirection.Unit * 300, params)

local overlap = OverlapParams.new()
overlap.IncludeInstances = { workspace.Enemies } -- only consider enemies
overlap.MaxParts = 50
local parts = workspace:GetPartBoundsInRadius(blastCenter, 12, overlap)
```

`FilterDescendantsInstances` + `FilterType = Enum.RaycastFilterType.Exclude/Include` (and
`AddToFilter`) are the older form: still functional, but the docs mark them superseded by
`ExcludeInstances`/`IncludeInstances` for new work. Don't mix the two styles on one params object.

Query results are evidence, not a whole gameplay authorization. Also validate actor state, team,
cooldown, origin, target membership, and permissions on the server.

## Assembly and ownership debugging

In Studio, inspect `AssemblyRootPart`, `AssemblyMass`, center of mass, anchors, constraints, and the
network-ownership visualization (a Physics option in Studio Settings). Test automatic
ownership before forcing it. Server ownership protects simulation authority but can increase server
work and latency; client ownership improves response but requires server validation of consequences.

When a mechanism changes anchor state, re-check ownership because prior ownership state may not be
retained (`SetNetworkOwner` errors on anchored parts; call it after unanchoring). For vehicles,
explicitly decide which occupant should own the assembly and what happens on seat changes, death, or
disconnect. In Server Authority projects, ownership works differently; see `full.md`.

## Modern motion migration

Map sustained linear control to `LinearVelocity` or `VectorForce`, rotational control to
`AngularVelocity`/`Torque`, and pose following to `AlignPosition`/`AlignOrientation`. The legacy
body movers (`BodyVelocity`, `BodyForce`, `BodyGyro`, `BodyPosition`, `BodyAngularVelocity`,
`BodyThrust`) are deprecated. Preserve the old system's coordinate space, force/torque limits,
attachment geometry, reaction force, and ownership behavior; do not replace class names without
measuring behavior.

## Verification matrix

Test one part and a welded multi-part assembly; anchored/unanchored transitions; intended collision
group pairs; each Can* flag; fast and slow movers; low/high mass; ray miss/hit/filter edge; overlap
deduplication and max-result behavior; client approaching/leaving automatic ownership; explicit
owner disconnect/death; two clients interacting simultaneously; streaming absence; and complete
temporary-object cleanup. Use server-observed results for gameplay assertions (with `studio-mcp`,
`execute_luau` on the Server datamodel during a playtest).

## Primary references

- https://create.roblox.com/docs/physics/assemblies
- https://create.roblox.com/docs/physics/network-ownership
- https://create.roblox.com/docs/workspace/raycasting
- https://create.roblox.com/docs/reference/engine/datatypes/RaycastParams
- https://create.roblox.com/docs/reference/engine/datatypes/OverlapParams
