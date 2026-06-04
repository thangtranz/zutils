## Context

Theme selection lives in `src/ThemeContext.tsx`. On first render the provider reads `localStorage.getItem("zutils-theme")` and computes an `initial` theme, then synchronously sets `document.documentElement.dataset.theme` so the CSS custom properties resolve on first paint (avoiding a flash). The colors themselves are defined in `src/styles.css` under `[data-theme="dark"]` and `[data-theme="light"]` selectors and are chosen by that attribute — so changing the default is purely about which value `initial` resolves to when nothing is stored.

Today:

```ts
const initial: Theme = stored === "light" ? "light" : "dark";
```

This treats any non-`"light"` stored value (including absent) as dark. We want the opposite default.

## Goals / Non-Goals

**Goals:**

- New users (no stored preference) get light theme on first paint, with no flash.
- Returning users keep whatever they previously selected.

**Non-Goals:**

- Honoring the OS `prefers-color-scheme` (could be a later change; out of scope here).
- Any change to the token palettes, the toggle UI, or page styling.
- Migrating existing stored values.

## Decisions

### Invert the no-preference default

Change the `initial` computation so the stored value is only honored when it is explicitly `"dark"`, otherwise default to `"light"`:

```ts
const initial: Theme = stored === "dark" ? "dark" : "light";
```

This keeps the same shape (a single ternary, set synchronously before paint) and preserves the explicit-stored-preference behavior for both values. An absent or unrecognized value now yields `"light"`.

### Align the createContext default

`createContext<ThemeContextValue>({ theme: "dark", ... })` provides the value only for components rendered outside a `ThemeProvider`. The app always wraps in `ThemeProvider`, so this is a defensive fallback, but set it to `"light"` to match the new default and avoid a misleading constant.

**Alternative considered:** leave `createContext` at `dark`. Rejected — harmless but inconsistent and confusing to future readers.

## Risks / Trade-offs

- **Risk:** none material. The token sets for both themes already exist; only the selected attribute value changes for no-preference users.
- **Trade-off:** users who *liked* the dark default but never explicitly toggled will now see light. Accepted — that is the intent of the change; they can toggle once and it persists.

## Migration Plan

Behavioral, no data or flags. Stored preferences are untouched. Rollback: revert the two-line diff in `src/ThemeContext.tsx`.

## Open Questions

None.
