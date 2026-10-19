# Roblox Physics & Constraints: Full Reference


> **Code in this reference is illustrative. Adapt to your game and verify in Studio before production use.**

## Constraint Types

### Mechanical Constraints

| Constraint | What it does | Use for |
|-----------|-------------|---------|
| `HingeConstraint` | Rotation around one axis | Doors, wheels, pendulums, flaps |
| `PrismaticConstraint` | Slide along one axis | Elevators, pistons, sliding doors |
| `CylindricalConstraint` | Rotate + slide on one axis | Telescoping arms, drill bits |
| `BallSocketConstraint` | Free rotation (3 DOF) | Ragdoll joints, chains, wrecking balls |
| `UniversalConstraint` | 2-axis rotation (no twist) | Steering columns, gimbal joints |
| `WeldConstraint` | Rigid connection | Attach parts permanently |
| `RigidConstraint` | Rigid (like Weld but with offset) | Precise attachment with maintained offset |

### Motion Constraints

| Constraint | What it does | Use for |
|-----------|-------------|---------|
| `AlignPosition` | Move toward target position | Floating platforms, magnetic attraction |
| `AlignOrientation` | Rotate toward target orientation | Auto-leveling, look-at behavior |
| `LinearVelocity` | Constant velocity in direction | Conveyor belts, moving platforms |
| `AngularVelocity` | Constant rotation speed | Spinning obstacles, fans |
| `VectorForce` | Apply constant force | Gravity modification, thrust |
| `LineForce` | Force along the Attachment0→Attachment1 line, applied to Attachment0's assembly | Tractor beams, magnetics, tethers |
| `Torque` | Apply constant torque | Spinning objects |

### Spring/Rope

| Constraint | What it does | Use for |
|-----------|-------------|---------|
| `SpringConstraint` | Bouncy connection | Suspension, trampolines, bouncy bridges |
| `RopeConstraint` | Max distance (slack allowed) | Grappling hooks, hanging objects |
| `RodConstraint` | Fixed distance (rigid) | Rigid linkages, pendulum arms |

## LineForce

`LineForce` applies a force along the line between `Attachment0` and `Attachment1`. By default the force is applied **to the parent of `Attachment0`** (toward or away from `Attachment1`, which serves as the target direction and receives no force unless `ReactionForceEnabled = true`). The direction tracks the parts as they move. Compare `VectorForce`: a fixed `Vector3` (world or attachment-relative) whose direction never changes. Use LineForce when the pull must follow a target part; use VectorForce for constant world-direction thrust.

```luau
-- Tractor beam: pull `cargo` toward a fixed beam emitter.
local lf = Instance.new("LineForce")
lf.Attachment0 = cargoAtt      -- on the object being pulled: this part RECEIVES the force (default)
lf.Attachment1 = emitterAtt    -- on the emitter: only defines the line, unless ReactionForceEnabled
lf.Magnitude = 5000            -- force along the line (sign sets pull vs push; verify direction in Studio)
lf.InverseSquareLaw = true     -- falloff with distance (gravity/magnet feel)
lf.MaxForce = 10000            -- cap applied force; ONLY active when InverseSquareLaw=true
lf.ReactionForceEnabled = false -- true would also push the emitter with an equal/opposite force
lf.ApplyAtCenterOfMass = true  -- apply at the cargo assembly's CoM instead of at cargoAtt
lf.Parent = cargo
```

- `Magnitude`: signed force along the Attachment0→Attachment1 line; sign sets pull vs push.
- `MaxForce`: upper clamp on the absolute force, but **only active when `InverseSquareLaw = true`** (it guards the 1/d² blow-up when the attachments align). With `InverseSquareLaw = false` the property is inert — clamp `Magnitude` in scripts instead.
- `InverseSquareLaw`: force scales as 1/distance² between the attachments.
- `ApplyAtCenterOfMass`: when `true`, force is applied at the center of mass of `Attachment0`'s parent assembly (and the force line starts there); it does not move the application point to `Attachment1`.

## Attachment Pattern

All constraints connect via Attachments, not Parts directly:

