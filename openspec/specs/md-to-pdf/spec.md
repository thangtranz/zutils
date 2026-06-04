# MdToPdf Specification

## Purpose

MdToPdf is a fully client-side zutils tool for turning Markdown — including Mermaid diagrams — into a shareable PDF. Users write or load Markdown on the left and see a GitHub-styled preview on the right; fenced ```mermaid``` blocks render as diagrams. Export goes through the browser's native print-to-PDF, so the feature works on the deployed static site with no backend.

---

## Requirements

### Requirement: Tab Integration

The Markdown-to-PDF tool MUST be a React component reachable from the zutils sidebar as a nav entry, rendered in the main content area like the other tools.

#### Scenario: Nav entry present

- **WHEN** the app loads
- **THEN** the sidebar shows a "Markdown to PDF" entry alongside PagerDuty, ANSI, and SQS

#### Scenario: Selecting the tab

- **WHEN** the user clicks the "Markdown to PDF" nav entry
- **THEN** the main area renders the Markdown-to-PDF tool and the entry is shown as active

---

### Requirement: Markdown Source Input

The tool MUST provide a left-pane textarea for Markdown source and a control to load a `.md`/`.markdown` file into it, mirroring the ANSI Converter layout.

#### Scenario: Manual editing

- **WHEN** the user types or pastes Markdown into the textarea
- **THEN** the preview pane updates to reflect the new source

#### Scenario: Load a file

- **WHEN** the user loads a `.md` or `.markdown` file
- **THEN** the file's text replaces the textarea content and the preview re-renders

#### Scenario: Seeded sample

- **WHEN** the tool first opens with no user input
- **THEN** a bundled sample document (with headings, a table, a code block, and a Mermaid diagram) is shown so the tool is self-demonstrating

---

### Requirement: Markdown Rendering

The tool MUST render the Markdown source to HTML using `marked`, applying GitHub-style styling for headings, code, tables, blockquotes, links, and horizontal rules, displayed in the right-pane preview.

#### Scenario: Standard Markdown renders

- **WHEN** the source contains headings, lists, tables, inline code, and fenced code blocks
- **THEN** the preview shows the corresponding styled HTML elements

#### Scenario: Non-mermaid fenced code block

- **WHEN** a fenced code block has a language other than `mermaid` (or none)
- **THEN** it renders as a normal preformatted code block, not as a diagram

---

### Requirement: Mermaid Diagram Rendering

The tool MUST render fenced ```mermaid``` blocks as diagrams in the preview. The custom renderer MUST emit `<pre class="mermaid">` with the diagram source HTML-escaped, and `mermaid` MUST be initialized with `startOnLoad: false` and run after the preview HTML is committed.

#### Scenario: Mermaid block becomes a diagram

- **WHEN** the source contains a fenced block tagged `mermaid` with valid syntax
- **THEN** the preview shows the rendered SVG diagram in place of the code block

#### Scenario: Source is HTML-escaped before injection

- **WHEN** the mermaid block body contains `<` or `>` characters
- **THEN** they are escaped (`&lt;`/`&gt;`) in the injected element so the source is not interpreted as HTML

#### Scenario: Invalid diagram syntax

- **WHEN** a mermaid block contains invalid syntax
- **THEN** an inline error is shown in that diagram's place and the rest of the preview still renders

#### Scenario: Lazy load

- **WHEN** the user has not yet opened the Markdown-to-PDF tab
- **THEN** the `mermaid` library is not part of the initial bundle chunk and is loaded on demand when first needed

---

### Requirement: Theme Integration

The tool MUST follow the app theme from `ThemeContext`. Page styling MUST use the existing CSS variables, and the Mermaid theme MUST be `dark` when the app theme is dark and `default` otherwise.

#### Scenario: Dark theme

- **WHEN** the app theme is dark
- **THEN** the preview uses dark styling and diagrams render with Mermaid's `dark` theme

#### Scenario: Theme toggle re-colors diagrams

- **WHEN** the user toggles the theme while a diagram is shown
- **THEN** the diagram re-renders with the matching Mermaid theme without requiring a manual re-render

---

### Requirement: PDF Export

The tool MUST export the rendered document to PDF using the browser's native print-to-PDF. An "Export PDF" action MUST trigger `window.print()`, and a print-scoped stylesheet MUST print only the rendered preview (hiding sidebar, input pane, and toolbar) with A4 page size and document margins.

#### Scenario: Export action

- **WHEN** the user clicks "Export PDF"
- **THEN** the browser print dialog opens

#### Scenario: Only the document prints

- **WHEN** the print dialog renders the page
- **THEN** the printable output contains only the rendered Markdown/diagram preview — not the sidebar, the source textarea, or the toolbar

#### Scenario: Diagrams included in print

- **WHEN** the preview contains rendered Mermaid diagrams at print time
- **THEN** those diagrams appear in the printed/PDF output

---

### Requirement: Client-Side Only

The tool MUST operate entirely in the browser with no backend or `puppeteer` dependency, and MUST ship with the existing GitHub-Pages build.

#### Scenario: No server required

- **WHEN** the static site is served (e.g., from GitHub Pages) with no local server running
- **THEN** the Markdown-to-PDF tool is fully functional (render, preview, export)
