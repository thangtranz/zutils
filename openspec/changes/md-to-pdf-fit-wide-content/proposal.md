## Why

In the Markdown to PDF tool, content wider than the page — long code lines and wide tables — is **clipped** in the exported PDF. On screen the preview scrolls horizontally (`pre` blocks use `overflow: auto`, table cells can extend), but a PDF page is a fixed A4 canvas with no viewport to scroll, so Chrome's print engine simply cuts off everything past the right margin. Content is silently lost. "Scrolling in the PDF" isn't possible (a static document has no scrollable region); the real need is **for no content to be clipped on export**.

## What Changes

- On export, wide content is **fit to the page width** instead of being clipped, so nothing is lost. This reuses the philosophy already applied to Mermaid diagrams by `fitDiagramsToPage` (measure, then scale to fit one A4 content box, never upscale).
- **Code blocks**: a block wider than the page content width is uniformly scaled down until it fits. Scaling (rather than line-wrapping) preserves monospace formatting and keeps the line-number gutter aligned — wrapping a logical line into several visual rows would desync the gutter, which renders one number per logical line.
- **Tables**: cell content is allowed to wrap (`overflow-wrap`/`word-break`) so a table with long unbreakable tokens (URLs, hashes) fits the page width. A table that is still wider than the page (many columns) is scaled down to fit, like code.
- This applies to the **export only**; the on-screen preview keeps its horizontal scroll behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `md-to-pdf`: A new **Wide Content Fit on Export** requirement is added — exported code blocks and tables MUST be fit to the page width (no clipping), via cell-wrapping and/or down-scaling. No existing requirement's behavior is removed; this complements **PDF Export** and **Print Typography** and must preserve the **Code Line Numbers** gutter alignment.

## Impact

- Modified `src/MdToPdf.tsx` — extend the export path (alongside `fitDiagramsToPage`) with a fit pass that measures each non-Mermaid `pre` and `table` in the print clone against the A4 content width (`PAGE_CONTENT_W`) and scales the overflowing ones to fit. Requires measuring the clone laid out at the print width before scaling.
- Modified `src/MdToPdf.css` — print-scoped rules to wrap table cell content; possibly a wrapper/scale rule for code blocks.
- No new dependencies, no backend. Export stays native `window.print()` with no Paged.js.

## Open Decision (carried from exploration)

For **code blocks**, this proposal chooses **scale-to-fit** (fidelity: keep formatting + line numbers, accept smaller text) over **line-wrapping** (keep text size, accept wrapped lines + gutter desync). If the preference is instead to keep text size and wrap, the spec/design should flip before implementation.
