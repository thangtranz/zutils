# AnsiConverter Specification

## Purpose

AnsiConverter is a browser-based tool for converting raw ANSI-escaped console log output into readable, syntax-highlighted HTML. Users paste or load log text on the left; rendered color output appears on the right with export options. A stats bar gives an at-a-glance health summary of the log.

---

## Requirements

### Requirement: ANSI-to-HTML Conversion

The converter MUST parse ANSI SGR escape sequences and render them as inline-styled HTML `<span>` elements with the appropriate color.

#### Scenario: Escape sequence with known color code

- **WHEN** the input contains an ANSI sequence matching the pattern `\x1b?[<code>m` where `<code>` is a known color code
- **THEN** the output wraps the following text in `<span style="color:<hex>">` until the next reset

#### Scenario: Reset sequence

- **WHEN** the converter encounters `[0m` or `[m`
- **THEN** all open `<span>` tags are closed

#### Scenario: Unknown or unrecognized escape code

- **WHEN** an escape sequence carries a code not in the color map
- **THEN** the sequence is silently ignored and the surrounding text is preserved uncolored

#### Scenario: Special characters in log text

- **WHEN** the raw text contains `&`, `<`, `>`, or `"`
- **THEN** they are HTML-escaped (`&amp;`, `&lt;`, `&gt;`, `&quot;`) before insertion into the output

---

### Requirement: Color Map

The following ANSI codes MUST map to their corresponding hex colors:

| Code | Color | Semantic use |
| --- | --- | --- |
| `30` | `#1e1e1e` | Black |
| `31` | `#f47067` | Red — ERROR / FAIL |
| `32` | `#57c96b` | Green — received / success |
| `33` | `#e8a243` | Yellow — WARNING |
| `34` | `#569cd6` | Blue — INFO |
| `35` | `#c586c0` | Magenta — deleted |
| `36` | `#4fc1ff` | Cyan — scenario / poll |
| `37` | `#cccccc` | White — loader |
| `90` | `#6e7681` | Bright black (dark gray) |
| `2;37` | `#8b949e` | Dim white — detail / JSON |

---

### Requirement: Input Pane

The left pane provides a textarea for raw ANSI log input and controls for loading text.

#### Scenario: Manual paste via textarea

- **WHEN** the user types or pastes text directly into the textarea
- **THEN** the input state updates immediately and the stats bar recalculates

#### Scenario: Paste from clipboard button

- **WHEN** the user clicks **Paste**
- **THEN** the browser Clipboard API is used to read text and populate the textarea
- **AND** if clipboard access is denied, a warning toast `⚠ Clipboard access denied — paste manually` is shown in amber

#### Scenario: Clear button

- **WHEN** the user clicks **Clear**
- **THEN** the input, output, and all stats are reset to their empty state

#### Scenario: Load sample

- **WHEN** the user clicks **Load sample**
- **THEN** a predefined multi-scenario ANSI log is loaded into the input pane and conversion begins

---

### Requirement: Output Pane

The right pane renders the converted HTML and offers export actions.

#### Scenario: Empty state

- **WHEN** no conversion has been run yet
- **THEN** the output pane shows an empty-state placeholder instructing the user to convert

#### Scenario: Rendered output

- **WHEN** a conversion completes
- **THEN** the output pane renders the colorized HTML inside a `<pre>` block with `white-space: pre-wrap`

#### Scenario: Copy HTML button

- **WHEN** the user clicks **Copy HTML**
- **THEN** a full standalone HTML document (with embedded dark-theme stylesheet) is copied to the clipboard
- **AND** a success toast `✓ HTML copied to clipboard` is shown

#### Scenario: Export button

- **WHEN** the user clicks **Export ↓**
- **THEN** a full standalone HTML file is downloaded with filename `console-log-<timestamp>.html`
- **AND** a success toast `✓ File downloaded` is shown

#### Scenario: Copy / Export disabled

- **WHEN** there is no rendered output
- **THEN** **Copy HTML** and **Export ↓** are disabled

---

### Requirement: Debounced Auto-Conversion

The converter MUST automatically convert input after a short idle period to avoid expensive re-renders on every keystroke.

#### Scenario: Auto-convert after typing pause

- **WHEN** the user stops editing the input for 400 ms
- **THEN** conversion runs automatically without requiring a button press

#### Scenario: Manual convert

- **WHEN** the user clicks **Convert ↵** or presses `Ctrl+Enter` / `Cmd+Enter`
- **THEN** conversion runs immediately regardless of the debounce timer

---

### Requirement: Stats Bar

The stats bar MUST display real-time summary counts for the raw input text. It updates on every input change, not only after conversion.

#### Scenario: Line count

- **WHEN** the input contains text
- **THEN** the stats bar shows the total number of newline-separated lines

#### Scenario: Error count

- **WHEN** the input contains `[31m` escape sequences
- **THEN** the stats bar shows an "errors" count equal to the number of `[31m` occurrences

#### Scenario: Warn count

- **WHEN** the input contains `[33m` escape sequences
- **THEN** the stats bar shows a "warns" count equal to the number of `[33m` occurrences

#### Scenario: Info count

- **WHEN** the input contains `[34m` escape sequences
- **THEN** the stats bar shows an "info" count equal to the number of `[34m` occurrences

#### Scenario: Size display

- **WHEN** the input is less than 1024 bytes
- **THEN** size is shown in bytes (e.g. `512 B`)
- **WHEN** the input is 1024 bytes or more
- **THEN** size is shown in kilobytes rounded to one decimal (e.g. `4.2 KB`)

#### Scenario: Empty input

- **WHEN** the input is empty
- **THEN** all stat counts display `0` and size displays `0 B`

---

### Requirement: Drag-and-Drop File Loading

The tool MUST accept log files dropped anywhere on the converter surface.

#### Scenario: File dropped onto converter

- **WHEN** a user drags a file over the converter area
- **THEN** a drop overlay `Drop log file here` is displayed
- **AND WHEN** the file is released
- **THEN** the file is read as UTF-8 text and loaded into the input pane
- **AND** a toast `✓ Loaded: <filename>` is shown

#### Scenario: Drag leaves the converter area

- **WHEN** the drag leaves the converter's bounding box
- **THEN** the drop overlay is hidden

---

### Requirement: Toast Notifications

The tool MUST surface brief non-blocking feedback messages.

#### Scenario: Toast display

- **WHEN** a toastable action completes (paste, copy, export, file load, clipboard error)
- **THEN** a toast notification appears with an appropriate message and color
- **AND** the toast auto-dismisses after 2200 ms

#### Scenario: Toast replacement

- **WHEN** a second toastable action fires before the first toast has dismissed
- **THEN** the first toast is replaced by the new one and the 2200 ms timer resets

---

### Requirement: Exported HTML Document

Both **Copy HTML** and **Export ↓** MUST produce a fully self-contained HTML document.

#### Scenario: Exported document structure

- **WHEN** an export is triggered
- **THEN** the document includes:
  - `<!DOCTYPE html>` declaration
  - `<meta charset="UTF-8">`
  - A `<title>` of `Console Log — <YYYY-MM-DD HH:MM>` (UTC, ISO format truncated to minute)
  - Embedded `<style>` with dark background (`#0d1117`), light foreground (`#c9d1d9`), monospace font stack, `font-size: 12.5px`, `line-height: 1.7`
  - The colorized log wrapped in `<div class="log">` with `white-space: pre-wrap`
