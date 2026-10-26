
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { AuthProvider } from "react-oidc-context";
import App from "./App";
import { cognitoConfig } from "./auth/cognitoConfig";
import { sportsHubTheme } from "./theme/sportsHubTheme";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={sportsHubTheme}>
      <CssBaseline />
      <AuthProvider {...cognitoConfig}>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
