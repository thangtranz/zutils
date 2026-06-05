## Context

`src/MdToPdf.tsx` parses Markdown with `marked`, injects the resulting HTML into the preview (`previewRef.current.innerHTML = html`), then runs an effect that lazily `import("mermaid")` and renders any `pre.mermaid` blocks into SVG. Export (`exportPdf`) clones the rendered preview into an off-screen `#mdp-fallback` container and injects a `@media print` stylesheet that forces a light page palette and document typography, then calls `window.print()`.

The `marked` renderer's `code()` hook today returns the Mermaid `<pre class="mermaid">` markup for `mermaid`, and `false` for everything else — which makes `marked` emit its default `<pre><code class="language-xxx">…escaped…</code></pre>`. Those blocks reach the DOM already escaped and class-tagged, but with zero token coloring.

This change also closely parallels the **Mermaid theme selector** already shipped (`mermaidTheme` state, `"auto"` sentinel resolved against the app theme, a toolbar `<select>`, export inheriting the preview). The code-theme selector reuses that exact shape.

## Goals / Non-Goals

**Goals:**

- Color fenced code blocks by language in the preview.
- Let the user choose the code theme from the toolbar; default **Auto** (adapts to the app theme), plus a curated set of famous themes that apply regardless of the app theme.
- Drive both preview and export from the single selection (export inherits the preview's highlighted code), matching the Mermaid selector.
- Graceful fallback: no language / unknown language → today's plain monospace, no errors.
- Keep the main bundle lean — the highlighter loads only when the tab renders code, like Mermaid.
- Leave the Mermaid path, file loading, and the source textarea untouched.

**Non-Goals:**

- Line numbers, copy buttons, line highlighting, or diff rendering.
- Highlighting inline code (`` `foo` ``) — only fenced blocks.
- Custom/user-defined themes or per-token overrides — a fixed curated set only.
- Persisting the selection across reloads (component state only, like the Mermaid selector).

## Decisions

### Library: `highlight.js`, lazily imported

Add `highlight.js` as a dependency and load it with `await import("highlight.js/lib/common")` inside the existing render effect — the same lazy-load strategy proven for Mermaid. `lib/common` bundles ~40 of the most-used languages (ts, js, python, bash, json, yaml, sql, …), is markedly smaller than the full build, and is code-split so the main bundle is unaffected.

Why highlight.js over alternatives: it reads the existing `class="language-xxx"` hint via `highlightElement`, auto-handles unknown languages (leaves text intact, just adds the `hljs` class), needs no per-language registration at call sites, and — crucially for theming — its themes are pure CSS (no per-theme JS), so a theme switch is just a CSS-scope swap. Prism needs per-language imports; Shiki ships heavy WASM + per-theme JSON.

### Tokenize in the render effect, not the `marked` renderer

`marked`'s `code()` hook is synchronous, so it cannot `await import(...)`. Keep the renderer exactly as-is (Mermaid → `<pre class="mermaid">`, everything else → `false`). Do the highlighting in the existing post-render effect, immediately after `el.innerHTML = html`:

```
el.querySelectorAll<HTMLElement>("pre:not(.mermaid) > code").forEach(block => {
  try { hljs.highlightElement(block); } catch { /* leave plain */ }
});
```

`highlightElement` adds the `hljs` class and wraps tokens in `<span class="hljs-keyword">` etc. — it tokenizes, it does **not** carry color. Color comes from theme CSS (below). Guard each call in try/catch so one odd block can't blank the preview, mirroring the per-node Mermaid error handling already in place, and respect the effect's existing `cancelled` guard. Tokenization is language-only and independent of the chosen theme, so it does not need to re-run when the theme changes — the theme is swapped purely in CSS via a data attribute.

### Theme model: an `"auto"` sentinel resolved against the app theme

Mirror the Mermaid selector exactly:

```
type CodeThemeChoice =
  | "auto"
  | "github" | "github-dark"
  | "monokai" | "dracula" | "nord"
  | "solarized-light" | "solarized-dark"
  | "atom-one-dark";

const [codeTheme, setCodeTheme] = useState<CodeThemeChoice>("auto");
const effectiveCodeTheme =
  codeTheme === "auto" ? (theme === "dark" ? "github-dark" : "github") : codeTheme;
```

`"auto"` is the default, so on first load code adapts to the app theme. A `<select>` in the toolbar (next to the Mermaid theme selector, styled with the existing `.mdp-select`) offers: `Auto (app theme)`, `GitHub Light`, `GitHub Dark`, `Monokai`, `Dracula`, `Nord`, `Solarized Light`, `Solarized Dark`, `Atom One Dark`.

### Colors via theme-scoped CSS keyed by a data attribute

highlight.js theme stylesheets target bare `.hljs` / `.hljs-*` selectors globally and can't be scoped per-selection without a transform. Instead, set the resolved theme on the preview container and own the CSS:

```
<div ref={previewRef} className="mdp-content"
     data-mdp-code-theme={effectiveCodeTheme} style={contentVars} />
```

In `src/MdToPdf.css`, add one block per supported theme, each ruleset prefixed with its scope and adapted from highlight.js's official theme file (so colors are faithful), covering the code background/foreground plus the primary token groups (keyword, string, comment, number, title/function & class, attr/property, built_in/type, literal, meta, tag, symbol):

```
.mdp-content[data-mdp-code-theme="dracula"] code.hljs { background:#282a36; color:#f8f8f2; }
.mdp-content[data-mdp-code-theme="dracula"] .hljs-keyword { color:#ff79c6; }
/* …per theme… */
```

Unmapped token classes inherit the block foreground, an acceptable neutral default. This keeps both the theme-aware preview and the forced-light export fully controllable in our own CSS, with no runtime stylesheet injection or unload gymnastics.

### Export inherits the selection; Auto prints light

`exportPdf` clones the already-highlighted preview, so the token spans **and** the `data-mdp-code-theme` attribute come along (`cloneNode` copies attributes), and the scoped CSS in `MdToPdf.css` applies to the clone during print. So an explicitly-chosen theme prints as-is — the same "export uses the selected theme" contract the Mermaid selector established.

The one special case is **Auto**: its resolved value is `github-dark` when the app is dark, which would print dark code on the forced-white export page. Since export is always light (the **Light Export Rendering** requirement), pin the clone to the light variant when the selection is Auto:

```
if (codeTheme === "auto") clone.setAttribute("data-mdp-code-theme", "github");
```

The existing print rule forcing a monospace font on `code, pre, pre *` already covers the `hljs-` spans, and `print-color-adjust: exact` (already set on `.mdp-content` for print) ensures the token colors and theme background render rather than being dropped.

### Line numbers via a flex gutter (not a highlight.js plugin)

highlight.js has no built-in line numbering, and the community plugin can't robustly wrap lines when a single token (e.g. a block comment) spans newlines. Instead, an `addLineNumbers` helper prepends a non-selectable `<span class="mdp-ln">` gutter — its text is just `1\n2\n…\nN` (line count from `code.textContent`) — as a sibling of `<code>` inside `<pre>`. CSS lays the `<pre>` out as a flex row: the gutter is fixed-width and `user-select: none`, the code is `flex: 1; overflow-x: auto`, so horizontal scrolling moves the code while the numbers stay put and aligned (no line wrapping inside `<pre>` keeps the 1:1 row alignment reliable). This never touches the highlighted HTML, so it can't corrupt token spans, and it works for unknown-language blocks too.

The pass runs in the render effect **before** highlighting and independently of it (its own `forEach`), so numbers appear even if highlight.js fails to load or the language is unknown. The gutter inherits the active theme's code color (set on `<pre>` per theme) at reduced opacity, so it's legible on every theme background. Because export clones the rendered preview, the gutters clone along and print in the PDF; `.mdp-ln` is added to the print stylesheet's monospace rule so the digits stay monospace and aligned (the sans-serif print rule would otherwise win on specificity). Known limitation: a code block tall enough to span multiple PDF pages may not paginate cleanly through the flex gutter — acceptable since these documents' snippets are short.

### Code font matches the editor default; GitHub Light uses gray

Code renders in `Menlo, Monaco, "Courier New", monospace` — VS Code's default macOS `editor.fontFamily` — in both the preview CSS and the injected print stylesheet, replacing the previous `ui-monospace, SFMono-Regular, …` stack (which resolved to SF Mono). The GitHub Light theme's code-block background is GitHub's gray `#f6f8fa` (matching GitHub.com and the existing `--mdp-code-bg`), not highlight.js's pure-white `github` background; since "Auto" in light mode and the Auto export both resolve to GitHub Light, the default code block is gray.

### Sample document

The seeded `SAMPLE` carries a multi-line TypeScript block (interface, comment, template literal) and a Python block (docstring, keywords, numbers), so highlighting, line numbers, and the default Auto theme are all visible on first load.

## Risks / Trade-offs

- **Bundle size:** `highlight.js/lib/common` adds a code-split chunk (~tens of KB gzipped) loaded only on this tab. Accepted — it parallels the already-accepted Mermaid lazy chunk and never touches the main bundle. Themes add only CSS.
- **Theme CSS maintenance:** each curated theme is hand-transcribed (scoped) from highlight.js's official file. Mitigation: the set is small and the source themes are stable; unmapped tokens degrade to neutral foreground rather than breaking.
- **Dark theme on white page (explicit choice):** picking, say, Dracula and exporting prints a dark code block on a white page. Accepted as the user's explicit choice — identical to the precedent set by selecting a dark Mermaid theme and exporting.
- **Escaping:** code is HTML-escaped by `marked` before reaching the DOM, and `highlightElement` re-tokenizes existing text content (no eval). No new injection surface.

## Migration Plan

Purely additive within the existing tab, and structurally identical to the shipped Mermaid theme selector. New dependency is dynamically imported, so no main-bundle or runtime change for the other tools. Default `"auto"` makes code adapt to the app theme out of the box; blocks without a language simply look as they do today. Rollback: revert the diff and drop the `highlight.js` dependency.

## Open Questions

None blocking. Possible later iterations:
- Persist the code-theme selection (localStorage), as also flagged for the Mermaid selector.
- Broaden language coverage (full `highlight.js` build or Shiki) if `lib/common` proves insufficient.
- Highlight inline code spans.
