## MODIFIED Requirements

### Requirement: Theme Integration

The tool MUST follow the app theme from `ThemeContext` for page styling, which MUST use the existing CSS variables. The Mermaid diagram theme MUST follow the app theme by default (`dark` when the app theme is dark, `default` otherwise), but the tool MUST provide a user-facing selector that, when set to an explicit theme, overrides the app-derived theme for diagram rendering. The selector MUST offer an "Auto" choice (follow the app theme) plus Mermaid's built-in themes (`default`, `dark`, `forest`, `neutral`, `base`), and MUST default to "Auto". The selected theme MUST drive both the preview and the export (the export inherits the preview's rendered diagrams).

#### Scenario: Default follows app theme

- **WHEN** the theme selector is left at its default ("Auto") and the app theme is dark
- **THEN** the preview uses dark page styling and diagrams render with Mermaid's `dark` theme; in light mode they render with `default`

#### Scenario: Theme toggle re-colors diagrams in Auto

- **WHEN** the selector is set to "Auto" and the user toggles the app theme while a diagram is shown
- **THEN** the diagram re-renders with the matching Mermaid theme without requiring a manual re-render

#### Scenario: Explicit selection overrides the app theme

- **WHEN** the user selects an explicit Mermaid theme (e.g. `forest`)
- **THEN** diagrams render with that theme regardless of the app theme, and the preview updates immediately

#### Scenario: Explicit selection is not changed by app theme toggle

- **WHEN** an explicit Mermaid theme is selected and the user then toggles the app theme
- **THEN** the diagram theme stays as selected (only the page/prose colors follow the app theme)

#### Scenario: Export uses the selected theme

- **WHEN** a Mermaid theme is selected and the document is exported
- **THEN** the exported PDF's diagrams render with the selected theme, because the export inherits the preview's rendered diagrams
