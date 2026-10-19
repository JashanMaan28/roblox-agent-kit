# Attribution

- **Source repository:** https://github.com/TabooHarmony/roblox-brain
- **Source path:** `skills/design/roblox-analytics/` (`SKILL.md`, `references/full.md`)
- **License:** MIT (see `LICENSE` in this folder, copied from the source repository)

## Modifications

- Frontmatter reduced to `name` and a single-line `description` (folded `when_to_use`; dropped `last_reviewed` and `sources`; sources moved to the bottom of `references/full.md`).
- "Max 10 resource types" corrected to 5 currencies (the `LogEconomyEvent` reference and Economy dashboard say 5; the conflicting limits table is noted).
- Custom-field limit reworded to 8,000 unique combinations across the three custom fields.
- Added documented limits: more than 20 transaction types and more than 100 SKUs are grouped as "Other"; only the 10 most recent funnel sessions per user per funnel are tracked; a funnel step expires after 180 days without events; events roll off after 90 days.
- Added the server-only / published-games-only rule (events are not sent from the client or Studio) and fixed the "verify in Studio" note accordingly.
- Added the methods confirmed on the AnalyticsService reference: `LogProgressionEvent`, `LogProgressionStartEvent`, `LogProgressionCompleteEvent`, `LogProgressionFailEvent`, `LogJourneyEvent`, `GetPlayerSegmentsAsync`, with an ethics note on using segments.
- roblox-cloud skill references changed to `open-cloud`; pointed offline trace inspection at the kit's read-only `datastore_list_entries` / `datastore_get_entry` tools.
