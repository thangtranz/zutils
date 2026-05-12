import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App";
import { ThemeProvider } from "./ThemeContext";

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
