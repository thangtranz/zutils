## Context

The app is a growing React utility platform hosting multiple independent util pages. All colors are currently hard-coded as inline style values scattered across each page's component and CSS files, with no shared color system or theming layer. As more utils are added, inconsistent theming becomes harder to manage. The app uses plain React with no state management library, making a lightweight context-based solution the natural fit — and one that new util pages can adopt without any extra setup.

## Goals / Non-Goals

**Goals:**
- Introduce a single global dark/light theme that every page respects
- Persist the user's choice in `localStorage` so it survives page refresh
- Add a toggle control in the sidebar
- Use no new runtime dependencies

**Non-Goals:**
- Per-page or per-component theme overrides
- Animated theme transitions
- System-preference auto-detection (`prefers-color-scheme`) — user can do this later
- Changing the AnsiConverter's *exported HTML document* stylesheet (it is self-contained by spec)

## Decisions

### 1. CSS Custom Properties for token definitions (over inline-style objects or CSS-in-JS)

CSS variables (`--color-bg`, `--color-sidebar`, etc.) defined on `[data-theme="dark"]` and `[data-theme="light"]` selectors in `styles.css`. The theme context applies the attribute to `document.documentElement`, so every descendant inherits the variables automatically without prop-drilling.

**Alternatives considered:**
- **Inline style object map** (e.g. `theme.bg`) passed via context and applied per-component — would require touching every JSX node that uses color; fragile, no CSS cascade.
- **CSS-in-JS (emotion/styled-components)** — adds a dependency, overkill for this codebase size.

### 2. React Context + `localStorage` for state (over URL params or external store)

A `ThemeContext` wraps the app root. Initial value is read from `localStorage` (key `zutils-theme`), defaulting to `"dark"`. The toggle writes back to `localStorage` on every change.

**Alternatives considered:**
- **URL query param** — pollutes URLs, doesn't persist across navigation.
- **Zustand** — adds a dependency; state is a single boolean.

### 3. Apply theme via `data-theme` attribute on `<html>` (over a wrapper `<div>`)

Placing the attribute on `document.documentElement` means the theme also covers `<body>` background, preventing a flash of unstyled content if the body background is set in CSS.

### 4. Token set: minimal but complete

Define only the tokens that the current codebase needs:

| Token | Dark | Light |
|---|---|---|
| `--bg-main` | `#0d1117` | `#ffffff` |
| `--bg-sidebar` | `#1e2330` | `#f1f5f9` |
| `--bg-sidebar-active` | `#2d3748` | `#e2e8f0` |
| `--bg-panel` | `#0a0c10` | `#f0f2f5` |
| `--bg-panel-secondary` | `#111318` | `#e2e8ef` |
| `--text-primary` | `#e2e8f0` | `#1a202c` |
| `--text-secondary` | `#94a3b8` | `#4a5568` |
| `--text-muted` | `#6e7681` | `#718096` |
| `--border-color` | `#1e2330` | `#d1d5db` |
| `--btn-bg` | `#21262d` | `#e2e8f0` |
| `--btn-bg-primary` | `#238636` | `#2da44e` |
| `--btn-text` | `#c9d1d9` | `#1a202c` |

Sidebar tokens differ between themes — the sidebar follows the active theme like the rest of the app.

## Risks / Trade-offs

- **Inline styles vs CSS vars adoption**: Some components use complex inline style objects. If a component misses a token swap, colors will be inconsistent. → Mitigation: tasks include a per-component checklist; visual review after implementation.
- **AnsiConverter panel colors**: The AnsiConverter uses many very specific dark colors for code rendering panels. Light-mode equivalents must be chosen carefully to maintain readability of colorized ANSI output. → Mitigation: spec defines exact light-mode panel token values.
- **No flash-of-unstyled-content guard**: Since the theme is read from localStorage in JS, a brief flash could occur on first paint. For this tool's use case (internal utility) this is acceptable. → Mitigation: can be addressed later with a `<script>` in `index.html` if needed.

## Migration Plan

1. Add CSS custom property definitions to `styles.css` under `[data-theme="dark"]` and `[data-theme="light"]`
2. Create `src/ThemeContext.tsx` with provider and hook
3. Wrap `<App />` in `<ThemeProvider>` in `src/index.tsx`
4. Update `App.tsx`: read context, set `document.documentElement.dataset.theme`, add toggle button
5. Update `AnsiConverter.tsx`: replace hard-coded color values with CSS var references (via inline style or className)
6. Update `PagerDutyCalendar.tsx`: same as above
7. Remove `AnsiConverter.css` hard-coded colors that are now covered by tokens

Rollback: revert the files — no database changes, no server-side state.
