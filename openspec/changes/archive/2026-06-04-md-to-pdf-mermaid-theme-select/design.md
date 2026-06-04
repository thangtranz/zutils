## Context

The Markdown to PDF tab (`src/MdToPdf.tsx`) renders Markdown via `marked`, draws Mermaid diagrams in a preview pane, and exports by cloning the rendered preview and paginating it with Paged.js. The Mermaid theme is currently derived solely from the app theme:

```
const palette = PALETTES[theme];          // theme from useTheme()
mermaid.initialize({ theme: palette.mermaid });   // "default" (light) or "dark"
```

The render effect re-runs on `[html, palette.mermaid]`, so toggling the app theme recolors diagrams. Export does **not** re-render diagrams — it clones the already-rendered preview SVGs — so whatever theme the preview used is what prints.

## Goals / Non-Goals

**Goals:**

- Let the user pick the Mermaid diagram theme from the tool's toolbar.
- Default to "follow the app theme" so existing behavior is unchanged until the user opts in.
- Expose Mermaid's built-in themes: `default`, `dark`, `forest`, `neutral`, `base`.
- Drive both preview and export from a single control (export inherits the preview's SVGs).

**Non-Goals:**

- Custom `themeVariables` / per-color overrides. Built-in themes only for this change.
- A separate "export theme" distinct from the preview theme. One selection governs both.
- Persisting the selection across reloads / sessions. Component state only (resets on reload); revisit later if wanted.
- Changing the page background, prose, or footer colors — those keep following the app theme.

## Decisions

### Single state value with an "auto" sentinel

Add `const [mermaidTheme, setMermaidTheme] = useState<MermaidThemeChoice>("auto")`, where:

```
type MermaidThemeChoice = "auto" | "default" | "dark" | "forest" | "neutral" | "base";
```

The effective theme handed to Mermaid resolves the sentinel against the app palette:

```
const effectiveMermaidTheme = mermaidTheme === "auto" ? palette.mermaid : mermaidTheme;
```

`"auto"` is the default so the tool behaves exactly as today until the user changes it. This keeps "follow app theme" as a first-class, explicit choice rather than an absence of choice.

### Wire the effective theme into the existing render effect

`mermaid.initialize({ theme: effectiveMermaidTheme })` and change the effect's dependency array from `[html, palette.mermaid]` to `[html, effectiveMermaidTheme]`. When the selection is `"auto"`, `effectiveMermaidTheme` still tracks `palette.mermaid`, so the app-theme-toggle re-color behavior is preserved. When a fixed theme is selected, app-theme toggles no longer recolor diagrams (by design).

### Export needs no change

Export clones the rendered preview and paginates it; the diagram SVGs already carry the chosen theme's colors. No change to `exportPdf` is required — selecting a theme and then exporting "just works." This is the reason a single control can govern both surfaces.

### Selector UI in the toolbar

Add a labeled `<select>` to the header actions area (next to the "Export PDF" button), styled to match the existing `mdp-btn` controls. Options: `Auto (app theme)`, `Default`, `Dark`, `Forest`, `Neutral`, `Base`. A `<select>` is chosen over a button group because the option set is small but not binary and a native control needs no extra state/markup.

## Risks / Trade-offs

- **Trade-off:** a light diagram theme on a dark page (or vice versa) can look mismatched. Accepted — it is the user's explicit selection, and the common case (forced-light diagrams for printing) is exactly the motivation.
- **Trade-off:** selecting a fixed theme means app-theme toggles no longer recolor diagrams. Accepted and expected — "Auto" remains available for users who want the linked behavior.
- **Risk (low):** Mermaid renames/removes a built-in theme in a future version. Mitigation: the values are Mermaid's documented built-ins; pinned by the existing `mermaid` dependency.

## Migration Plan

Additive within the existing tab. No data, no flags, no dependency changes. Default `"auto"` reproduces current behavior, so the change is non-breaking. Rollback: revert the diff.

## Open Questions

None blocking. Possible later iterations:

- Persist the selection (localStorage) so it survives reloads.
- Custom `themeVariables` for brand colors.
- A distinct export-only theme separate from the preview.
