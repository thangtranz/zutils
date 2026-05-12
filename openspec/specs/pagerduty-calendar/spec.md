# PagerDuty Calendar Spec

## Purpose

A web-based tool for importing PagerDuty-exported `.ics` calendar files and visualizing on-call schedules as a filterable, exportable grid. Users can upload one or more ICS files, view on-call coverage per person per day, reorder person rows, filter by date range, and export the data as CSV, Excel, or clipboard content.

---

## Requirements

### Requirement: ICS File Import

The system SHALL accept one or more `.ics` files uploaded by the user (via file picker or drag-and-drop onto the drop zone). Each file MUST be parsed independently and displayed as a separate calendar section.

#### Scenario: Valid ICS file uploaded

- **WHEN** a user uploads a valid PagerDuty-exported `.ics` file
- **THEN** the system parses the file, extracts all on-call entries, and renders a calendar grid for that file

#### Scenario: Multiple ICS files uploaded simultaneously

- **WHEN** a user uploads multiple `.ics` files at once
- **THEN** each file is rendered as its own independent calendar section in the order uploaded

#### Scenario: File dropped onto drop zone

- **WHEN** a user drags a `.ics` file and drops it on the designated drop zone
- **THEN** the file is accepted and processed identically to a file-picker upload

#### Scenario: ICS file with no matching VEVENT blocks

- **WHEN** an uploaded file contains no `BEGIN:VEVENT` blocks matching the expected PagerDuty `SUMMARY` pattern (`On Call - <name> - ...`)
- **THEN** an error message is displayed and no calendar section is rendered for that file

#### Scenario: Non-ICS file uploaded

- **WHEN** a user uploads a file whose name does not end in `.ics`
- **THEN** an error message is displayed identifying the filename, and the file is not processed

---

### Requirement: ICS Parsing — On-Call Entry Extraction

The parser SHALL extract on-call entries from `VEVENT` blocks. Each entry MUST capture: person name (from `SUMMARY`), UTC start datetime (`DTSTART`), and UTC end datetime (`DTEND`).

#### Scenario: Standard PagerDuty VEVENT block parsed

- **WHEN** a `VEVENT` contains `SUMMARY:On Call - Alice Smith - Team A`, `DTSTART:20240601T000000Z`, and `DTEND:20240602T000000Z`
- **THEN** one entry is created for Alice Smith on 2024-06-02 (UTC day after start)

#### Scenario: Multi-day shift spanning N days

- **WHEN** a `VEVENT` has a 7-day duration (e.g., `DTSTART:20240601T000000Z`, `DTEND:20240608T000000Z`)
- **THEN** 7 individual day entries are created for the person (one per UTC day in the range)

#### Scenario: Malformed VEVENT missing required fields

- **WHEN** a `VEVENT` block is missing `SUMMARY`, `DTSTART`, or `DTEND`
- **THEN** that block is silently skipped; other valid events in the file are still parsed

---

### Requirement: On-Call Grid Rendering

The system SHALL render an on-call grid with people as rows and calendar days as columns. Each cell SHALL display `8` (hours) when the person is on-call that day, or be empty otherwise.

#### Scenario: On-call day cell rendered

- **WHEN** a person has an on-call entry for a given day
- **THEN** the corresponding cell displays `8` with a blue highlight

#### Scenario: Non-on-call day cell rendered

- **WHEN** a person has no on-call entry for a given day
- **THEN** the cell is empty and unstyled

#### Scenario: Summary columns shown per row

- **WHEN** the grid is rendered
- **THEN** each row includes a `#` column (count of on-call days) and an `Hrs` column (count × 8)

#### Scenario: Summary row shown in header

- **WHEN** the grid is rendered
- **THEN** a "Total" row in the header shows the sum of on-call days and total hours across all people for each month

---

### Requirement: Date Range Filtering

The system SHALL allow users to filter the displayed date range using a from (year-month + day) and to (year-month + day) selector. Only months and days within the selected range SHALL be shown.

#### Scenario: Default date range on load

- **WHEN** a calendar file is first loaded
- **THEN** the default from date is set to the 21st of the previous month and the to date is set to the 20th of the current month

#### Scenario: User changes the from year-month

- **WHEN** the user selects a new from year-month from the dropdown
- **THEN** the grid re-renders showing only data from that month onward (respecting the from-day)

#### Scenario: User changes the to year-month

- **WHEN** the user selects a new to year-month from the dropdown
- **THEN** the grid re-renders showing only data up to and including that month (respecting the to-day)

#### Scenario: From date after to date

- **WHEN** the user sets the from year-month to be after the current to year-month
- **THEN** the to year-month options are filtered so only months >= from year-month are available, preventing an invalid range

---

### Requirement: Person Row Reordering

The system SHALL allow users to reorder person rows via drag-and-drop and via up/down arrow buttons. The reorder MUST be reflected immediately in the grid and in all export outputs.

