## Why

Today the Mermaid diagram theme in the Markdown to PDF tool is hard-coupled to the app's light/dark theme: `dark` when the app is dark, `default` otherwise (`src/MdToPdf.tsx` `PALETTES[theme].mermaid`). There is no way for a user to choose a different Mermaid theme — the other built-ins (`forest`, `neutral`, `base`) and a forced-light export are unreachable. A common need is "I'm working in dark mode but want light, print-friendly diagrams in the PDF," which is impossible without flipping the whole app theme.

## What Changes

- Add a **Mermaid theme selector** to the Markdown to PDF toolbar.
- The selector defaults to **Auto (follow app theme)** — preserving today's behavior exactly (`dark` in dark mode, `default` otherwise).
- When the user picks an explicit theme, the diagrams render with that Mermaid theme **regardless of the app theme**: options are `default`, `dark`, `forest`, `neutral`, `base` (Mermaid's built-in themes).
- The choice drives `mermaid.initialize({ theme })`, so it re-renders the **preview** immediately and the **export** inherits the same SVGs (export clones the already-rendered preview — no separate export pathway needed).
- The page background / prose colors continue to follow the app theme; only the diagram theme is decoupled.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `md-to-pdf`: The **Theme Integration** requirement changes from "Mermaid theme MUST be `dark` when the app theme is dark and `default` otherwise" (a fixed mapping) to "Mermaid theme follows the app theme by **default**, but a user-selected theme overrides it." A new selector control and its set of choices are added; the theme-toggle re-color behavior is retained only while the selector is in Auto.

## Impact

- Modified `src/MdToPdf.tsx` — add a `mermaidTheme` state (`"auto"` plus the five built-ins, default `"auto"`); resolve the effective theme (`auto` → `palette.mermaid`); pass it to `mermaid.initialize` and add it to the render effect's dependency list; add the selector control to the toolbar.
- Modified `src/MdToPdf.css` — minor styling for the selector to match the existing toolbar buttons (if needed).
- No new dependencies, no backend, no bundle impact — Mermaid is already lazy-loaded and all theme values are built-in strings it already understands.
- Interaction note: choosing a light diagram theme while the app is dark (or vice versa) renders light diagrams on a dark page. This is the user's explicit choice and is accepted.
