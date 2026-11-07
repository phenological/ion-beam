import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppProvider } from "./context/AppProvider.tsx";
import { uiZoom } from "./utilities/uiZoom";

document.documentElement.style.setProperty("--ui-zoom", String(uiZoom));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
