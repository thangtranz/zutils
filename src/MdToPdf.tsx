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

function escapeHTML(str: string): string {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  const previewRef = useRef<HTMLDivElement>(null);

  const palette = PALETTES[theme];
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
          theme: palette.mermaid,
          securityLevel: "loose",
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
  }, [html, palette.mermaid]);

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = ev => setSource((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }, []);

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
          <button className="mdp-btn primary" onClick={() => window.print()}>
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
              className="mdp-content mdp-print-area"
              style={contentVars}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
