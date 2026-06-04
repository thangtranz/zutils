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
export const greet = (name: string) => \`Hello, \${name}!\`;
\`\`\`

> Tip: switch the app theme — diagrams recolor to match.
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
  const previewRef = useRef<HTMLDivElement>(null);

  const palette = PALETTES[theme];
  // "auto" tracks the app theme; an explicit choice overrides it.
  const effectiveMermaidTheme =
    mermaidTheme === "auto" ? palette.mermaid : mermaidTheme;
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
        #mdp-fallback .mdp-content pre * {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
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
  }, [fileName]);

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
              style={contentVars}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
