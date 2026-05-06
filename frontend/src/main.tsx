import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { appDisplayName } from "./config/app";
import { initFirebaseAnalytics } from "./lib/firebase";
import App from "./App";
import "./index.css";

document.title = appDisplayName;

void initFirebaseAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
