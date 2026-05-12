import { useState } from "react";
import PagerDutyCalendar from "./PagerDutyCalendar";
import AnsiConverter from "./AnsiConverter";
import { useTheme } from "./ThemeContext";

type Page = "pagerduty" | "ansi";

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: "pagerduty", label: "PagerDuty Calendar", icon: "📅" },
  { id: "ansi", label: "ANSI Converter", icon: "⚡" },
];

export default function App() {
  const [page, setPage] = useState<Page>("pagerduty");
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", fontSize: 13 }}>
      {/* SIDEBAR */}
      <nav style={{
        width: 200,
        flexShrink: 0,
        background: "var(--bg-sidebar)",
        display: "flex",
        flexDirection: "column",
        padding: "16px 0",
      }}>
        <div style={{ padding: "0 16px 20px", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>
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
              background: page === item.id ? "var(--bg-sidebar-active)" : "transparent",
              border: "none",
              borderLeft: page === item.id ? "3px solid #4f80ff" : "3px solid transparent",
              color: page === item.id ? "var(--text-primary)" : "var(--text-secondary)",
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

        {/* THEME TOGGLE */}
        <button
          onClick={toggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            marginTop: "auto",
            background: "transparent",
            border: "none",
            borderTop: "1px solid var(--bg-sidebar-active)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 12,
            textAlign: "left",
            width: "100%",
          }}
        >
          <span style={{ fontSize: 15 }}>{theme === "dark" ? "🌙" : "☀"}</span>
          {theme === "dark" ? "Dark mode" : "Light mode"}
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, overflow: "hidden", display: "flex", background: "var(--bg-main)" }}>
        {page === "pagerduty" && <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}><PagerDutyCalendar /></div>}
        {page === "ansi" && <AnsiConverter />}
      </main>
    </div>
  );
}
