# World building

Maps, terrain, props and lighting are code in the repo, built into Studio on demand. The same builders rebuild the world in a fresh place, in a Rojo-built place file and in review, so the world is versioned, diffable and reproducible like the rest of the game.

## Contents
1. Layout and ownership
2. Builder contract
3. Running builders in Studio
4. Runtime fallback
5. Geometry guidelines
6. Terrain
7. Assets: generated, Creator Store, uploaded
8. Lighting and atmosphere
9. Verification

## 1. Layout and ownership

```
world/                        → ServerStorage.WorldBuilders (Rojo, optional path)
  init.luau                   runner: build(zones?) / ensureBuilt()
  Lib.luau                    helpers: part, wedge, model, folder, tag, clearZone
  Lighting.luau               lighting + atmosphere + post-processing from spec §7
  Zones/<Zone>.luau           one builder per zone from spec §7
  assets.md                   manifest of non-code assets (see §7)
```

Add the mapping once (CORE-06) if the project file lacks it:

```json
"ServerStorage": {
  "Tests": { "$path": "tests" },
  "WorldBuilders": { "$path": { "optional": "world" } }
}
```

Ownership:
- `Workspace.World` (Folder) is owned by the builders: one child per zone, rebuilt wholesale. Nothing else writes there. Rojo doesn't map Workspace, so `rojo serve` never touches it.
- `ServerStorage.WorldAssets` (Folder) holds Studio-only models (generated meshes, Creator Store inserts). It lives in the place file, listed in `world/assets.md`.
- Gameplay reads the world only through `CollectionService` tags and attributes the builders set (`Checkpoint`, `KillBrick`, `Plot`, `EnemyPath`, `SpawnPoint`…), never through hard-coded paths.
- `node tools/rbx-check.mjs` lints `world/` with the rest of the code.

## 2. Builder contract

```luau
--!strict
-- world/Zones/LavaTower.luau
local Lib = require(script.Parent.Parent.Lib)

return function(zone: Model, rng: Random)
	local base = Lib.part(zone, "Base", {
		Size = Vector3.new(64, 4, 64),
		CFrame = CFrame.new(0, -2, 0),
		Material = Enum.Material.Basalt,
		Color = Color3.fromHex("#3B2F2F"),
	})
	Lib.tag(base, "SafeGround")
	for stage = 1, 30 do
		-- deterministic layout from the spec's stage table, rng only for decoration
	end
end
```

- Signature `(zone: Model, rng: Random) -> ()`. The runner creates `zone` fresh under `Workspace.World`, named after the module, with `Random.new(<seed from spec or hash of the zone name>)`.
- Deterministic: same code + same seed = same world. Randomness only through `rng`.
- Data-driven: layout numbers come from the same `Config`/content tables the systems use (`src/shared/...`), so a stage list or plot grid is defined once.
- Every part is `Anchored = true` unless physics is intended; `CanCollide`, `CanQuery`, `CanTouch` set deliberately (decoration: `CanTouch = false`, `CanQuery = false`); `CastShadow = false` on small decoration.
- Name everything meaningfully; group with Models (with `PrimaryPart`/`WorldPivot`) for anything systems move or clone.
- Yield every ~500 instances (`task.wait()`) so Studio stays responsive.

`Lib.luau` provides `part(parent, name, props)`, `wedge`, `cylinder`, `model(parent, name)`, `folder`, `tag(inst, tagName)`, `attr(inst, name, value)`, `clone(assetName, parent, cframe)` (from `WorldAssets`, with a placeholder block + warning when missing) and `count(root)`.

## 3. Running builders in Studio

The runner rebuilds from a fresh copy of the modules, so edits synced by Rojo take effect without `require` caching old code. `execute_luau`, `datamodel_type: "Edit"`, not during a playtest:

```luau
local ServerStorage = game:GetService("ServerStorage")
local fresh = ServerStorage.WorldBuilders:Clone()
fresh.Name = "WorldBuildersRun"
fresh.Parent = ServerStorage
local ok, result = pcall(function()
	return require(fresh).build({ "LavaTower" }) -- nil = every zone + Lighting
end)
fresh:Destroy()
return if ok then result else `FAILED: {result}`
```

`build` returns a summary string (`"LavaTower: 412 instances; Lighting applied"`). Requires `rojo serve` connected so `ServerStorage.WorldBuilders` matches disk; check with `inspect_instance` if a change doesn't show.

After building, remind the user once per milestone to save the place in Studio (File → Save to Roblox or Save to File): the place holds the built world and `WorldAssets`; git holds the builders.

## 4. Runtime fallback

