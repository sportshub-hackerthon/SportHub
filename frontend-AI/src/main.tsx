import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CssBaseline, ThemeProvider } from "@mui/material";

import { cognitoConfig } from "./auth/cognitoConfig";
//import App from "./App";
import { sportsHubTheme } from "./theme/sportsHubTheme";

import "./index.css";
import { AuthProvider } from "react-oidc-context";

// const cognitoAuthConfig = {
//   authority: "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_DD1c0z51I",
//   client_id: "1vacdm07jhe4nam4bq85ruvcmi",
//   redirect_uri: "https://d1rlg8deipj3ua.cloudfront.net", //"https://d84l1y8p4kdic.cloudfront.net",
//   response_type: "code",
//   scope: "email openid phone",
// };

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


