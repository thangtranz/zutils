## Why

Sharing the Markdown we write (specs, runbooks, on-call notes — often with Mermaid diagrams) usually means a clunky detour: paste into a web converter, screenshot diagrams separately, or fight a heavyweight pandoc/LaTeX toolchain. zutils already hosts companion ops tools (PagerDuty calendar, ANSI converter, SQS visualizer) as in-browser tabs. Adding a Markdown→PDF tab — live preview with rendered Mermaid, then export to a clean PDF — gives us a one-stop, client-side way to turn Markdown into a shareable document, right alongside the other utilities.

## What Changes

- Add a new `Markdown to PDF` tab to the zutils sidebar (fourth nav entry after PagerDuty, ANSI, SQS).
- New `src/MdToPdf.tsx`: a two-pane tool — Markdown source on the left (textarea + load-file), a styled rendered preview on the right — matching the ANSI Converter layout.
- Render Markdown to HTML with `marked`, and render fenced ```mermaid``` blocks as diagrams with `mermaid` (both run in the browser).
- Export to PDF via the browser's native print-to-PDF (`window.print()`) using a print-scoped stylesheet, so only the rendered document prints (GitHub-style page styling). This is the browser equivalent of the original tool's "Chrome prints the page to PDF" approach — no server, no bundled Chromium.
- GitHub-style light/dark styling that follows the app's existing theme (`ThemeContext`); Mermaid uses its `default`/`dark` theme to match.
- Lazy-load `mermaid` (dynamic import) so its weight doesn't bloat the initial bundle or the other tabs.
- Update `README.md` with a "Markdown to PDF" section.

## Capabilities

### New Capabilities

- `md-to-pdf`: A browser tab that converts Markdown (including Mermaid diagrams) to a styled, printable document and exports it to PDF via the browser's print dialog. Covers source input, live preview, Mermaid rendering, theme integration, and PDF export.

### Modified Capabilities

None.

## Impact

- New file `src/MdToPdf.tsx` (+ optional `src/MdToPdf.css`).
- Modified `src/App.tsx` — add `"md"` to the `Page` type, a `NAV_ITEMS` entry, and a render branch in `<main>`.
- Modified root `package.json` — add `marked` and `mermaid` runtime dependencies.
- Modified `README.md` — add the "Markdown to PDF" feature section.
- Bundle size grows (chiefly from `mermaid`); mitigated by lazy-loading mermaid only when the tab is used. No backend, no new deploy steps — the feature ships with the existing GitHub-Pages build.