`init.luau` also exposes `ensureBuilt()`: the server bootstrap calls it first; if `Workspace.World` is missing (a Rojo-built place, a cloud test place, a fresh baseplate), it builds every zone and applies lighting, then logs `[world] built at runtime (<n> instances)`. A saved place with the world already built skips it. This keeps `rojo build` output playable and lets `cloud_upload_place` produce a working place.

## 5. Geometry guidelines

- Scale from spec §7: R15 character ~5 studs; default jump ~7 studs up and ~8.7 studs across, so required jumps stay ≤ 6 up / ≤ 7 across unless movement stats change; doors ≥ 8×5; corridors ≥ 8 wide; stairs 1-stud risers.
- Readability: walkable surfaces visually distinct from hazards and decoration; hazards use the spec's danger colour and a material that reads at a glance (Neon for lava/lasers).
- Landmarks visible from spawn point toward the first objective; the path to the first reward needs no explanation.
- Part budget per zone from spec §13; union/mesh only for repeated complex shapes. Use `Model:ScaleTo` and pivot APIs instead of manual CFrame math for prefabs.
- Collision: invisible boundary walls at play-area edges (`Transparency = 1`, `CanQuery = false`); a kill plane below falling zones.
- Detail pass (M3): trim, props, foliage, lights and decals added by the same builders, behind `Lib` helpers so the blockout geometry stays readable in code.

## 6. Terrain

Generated in the builder with `Workspace.Terrain` APIs (`FillBlock`, `FillBall`, `FillCylinder`, `FillWedge`, `ReplaceMaterial`), from deterministic shapes. The runner clears only the terrain region a zone owns (`FillBlock` with `Enum.Material.Air` over the zone's bounds) before rebuilding. Terrain voxels don't sync through Rojo and aren't saved to disk; the builder is the source.

## 7. Assets: generated, Creator Store, uploaded

Only when spec §14 approved them.

1. Create the asset in Studio: `generate_mesh` / `generate_procedural_model` / `generate_material` (async + `wait_job_finished`), or `search_asset` + `insert_asset` for Creator Store models.
2. Inspect it: scan every `Script`/`LocalScript`/`ModuleScript` inside inserted models (`require(<number>)`, `loadstring`, `getfenv`, `HttpService`), delete scripts the game doesn't need, set sizes to spec scale, anchor, collision fidelity.
3. Move it to `ServerStorage.WorldAssets.<Name>` with a stable name; builders place it with `Lib.clone("<Name>", parent, cframe)`.
4. Record it in `world/assets.md`: name, source (generation prompt + settings, or Creator Store asset id and creator), license note for store assets, where it's used.

Reference images for the look (concepts, mockups, turnarounds) come from CORE-00 ([art-direction.md](art-direction.md)); a `prop`/`turnaround` reference can feed Studio generation directly (`store_image` → `generate_procedural_model` `attachedImageUri`). Images that ship in the game (decals, UI icons): `roblox-reference-art` to create, `store_image`/`upload_image` to get an asset id, ids kept in a `src/shared/Assets.luau` table with names. Sounds: Creator Store audio ids in `Sounds.luau`.

## 8. Lighting and atmosphere

`Lighting.Technology` can't be set by any script (Roblox-only security), including `execute_luau`: put it in the project file so `rojo build` output has it (`"Lighting": { "$properties": { "Technology": "Future" } }`), and add a one-line instruction to `PROGRESS.md` for the user to pick the same value in Studio's Properties panel for the open place (scripts can't read it either, so the screenshot is the check).

`world/Lighting.luau` applies the rest of spec §7 idempotently: `Lighting` properties `ClockTime`, `Brightness`, `Ambient`/`OutdoorAmbient`, `EnvironmentDiffuseScale`/`EnvironmentSpecularScale`, `ExposureCompensation`; find-or-create `Atmosphere`, `Sky`, `ColorCorrectionEffect`, `BloomEffect`, `SunRaysEffect`, `DepthOfFieldEffect` by name with the spec's values. Load `roblox-lighting` for values per mood.

## 9. Verification

- Builder determinism: build twice, compare `Lib.count` and a checksum of part CFrames/sizes (returned by `build`); they must match.
- Layout: `execute_luau` (Edit) asserting tagged objects exist with the spec's counts (30 `Checkpoint` tags, 8 `Plot` tags…).
- Reachability: playtest with `character_navigation` along the critical path (spawn → first objective → next zone); a stuck character is a level bug.
- Look: build each zone while looking at its reference; record its hero camera in `art/refs/README.md`; the visual criteria are judged from those cameras by an independent judge ([visual-review.md](visual-review.md)).
