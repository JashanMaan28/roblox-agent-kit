# 3D models in a Roblox game

What a Roblox developer needs to know to bring a model into a place and keep the game fast. Making or fixing the mesh itself happens in a DCC tool (Blender, Maya) or with Studio's generation tools (`generate_mesh`, `generate_procedural_model` via `studio-mcp`). Adapted from m4bwav/roblox-agent (MIT); see `../ATTRIBUTION.md`. Facts below were read on create.roblox.com around 2026-10-17. Check the page before quoting a number: these move. Back to [full.md](full.md).

## Pick the style first

| Style | Built from | What it asks of a mesh |
|---|---|---|
| Classic blocky (bricks) | Parts in Studio, built-in materials (Plastic, SmoothPlastic), CSG unions | Usually no mesh at all. Build in Studio; import only props Parts cannot shape |
| Smooth plastic, toy-like | Parts plus simple MeshParts with a flat colour or `MeshPart.Color` | Low triangle counts, no texture or a tiny one, `SmoothPlastic` material |
| Low-poly stylised | MeshParts with vertex colours or one small palette texture shared by many meshes | Few hundred to few thousand triangles; one shared texture keeps draw calls down |
| Realistic PBR (showcases) | MeshParts with `SurfaceAppearance` (or a `MaterialVariant`) | UVs in 0 to 1, the PBR map set, careful texture budgets, more streaming and LOD work |

Mixing styles in one place reads as a mistake to players. Decide per game and state the style in every asset request or generation prompt.

## Limits a mesh must meet

