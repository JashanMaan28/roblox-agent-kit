---
name: roblox-animation-vfx
description: "Roblox animation and VFX: Animator tracks, priorities, markers, particles, beams, trails, Highlight, tweens, camera shake, effect cleanup. Use when adding or fixing animations or effects, or tuning game feel and hit feedback."
---

# roblox animation and vfx

## When to Load

Load when implementing character animation, particle or beam effects, tweens, camera feedback, or visual cleanup.

## Quick Reference

- Load tracks through an `Animator` on a `Humanoid` or `AnimationController`; set `AnimationTrack.Priority` deliberately.
- Use `GetMarkerReachedSignal()` for named gameplay or presentation cues, then disconnect or replace the listener when the track ends.
- Track lifecycle: `Ended` is post-fade cleanup; `Stopped` includes explicit stops. Same-priority tracks blend by weight; see full.md for control and loading guards.
- A burst `ParticleEmitter` usually has `Rate = 0` and uses `:Emit(count)` with a bounded lifetime; use pooling for frequent effects.
- Shape each effect as readable phases: warning, contact, brief peak, and fade. Give impact a clear silhouette before adding secondary particles, light, sound, or camera feedback.
- Use native particle flipbooks for animated textures; choose OneShot for a single impact or vary start frames for organic repetition. Custom mesh/image flipbooks may need their own playback code.
- Beams and trails need two attachments with a stable world-space relationship and a cleanup owner. Tune trails with `WidthScale`, `Lifetime`/`MaxLength`, `LightEmission`; `Trail:Clear()` after teleports.
- Emitter extras: `Squash` (stretch over lifetime), `TimeScale` (hit-stop/slow-mo), `Drag`, `LockedToPart`, `Shape*` for rings.
- `Highlight` for outlines/fill (`DepthMode`); max 255 per client and disabled ones still count, so destroy unused highlights.
- Tween a bounded set of properties with `TweenService:Create`; cancel or destroy temporary effects when their owner ends, and use `Debris:AddItem` for simple lifetimes.
- In Server Authority projects, keep synchronized animation logic in `RunService:BindToSimulation()` (requires `Workspace.UseFixedSimulation` enabled in Studio), query current tracks instead of caching handles across rollback, and make predicted effects reversible.
- Camera shake: check `GuiService.ReducedMotionEnabled` first; layer it on the default camera via `BindToRenderStep` at `Enum.RenderPriority.Camera.Value + 1` (full.md §7, `roblox-camera`).
- Profile particle counts, lights, post-processing, and per-frame camera work on the target device class.
- Related: sound for the same cue in `roblox-audio`; rigs and `Animator` lifecycle in `roblox-characters`; post-processing in `roblox-lighting`.

**Need the details?** Load [references/full.md](references/full.md) for animation and effect recipes.
