## Why

The existing `PagerDutyCalendar.tsx` component lets engineers import PagerDuty ICS calendar exports and view on-call schedules as a grid — but it has no formal specification. Writing a spec establishes the authoritative requirements for the feature so that future changes (enhancements, bug fixes, refactors) have a clear baseline to validate against.

## What Changes

- Formal specification of the PagerDuty Calendar feature (ICS import, grid rendering, date range filtering, row reordering, export)
- No functional changes to existing code — this is a spec-writing exercise that documents and formalizes existing behavior
- Identifies any gaps or edge cases currently unaddressed that should be captured as requirements

## Capabilities

### New Capabilities

- `pagerduty-calendar`: Core capability covering ICS file import, on-call grid rendering, date range filtering, person row reordering, per-section export (CSV / Excel / clipboard copy), global multi-file export, and aggregated statistics panel

### Modified Capabilities

<!-- No existing specs are being modified -->

## Impact

- **Files affected**: `src/PagerDutyCalendar.tsx` (reference only — no code changes in this change)
- **No runtime dependencies added**
- **No breaking changes** to any existing features