- **Triangles**: at most 20,000 per mesh. The Importer simplifies bigger meshes on its own, which can ruin a silhouette, so split a big model into several MeshParts instead.
- **Geometry**: watertight, no zero-thickness surfaces, quads where possible. Solid modelling on meshes (beta, 2026-03-12) also needs watertight input.
- **One material per MeshPart.** A model with three materials imports as three MeshParts (the Importer's Merge Meshes joins them into one MeshPart, so use it only when one texture serves them all).
- **Textures**: PNG, JPG, TGA or BMP; uploads up to 4096 px, but the PBR budget tops out at 1024 px per map (roughly 256 px per 2x2x2 studs; 1024 px for an 8x8x8-stud object). Studio downsamples when memory is short.
- **PBR maps** on a `SurfaceAppearance`: colour (albedo, may carry alpha), normal (OpenGL, tangent space only), roughness, metalness, plus an optional emissive mask. One UV set per mesh, UVs inside 0 to 1, overlaps allowed. Scripts cannot change `SurfaceAppearance` maps at run time; swap whole parts or use `MaterialVariant` instead.
- **Rigs**: bones with scale 1 and rotation 0, root at the origin, at most 4 bone influences per vertex, no influence on the root, one animation track per FBX.

## Scale, pivot and orientation

- 1 stud is 28 cm (Roblox units page), so a 1.8 m person is about 6.4 studs. Classic avatars are about 4.75 studs tall and Rthro Normal 5.75 to 6.5, so design doors and corridors around the avatar scale the game uses.
- Importer settings that decide size and placement: File Geometry > Scale Unit (default Studs: set it to the unit the file was made in), File Transform > World Forward and World Up, Set Pivot to Scene Origin (on by default), Use Imported Pivot per object, Insert Using Scene Position. glTF needs no scale workaround; FBX from Blender needs Apply Scalings = FBX Unit Scale.
- Set the pivot where the game needs it (in the DCC tool, or with `PivotOffset` after import): bottom centre for props, the hinge for doors, the axle for wheels, the grip for tools.

## Collision and rendering are separate

- `CollisionFidelity`: Box for small or decorative props, Hull for mostly convex ones, Default when concavity matters, PreciseConvexDecomposition only where players must stand in a hollow, and `Tunable` (2026-09-17) with a `CollisionPrecision` slider to trade cost for accuracy per mesh.
- For large complex meshes, build collision from invisible Box parts. For parts nothing touches, set `CanCollide`, `CanTouch` and `CanQuery` false; their collision geometry still costs memory otherwise.
- `RenderFidelity` Automatic drops detail at 250 and 500 studs. Precise on many meshes costs frame time.
- Studio's Visualization Options > Collision fidelity shows what the physics engine sees. Animated bones change looks, never collision.

## Performance

- Meshes with the same `MeshContent` and identical `SurfaceAppearance` (or texture) draw in one call. Import each mesh once and duplicate it in Studio; importing a whole scene in one go gives every copy its own asset ID and loses that.
- Fewer instances and fewer unique meshes beat lower triangle counts. Decals, transparency and shadow-casting lights batch badly.
- Turn on `StreamingEnabled` for big maps (Server Authority forces it) and group props into Models with sensible `ModelStreamingMode`. Use Packages for kit pieces reused across places.
- Skinned MeshParts that move outside a Humanoid rebuild spatial clusters every frame; give the Model a Humanoid or keep them still.

## Characters and animation

- Custom rig: import an FBX with an armature; the Importer makes `Bone` instances you can pose in the Animation Editor.
- Avatar bodies (R15): 15 meshes named `<Part>_Geo`, the R15 bone hierarchy (Root, HumanoidRootNode, LowerTorso ...), I, A or T pose, body triangle budgets (head 4,000, torso 1,750, each limb 1,248; 10,742 total), an outer cage for layered clothing, and `_Att` attachments.
- Avatar Setup (Studio) rigs, cages, skins and adds a face to an unrigged body, and fits accessories to a base body. Use it before hand-rigging.

## Accessories, layered clothing and UGC

- Rigid accessory: one mesh, at most 4,000 triangles, size limits per body scale and attachment, non-colour maps at most 256 px.
- Layered accessory: at most 4,000 triangles, an `_InnerCage` and `_OuterCage` copied from Roblox's templates (never delete their vertices or UVs), 4 influences per vertex, textures at most 2048 px for the Marketplace.
- The UGC validation system runs on every Marketplace upload and on `AvatarCreationService` calls. Game-only assets do not need it, but its errors (wrong `CollisionFidelity`, rotated rig attachments, `SurfaceAppearance.AlphaMode` other than Overlay on rigid accessories, mismatched `MeshSize`) explain many broken avatar items. A visualiser for its checks is in beta (2026-06-29).

## What Studio does in place, what needs Blender

| In Studio | Outside (Blender, Maya, or another DCC tool) |
|---|---|
| Parts, CSG union, negate, intersect; sweep and fragment on meshes (beta) | Any organic or curved mesh, UV unwrapping, baking PBR maps |
| Terrain (voxels, Terrain Editor, heightmap import; up to 64 custom materials in early access) | Retopology and decimation of generated or scanned meshes |
| Collision and render fidelity, `SurfaceAppearance`, `MaterialVariant`, pivots | Rigs and skin weights for custom characters (Avatar Setup covers standard bodies) |
| Reimport (Alt+Shift+R remembers the file; Auto-Reimport beta 2026-09-08 updates on save) | Cages for layered clothing, starting from Roblox's template files |

`GenerationService:GenerateModelAsync` generates meshes in game from a prompt (schemas `Car5` and `Body1`); treat its output as player content.

## Uploading without Studio (Open Cloud)

`POST https://apis.roblox.com/assets/v1/assets` with `assetType` `Model` takes `.fbx`, `.gltf`, `.glb`, `.rbxm` or `.rbxmx` up to 20 MB; it returns an operation to poll at `/assets/v1/operations/{id}`, and models arrive as packages. Only FBX content can be updated (a new version). The API key needs the `assets` permission with read and write. The Importer gives a preview and warnings the API does not, so use it for anything new; use the API for repeat uploads from a pipeline. Reportedly, place publishing through Open Cloud does not update `SurfaceAppearance` or `EditableMesh` data; verify before relying on it. Open Cloud setup and the plugin's `cloud_upload_place` tool: `open-cloud`.

## Sources

create.roblox.com/docs: `art/modeling/specifications`, `art/modeling/texture-specifications`, `art/modeling/surface-appearance`, `art/modeling/export-requirements`, `art/blender`, `parts/meshes`, `studio/importer`, `art/modeling/reimport`, `physics/units`, `parts/solid-modeling`, `performance-optimization/improve`, `avatar/character-bodies/specifications`, `avatar/rigid-accessories/specifications`, `avatar/layered-accessories/specifications`, `avatar-setup/auto-setup-requirements`, `marketplace/validation-system`, `parts/model-generation`, `cloud/guides/usage-assets` (add `.md` for Markdown). Beta features above are dated by their DevForum announcements; re-check their status.
