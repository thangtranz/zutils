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

## 3. Print Typography

- [x] 3a.1 Widen `@page` margins to `20mm 24mm 18mm`
- [x] 3a.2 Add content spacing to the Paged.js inline sheet (`.mdp-content` line-height 1.6, block bottom margins `0.9em`, list-item margins)
- [x] 3a.3 Inject a head-level `#mdp-print-style` `@media print` sheet (scoped to `#mdp-paged .pagedjs_page_content`, `!important`): body 14px / 1.6 leading, headings h1 26 / h2 21 / h3 17 / h4 14px at 1.25 leading, paragraph/li/blockquote `margin-bottom: 0.5em`
- [x] 3a.4 Sans-serif body / monospace `code`/`pre` font split in the injected sheet
- [x] 3a.5 Mermaid carve-out: re-assert `"trebuchet ms"` font + `line-height: normal` on `svg, svg *`, placed last so diagram labels don't overflow
- [x] 3a.6 Remove `#mdp-print-style` in the same `afterprint`/error cleanup as `#mdp-paged`

## 4. Print CSS

- [x] 4.1 Replace the old `visibility`/`.mdp-print-area`/`@page` print rules with the off-screen `#mdp-paged` approach
- [x] 4.2 `@media print`: hide `#root`, reveal `#mdp-paged` (`position: static`)
- [x] 4.3 Remove the now-unused `mdp-print-area` class from the preview element

## 5. Verification

- [x] 5.1 `npm run build` succeeds; `pagedjs` is code-split into its own lazy chunk (main bundle only references the dynamic import)
- [x] 5.2 Export and confirm: no browser header/footer, custom footer present (timestamp left, `Page X of Y` right), diagrams/tables intact
- [x] 5.3 Close the print dialog and confirm no `nextSibling` runtime error
- [x] 5.4 Confirm the footer timestamp shows local time
- [x] 5.5 Export and confirm typography: 14px body, distinct heading scale, sans-serif prose / monospace code, even block spacing, Mermaid labels not overflowing
