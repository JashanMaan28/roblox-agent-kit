---
name: roblox-growth-design
description: "Roblox growth: Creator Dashboard stats, Home recommendations, retention fixes, experiments, LiveOps, thumbnails and icons, events, invites. Use when CCU, D1/D7 or playtime are low, or when planning an update or A/B test."
---

# Roblox Growth Design

## When to Load

Load for growth, discovery, retention, onboarding, packaging, acquisition channels, or LiveOps; route implementation to domain skills (`roblox-analytics`, `roblox-monetization`, `roblox-gui`, `roblox-data`, ...).

## Quick Reference

### Diagnose before prescribing

1. Ask for dashboard, release, acquisition, and session evidence. Never invent metrics.
2. Find the narrowest broken transition: impression→play, join→control, action→payoff, return, or purchase.
3. Write a falsifiable hypothesis: **If Y changes because evidence Z, X should move without harming G.**
4. Prefer one test with a primary metric, counter-metrics, MDE, and decision rule.
5. Stop for safety, severe regressions, or invalid instrumentation; avoid significance peeking.

<!-- temporal: 2026-07 -->
### Home diagnosis

- Low Play-Through Rate (PTR, was QPTR): packaging readability, promise accuracy, or audience mismatch. Also check Experience Detail Page CTR.
- High First-Play Bounce Rate (negative stat): misleading package/clickbait, join failure, performance, confusing FTUE, or delayed payoff.
- Low D1: core loop, onboarding, stability, goals, or first payoff.
- Low D7/D30: progression, variety, social value, LiveOps, endgame, or exhaustion.
- Low conversion/ARPPU: product fit, value communication, friction, catalog depth, or concentration.
- Low 7-day spend days / play days per user: consumables, purchase pathways, or event cadence.

These are hypotheses, not one-to-one causes. Segment and test. D1 can move without a release as acquisition mix or social density changes (full.md §3).

### Platform facts (official, as of Oct 2026 — re-check the linked docs)

- Home ranking uses users acquired through Recommended for You; ads, search, and share-link cohorts do not enter the ranking stage. Ads buy reach, not Home placement. Signals: play-through rate, first-play bounce, play days per user (D1, D2–7, D8–28), playtime per user, then co-play days, qualified sessions, spend days, Robux spent.
- Beta mode hides a game from Home recommendations.
- **Kids and Select**: all-ages games start 16+ only and need **250 unique plays by highly engaged age-checked users within 60 days** plus a safety review. Creator needs age check, ID verification (18+) or facial age estimation (<18), 2FA, the full questionnaire (Minimal/Mild/Moderate), and either 2 consecutive months of Roblox Plus/Premium or the refundable **1,000 R$** publishing fee (refunded 90 days after the game becomes eligible, or 90 days after payment if it never does). The optional **50,000 R$** expedited review gives a 48-hour review. Details and doc conflicts: full.md §2.
- Media: 512×512 square icon; up to 10 thumbnails/videos, images 16:9 at 1920×1080; 3 video uploads per month. full.md §6.
- Acquisition/return channels: experience notifications (13+, 1/day/user), events and update announcements, share links (Creator Rewards audience expansion), invite prompts and referrals, rewarded video ads. full.md §9.

### Monetization mental model

- Convert valuable one-time game passes into consumables (repeat-purchase dev products): they lift 7-day spend days per user and solve recurring pain.
- Products must solve a real pain (effort grind, losing progress AFK, status). Place them where players already are, at the decision moment.
- Give players multiple purchase pathways (HUD shop icon, "+" next to currency), capped so they never nag.
- After shipping, check collateral damage: playtime, D1, D7, FTUE, and in-game economy. Implementation → `roblox-monetization`.

### Guardrails

Use accurate metadata. Avoid dark patterns, deceptive odds, coercive scarcity, and "whale" targeting. Treat moderation, abuse, accessibility, localization, performance, and economy health as constraints.

> Full signal definitions, Kids/Select rules, positioning, FTUE, packaging, monetization, LiveOps, acquisition tools, and audit workflow: [references/full.md](references/full.md). Operator anecdotes (ads, launch benchmarks; unverified): [references/community-notes.md](references/community-notes.md)
