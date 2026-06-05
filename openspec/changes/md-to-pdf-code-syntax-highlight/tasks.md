## 1. Dependency

- [x] 1.1 Add `highlight.js` (`^11`) to `package.json` dependencies and install
- [x] 1.2 Confirm it is reachable via dynamic import (`highlight.js/lib/common`) and not pulled into the main bundle

## 2. Highlight in the render effect

- [x] 2.1 In `src/MdToPdf.tsx`, leave the `marked` `code()` renderer unchanged (Mermaid → `<pre class="mermaid">`, else `false`)
- [x] 2.2 In the existing post-render effect, after `el.innerHTML = html`, lazily `await import("highlight.js/lib/common")`
- [x] 2.3 Select non-Mermaid blocks with `el.querySelectorAll("pre:not(.mermaid) > code")` and call `hljs.highlightElement(block)` on each, wrapped in try/catch so a single failure leaves that block as plain monospace
- [x] 2.4 Respect the effect's `cancelled` guard (don't decorate after unmount/re-run); tokenization is language-only, so it need not re-run on theme change

## 3. Code theme state & selector

- [x] 3.1 Add a `CodeThemeChoice` type (`"auto"` + `github`, `github-dark`, `monokai`, `dracula`, `nord`, `solarized-light`, `solarized-dark`, `atom-one-dark`) and `const [codeTheme, setCodeTheme] = useState<CodeThemeChoice>("auto")`
- [x] 3.2 Compute `effectiveCodeTheme = codeTheme === "auto" ? (theme === "dark" ? "github-dark" : "github") : codeTheme`
- [x] 3.3 Add a labeled `<select>` to the toolbar (next to the Mermaid theme selector, using `.mdp-select`) with options: Auto (app theme), GitHub Light, GitHub Dark, Monokai, Dracula, Nord, Solarized Light, Solarized Dark, Atom One Dark
- [x] 3.4 Set `data-mdp-code-theme={effectiveCodeTheme}` on the `.mdp-content` preview element

## 4. Theme token colors (CSS)

- [x] 4.1 In `src/MdToPdf.css`, add one scoped block per theme (`.mdp-content[data-mdp-code-theme="<name>"] …`) adapted from highlight.js's official theme files, setting `code.hljs` background/foreground and the primary token groups (keyword, string, comment, number, title/function & class, attr/property, built_in/type, literal, meta, tag, symbol)
- [x] 4.2 Verify unmapped token classes inherit the block foreground (neutral fallback)

## 5. Export (inherit selection; Auto prints light)

- [x] 5.1 In `exportPdf`, after cloning, pin the clone to light under Auto: `if (codeTheme === "auto") clone.setAttribute("data-mdp-code-theme", "github")` (explicit themes carry over unchanged via `cloneNode`)
- [x] 5.2 Confirm the existing print rules (`code, pre, pre *` monospace; `.mdp-content` `print-color-adjust: exact`) apply to the `hljs-` spans and theme backgrounds
- [x] 5.3 Add `codeTheme` to `exportPdf`'s `useCallback` dependency list

## 6. Line numbers, font & GitHub gray

- [x] 6.1 Add an `addLineNumbers(code)` helper in `src/MdToPdf.tsx` that prepends a `<span class="mdp-ln" aria-hidden>` gutter (one number per line, derived from `code.textContent`) to each `pre:not(.mermaid) > code`, guarded against double-insert
- [x] 6.2 Call it in the render effect before highlighting, in its own `forEach`, so numbers are added independently of highlight.js (unknown-language blocks still get numbers)
- [x] 6.3 Add gutter CSS in `src/MdToPdf.css`: `pre.mdp-has-ln` flex row, `.mdp-ln` non-selectable (`user-select: none`), right-aligned, dimmed, inheriting the theme color; code is `flex: 1; overflow-x: auto`
- [x] 6.4 Set each theme's base text color on `pre:not(.mermaid)` so the gutter inherits a legible color per theme
- [x] 6.5 Change GitHub Light code background from `#ffffff` to GitHub's gray `#f6f8fa`
- [x] 6.6 Switch the code font to `Menlo, Monaco, "Courier New", monospace` (VS Code macOS default) in the preview CSS and the injected print stylesheet; add `.mdp-ln` to the print monospace rule so the gutter stays monospace in the PDF
- [x] 6.7 Expand the seeded `SAMPLE` with a multi-line TypeScript block and a Python block

## 7. Verification

- [x] 7.1 `npm run build` succeeds — no type errors; `highlight.js` is code-split (157K chunk), main bundle unchanged
- [x] 7.2 Dev server (`npm start`) compiles and boots with no runtime/console errors
- [x] 7.3 Code paths inspected against each spec scenario (highlighting applied, theme resolution, Auto-pins-light export, line-number gutter, mermaid excluded, graceful fallback) — see static-verification notes below

> Visual/manual checks pending a human pass (no browser-automation tooling in this environment, and the project has no test suite by convention). Recommended before archive — exercise in `npm start`:
> - [ ] 7.4 Toggle app theme at "Auto": code re-colors GitHub light ⇄ dark; GitHub Light shows the gray background
> - [ ] 7.5 Select an explicit theme (e.g. Dracula): preview re-colors immediately and is unaffected by app-theme toggle
> - [ ] 7.6 Unknown/blank-language block: plain monospace, no console error, still numbered
> - [ ] 7.7 Mermaid block: renders as a diagram, no gutter
> - [ ] 7.8 Export from dark theme at "Auto" → PDF code is GitHub-light with line numbers; explicit theme → PDF uses that theme
