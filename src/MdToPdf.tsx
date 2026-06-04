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
// preserving aspect ratio and never upscaling. Done before Paged.js sees the
// clone so the size is final at measure time — this both prevents diagrams from
// overflowing/splitting and avoids the ResizeObserver crash a later CSS-driven
// resize would cause. Reads the viewBox (intrinsic size) since Mermaid's width
// attribute is "100%", not a pixel value.
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
          // Render labels as plain SVG <text>, not HTML <foreignObject>. The
          // foreignObject DOM Mermaid embeds otherwise is what makes Paged.js's
          // break-token walk throw during pagination — disabling it lets the
          // Paged.js path (with the custom footer) succeed instead of falling
          // back to native print.
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

  // Export to PDF. We paginate the rendered preview with Paged.js (lazy-loaded)
  // into an off-screen target, then print it.
  const exportPdf = useCallback(async () => {
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
    let restorePageIdentity = () => {};

    const printCss = `
      @page {
        size: A4;
        margin: 20mm 24mm 18mm;
      }
      .pagedjs_page { background: ${palette.bg}; }
      .pagedjs_page_content .mdp-content {
        max-width: none;
        margin: 0;
        padding: 0;
        line-height: 1.6;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .pagedjs_page_content .mdp-content p,
      .pagedjs_page_content .mdp-content ul,
      .pagedjs_page_content .mdp-content ol,
      .pagedjs_page_content .mdp-content blockquote,
      .pagedjs_page_content .mdp-content table,
      .pagedjs_page_content .mdp-content pre {
        margin-top: 0;
        margin-bottom: 0.9em;
      }
      .pagedjs_page_content .mdp-content li { margin: 0.3em 0; }
      .pagedjs_page_content .mdp-content li > p { margin: 0; }
      /* An <svg> is an atomic element — Paged.js can't split inside it — and
         fitDiagramsToPage() has already scaled each diagram to fit within a
         single page, so a diagram that doesn't fit the remaining space is
         pushed whole to the next page on its own. We deliberately do NOT set
         break-inside: avoid here: Paged.js's break-token walk has a null-deref
         bug when relocating an "avoid" block (crashes in createBreakToken /
         findBreakToken), and it is redundant given the atomic SVG sizing. */
      pre.mermaid {
        text-align: center;
      }
    `;

    // Fresh off-screen target each run (off-screen, not display:none, so
    // Paged.js can still measure element heights for pagination).
    document.getElementById("mdp-paged")?.remove();
    const target = document.createElement("div");
    target.id = "mdp-paged";
    document.body.appendChild(target);

    // Document-level print overrides. Paged.js clones nodes per page during
    // layout, so styles passed to it (or set inline on the source) don't
    // reliably survive. A normal @media print sheet in the document head, with
    // !important, applies to the rendered .pagedjs_page_content at print time.
    document.getElementById("mdp-print-style")?.remove();
    const styleEl = document.createElement("style");
    styleEl.id = "mdp-print-style";
    styleEl.textContent = `
      @media print {
        /* Match the reference PDF: 14px body, 1.6 line spacing, GitHub heading
           sizes. Deterministic via !important since Paged.js doesn't reliably
           apply the .mdp-content stylesheet to its paged output. */
        #mdp-paged .pagedjs_page_content {
          font-size: 14px !important;
          line-height: 1.6 !important;
        }
        #mdp-paged .pagedjs_page_content * {
          line-height: 1.6 !important;
        }
        /* Clean sans-serif for text, monospace only for code. */
        #mdp-paged .pagedjs_page_content,
        #mdp-paged .pagedjs_page_content *:not(code):not(pre) {
          font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
        #mdp-paged .pagedjs_page_content code,
        #mdp-paged .pagedjs_page_content pre,
        #mdp-paged .pagedjs_page_content pre * {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
        }
        /* Restore Mermaid's own font/leading inside diagrams — it measured text
           in this font to size the boxes, so the global overrides above must not
           reach the SVG or labels overflow their shapes. Placed last to win. */
        #mdp-paged .pagedjs_page_content svg,
        #mdp-paged .pagedjs_page_content svg * {
          font-family: "trebuchet ms", verdana, arial, sans-serif !important;
          line-height: normal !important;
        }
        #mdp-paged .pagedjs_page_content h1 { font-size: 26px !important; line-height: 1.25 !important; }
        #mdp-paged .pagedjs_page_content h2 { font-size: 21px !important; line-height: 1.25 !important; }
        #mdp-paged .pagedjs_page_content h3 { font-size: 17px !important; line-height: 1.25 !important; }
        #mdp-paged .pagedjs_page_content h4 { font-size: 14px !important; line-height: 1.25 !important; }
        #mdp-paged .pagedjs_page_content p,
        #mdp-paged .pagedjs_page_content li,
        #mdp-paged .pagedjs_page_content blockquote {
          margin-top: 0 !important;
          margin-bottom: 0.5em !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    const cleanup = () => {
      target.remove();
      styleEl.remove();
      restorePageIdentity();
      window.removeEventListener("afterprint", cleanup);
    };

    // Clone the rendered preview and lock each diagram to a fixed pixel size
    // that fits one A4 content box. Baking the size in *before* pagination
    // means Paged.js measures the final size once — no post-layout reflow, so
    // its ResizeObserver never fires against torn-down DOM, and no diagram
    // overflows the page width or is split across a break.
    const clone = el.cloneNode(true) as HTMLElement;
    fitDiagramsToPage(clone);

    // Fallback when Paged.js can't paginate the document (its break-token logic
    // throws on some complex content — large code blocks, tables, SVG label DOM).
    // Print the rendered preview directly via the browser. No custom per-page
    // footer (Chrome can't render @page margin boxes without Paged.js), but the
    // document — diagrams included — prints intact. Forces a light, full-width,
    // color-exact render so it's readable regardless of the app theme.
    const nativePrintFallback = () => {
      document.getElementById("mdp-fallback")?.remove();
      document.getElementById("mdp-fallback-style")?.remove();

      const fresh = el.cloneNode(true) as HTMLElement;
      fitDiagramsToPage(fresh);
      const fb = document.createElement("div");
      fb.id = "mdp-fallback";
      fb.appendChild(fresh);
      document.body.appendChild(fb);

      const fbStyle = document.createElement("style");
      fbStyle.id = "mdp-fallback-style";
      fbStyle.textContent = `
        @media screen { #mdp-fallback { display: none; } }
        @media print {
          @page { size: A4; margin: 20mm 24mm 18mm; }
          #root, #mdp-paged { display: none !important; }
          #mdp-fallback { display: block !important; }
          #mdp-fallback .mdp-content {
            --mdp-bg: #ffffff; --mdp-fg: #1f2328; --mdp-muted: #656d76;
            --mdp-border: #d0d7de; --mdp-code-bg: #f6f8fa; --mdp-link: #0969da;
            max-width: none !important; margin: 0 !important;
            /* @page already supplies the page margin — drop .mdp-content's own
               padding so the two don't stack into a double margin. */
            padding: 0 !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          #mdp-fallback pre.mermaid { text-align: center; }
        }
      `;
      document.head.appendChild(fbStyle);

      const fbCleanup = () => {
        fb.remove();
        fbStyle.remove();
        restorePageIdentity();
        window.removeEventListener("afterprint", fbCleanup);
      };
      window.addEventListener("afterprint", fbCleanup);
      restorePageIdentity = overridePageIdentity();
      window.print();
    };

    // Paged.js attaches a per-page ResizeObserver that re-runs layout whenever
    // page content resizes after pagination (web fonts settling, the print
    // reflow, our DOM teardown). That correction pass walks already-detached
    // nodes and throws "Cannot read properties of null (reading 'nextSibling')".
    // The observer is only a post-layout nicety — pagination itself doesn't need
    // it — so we stub ResizeObserver to a no-op for the duration of preview().
    // Observers created during layout are inert and stay inert; restoring the
    // global afterwards is safe because Paged.js never creates more.
    const RealResizeObserver = window.ResizeObserver;
    (window as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    const restoreResizeObserver = () => {
      window.ResizeObserver = RealResizeObserver;
    };

    try {
      const { Previewer } = await import("pagedjs");
      const previewer = new Previewer();
      await previewer.preview(
        clone,
        [{ "mdp-print.css": printCss }],
        target
      );
      restoreResizeObserver();
      window.addEventListener("afterprint", cleanup);
      restorePageIdentity = overridePageIdentity();
      window.print();
    } catch (err) {
      // Paged.js failed to paginate — discard its partial output and print
      // natively so the user still gets a PDF (without the custom footer).
      restoreResizeObserver();
      cleanup();
      console.warn(
        "[MdToPdf] Paged.js pagination failed; using native print fallback:",
        err
      );
      nativePrintFallback();
    }
  }, [palette, fileName]);

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
