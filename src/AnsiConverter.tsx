import { useState, useRef, useEffect, useCallback, DragEvent } from "react";
import "./AnsiConverter.css";

const COLORS: Record<string, string> = {
  "30": "#1e1e1e",
  "31": "#f47067",
  "32": "#57c96b",
  "33": "#e8a243",
  "34": "#569cd6",
  "35": "#c586c0",
  "36": "#4fc1ff",
  "37": "#cccccc",
  "90": "#6e7681",
  "2;37": "#8b949e",
};

const SAMPLE = `2026-04-10T08:19:45.566Z [36m============================================[0m
2026-04-10T08:19:45.566Z [36mScenario 1/7: hm_f_not_delivered[0m
2026-04-10T08:19:45.566Z [36mDescription: Auto-discovered scenario[0m
2026-04-10T08:19:45.566Z [36m============================================[0m
2026-04-10T08:19:45.566Z [36mLoad test case inputs: [kinesis mongodb][0m
2026-04-10T08:19:46.392Z [90mhlog[0m 2026-04-10T08:19:46.392Z	[31mERROR[0m	failed to get shards of stream oms-develop-stock-change	[2;37m{"error": "ResourceNotFoundException: Stream not found"}[0m
2026-04-10T08:19:46.403Z [90mhlog[0m 2026-04-10T08:19:46.403Z	[34mINFO[0m	Acquired lock for stream oms-develop-item-status-sync
2026-04-10T08:19:48.335Z [37m✔ Stream oms-develop-item-status-sync created/verified[0m
2026-04-10T08:19:48.335Z [37m✓ MongoDBLoader: Loaded 1 files (orders)[0m
2026-04-10T08:19:49.861Z [37m✔ Published events from 1 files[0m
2026-04-10T08:19:49.861Z [36mStarting polling for 1 readiness conditions (every 1 second)[0m
2026-04-10T08:19:50.118Z [90mhlog[0m 2026-04-10T08:19:50.118Z	[34mINFO[0m	Handle record successfully, seqNumber: 4967348719891639257
2026-04-10T08:19:50.126Z [37mdevelop-workflow-trigger[32m message received[0m
2026-04-10T08:19:50.173Z [37mdevelop-workflow-trigger[36m message consumed[0m
2026-04-10T08:19:50.173Z [37mdevelop-workflow-trigger[35m message deleted[0m
2026-04-10T08:19:50.185Z [90mhlog[0m 2026-04-10T08:19:50.184Z	[34mINFO[0m	consolidate-order-status-from-multi-oms	Consolidated status successfully	[2;37m{"connector": "HM - I216 Sync Order Status From Multi OMS"}[0m
2026-04-10T08:19:50.197Z [90mhlog[0m 2026-04-10T08:19:50.197Z	[34mINFO[0m	calculate-order-status	New statuses after consolidate	[2;37m{"statuses": ["C","P1","F"], "orderNumber": "HM-SG-80020397386"}[0m
2026-04-10T08:19:50.215Z [90mhlog[0m 2026-04-10T08:19:50.212Z	[31mERROR[0m	push-data	could not get handler for push data	[2;37m{"error": "no condition found for push data handler"}[0m
2026-04-10T08:19:50.233Z [90mhlog[0m 2026-04-10T08:19:50.233Z	[34mINFO[0m	push-data	Push data success	[2;37m{"sent_status": "C", "dilog-param-status": "SUCCESS"}[0m
2026-04-10T08:19:50.393Z [90mhlog[0m 2026-04-10T08:19:50.393Z	[34mINFO[0m	calculate-order-status	New statuses after consolidate	[2;37m{"statuses": ["NOT_CONCLUDED"], "orderNumber": "HM-SG-80020397386"}[0m
2026-04-10T08:19:50.394Z [90mhlog[0m 2026-04-10T08:19:50.393Z	[34mINFO[0m	calculate-order-status	Order Status is not concluded: Stop the flow	[2;37m{"orderStatus": "NOT_CONCLUDED"}[0m
2026-04-10T08:19:50.863Z [36mWaiting for hm_f_not_delivered[0m
2026-04-10T08:20:20.950Z [31m✖ Timeout after 30s: Assertion 'hm_f_not_delivered' failed:
  1. F status calculated: expected F, got NOT_CONCLUDED[0m
2026-04-10T08:20:20.950Z [31m✖ Assertion failed after 61 attempts: hm_f_not_delivered[0m
2026-04-10T08:20:20.950Z [31m   Expected: 1 assertions to pass[0m
2026-04-10T08:20:20.950Z [31m   Actual:   1 of 1 assertions failed[0m
2026-04-10T08:25:00.715Z [31m✖ Scenario 1/7 FAILED: hm_f_not_delivered - Readiness conditions not met[0m
2026-04-10T08:25:00.717Z [36mClean previous scenario: hm_f_not_delivered[0m
2026-04-10T08:25:00.717Z [37m✔ Mockoon logs purged successfully[0m
2026-04-10T08:25:00.717Z [36m✔ Ready for next scenario[0m`;

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ansiToHTML(text: string): string {
  const pattern = /(?:\x1b)?\[([0-9;]*)m/g;
  let result = "";
  let last = 0;
  let stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    result += escapeHTML(text.slice(last, match.index));
    const code = match[1];
    if (code === "0" || code === "") {
      result += "</span>".repeat(stack.length);
      stack = [];
    } else if (COLORS[code]) {
      result += `<span style="color:${COLORS[code]}">`;
      stack.push(code);
    }
    last = match.index + match[0].length;
  }
  result += escapeHTML(text.slice(last));
  result += "</span>".repeat(stack.length);
  return result;
}

