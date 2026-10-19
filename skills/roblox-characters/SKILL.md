---
name: roblox-characters
description: "Roblox characters: respawn-safe CharacterAdded code, Humanoid, rigs, movement, death, Tools and Backpack, avatar appearance via HumanoidDescription. Use when character scripts break after respawn or when changing movement or outfits."
---

# Roblox characters

Treat a `Player` as the durable identity and each `Character` as a replaceable session with its own
references, connections, animation tracks, and cleanup. Targets Roblox's rolling platform APIs.

## When to use

- Use for player-character lifecycle, Humanoid state/movement, rigs, animations, tools,
  accessories, custom characters, death, or respawn defects.
- Use whenever code stores a Character/Humanoid/root reference longer than one spawn.

**When not to use:** general physics queries and constraints belong to `roblox-physics`; remote
trust belongs to `roblox-networking`; camera logic belongs to `roblox-camera`; NPC decision-making
and pathfinding belong to `roblox-npc-ai`.

## Workflow

1. **Inspect the character contract.** Check avatar settings, `StarterCharacter`,
   `StarterCharacterScripts`, `CharacterAutoLoads`, R6/R15 support, existing Animate/controller
   scripts, tools, tags, collision groups, and server/client ownership.
2. **Separate scopes.** Player-scope state survives respawn; character-scope state does not. Put
   character connections/tracks/resources in one cleanup scope and destroy it on removal.
3. **Bind existing and future characters.** Connect `CharacterAdded`, then bind `player.Character`
   if present. Do not assume event subscription alone sees a character that already spawned.
4. **Resolve required components defensively.** Wait with a timeout where replication warrants it;
   validate `Humanoid`, root, `Animator`, and rig assumptions. Abort if that character is no longer
   current before applying delayed work.
5. **Choose movement ownership.** Use Humanoid movement for standard avatars; use
   `AssemblyLinearVelocity`, `BasePart:ApplyImpulse()`, or a `LinearVelocity`/`AlignPosition`
   constraint only for mechanics that need physical control. Keep gameplay
   authority and network ownership implications explicit.
6. **Own animation lifecycle.** Load via the rig's `Animator`; store tracks/connections; use named
   markers for gameplay timing only with server validation; stop/disconnect on character cleanup.
7. **Verify lifecycle stress.** Spawn, die, reset, rapid-respawn, swap rig if supported, equip/drop
   tools, leave during setup, and run with at least two players when character interactions matter.

## Pattern: replaceable character scope

```luau
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local generation = 0
local connections: {RBXScriptConnection} = {}
local currentCharacter: Model? = nil

local function clearCharacter()
    generation += 1
    for _, connection in connections do connection:Disconnect() end
    table.clear(connections)
    currentCharacter = nil
end

local function bindCharacter(character: Model)
    -- Guard BEFORE teardown. A stale invocation (see the CharacterAdded/defer race below) must not
    -- clear a binding that is already current, or nothing ends up bound at all.
    if player.Character ~= character then return end
    clearCharacter()
    currentCharacter = character
    local thisGeneration = generation
    local humanoid = character:WaitForChild("Humanoid", 10)
    local root = character:WaitForChild("HumanoidRootPart", 10)
    -- Re-check after the yields: a respawn during WaitForChild bumps generation and makes this call stale.
    if not humanoid or not root or generation ~= thisGeneration then return end

    table.insert(connections, humanoid.Died:Connect(function()
        if generation ~= thisGeneration then return end
        setCharacterUiEnabled(false)
    end))
    attachCurrentCharacterSystems(character, humanoid, root)
end

player.CharacterRemoving:Connect(function(character)
    if currentCharacter == character then clearCharacter() end
end)
player.CharacterAdded:Connect(bindCharacter)
if player.Character then task.defer(bindCharacter, player.Character) end
```

Use the project's cleanup utility when one exists; do not introduce a new framework for three
connections. Server systems repeat this binding per `Player` and clear player-scope tables on
`PlayerRemoving`.

## Pattern: animation through Animator and markers

```luau
-- animator: the rig's Animator (Humanoid.Animator, or AnimationController.Animator)
local animation = Instance.new("Animation")
animation.AnimationId = "rbxassetid://1234567890"
local track = animator:LoadAnimation(animation)
local markerConnection = track:GetMarkerReachedSignal("Commit"):Connect(function(parameter)
    playLocalSwingEffect(parameter) -- presentation; server still validates any hit
end)

track:Play(0.1)
-- On character teardown:
markerConnection:Disconnect()
track:Stop(0.1)
animation:Destroy()
```

Always load through the `Animator` (`humanoid:WaitForChild("Animator")`); `Humanoid:LoadAnimation()`
is deprecated. For rigs without a `Humanoid`, use an `AnimationController` with an `Animator`.
Animations loaded by the owning client on its own character's Animator replicate to other players;
NPC animations are played from the server. Track priorities, blending and VFX: `roblox-animation-vfx`.

