
import { Button } from "@mui/material";
import { useAuth } from "react-oidc-context";
import { cognitoDomain } from "./cognitoConfig";

export default function SignOutButton() {
  const auth = useAuth();

  const handleSignOut = async () => {
    await auth.removeUser();

    const url = new URL(`${cognitoDomain}/logout`);

    url.searchParams.set(
      "client_id",
      import.meta.env.VITE_COGNITO_CLIENT_ID
    );

    url.searchParams.set(
      "logout_uri",
      `${window.location.origin}/`
    );

    window.location.assign(url.toString());
  };

  return (
    <Button
      variant="outlined"
      onClick={() => void handleSignOut()}
    >
      Sign out
    </Button>
  );
}
