## Why

The Markdown to PDF tool previously exported by paginating the rendered preview with Paged.js and printing the paginated output. In practice this path had two problems:

1. **The PDF carried the wrong identity.** The browser's print dialog seeds the saved-PDF filename from `document.title` (the global "ZUtils" app title) and stamps the page URL into any header/footer it draws. A saved PDF was named `ZUtils.pdf` and could carry the app URL — neither meaningful for the exported document.
2. **Paged.js was fragile and opaque.** Its break-token walk threw on some content (large code blocks, tables, SVG label DOM), forcing a native-print fallback anyway, and when it succeeded it took over the page margins — which made Chrome remove its own "Headers and footers" dialog option entirely, so users lost control over what gets stamped.

This change drops Paged.js and exports via the browser's native print, then controls the saved filename and stamped header directly by overriding the page title and URL during export.

## What Changes

- **Export via native browser print only.** Remove the Paged.js pagination path (and the `pagedjs` dependency). Export now clones the rendered preview into an off-screen `#mdp-fallback` container, scales each diagram to fit one A4 page, hides the app UI for print, and calls `window.print()`. The Paged.js break-token crash, the off-screen `#mdp-paged` target, and the `ResizeObserver` stub are all gone.
- **Override `document.title`** during export with the loaded Markdown file's name (with the `.md`/`.markdown` extension stripped) so the print dialog's default filename matches the source document. When no file has been loaded (the seeded sample or hand-typed source), fall back to a single space `" "` so the title is blanked rather than showing "ZUtils".
- **Override the page URL** with a single space `" "` (via `history.replaceState`) so the browser-stamped header/footer does not expose the app URL.
- **Restore** the original `document.title` and URL once printing finishes (on `afterprint`).
- **Drop the custom footer and theme-consistent colors.** Without Paged.js there are no `@page` margin boxes, so the timestamp/page-number footer is gone, and export now renders with a fixed light palette for print legibility regardless of the app theme. The deterministic document typography (14px body, GitHub heading scale, sans-serif/monospace fonts) is preserved, scoped to the `#mdp-fallback` output.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `md-to-pdf`:
  - **PDF Export** changes from "paginate with Paged.js into an off-screen target, then print" to "clone the preview into an off-screen `#mdp-fallback` container, hide the app UI, and native `window.print()`"; the Paged.js dependency and lazy-load requirement are removed.
  - **Print Typography** is retained but scoped to the `#mdp-fallback` output instead of the Paged.js `.pagedjs_page_content`.
  - **Print Footer** is removed — a custom per-page footer is not possible without Paged.js's `@page` margin boxes.
  - **Theme-Consistent Export Colors** is removed and replaced by **Light Export Rendering** — export now always uses a fixed light palette.
  - A new **Export Page Identity** requirement is added: override the document title (to the loaded file name, extension stripped; blanked to `" "` when no file is loaded) and the page URL (blanked to `" "`) for the duration of printing, restoring both afterward.

## Impact

- Modified `src/MdToPdf.tsx`:
  - Added a `fileName` state set in `loadFile` (from `file.name`).
  - Rewrote `exportPdf` to use only native browser print: clone → `fitDiagramsToPage` → off-screen `#mdp-fallback` → inject a `@media print` sheet (hide `#root`, force light palette, deterministic typography) → `window.print()`; cleanup on `afterprint`.
  - Added an `overridePageIdentity()` helper that saves the current `document.title`/`location.href`, sets the title to `fileName.replace(/\.(md|markdown)$/i, "") || " "` and the URL to `" "`, and returns a restore function called from the `afterprint` cleanup.
  - Removed the Paged.js import/`Previewer` call, the `#mdp-paged` target, the `mdp-print-style` sheet, and the `ResizeObserver` stub; made `exportPdf` non-async and dropped `palette` from its deps.
- Removed the `pagedjs` dependency from `package.json` and deleted the `src/pagedjs.d.ts` type shim.
- `history.replaceState` failures are caught so the title override still applies on origins that reject it.
