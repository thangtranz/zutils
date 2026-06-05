## 1. Dependency

- [ ] 1.1 Add `highlight.js` (`^11`) to `package.json` dependencies and install
- [ ] 1.2 Confirm it is reachable via dynamic import (`highlight.js/lib/common`) and not pulled into the main bundle

## 2. Highlight in the render effect

- [ ] 2.1 In `src/MdToPdf.tsx`, leave the `marked` `code()` renderer unchanged (Mermaid → `<pre class="mermaid">`, else `false`)
- [ ] 2.2 In the existing post-render effect, after `el.innerHTML = html`, lazily `await import("highlight.js/lib/common")`
- [ ] 2.3 Select non-Mermaid blocks with `el.querySelectorAll("pre:not(.mermaid) > code")` and call `hljs.highlightElement(block)` on each, wrapped in try/catch so a single failure leaves that block as plain monospace
- [ ] 2.4 Respect the effect's `cancelled` guard (don't decorate after unmount/re-run); tokenization is language-only, so it need not re-run on theme change

## 3. Code theme state & selector

- [ ] 3.1 Add a `CodeThemeChoice` type (`"auto"` + `github`, `github-dark`, `monokai`, `dracula`, `nord`, `solarized-light`, `solarized-dark`, `atom-one-dark`) and `const [codeTheme, setCodeTheme] = useState<CodeThemeChoice>("auto")`
- [ ] 3.2 Compute `effectiveCodeTheme = codeTheme === "auto" ? (theme === "dark" ? "github-dark" : "github") : codeTheme`
- [ ] 3.3 Add a labeled `<select>` to the toolbar (next to the Mermaid theme selector, using `.mdp-select`) with options: Auto (app theme), GitHub Light, GitHub Dark, Monokai, Dracula, Nord, Solarized Light, Solarized Dark, Atom One Dark
- [ ] 3.4 Set `data-mdp-code-theme={effectiveCodeTheme}` on the `.mdp-content` preview element

## 4. Theme token colors (CSS)

- [ ] 4.1 In `src/MdToPdf.css`, add one scoped block per theme (`.mdp-content[data-mdp-code-theme="<name>"] …`) adapted from highlight.js's official theme files, setting `code.hljs` background/foreground and the primary token groups (keyword, string, comment, number, title/function & class, attr/property, built_in/type, literal, meta, tag, symbol)
- [ ] 4.2 Verify unmapped token classes inherit the block foreground (neutral fallback)

## 5. Export (inherit selection; Auto prints light)

- [ ] 5.1 In `exportPdf`, after cloning, pin the clone to light under Auto: `if (codeTheme === "auto") clone.setAttribute("data-mdp-code-theme", "github")` (explicit themes carry over unchanged via `cloneNode`)
- [ ] 5.2 Confirm the existing print rules (`code, pre, pre *` monospace; `.mdp-content` `print-color-adjust: exact`) apply to the `hljs-` spans and theme backgrounds
- [ ] 5.3 Add `codeTheme` to `exportPdf`'s `useCallback` dependency list

## 6. Verification

- [ ] 6.1 `npm run build` succeeds — no type errors; `highlight.js` is code-split, main bundle size unchanged
- [ ] 6.2 With the selector at "Auto", the seeded ` ```ts ``` ` block shows GitHub-light tokens in light mode and GitHub-dark in dark mode; toggling the app theme re-colors it
- [ ] 6.3 Selecting an explicit theme (e.g. Dracula) re-colors the preview immediately and does not change when the app theme is toggled
- [ ] 6.4 A block with no language and a block with an unknown language render as plain monospace with no console error
- [ ] 6.5 A ` ```mermaid ``` ` block still renders as a diagram (not highlighted)
- [ ] 6.6 Export with "Auto" from dark theme → the PDF's code uses the GitHub-light palette; export with an explicit theme → the PDF uses that theme
