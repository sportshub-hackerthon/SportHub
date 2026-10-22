
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useAuth } from "react-oidc-context";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";

interface Props {
  children: ReactNode;
}

export default function AuthGate({ children }: Props) {
  const auth = useAuth();
  const ssoStarted = useRef(false);

  const groupsClaim = auth.user?.profile?.["cognito:groups"];

  const groups: string[] = Array.isArray(groupsClaim)
    ? groupsClaim.filter(
        (item): item is string => typeof item === "string"
      )
    : [];

  const isOrganiser = groups.includes("organiser");

  // Start Cognito login when arriving with ?sso=1.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (
      params.get("sso") === "1" &&
      !auth.isLoading &&
      !auth.activeNavigator &&
      !auth.isAuthenticated &&
      !auth.error &&
      !ssoStarted.current
    ) {
      ssoStarted.current = true;

      params.delete("sso");

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname +
          (params.toString() ? `?${params.toString()}` : "")
      );

      void auth.signinRedirect();
    }
  }, [
    auth.isLoading,
    auth.activeNavigator,
    auth.isAuthenticated,
    auth.error,
    auth.signinRedirect,
  ]);

  if (auth.isLoading || auth.activeNavigator) {
    return (
      <Centered>
        <CircularProgress sx={{ color: "#079447" }} />
        <Typography>Checking your session...</Typography>
      </Centered>
    );
  }

  if (auth.error) {
    return (
      <Centered>
        <Alert severity="error">
          {auth.error.message}
        </Alert>

        <Typography variant="body2" color="text.secondary">
          Start a new login from this Organiser website.
          Do not reuse an old Cognito callback URL.
        </Typography>

        <Button
          variant="contained"
          onClick={() => {
            window.history.replaceState(
              {},
              document.title,
              "/"
            );

            void auth.signinRedirect();
          }}
        >
          Start a new sign-in
        </Button>
      </Centered>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <Centered>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: "#101D33" }}
        >
          SportsHub
        </Typography>

        <Typography color="text.secondary">
          Sign in to your Organiser account.
        </Typography>

        <Button
          variant="contained"
          onClick={() => void auth.signinRedirect()}
          sx={{
            bgcolor: "#079447",
            "&:hover": { bgcolor: "#06783A" },
          }}
        >
          Sign in with SportsHub
        </Button>
      </Centered>
    );
  }

  // Stay on the Organiser website when authorised.
  if (!isOrganiser) {
    return (
      <Centered>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700 }}
        >
          Access denied
        </Typography>

        <Typography color="text.secondary">
          Your Cognito account is not in the organiser group.
        </Typography>

        <Button
          variant="outlined"
          onClick={() =>
            void auth.removeUser().then(() => {
              window.location.replace("/");
            })
          }
        >
          Return to sign in
        </Button>
      </Centered>
    );
  }

  return <>{children}</>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F3F6FA",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 3,
        p: 3,
        textAlign: "center",
      }}
    >
      {children}
    </Box>
  );
}
