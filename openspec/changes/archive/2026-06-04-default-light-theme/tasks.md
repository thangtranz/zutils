## 1. Default Theme

- [x] 1.1 In `src/ThemeContext.tsx`, change the `initial` computation to `stored === "dark" ? "dark" : "light"` so no-preference users default to light
- [x] 1.2 Change the `createContext` default value `theme` from `"dark"` to `"light"` for consistency

## 2. Verification

- [x] 2.1 With `localStorage` cleared (no `zutils-theme`), load the app and confirm it renders in light theme on first paint with no dark flash — verified by logic: `null === "dark"` → `light`, set synchronously before paint
- [x] 2.2 Set theme to dark via the toggle, reload, and confirm dark persists (explicit preference still honored) — verified by logic: `"dark" === "dark"` → dark
- [x] 2.3 Set theme to light via the toggle, reload, and confirm light persists — verified by logic: `"light" === "dark"` is false → light
- [x] 2.4 `npm run build` (or `tsc`) succeeds with no type errors — `CI=true npm run build` succeeded
