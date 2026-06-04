## Context

`exportPdf` in `src/MdToPdf.tsx` previously printed by paginating a preview clone with Paged.js into an off-screen `#mdp-paged` target, with a native-print fallback (`nativePrintFallback`) for when Paged.js's break-token walk threw. Two issues drove this change:

- Paged.js's success path took over the page margins via `@page`, which made Chrome **remove its "Headers and footers" dialog option** entirely. Its failure path threw on common content and fell back to native print anyway. The dual path was fragile and the behavior depended on which branch ran.
- On any path, the browser's print dialog uses `document.title` as the default save filename and stamps `document.title` + the page URL into the header/footer it draws. The app title is "ZUtils" and the URL is the app URL — neither belongs on the exported document.

The tool already loads `.md`/`.markdown` files via `loadFile`, but it discarded the file name — only the text was kept in `source`.

## Goals / Non-Goals

**Goals:**

- Export with a single, predictable path: native browser print.
- Keep Chrome's "Headers and footers" option available to the user.
- Name the exported PDF after the loaded Markdown document (extension stripped) instead of "ZUtils"; blank the title when there is no loaded file.
- Blank the page URL during printing so it is not stamped into the browser header/footer.
- Restore the real title and URL after printing.
- Preserve the deterministic document typography in the printed output.

**Non-Goals:**

- A custom per-page footer (timestamp + page numbers). Not possible without Paged.js's `@page` margin boxes; dropped with Paged.js.
- Theme-consistent (dark) export. Export now renders light for print legibility regardless of app theme.
- Deriving a name from hand-typed source (e.g. the first `# heading`). Only the loaded file name is used; otherwise the title is blanked.
- Persisting or displaying the file name elsewhere in the UI.

## Decisions

### Drop Paged.js; export via native print only

Remove the `pagedjs` dependency, its dynamic import, the `Previewer.preview()` call, the off-screen `#mdp-paged` target, the `mdp-print-style` sheet, the `ResizeObserver` stub (only needed to survive Paged.js's post-layout reflow), and the try/catch fallback wrapper. `exportPdf` becomes a single synchronous path: clone the preview, `fitDiagramsToPage(clone)`, append to an off-screen `#mdp-fallback`, inject one `@media print` sheet, and `window.print()`. This is what the old fallback already did; it is now the only path.

### Carry the print typography onto the native path

The deterministic typography (14px body, 1.6 leading, GitHub heading scale, sans-serif prose / monospace code, Mermaid font preserved inside SVGs) previously lived in the Paged.js-scoped `mdp-print-style` sheet (`#mdp-paged .pagedjs_page_content …`). It is re-scoped to `#mdp-fallback .mdp-content …` and merged into the single print sheet so the PDF still reads as a clean document. The sheet also forces a fixed light palette and `print-color-adjust: exact`.

### Track the loaded file name in state

Add `const [fileName, setFileName] = useState("")` and set it in `loadFile` from `file.name`. State (not a ref) so the value is current when `exportPdf` runs; `exportPdf` lists `fileName` in its dependency array.

### One helper that overrides and returns its own restore

`overridePageIdentity()` snapshots `document.title` and `location.href`, applies the overrides, and returns a `restore` closure. This keeps the saved values local to the invocation and makes restore symmetric:

```
document.title = fileName.replace(/\.(md|markdown)$/i, "") || " ";
history.replaceState(history.state, "", " ");   // wrapped in try/catch
```

- **Title:** the file name with a trailing `.md`/`.markdown` stripped (case-insensitive) so the dialog defaults to `name.pdf`, not `name.md.pdf`. Empty string (no file loaded) falls back to `" "` — a space rather than empty, so the browser does not substitute its own default.
- **URL:** set to `" "` via `history.replaceState`, preserving `history.state`. Wrapped in `try/catch` because some origins reject `replaceState`; on failure the title override still applies.

The override is applied immediately before `window.print()`; the returned restore runs inside the `afterprint` cleanup alongside removing the `#mdp-fallback` container and its stylesheet.

## Risks / Trade-offs

- **Trade-off:** dropping Paged.js loses the custom footer and dark-theme export. Accepted — the footer was already not rendering content, and a legible light PDF is the common need.
- **Trade-off:** header/footer suppression is ultimately the user's print-dialog setting; this change controls *what* is stamped (file name, blank URL) rather than forcing headers off. Accepted.
- **Risk (low):** `history.replaceState(_, _, " ")` resolves the URL relative to the current document; the address bar briefly shows the resolved path during printing. It is restored on `afterprint`, and the `try/catch` guards origins that reject it.

## Migration Plan

Additive/within-tool. Removes a dependency (`pagedjs`) and a type shim (`src/pagedjs.d.ts`); no data or flags. Rollback: revert the diff and re-add `pagedjs`.

## Open Questions

None blocking. Possible later iterations: derive a title from the first Markdown heading when no file is loaded; offer an opt-in dark export.
