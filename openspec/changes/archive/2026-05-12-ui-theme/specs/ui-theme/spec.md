## ADDED Requirements

### Requirement: Global Theme Context

The app SHALL provide a React context (`ThemeContext`) that makes the current theme value (`"dark"` | `"light"`) and a toggle function available to all components.

#### Scenario: Theme context is available to all components

- **WHEN** any component in the app renders
- **THEN** it can access the current theme via `useTheme()` without prop-drilling

#### Scenario: Theme provider wraps the app root

- **WHEN** the app mounts
- **THEN** `ThemeProvider` is the outermost wrapper so every page and component inherits the theme

---

### Requirement: Theme Persistence

The selected theme SHALL be persisted in `localStorage` under the key `zutils-theme` so the user's preference survives page refresh.

#### Scenario: Theme persists across page reload

- **WHEN** the user sets the theme to light and reloads the page
- **THEN** the app initializes with light theme on next load

#### Scenario: Default theme when no preference is stored

- **WHEN** no `zutils-theme` key exists in `localStorage`
- **THEN** the app initializes with dark theme

#### Scenario: localStorage write on toggle

- **WHEN** the user toggles the theme
- **THEN** the new value is immediately written to `localStorage`

---

### Requirement: Theme Toggle Control

The sidebar SHALL contain a toggle button that switches between dark and light theme.

#### Scenario: Toggle button visible in sidebar

- **WHEN** the app is open
- **THEN** a theme toggle button is visible in the sidebar nav area

#### Scenario: Toggle switches theme

- **WHEN** the user clicks the toggle button
- **THEN** the global theme switches from dark to light, or light to dark

#### Scenario: Toggle button reflects current theme

- **WHEN** dark theme is active
- **THEN** the button shows a moon icon and "Dark mode" label (reflecting the current selection)
- **WHEN** light theme is active
- **THEN** the button shows a sun icon and "Light mode" label (reflecting the current selection)

---

### Requirement: CSS Design Tokens

The app SHALL define all theme-variant colors as CSS custom properties on the root element, so components can reference tokens without branching on the theme value.

#### Scenario: Dark tokens applied when theme is dark

- **WHEN** `document.documentElement` has `data-theme="dark"`
- **THEN** all CSS custom properties resolve to their dark values

#### Scenario: Light tokens applied when theme is light

- **WHEN** `document.documentElement` has `data-theme="light"`
- **THEN** all CSS custom properties resolve to their light values

#### Scenario: Token set covers all pages

- **WHEN** either theme is active
- **THEN** the following tokens are defined and non-empty:
  `--bg-main`, `--bg-panel`, `--bg-panel-secondary`,
  `--text-primary`, `--text-secondary`, `--text-muted`,
  `--border-color`, `--btn-bg`, `--btn-bg-primary`, `--btn-text`

---

### Requirement: Pages Follow Global Theme

All util pages (PagerDutyCalendar, AnsiConverter) SHALL visually adapt to the active theme without requiring individual theme state.

#### Scenario: AnsiConverter uses theme tokens for panel backgrounds

- **WHEN** light theme is active
- **THEN** the AnsiConverter input and output panels use light background colors from theme tokens
- **WHEN** dark theme is active
- **THEN** the AnsiConverter input and output panels use dark background colors from theme tokens

#### Scenario: AnsiConverter ANSI color rendering is unaffected by theme

- **WHEN** either theme is active
- **THEN** the ANSI escape sequence color map values (e.g. `#f47067` for red, `#57c96b` for green) remain unchanged
- **AND** colorized text renders identically in both themes

#### Scenario: PagerDutyCalendar uses theme tokens for backgrounds and text

- **WHEN** light theme is active
- **THEN** the calendar page background, text, and panel colors use light theme tokens
- **WHEN** dark theme is active
- **THEN** the calendar page background, text, and panel colors use dark theme tokens

#### Scenario: Sidebar follows the active theme

- **WHEN** dark theme is active
- **THEN** the sidebar background uses the dark palette (`--bg-sidebar`, `--bg-sidebar-active`)
- **WHEN** light theme is active
- **THEN** the sidebar background uses the light palette (`--bg-sidebar`, `--bg-sidebar-active`)

---

### Requirement: Exported HTML Document Is Theme-Independent

The HTML document produced by AnsiConverter's Copy HTML and Export actions SHALL retain its own embedded dark stylesheet, regardless of the active app theme.

#### Scenario: Export always uses dark theme

- **WHEN** the user exports or copies HTML while light theme is active
- **THEN** the exported document still includes the dark-background embedded stylesheet (`background: #0d1117`, foreground `#c9d1d9`)
