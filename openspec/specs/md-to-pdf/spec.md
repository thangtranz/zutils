# MdToPdf Specification

## Purpose

MdToPdf is a fully client-side zutils tool for turning Markdown — including Mermaid diagrams — into a shareable PDF. Users write or load Markdown on the left and see a GitHub-styled preview on the right; fenced ```mermaid``` blocks render as diagrams. Export paginates the rendered preview client-side with Paged.js (lazy-loaded) and prints the paginated output — adding a custom footer (timestamp + page numbers) and deterministic typography — so the feature works on the deployed static site with no backend.

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

The tool MUST export the rendered document to PDF by paginating the rendered preview with Paged.js and printing the paginated output. An "Export PDF" action MUST paginate a clone of the rendered preview into an off-screen target, then trigger `window.print()`; on print, the app UI MUST be hidden so that only the paginated document prints, at A4 page size with document margins. Paged.js MUST be lazy-loaded (dynamic import) so it does not enter the initial bundle.

#### Scenario: Export action

- **WHEN** the user clicks "Export PDF"
- **THEN** the rendered preview is paginated into an off-screen `#mdp-paged` target and the browser print dialog opens

#### Scenario: Only the document prints

- **WHEN** the print dialog renders the page
- **THEN** the printable output contains only the paginated Markdown/diagram document — not the sidebar, the source textarea, or the toolbar

#### Scenario: Diagrams included in print

- **WHEN** the preview contains rendered Mermaid diagrams at export time
- **THEN** those diagrams appear in the printed/PDF output

#### Scenario: Lazy load

- **WHEN** the user has not triggered an export
- **THEN** the Paged.js library is not part of the initial bundle chunk and is loaded on demand on first export

#### Scenario: Cleanup and stability after printing

- **WHEN** the print dialog is closed (or the export errors)
- **THEN** the off-screen `#mdp-paged` target is removed and no runtime error is thrown (Paged.js page resize observers are disconnected after pagination so the post-print reflow does not re-run layout)

---

### Requirement: Print Footer

The exported PDF MUST show a custom footer on every page, rendered via `@page` margin boxes, and MUST NOT show the browser's default print header or footer (page title, date, or URL).

#### Scenario: Export timestamp bottom-left

- **WHEN** a document is exported
- **THEN** the bottom-left of every page shows the export timestamp in local time formatted as `YYYY-MM-DD HH:MM`

#### Scenario: Page numbers bottom-right

- **WHEN** a document is exported
- **THEN** the bottom-right of every page shows `Page X of Y`, where `X` is the current page and `Y` is the total page count

#### Scenario: No browser-injected header/footer

- **WHEN** the document prints
- **THEN** no browser-drawn header or footer (document title, date, or page URL) appears, because Paged.js controls the page boxes

---

### Requirement: Theme-Consistent Export Colors

The exported PDF MUST use the active theme's colors. The page background and footer text color MUST follow the current theme palette, and color rendering MUST be forced on so the chosen colors appear in the PDF.

#### Scenario: Colors follow theme

- **WHEN** the app is in dark theme and the document is exported
- **THEN** the page background uses the dark palette background and the footer uses the dark palette muted color

#### Scenario: Colors are not dropped by the print engine

- **WHEN** the document is printed
- **THEN** the content sets `print-color-adjust: exact` so theme background and colors render rather than being suppressed

---

### Requirement: Print Typography

The exported PDF MUST present consistent, document-style typography regardless of the on-screen preview styling. The export MUST apply a deterministic print-only stylesheet (a `@media print` sheet injected into the document head, scoped to the paginated `#mdp-paged` output, using `!important`) that sets body and heading font sizes, line spacing, fonts, and block spacing, and MUST preserve A4 page size with comfortable document margins.

#### Scenario: Body text and line spacing

- **WHEN** a document is exported
- **THEN** body text renders at a fixed body size (14px) with 1.6 line spacing

#### Scenario: Heading hierarchy

- **WHEN** a document containing headings is exported
- **THEN** headings render at a descending size scale (h1 largest through h4) with tighter heading line spacing, so the hierarchy is visually distinct from body text

#### Scenario: Sans-serif text, monospace code

- **WHEN** a document containing prose and code is exported
- **THEN** prose renders in a sans-serif font and inline/block code renders in a monospace font

#### Scenario: Mermaid diagram fonts preserved

- **WHEN** a document containing rendered Mermaid diagrams is exported
- **THEN** the global font/line-spacing overrides do not reach the diagram SVGs, so diagram labels keep the font they were measured with and do not overflow their shapes

#### Scenario: Block spacing

- **WHEN** a document is exported
- **THEN** paragraphs, list items, and blockquotes use compact, even vertical spacing (no large top margins) so blocks read as a continuous document

#### Scenario: Overrides removed after export

- **WHEN** the print dialog is closed (or the export errors)
- **THEN** the injected print stylesheet is removed from the document head along with the off-screen target, leaving the on-screen app styling unchanged

---

### Requirement: Client-Side Only

The tool MUST operate entirely in the browser with no backend or `puppeteer` dependency, and MUST ship with the existing GitHub-Pages build.

#### Scenario: No server required

- **WHEN** the static site is served (e.g., from GitHub Pages) with no local server running
- **THEN** the Markdown-to-PDF tool is fully functional (render, preview, export)