#### Scenario: Drag-and-drop reorder

- **WHEN** a user drags a person row and drops it onto another person row
- **THEN** the dragged row is inserted at the drop target's position and the grid re-renders with the new order

#### Scenario: Arrow button reorder

- **WHEN** a user clicks the up (▲) arrow on a person row that is not the first row
- **THEN** that row moves one position up in the grid

#### Scenario: Arrow button at boundary

- **WHEN** a user clicks the up (▲) arrow on the first row, or the down (▼) arrow on the last row
- **THEN** the button is visually disabled and no reorder occurs

---

### Requirement: Export — CSV Download

The system SHALL allow users to download the current filtered grid as a CSV file. The filename MUST include the source file's base name and the selected date range.

#### Scenario: Combined CSV export

- **WHEN** the user clicks "Download CSV" in combined mode
- **THEN** a single CSV file is downloaded with a two-row header (month labels + day numbers) and one data row per person, spanning all selected months

#### Scenario: Per-month CSV export

- **WHEN** the user clicks "Download CSV" in per-month mode
- **THEN** a single CSV file is downloaded with each month's data separated by a blank line, each preceded by its month label

#### Scenario: CSV filename format

- **WHEN** a CSV is downloaded
- **THEN** the filename follows the pattern `<baseName>_<fromYM>-<fromDay>_to_<toYM>-<toDay>.csv`

---

### Requirement: Export — Excel Download

The system SHALL allow users to download the current filtered grid as an `.xlsx` file. Sheet naming MUST follow the same combined/per-month toggle as CSV export.

#### Scenario: Combined Excel export

- **WHEN** the user clicks "Download Excel" in combined mode
- **THEN** a single `.xlsx` file is downloaded with one sheet containing all months, using the source file base name (truncated to 31 characters) as the sheet name

#### Scenario: Per-month Excel export

- **WHEN** the user clicks "Download Excel" in per-month mode
- **THEN** a `.xlsx` file is downloaded with one sheet per month, each sheet named after its month label (truncated to 31 characters)

---

### Requirement: Export — Clipboard Copy

The system SHALL allow users to copy the current filtered grid as CSV text to the clipboard.

#### Scenario: Copy to clipboard

- **WHEN** the user clicks the "Copy" button
- **THEN** the CSV content (same format as CSV download) is written to the system clipboard

#### Scenario: Copy confirmation feedback

- **WHEN** the clipboard write succeeds
- **THEN** the button label changes to a confirmation state (e.g., "Copied!") for approximately 2 seconds before reverting

---

### Requirement: Global Export Controls

When two or more calendar sections are loaded, the system SHALL display a global export toolbar that aggregates data from all sections. The global toolbar MUST offer: Download All CSV, Download All Excel, and Copy All CSV.

#### Scenario: Global CSV download with multiple sections

- **WHEN** the user clicks "Download All CSV" and multiple calendar sections are loaded
- **THEN** a single `all_schedules.csv` file is downloaded containing each section's CSV output prefixed with `=== <fileName> ===`, separated by blank lines

#### Scenario: Global Excel download with multiple sections

- **WHEN** the user clicks "Download All Excel" and multiple calendar sections are loaded
- **THEN** a single `all_schedules.xlsx` file is downloaded containing all sheets from all sections; duplicate sheet names are disambiguated with a numeric suffix

#### Scenario: Global copy with multiple sections

- **WHEN** the user clicks "Copy All CSV"
- **THEN** the combined CSV text (same format as global CSV download) is written to the clipboard, and the button shows a confirmation state for ~2 seconds

#### Scenario: Global toolbar hidden with no sections

- **WHEN** no calendar sections are loaded
- **THEN** the global export toolbar is not displayed

---

### Requirement: Statistics Panel

When one or more calendar sections are loaded, the system SHALL display an aggregated statistics table below all calendar sections. The table MUST show each unique person's total on-call days and total hours (days × 8) summed across all loaded sections.

#### Scenario: Statistics panel shown with loaded sections

- **WHEN** one or more calendar sections are loaded
- **THEN** the statistics panel renders a table with columns: Name, Total Days, Total Hours

#### Scenario: Statistics aggregated across multiple sections

- **WHEN** the same person appears in multiple calendar files
- **THEN** their total days and hours in the statistics panel are the sum of their entries across all sections

#### Scenario: Statistics update on section removal

- **WHEN** a calendar section is removed
- **THEN** the statistics panel updates to reflect only the remaining sections

---

### Requirement: Individual Calendar Section Removal

The system SHALL allow users to remove any individual uploaded calendar section from the page without affecting other sections.

#### Scenario: Remove a calendar section

- **WHEN** a user clicks the remove/close control on a calendar section
- **THEN** that section is removed from the page and its data is discarded; all other sections remain unaffected
