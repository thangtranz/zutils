import React, { useState } from "react";
import { useTheme } from "./ThemeContext";

const API_BASE_URL = process.env.REACT_APP_SQS_API_BASE_URL || "http://localhost:3000";

type Mode = "live" | "timeseries" | "total" | "compare";

const METRICS = [
  "NumberOfMessagesReceived",
  "NumberOfMessagesSent",
  "NumberOfMessagesDeleted",
  "ApproximateNumberOfMessagesVisible",
  "ApproximateNumberOfMessagesNotVisible",
  "ApproximateAgeOfOldestMessage"
];

const STATS = ["Sum", "Average", "Maximum", "Minimum"];

const COLORS = ["#4f80ff", "#22d3ee", "#c586c0", "#e8a243", "#57c96b", "#f47067"];

// HELPERS
const fmt = (n: number) => typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n;
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtTick = (iso: string, withDate: boolean) => {
  const d = new Date(iso);
  const t = pad2(d.getUTCHours()) + ":" + pad2(d.getUTCMinutes());
  if (!withDate) return t;
  return pad2(d.getUTCMonth() + 1) + "/" + pad2(d.getUTCDate()) + " " + t;
};
const dateOnly = (iso: string) => {
  const d = new Date(iso);
  return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
};
const unitFor = (m: string) => m === "ApproximateAgeOfOldestMessage" ? "seconds" : "messages";

// COMPONENTS
function LiveView({ data }: { data: any }) {
  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{data.queue}</h2>
      <p style={{ color: "var(--text-secondary)", wordBreak: "break-all", fontSize: 12, marginBottom: 20 }}>{data.url}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard label="Visible" value={fmt(data.visible)} />
        <StatCard label="In-flight" value={fmt(data.inFlight)} />
        <StatCard label="Delayed" value={fmt(data.delayed)} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: string }) {
  return (
    <div style={{
      background: "var(--bg-panel)",
      border: "1px solid var(--border-color)",
      borderRadius: 6,
      padding: "12px 16px"
    }}>
      <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Chart({ series, stat, metric }: { series: any[], stat: string, metric: string }) {
  if (!series.length) return <div style={{ color: "var(--text-secondary)", padding: 20, textAlign: "center" }}>No datapoints.</div>;

  const w = 900, h = 300;
  const pl = 70, pr = 20, pt = 20, pb = 60;
  const iw = w - pl - pr, ih = h - pt - pb;

  // Multi-series support
  const isMulti = series[0]?.points !== undefined;
  const flattenedPoints = isMulti ? series.flatMap(s => s.points) : series;

  if (!flattenedPoints.length) return <div style={{ color: "var(--text-secondary)", padding: 20, textAlign: "center" }}>No datapoints.</div>;

  const vs = flattenedPoints.map(p => p.v);
  const minV = Math.min(...vs), maxV = Math.max(...vs);
  const range = maxV - minV || 1;

  const yAt = (v: number) => pt + ih - ((v - minV) / range) * ih;

  // Use the first series for X-axis if multi
  const xAxisSeries = isMulti ? (series.find(s => s.points.length > 0)?.points || []) : series;
  const xAt = (i: number, len: number) => pl + (i * iw) / Math.max(len - 1, 1);

  const spanMs = new Date(xAxisSeries.at(-1).t).getTime() - new Date(xAxisSeries[0].t).getTime();
  const withDate = spanMs > 24 * 3600e3;

  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 6, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Y Grid & Labels */}
        {[0, 1, 2, 3, 4].map(i => {
          const v = minV + (range * i) / 4;
          const y = yAt(v);
          return (
            <React.Fragment key={i}>
              <line x1={pl} x2={pl + iw} y1={y} y2={y} stroke="var(--border-color)" strokeWidth="1" />
              <text x={pl - 8} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{fmt(v)}</text>
            </React.Fragment>
          );
        })}

        {/* X Ticks & Labels */}
        {(() => {
          const xTickCount = Math.min(6, xAxisSeries.length);
          return Array.from({ length: xTickCount }).map((_, i) => {
            const idx = Math.round((i * (xAxisSeries.length - 1)) / Math.max(xTickCount - 1, 1));
            const x = xAt(idx, xAxisSeries.length);
            return (
              <React.Fragment key={i}>
                <line x1={x} x2={x} y1={pt + ih} y2={pt + ih + 4} stroke="var(--text-muted)" />
                <text x={x} y={pt + ih + 18} fill="var(--text-muted)" fontSize="10" textAnchor="middle">{fmtTick(xAxisSeries[idx].t, withDate)}</text>
              </React.Fragment>
            );
          });
        })()}

        {/* AXES */}
        <line x1={pl} y1={pt} x2={pl} y2={pt + ih} stroke="var(--text-muted)" />
        <line x1={pl} y1={pt + ih} x2={pl + iw} y2={pt + ih} stroke="var(--text-muted)" />

        {/* SERIES */}
        {(isMulti ? series : [{ points: series, color: COLORS[0] }]).map((s, si) => {
          if (!s.points.length) return null;
          const color = s.color || COLORS[si % COLORS.length];
          const xs = s.points.map((_: any, i: number) => xAt(i, s.points.length));
          const ys = s.points.map((p: any) => yAt(p.v));
          const path = xs.map((x: number, i: number) => (i ? "L" : "M") + x.toFixed(1) + "," + ys[i].toFixed(1)).join(" ");
          const area = path + " L " + xs.at(-1).toFixed(1) + "," + (pt + ih) + " L " + xs[0].toFixed(1) + "," + (pt + ih) + " Z";
          return (
            <React.Fragment key={si}>
              {!isMulti && <path d={area} fill={`${color}22`} />}
              <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            </React.Fragment>
          );
        })}

        {/* LABELS */}
        <text x={pl + iw / 2} y={h - 10} fill="var(--text-secondary)" fontSize="11" textAnchor="middle">
          Time (UTC){withDate ? "" : ` · ${dateOnly(xAxisSeries[0].t)}`}
        </text>
        <text fill="var(--text-secondary)" fontSize="11" textAnchor="middle" transform={`translate(15,${pt + ih / 2}) rotate(-90)`}>
          {stat} · {unitFor(metric)}
        </text>
      </svg>
    </div>
  );
}

