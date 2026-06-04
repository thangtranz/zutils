## 1. Default Theme

- [ ] 1.1 In `src/ThemeContext.tsx`, change the `initial` computation to `stored === "dark" ? "dark" : "light"` so no-preference users default to light
- [ ] 1.2 Change the `createContext` default value `theme` from `"dark"` to `"light"` for consistency

## 2. Verification

- [ ] 2.1 With `localStorage` cleared (no `zutils-theme`), load the app and confirm it renders in light theme on first paint with no dark flash
- [ ] 2.2 Set theme to dark via the toggle, reload, and confirm dark persists (explicit preference still honored)
- [ ] 2.3 Set theme to light via the toggle, reload, and confirm light persists
- [ ] 2.4 `npm run build` (or `tsc`) succeeds with no type errors
