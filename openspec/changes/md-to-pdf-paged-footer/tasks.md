> This change documents code already implemented and staged; tasks are marked
> complete to reflect that state.

## 1. Dependency

- [x] 1.1 Add `pagedjs` (`^0.4.3`) to root `package.json` dependencies (+ lockfile)
- [x] 1.2 Add `src/pagedjs.d.ts` declaring the minimal `Previewer` type surface

## 2. Export Pipeline

- [x] 2.1 Add `exportPdf` handler in `src/MdToPdf.tsx`; wire the "Export PDF" button to it (replacing `() => window.print()`)
- [x] 2.2 Build the local-time timestamp (`YYYY-MM-DD HH:MM`) from `new Date()` fields
- [x] 2.3 Build the print CSS string with `@page` margin boxes: `@bottom-left` = timestamp, `@bottom-right` = `Page counter(page) of counter(pages)`
- [x] 2.4 Set `.pagedjs_page` background and footer color from the theme palette; add `print-color-adjust: exact`
- [x] 2.5 Create a fresh off-screen `#mdp-paged` target each run; lazy `import("pagedjs")` and `previewer.preview(clone, [{...: css}], target)`
- [x] 2.6 Disconnect each page's `ResizeObserver` (`flow.pages[].removeListeners()`) after pagination to avoid the post-print `nextSibling` crash
- [x] 2.7 Add `afterprint` cleanup (remove `#mdp-paged`, detach listener); run cleanup on error

## 3. Print CSS

- [x] 3.1 Replace the old `visibility`/`.mdp-print-area`/`@page` print rules with the off-screen `#mdp-paged` approach
- [x] 3.2 `@media print`: hide `#root`, reveal `#mdp-paged` (`position: static`)
- [x] 3.3 Remove the now-unused `mdp-print-area` class from the preview element

## 4. Verification

- [x] 4.1 `npm run build` succeeds; `pagedjs` is code-split into its own lazy chunk (main bundle only references the dynamic import)
- [x] 4.2 Export and confirm: no browser header/footer, custom footer present (timestamp left, `Page X of Y` right), diagrams/tables intact
- [x] 4.3 Close the print dialog and confirm no `nextSibling` runtime error
- [x] 4.4 Confirm the footer timestamp shows local time
