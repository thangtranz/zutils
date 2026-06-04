## Why

The app currently defaults to **dark** theme for first-time visitors (no `zutils-theme` in `localStorage`). We want the default to be **light** so new users land on the light palette, which reads better in shared/screenshared contexts and matches the more common expectation for a utility site. Returning users with a stored preference are unaffected.

## What Changes

- Change the initial theme used when no preference is stored from `dark` to `light` in `src/ThemeContext.tsx` (the `initial` computation, so first paint sets `data-theme="light"`).
- Align the `ThemeContext` default value (the fallback for components rendered outside a `ThemeProvider`) to `light` for consistency.
- No change to persistence, the toggle control, the design tokens, or any page styling — only the no-preference default flips.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-theme`: The "Theme Persistence" requirement's default-when-no-preference scenario changes from dark to light.

## Impact

- Modified `src/ThemeContext.tsx` — `initial` defaults to `light` when nothing is stored; `createContext` default value set to `light`.
- No change to `src/styles.css` (both `[data-theme="dark"]` and `[data-theme="light"]` token sets already exist and are selected by the `data-theme` attribute).
- Behavior change is visible only to users with no `zutils-theme` value stored (new users or cleared storage). Anyone who has toggled the theme keeps their saved choice.
