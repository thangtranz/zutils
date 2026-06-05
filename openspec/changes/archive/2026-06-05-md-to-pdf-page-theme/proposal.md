## Why

Today the Markdown to PDF document palette is not directly user-controllable: the on-screen preview follows the global app theme and the export is hard-coded to a fixed light palette (`src/MdToPdf.tsx`, the injected `@media print` stylesheet pins `--mdp-bg: #ffffff` etc.). A user who wants a dark-background document — to match a dark deck, for on-screen reading, or to pair with dark code/diagram themes — has no way to get one, and the preview never matches what the exported PDF will look like. The diagram theme and code theme are already user-selectable; the page palette is the one piece still locked.

## What Changes

- Add a **Page Theme** selector to the Markdown to PDF toolbar, alongside the existing Diagram Theme and Code Theme selectors.
- The selector offers two choices — **Light** and **Dark** — and defaults to **Light**, preserving today's output exactly.
- The selected page theme drives the rendered document's page palette (background, text, muted, border, code background, link colors) in **both the preview and the export**: Light uses the GitHub-light palette, Dark uses the GitHub-dark palette. The preview becomes a true WYSIWYG of the exported PDF.
- The **Diagram Theme** and **Code Theme** "Auto" cases resolve against the page theme (light/dark), so a dark page automatically shows dark diagrams and dark code tokens, and the export inherits them.
- The document palette is decoupled from the global app theme. The app theme may still style the surrounding app chrome (header, panes), but the rendered document follows the Page Theme.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `md-to-pdf`: A new **Page Theme Selection** requirement is added — a Light/Dark selector (default Light) that drives the document palette in both the preview and the export. The **Light Export Rendering** requirement changes from "export MUST always render with a fixed light palette regardless of app theme" to "export renders with the user-selected page palette, defaulting to Light." The **Code Theme Selection** requirement's "Auto" behavior is amended to resolve against the page theme rather than the app theme.

## Impact

- Modified `src/MdToPdf.tsx` — add a `pageTheme` state (`"light" | "dark"`, default `"light"`) and a `PAGE_THEME_OPTIONS` toolbar selector; drive `palette`, `effectiveMermaidTheme`, and `effectiveCodeTheme` from `pageTheme` instead of the app theme; drop the `useTheme` dependency from this component; simplify `exportPdf` to a plain WYSIWYG clone (the previously-needed export-time palette override, code-theme pin, and diagram re-render are no longer required).
- Modified `src/MdToPdf.css` — only if the new selector needs styling beyond the shared `.mdp-select` class (it reuses the existing pattern, so none).
- No new dependencies, no backend, no bundle impact — both palettes already exist in `PALETTES` and `print-color-adjust: exact` is already set so the dark background renders in the PDF.
