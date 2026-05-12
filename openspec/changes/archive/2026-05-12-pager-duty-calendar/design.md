## Context

The PagerDuty Calendar feature (`src/PagerDutyCalendar.tsx`) is an existing React component inside the `zutils` desktop/web app. It accepts one or more `.ics` files exported from PagerDuty, parses the `VEVENT` blocks to extract on-call shift data, and renders a grid that maps people (rows) to calendar days (columns). Users can filter by date range, reorder rows via drag-and-drop, and export to CSV, Excel, or clipboard.

The app is a single-page React app with a sidebar nav. No backend — all processing runs client-side in the browser.

## Goals / Non-Goals

**Goals:**

- Document and validate the existing ICS-import pipeline (parse → build sheets → render)
- Specify the date-range filtering contract (from/to year-month + day)
- Specify the row-reorder contract (drag-and-drop and arrow buttons)
- Specify export outputs: CSV (combined and per-month), Excel (combined and per-month), and clipboard copy
- Specify multi-file support (multiple CalendarData entries rendered in sequence)
- Define the "8 hours per on-call day" convention used throughout

**Non-Goals:**

- Live PagerDuty REST API integration (no API token, no real-time sync)
- Authentication or user account management
- Persistent storage of uploaded calendars between sessions
- Mobile layout optimization

## Decisions

### ICS Parsing: Client-Side String Parsing (no library)

The parser (`parseICS`) uses plain regex matching against `VEVENT` blocks rather than an iCalendar library.

**Why over a library (e.g., ical.js):** The only field set needed is `SUMMARY`, `DTSTART`, and `DTEND` — all in `YYYYMMDDTHHMMSSZ` format. A full iCalendar library adds bundle weight for no benefit. If the PagerDuty ICS format changes significantly, the regex approach will need updating, but that risk is acceptable given PagerDuty's stable export format.

### Shift-to-Day Attribution: UTC Day After Start

Each on-call shift occupies whole UTC days. The component iterates from `startDate` to `endDate` in 24-hour steps and attributes each day to the **next** UTC date (`cur + 24h`). This matches PagerDuty's convention where a midnight-UTC shift handoff is recorded as the following day.

**Why not use local time:** On-call rosters are cross-timezone; UTC keeps the grid consistent for all users.

### Hours Convention: 8 Hours Per On-Call Day

Cells are stored as `8` (hours) or `""`. Total hours = `count × 8`. This is a payroll/reporting convention, not actual time logged.

### Multi-File Support: Separate CalendarData Entries

Each uploaded file is kept as an independent `CalendarData` object. They render sequentially on the page rather than being merged. This avoids name-collision ambiguity when two files contain the same person name with different schedule data.

### Export Format: Combined vs. Per-Month

In **combined** mode, all months share a single sheet/CSV with a two-row header (month label spanning columns + day numbers). In **per-month** mode, each month gets its own sheet/CSV block. The toggle is per-CalendarData instance.

### Global Export and Statistics: Aggregation Across All Sections

When multiple files are loaded, a global export toolbar aggregates all sections' export handles. Each section registers an `ExportHandle` (via a `ref`-backed map) that exposes `getCSV`, `getExcelRows`, and `getStats`. Global actions iterate over all registered handles. A statistics panel below all sections sums per-person on-call days across all handles using `getStats`.

**Why a ref-backed map over lifting state:** Export output depends on each section's local state (current date range, row order, combined toggle). Lifting all that state would couple sections tightly. The handle pattern lets each section own its state and expose a stable read interface.

## Risks / Trade-offs

- **ICS format fragility** → Mitigation: Unit-test the parser against real PagerDuty ICS samples. Document the expected `SUMMARY` pattern (`On Call - <name> - ...`).
- **Large files causing UI jank** → Mitigation: Acceptable at current scale (team-sized rosters, months of data). A large-file warning is not yet implemented; add one if performance issues are observed in practice.
- **Day attribution off-by-one** → The `cur + 24h` convention is correct for UTC midnight handoffs but will misattribute shifts with non-midnight boundaries. Document this as a known limitation.
- **No persistent state** → Files must be re-uploaded on each page load. Acceptable for the current use case; localStorage persistence is a future enhancement.
