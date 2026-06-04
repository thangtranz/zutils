## Context

The Markdown to PDF tab (`src/MdToPdf.tsx`) renders Markdown via `marked`, draws Mermaid diagrams in a preview pane, and originally exported by calling `window.print()` with a print-scoped stylesheet that used the CSS `visibility` trick to print only the `.mdp-print-area` element.

Two limitations drove this change. First, Chrome injects its own header (page title + date) and footer (page URL + page number) into the page-margin area whenever printing; CSS can only suppress them by zeroing the relevant page margin, and there is no way to *customize* them. Second, a professional export wants an export timestamp and "Page X of Y" — but Chrome's print engine does not implement generated content (`counter(page)`, `counter(pages)`) in `@page` margin-at-rules, so pure CSS cannot produce per-page numbers.

The fix is to paginate client-side with **Paged.js** (a CSS Paged Media polyfill), which *does* support `@page` margin boxes with page counters.

## Goals / Non-Goals

**Goals:**

- Remove the browser's default print header/footer entirely.
- Render a custom footer on every page: export timestamp (local time) bottom-left, `Page X of Y` bottom-right.
- Keep the export lazy — Paged.js must not enter the initial bundle or affect the other tabs.
- Preserve the existing render pipeline (marked + Mermaid + theme) unchanged.

**Non-Goals:**

- Server-side/headless PDF generation. Export stays a browser print.
- Splitting oversized diagrams across page breaks (Paged.js limitation; accepted).
- A configurable footer template or page-size selector. Fixed A4 + the two footer fields.
- Changing what the on-screen preview looks like.

## Decisions

### Paginate with Paged.js into an off-screen target

On export, the rendered preview node is cloned and handed to `new Previewer().preview(clone, [stylesheets], target)`, which lays the content out into `.pagedjs_page` elements inside a `#mdp-paged` div appended to `document.body`. On print, `#root` is hidden and only `#mdp-paged` prints.

`#mdp-paged` is parked **off-screen** (`position: fixed; left: -10000px`) rather than `display: none`, because Paged.js measures element heights during pagination and `display: none` collapses them to zero, breaking the layout. On print, a `@media print` rule resets it to `position: static`.

**Alternative considered:** keep `window.print()` and only tweak `@page` margins (zero the top margin to drop Chrome's header, keep the bottom for its footer). Rejected — it cannot produce a custom timestamp and the footer would still show Chrome's URL.

### Custom footer via injected `@page` margin boxes

The print stylesheet is built as a string at export time and passed to Paged.js as an inline sheet (`polisher.add` accepts `{ "name": cssText }`). It sets:

```
@page {
  size: A4; margin: 16mm 14mm 18mm;
  @bottom-left  { content: "<timestamp>"; ... }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); ... }
}
```

Building the CSS at click time lets the live timestamp be interpolated directly into the `content` string.

### Local-time timestamp

The timestamp is formatted from `new Date()` local fields as `YYYY-MM-DD HH:MM` (no UTC conversion), per the user's preference that the footer reflect their local time.

### Theme-aware page colors

`.pagedjs_page` background and the footer color are set from the active theme palette (`palette.bg`, `palette.muted`), with `print-color-adjust: exact` on the content so the chosen colors render in the PDF rather than being dropped by the browser's default background-suppression.

### Disconnect ResizeObservers after layout

Each Paged.js `Page` attaches a `ResizeObserver` that re-runs layout on resize. When the print dialog closes, the resulting reflow fires it and Paged.js dereferences DOM it has already consumed, throwing "Cannot read properties of null (reading 'nextSibling')". Since reflow is unnecessary after the initial pagination, the handler iterates `flow.pages` and calls `removeListeners()` on each before printing.

### Cleanup on `afterprint`

An `afterprint` listener removes `#mdp-paged` and detaches itself; the next export starts by removing any stale `#mdp-paged` first. On any error the same cleanup runs.

### Type declaration for `pagedjs`

`pagedjs` ships no TypeScript types, so `src/pagedjs.d.ts` declares the minimal `Previewer` surface used (`preview(content, stylesheets?, renderTo?)`) to keep `tsc`/CRA build green.

## Risks / Trade-offs

- **Risk:** Paged.js internals are version-sensitive (the observer-teardown relies on `flow.pages[].removeListeners()`). [Mitigation] calls are wrapped in try/catch and pinned to `pagedjs@^0.4.3`; failure degrades to a still-working print, not a crash.
- **Risk:** an element taller than one page (e.g., a large Mermaid SVG) is clipped. [Mitigation] documented limitation; acceptable for v1.
- **Trade-off:** first export incurs a brief delay while the Paged.js chunk loads. Accepted — keeps it out of the main bundle.
- **Trade-off:** export reflects the current theme; a dark-theme export produces a dark page. Accepted (theme-consistent); revisit if a forced-light export is wanted.

## Migration Plan

Additive/behavioral within the existing tab. No data, no flags. Rollback: revert the diff and drop `pagedjs` from `package.json` — the export reverts to `window.print()`.

## Open Questions

None blocking. Possible later iterations:

- Force light theme on export regardless of app theme.
- Allow splitting/scaling oversized diagrams to fit a page.
- Make the footer fields (timestamp format, left/right content) configurable.