function buildFullHTML(body: string): string {
  const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Console Log — ${ts}</title>
<style>
  body { background:#0d1117; color:#c9d1d9; font-family:'Cascadia Code','Fira Code',Consolas,monospace; font-size:12.5px; line-height:1.7; padding:20px; }
  .log { white-space:pre-wrap; word-break:break-all; }
</style>
</head>
<body><div class="log">${body}</div></body>
</html>`;
}

function calcSize(str: string): string {
  const bytes = new Blob([str]).size;
  return bytes > 1024 ? (bytes / 1024).toFixed(1) + " KB" : bytes + " B";
}

export default function AnsiConverter() {
  const [input, setInput] = useState("");
  const [outputHTML, setOutputHTML] = useState("");
  const [hasOutput, setHasOutput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [stats, setStats] = useState({ lines: 0, errors: 0, infos: 0, size: "0 B" });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string, color = "#57c96b") => {
    setToast({ msg, color });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const updateStats = useCallback((raw: string) => {
    setStats({
      lines: raw ? raw.split("\n").length : 0,
      errors: (raw.match(/\[31m/g) || []).length,
      infos: (raw.match(/\[34m/g) || []).length,
      size: calcSize(raw),
    });
  }, []);

  const convert = useCallback((raw: string) => {
    if (!raw.trim()) return;
    setOutputHTML(ansiToHTML(raw));
    setHasOutput(true);
  }, []);

  const handleInput = useCallback(
    (value: string) => {
      setInput(value);
      updateStats(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => convert(value), 400);
    },
    [updateStats, convert]
  );

  const clearAll = useCallback(() => {
    setInput("");
    setOutputHTML("");
    setHasOutput(false);
    updateStats("");
  }, [updateStats]);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleInput(text);
    } catch {
      showToast("⚠ Clipboard access denied — paste manually", "#e8a243");
    }
  }, [handleInput, showToast]);

  const copyHTML = useCallback(() => {
    if (!outputHTML) return;
    navigator.clipboard.writeText(buildFullHTML(outputHTML)).then(() => {
      showToast("✓ HTML copied to clipboard");
    });
  }, [outputHTML, showToast]);

  const exportHTML = useCallback(() => {
    if (!outputHTML) return;
    const blob = new Blob([buildFullHTML(outputHTML)], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "console-log-" + Date.now() + ".html";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("✓ File downloaded");
  }, [outputHTML, showToast]);

  const loadSample = useCallback(() => {
    handleInput(SAMPLE);
  }, [handleInput]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        setInput(prev => { convert(prev); return prev; });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [convert]);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        handleInput(text);
        showToast(`✓ Loaded: ${file.name}`);
      };
      reader.readAsText(file);
    },
    [handleInput, showToast]
  );

  return (
    <div
      className="ansi-root"
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={e => { if (!e.relatedTarget) setIsDragging(false); }}
      onDrop={handleDrop}
    >
      {/* HEADER */}
      <header className="ansi-header">
        <div className="ansi-logo">⚡</div>
        <div>
          <h1>ANSI Log Converter</h1>
          <p>Paste console output → rendered with color</p>
        </div>
        <div className="ansi-header-actions">
          <button className="ansi-btn" onClick={loadSample}>Load sample</button>
          <button className="ansi-btn primary" onClick={() => convert(input)}>Convert ↵</button>
        </div>
      </header>

      {/* WORKSPACE */}
      <div className="ansi-workspace">
        {/* LEFT: INPUT */}
        <div className="ansi-pane">
          <div className="ansi-pane-header">
            <span className="ansi-pane-label">Input</span>
            <span className={`ansi-pane-badge${input ? " active" : ""}`}>raw ANSI</span>
            <div className="ansi-pane-actions">
              <button className="ansi-btn danger-btn" onClick={clearAll}>Clear</button>
              <button className="ansi-btn" onClick={pasteFromClipboard}>Paste</button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={e => handleInput(e.target.value)}
            placeholder={"Paste your console log here…\n\nSupports ANSI escape codes like [31mERROR[0m or bare [36mINFO[0m format."}
            spellCheck={false}
          />
          <div className="ansi-stats">
            <div className="ansi-stat"><b>{stats.lines.toLocaleString()}</b> lines</div>
            <div className="ansi-stat"><b>{stats.errors}</b> errors</div>
            <div className="ansi-stat"><b>{stats.infos}</b> info</div>
            <div className="ansi-stat" style={{ marginLeft: "auto" }}><b>{stats.size}</b></div>
          </div>
        </div>

        {/* RIGHT: OUTPUT */}
        <div className="ansi-pane">
          <div className="ansi-pane-header">
            <span className="ansi-pane-label">Output</span>
            <span className={`ansi-pane-badge${hasOutput ? " active" : ""}`}>
              {hasOutput ? "rendered" : "—"}
            </span>
            <div className="ansi-pane-actions">
              <button className="ansi-btn copy-btn" onClick={copyHTML} disabled={!hasOutput}>Copy HTML</button>
              <button className="ansi-btn" onClick={exportHTML} disabled={!hasOutput}>Export ↓</button>
            </div>
          </div>
          <div className="ansi-output-scroll">
            {!hasOutput ? (
              <div className="ansi-empty-state">
                <div className="ansi-empty-icon">🖥</div>
                <p>Paste a console log on the left and hit <strong>Convert</strong> to render it here.</p>
              </div>
            ) : (
              <pre
                className="ansi-output"
                dangerouslySetInnerHTML={{ __html: outputHTML }}
              />
            )}
          </div>
          <div className="ansi-legend">
            <div className="ansi-legend-item"><span className="ansi-swatch" style={{ background: "#4fc1ff" }} />Scenario/Poll</div>
            <div className="ansi-legend-item"><span className="ansi-swatch" style={{ background: "#569cd6" }} />INFO</div>
            <div className="ansi-legend-item"><span className="ansi-swatch" style={{ background: "#f47067" }} />ERROR/FAIL</div>
            <div className="ansi-legend-item"><span className="ansi-swatch" style={{ background: "#57c96b" }} />Received</div>
            <div className="ansi-legend-item"><span className="ansi-swatch" style={{ background: "#c586c0" }} />Deleted</div>
            <div className="ansi-legend-item"><span className="ansi-swatch" style={{ background: "#cccccc" }} />Loader</div>
            <div className="ansi-legend-item"><span className="ansi-swatch" style={{ background: "#8b949e" }} />Detail</div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className="ansi-toast show" style={{ color: toast.color }}>
          {toast.msg}
        </div>
      )}

      {/* DRAG OVERLAY */}
      <div className={`ansi-drag-overlay${isDragging ? " active" : ""}`}>
        Drop log file here
      </div>
    </div>
  );
}
