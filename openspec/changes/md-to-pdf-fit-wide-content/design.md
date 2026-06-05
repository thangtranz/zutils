## Context

`src/MdToPdf.tsx` exports via native `window.print()`. It clones the rendered preview into an off-screen `#mdp-fallback` container, runs `fitDiagramsToPage(clone)` to scale Mermaid SVGs to one A4 content box, injects a print stylesheet, and prints. The A4 content box is precomputed as `PAGE_CONTENT_W ≈ 612px` / `PAGE_CONTENT_H ≈ 956px` ([MdToPdf.tsx:135-137]).

On screen, wide content scrolls: `pre:not(.mermaid)` uses `overflow: auto`, and line-numbered code puts `overflow-x: auto` on the inner `<code>`. In print there is no viewport, so Chrome clips anything past the page's right edge — wide code lines and wide tables lose their tail. PDFs have no in-page scrolling, so the fix is to fit wide content to the page, mirroring what `fitDiagramsToPage` already does for diagrams.

## Goals / Non-Goals

**Goals:**
- No code block or table content is clipped in the exported PDF.
- Reuse the existing measure-then-scale pattern (`fitDiagramsToPage`) for consistency.
- Leave the on-screen preview's horizontal scrolling unchanged.
- Keep the line-number gutter aligned when code is scaled.

**Non-Goals:**
- In-PDF scrolling — impossible in a static document; explicitly out of scope.
- Re-introducing Paged.js or any pagination library.
- Landscape orientation for wide blocks (a possible future enhancement; not in this change).
- Changing how Mermaid diagrams are fit (already handled).

## Decisions

### Code blocks: scale-to-fit, not line-wrapping

A code block wider than `PAGE_CONTENT_W` is uniformly scaled down to fit. Wrapping (`white-space: pre-wrap`) was rejected as the primary strategy because the line-number gutter ([MdToPdf.css:285-296]) renders one number per *logical* line as a separate flex column; if a logical line wraps to several visual rows, the numbers desync from the code. Scaling the whole `pre` (gutter + code together) keeps numbers aligned and preserves monospace formatting.

*Trade-off:* very wide code → small text. Accepted; legibility-at-small-size beats silent truncation, and most real code lines are moderately wide so the scale factor is mild.

*Alternative (flip if preferred):* keep font size and wrap long lines, accepting gutter desync (or dropping the gutter on wrapped blocks). This is the "formatting over fidelity" choice flagged in the proposal.

### Tables: wrap cells first, scale only if still too wide

Tables are already `width: 100%`, so they fit unless a cell holds a long unbreakable token. First apply `overflow-wrap: anywhere` / `word-break: break-word` to cells so such tokens wrap — this handles the common case with no shrink. A table that is *still* wider than the page (genuinely many columns of real content) is scaled to fit like code. Two-step because wrapping preserves text size when possible and scaling is the fallback. (`table-layout: fixed` is avoided — it would force-fit by cramping every table, including normal ones.)

### Apply the fit (wrap + scale) as inline styles on the print clone, not via `@media print` CSS

The fit pass runs in JS on the off-screen clone and sets inline styles (cell wrapping, `zoom`) directly on it. Two reasons: (1) it keeps the preview untouched (the preview keeps horizontal scroll — only the clone is altered); (2) **measurement must match the printed layout**, and `@media print` rules don't apply during on-screen measurement, so the wrapping/geometry has to be live (inline) when `scrollWidth`/`clientWidth` are read.

### Minimum scale floor ≈ 0.5, then accept clipping

`scale = max(MIN_SCALE, available / content)` with `MIN_SCALE ≈ 0.5`. Past the floor, text would be unreadable, so the block stays at 0.5 and any remainder clips. Chosen over "always fit, however small" to keep extreme cases legible; the pathological-width clip is an accepted edge.

### Use `zoom`, not `transform: scale()`, for the down-scale

`transform: scale()` does not affect layout — a scaled element keeps its original (overflowing) box, leaving phantom whitespace and still overflowing for pagination. Chrome's non-standard `zoom` *does* reflow layout, and this print path is Chrome-only, so `zoom: <factor>` on the block is the simpler, correct tool. (To confirm during implementation: `zoom` interaction with the flex gutter and with page-break behavior.)

### Measure the clone at print width before scaling

`fitDiagramsToPage` reads each SVG's intrinsic `viewBox`, so it never needs layout. Code/tables have no intrinsic width — the fit factor is `min(1, PAGE_CONTENT_W / block.scrollWidth)`, and `scrollWidth` is only meaningful if the clone is laid out at the print content width. The off-screen `#mdp-fallback` is currently at on-screen width, so the fit pass must constrain the measuring context to `PAGE_CONTENT_W` (e.g. set the clone/container width) before reading `scrollWidth`, then apply `zoom`.

## Risks / Trade-offs

- **Tiny text on extreme widths** → Accepted; alternative is lost content. Could later cap the minimum scale and fall back to landscape.
- **`zoom` quirks** (line-number flex row, page breaks across a zoomed block) → Mitigation: verify on multi-line and paginated blocks; a zoomed block ideally avoids breaking across pages (`break-inside: avoid`) where feasible.
- **Measurement accuracy** → Must measure after the clone is at print width and after highlighting/gutter insertion (which change `scrollWidth`). Order the fit pass after those, like diagram fitting.

## Open Questions

- ~~Fidelity vs. formatting for code (scale vs. wrap)~~ → **Resolved: scale-to-fit.**
- ~~Minimum acceptable scale factor~~ → **Resolved: floor ≈ 0.5, then accept clipping** (landscape/hard-wrap left as a possible future enhancement).
