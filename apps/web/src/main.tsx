import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@task/ui/styles.css";
import { App } from "./ui/App.js";
import "./styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
