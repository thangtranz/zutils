## 1. Page theme state & options

- [x] 1.1 In `src/MdToPdf.tsx`, add `type PageThemeChoice = "light" | "dark"` near the other theme-choice types
- [x] 1.2 Add a `PAGE_THEME_OPTIONS: { value: PageThemeChoice; label: string }[]` array with `{ value: "light", label: "Light" }` and `{ value: "dark", label: "Dark" }`
- [x] 1.3 Add `const [pageTheme, setPageTheme] = useState<PageThemeChoice>("light")` alongside the existing `mermaidTheme`/`codeTheme` state

## 2. Toolbar selector

- [x] 2.1 Add a "Page Theme" `<label className="mdp-select">` + `<select>` to `.mdp-header-actions`, following the Diagram Theme / Code Theme markup, mapping over `PAGE_THEME_OPTIONS` and wiring `value={pageTheme}` / `onChange={e => setPageTheme(e.target.value as PageThemeChoice)}`
- [x] 2.2 Add `title="Exported PDF page theme"` (or similar) to the label, and add CSS to `src/MdToPdf.css` only if the shared `.mdp-select` styling proves insufficient

## 3. Page Theme drives the rendered document (preview + export)

- [x] 3.1 Drive `palette` from `pageTheme` (`const palette = PALETTES[pageTheme]`) so the preview's `contentVars` use the selected page palette
- [x] 3.2 Resolve the "Auto" Diagram Theme and Code Theme against `pageTheme` (not the app theme): `effectiveMermaidTheme` via `palette.mermaid`, `effectiveCodeTheme` via `pageTheme === "dark" ? "github-dark" : "github"`
- [x] 3.3 Remove the `useTheme` import/usage from `MdToPdf` (the document no longer follows the app theme)
- [x] 3.4 Update the sample tip / inline comments to refer to the Page Theme instead of the app theme

## 4. Simplify export to a WYSIWYG snapshot

- [x] 4.1 Remove the export-time palette override, the "Auto" code-theme pin, and the off-screen diagram re-render — the clone already inherits the preview's page-correct palette, code, and diagrams
- [x] 4.2 Remove the now-dead `rerenderDiagrams` helper, the `ResolvedMermaidTheme` type, and the `data-mdp-src` source stash
- [x] 4.3 Revert `exportPdf` to synchronous with dependency `[fileName]`; keep the clone → `fitDiagramsToPage` → inject print stylesheet (typography + `print-color-adjust: exact`) → print flow

## 5. Verify

- [x] 5.1 Default ("Light") output matches today's: white background, dark text, light code tokens under Auto — in both the preview and the export
- [x] 5.2 "Dark" page theme renders a dark preview AND a dark export (dark background, light text); under Auto, code tokens are GitHub-dark and diagrams are Mermaid `dark`; `print-color-adjust: exact` keeps the dark background in the PDF
- [x] 5.3 Switching the Page Theme recolors the preview document (palette, Auto code, Auto diagrams); the preview matches the exported PDF
- [x] 5.4 Toggling the global app theme does not change the rendered document's palette
- [x] 5.5 `npm run build` (or the project build) succeeds with no type errors
