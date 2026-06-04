## 1. Dependencies

- [ ] 1.1 Add `marked` (`^12`) and `mermaid` (`^11.15`) to root `package.json` dependencies
- [ ] 1.2 Run install (`yarn` / `npm install`) and confirm types resolve under `react-scripts`

## 2. Component Skeleton

- [ ] 2.1 Create `src/MdToPdf.tsx` with a default export and a two-pane layout (left: source, right: preview), mirroring `AnsiConverter.tsx`
- [ ] 2.2 Add `useTheme()` and style panes with existing CSS variables (`--bg-main`, `--text-primary`, …)
- [ ] 2.3 Add a bundled `SAMPLE` Markdown doc (headings, table, code block, one `mermaid` diagram) as the initial textarea value
- [ ] 2.4 Add a toolbar with an "Export PDF" button

## 3. Source Input

- [ ] 3.1 Controlled textarea bound to `source` state
- [ ] 3.2 "Load file" control accepting `.md,.markdown`; read file text into `source`

## 4. Render Pipeline

- [ ] 4.1 Configure `marked` with a custom `code` renderer: `mermaid` fences → `<pre class="mermaid">` (HTML-escaped); others → default
- [ ] 4.2 Render `marked.parse(source)` into the preview via `dangerouslySetInnerHTML`
- [ ] 4.3 Apply GitHub-style preview CSS (headings, code, tables, blockquote, links, hr) scoped to the preview container, light/dark aware
- [ ] 4.4 Lazy-load mermaid via dynamic `import("mermaid")` on first diagram render
- [ ] 4.5 After preview commits, `mermaid.initialize({ startOnLoad:false, theme, securityLevel:'loose' })` then `mermaid.run()`; re-run on `source` change
- [ ] 4.6 Wrap `mermaid.run()` in try/catch; show an inline error in the diagram's place on invalid syntax
- [ ] 4.7 Re-initialize + re-run mermaid with `dark`/`default` theme when `useTheme()` changes

## 5. PDF Export

- [ ] 5.1 "Export PDF" calls `window.print()`
- [ ] 5.2 Add `@media print` CSS: hide sidebar/input pane/toolbar, show only the preview; `@page { size: A4; margin: 16mm 14mm }`
- [ ] 5.3 Verify diagrams (SVG) and tables print without clipping

## 6. App Wiring

- [ ] 6.1 In `src/App.tsx`: add `"md"` to the `Page` type
- [ ] 6.2 Add `NAV_ITEMS` entry `{ id: "md", label: "Markdown to PDF", icon: "📄" }` (after `sqs`)
- [ ] 6.3 Import `MdToPdf` and add `{page === "md" && <MdToPdf />}` to the `<main>` switch

## 7. Docs + Verification

- [ ] 7.1 Add a "Markdown to PDF" section to `README.md` (what it does, how to export via the print dialog)
- [ ] 7.2 `npm start`: edit/paste Markdown, confirm live preview incl. a rendered mermaid diagram
- [ ] 7.3 Toggle light/dark; confirm preview and diagram recolor
- [ ] 7.4 Click "Export PDF"; in the print dialog confirm only the document prints (no sidebar/input/toolbar) and the diagram is present
- [ ] 7.5 Load a `.md` file and confirm it populates the source and renders
- [ ] 7.6 `npm run build` succeeds; confirm mermaid is split into its own lazy chunk (not the main bundle)
