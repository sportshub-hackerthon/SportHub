
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";

import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";

const COACH_URL =
  "https://d1rlg8deipj3ua.cloudfront.net/";

const GREEN = "#079447";
const NAVY = "#101D33";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    "&:hover fieldset": {
      borderColor: GREEN,
    },
    "&.Mui-focused fieldset": {
      borderColor: GREEN,
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: GREEN,
  },
};

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleOrganiserLogin = () => {
    // Preserve the existing Organiser flow.
    navigate("/dashboard");
  };

  const handleCoachLogin = () => {
    // Open the Coach frontend.
    window.location.assign(COACH_URL);
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#F3F6FA",
        px: 2,
        py: 4,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 4,
          boxShadow: "0 8px 40px rgba(16,29,51,0.12)",
          overflow: "hidden",
        }}
      >
        {/* SportsHub branding */}
        <Box
          sx={{
            bgcolor: GREEN,
            py: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              bgcolor: "rgba(255,255,255,0.15)",
              borderRadius: "50%",
              p: 1.5,
              display: "flex",
            }}
          >
            <SportsSoccerIcon
              sx={{
                fontSize: 36,
                color: "#FFFFFF",
              }}
            />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: 0.5,
            }}
          >
            SportsHub
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.85)",
            }}
          >
            Sports Event Management Platform
          </Typography>
        </Box>

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: NAVY,
              mb: 0.5,
            }}
          >
            Welcome back
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Sign in to manage tournaments or continue as a coach.
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* Organiser login fields */}
          <TextField
            fullWidth
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon
                      sx={{
                        color: GREEN,
                        fontSize: 20,
                      }}
                    />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ ...fieldSx, mb: 2 }}
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon
                      sx={{
                        color: GREEN,
                        fontSize: 20,
                      }}
                    />
                  </InputAdornment>
                ),
              },
            }}
            sx={fieldSx}
          />

          {/* Organiser login */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleOrganiserLogin}
            endIcon={<ArrowForwardIcon />}
            sx={{
              mt: 3,
              bgcolor: GREEN,
              "&:hover": {
                bgcolor: "#06783A",
              },
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              fontSize: 16,
              py: 1.4,
            }}
          >
            Sign In as Organiser
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography
              variant="caption"
              color="text.secondary"
            >
              OR
            </Typography>
          </Divider>

          {/* Coach redirect */}
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GroupsOutlinedIcon />}
            endIcon={<ArrowForwardIcon />}
            onClick={handleCoachLogin}
            sx={{
              borderColor: GREEN,
              color: NAVY,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              fontSize: 15,
              py: 1.4,
              "&:hover": {
                borderColor: GREEN,
                bgcolor: "#EAF7EF",
              },
            }}
          >
            Continue as Coach
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 1.5,
            }}
          >
            Register teams, check fixtures and chat with SportsHub AI.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
