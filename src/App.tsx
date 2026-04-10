import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from "react";
import AnsiConverter from "./AnsiConverter";
import * as XLSX from "xlsx";

interface Entry {
  name: string;
  yearMonth: string;
  day: number;
  year: string;
  month: string;
}

interface Sheet {
  ym: string;
  year: string;
  month: string;
  cols: number[];
  rows: { name: string; cells: (8 | "")[] }[];
}

interface CalendarData {
  id: number;
  fileName: string;
  entries: Entry[];
  allSheets: Sheet[];
}

interface ExportHandle {
  getCSV: () => string;
  getExcelRows: () => { sheetName: string; aoa: (string | number)[][] }[];
  getStats: () => { name: string; days: number }[];
  fileName: string;
}

function parseICS(text: string): Entry[] {
  const entries: Entry[] = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const summaryMatch = block.match(/SUMMARY:On Call - (.+?) - /);
    const endMatch = block.match(/DTEND[^:]*:(\d{8}T\d{6}Z)/);
    if (!summaryMatch || !endMatch) continue;
    const name = summaryMatch[1].trim();
    const raw = endMatch[1];
    const y = raw.slice(0, 4), m = raw.slice(4, 6), d = raw.slice(6, 8);
    entries.push({ name, yearMonth: `${y}-${m}`, day: parseInt(d), year: y, month: m });
  }
  return entries;
}

function buildSheets(entries: Entry[], names: string[], fromYM: string, fromDay: number, toYM: string, toDay: number): Sheet[] {
  const monthMap: Record<string, { year: string; month: string }> = {};
  entries.forEach(e => {
    if (!monthMap[e.yearMonth]) monthMap[e.yearMonth] = { year: e.year, month: e.month };
  });
  return Object.keys(monthMap).sort()
    .filter(ym => ym >= fromYM && ym <= toYM)
    .map(ym => {
      const { year, month } = monthMap[ym];
      const maxDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const startDay = ym === fromYM ? fromDay : 1;
      const endDay = ym === toYM ? toDay : maxDay;
      const cols = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);
      const rows = names.map(name => ({
        name,
        cells: cols.map(d => (entries.find(e => e.name === name && e.yearMonth === ym && e.day === d) ? 8 : "") as 8 | "")
      }));
      return { ym, year, month, cols, rows };
    });
}

function buildAllSheets(entries: Entry[], names: string[]): Sheet[] {
  return buildSheets(entries, names, "", 1, "9999-12", 31);
}

function toCSV(sheet: Sheet): string {
  return [["Name", ...sheet.cols].join(","), ...sheet.rows.map(r => [r.name, ...r.cells].join(","))].join("\n");
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function daysInMonth(ym: string): number {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m), 0).getDate();
}

function Btn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{ padding: "4px 12px", background: color, color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
      {label}
    </button>
  );
}

function cellStyle(c: 8 | ""): React.CSSProperties {
  return {
    border: "1px solid #ddd", padding: "4px 6px", textAlign: "center",
    background: c === 8 ? "#dbeafe" : "transparent",
    color: c === 8 ? "#1d4ed8" : "#999",
    fontWeight: c === 8 ? 700 : 400
  };
}

