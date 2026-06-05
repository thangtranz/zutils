import { useState, useMemo, useRef, useEffect, useCallback, CSSProperties } from "react";
import { marked } from "marked";
import { useTheme } from "./ThemeContext";
import "./MdToPdf.css";

const SAMPLE = `# Project Roadmap

A quick demo of **Markdown to PDF** — edit on the left, export on the right.

## Highlights

- Renders standard Markdown with GitHub-style theming
- Draws \`mermaid\` diagrams inline
- Exports via your browser's *Save as PDF*

## Status table

| Area      | Owner   | Status      |
| --------- | ------- | ----------- |
| Ingestion | Thang   | ✅ Shipped  |
| Reporting | Team    | 🚧 Building |
| Alerts    | TBD     | ⏳ Planned  |

## Flow

\`\`\`mermaid
flowchart LR
  A[Markdown] --> B{Render}
  B --> C[HTML + Mermaid]
  C --> D[Print to PDF]
\`\`\`

## Snippet

\`\`\`ts
interface Person {
  name: string;
  role?: string;
}

// Build a friendly line for each person
export function greet(people: Person[]): string {
  return people.map(p => \`Hello, \${p.name}!\`).join(", ");
}
\`\`\`

\`\`\`python
def fib(n: int) -> list[int]:
    """Return the first n Fibonacci numbers."""
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print(fib(10))  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

> Tip: switch the app theme — diagrams recolor to match, and pick a **Code Theme** to restyle these snippets.
`;

// GitHub-style palettes, ported from the original CLI tool.
const PALETTES = {
  light: {
    bg: "#ffffff", fg: "#1f2328", muted: "#656d76",
    border: "#d0d7de", codeBg: "#f6f8fa", link: "#0969da", mermaid: "default",
  },
  dark: {
    bg: "#0d1117", fg: "#e6edf3", muted: "#9198a1",
    border: "#30363d", codeBg: "#161b22", link: "#4493f8", mermaid: "dark",
  },
} as const;

// "auto" follows the app theme (palette.mermaid); the rest are Mermaid's
// built-in themes, selectable regardless of the app theme.
type MermaidThemeChoice =
  | "auto"
  | "default"
  | "dark"
  | "forest"
  | "neutral"
  | "base";

const MERMAID_THEME_OPTIONS: { value: MermaidThemeChoice; label: string }[] = [
  { value: "auto", label: "Auto (app theme)" },
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "forest", label: "Forest" },
  { value: "neutral", label: "Neutral" },
  { value: "base", label: "Base" },
];

// "auto" follows the app theme (GitHub light/dark); the rest are fixed,
// famous highlight.js themes selectable regardless of the app theme. The
// non-auto values double as the `data-mdp-code-theme` attribute that the
// scoped token CSS in MdToPdf.css keys off of.
type CodeThemeChoice =
  | "auto"
  | "github"
  | "github-dark"
  | "monokai"
  | "dracula"
  | "nord"
  | "solarized-light"
  | "solarized-dark"
  | "atom-one-dark";

const CODE_THEME_OPTIONS: { value: CodeThemeChoice; label: string }[] = [
  { value: "auto", label: "Auto (app theme)" },
  { value: "github", label: "GitHub Light" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "monokai", label: "Monokai" },
  { value: "dracula", label: "Dracula" },
  { value: "nord", label: "Nord" },
  { value: "solarized-light", label: "Solarized Light" },
  { value: "solarized-dark", label: "Solarized Dark" },
  { value: "atom-one-dark", label: "Atom One Dark" },
];

