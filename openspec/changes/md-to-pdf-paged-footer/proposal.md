## Why

The first cut of Markdown to PDF exported by calling `window.print()` on the live preview. That left Chrome to draw its own page furniture: a header with the document title ("zutils") and date, and a footer with the page URL — which looks unprofessional on a shared document and can't be customized. There was also no way to stamp the export with a date or show page numbers, because Chrome does not support `counter(page)`/`counter(pages)` in CSS page-margin boxes.

## What Changes

- Replace the `window.print()` export with a **Paged.js**-based pipeline (lazy-loaded only when exporting).
- The rendered preview is cloned and paginated into an off-screen `#mdp-paged` target; on print, the app (`#root`) is hidden and only the paged output prints.
- Add a custom footer via `@page` margin boxes: a **local-time** export timestamp (`YYYY-MM-DD HH:MM`) bottom-left, and **`Page X of Y`** bottom-right, repeated on every page.
- The browser's own header/footer no longer appear — Paged.js owns the page boxes.
- The page background and footer color follow the current theme palette, with `print-color-adjust: exact` so colors render in the PDF.
- After pagination, disconnect each page's `ResizeObserver` so the reflow when the print dialog closes does not re-run layout against torn-down DOM (a Paged.js crash: "Cannot read properties of null (reading 'nextSibling')").
- Add the `pagedjs` dependency and a `src/pagedjs.d.ts` type declaration (the package ships no types).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `md-to-pdf`: The PDF Export requirement changes from "browser native print-to-PDF via `window.print()`" to a Paged.js pagination pipeline, and a new requirement covers the custom print footer (timestamp + page numbers) and the suppression of the browser's default header/footer.

## Impact

- Modified `src/MdToPdf.tsx` — new `exportPdf` handler (Paged.js preview, observer teardown, print), Export button wired to it, preview element no longer carries the now-unused `mdp-print-area` class.
- Modified `src/MdToPdf.css` — print section reworked for the off-screen `#mdp-paged` target (replacing the old `visibility`/`@page` print rules); remaining changes are cosmetic reformatting.
- Modified root `package.json` (+ `yarn.lock`, `.yarn/install-state.gz`) — add `pagedjs`.
- New file `src/pagedjs.d.ts`.
- `pagedjs` is code-split into its own lazy chunk; the main bundle only references the dynamic import. No impact on the other tabs or first paint.
- Export now depends on Paged.js running in the browser; a very tall single diagram or element that exceeds one page height can be clipped (Paged.js cannot split an SVG across pages).
