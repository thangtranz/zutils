## 1. CSS Design Tokens

- [x] 1.1 Add `[data-theme="dark"]` CSS custom property block to `src/styles.css` with all tokens from the design token table
- [x] 1.2 Add `[data-theme="light"]` CSS custom property block to `src/styles.css` with light values for all tokens

## 2. Theme Context

- [x] 2.1 Create `src/ThemeContext.tsx` exporting `ThemeProvider`, `useTheme` hook, and `Theme` type (`"dark" | "light"`)
- [x] 2.2 In `ThemeProvider`, read initial theme from `localStorage` key `zutils-theme`, default to `"dark"`
- [x] 2.3 In `ThemeProvider`, apply `document.documentElement.dataset.theme` on mount and on every toggle
- [x] 2.4 In `ThemeProvider`, write new theme value to `localStorage` on every toggle

## 3. App Layout — Theme Integration

- [x] 3.1 Wrap `<App />` with `<ThemeProvider>` in `src/index.tsx`
- [x] 3.2 Replace hard-coded sidebar background color in `App.tsx` with `var(--bg-sidebar)`
- [x] 3.3 Replace hard-coded active nav item background in `App.tsx` with `var(--bg-sidebar-active)`
- [x] 3.4 Replace hard-coded nav item text colors in `App.tsx` with `var(--text-primary)` / `var(--text-secondary)`
- [x] 3.5 Replace hard-coded main content background in `App.tsx` with `var(--bg-main)`
- [x] 3.6 Add a theme toggle button at the bottom of the sidebar in `App.tsx`; button shows sun icon when dark, moon icon when light
- [x] 3.7 Wire toggle button to `useTheme().toggleTheme`

## 4. AnsiConverter — Theme Integration

- [x] 4.1 Replace hard-coded panel background colors in `AnsiConverter.tsx` with `var(--bg-panel)` and `var(--bg-panel-secondary)`
- [x] 4.2 Replace hard-coded text colors in `AnsiConverter.tsx` with `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- [x] 4.3 Replace hard-coded button background/text colors in `AnsiConverter.tsx` with `var(--btn-bg)` and `var(--btn-text)`
- [x] 4.4 Replace hard-coded border colors in `AnsiConverter.tsx` with `var(--border-color)`
- [x] 4.5 Migrate hard-coded background/text rules from `AnsiConverter.css` to use CSS custom properties (or remove them in favour of inline token references)
- [x] 4.6 Verify the ANSI color map constants in `AnsiConverter.tsx` are unchanged (no theme tokens applied to ANSI rendering colors)
- [x] 4.7 Verify the exported HTML document still embeds the dark stylesheet (`#0d1117` background) regardless of active theme

## 5. PagerDutyCalendar — Theme Integration

- [x] 5.1 Identify all hard-coded color values in `PagerDutyCalendar.tsx`
- [x] 5.2 Replace hard-coded background colors with appropriate theme tokens (`var(--bg-panel)`, `var(--bg-main)`)
- [x] 5.3 Replace hard-coded text colors with `var(--text-primary)` / `var(--text-secondary)` / `var(--text-muted)`
- [x] 5.4 Replace hard-coded border and button colors with `var(--border-color)`, `var(--btn-bg)`, `var(--btn-text)`

## 6. Verification

- [x] 6.1 Manually toggle between dark and light theme and confirm sidebar, AnsiConverter, and PagerDutyCalendar all update
- [x] 6.2 Reload the page after switching to light theme and confirm it initializes in light theme
- [x] 6.3 Reload with no `zutils-theme` in localStorage and confirm dark theme is the default
- [x] 6.4 Export / copy HTML from AnsiConverter while in light theme and confirm the embedded stylesheet is still dark

## 7. Bug Fixes & Polish (post-verify)

- [x] 7.1 Fix dark mode not applying on first paint: set `document.documentElement.dataset.theme` synchronously in the `useState` initializer in `ThemeContext.tsx` (not only in `useEffect`)
- [x] 7.2 Fix `AnsiConverter.css` textarea using hard-coded `#8b949e` — replace with `var(--text-secondary)` so it adapts to light theme
- [x] 7.3 Fix `AnsiConverter.css` `.ansi-btn.danger-btn` / `.ansi-btn.copy-btn` border and hover backgrounds using hard-coded dark hex values — replace with semi-transparent tints of the semantic danger/success colors so they work in both themes
- [x] 7.4 Fix `App.tsx` theme toggle `borderTop` using hard-coded `#2d3748` — replace with `var(--bg-sidebar-active)` token
- [x] 7.5 Correct `design.md` token table dark column
- [x] 7.6 Fix root bug: `styles.css` was never imported
- [x] 7.7 Make sidebar follow the active theme
- [x] 7.8 Change theme toggle button label to reflect the current selection: dark mode shows "🌙 Dark mode", light mode shows "☀ Light mode" — update `App.tsx` and the spec scenario accordingly: set `--bg-sidebar` and `--bg-sidebar-active` to distinct light values (`#f1f5f9`, `#e2e8f0`) in the light theme block of `styles.css`; update design.md token table and spec scenario accordingly — add `import "./styles.css"` to `src/index.tsx` so the `[data-theme]` CSS variable blocks are actually loaded: `--bg-main` was `#ffffff` (typo), `--bg-panel` was `#0d1117`, `--bg-panel-secondary` was `#161b22`, `--border-color` was `#30363d` — updated to match `styles.css`
