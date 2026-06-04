## Why

When the Markdown to PDF tool exports, the browser's print dialog seeds the PDF's default filename from `document.title` and stamps the page URL into the print header/footer. Today that title is the global "ZUtils" app title and the URL is the app URL, so a saved PDF is named `ZUtils.pdf` and (whenever the user has the browser's "Headers and footers" option enabled, or when the native-print fallback path runs without Paged.js's `@page` margin boxes) carries the app's title and URL stamped across the page. Neither is meaningful for the exported document — the user expects the PDF to be named after the Markdown they loaded, not the tool.

## What Changes

- During export, **override `document.title`** with the loaded Markdown file's name (with the `.md`/`.markdown` extension stripped) so the print dialog's default filename matches the source document. When no file has been loaded (e.g. the seeded sample or hand-typed source), fall back to a single space `" "` so the title is blanked rather than showing "ZUtils".
- During export, **override the page URL** with a single space `" "` (via `history.replaceState`) so the browser-stamped header/footer does not expose the app URL.
- **Restore** the original `document.title` and URL once printing finishes (on `afterprint`), in **both** export paths — the Paged.js pagination path and the native-print fallback path.
- Track the loaded file's name in component state so it is available at export time.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `md-to-pdf`: The **Print Footer** requirement is extended. Previously it relied solely on Paged.js's `@page` margin boxes to suppress the browser's default header/footer; that does not cover the native-print fallback path or the case where the user has the browser's header/footer option enabled. The requirement now also mandates that the export overrides the document title (to the loaded file name, extension stripped; blanked to `" "` when no file is loaded) and the page URL (blanked to `" "`) for the duration of printing, restoring both afterward, across both the Paged.js and native-fallback paths.

## Impact

- Modified `src/MdToPdf.tsx`:
  - Added a `fileName` state set in `loadFile` (from `file.name`).
  - Added an `overridePageIdentity()` helper in `exportPdf` that saves the current `document.title`/`location.href`, sets the title to `fileName.replace(/\.(md|markdown)$/i, "") || " "` and the URL to `" "`, and returns a restore function.
  - Invoked the override immediately before each `window.print()` (Paged.js path and native fallback) and called the restore function in both `afterprint` cleanups.
  - Added `fileName` to the `exportPdf` `useCallback` dependency list.
- No new dependencies, no backend, no bundle impact. `history.replaceState` failures are caught so the title override still applies on origins that reject it.
