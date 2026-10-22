import { AppBar, Box, Stack, Toolbar, Typography } from "@mui/material";

//import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";

export default function SportsHubHeader() {
  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: "#101D33" }}>
      <Toolbar
        sx={{
          maxWidth: 1100,
          width: "100%",
          mx: "auto",
          py: 1,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Box sx={{ px: 1, py: 1, mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: "#079447",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 21,
                  fontWeight: 900,
                }}
              >
                S
              </Box>

              <Typography
                variant="h6"
                sx={{
                  color: "#FFFFFF",
                  letterSpacing: 0.3,
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                SportsHub
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "#CBD5E1" }}>
              AI Coach Assistant
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