## Movement and rig rules

- Do not hardcode R15 limb names if R6 is supported. Prefer attachments, tags, or a rig-type
  adapter; branch on `Humanoid.RigType` only where topology materially differs.
- `HumanoidRootPart` is the usual character assembly root, not a universal guarantee for every
  custom model. Define the custom rig contract and validate it at spawn.
- Prefer `Humanoid:Move()`/standard controls for ordinary avatar locomotion. Directly changing
  `AssemblyLinearVelocity` is an instantaneous physical action; use forces/constraints or impulses
  when continuous or instantaneous physics is the real intent.
- To rebind movement/jump or add actions like sprint, prefer the Input Action System
  (`InputContext`/`InputAction`/`InputBinding`, defined at edit time and cross-device)
  over hooking `UserInputService` directly. Default player and character control scripts
  run on this system when `Workspace.PlayerScriptsUseInputActionSystem` is enabled,
  exposing default `PlayerScripts` contexts; give your own `InputContext` a higher
  `Priority` (and `Sink`) to take precedence over the default bindings. See `roblox-input`
  for bindings and `roblox-gui` for the UI-focus side of this.
- Never grant damage or movement authority because a client owns its character physics. Validate
  cross-player consequences on the server.
- Tools move between Backpack and Character during equip; listen to lifecycle/state rather than
  assuming one fixed parent. `Humanoid:EquipTool(tool)`/`UnequipTools()` from the server; the
  legacy `HopperBin` is deprecated — use `Tool`.

## Appearance and rigs

- **Change appearance with `HumanoidDescription`:** `humanoid:GetAppliedDescription()` returns a
  copy; edit it and apply with `humanoid:ApplyDescriptionAsync(desc)` (yields; run on the server so
  it replicates). Spawn with a look via `player:LoadCharacterWithHumanoidDescriptionAsync(desc)`.
  Fetch real avatars with `Players:GetHumanoidDescriptionFromUserIdAsync(userId)`. The non-Async
  names (`ApplyDescription`, `GetHumanoidDescriptionFromUserId`, `LoadCharacterWithHumanoidDescription`,
  `LoadCharacter`) are deprecated.
- **Wait for appearance:** `Player.CharacterAppearanceLoaded` (server-only) fires once accessories
  and clothing are inserted; use it before stripping or recolouring them. A `StarterCharacter` gets no
  avatar appearance — handle its accessories yourself in `CharacterAdded`.
- **Custom rigs:** a model named `StarterCharacter` in `StarterPlayer` replaces every player's avatar;
  `StarterHumanoid` overrides Humanoid properties; scripts in `StarterCharacterScripts` (e.g. a
  replacement `Animate`) run per spawn.
- Details, code, BodyColors/Shirt/Pants and R6 vs R15 notes:
  [references/appearance.md](references/appearance.md).

## Common failures

| Symptom | Likely cause | Remedy |
|---|---|---|
| works once, breaks after reset | cached character/Humanoid/root | rebuild per `CharacterAdded`; clear on removal |
| callbacks fire twice after deaths | old character connections survived | character-scoped cleanup and generation/current checks |
| delayed load edits wrong rig | async work outlived spawn | compare current Character/generation after every yield |
| animation visible only locally or not at all | wrong Animator/context/asset ownership | inspect rig Animator, execution side, permissions, and replication |
| hit marker awards impossible hit | animation marker trusted as authority | use marker for timing/presentation; server validates combat state |
| R6/custom rig errors | R15 names assumed | define rig contract; attachments/adapter; test each supported rig |
| tool disappears from system | fixed Backpack/Character parent assumed | handle equip/unequip ancestry and character replacement |
| custom force fights Humanoid | two controllers own motion | choose one movement authority per state and restore cleanly |

## Resources

- Read [references/lifecycle-and-animation.md](references/lifecycle-and-animation.md) for server
  binding, death vs removal, rig and animation verification, custom characters, and the lifecycle
  stress matrix.
- Read [references/appearance.md](references/appearance.md) for `HumanoidDescription`, outfits,
  clothing, body colours, accessories, and spawning with a description.

## Related skills

- `roblox-physics` — forces, constraints, assemblies, collision, and network ownership.
- `roblox-networking` — server validation of character actions and stale requests.
- `roblox-input` — action mapping and responsive movement intent.
- `roblox-camera` — camera behavior following replaceable characters.
- `roblox-gui` — character-bound UI that must survive respawn.
- `roblox-animation-vfx` — animation priorities, blending, and effects.
- `roblox-npc-ai` — NPC behavior using these rigs.

## Primary references

- `https://create.roblox.com/docs/characters`
- `https://create.roblox.com/docs/animation/using`
- `https://create.roblox.com/docs/characters/appearance`
