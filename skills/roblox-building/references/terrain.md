# Terrain and materials

Read this when generating or editing smooth `Terrain` from code, importing large landscapes, or
restyling materials with `MaterialService`/`MaterialVariant`. Signatures checked against the
`Terrain`, `MaterialService` and `MaterialVariant` API pages (2026-10). The voxel-alignment and
re-mesh notes come from m4bwav/roblox-agent `LEARNINGS.md` (MIT); see `../ATTRIBUTION.md`.

## Voxel basics

- Terrain is a grid of **4×4×4-stud voxels**; each voxel has one `Enum.Material` and an
  **occupancy** from 0 (air) to 1 (solid). Rendering builds a smooth surface from occupancy.
- `workspace.Terrain` exists in every place. Terrain is saved with the place file, not as a Rojo
  instance file: either bake it in Studio and keep it in the place, or ship it as data plus a builder
  script (see below).
- Terrain is not supported by CSG/`GeometryService`, and `Clear()` wipes everything — never call it
  on a user's place without asking.

## Shape fills (simple and fast)

| Method | Shape |
|---|---|
| `Terrain:FillBlock(cframe: CFrame, size: Vector3, material)` | Box (can be rotated) |
| `Terrain:FillBall(center: Vector3, radius: number, material)` | Sphere |
| `Terrain:FillCylinder(cframe: CFrame, height: number, radius: number, material)` | Cylinder along the CFrame's Y axis |
| `Terrain:FillWedge(cframe: CFrame, size: Vector3, material)` | Wedge (ramps) |
| `Terrain:FillRegion(region: Region3, resolution: 4, material)` | Grid-aligned region (`region:ExpandToGrid(4)`) |
| `Terrain:ReplaceMaterial(region, 4, sourceMaterial, targetMaterial)` | Repaint a material inside a region |

Fill with `Enum.Material.Air` to carve (tunnels, caves, clearing a path).

```luau
local terrain = workspace.Terrain

terrain:FillBlock(CFrame.new(0, -8, 0), Vector3.new(512, 16, 512), Enum.Material.Grass) -- ground slab
terrain:FillBall(Vector3.new(40, 0, 40), 18, Enum.Material.Rock)                       -- boulder hill
terrain:FillCylinder(CFrame.new(-60, -2, 30), 4, 24, Enum.Material.Water)               -- pond
terrain:FillBlock(CFrame.new(0, 2, 0), Vector3.new(12, 8, 80), Enum.Material.Air)       -- carve a path
```

## Per-voxel data: ReadVoxels / WriteVoxels

For heightmaps, noise-generated landscapes, or copying regions, write the voxel arrays directly:

- `Terrain:ReadVoxels(region: Region3, resolution: number) -> (materials, occupancies)` — two 3D
  arrays indexed `[x][y][z]`, each with a `.Size` field.
- `Terrain:WriteVoxels(region: Region3, resolution: number, materials, occupancy)` — arrays must
  exactly match the region's size in voxels.
- `resolution` must be `4`; the region must be grid-aligned (`Region3.new(min, max):ExpandToGrid(4)`)
  and at most 4,194,304 voxels per call. Work in chunks (e.g. 128-stud cubes) and yield between them
  for big maps.
- `ReadVoxelChannels`/`WriteVoxelChannels` expose extra channels (for example water) when you need
  more than material + occupancy.

```luau
-- Heightmap column fill for one grid-aligned chunk. heightAt(x, z) returns the ground height in studs.
local terrain = workspace.Terrain
local VOXEL = 4

local function buildChunk(minCorner: Vector3, sizeVoxels: Vector3, heightAt: (number, number) -> number)
    local region = Region3.new(minCorner, minCorner + sizeVoxels * VOXEL):ExpandToGrid(VOXEL)
    local nx, ny, nz = sizeVoxels.X, sizeVoxels.Y, sizeVoxels.Z
    local materials, occupancy = table.create(nx), table.create(nx)
    for x = 1, nx do
        materials[x], occupancy[x] = table.create(ny), table.create(ny)
        for y = 1, ny do
            materials[x][y], occupancy[x][y] = table.create(nz), table.create(nz)
            local voxelBottom = minCorner.Y + (y - 1) * VOXEL
            for z = 1, nz do
                local wx = minCorner.X + (x - 0.5) * VOXEL
                local wz = minCorner.Z + (z - 0.5) * VOXEL
                local h = heightAt(wx, wz)
                -- Occupancy is centred on the voxel: subtract 0.5 so the drawn surface lands on h.
                local occ = math.clamp((h - voxelBottom) / VOXEL - 0.5, 0, 1)
                occupancy[x][y][z] = occ
                materials[x][y][z] = if occ > 0 then Enum.Material.Grass else Enum.Material.Air
            end
        end
    end
    terrain:WriteVoxels(region, VOXEL, materials, occupancy)
end
```