function CalendarSection({ cal, onRemove, onRegister }: {
  cal: CalendarData;
  onRemove: (id: number) => void;
  onRegister: (id: number, handle: ExportHandle) => void;
}) {
  const allNames = Array.from(new Set(cal.entries.map(e => e.name)));
  const [names, setNames] = useState<string[]>([...allNames].sort((a, b) => a.localeCompare(b)));

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevYM = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;
  const defaultFromYM = cal.allSheets.find(s => s.ym === prevYM)?.ym ?? cal.allSheets[0].ym;
  const defaultToYM = cal.allSheets.find(s => s.ym === currentYM)?.ym ?? cal.allSheets[cal.allSheets.length - 1].ym;

  const [fromYM, setFromYM] = useState<string>(defaultFromYM);
  const [fromDay, setFromDay] = useState<number>(21);
  const [toYM, setToYM] = useState<string>(defaultToYM);
  const [toDay, setToDay] = useState<number>(20);
  const [copied, setCopied] = useState(false);
  const [combined, setCombined] = useState(true);
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const [dragOverName, setDragOverName] = useState<string | null>(null);

  const toYMOptions = cal.allSheets.filter(s => s.ym >= fromYM);
  const fromDayOptions = Array.from({ length: daysInMonth(fromYM) }, (_, i) => i + 1);
  const toDayOptions = Array.from({ length: daysInMonth(toYM) }, (_, i) => i + 1);

  const sheets = buildSheets(cal.entries, names, fromYM, fromDay, toYM, toDay);

  const buildCSV = useCallback((): string => {
    if (combined) {
      const header1 = ["", ...sheets.map(s => [monthLabel(s.ym), ...Array(s.cols.length - 1).fill("")]).flat()].join(",");
      const header2 = ["Name", ...sheets.map(s => s.cols).flat()].join(",");
      const dataRows = names.map((name, ri) => [name, ...sheets.map(s => s.rows[ri].cells).flat()].join(","));
      return [header1, header2, ...dataRows].join("\n");
    }
    return sheets.map(s => `${monthLabel(s.ym)}\n${toCSV(s)}`).join("\n\n");
  }, [sheets, names, combined]);

  const buildExcelRows = useCallback((): { sheetName: string; aoa: (string | number)[][] }[] => {
    if (combined) {
      const header1 = ["", ...sheets.map(s => [monthLabel(s.ym), ...Array(s.cols.length - 1).fill("")]).flat()];
      const header2 = ["Name", ...sheets.map(s => s.cols).flat()];
      const dataRows = names.map((name, ri) => [name, ...sheets.map(s => s.rows[ri].cells).flat()]);
      return [{ sheetName: cal.fileName.replace(/\.ics$/i, "").slice(0, 31), aoa: [header1, header2, ...dataRows] }];
    }
    return sheets.map(s => ({
      sheetName: monthLabel(s.ym).slice(0, 31),
      aoa: [["Name", ...s.cols], ...s.rows.map(r => [r.name, ...r.cells])]
    }));
  }, [sheets, names, combined, cal.fileName]);

  const buildStats = useCallback((): { name: string; days: number }[] => {
    return names.map((name, ri) => ({
      name,
      days: sheets.reduce((sum, s) => sum + s.rows[ri].cells.filter(c => c === 8).length, 0)
    }));
  }, [sheets, names]);

  // Re-register handle whenever sheets, names or combined changes so parent always has fresh closures
  useEffect(() => {
    onRegister(cal.id, { getCSV: buildCSV, getExcelRows: buildExcelRows, getStats: buildStats, fileName: cal.fileName });
  }, [buildCSV, buildExcelRows, buildStats]);

  const baseName = cal.fileName.replace(/\.ics$/i, "");
  const rangeLabel = `${fromYM}-${String(fromDay).padStart(2, "0")}_to_${toYM}-${String(toDay).padStart(2, "0")}`;

  const downloadCSV = () => {
    const blob = new Blob([buildCSV()], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${baseName}_${rangeLabel}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    buildExcelRows().forEach(({ sheetName, aoa }) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheetName));
    XLSX.writeFile(wb, `${baseName}_${rangeLabel}.xlsx`);
  };

  const copy = () => {
    navigator.clipboard.writeText(buildCSV());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onDragStart = (name: string) => setDraggingName(name);
  const onDragOver = (e: DragEvent, name: string) => { e.preventDefault(); setDragOverName(name); };
  const onDrop = (e: DragEvent, targetName: string) => {
    e.preventDefault();
    if (!draggingName || draggingName === targetName) return;
    const next = [...names];
    const fi = next.indexOf(draggingName), ti = next.indexOf(targetName);
    next.splice(fi, 1); next.splice(ti, 0, draggingName);
    setNames(next);
    setDraggingName(null); setDragOverName(null);
  };
  const onDragEnd = () => { setDraggingName(null); setDragOverName(null); };

  const moveUp = (name: string) => {
    const i = names.indexOf(name); if (i === 0) return;
    const next = [...names]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setNames(next);
  };
  const moveDown = (name: string) => {
    const i = names.indexOf(name); if (i === names.length - 1) return;
    const next = [...names]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; setNames(next);
  };

  const nameCellStyle = (name: string): React.CSSProperties => ({
    border: "1px solid #ddd", padding: "4px 8px", fontWeight: 600,
    background: dragOverName === name ? "#fef9c3" : "#fafafa",
    position: "sticky", left: 0, cursor: "grab",
    outline: draggingName === name ? "2px dashed #2563eb" : "none",
    userSelect: "none"
  });

  const nameCell = (name: string, ri: number) => (
    <td style={nameCellStyle(name)}>
      <span style={{ marginRight: 6 }}>⠿</span>
      <button onClick={() => moveUp(name)} disabled={ri === 0}
        style={{ background: "none", border: "none", cursor: ri === 0 ? "default" : "pointer", color: ri === 0 ? "#d1d5db" : "#6b7280", padding: "0 2px", fontSize: 11 }}>▲</button>
      <button onClick={() => moveDown(name)} disabled={ri === names.length - 1}
        style={{ background: "none", border: "none", cursor: ri === names.length - 1 ? "default" : "pointer", color: ri === names.length - 1 ? "#d1d5db" : "#6b7280", padding: "0 2px", fontSize: 11 }}>▼</button>
      {" "}{name}
    </td>
  );

  const sel = (val: string | number, onChange: (v: string) => void, opts: (string | number)[], labels?: string[]) => (
    <select value={val} onChange={e => onChange(e.target.value)}
      style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}>
      {opts.map((o, i) => <option key={o} value={o}>{labels ? labels[i] : o}</option>)}
    </select>
  );

  const countStyle: React.CSSProperties = {
    border: "1px solid #ddd", padding: "4px 8px", textAlign: "center",
    background: "#f0fdf4", color: "#15803d", fontWeight: 700, minWidth: 40
  };
  const hoursStyle: React.CSSProperties = {
    border: "1px solid #ddd", padding: "4px 8px", textAlign: "center",
    background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, minWidth: 50
  };

  const renderTable = (sheet: Sheet) => (
    <div key={sheet.ym} style={{ overflowX: "auto", marginBottom: combined ? 0 : 24 }}>
      {!combined && <div style={{ fontWeight: 700, color: "#374151", marginBottom: 6 }}>{monthLabel(sheet.ym)}</div>}
      <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#f3f4f6", position: "sticky", left: 0, zIndex: 1 }}>Name</th>
            <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#dcfce7", minWidth: 40, textAlign: "center" }}>#</th>
            <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#dbeafe", minWidth: 50, textAlign: "center" }}>Hrs</th>
            {sheet.cols.map(d => <th key={d} style={{ border: "1px solid #ddd", padding: "4px 6px", background: "#f3f4f6", minWidth: 28, textAlign: "center" }}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((r, ri) => {
            const days = r.cells.filter(c => c === 8).length;
            return (
              <tr key={r.name} draggable onDragStart={() => onDragStart(r.name)} onDragOver={e => onDragOver(e, r.name)} onDrop={e => onDrop(e, r.name)} onDragEnd={onDragEnd}>
                {nameCell(r.name, ri)}
                <td style={countStyle}>{days}</td>
                <td style={hoursStyle}>{days * 8}</td>
                {r.cells.map((c, ci) => <td key={ci} style={cellStyle(c)}>{c}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderCombined = () => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#f3f4f6", position: "sticky", left: 0, zIndex: 2 }}>Name</th>
            <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#dcfce7", minWidth: 40, textAlign: "center" }}>#</th>
            <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#dbeafe", minWidth: 50, textAlign: "center" }}>Hrs</th>
            {sheets.map(s => s.cols.map(d => <th key={`${s.ym}-${d}`} style={{ border: "1px solid #ddd", padding: "4px 6px", background: "#f3f4f6", minWidth: 28, textAlign: "center" }}>{d}</th>))}
          </tr>
          <tr>
            <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#e5e7eb", position: "sticky", left: 0, zIndex: 2 }}></th>
            <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#dcfce7" }}></th>
            <th style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#dbeafe" }}></th>
            {sheets.map(s => <th key={s.ym} colSpan={s.cols.length} style={{ border: "1px solid #ddd", padding: "4px 8px", background: "#e5e7eb", textAlign: "center", fontWeight: 700, color: "#374151" }}>{monthLabel(s.ym)}</th>)}
          </tr>
        </thead>
        <tbody>
          {names.map((name, ri) => {
            const totalDays = sheets.reduce((sum, s) => sum + s.rows[ri].cells.filter(c => c === 8).length, 0);
            return (
              <tr key={name} draggable onDragStart={() => onDragStart(name)} onDragOver={e => onDragOver(e, name)} onDrop={e => onDrop(e, name)} onDragEnd={onDragEnd}>
                {nameCell(name, ri)}
                <td style={countStyle}>{totalDays}</td>
                <td style={hoursStyle}>{totalDays * 8}</td>
                {sheets.map(s => s.rows[ri].cells.map((c, ci) => <td key={`${s.ym}-${ci}`} style={cellStyle(c)}>{c}</td>))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: "#1f2937", fontSize: 15 }}>📅 {cal.fileName}</h3>
        <button onClick={() => onRemove(cal.id)}
          style={{ background: "none", border: "1px solid #fca5a5", color: "#ef4444", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}>
          ✕ Remove
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ color: "#374151" }}>From</label>
        {sel(fromDay, v => setFromDay(parseInt(v)), fromDayOptions)}
        {sel(fromYM, v => { setFromYM(v); setFromDay(21); if (v > toYM) { setToYM(v); setToDay(20); } }, cal.allSheets.map(s => s.ym), cal.allSheets.map(s => monthLabel(s.ym)))}
        <label style={{ color: "#374151" }}>To</label>
        {sel(toDay, v => setToDay(parseInt(v)), toDayOptions)}
        {sel(toYM, v => { setToYM(v); setToDay(20); }, toYMOptions.map(s => s.ym), toYMOptions.map(s => monthLabel(s.ym)))}
        <Btn label="⬇ CSV" onClick={downloadCSV} color="#2563eb" />
        <Btn label="⬇ Excel" onClick={downloadExcel} color="#16a34a" />
        <Btn label={copied ? "✓ Copied!" : "📋 Copy"} onClick={copy} color={copied ? "#16a34a" : "#7c3aed"} />
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#374151" }}>
          <input type="checkbox" checked={combined} onChange={(e: ChangeEvent<HTMLInputElement>) => setCombined(e.target.checked)} />
          Combined table
        </label>
      </div>
      <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8, marginTop: 0 }}>Drag rows or use ▲▼ to reorder.</p>
      {combined ? renderCombined() : sheets.map(s => renderTable(s))}
    </div>
  );
}

type Tool = "calendar" | "ansi";

const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: "calendar", icon: "📅", label: "PagerDuty Calendar" },
  { id: "ansi",     icon: "⚡", label: "ANSI Log Converter" },
];

function Sidebar({ activeTool, onSelect }: { activeTool: Tool; onSelect: (t: Tool) => void }) {
  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 14px", fontSize: 13,
    borderLeft: "2px solid transparent", margin: "1px 0",
    cursor: "pointer", background: "none", border: "none",
    width: "100%", textAlign: "left", color: "#6b7280",
    transition: "all 0.15s",
  };
  return (
    <nav style={{
      width: 200, background: "#f8fafc",
      borderRight: "1px solid #e2e8f0",
      display: "flex", flexDirection: "column",
      flexShrink: 0, height: "100vh",
      position: "sticky", top: 0,
    }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #e2e8f0", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>zutils</div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2, letterSpacing: "0.5px" }}>Developer Tools</div>
      </div>
      <div style={{ padding: "6px 12px 4px", fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#d1d5db" }}>Tools</div>
      {TOOLS.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={
          activeTool === t.id
            ? { ...base, color: "#2563eb", borderLeftColor: "#2563eb", background: "rgba(37,99,235,0.05)" }
            : base
        }>
          <span style={{ fontSize: 15 }}>{t.icon}</span> {t.label}
        </button>
      ))}
    </nav>
  );
}

let nextId = 1;

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>("calendar");
  const [calendars, setCalendars] = useState<CalendarData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [globalCopied, setGlobalCopied] = useState(false);
  const [, forceUpdate] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportHandles = useRef<Map<number, ExportHandle>>(new Map());

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.name.endsWith(".ics")) { setError(`"${file.name}" is not a .ics file.`); return; }
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const entries = parseICS(e.target?.result as string);
          if (!entries.length) { setError(`No on-call events found in "${file.name}".`); return; }
          const names = Array.from(new Set(entries.map(e => e.name)));
          const allSheets = buildAllSheets(entries, names);
          setCalendars(prev => [...prev, { id: nextId++, fileName: file.name, entries, allSheets }]);
          setError(null);
        } catch (err) {
          setError("Failed to parse file: " + (err as Error).message);
        }
      };
      reader.readAsText(file);
    });
  };

  const removeCalendar = (id: number) => {
    setCalendars(prev => prev.filter(c => c.id !== id));
    setTimeout(() => {
      exportHandles.current.delete(id);
      forceUpdate(n => n + 1);
    }, 0);
  };

  const registerHandle = (id: number, handle: ExportHandle) => {
    exportHandles.current.set(id, handle);
    forceUpdate(n => n + 1);
  };

  const globalDownloadCSV = () => {
    const all = Array.from(exportHandles.current.values()).map(h => `# ${h.fileName}\n${h.getCSV()}`).join("\n\n");
    const blob = new Blob([all], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "all_schedules.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const globalDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    exportHandles.current.forEach(h => {
      h.getExcelRows().forEach(({ sheetName, aoa }) => {
        let name = sheetName.slice(0, 31);
        let n = 1;
        while (wb.SheetNames.includes(name)) name = `${sheetName.slice(0, 28)}_${n++}`;
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
      });
    });
    XLSX.writeFile(wb, "all_schedules.xlsx");
  };

  const globalCopy = () => {
    const all = Array.from(exportHandles.current.values()).map(h => `# ${h.fileName}\n${h.getCSV()}`).join("\n\n");
    navigator.clipboard.writeText(all);
    setGlobalCopied(true);
    setTimeout(() => setGlobalCopied(false), 2000);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif", fontSize: 13 }}>
      <Sidebar activeTool={activeTool} onSelect={setActiveTool} />
      {activeTool === "ansi" ? <AnsiConverter /> : <div style={{ flex: 1, padding: 20, maxWidth: "100%", minWidth: 0 }}>
      <h2 style={{ marginBottom: 4 }}>On-Call Schedule → CSV / Excel</h2>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>Upload one or more PagerDuty .ics files.</p>

      <div onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? "#2563eb" : "#d1d5db"}`,
          borderRadius: 8, padding: "24px 20px", textAlign: "center",
          background: dragging ? "#eff6ff" : "#f9fafb",
          cursor: "pointer", marginBottom: 12, transition: "all 0.15s"
        }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
        <div style={{ fontWeight: 600, color: "#374151" }}>Drop .ics files here</div>
        <div style={{ color: "#9ca3af", marginTop: 4 }}>or click to browse (multiple files supported)</div>
        <input ref={fileRef} type="file" accept=".ics" multiple style={{ display: "none" }}
          onChange={(e: ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {calendars.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 20 }}>
          <span style={{ fontWeight: 600, color: "#374151", marginRight: 4 }}>All tables:</span>
          <Btn label="⬇ Download All CSV" onClick={globalDownloadCSV} color="#2563eb" />
          <Btn label="⬇ Download All Excel" onClick={globalDownloadExcel} color="#16a34a" />
          <Btn label={globalCopied ? "✓ Copied!" : "📋 Copy All CSV"} onClick={globalCopy} color={globalCopied ? "#16a34a" : "#7c3aed"} />
        </div>
      )}

      {error && <div style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>{error}</div>}

      {calendars.map(cal => (
        <CalendarSection key={cal.id} cal={cal} onRemove={removeCalendar} onRegister={registerHandle} />
      ))}

      {exportHandles.current.size > 0 && (() => {
        const totals = new Map<string, number>();
        exportHandles.current.forEach(h => {
          h.getStats().forEach(({ name, days }) => {
            totals.set(name, (totals.get(name) ?? 0) + days);
          });
        });
        const rows = Array.from(totals.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        return (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#1f2937", fontSize: 15 }}>📊 Statistics — All Tables</h3>
            <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: "4px 12px", background: "#f3f4f6", textAlign: "left" }}>Name</th>
                  <th style={{ border: "1px solid #ddd", padding: "4px 12px", background: "#dcfce7", textAlign: "center" }}>Total Days</th>
                  <th style={{ border: "1px solid #ddd", padding: "4px 12px", background: "#dbeafe", textAlign: "center" }}>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([name, days]) => (
                  <tr key={name}>
                    <td style={{ border: "1px solid #ddd", padding: "4px 12px", fontWeight: 600 }}>{name}</td>
                    <td style={{ border: "1px solid #ddd", padding: "4px 12px", textAlign: "center", background: "#f0fdf4", color: "#15803d", fontWeight: 700 }}>{days}</td>
                    <td style={{ border: "1px solid #ddd", padding: "4px 12px", textAlign: "center", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700 }}>{days * 8}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
      </div>}
    </div>
  );
}