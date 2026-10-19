# Character appearance: HumanoidDescription, clothing, body colours

Read this when changing how a player or NPC looks: outfits, accessories, body scale, clothing, or
spawning characters with a specific look. Moved here from the TabooHarmony `roblox-npc-ai` skill
(MIT) and updated against the current API reference (2026-10); see `../ATTRIBUTION.md`.

## HumanoidDescription: the canonical appearance API

- **Read the current look:** `humanoid:GetAppliedDescription()` returns a *copy* of the cached
  description. Edit the copy, then apply it.
- **Apply:** `humanoid:ApplyDescriptionAsync(description)` (yields) batch-applies every field so the
  rig rebuilds once. It assumes nothing else changed the character since the last apply; if other
  code edited clothing/accessories directly, use `humanoid:ApplyDescriptionResetAsync(description)`,
  which always forces the character to match. Run on the server so the result replicates.
- **Spawn with a look:** `player:LoadCharacterWithHumanoidDescriptionAsync(description)` (set
  `Players.CharacterAutoLoads = false` if you spawn manually). Don't call it again for the same player
  until `Player.CharacterAppearanceLoaded` has fired.
- **From real avatars/outfits:** `Players:GetHumanoidDescriptionFromUserIdAsync(userId)` and
  `Players:GetHumanoidDescriptionFromOutfitIdAsync(outfitId)` (web calls: wrap in `pcall`). To build a
  standalone model: `Players:CreateHumanoidModelFromDescriptionAsync(description, rigType)` or
  `CreateHumanoidModelFromUserIdAsync(userId)`.
- **Deprecated names** (superseded by the `Async` versions above): `Humanoid:ApplyDescription`,
  `ApplyDescriptionReset`, `Players:GetHumanoidDescriptionFromUserId`,
  `GetHumanoidDescriptionFromOutfitId`, `CreateHumanoidModelFromDescription`/`FromUserId`,
  `Player:LoadCharacterWithHumanoidDescription`, `Player:LoadCharacter` (→ `LoadCharacterAsync`).
  Older tutorials and the appearance guide still show them.
- **Clone-and-modify:** never mutate a shared or template description in place — clone it, edit the
  clone, apply. A shared instance silently changes every character that uses it next.
- **Don't mix systems:** changing assets on a character directly while also applying descriptions
  leads to undefined results. Pick one, or use `ApplyDescriptionResetAsync`.

### Fields

- Classic clothing: `Shirt`, `Pants`, `GraphicTShirt` (asset IDs). `Face`.
- Body parts (R15 mesh IDs): `Head`, `Torso`, `LeftArm`, `RightArm`, `LeftLeg`, `RightLeg`; colours
  `HeadColor`, `TorsoColor`, `LeftArmColor`, ... (Color3).
- Scale (R15 only): `HeightScale`, `WidthScale`, `DepthScale`, `HeadScale`, `BodyTypeScale`,
  `ProportionScale`.
- Rigid accessories: comma-separated ID strings per slot — `HatAccessory`, `HairAccessory`,
  `FaceAccessory`, `NeckAccessory`, `ShouldersAccessory`, `FrontAccessory`, `BackAccessory`,
  `WaistAccessory`.
- Layered and bulk accessories: `description:SetAccessories(list, includeRigidAccessories)` /
  `GetAccessories(includeRigidAccessories)`; each entry has `AssetId`, `AccessoryType`, and for
  layered clothing `Order` (and optionally `IsLayered`, `Puffiness`).
- Animation pack overrides: `IdleAnimation`, `WalkAnimation`, `RunAnimation`, `JumpAnimation`,
  `FallAnimation`, `ClimbAnimation`, `SwimAnimation`, `MoodAnimation`; emotes via `SetEmotes` /
  `SetEquippedEmotes`.

R6 vs R15: scale fields and body-part meshes apply to R15 only. Classic clothing works on both.

