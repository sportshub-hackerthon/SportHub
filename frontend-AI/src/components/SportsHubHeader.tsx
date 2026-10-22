
import { AppBar, Box, Stack, Toolbar, Typography } from "@mui/material";
import SignOutButton from "../auth/SignOutButton";

export default function SportsHubHeader() {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "#101D33",
      }}
    >
      <Toolbar
        sx={{
          maxWidth: 1100,
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        {/* SportsHub branding */}
        <Stack
          direction="row"
          spacing={1.5}
          
          sx={{ minWidth: 0, alignItems:"center" }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 1.5,
              bgcolor: "#079447",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            S
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                color: "#FFFFFF",
                fontWeight: 800,
                letterSpacing: 0.3,
                lineHeight: 1.2,
              }}
            >
              SportsHub
            </Typography>

            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#CBD5E1",
                lineHeight: 1.4,
              }}
            >
              AI Coach Assistant
            </Typography>
          </Box>
        </Stack>

        {/* Sign out */}
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <SignOutButton />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
