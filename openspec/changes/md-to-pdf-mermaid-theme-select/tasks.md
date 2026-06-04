## 1. State & Theme Resolution

- [ ] 1.1 Add a `MermaidThemeChoice` type (`"auto" | "default" | "dark" | "forest" | "neutral" | "base"`) in `src/MdToPdf.tsx`
- [ ] 1.2 Add `const [mermaidTheme, setMermaidTheme] = useState<MermaidThemeChoice>("auto")`
- [ ] 1.3 Compute `effectiveMermaidTheme = mermaidTheme === "auto" ? palette.mermaid : mermaidTheme`

## 2. Render Wiring

- [ ] 2.1 Pass `effectiveMermaidTheme` to `mermaid.initialize({ theme: ... })` (replacing `palette.mermaid`)
- [ ] 2.2 Change the render effect's dependency array from `[html, palette.mermaid]` to `[html, effectiveMermaidTheme]`

## 3. Selector UI

- [ ] 3.1 Add a labeled `<select>` to the toolbar header actions, bound to `mermaidTheme` / `setMermaidTheme`, with options: `Auto (app theme)`, `Default`, `Dark`, `Forest`, `Neutral`, `Base`
- [ ] 3.2 Style the selector to match existing `mdp-btn` controls in `src/MdToPdf.css` (if needed)

## 4. Verification

- [ ] 4.1 `npm run build` succeeds with no type errors and no new bundle/dependency added
- [ ] 4.2 With the selector at "Auto", toggling the app theme still recolors diagrams (default/dark) — existing behavior preserved
- [ ] 4.3 Selecting an explicit theme (e.g. `forest`) re-renders the preview immediately and does not change when the app theme is toggled
- [ ] 4.4 Export after selecting a theme produces a PDF whose diagrams use the selected theme
