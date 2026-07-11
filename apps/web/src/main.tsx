import { Theme } from "@task/ui/app";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@task/ui/styles.css";
import { App } from "./ui/App.js";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <Theme accentColor="indigo" grayColor="slate" radius="medium" scaling="100%">
      <App />
    </Theme>
  </StrictMode>,
);
