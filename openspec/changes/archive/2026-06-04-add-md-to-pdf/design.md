## Context

zutils is a browser-only React/TypeScript app deployed to GitHub Pages (`react-scripts build` + `gh-pages -d build`). Its tabs (PagerDuty Calendar, ANSI Converter, SQS Visualizer) are React components selected from a sidebar in `src/App.tsx`; theming flows through `ThemeContext` and CSS variables (`--bg-main`, `--text-primary`, …). The ANSI Converter establishes the two-pane "source on the left, rendered output on the right" pattern this tool follows.

The feature originates from a Node CLI (`convert.mjs`) that used `marked` + `mermaid` + `puppeteer-core` to drive a headless Chrome and call `page.pdf()`. Embedding it into the browser app means dropping `puppeteer` entirely — it cannot run client-side — and replacing "headless Chrome prints to PDF" with "the user's own browser prints to PDF" via `window.print()`. `marked` and `mermaid` are browser libraries and carry over directly.

## Goals / Non-Goals

**Goals:**

- A new in-app tab that renders Markdown (with Mermaid diagrams) and exports it to PDF, consistent with the other zutils tools.
- Reuse the attached tool's behavior where it maps to the browser: `marked` rendering, mermaid `default`/`dark` themes, GitHub-style light/dark page styling, A4-ish print output.
- Integrate with the existing `ThemeContext` rather than a separate `--theme` flag.
- Keep the initial bundle lean by lazy-loading `mermaid`.

**Non-Goals:**

- Any Node/CLI/server component or `puppeteer`. This is purely client-side.
- A bespoke PDF engine (jsPDF/pdf-lib/html2pdf). We use the browser's native print-to-PDF.
- Programmatic margin/page-size knobs beyond what `@page` CSS provides.
- Multi-file conversion, watch mode, or persisting documents.

## Decisions

### PDF export via `window.print()` + print-scoped CSS

Export calls `window.print()`. A print stylesheet (`@media print`) hides the app chrome (sidebar, input pane, toolbar) and prints only the rendered preview, with `@page { size: A4; margin: ... }` and GitHub-style typography. The user picks "Save as PDF" in the browser dialog.

**Alternative considered:** a client-side PDF library (jsPDF + html2canvas, or html2pdf). Rejected — html2canvas rasterizes (blurry text, large files), adds significant bundle weight, and handles Mermaid SVGs and page breaks poorly. Native print gives crisp vector text and SVG, real page breaks, and zero extra deps — and it is the literal browser analog of the original tool's `page.pdf()`.

**Trade-off:** export goes through the browser's print dialog rather than a one-click silent download. Accepted — it is the standard, highest-fidelity path for a static web app, and users already know it.

### Render pipeline: `marked` → HTML, `mermaid.run()` over `.mermaid` blocks

A custom `marked` `code` renderer turns ```mermaid``` fences into `<pre class="mermaid">…</pre>` (HTML-escaped) and leaves other code blocks to the default renderer — identical to the attached code. After React commits the preview HTML, an effect calls `mermaid.run()` to render diagrams into SVG. Re-running on input change re-renders diagrams.

**Decision — output as `dangerouslySetInnerHTML`:** the preview pane sets the `marked` output via `dangerouslySetInnerHTML`. `marked` output from user-pasted Markdown is the same trust model as the ANSI Converter (the user converts their own content); mermaid is initialized with `securityLevel: 'loose'` to match the original. Documented as an accepted trust boundary (local, single-user tool).

### Lazy-load `mermaid`

`mermaid` is imported via dynamic `import("mermaid")` the first time the tab renders a diagram, not at module top-level. This keeps `mermaid` out of the initial chunk so the other three tabs and first paint are unaffected.

**Alternative:** static top-level import. Rejected — pulls mermaid's weight into the main bundle for every visitor regardless of whether they use this tab.

### Theme via `ThemeContext`, not a flag

The component reads `useTheme()`. Page colors come from existing CSS variables; the Mermaid theme is chosen as `dark` when `theme === "dark"` else `default`, and mermaid is re-initialized + re-run when the theme toggles so diagrams recolor without a manual re-render. This replaces the CLI's `--theme light|dark` argument.

### Component layout mirrors `AnsiConverter`

Two panes: left is a textarea for Markdown plus a "Load file" control (accept `.md,.markdown`); right is the rendered, GitHub-styled preview. A small toolbar holds the "Export PDF" (print) button. A bundled sample document (headings, table, code block, a Mermaid diagram) seeds the input so the tool is self-demonstrating, matching ANSI's `SAMPLE`.

## Risks / Trade-offs

- **Risk:** `mermaid` inflates bundle size. [Mitigation] dynamic import isolates it to its own chunk, loaded only on first diagram render.
- **Risk:** print output varies slightly across browsers. [Mitigation] target Chrome/Chromium (the project's baseline, same as the original tool); `@page` + print CSS keep it consistent there.
- **Risk:** invalid Mermaid syntax throws during `run()`. [Mitigation] wrap in try/catch and show an inline error in the diagram's place rather than breaking the whole preview.
- **Risk:** `dangerouslySetInnerHTML` on rendered Markdown. [Mitigation] same single-user/local-content trust model as the existing ANSI tool; documented.
- **Trade-off:** export uses the browser print dialog, not a direct file write. Accepted (see decision).

## Migration Plan

Purely additive. New component + one nav entry + two npm deps. No existing tab, route, or behavior changes. Rollback: revert the PR (remove `src/MdToPdf.tsx`, the `App.tsx` nav entry, and the two deps). No persisted state.

## Open Questions

None blocking. Possible later iterations:

- A `@media print` page-size/margin selector (Letter vs A4).
- Export the rendered HTML standalone (self-contained `.html`) in addition to PDF.
- Drag-and-drop file load (the ANSI tool already has a drop handler to borrow from).
- Syntax highlighting for non-mermaid code blocks.