```luau
local function connectHinge(part0: BasePart, part1: BasePart, pivotOffset: Vector3)
    local att0 = Instance.new("Attachment")
    att0.Position = pivotOffset
    att0.Parent = part0

    local att1 = Instance.new("Attachment")
    att1.Position = Vector3.new(0, 0, 0) -- at part1's origin
    att1.Parent = part1

    local hinge = Instance.new("HingeConstraint")
    hinge.Attachment0 = att0
    hinge.Attachment1 = att1
    hinge.ActuatorType = Enum.ActuatorType.Motor -- or None, Servo
    hinge.MotorMaxTorque = 1000
    hinge.AngularVelocity = 5 -- rad/s
    hinge.Parent = part0

    return hinge
end
```

## Vehicles

### Basic Car (4 wheels + body)

A spring alone does not hold a wheel in place: it only pushes along its line, so the wheel can swing sideways and the "suspension" collapses. Each wheel needs a joint that **slides** along the suspension axis and **spins** around the axle — a `CylindricalConstraint` does both (sliding along `Attachment0`'s X axis, rotating about an axis tilted from it by `InclinationAngle`). A `SpringConstraint` alongside it carries the load. (Equivalent alternative: a `PrismaticConstraint` from the chassis to a small strut part, plus a motor `HingeConstraint` from the strut to the wheel.)

Constraint axes come from the attachments' orientation — hinge/prismatic/cylindrical slide or spin along the attachment's **X** axis — so orient attachments explicitly instead of leaving them at identity.

```luau
-- Convention: the chassis's local +X is the axle direction (RightVector), +Y is up,
-- and -Z (LookVector) is forward. Run on the server; offsets are in chassis space.
local UP, AXLE = Vector3.yAxis, Vector3.xAxis

local function createWheel(chassis: BasePart, offset: Vector3, radius: number, driven: boolean): CylindricalConstraint
    local wheel = Instance.new("Part")
    wheel.Shape = Enum.PartType.Cylinder -- a cylinder's round axis is its local X axis
    wheel.Size = Vector3.new(1, radius * 2, radius * 2) -- width, diameter, diameter
    wheel.CFrame = chassis.CFrame * CFrame.new(offset) -- X already along the axle: no extra rotation
    -- density, friction, elasticity, frictionWeight, elasticityWeight
    wheel.CustomPhysicalProperties = PhysicalProperties.new(0.7, 1.2, 0, 100, 1)
    wheel.Parent = chassis.Parent

    -- Attachment0 on the chassis: X (slide axis) points up, Y points along the axle.
    local att0 = Instance.new("Attachment")
    att0.Name = "StrutTop"
    att0.CFrame = CFrame.fromMatrix(offset, UP, AXLE)
    att0.Parent = chassis

    -- Attachment1 at the wheel centre, starting with the same world orientation as att0.
    local att1 = Instance.new("Attachment")
    att1.Name = "Hub"
    att1.CFrame = wheel.CFrame:ToObjectSpace(chassis.CFrame * att0.CFrame)
    att1.Parent = wheel

    local strut = Instance.new("CylindricalConstraint")
    strut.Attachment0 = att0
    strut.Attachment1 = att1
    strut.InclinationAngle = 90 -- rotation axis = att0's Y axis (the axle); sliding stays on X (up)
    strut.LimitsEnabled = true  -- suspension travel along X (check sign with constraint visualization)
    strut.LowerLimit = -1
    strut.UpperLimit = 0.5
    strut.AngularActuatorType = if driven then Enum.ActuatorType.Motor else Enum.ActuatorType.None
    strut.MotorMaxTorque = 2000
    strut.AngularVelocity = 0 -- rad/s, set from throttle (flip the sign if the car drives backwards)
    strut.Parent = chassis

    -- Spring alongside the strut: from a point above the hub to the hub.
    local springTop = Instance.new("Attachment")
    springTop.Name = "SpringTop"
    springTop.Position = offset + Vector3.new(0, 2, 0)
    springTop.Parent = chassis

    local spring = Instance.new("SpringConstraint")
    spring.Attachment0 = springTop
    spring.Attachment1 = att1
    spring.FreeLength = 2.5 -- > 2, so the spring is pre-compressed and holds the car up at rest
    -- Rough start: carry a quarter of the car's weight at 0.5 studs of compression.
    spring.Stiffness = (chassis.AssemblyMass * workspace.Gravity / 4) / 0.5
    spring.Damping = spring.Stiffness * 0.1
    spring.Parent = chassis

    return strut
end
```

Steering: put a front strut's `Attachment0` on a small "knuckle" part joined to the chassis by a `HingeConstraint` with `ActuatorType = Servo` whose axis (attachment X) points up; drive its `TargetAngle`. Recompute spring stiffness after the final chassis mass is known (it reads `AssemblyMass`, which includes the wheels once they are attached), and tune in a playtest with constraint details visible. A `VehicleSeat` provides `ThrottleFloat`/`SteerFloat` for the driver if you don't build custom input.

### Vehicle Input (server-authoritative)

The `RemoteEvent` pattern below is for classic projects and discrete or low-frequency control. In a Server Authority project, continuous throttle and steering belong in the Input Action System, with input state available to the synchronized simulation through `RunService:BindToSimulation()` (requires `Workspace.UseFixedSimulation` enabled in Studio). RemoteEvents are still appropriate for discrete requests, not as the continuous prediction path.

```luau
-- Server: receive input, apply to constraints
local DriveRemote = Instance.new("RemoteEvent")
DriveRemote.Name = "Drive"
DriveRemote.Parent = ReplicatedStorage

DriveRemote.OnServerEvent:Connect(function(player, throttle: number, steer: number)
    -- Validate
    throttle = math.clamp(throttle, -1, 1)
    steer = math.clamp(steer, -1, 1)

    local vehicle = getPlayerVehicle(player)
    if not vehicle then return end

    -- Apply throttle to the driven wheels (the CylindricalConstraints from createWheel)
    for _, strut in vehicle.rearWheels do
        strut.AngularVelocity = throttle * MAX_SPEED
    end

    -- Apply steering to front wheels
    for _, servo in vehicle.frontSteering do
        servo.TargetAngle = steer * MAX_STEER_ANGLE
    end
end)
```

## Ragdoll

### Activate Ragdoll (replace Motor6Ds with BallSockets)

Authority rules before the code:

- **Humanoid state belongs to whoever owns the character's physics.** `Humanoid:ChangeState()` only takes effect from a `LocalScript` on the client that has network ownership of the character, or from the server when the server owns it. For **player characters** (client-owned by default), build the sockets and disable the motors on the server (so everyone sees the same joints), then tell the owning client — e.g. with a `RemoteEvent` — to call `humanoid:ChangeState(Enum.HumanoidStateType.Physics)` (and `GettingUp` on recovery). For **NPCs** the server owns the physics, so call it on the server; if the NPC might be client-owned, call `rootPart:SetNetworkOwner(nil)` first.
- **Death ragdolls:** set `Humanoid.BreakJointsOnDeath = false` (on the character or `StarterCharacter`) before death, otherwise the engine breaks the joints when health hits 0 and there is nothing left to convert.

Enable creates attachments, sockets, and disables motors; disable must undo
exactly that set. Track ownership: which instances were created and which
motors were disabled, so recovery never re-enables a motor that was already
disabled before ragdolling, never destroys an unrelated socket, and repeated
or interleaved calls stay idempotent.

```luau
local ragdollState: { [Model]: { created: {Instance}, disabledMotors: { {motor: Motor6D, wasEnabled: boolean} } } } = {}

-- Server-side. `setPhysicsState(character, enabled)` is your hook that switches the Humanoid
-- state where it is allowed to: on the server for server-owned NPCs, or by firing a RemoteEvent
-- to the owning player's client for player characters (see the rules above).
local function enableRagdoll(character: Model)
    if ragdollState[character] then return end -- already ragdolled

    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end
    local record = { created = {}, disabledMotors = {} }
    ragdollState[character] = record

    setPhysicsState(character, true) -- Physics state on the owner

    for _, motor in character:GetDescendants() do
        if motor:IsA("Motor6D") and motor.Name ~= "Root" then -- keep Root for HRP
            local att0 = Instance.new("Attachment")
            att0.CFrame = motor.C0
            att0.Parent = motor.Part0

            local att1 = Instance.new("Attachment")
            att1.CFrame = motor.C1
            att1.Parent = motor.Part1

            local socket = Instance.new("BallSocketConstraint")
            socket.Attachment0 = att0
            socket.Attachment1 = att1
            socket.LimitsEnabled = true
            socket.UpperAngle = 45 -- prevent unnatural bending
            socket.Parent = motor.Part0

            table.insert(record.created, att0)
            table.insert(record.created, att1)
            table.insert(record.created, socket)
            table.insert(record.disabledMotors, { motor = motor, wasEnabled = motor.Enabled })
            motor.Enabled = false
        end
    end
end

local function disableRagdoll(character: Model)
    local record = ragdollState[character]
    if not record then return end -- not ragdolled by us
    ragdollState[character] = nil

    -- Destroy only instances enableRagdoll created; other sockets in the
    -- character belong to someone else and survive.
    for _, obj in record.created do
        if obj.Parent then
            obj:Destroy()
        end
    end

    -- Restore only motors this enable cycle disabled, to their prior state.
    for _, entry in record.disabledMotors do
        if entry.motor.Parent then
            entry.motor.Enabled = entry.wasEnabled
        end
    end

    setPhysicsState(character, false) -- GettingUp on the owner
end

-- Tolerate characters destroyed mid-ragdoll: drop the record so it cannot leak.
-- Call once per character when it spawns (e.g. from Player.CharacterAdded).
-- Declare the local FIRST so the handler closes over a real upvalue: inside
-- `local connection = ...:Connect(fn)`, `fn` would see a nil `connection`.
local function trackRagdollLifetime(character: Model)
    local connection: RBXScriptConnection
    connection = character.AncestryChanged:Connect(function()
        if not character.Parent then
            ragdollState[character] = nil
            connection:Disconnect()
        end
    end)
end
```

For production use, store `ragdollState` inside your character/maid module rather than a module-level table, and wire the destruction cleanup into that maid so records cannot outlive their character.

## IKControl

`IKControl` runs procedural inverse kinematics on a Motor6D rig; no baked animation needed. Parent it under the rig's `Humanoid`; it bends the joint chain from `ChainRoot` (e.g. `LeftUpperArm`) so `EndEffector` (e.g. `LeftHand`) reaches `Target` (usually an `Attachment` or `BasePart`). Common uses: foot placement on stairs/slopes, hands gripping rails or ladders, head look-at.

```luau
local ik = Instance.new("IKControl")
ik.Type = Enum.IKControlType.Position -- see types below
ik.ChainRoot = character.LeftUpperArm
ik.EndEffector = character.LeftHand
ik.Target = railAttachment -- Attachment on the rail
ik.SmoothTime = 0.05       -- target smoothing; 0 = snap instantly
ik.Weight = 1
ik.Parent = humanoid

-- Stop the solve when the grip ends
ik.Enabled = false
```

- `Type`: `Position` (move effector to target), `Rotation` (match orientation), `Transform` (position + rotation), `LookAt` (aim the chain, e.g. head/eyes at a point).
- `SmoothTime`: seconds of smoothing toward the target; lower = snappier.
- `EndEffectorOffset` / `Offset`: CFrame adjustments to effector and target placement.
- `Pole`: optional part hinting elbow/knee bend direction.
- The chain must run through `Motor6D` joints from `ChainRoot` to `EndEffector`; inspect with `GetChainLength()` / `GetChainCount()`.

## Projectiles

### Server-Authoritative Raycast Projectile (hitscan)

```luau
-- Modern filter API: ExcludeInstances/IncludeInstances (FilterType not needed).
local function fireProjectile(origin: Vector3, direction: Vector3, damage: number, ignore: {Instance})
    local params = RaycastParams.new()
    params.ExcludeInstances = ignore -- exclusions take priority over inclusions

    local result = workspace:Raycast(origin, direction * 300, params)
    if result then
        local hit = result.Instance
        local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")
            or hit.Parent.Parent:FindFirstChildOfClass("Humanoid")
        if humanoid then
            humanoid:TakeDamage(damage)
        end
        return result.Position
    end
    return origin + direction * 300
end
```

### Raycast filtering: modern and legacy forms

`RaycastParams` has two filter APIs:

- **Modern**: `ExcludeInstances` (array of instances whose descendants are excluded) and `IncludeInstances` (only those descendants are considered). They can be combined for mixed filtering — e.g. include a large folder but exclude specific children — and **exclusions take priority over inclusions** when an instance matches both. `IncludeInstances = nil` is the most permissive filter (includes everything), whereas `IncludeInstances = {}` is the most restrictive (includes nothing) — a deliberate nil-vs-empty distinction when building "raycast only this folder" queries.
- **Legacy (still functional, superseded)**: `FilterDescendantsInstances` + `FilterType = Enum.RaycastFilterType.Exclude/Include`. Older examples using this pair keep working; for new work prefer `ExcludeInstances`/`IncludeInstances`.

### Physics Projectile (arcing, grenade-style)

For a Server Authority project, create and update gameplay-critical projectiles inside the synchronized simulation so the client can predict and reconcile them. Keep damage and state transitions in the simulation, not in a presentation-only `Touched` callback that can run again during resimulation. The example below is a classic illustrative projectile and needs that adaptation before use in Server Authority.

```luau
local function launchProjectile(origin: CFrame, velocity: Vector3, lifetime: number)
    local projectile = Instance.new("Part")
    projectile.Size = Vector3.new(0.5, 0.5, 0.5)
    projectile.Shape = Enum.PartType.Ball
    projectile.CFrame = origin
    projectile.Anchored = false
    projectile.CanCollide = true
    projectile.Parent = workspace

    -- Apply initial velocity
    projectile.AssemblyLinearVelocity = velocity

    -- Cleanup after lifetime
    task.delay(lifetime, function()
        if projectile.Parent then
            -- Explode or just destroy
            projectile:Destroy()
        end
    end)

    -- Detect hits
    projectile.Touched:Connect(function(hit)
        if hit.Parent:FindFirstChildOfClass("Humanoid") then
            -- Deal damage, create explosion, etc.
            projectile:Destroy()
        end
    end)

    return projectile
end
```

### Homing Projectile (velocity-aiming steering)

A common technique simulates homing missiles without Roblox physics by steering a velocity vector toward the target each frame, clamped to a max turn angle. This avoids physics-solver jitter and suits missiles, spells, and homing bullets. Keep the projectile anchored and interpolate its CFrame yourself (or drive `AssemblyLinearVelocity`); each frame rotate the current velocity direction toward the target direction, never exceeding the max turn rate per frame. Community projectile modules (e.g. HomingCast, https://devforum.roblox.com/t/homingcast-homing-projectiles/3786022) are a lead for this pattern.

```luau
-- Illustrative; tune for your projectile model. Steer `dir` toward `toTarget`
-- by at most `maxTurn * dt` radians, rotating about the current/target axis.
-- Direction-only: returns the new unit direction, so speed is preserved by
-- multiplying with the original magnitude. The actual turn is exactly
-- min(budget, angle); zero-vector and antiparallel cases are defined below.
local function steerDirection(dir: Vector3, toTarget: Vector3, maxTurn: number, dt: number): Vector3
    -- Always return a unit vector so callers multiply by speed exactly once.
    -- Zero/invalid input directions fall back to a deterministic axis instead
    -- of returning a non-unit vector (which re-multiplied speed in callers).
    local current: Vector3
    if dir.Magnitude == 0 then
        current = Vector3.zAxis
    else
        current = dir.Unit
    end
    if toTarget.Magnitude == 0 then
        return current -- no aim: hold direction, do not re-scale speed
    end
    local target = toTarget.Unit
    local dot = math.clamp(current:Dot(target), -1, 1)
    local angle = math.acos(dot)                       -- 0..pi
    local budget = maxTurn * dt
    if angle <= 1e-6 then
        return current                                 -- already aimed
    elseif angle >= math.pi - 1e-6 then
        -- Antiparallel: the cross-product axis is undefined. Pick any unit
        -- axis perpendicular to `current` and turn toward it, clamped to the
        -- remaining angle (min(budget, angle)) so an oversized budget can
        -- never rotate past the target and back.
        local axis = current:Cross(Vector3.yAxis)
        if axis.Magnitude < 1e-6 then
            axis = current:Cross(Vector3.xAxis)
        end
        return CFrame.fromAxisAngle(axis.Unit, math.min(budget, angle)) * current
    end
    local axis = current:Cross(target).Unit            -- rotation axis (perpendicular to both)
    local step = math.min(budget, angle)
    return CFrame.fromAxisAngle(axis, step) * current  -- exact bounded rotation
end

local function steerProjectile(cframe: CFrame, velocity: Vector3, target: Vector3, maxTurn: number, dt: number)
    local dir = steerDirection(velocity, target - cframe.Position, maxTurn, dt)
    return dir * velocity.Magnitude
end
```

## Common Patterns

### CFrame: reference frames for moving-platform / vehicle-follow patterns

Think of a part's `CFrame` as the transform from that part's **local space** to world space. Its `LookVector` points down its local −Z; `Vector3.zero` in its local frame is its world position. To transform between frames:

| Want | Code |
|---|---|
| Local frame → world space (point or offset) | `part.CFrame * offset` |
| World position → part's local frame | `part.CFrame:Inverse() * worldPos` (`ToObjectSpace`) |
| World-space `CFrame` → part's local frame | `part.CFrame:Inverse() * worldCFrame` |
| Move a piece with a platform, preserving orientation | `platform.CFrame * characterOffsetCFrame` |

`CFrame` composition is not commutative: `A * B` means "apply A, then in A's frame apply B". For a character standing on a rotating platform, compute the character's offset in the platform's frame **once**, then reapply it each frame after rotating the platform:

```luau
local RunService = game:GetService("RunService")
local platform = workspace:WaitForChild("Platform")

RunService:BindToRenderStep("RotatePlatform", Enum.RenderPriority.Camera.Value - 50, function(dt)
    local character = game.Players.LocalPlayer.Character
    if not character or not character.PrimaryPart then return end

    -- Keep the character fixed in the platform's reference frame
    local characterOffset = platform.CFrame:Inverse() * character:GetPivot()

    platform.CFrame *= CFrame.fromEulerAnglesXYZ(0, dt, 0)

    character:PivotTo(platform.CFrame * characterOffset)
end)
```

If you only need the position (not orientation), `character:GetPivot().Position` and `CFrame.new(platform.CFrame * characterOffset)` are enough; use the full `CFrame` when the character should keep its facing relative to the platform. For vehicles or moving platforms, prefer attachment/anchor constraints or a server-authoritative simulation over per-frame character CFrame writes.

### Elevator / Moving Platform

A `PrismaticConstraint` slides along its attachments' **X** axis. Identity attachments slide sideways, so rotate both so X points up, and enable limits so the platform can't overshoot.

```luau
-- Server. `platform` starts at the bottom stop; `travel` is the lift height in studs.
local function createElevator(platform: BasePart, travel: number, speed: number): PrismaticConstraint
    -- Fixed, invisible, axis-aligned anchor at the platform's start position.
    local anchor = Instance.new("Part")
    anchor.Name = "ElevatorAnchor"
    anchor.Size = Vector3.one
    anchor.Anchored = true
    anchor.CanCollide = false
    anchor.CanQuery = false
    anchor.Transparency = 1
    anchor.CFrame = CFrame.new(platform.Position)
    anchor.Parent = platform.Parent

    -- Rotating 90 degrees about Z turns the attachment's X axis (the slide axis) to world +Y.
    local anchorAtt = Instance.new("Attachment")
    anchorAtt.CFrame = CFrame.Angles(0, 0, math.pi / 2)
    anchorAtt.Parent = anchor

    -- Platform attachment with the same world orientation, at the same point.
    local platformAtt = Instance.new("Attachment")
    platformAtt.CFrame = platform.CFrame:ToObjectSpace(anchor.CFrame * anchorAtt.CFrame)
    platformAtt.Parent = platform

    local prismatic = Instance.new("PrismaticConstraint")
    prismatic.Attachment0 = anchorAtt
    prismatic.Attachment1 = platformAtt
    prismatic.LimitsEnabled = true
    prismatic.LowerLimit = 0
    prismatic.UpperLimit = travel
    prismatic.ActuatorType = Enum.ActuatorType.Servo
    prismatic.Speed = speed
    -- Enough to lift the platform plus riders; tune for your load.
    prismatic.ServoMaxForce = platform.AssemblyMass * workspace.Gravity * 10
    prismatic.TargetPosition = 0
    prismatic.Parent = platform

    platform.Anchored = false
    platform:SetNetworkOwner(nil) -- keep riders from owning (and flinging) the lift

    return prismatic -- set .TargetPosition between 0 and travel to move
end
```

If the platform moves down instead of up, the sign convention is reversed for your attachment pair: swap `Attachment0`/`Attachment1` or use negative positions. Turn on constraint visualization (Model tab › Constraints › Show details) to see the axis.

### Swinging Platform

```luau
local function createSwing(platform: BasePart, pivot: Vector3, maxAngle: number)
    platform.Anchored = false

    local pivotAtt = Instance.new("Attachment")
    pivotAtt.WorldPosition = pivot
    pivotAtt.Parent = workspace.Terrain -- fixed world point

    local platformAtt = Instance.new("Attachment")
    platformAtt.Position = platform.CFrame:PointToObjectSpace(pivot)
    platformAtt.Parent = platform

    local hinge = Instance.new("HingeConstraint")
    hinge.Attachment0 = pivotAtt
    hinge.Attachment1 = platformAtt
    hinge.LimitsEnabled = true
    hinge.LowerAngle = -maxAngle
    hinge.UpperAngle = maxAngle
    hinge.Parent = platform

    return hinge
end
```

## Collision groups: PhysicsService

`PhysicsService` manages collision groups: named sets of `BasePart`s whose mutual collision rules you control. Assign a part by setting `part.CollisionGroup = "GroupName"` (the name, not an object).

Key facts (official):

- `RegisterCollisionGroup(name)`: name cannot be `"Default"`. Registration has slight overhead proportional to workspace part count, so register at edit time in Studio when possible; register/rename/unregister at runtime sparingly.
- `CollisionGroupSetCollidable(name1, name2, bool)`: throws if either group is unregistered; check `IsCollisionGroupRegistered` first.
- Creating, deleting, or modifying collision relationships is server-only (Scripts); clients can only assign parts to existing groups.
- Max 32 groups (`GetMaxCollisionGroups`). `GetRegisteredCollisionGroups()` returns `{name, mask}` entries.
- `CollisionGroupsAreCollidable` returns true if either group is unregistered (default mask collides with everything).

```luau
local PhysicsService = game:GetService("PhysicsService")
if not PhysicsService:IsCollisionGroupRegistered("Ghosts") then
    PhysicsService:RegisterCollisionGroup("Ghosts")
end
PhysicsService:CollisionGroupSetCollidable("Ghosts", "Ghosts", false) -- ghosts pass through ghosts
for _, part in character:GetDescendants() do
    if part:IsA("BasePart") then part.CollisionGroup = "Ghosts" end
end
```

## Network Ownership and Server Authority

### Classic replication

By default in classic replication, Roblox may assign an unanchored assembly to a nearby player. This can make physics responsive but gives that client influence over the simulation, so gameplay-critical outcomes must still be validated.

```luau
-- Keep physics server-authoritative
local function setServerOwnership(model: Model)
    for _, part in model:GetDescendants() do
        if part:IsA("BasePart") and not part.Anchored then
            part:SetNetworkOwner(nil) -- server owns
        end
    end
end

-- Give ownership to driver (for responsive vehicles)
local function setDriverOwnership(vehicle: Model, player: Player)
    for _, part in vehicle:GetDescendants() do
        if part:IsA("BasePart") and not part.Anchored then
            part:SetNetworkOwner(player)
        end
    end
end
```

**Classic trade-off:** Server ownership can be more authoritative but costs server simulation work. Player ownership can be responsive but is not a security boundary. For NPCs and gameplay-critical world objects, prefer server ownership when the project is not using Server Authority. Give a vehicle to its driver only when the resulting behavior is acceptable and validated.

### Server Authority

When `Workspace.AuthorityMode = Server` and the required replication, fixed-simulation, streaming, and input settings are enabled, core gameplay objects can remain server-owned while client prediction keeps controls responsive. The traditional secure-but-laggy trade-off does not apply in the same way. `SetNetworkOwner()` is not a substitute for Server Authority.

Use `InputAction`/`InputContext` and `RunService:BindToSimulation()` (requires `Workspace.UseFixedSimulation` enabled in Studio) for continuous vehicle or character input. Create gameplay-critical predicted instances, such as projectiles, inside the synchronized simulation and make hit or damage transitions idempotent across rollback and resimulation.

For the migration reality check (cost scales with how much simulation you author, attribute payload budget, input buffering, and why side effects are the sharpest edge), see `roblox-networking` and `roblox-security`. Input Actions for vehicles and characters: `roblox-input`.

Spatial queries, collision-flag policy, and an ownership test matrix: [queries-and-ownership.md](queries-and-ownership.md).

## Common Mistakes

- **Forgetting Anchored = false**: Constraints do nothing on anchored parts.
- **Missing Attachments**: Constraints need Attachment0 AND Attachment1. Missing one = silent failure.
- **No network ownership control**: Physics objects get owned by nearest player. Exploiters fling them.
- **Over-constraining**: Too many constraints on one assembly = physics solver instability (jitter).
- **No mass tuning**: Default density makes small parts too light. Use CustomPhysicalProperties.
- **Touched for projectiles**: Touched fires for every contact. Use Raycast for hitscan, Touched only for slow physics projectiles.
- **No lifetime on projectiles**: Forgotten projectiles accumulate and kill server performance.

## Community ecosystem (leads, not sources)

Top-sorted DevForum canon for combat/physics modules. Verify status in-thread.

- Projectiles: [FastCast](https://devforum.roblox.com/t/making-a-combat-game-with-ranged-weapons-fastcast-may-be-the-module-for-you/133474) (3.3k likes, standard); [FastCast2](https://devforum.roblox.com/t/fastcast2-an-improved-version-of-fastcast-with-parallel-scripting-more-extensions-and-statically-typed-a-powerful-modern-projectile-library/4093890) (2025) successor; [projectile motion math](https://devforum.roblox.com/t/modeling-a-projectiles-motion/176677) for lead-aim.
- Melee hitboxes: [Raycast Hitbox](https://devforum.roblox.com/t/raycast-hitbox-401-for-all-your-melee-needs/374482) (3.3k likes); [ShapecastHitbox](https://devforum.roblox.com/t/shapecasthitbox-for-all-your-melee-needs-v025/3624241) successor; [ClientCast](https://devforum.roblox.com/t/clientcast-a-client-based-idiosyncratic-hitbox-system/895217) client-side variant (validate server-side).
- Custom characters/physics: [Chickynoid](https://devforum.roblox.com/t/chickynoid-server-authoritative-character-replacement/1660558) server-authoritative character; [Chrono](https://devforum.roblox.com/t/chrono-drop-in-custom-physics-replication-library/3873294) (2025) physics replication; [Wall stick/Gravity Controller](https://devforum.roblox.com/t/wall-stickgravity-controller/432598) (2.9k likes).

## Overlapping effects, death, and projectile tolerance

- Coordinate independent temporary ragdoll or stun effects under one recovery owner. Track active holds and release each exactly once; recover only after the relevant holds have ended. Test both overlap orders, repeated application, death, character replacement, and the project's supported joint types. Do not let a second effect snapshot an already-modified state and restore it as the original.
- Separate bot-only corpse behavior from real-player death and respawn. A disabled `Dead` state prevents `Humanoid.Died`; verify the actual player elimination path through death registration, match removal and respawn. Include self-inflicted penalties and simultaneous eliminations. Do not generalize an NPC freeze workaround to all humanoids.
- If forgiving character hits are intended, keep their tolerance separate from environment collision. Validate candidate character hits against the unobstructed traveled segment rather than enlarging the world sweep indiscriminately. Test central hits, near misses on both sides of the chosen threshold, doorframes, and targets behind walls with the authoritative resolver. Handle initial overlap explicitly when the chosen sweep does not detect it.

## Sources (upstream SKILL.md)

Sources listed by the upstream skill (TabooHarmony/roblox-brain); later edits in this plugin were checked against the current Creator Hub API reference.

- https://devforum.roblox.com/t/cframe-operations-for-the-rest-of-us/3546477
- https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/physics/mechanical-constraints.md
- https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/reference/engine/classes/Humanoid.yaml
- https://raw.githubusercontent.com/Roblox/creator-docs/main/content/en-us/reference/engine/classes/WorldRoot.yaml
