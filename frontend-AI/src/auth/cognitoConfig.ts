import type { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

const POOL_ID = "eu-west-1_DD1c0z51I";
const COACH_CLIENT_ID = "1vacdm07jhe4nam4bq85ruvcmi";
const COACH_URL = "https://d1rlg8deipj3ua.cloudfront.net";
export const ORGANISER_URL = "https://d4t6kc08b3ljm.cloudfront.net";

// Build variables take precedence; these defaults apply only to the Coach client.
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || POOL_ID;
export const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || COACH_CLIENT_ID;
export const cognitoDomain = (import.meta.env.VITE_COGNITO_DOMAIN ||
  "https://eu-west-1dd1c0z51i.auth.eu-west-1.amazoncognito.com").replace(/\/$/, "");

// The Coach site must complete its own OAuth response. Never point its callback
// at a different CloudFront distribution (or copy a callback URL from AWS's example).
export const cognitoConfig: AuthProviderProps = {
  authority: `https://cognito-idp.eu-west-1.amazonaws.com/${userPoolId}`,
  client_id: clientId,
  redirect_uri: `${window.location.origin}`,
  post_logout_redirect_uri: `${window.location.origin}`,
  response_type: "code",
  scope: "openid email profile",
  // Explicit session storage makes the pending PKCE request easy to inspect.
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  onSigninCallback: () => {
    // Remove the one-time code/state only AFTER react-oidc-context processes it.
    window.history.replaceState({}, document.title, "/");
  },
};

export const COACH_ORIGIN = COACH_URL;
