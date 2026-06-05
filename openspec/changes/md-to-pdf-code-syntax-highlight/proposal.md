## Why

Fenced code blocks in the Markdown to PDF tool render as flat, single-color monospace text. The `marked` renderer in `src/MdToPdf.tsx` only special-cases ` ```mermaid ``` ` (turning it into a diagram) and returns `false` for every other language, so a ` ```ts ``` ` or ` ```python ``` ` block prints as undifferentiated grey text with no token coloring. The sample document already advertises a TypeScript snippet, but it has no highlighting in either the preview or the exported PDF. For a tool whose whole purpose is producing readable documents, unhighlighted code reads as a regression against GitHub's own rendering, which the tool otherwise imitates.

## What Changes

- Syntax-highlight non-Mermaid fenced code blocks (` ```ts ```, ```python ```, ```bash ```, … `) in the **preview**, using the language hint from the fence.
- Add a **Code Theme selector** to the toolbar, mirroring the existing Mermaid theme selector. It defaults to **Auto**, which adapts to the app theme (GitHub-light tokens in light mode, GitHub-dark tokens in dark mode). When the user picks an explicit theme, code renders with that theme regardless of the app theme.
- Support a curated set of famous code themes: **GitHub Light**, **GitHub Dark**, **Monokai**, **Dracula**, **Nord**, **Solarized Light**, **Solarized Dark**, **Atom One Dark**.
- The selected theme drives both the **preview** and the **export** — the export inherits the preview's already-highlighted code (no separate export path), exactly like the Mermaid selector. With **Auto**, the exported PDF uses the GitHub-light palette (the export page is always light), so printed code stays legible on white paper.
- Blocks with no language hint, or an unknown language, fall back gracefully to plain monospace rendering (no error, no broken markup).
- Mermaid blocks are untouched — they still render as diagrams.

## Capabilities

### New Capabilities

- `md-to-pdf`: **Code Syntax Highlighting** — fenced code blocks are tokenized and colored per language in both the preview and the export.
- `md-to-pdf`: **Code Theme Selection** — a toolbar selector chooses the highlight theme (Auto + a set of famous themes), governing both preview and export.

### Modified Capabilities

None. (The new behavior layers onto the existing render/export pipeline without changing the PDF Export, Print Typography, Export Page Identity, or Light Export Rendering contracts. It parallels the established Mermaid theme-selection design.)

## Impact

- Modified `src/MdToPdf.tsx` —
  - Add a `codeTheme` state (`"auto"` plus the supported theme values, default `"auto"`), resolve the effective theme (`auto` → `github`/`github-dark` from the app theme), and expose a `<select>` in the toolbar alongside the Mermaid theme selector.
  - After the markdown HTML is injected, tokenize each non-Mermaid `pre > code` block with a lazily-imported highlighter (mirroring the existing lazy `import("mermaid")`); keep the Mermaid path unchanged.
  - Set the resolved theme as a `data-mdp-code-theme` attribute on the preview container so theme CSS can scope by selection; for export under **Auto**, the off-screen clone is pinned to the light variant.
- Modified `src/MdToPdf.css` — add per-theme token color rules (adapted from highlight.js's official theme files) scoped by `.mdp-content[data-mdp-code-theme="…"]`, including each theme's code background/foreground.
- New dependency: a client-side syntax highlighter (`highlight.js`), code-split via dynamic import so the main bundle is unaffected — the same strategy already used for Mermaid. Themes are CSS only (no per-theme JS).
- No backend, no API, no change to the source textarea or file-loading flow.
