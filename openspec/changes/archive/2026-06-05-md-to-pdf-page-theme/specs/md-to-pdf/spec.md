## ADDED Requirements

### Requirement: Page Theme Selection

The tool MUST provide a user-facing selector for the rendered document's page theme, with the same shape as the Diagram Theme and Code Theme selectors. The selector MUST offer exactly two choices — **Light** and **Dark** — and MUST default to **Light**. The selected page theme MUST drive the rendered document's page palette in BOTH the on-screen preview and the exported PDF: **Light** renders the GitHub-light palette (white background `#ffffff`, dark text `#1f2328`, and the matching muted/border/code-background/link colors), and **Dark** renders the GitHub-dark palette (background `#0d1117`, light text `#e6edf3`, and the matching dark muted/border/code-background/link colors). The preview MUST therefore be a true WYSIWYG of the export: the export is a snapshot of the preview, so the same page theme governs both with no separate export theming. The page palette MUST be independent of the app theme (the app theme may still style the surrounding app chrome). Both palettes MUST render in the PDF rather than being suppressed by the print engine.

When the Diagram Theme or Code Theme is on "Auto", it MUST resolve against the page theme (Mermaid `dark` / GitHub-dark tokens for a Dark page; Mermaid `default` / GitHub-light tokens for a Light page), so the preview already shows page-correct diagrams and code and the export inherits them unchanged. An explicitly-selected diagram or code theme MUST apply regardless of the page theme.

#### Scenario: Default is Light

- **WHEN** the page theme selector is left at its default
- **THEN** it is set to "Light" and both the preview and the exported PDF render with the GitHub-light palette (white background, dark text), matching the previous always-light export

#### Scenario: Page theme drives the preview

- **WHEN** the user selects "Dark" as the page theme
- **THEN** the on-screen preview document immediately re-renders with the GitHub-dark palette (dark background, light text), and any "Auto" diagrams and code recolor to their dark variants

#### Scenario: Dark page theme exports a dark PDF

- **WHEN** the user selects "Dark" as the page theme and exports
- **THEN** the printed document uses the GitHub-dark palette (dark background, light text), matching what the preview shows

#### Scenario: Page theme is independent of the app theme

- **WHEN** the user toggles the app theme without changing the page theme
- **THEN** the rendered document's palette (preview and export) stays as selected by the page theme

#### Scenario: Selected palette is not dropped by the print engine

- **WHEN** the document is printed with either page theme
- **THEN** the print stylesheet sets `print-color-adjust: exact` so the selected background and text colors render rather than being suppressed

#### Scenario: Auto diagrams follow the page theme

- **WHEN** the Diagram Theme is "Auto" and the user selects the Dark page theme
- **THEN** the preview diagrams render with Mermaid's `dark` theme and the export inherits those dark diagrams; selecting Light renders and exports them with Mermaid's `default` theme

#### Scenario: Explicit diagram theme is unchanged by the page theme

- **WHEN** an explicit Diagram Theme (e.g. `forest`) is selected and the page theme is changed
- **THEN** the diagrams keep the explicitly-selected theme in both the preview and the export

---

## MODIFIED Requirements

### Requirement: Light Export Rendering

The export MUST render the document with the user-selected page palette (see **Page Theme Selection**), defaulting to a light palette so the printed PDF is legible on white paper by default, and MUST force color rendering on so the chosen colors appear in the PDF. Because the export is a snapshot of the preview, the export palette MUST follow the page theme selection only — it MUST NOT follow the app theme.

#### Scenario: Default export is light regardless of app theme

- **WHEN** the page theme is at its default ("Light"), the app is in dark theme, and the document is exported
- **THEN** the printed document uses the light palette (white background, dark text, GitHub-light colors), not the dark app colors

#### Scenario: Export palette follows the page theme, not the app theme

- **WHEN** the document is exported
- **THEN** the printed page palette is determined by the Page Theme selection (Light or Dark), independent of whether the app is in light or dark mode

#### Scenario: Colors are not dropped by the print engine

- **WHEN** the document is printed
- **THEN** the print stylesheet sets `print-color-adjust: exact` so the selected palette and content colors render rather than being suppressed

---

### Requirement: Code Theme Selection

The tool MUST provide a user-facing selector for the syntax-highlighting theme, with the same shape as the Mermaid theme selector. The selector MUST offer an "Auto" choice plus a curated set of named themes (GitHub Light, GitHub Dark, Monokai, Dracula, Nord, Solarized Light, Solarized Dark, Atom One Dark), and MUST default to "Auto". "Auto" MUST adapt to the page theme (see **Page Theme Selection**) — GitHub-light token colors for a Light page and GitHub-dark token colors for a Dark page. An explicitly-selected theme MUST apply regardless of the page theme. The selected theme MUST drive both the preview and the export, the export inheriting the preview's rendered (highlighted) code, so printed code stays legible on the chosen page background. The GitHub Light theme MUST use GitHub's gray code-block background (`#f6f8fa`), matching GitHub.com, rather than pure white.

#### Scenario: GitHub Light uses a gray code background

- **WHEN** the active code theme resolves to GitHub Light (selected explicitly, or via "Auto" on a Light page)
- **THEN** the code block background is GitHub's gray `#f6f8fa`, not pure white

#### Scenario: Default Auto adapts to the page theme

- **WHEN** the code theme selector is left at its default ("Auto") and the page theme is Dark
- **THEN** code tokens render with GitHub-dark colors; on a Light page they render with GitHub-light colors

#### Scenario: Auto re-colors code on page theme change

- **WHEN** the selector is set to "Auto" and the user switches the page theme while highlighted code is shown
- **THEN** the code tokens switch between the GitHub-light and GitHub-dark palettes to match the new page theme

#### Scenario: Explicit selection overrides the page theme

- **WHEN** the user selects an explicit theme (e.g. Dracula)
- **THEN** code renders with that theme's colors regardless of the page theme, and the preview updates immediately

#### Scenario: Explicit selection is not changed by page theme change

- **WHEN** an explicit code theme is selected and the user then switches the page theme
- **THEN** the code theme stays as selected (only the page/prose colors follow the page theme)

#### Scenario: Export uses the selected theme

- **WHEN** a code theme is selected and the document is exported
- **THEN** the exported PDF's code renders with the same theme shown in the preview, because the export inherits the preview's highlighted code
