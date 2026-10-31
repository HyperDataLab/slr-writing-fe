import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { i18nReady } from "@/shared/i18n/i18n";
import "@/app/styles/globals.css";

void i18nReady.then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

