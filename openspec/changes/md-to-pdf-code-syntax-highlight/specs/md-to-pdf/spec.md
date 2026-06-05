## ADDED Requirements

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

The tool MUST provide a user-facing selector for the syntax-highlighting theme, with the same shape as the Mermaid theme selector. The selector MUST offer an "Auto" choice plus a curated set of named themes (GitHub Light, GitHub Dark, Monokai, Dracula, Nord, Solarized Light, Solarized Dark, Atom One Dark), and MUST default to "Auto". "Auto" MUST adapt to the app theme — GitHub-light token colors in light mode and GitHub-dark token colors in dark mode. An explicitly-selected theme MUST apply regardless of the app theme. The selected theme MUST drive both the preview and the export, the export inheriting the preview's rendered (highlighted) code. Under "Auto", the exported PDF MUST use the GitHub-light palette so printed code stays legible on the always-light export page.

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
