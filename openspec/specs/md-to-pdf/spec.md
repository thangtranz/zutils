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

### Requirement: Code Syntax Highlighting

The tool MUST syntax-highlight non-Mermaid fenced code blocks in the rendered preview, using the language hint from the fence (e.g. ` ```ts `, ` ```python `, ` ```bash `). Highlighting MUST tokenize the code into colored spans without altering the code text. A code block with no language hint, or an unrecognized language, MUST fall back to plain monospace rendering with no error and no broken markup. Mermaid fenced blocks MUST continue to render as diagrams and MUST NOT be highlighted. The selected code theme (see **Code Theme Selection**) governs the token colors.

#### Scenario: Recognized language is highlighted in the preview

- **WHEN** the source contains a fenced block tagged with a recognized language (e.g. ` ```ts `)
- **THEN** the preview renders the code with per-token coloring (keywords, strings, comments, etc.), not flat single-color text

#### Scenario: Unknown or missing language falls back gracefully

- **WHEN** a fenced block has no language hint or an unrecognized one
- **THEN** the block renders as plain monospace code (today's behavior) with no thrown error and no broken markup

#### Scenario: Mermaid blocks are not highlighted

- **WHEN** the source contains a ` ```mermaid ` fenced block
- **THEN** it renders as a Mermaid diagram as before and the syntax highlighter does not touch it

#### Scenario: Highlight failure does not break the preview

- **WHEN** highlighting a single block throws
- **THEN** that block falls back to plain monospace and the rest of the preview renders normally

---

### Requirement: Code Theme Selection

The tool MUST provide a user-facing selector for the syntax-highlighting theme, with the same shape as the Mermaid theme selector. The selector MUST offer an "Auto" choice plus a curated set of named themes (GitHub Light, GitHub Dark, Monokai, Dracula, Nord, Solarized Light, Solarized Dark, Atom One Dark), and MUST default to "Auto". "Auto" MUST adapt to the app theme — GitHub-light token colors in light mode and GitHub-dark token colors in dark mode. An explicitly-selected theme MUST apply regardless of the app theme. The selected theme MUST drive both the preview and the export, the export inheriting the preview's rendered (highlighted) code. Under "Auto", the exported PDF MUST use the GitHub-light palette so printed code stays legible on the always-light export page. The GitHub Light theme MUST use GitHub's gray code-block background (`#f6f8fa`), matching GitHub.com, rather than pure white.

#### Scenario: GitHub Light uses a gray code background

- **WHEN** the active code theme resolves to GitHub Light (selected explicitly, or via "Auto" in light mode)
- **THEN** the code block background is GitHub's gray `#f6f8fa`, not pure white

#### Scenario: Default Auto adapts to the app theme

- **WHEN** the code theme selector is left at its default ("Auto") and the app theme is dark
- **THEN** code tokens render with GitHub-dark colors; in light mode they render with GitHub-light colors

#### Scenario: Auto re-colors code on app theme toggle

- **WHEN** the selector is set to "Auto" and the user toggles the app theme while highlighted code is shown
- **THEN** the code tokens switch between the GitHub-light and GitHub-dark palettes to match the new app theme

#### Scenario: Explicit selection overrides the app theme

- **WHEN** the user selects an explicit theme (e.g. Dracula)
- **THEN** code renders with that theme's colors regardless of the app theme, and the preview updates immediately

#### Scenario: Explicit selection is not changed by app theme toggle

- **WHEN** an explicit code theme is selected and the user then toggles the app theme
- **THEN** the code theme stays as selected (only the page/prose colors follow the app theme)

#### Scenario: Export uses the selected theme

- **WHEN** an explicit code theme is selected and the document is exported
- **THEN** the exported PDF's code renders with the selected theme, because the export inherits the preview's highlighted code

#### Scenario: Auto exports light

- **WHEN** the selector is "Auto", the app is in dark theme, and the document is exported
- **THEN** the printed code uses the GitHub-light token palette (legible on the white print page), not the dark preview token colors

---

### Requirement: Code Line Numbers

Each rendered non-Mermaid code block MUST display a line-number gutter in both the preview and the exported PDF, with one number per code line aligned to that line. The gutter MUST be added independently of syntax highlighting, so a block with an unknown or missing language still shows line numbers. The gutter digits MUST be excluded from text selection (so copying the block yields only the code, not the numbers), and MUST NOT be added to Mermaid diagram blocks. The gutter MUST use the active code theme's text color so it stays legible on that theme's background.

#### Scenario: Line numbers in the preview

- **WHEN** a fenced code block is rendered
- **THEN** a gutter to the left of the code shows sequential line numbers, one per line, aligned to the code lines

#### Scenario: Line numbers independent of highlighting

- **WHEN** a code block has no language hint or an unrecognized one (so it is not token-highlighted)
- **THEN** it still shows a line-number gutter

#### Scenario: Line numbers in the exported PDF

- **WHEN** a document containing code blocks is exported
- **THEN** the printed code blocks include their line-number gutters

#### Scenario: Numbers are not part of the copied text

- **WHEN** the user selects and copies a code block in the preview
- **THEN** the copied text contains only the code, not the line numbers

#### Scenario: No gutter on Mermaid blocks

- **WHEN** the source contains a ` ```mermaid ` block
- **THEN** it renders as a diagram with no line-number gutter

---

## REMOVED Requirements

### Requirement: Print Footer

**Reason**: Export no longer uses Paged.js, so the document cannot draw `@page` margin boxes — a custom per-page footer (timestamp + page numbers) is not possible with native browser print, and Chrome cannot render `@page` margin boxes without a pagination library. Suppression of the browser's own header/footer is now handled by the **Export Page Identity** requirement (blanked title/URL) plus the user's print-dialog "Headers and footers" toggle.

### Requirement: Theme-Consistent Export Colors

**Reason**: Export now always renders with a fixed light palette (see **Light Export Rendering**) for print legibility, instead of following the active app theme. The dark-theme export path existed only in the Paged.js flow, which has been removed.
