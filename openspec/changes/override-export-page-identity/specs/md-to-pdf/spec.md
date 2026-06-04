## MODIFIED Requirements

### Requirement: PDF Export

The tool MUST export the rendered document to PDF using the browser's native print (`window.print()`). An "Export PDF" action MUST clone the rendered preview, scale each Mermaid diagram to fit within a single A4 content box, append the clone to an off-screen `#mdp-fallback` container, and inject a print-only stylesheet that hides the app UI (`#root`) so that only the document prints, at A4 page size with document margins, then call `window.print()`. The tool MUST NOT depend on Paged.js or any client-side pagination library.

#### Scenario: Export action

- **WHEN** the user clicks "Export PDF"
- **THEN** the rendered preview is cloned into an off-screen `#mdp-fallback` container and the browser print dialog opens

#### Scenario: Only the document prints

- **WHEN** the print dialog renders the page
- **THEN** the printable output contains only the rendered Markdown/diagram document — not the sidebar, the source textarea, or the toolbar (the app `#root` is hidden for print)

#### Scenario: Diagrams included in print

- **WHEN** the preview contains rendered Mermaid diagrams at export time
- **THEN** those diagrams appear in the printed/PDF output, each scaled to fit within a single A4 content box

#### Scenario: No pagination dependency

- **WHEN** the app bundle is built
- **THEN** it contains no Paged.js code, because export uses native browser print and Paged.js is no longer a dependency

#### Scenario: Cleanup and stability after printing

- **WHEN** the print dialog is closed (or the export errors)
- **THEN** the off-screen `#mdp-fallback` container and its injected print stylesheet are removed and no runtime error is thrown

---

### Requirement: Print Typography

The exported PDF MUST present consistent, document-style typography regardless of the on-screen preview styling. The export MUST apply a deterministic print-only stylesheet (a `@media print` sheet injected into the document head, scoped to the off-screen `#mdp-fallback` output, using `!important`) that sets body and heading font sizes, line spacing, fonts, and block spacing, and MUST preserve A4 page size with comfortable document margins.

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
- **THEN** the injected print stylesheet is removed from the document head along with the off-screen container, leaving the on-screen app styling unchanged

---

## ADDED Requirements

### Requirement: Export Page Identity

Because export uses native browser print (with no Paged.js `@page` margin boxes), the browser's print dialog controls the saved-PDF filename and any header/footer it stamps. The export MUST override `document.title` and the page URL for the duration of printing and restore both afterward. The title MUST be set to the loaded Markdown file's name with a trailing `.md`/`.markdown` extension removed, falling back to a single space `" "` when no file has been loaded (so the global app title is never shown). The page URL MUST be blanked to a single space `" "`. The override MUST be applied immediately before `window.print()` and the original title and URL MUST be restored on `afterprint`.

#### Scenario: PDF named after the loaded file

- **WHEN** a Markdown file named `roadmap.md` has been loaded and the user exports
- **THEN** `document.title` is set to `roadmap` (the `.md`/`.markdown` extension stripped) so the print dialog's default save filename is `roadmap`

#### Scenario: Title blanked when no file is loaded

- **WHEN** the user exports with no file loaded (the seeded sample or hand-typed source)
- **THEN** `document.title` is set to a single space `" "` so the global "ZUtils" app title is not used as the PDF name or stamped into a browser header

#### Scenario: Page URL blanked during export

- **WHEN** the document prints and the browser stamps a header/footer (the "Headers and footers" print option is enabled)
- **THEN** the page URL has been blanked to `" "` so the app URL is not stamped onto the page

#### Scenario: Title and URL restored after printing

- **WHEN** the print dialog is closed (or the export errors)
- **THEN** the original `document.title` and page URL are restored to their pre-export values

---

### Requirement: Light Export Rendering

The export MUST render the document with a fixed light palette regardless of the active app theme, so the printed PDF is legible on white paper, and MUST force color rendering on so the chosen colors appear in the PDF.

#### Scenario: Export is light regardless of theme

- **WHEN** the app is in dark theme and the document is exported
- **THEN** the printed document uses a light palette (white background, dark text, GitHub-light colors), not the dark page colors

#### Scenario: Colors are not dropped by the print engine

- **WHEN** the document is printed
- **THEN** the print stylesheet sets `print-color-adjust: exact` so the light palette and content colors render rather than being suppressed

---

## REMOVED Requirements

### Requirement: Print Footer

**Reason**: Export no longer uses Paged.js, so the document cannot draw `@page` margin boxes — a custom per-page footer (timestamp + page numbers) is not possible with native browser print, and Chrome cannot render `@page` margin boxes without a pagination library. Suppression of the browser's own header/footer is now handled by the **Export Page Identity** requirement (blanked title/URL) plus the user's print-dialog "Headers and footers" toggle.

### Requirement: Theme-Consistent Export Colors

**Reason**: Export now always renders with a fixed light palette (see **Light Export Rendering**) for print legibility, instead of following the active app theme. The dark-theme export path existed only in the Paged.js flow, which has been removed.