```luau
-- Server: give an NPC (or a player's character) a tweaked copy of a template look.
local ServerStorage = game:GetService("ServerStorage")

local template = ServerStorage.Appearances.GuardLook :: HumanoidDescription
local desc = template:Clone() -- never mutate the shared template
desc.HeightScale = 1.1
desc.HeadScale = 1.05
desc.Shirt = 5832882895 -- classic shirt asset id (example)
desc.HatAccessory = desc.HatAccessory .. ",2551510151" -- append to the comma-separated list

local ok, err = pcall(npcHumanoid.ApplyDescriptionAsync, npcHumanoid, desc)
if not ok then
    warn("ApplyDescriptionAsync failed:", err)
end
```

```luau
-- Server: every player spawns wearing a team uniform on top of their own avatar.
local Players = game:GetService("Players")
Players.CharacterAutoLoads = false

Players.PlayerAdded:Connect(function(player)
    local ok, desc = pcall(Players.GetHumanoidDescriptionFromUserIdAsync, Players, player.UserId)
    if not ok then
        desc = Instance.new("HumanoidDescription") -- fallback: default look
    end
    desc.Shirt = TEAM_SHIRT_ID
    desc.Pants = TEAM_PANTS_ID
    player:LoadCharacterWithHumanoidDescriptionAsync(desc)
end)
-- With CharacterAutoLoads off you also own respawning: call LoadCharacter*Async again after death.
```

## Waiting for appearance

`Player.CharacterAppearanceLoaded(character)` fires **on the server** once accessories, clothing
and body parts from the avatar have been inserted. Use it before removing accessories, recolouring
parts, or measuring the final character size. `CharacterAdded` fires earlier, before appearance
has loaded. A custom `StarterCharacter` does not load avatar appearance; handle its accessories in
`CharacterAdded`. `Player.CanLoadCharacterAppearance = false` spawns plain default characters.

## Custom rigs: StarterCharacter and friends

- A `Model` named **`StarterCharacter`** in `StarterPlayer` replaces every player's character. It
  needs a `Humanoid`, a `HumanoidRootPart` (set as `PrimaryPart`) and a working joint tree; animate it
  with an `Animator` under the Humanoid. Test spawn, death, reset and tools with it.
- A `Humanoid` named **`StarterHumanoid`** in `StarterPlayer` overrides default Humanoid properties
  (health, walk speed, `BreakJointsOnDeath`, …) for every spawned character.
- **`StarterCharacterScripts`** run once per spawn inside the character (a replacement `Animate`
  script goes here); **`StarterPlayerScripts`** run once per player session.
- Avatar-wide defaults (R6/R15, scale ranges, body parts, clothing overrides, collision) are set in
  Studio's **Avatar Settings** (File › Avatar Settings).

## Legacy: BodyColors, Shirt, Pants instances

- `BodyColors` (one instance in the character) has `HeadColor3`, `TorsoColor3`, `LeftArmColor3`,
  … (Color3) alongside the older BrickColor properties. Prefer `HumanoidDescription` colour fields
  for new work; the description system manages this instance for you.
- `Shirt`/`Pants` instances parented to the character carry `ShirtTemplate`/`PantsTemplate` (or the
  `...TemplateContent` Content variants). If you edit them directly instead of through a
  description, find-or-create the instance, then set the template — and don't also apply descriptions
  (or use `ApplyDescriptionResetAsync` afterwards).

## Tools

`HopperBin` (the pre-`Tool` ancestor) is deprecated: use `Tool` instances in `StarterPack`/`Backpack`
and `Humanoid:EquipTool()`/`UnequipTools()`, or a `ProximityPrompt` for non-held interactions. Only
tolerate HopperBins when preserving a legacy place file.

## Primary references

- https://create.roblox.com/docs/characters/appearance
- https://create.roblox.com/docs/reference/engine/classes/HumanoidDescription
- https://create.roblox.com/docs/reference/engine/classes/Humanoid
- https://create.roblox.com/docs/reference/engine/classes/Players
- https://create.roblox.com/docs/reference/engine/classes/Player
