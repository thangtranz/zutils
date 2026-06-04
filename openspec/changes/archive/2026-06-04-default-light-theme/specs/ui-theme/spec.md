## MODIFIED Requirements

### Requirement: Theme Persistence

The selected theme SHALL be persisted in `localStorage` under the key `zutils-theme` so the user's preference survives page refresh. When no preference is stored, the app SHALL default to light theme.

#### Scenario: Theme persists across page reload

- **WHEN** the user sets the theme to dark and reloads the page
- **THEN** the app initializes with dark theme on next load

#### Scenario: Default theme when no preference is stored

- **WHEN** no `zutils-theme` key exists in `localStorage`
- **THEN** the app initializes with light theme

#### Scenario: localStorage write on toggle

- **WHEN** the user toggles the theme
- **THEN** the new value is immediately written to `localStorage`
