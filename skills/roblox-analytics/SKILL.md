---
name: roblox-analytics
description: "Roblox AnalyticsService instrumentation: custom, economy, funnel, onboarding and progression events, dashboard limits, economy health. Use when adding or auditing analytics, finding drop-off, or measuring an update."
---

# Roblox Analytics Reference

## When to Load

Load when tracking player behavior, economy events, funnels, or onboarding traces, or building `AnalyticsService` instrumentation.

## Quick Reference

Key rules (limits as of Oct 2026 — re-check the linked docs in full.md):
- Built-in `AnalyticsService`; no third-party SDK. Events are sent **from the server, in published games only** (not from the client or Studio). Client UI steps reach the server through a validated remote.
- Event types: Custom (counters/values), Economy (currency flow), Funnel (step progression, including the onboarding funnel). Also: `LogProgressionEvent` / `LogProgressionStartEvent` / `LogProgressionCompleteEvent` / `LogProgressionFailEvent` (not yet charted), `LogJourneyEvent` (non-linear paths, Sankey chart), and `GetPlayerSegmentsAsync` (server-only runtime segment buckets).
- Rate limit: 120 + (20 × CCU) calls/minute. Batch where possible.
- Limits: 5 currencies on the Economy dashboard; >20 transaction types and >100 SKUs are grouped as "Other"; 3 custom fields with 8,000 unique value combinations; 10 funnels × 100 steps; 100 custom event names.
- Funnels: only the 10 most recent `funnelSessionId`s per user per funnel are tracked; a user's saved step expires after 180 days without events; skipped steps back-fill as completed.
- Economy events report committed changes; diagnostic events can record failed attempts. Report the balance the committed mutation RETURNED; never recompute it from the `leaderstats` replica.
- Economy events track sources (earned) and sinks (spent) separately.
- Dashboard ~24-hour delay; "View Events" validates in near real time.
- Creator Rewards: no AnalyticsService grant event. Track leading indicators (session duration, onboarding, share-link landings); Creator Dashboard owns payouts.
- First-session traces: bounded buffer, shared save owner, RTBF + retention; inspect offline with the read-only `datastore_list_entries` / `datastore_get_entry` tools. full.md §8.

**Economy health (decision layer):**
- Instrument from day one; you cannot backfill history.
- Log source AND sink per currency with SKUs + the mutation's returned balance.
- Health signals: sink/source ratio, inflation, whale concentration, elasticity, sink sufficiency, D1/D7 cohorts. Thresholds are heuristics.
- Economy breaks: verify events, read narrowest broken signal, change ONE lever, re-check.

**Cross-refs:** `roblox-growth-design` (audit workflow); `roblox-monetization` (purchase funnel); `roblox-networking` (validating client-reported steps); `open-cloud` (API keys, DataStore tools).

**Need more detail?** [references/full.md](references/full.md): code examples, API tables, edge cases.
