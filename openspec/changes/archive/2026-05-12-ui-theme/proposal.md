## Why

The app currently hard-codes dark colors in the sidebar and white in the main content area, giving users no control over visual preference. Adding a global dark/light theme toggle improves usability for users in different lighting environments and brings consistent theming across all util pages.

## What Changes

- Introduce a global `ThemeContext` (React context + provider) exposing the current theme and a toggle function
- Add a theme toggle button in the sidebar nav
- Define CSS custom properties (design tokens) for both dark and light themes applied at the root level
- Migrate `App.tsx` sidebar and main layout inline styles to use the theme tokens
- Migrate `AnsiConverter.tsx` to respect the global theme (background, text, panel, button colors)
- Migrate `PagerDutyCalendar.tsx` to respect the global theme
- Persist the user's theme preference in `localStorage`

## Capabilities

### New Capabilities

- `ui-theme`: Global theme switching between dark and light modes — includes context provider, toggle control, CSS token definitions, and localStorage persistence

### Modified Capabilities

<!-- No spec-level requirement changes to existing capabilities. AnsiConverter and PagerDutyCalendar implementation changes are purely cosmetic (color tokens) with no behavior change. -->

## Impact

- **`src/App.tsx`**: Wraps app in `ThemeProvider`, adds toggle button to sidebar, replaces hard-coded color values with theme tokens
- **`src/AnsiConverter.tsx`**: Replaces hard-coded background/text colors with theme-aware values; exported HTML document keeps its own embedded dark stylesheet (no change to spec behavior)
- **`src/PagerDutyCalendar.tsx`**: Replaces hard-coded colors with theme tokens
- **`src/styles.css`**: Becomes the home for CSS custom property definitions for both themes
- **No API changes, no new dependencies** (uses native React context and CSS custom properties)
