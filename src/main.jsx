import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// هدایت و جایگزینی خودکار هرگونه alert خام مرورگر به باکس‌های اختصاصی پرس‌کاد
if (typeof window !== "undefined") {
  window.alert = (message) => {
    window.dispatchEvent(
      new CustomEvent("porskad:alert", {
        detail: { message: String(message ?? "") },
      })
    );
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
