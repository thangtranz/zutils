import { useState } from "react";
import PagerDutyCalendar from "./PagerDutyCalendar";
import AnsiConverter from "./AnsiConverter";

type Page = "pagerduty" | "ansi";

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: "pagerduty", label: "PagerDuty Calendar", icon: "📅" },
  { id: "ansi", label: "ANSI Converter", icon: "⚡" },
];

export default function App() {
  const [page, setPage] = useState<Page>("pagerduty");

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", fontSize: 13 }}>
      {/* SIDEBAR */}
      <nav style={{
        width: 200,
        flexShrink: 0,
        background: "#1e2330",
        display: "flex",
        flexDirection: "column",
        padding: "16px 0",
      }}>
        <div style={{ padding: "0 16px 20px", color: "#e2e8f0", fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>
          ZUtils
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              background: page === item.id ? "#2d3748" : "transparent",
              border: "none",
              borderLeft: page === item.id ? "3px solid #4f80ff" : "3px solid transparent",
              color: page === item.id ? "#e2e8f0" : "#94a3b8",
              cursor: "pointer",
              fontSize: 13,
              textAlign: "left",
              width: "100%",
              transition: "background 0.1s, color 0.1s",
            }}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, overflow: "auto", background: "#fff" }}>
        {page === "pagerduty" && <PagerDutyCalendar />}
        {page === "ansi" && <AnsiConverter />}
      </main>
    </div>
  );
}
