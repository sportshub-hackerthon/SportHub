
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

import {
  getRoleDestination,
  requiredRole,
} from "./cognitoConfig";

interface Props {
  children: ReactNode;
}

export default function AuthGate({ children }: Props) {
  const auth = useAuth();
  const ssoStarted = useRef(false);

  const login = () => {
    void auth.signinRedirect();
  };

  // When redirected from the other SportsHub app,
  // start OAuth automatically to reuse Cognito SSO.
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    if (
      !auth.isLoading &&
      !auth.isAuthenticated &&
      !auth.activeNavigator &&
      !auth.error &&
      params.get("sso") === "1" &&
      !ssoStarted.current
    ) {
      ssoStarted.current = true;
      void auth.signinRedirect();
    }
  }, [
    auth.isLoading,
    auth.isAuthenticated,
    auth.activeNavigator,
    auth.error,
    auth.signinRedirect,
  ]);

  if (auth.isLoading || auth.activeNavigator) {
    return (
      <LoadingScreen message="Checking your session..." />
    );
  }

  if (auth.error) {
    return (
      <Centered>
        <Alert severity="error">
          {auth.error.message}
        </Alert>
        <Button onClick={login} variant="contained">
          Try signing in again
        </Button>
      </Centered>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <Centered>
        <Typography
          variant="h4"
          sx={{fontWeight:800}}
          color="#101D33"
        >
          SportsHub
        </Typography>

        <Typography color="text.secondary">
          Sign in to continue to your SportsHub account.
        </Typography>

        <Button
          variant="contained"
          onClick={login}
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

  const claims = auth.user?.profile as
    | (Record<string, unknown>)
    | undefined;

  const rawGroups = claims?.["cognito:groups"];

  const groups: string[] = Array.isArray(rawGroups)
    ? rawGroups.filter(
        (value): value is string =>
          typeof value === "string"
      )
    : [];

  if (!groups.includes(requiredRole)) {
    const destination = getRoleDestination(groups);

    if (destination) {
      // The destination has its own OAuth client.
      // It starts a new authorization request but
      // reuses the existing Cognito login session.
      window.location.replace(`${destination}/?sso=1`);

      return (
        <LoadingScreen
          message="Opening your SportsHub application..."
        />
      );
    }

    return (
      <Centered>
        <Typography variant="h5" sx={{fontWeight:700}}>
          Access denied
        </Typography>

        <Typography color="text.secondary">
          Your account is not assigned to the
          coach or organiser group.
        </Typography>

        <Button
          variant="outlined"
          onClick={() => void auth.removeUser().then(
            () => window.location.replace("/")
          )}
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
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 3,
        p: 3,
      }}
    >
      {children}
    </Box>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <Centered>
      <CircularProgress sx={{ color: "#079447" }} />
      <Typography>{message}</Typography>
    </Centered>
  );
}
