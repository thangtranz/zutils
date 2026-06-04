## 1. Track the loaded file name

- [x] 1.1 Add `const [fileName, setFileName] = useState("")` in `src/MdToPdf.tsx`
- [x] 1.2 Set `setFileName(file.name)` in `loadFile`

## 2. Switch export to native browser print

- [x] 2.1 Remove the Paged.js dynamic import and `Previewer.preview()` call
- [x] 2.2 Remove the off-screen `#mdp-paged` target, the `mdp-print-style` sheet, and the `ResizeObserver` stub/restore
- [x] 2.3 Rewrite `exportPdf` as a single path: clone preview → `fitDiagramsToPage(clone)` → append to off-screen `#mdp-fallback` → inject one `@media print` sheet → `window.print()`
- [x] 2.4 Make `exportPdf` non-async and drop `palette` from its dependency array (keep `fileName`)
- [x] 2.5 Port the deterministic print typography onto `#mdp-fallback .mdp-content` (14px body, 1.6 leading, GitHub heading scale, sans-serif/monospace fonts, Mermaid font preserved in SVGs) and force a light palette with `print-color-adjust: exact`

## 3. Override / restore page identity

- [x] 3.1 Add `overridePageIdentity()` that snapshots `document.title` and `location.href`
- [x] 3.2 Set `document.title = fileName.replace(/\.(md|markdown)$/i, "") || " "`
- [x] 3.3 Set the URL to `" "` via `history.replaceState(history.state, "", " ")`, wrapped in `try/catch`
- [x] 3.4 Return a restore closure that puts the original title and URL back (also `try/catch` on `replaceState`)
- [x] 3.5 Call `overridePageIdentity()` immediately before `window.print()` and call its restore in the `afterprint` cleanup (alongside removing `#mdp-fallback` and its style)

## 4. Remove the Paged.js dependency

- [x] 4.1 `npm uninstall pagedjs` (drop from `package.json` and the lockfile)
- [x] 4.2 Delete the `src/pagedjs.d.ts` type shim
- [x] 4.3 Remove/refresh stale Paged.js comments in `src/MdToPdf.tsx`

## 5. Verification

- [x] 5.1 `npm run build` succeeds with no type errors and no missing-module error after removing `pagedjs`
- [x] 5.2 Export keeps Chrome's "Headers and footers" print option available (no `@page` margin boxes take it over)
- [x] 5.3 Load a file named `roadmap.md`, export, and confirm the print dialog's default filename is `roadmap`
- [x] 5.4 With no file loaded (seeded sample), export and confirm the title is blank (`" "`), not "ZUtils"
- [x] 5.5 With "Headers and footers" enabled, confirm the stamped header shows the file name / blank title and a blank URL, not "ZUtils" + the app URL
- [x] 5.6 After the dialog closes, confirm `document.title` and the address-bar URL are restored to their pre-export values
- [x] 5.7 Export a document with diagrams and confirm they print intact, scaled to fit the page, with document typography (light render)