function TimeseriesView({ data }: { data: any }) {
  const s = data.summary;
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>{data.queue} · {data.metric} ({data.stat})</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
          {data.start} → {data.end} · period {data.period}s · {s.points} points
        </p>
      </div>

      {s.points > 0 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
            <StatCard label="Sum" value={fmt(s.sum)} />
            <StatCard label="Avg/pt" value={fmt(s.avg)} />
            <StatCard label="Max/pt" value={fmt(s.max)} />
            <StatCard label="Min/pt" value={fmt(s.min)} />
          </div>
          <Chart series={data.series} stat={data.stat} metric={data.metric} />
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24, fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                <th style={{ padding: "8px 12px", fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: "8px 12px", fontWeight: 600, textAlign: "right" }}>{data.stat}</th>
              </tr>
            </thead>
            <tbody>
              {data.series.map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{p.t}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "monospace" }}>{fmt(p.v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 6, padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
          No datapoints.
        </div>
      )}
    </div>
  );
}

function TotalView({ data }: { data: any }) {
  const s = data.summary;
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>{data.queue} · {data.metric} ({data.stat})</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
          {data.start} → {data.end} · period {data.period}s · {s.points} points
        </p>
      </div>

      {s.points > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <StatCard label="Sum" value={fmt(s.sum)} />
          <StatCard label="Avg/pt" value={fmt(s.avg)} />
          <StatCard label="Max/pt" value={fmt(s.max)} />
          <StatCard label="Min/pt" value={fmt(s.min)} />
        </div>
      ) : (
        <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-color)", borderRadius: 6, padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
          No datapoints.
        </div>
      )}
    </div>
  );
}