function escapeHTML(str: string): string {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A4 content box in CSS px (96dpi), matching the @page margins below
// (20mm top / 18mm bottom / 24mm sides). A small safety margin keeps a
// full-height diagram from rounding past the page edge.
const MM_TO_PX = 96 / 25.4;
const PAGE_CONTENT_W = (210 - 24 * 2) * MM_TO_PX; // ≈ 612px
const PAGE_CONTENT_H = (297 - 20 - 18 - 6) * MM_TO_PX; // ≈ 956px

// Lock every rendered Mermaid SVG to an explicit pixel size that fits one page,
// preserving aspect ratio and never upscaling. Done on the print clone before
// the browser paginates it, so a diagram never overflows the page width. Reads
// the viewBox (intrinsic size) since Mermaid's width attribute is "100%", not a
// pixel value.
function fitDiagramsToPage(root: HTMLElement): void {
  root.querySelectorAll<SVGSVGElement>("pre.mermaid svg").forEach(svg => {
    const vb = svg.getAttribute("viewBox");
    if (!vb) return;
    const [, , w, h] = vb.split(/[\s,]+/).map(Number);
    if (!w || !h) return;
    const scale = Math.min(PAGE_CONTENT_W / w, PAGE_CONTENT_H / h, 1);
    const fw = Math.floor(w * scale);
    const fh = Math.floor(h * scale);
    svg.style.maxWidth = "none";
    svg.style.width = `${fw}px`;
    svg.style.height = `${fh}px`;
    svg.setAttribute("width", String(fw));
    svg.setAttribute("height", String(fh));
  });
}

// Prepend a non-selectable line-number gutter to a code block. The gutter is a
// sibling of <code> inside <pre>; CSS lays them out as a flex row so the numbers
// stay aligned with the code lines (code scrolls, numbers don't). Independent of
// highlight.js, and cloned into the export, so numbers show even for unknown
// languages and appear in the printed PDF.
function addLineNumbers(code: HTMLElement): void {
  const pre = code.parentElement;
  if (!pre || pre.querySelector(".mdp-ln")) return;
  const lineCount = (code.textContent ?? "")
    .replace(/\n$/, "")
    .split("\n").length;
  const gutter = document.createElement("span");
  gutter.className = "mdp-ln";
  gutter.setAttribute("aria-hidden", "true");
  gutter.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join(
    "\n"
  );
  pre.classList.add("mdp-has-ln");
  pre.insertBefore(gutter, code);
}

// Preserve ```mermaid``` fences as <pre class="mermaid">; everything else uses
// the default renderer (return false). Mirrors the original tool's renderer.
marked.use({
  renderer: {
    code(code: any, lang?: string) {
      const text = typeof code === "object" ? code.text : code;
      const language = typeof code === "object" ? code.lang : lang;
      if (language === "mermaid") {
        return `<pre class="mermaid">${escapeHTML(text)}</pre>`;
      }
      return false;
    },
  },
});

export default function MdToPdf() {
  const { theme } = useTheme();
  const [source, setSource] = useState(SAMPLE);
  const [fileName, setFileName] = useState("");
  const [mermaidTheme, setMermaidTheme] = useState<MermaidThemeChoice>("auto");
  const [codeTheme, setCodeTheme] = useState<CodeThemeChoice>("auto");
  const previewRef = useRef<HTMLDivElement>(null);

  const palette = PALETTES[theme];
  // "auto" tracks the app theme; an explicit choice overrides it.
  const effectiveMermaidTheme =
    mermaidTheme === "auto" ? palette.mermaid : mermaidTheme;
  // "auto" maps to the GitHub light/dark theme for the current app theme; an
  // explicit choice overrides it. Drives the `data-mdp-code-theme` attribute.
  const effectiveCodeTheme: Exclude<CodeThemeChoice, "auto"> =
    codeTheme === "auto"
      ? theme === "dark"
        ? "github-dark"
        : "github"
      : codeTheme;
  const html = useMemo(() => marked.parse(source) as string, [source]);

  const contentVars = {
    "--mdp-bg": palette.bg,
    "--mdp-fg": palette.fg,
    "--mdp-muted": palette.muted,
    "--mdp-border": palette.border,
    "--mdp-code-bg": palette.codeBg,
    "--mdp-link": palette.link,
  } as CSSProperties;

  // Render markdown HTML, then render Mermaid diagrams into it. Re-runs when the
  // source or theme changes; setting innerHTML fresh each time gives mermaid
  // unprocessed nodes so theme toggles recolor diagrams.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    el.innerHTML = html;
    let cancelled = false;

    // Add line-number gutters first, independent of highlight.js, so numbers
    // appear even if highlighting fails to load or the language is unknown.
    // Re-created fresh each run since innerHTML is reset above.
    el.querySelectorAll<HTMLElement>("pre:not(.mermaid) > code").forEach(
      addLineNumbers
    );

    // Syntax-highlight non-Mermaid fenced code blocks. marked emits them as
    // <pre><code class="language-xxx">…</code></pre>; highlight.js tokenizes
    // them into <span class="hljs-…"> spans (colors come from the scoped theme
    // CSS in MdToPdf.css). Lazily imported like Mermaid so it stays out of the
    // main bundle. Token colors are theme-driven via data-mdp-code-theme, so
    // this pass only needs to re-run when the source (html) changes.
    (async () => {
      const blocks = Array.from(
        el.querySelectorAll<HTMLElement>("pre:not(.mermaid) > code")
      );
      if (blocks.length === 0) return;
      try {
        const hljs = (await import("highlight.js/lib/common")).default;
        if (cancelled) return;
        for (const block of blocks) {
          if (cancelled) return;
          try {
            hljs.highlightElement(block);
          } catch {
            // Leave this block as plain monospace; others still highlight.
          }
        }
      } catch {
        // highlight.js failed to load; leave the raw code blocks in place.
      }
    })();

    (async () => {
      const nodes = Array.from(el.querySelectorAll<HTMLElement>("pre.mermaid"));
      if (nodes.length === 0) return;
      try {
        const mermaid = (await import("mermaid")).default;
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          theme: effectiveMermaidTheme,
          securityLevel: "loose",
          // Render labels as plain SVG <text>, not HTML <foreignObject>, so
          // diagram labels render reliably in the printed PDF (foreignObject
          // content is inconsistently rasterized by print engines).
          htmlLabels: false,
          flowchart: { htmlLabels: false },
        });
        // Render per-node so one invalid diagram doesn't break the others.
        for (const node of nodes) {
          if (cancelled) return;
          try {
            await mermaid.run({ nodes: [node] });
          } catch (err) {
            node.innerHTML = `<div class="mdp-diagram-error">Diagram error: ${escapeHTML(
              err instanceof Error ? err.message : String(err)
            )}</div>`;
          }
        }
      } catch {
        // mermaid failed to load; leave the raw code blocks in place.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [html, effectiveMermaidTheme]);

  const loadFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setSource((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }, []);

  // Export to PDF via the browser's native print. We clone the rendered
  // preview, lock each diagram to a one-page pixel size, drop the clone into an
  // off-screen #mdp-fallback container, hide the app UI for print, and call
  // window.print(). We deliberately do NOT paginate with Paged.js: native print
  // keeps Chrome's "Headers and footers" dialog option available and lets the
  // title/URL overrides below surface in (or stay suppressed from) the header.
  const exportPdf = useCallback(() => {
    const el = previewRef.current;
    if (!el) return;

    // The browser's print dialog seeds the PDF filename from document.title and
    // stamps the page URL into the print header/footer. During export, swap the
    // title to the loaded markdown file's name (extension stripped) so the saved
    // PDF is named after the document, and blank the URL with a single space so
    // it doesn't carry the app URL. Both are restored once printing finishes.
    const overridePageIdentity = () => {
      const prevTitle = document.title;
      const prevUrl = location.href;
      document.title = fileName.replace(/\.(md|markdown)$/i, "") || " ";
      try {
        history.replaceState(history.state, "", " ");
      } catch {
        // replaceState can throw on some origins; the title override still helps.
      }
      return () => {
        document.title = prevTitle;
        try {
          history.replaceState(history.state, "", prevUrl);
        } catch {
          /* nothing to restore */
        }
      };
    };
    // Off-screen clone of the rendered preview. Lock each diagram to a fixed
    // pixel size that fits one A4 content box so no diagram overflows the page
    // width when the browser paginates it for print.
    document.getElementById("mdp-fallback")?.remove();
    document.getElementById("mdp-fallback-style")?.remove();

    const clone = el.cloneNode(true) as HTMLElement;
    fitDiagramsToPage(clone);
    // Export is always light. Under "Auto" the preview may carry the dark code
    // theme (data-mdp-code-theme cloned along), so pin the clone to the light
    // GitHub theme; an explicitly-selected theme carries over unchanged.
    if (codeTheme === "auto") {
      clone.setAttribute("data-mdp-code-theme", "github");
    }
    const fb = document.createElement("div");
    fb.id = "mdp-fallback";
    fb.appendChild(clone);
    document.body.appendChild(fb);

    // Print-only sheet: hide the app UI so only the document prints, force a
    // light, full-width, color-exact render so it's readable regardless of the
    // app theme, and apply deterministic document typography (14px body, 1.6
    // leading, GitHub heading scale, sans-serif prose / monospace code) so the
    // PDF reads as a clean document rather than the on-screen preview styling.
    const styleEl = document.createElement("style");
    styleEl.id = "mdp-fallback-style";
    styleEl.textContent = `
      @media screen { #mdp-fallback { display: none; } }
      @media print {
        @page { size: A4; margin: 20mm 24mm 18mm; }
        #root { display: none !important; }
        #mdp-fallback { display: block !important; }
        #mdp-fallback .mdp-content {
          --mdp-bg: #ffffff; --mdp-fg: #1f2328; --mdp-muted: #656d76;
          --mdp-border: #d0d7de; --mdp-code-bg: #f6f8fa; --mdp-link: #0969da;
          max-width: none !important; margin: 0 !important;
          /* @page already supplies the page margin — drop .mdp-content's own
             padding so the two don't stack into a double margin. */
          padding: 0 !important;
          font-size: 14px !important; line-height: 1.6 !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        #mdp-fallback .mdp-content * { line-height: 1.6 !important; }
        /* Clean sans-serif for text, monospace only for code. */
        #mdp-fallback .mdp-content,
        #mdp-fallback .mdp-content *:not(code):not(pre) {
          font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
        #mdp-fallback .mdp-content code,
        #mdp-fallback .mdp-content pre,
        #mdp-fallback .mdp-content pre *,
        #mdp-fallback .mdp-content .mdp-ln {
          font-family: Menlo, Monaco, "Courier New", monospace !important;
        }
        /* Restore Mermaid's own font/leading inside diagrams — it measured text
           in this font to size the boxes, so the global overrides above must not
           reach the SVG or labels overflow their shapes. Placed last to win. */
        #mdp-fallback .mdp-content svg,
        #mdp-fallback .mdp-content svg * {
          font-family: "trebuchet ms", verdana, arial, sans-serif !important;
          line-height: normal !important;
        }
        #mdp-fallback .mdp-content h1 { font-size: 26px !important; line-height: 1.25 !important; }
        #mdp-fallback .mdp-content h2 { font-size: 21px !important; line-height: 1.25 !important; }
        #mdp-fallback .mdp-content h3 { font-size: 17px !important; line-height: 1.25 !important; }
        #mdp-fallback .mdp-content h4 { font-size: 14px !important; line-height: 1.25 !important; }
        #mdp-fallback .mdp-content p,
        #mdp-fallback .mdp-content li,
        #mdp-fallback .mdp-content blockquote {
          margin-top: 0 !important; margin-bottom: 0.5em !important;
        }
        #mdp-fallback pre.mermaid { text-align: center; }
      }
    `;
    document.head.appendChild(styleEl);

    const restorePageIdentity = overridePageIdentity();
    const cleanup = () => {
      fb.remove();
      styleEl.remove();
      restorePageIdentity();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }, [fileName, codeTheme]);

  return (
    <div className="mdp-root">
      {/* HEADER */}
      <header className="mdp-header">
        <div className="mdp-logo">📄</div>
        <div>
          <h1>Markdown to PDF</h1>
          <p>Write Markdown (with Mermaid) → export a clean PDF</p>
        </div>
        <div className="mdp-header-actions">
          <label className="mdp-select" title="Mermaid diagram theme">
            <span>Diagram Theme</span>
            <select
              value={mermaidTheme}
              onChange={e =>
                setMermaidTheme(e.target.value as MermaidThemeChoice)
              }
            >
              {MERMAID_THEME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mdp-select" title="Code syntax highlighting theme">
            <span>Code Theme</span>
            <select
              value={codeTheme}
              onChange={e => setCodeTheme(e.target.value as CodeThemeChoice)}
            >
              {CODE_THEME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mdp-btn" style={{ cursor: "pointer" }}>
            Load file
            <input
              type="file"
              accept=".md,.markdown,text/markdown"
              style={{ display: "none" }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) loadFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <button className="mdp-btn primary" onClick={exportPdf}>
            Export PDF ↧
          </button>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="mdp-workspace">
        {/* LEFT: SOURCE */}
        <div className="mdp-pane">
          <div className="mdp-pane-header">
            <span className="mdp-pane-label">Markdown</span>
            <div className="mdp-pane-actions">
              <button className="mdp-btn" onClick={() => setSource("")}>Clear</button>
              <button className="mdp-btn" onClick={() => setSource(SAMPLE)}>Load sample</button>
            </div>
          </div>
          <textarea
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder={"# Type Markdown here…\n\nFenced ```mermaid``` blocks render as diagrams."}
            spellCheck={false}
          />
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="mdp-pane">
          <div className="mdp-pane-header">
            <span className="mdp-pane-label">Preview</span>
          </div>
          <div className="mdp-preview-scroll">
            <div
              ref={previewRef}
              className="mdp-content"
              data-mdp-code-theme={effectiveCodeTheme}
              style={contentVars}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