### Practical notes (field-tested, not from the docs)

- **Surface height offset:** with a naive linear occupancy `(h - voxelBottom) / 4`, the smooth
  surface renders about **2 studs (half a voxel) higher** than `h`, so parts placed at the heightmap
  height end up buried. Use `clamp((h - voxelBottom) / 4 - 0.5, 0, 1)` as above. Under hard surfaces
  (roads, pads) carve only 0.4–0.8 studs, about half a voxel past the edge, and hide the seam with a
  curb or border part. Check with a downward raycast against Terrain (part top minus terrain hit)
  before trusting screenshots.
- **Sky-coloured holes up close after repeated rebuilds:** if many Clear/WriteVoxels passes in one
  Studio session leave flat sky-coloured patches near the camera, first raycast the spot. If the data
  is solid, it is stale render meshes: read and write back the same voxels over the area (ReadVoxels
  then WriteVoxels in 128-stud regions) or save and reopen the place. Don't regenerate the data.
- **Ship terrain as data plus a builder** when the place is generated outside Studio (e.g. with Lune,
  which cannot write voxels): bake once in Studio, and have a server script build it at start-up if
  it is missing.

## Large landscapes

For big worlds, prefer Studio's **Terrain Editor** tools: **Generate**, and **Import** with a
heightmap (and optional colormap for materials). Heightmaps cannot express overhangs or caves; add
those afterwards with fills/carves or sculpting. Desktop terrain tools (World Machine, Gaea, Blender)
can export the heightmap. Check the current Terrain Editor docs for size and resolution limits
before planning a pipeline:
https://create.roblox.com/docs/parts/terrain

## Materials: MaterialService and MaterialVariant

- A **`MaterialVariant`** is a custom PBR look layered on a base material: `BaseMaterial`,
  `ColorMapContent`, `NormalMapContent`, `MetalnessMapContent`, `RoughnessMapContent`, optional
  emissive mask (`EmissiveMaskContent`, `EmissiveStrength`, `EmissiveTint`), `StudsPerTile`,
  `MaterialPattern` (`Regular` tiling or `Organic` to hide repetition), and
  `CustomPhysicalProperties`.
- Put variants under **`MaterialService`** (directly or in folders). A variant is identified by its
  `Name` + `BaseMaterial`.
- **Apply to a part:** set `part.Material = variant.BaseMaterial` and `part.MaterialVariant =
  variant.Name`.
- **Override a base material everywhere** (parts *and* terrain using it): set the matching
  `MaterialService.<Material>Name` property in Studio, or from code
  `MaterialService:SetBaseMaterialOverride(Enum.Material.Grass, "MyGrass")` (the `...Name`
  properties themselves are not scriptable). The variant's `BaseMaterial` must match.
- Terrain picks up material overrides for its materials; per-voxel material variants beyond that are
  not set from `WriteVoxels`. Mixing legacy (pre-2022) terrain materials with variants has a
  performance cost: keep `MaterialService.Use2022Materials` on when using variants.
- `Terrain:SetMaterialColor(material, color)` tints a terrain material's base colour.

```luau
-- Edit-time (execute_luau in Edit, or a one-off command bar run): register a variant and use it.
local MaterialService = game:GetService("MaterialService")

local mossy = Instance.new("MaterialVariant")
mossy.Name = "MossyStone"
mossy.BaseMaterial = Enum.Material.Slate
mossy.StudsPerTile = 8
mossy.MaterialPattern = Enum.MaterialPattern.Organic
-- mossy.ColorMapContent = Content.fromUri("rbxassetid://...") -- your uploaded maps
mossy.Parent = MaterialService

wall.Material = Enum.Material.Slate
wall.MaterialVariant = "MossyStone"
```

With `studio-mcp`, `generate_material` can produce a variant from a prompt; read back its
`BaseMaterial` and name, then apply as above. Offline, author the maps in a texturing tool, upload
them as images, and create the variant by hand.

## Primary references

- https://create.roblox.com/docs/reference/engine/classes/Terrain
- https://create.roblox.com/docs/parts/terrain
- https://create.roblox.com/docs/reference/engine/classes/MaterialService
- https://create.roblox.com/docs/reference/engine/classes/MaterialVariant
- https://create.roblox.com/docs/parts/materials
