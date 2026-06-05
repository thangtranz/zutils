## 1. Fit pass on the print clone

- [x] 1.1 Add a `fitWideBlocksToPage(root)` helper (alongside `fitDiagramsToPage`) that imposes print content geometry inline on the clone (`maxWidth:none; margin:0; padding:0; fontSize:14px; boxSizing:border-box`) so on-screen measurement matches the printed layout
- [x] 1.2 In the helper, set inline cell-wrapping on every `th`/`td` (`overflowWrap:anywhere; wordBreak:break-word`) so long unbreakable tokens wrap (no `table-layout: fixed`)
- [x] 1.3 For each `pre:not(.mermaid)`, pick the scroller (`> code` for `.mdp-has-ln`, else the `pre`), read `clientWidth`/`scrollWidth`, and when content overflows apply `zoom = max(MIN_SCALE, clientWidth/scrollWidth)` (MIN_SCALE ≈ 0.5) to the `pre` — never upscale
- [x] 1.4 For each `table`, after wrapping, compare `scrollWidth` to the container width and apply the same floored `zoom` if still overflowing
- [x] 1.5 Skip `pre.mermaid` so diagram sizing (`fitDiagramsToPage`) is unaffected

## 2. Wire into export

- [x] 2.1 In `exportPdf`, append the clone off-screen at `PAGE_CONTENT_W` width (so it is laid out but not visible), call `fitWideBlocksToPage(clone)` after `fitDiagramsToPage`, then clear the off-screen measuring styles before injecting the print stylesheet / printing
- [x] 2.2 Use `style.setProperty("zoom", …)` (avoids the `zoom` TS typing gap) and confirm the line-number gutter stays aligned (gutter + code scale together under `zoom`)

## 3. Verify

- [x] 3.1 A code block with very long lines exports with no characters clipped at the page edge
- [x] 3.2 A narrow code block is unchanged (no upscaling, normal font size)
- [x] 3.3 A wide many-column table exports fully visible (scaled to fit) with no columns cut off
- [x] 3.4 The on-screen preview still scrolls wide code/tables horizontally (export-only behavior)
- [x] 3.5 Multi-line and multi-page documents render correctly (no broken pagination from `zoom`)
- [x] 3.6 `npm run build` succeeds with no type errors
