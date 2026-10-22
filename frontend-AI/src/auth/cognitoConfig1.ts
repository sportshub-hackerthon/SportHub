
import type { AuthProviderProps } from "react-oidc-context";

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

export const cognitoDomain = (
  import.meta.env.VITE_COGNITO_DOMAIN as string
).replace(/\/$/, "");

export const requiredRole =
  import.meta.env.VITE_APP_ROLE as "coach" | "organiser";

export const COACH_URL =
  "https://d1rlg8deipj3ua.cloudfront.net";

export const ORGANISER_URL =
  "https://d4t6kc08b3ljm.cloudfront.net";

export const cognitoConfig: AuthProviderProps = {
  authority:
    `https://cognito-idp.eu-west-1.amazonaws.com/${userPoolId}`,

  client_id: clientId,

  redirect_uri:
    `${window.location.origin}/auth/callback`,

  post_logout_redirect_uri:
    `${window.location.origin}/`,

  response_type: "code",

  scope: "openid email profile",

  onSigninCallback: () => {
    window.history.replaceState(
      {},
      document.title,
      "/"
    );
  },
};

export function getRoleDestination(
  groups: string[]
): string | null {
  if (requiredRole === "coach") {
    return groups.includes("organiser")
      ? ORGANISER_URL
      : null;
  }

  return groups.includes("coach")
    ? COACH_URL
    : null;
}
