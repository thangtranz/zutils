## Context

`src/MdToPdf.tsx` renders a Markdown editor with a live preview and exports a PDF via the browser's native `window.print()`. Export clones the rendered preview into an off-screen `#mdp-fallback` container and injects a `@media print` stylesheet that, among other things, hard-codes a light page palette:

```css
#mdp-fallback .mdp-content {
  --mdp-bg: #ffffff; --mdp-fg: #1f2328; --mdp-muted: #656d76;
  --mdp-border: #d0d7de; --mdp-code-bg: #f6f8fa; --mdp-link: #0969da;
  ...
}
```

Those values are exactly `PALETTES.light`. The dark equivalent is `PALETTES.dark`. The diagram theme and code theme are already user-selectable via toolbar `<select>` controls backed by `useState` + an options array; the page palette is the last fixed piece. Originally the preview followed the app theme (`useTheme()` → `PALETTES[theme]`) and the export forced light. This change replaces that with a single **Page Theme** control that drives the rendered document in both the preview and the export.

## Goals / Non-Goals

**Goals:**
- Let the user choose the rendered document's page palette: Light (default) or Dark.
- Make the Page Theme the single source of truth for the document palette in both the preview and the export, so the preview is a true WYSIWYG of the PDF.
- Reuse the existing `PALETTES` constant and the existing selector UI pattern — no new palette definitions.
- Keep the default ("Light") output equivalent to today's light export.

**Non-Goals:**
- An "Auto (app theme)" option for the page theme. The user asked for exactly Light/Dark, default Light.
- Theming the surrounding app chrome (header, panes) — that is still owned by the global app theme; only the rendered document follows the Page Theme.

## Decisions

### Page Theme drives the rendered document in both preview and export (WYSIWYG)

`pageTheme` is the single driver of the document palette: `const palette = PALETTES[pageTheme]` feeds the preview's `contentVars` (inline CSS variables on `.mdp-content`), and `effectiveMermaidTheme` / `effectiveCodeTheme` resolve their "Auto" case against `pageTheme` too. The preview's `.mdp-content` no longer reads the app theme (`useTheme` is removed from this component). Because export clones that preview, the cloned palette, highlighted code, and rendered diagrams are already page-correct — the export is a straight snapshot.

*Alternative considered (earlier iteration):* keep the preview bound to the app theme and apply the page palette only at export — overriding the clone's inline vars, pinning the code theme, and re-rendering diagrams from stashed source. Rejected: it required an async export, off-screen Mermaid re-rendering, and source stashing, and still left the preview not matching the PDF. Driving the preview from `pageTheme` makes all of that unnecessary and gives WYSIWYG for free.

### Export needs no per-export theming

Since the preview is already rendered in the page theme, `exportPdf` just clones it, fits diagrams to the page, and prints. The injected print stylesheet handles only layout/typography and `print-color-adjust: exact`; the palette rides along on the clone's inline CSS variables. No palette override, no code-theme pin, no diagram re-render — and `exportPdf` stays synchronous, depending only on `fileName`.

### State + options follow the existing selector pattern

`const [pageTheme, setPageTheme] = useState<PageThemeChoice>("light")` with `type PageThemeChoice = "light" | "dark"` and a `PAGE_THEME_OPTIONS` array, rendered with the shared `.mdp-select` `<label>`/`<select>` markup.

## Risks / Trade-offs

- **Document palette differs from app-chrome palette** (e.g. a light document inside dark app chrome) → Accepted; this is the intended decoupling — the Page Theme is explicitly about the document, and it makes the preview match the export.
- **Default regression** → Mitigation: Light maps to `PALETTES.light`, whose values equal the previously hard-coded export literals; the default output is unchanged.

## Migration Plan

Pure additive UI + export change, no data or API migration. Rollback is reverting the single-file change. No new dependencies.

## Open Questions

None.
