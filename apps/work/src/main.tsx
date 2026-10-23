import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app/App";
import { WorkspaceProvider } from "./app/workspace";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/lora/400.css";
import "@fontsource/merriweather/400.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/roboto/400.css";
import "./styles/app.css";
import "./styles/i18n.css";

const viewport = document.querySelector('meta[name="viewport"]');
if (viewport) viewport.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedReload() {
      window.dispatchEvent(new Event("ow-update"));
    },
    onRegisteredSW(_url, registration) {
      if (registration?.waiting) window.dispatchEvent(new Event("ow-update"));
    },
  });
}

const root = document.querySelector("#root");
if (!root) throw new Error("root");

createRoot(root).render(
  <StrictMode>
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </StrictMode>,
);
