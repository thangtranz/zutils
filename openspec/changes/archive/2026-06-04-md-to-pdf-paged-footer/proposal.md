## Why

The first cut of Markdown to PDF exported by calling `window.print()` on the live preview. That left Chrome to draw its own page furniture: a header with the document title ("zutils") and date, and a footer with the page URL — which looks unprofessional on a shared document and can't be customized. There was also no way to stamp the export with a date or show page numbers, because Chrome does not support `counter(page)`/`counter(pages)` in CSS page-margin boxes.

## What Changes

- Replace the `window.print()` export with a **Paged.js**-based pipeline (lazy-loaded only when exporting).
- The rendered preview is cloned and paginated into an off-screen `#mdp-paged` target; on print, the app (`#root`) is hidden and only the paged output prints.
- Add a custom footer via `@page` margin boxes: a **local-time** export timestamp (`YYYY-MM-DD HH:MM`) bottom-left, and **`Page X of Y`** bottom-right, repeated on every page.
- The browser's own header/footer no longer appear — Paged.js owns the page boxes.
- The page background and footer color follow the current theme palette, with `print-color-adjust: exact` so colors render in the PDF.
- Apply a deterministic print-only typography layer: a `@media print` stylesheet injected into the document head (`#mdp-print-style`), scoped to the paginated output and using `!important`, sets body/heading font sizes (14px body, h1–h4 scale), 1.6 line spacing, a sans-serif body / monospace code split, and compact block spacing — matching a reference PDF. A Mermaid carve-out keeps diagram SVGs on their own measured font so labels don't overflow. Page margins widen to `20mm 24mm 18mm`. The injected sheet is removed in the same cleanup as the off-screen target.
- After pagination, disconnect each page's `ResizeObserver` so the reflow when the print dialog closes does not re-run layout against torn-down DOM (a Paged.js crash: "Cannot read properties of null (reading 'nextSibling')").
- Add the `pagedjs` dependency and a `src/pagedjs.d.ts` type declaration (the package ships no types).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `md-to-pdf`: The PDF Export requirement changes from "browser native print-to-PDF via `window.print()`" to a Paged.js pagination pipeline; new requirements cover the custom print footer (timestamp + page numbers) and the suppression of the browser's default header/footer, theme-consistent export colors, and a deterministic print typography layer (font sizes, line spacing, sans-serif/monospace split, block spacing, Mermaid font carve-out).

## Impact

- Modified `src/MdToPdf.tsx` — new `exportPdf` handler (Paged.js preview, observer teardown, print), Export button wired to it, preview element no longer carries the now-unused `mdp-print-area` class. The handler also builds the Paged.js inline sheet (footer, theme colors, content spacing) and injects a head-level `#mdp-print-style` `@media print` sheet for deterministic typography (font sizes, leading, font families, block spacing, Mermaid carve-out); both the off-screen target and the injected sheet are torn down on `afterprint`/error.
- Modified `src/MdToPdf.css` — print section reworked for the off-screen `#mdp-paged` target (replacing the old `visibility`/`@page` print rules); remaining changes are cosmetic reformatting.
- Modified root `package.json` (+ `yarn.lock`, `.yarn/install-state.gz`) — add `pagedjs`.
- New file `src/pagedjs.d.ts`.
- `pagedjs` is code-split into its own lazy chunk; the main bundle only references the dynamic import. No impact on the other tabs or first paint.
- Export now depends on Paged.js running in the browser; a very tall single diagram or element that exceeds one page height can be clipped (Paged.js cannot split an SVG across pages).