function CompareView({ data }: { data: any }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>Multi-Queue · {data.metric} ({data.stat})</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
          {data.start} → {data.end} · period {data.period}s
        </p>
      </div>

      <Chart series={data.series} stat={data.stat} metric={data.metric} />

      <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 12 }}>
        {data.series.map((s: any, i: number) => (
          <div key={i} style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
            padding: "10px 14px",
            minWidth: 200
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>{s.queue}</span>
              {s.summary.points === 0 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>(no data)</span>}
            </div>
            {s.summary.points > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 11 }}>
                <div style={{ color: "var(--text-secondary)" }}>Sum: <b>{fmt(s.summary.sum)}</b></div>
                <div style={{ color: "var(--text-secondary)" }}>Avg: <b>{fmt(s.summary.avg)}</b></div>
                <div style={{ color: "var(--text-secondary)" }}>Max: <b>{fmt(s.summary.max)}</b></div>
                <div style={{ color: "var(--text-secondary)" }}>Min: <b>{fmt(s.summary.min)}</b></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SqsVisualizer() {
  const { theme } = useTheme();

  // FORM STATE
  const [queue, setQueue] = useState("");
  const [mode, setMode] = useState<Mode>("timeseries");
  const [profile, setProfile] = useState("");
  const [region, setRegion] = useState("ap-southeast-1");
  const [metric, setMetric] = useState(METRICS[0]);
  const [stat, setStat] = useState(STATS[0]);
  const [period, setPeriod] = useState(300);
  const [start, setStart] = useState("-1h");
  const [end, setEnd] = useState("");

  // UI STATE
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const isLive = mode === "live";
  const isCompare = mode === "compare";

  const buildQs = (data: Record<string, any>, keep: string[]) => {
    const q = new URLSearchParams();
    for (const k of keep) {
      if (data[k]) q.set(k, data[k]);
    }
    return q.toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompare && queue.split(",").filter(Boolean).length < 2) {
      alert("Compare mode needs at least 2 queues");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const data = { queue, mode, profile, region, metric, stat, period, start, end, queues: queue };
    const ep = isLive ? "/api/live" : isCompare ? "/api/compare" : "/api/metric";
    const keep = isLive ? ["queue", "profile", "region"] :
      isCompare ? ["queues", "profile", "region", "metric", "stat", "start", "end", "period"] :
        ["queue", "profile", "region", "metric", "stat", "start", "end", "period"];

    try {
      const resp = await fetch(`${API_BASE_URL}${ep}?${buildQs(data, keep)}`);
      const body = await resp.json();
      if (!resp.ok) {
        throw new Error(body.error || resp.statusText);
      }
      setResult(body);
    } catch (err: any) {
      if (err instanceof TypeError) {
        setError(`Can't reach the server at ${API_BASE_URL}. Start it with \`npm run server\` from the zutils repo.`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
      color: "var(--text-primary)",
      overflow: "hidden"
    }}>
      {/* HEADER */}
      <header style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>SQS Visualizer</h2>
          <span style={{
            fontSize: 10,
            background: "var(--bg-sidebar-active)",
            padding: "2px 6px",
            borderRadius: 4,
            color: "var(--text-secondary)",
            fontFamily: "monospace"
          }}>
            {API_BASE_URL}
          </span>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ASIDE: FORM */}
        <aside style={{
          width: 320,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-color)",
          padding: 20,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>{isCompare ? "Queues (comma-separated)" : "Queue (name or URL)"}</label>
              <input
                style={inputStyle}
                value={queue}
                onChange={e => setQueue(e.target.value)}
                required
                placeholder={isCompare ? "q1,q2,q3" : "my-queue"}
              />
            </div>

            <div>
              <label style={labelStyle}>Mode</label>
              <select style={inputStyle} value={mode} onChange={e => setMode(e.target.value as Mode)}>
                <option value="live">live (current depth)</option>
                <option value="timeseries">timeseries</option>
                <option value="total">total</option>
                <option value="compare">compare</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>Profile</label>
                <input
                  style={inputStyle}
                  value={profile}
                  onChange={e => setProfile(e.target.value)}
                  placeholder="default"
                />
              </div>
              <div>
                <label style={labelStyle}>Region</label>
                <input
                  style={inputStyle}
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  placeholder="ap-southeast-1"
                />
              </div>
            </div>

            {!isLive && (
              <>
                <div>
                  <label style={labelStyle}>Metric</label>
                  <select style={inputStyle} value={metric} onChange={e => setMetric(e.target.value)}>
                    {METRICS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Stat</label>
                  <select style={inputStyle} value={stat} onChange={e => setStat(e.target.value)}>
                    {STATS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Start</label>
                    <input style={inputStyle} value={start} onChange={e => setStart(e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>End</label>
                    <input style={inputStyle} value={end} onChange={e => setEnd(e.target.value)} placeholder="now" />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Period (seconds)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    value={period}
                    onChange={e => setPeriod(Number(e.target.value))}
                    min={60}
                    step={60}
                  />
                </div>
              </>
            )}

            <button type="submit" disabled={loading} style={{
              ...buttonStyle,
              opacity: loading ? 0.5 : 1,
              cursor: loading ? "wait" : "pointer"
            }}>
              {loading ? "Running..." : "Run"}
            </button>
          </form>

          <div style={{
            marginTop: "auto",
            padding: "12px",
            background: "var(--bg-panel-secondary)",
            borderRadius: 6,
            fontSize: 11,
            lineHeight: 1.5,
            color: "var(--text-secondary)",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4, fontSize: 12 }}>How it works</div>
            This tool uses a <b>hybrid model</b>. The UI is static, but it connects to a <b>local server</b> to safely use your AWS credentials.
            <div style={{ marginTop: 8 }}>
              <b>AWS Setup:</b><br />
              Run <code>aws sso login --profile NAME</code> or <code>aws configure</code>. Check <code>~/.aws/config</code> for profile names.
            </div>
            <div style={{ marginTop: 8 }}>
              <b>Start Server:</b><br />
              Run <code>npm run server</code> to start the local bridge.
            </div>
          </div>
        </aside>

        {/* RESULTS AREA */}
        <div style={{ flex: 1, padding: 30, overflow: "auto" }}>
          {error && (
            <div style={{
              background: "#fee2e2",
              border: "1px solid #f87171",
              borderRadius: 6,
              padding: "16px 20px",
              color: "#991b1b",
              fontSize: 13,
              lineHeight: 1.6
            }}>
              {error}
            </div>
          )}

          {!error && !result && !loading && (
            <div style={{ textAlign: "center", paddingTop: 80, color: "var(--text-secondary)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <p>Fill the form and hit <b>Run</b> to fetch SQS metrics.</p>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", paddingTop: 80, color: "var(--text-secondary)" }}>
              <p>Fetching metrics from local server...</p>
            </div>
          )}

          {result && !loading && (
            <>
              {mode === "live" && <LiveView data={result} />}
              {mode === "timeseries" && <TimeseriesView data={result} />}
              {mode === "total" && <TotalView data={result} />}
              {mode === "compare" && <CompareView data={result} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-secondary)"
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--bg-panel)",
  border: "1px solid var(--border-color)",
  borderRadius: 4,
  color: "var(--text-primary)",
  fontSize: 13,
  fontFamily: "inherit"
};

const buttonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "10px",
  background: "#4f80ff",
  color: "white",
  border: "none",
  borderRadius: 4,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13
};
