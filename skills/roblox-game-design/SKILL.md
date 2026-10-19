---
name: roblox-game-design
description: "Roblox game design: core loop, FTUE, level design, economy sources and sinks, retention, juice, genre conventions. Use when designing or reworking a game, when players quit early, or when balancing rewards and prices."
---

# Roblox Game Design Fundamentals

## When to Load

Load for the structural craft of a Roblox game: core loop and meta-game architecture, tutorial/FTUE structure, level design, economy design, retention-phase planning, juice/game feel, Bartle balance, grind avoidance, genre conventions, Today's Picks readiness. Route elsewhere: metrics/discovery → `roblox-growth-design`; persuasion/pricing psychology → `roblox-player-psychology`; purchase implementation → `roblox-monetization`; VFX → `roblox-animation-vfx`; economy telemetry → `roblox-analytics`.

## Quick Reference

- **Core loop first**: three layers must each work: core loop (moment-to-moment), meta-game (hour-to-hour), long-term progression (day-to-day). If the raw actions aren't fun, nothing above them survives.
- **Retention phases**: D0–7 understandability/novelty/stability → D7–30 progression/mastery/return triggers → D30–90 social comparison/LiveOps → D90+ community.
- **Teach invisibly**: teach through experience, never popups; environmental teaching, dynamic UI, kinesthetic learning, show don't tell, inverted pyramid of complexity.
- **Levels**: Kishōtenketsu (safe intro → develop → twist → conclusion) plus the invisible hand (coins/lighting guide without text) and fairness (deaths feel the player's fault).
- **Economy**: every source needs a sink; soft/hard/social currencies; prices must scale with the power curve; watch hoarding, churn at choke points, currency devaluation.
- **Anti-grind**: grind is a state of mind, not a mechanic. Fix with juice, skill ceilings, and measurable chunks. Never manufacture frustration to sell relief.
- **Bartle**: Achievers/Explorers/Socializers/Killers form an ecosystem; over-serve one and the others leave.
- **Genres**: obby, tycoon, simulator, tower defense, horror, RPG, fighting/PvP, roleplay/hangout each come with player expectations and known pitfalls (full.md §11).
- **Paid randomness**: any Robux-funded random reward needs numerical odds disclosure and a `PolicyService` `ArePaidRandomItemsRestricted` path (implementation → `roblox-monetization`).
- **Field data**: experience-based onboarding/monetization/retention observations (2026; heuristics, not platform rules; see full.md).

> Full framework details, checklists, case studies (Stardew, Hades, Artifact), genre conventions, and curation prep: [references/full.md](references/full.md)
