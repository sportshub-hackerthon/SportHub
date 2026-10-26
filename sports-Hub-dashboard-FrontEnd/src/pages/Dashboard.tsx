import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

import Sidebar from "../components/Sidebar";
import { eventsApi, registrationsApi, type EventResponse } from "../api";
import { Fab, Tooltip } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CreateEventAiChat from "../components/CreateEventAiChat";
// Generic sport images keyed by event type keyword
const SPORT_IMAGES: Record<string, string> = {
  football: "/football.jpg",
  rugby: "/rugby.jpg",
  netball: "/netball.jpg",
  default: "/sports-default.jpg",
};

function getSportImage(sportCategory: string, eventType: string): string {
  const src = (sportCategory || eventType).toLowerCase();
  if (src.includes("football")) return SPORT_IMAGES.football;
  if (src.includes("rugby")) return SPORT_IMAGES.rugby;
  if (src.includes("netball")) return SPORT_IMAGES.netball;
  return SPORT_IMAGES.default;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [registeredCounts, setRegisteredCounts] = useState<
    Record<number, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("All");
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Load events immediately — cards render right away
    eventsApi
      .list()
      .then((evs) => {
        setEvents(evs);
        setLoading(false);
        // Fetch registration counts in the background after cards are visible
        Promise.all(
          evs.map((e) =>
            registrationsApi
              .getByEvent(e.id)
              .then((regs) => ({ id: e.id, count: regs.length }))
              .catch(() => ({ id: e.id, count: 0 })),
          ),
        ).then((counts) =>
          setRegisteredCounts(
            Object.fromEntries(counts.map((c) => [c.id, c.count])),
          ),
        );
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  const sports = ["All", ...new Set(events.map((e) => e.eventType))];

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.venue.toLowerCase().includes(search.toLowerCase());
      const matchesSport = sport === "All" || item.eventType === sport;
      return matchesSearch && matchesSport;
    });
  }, [events, search, sport]);

  const totalTeams = Object.values(registeredCounts).reduce(
    (sum, c) => sum + c,
    0,
  );

  const formatDate = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        bgcolor: "#F3F6FA",
      }}
    >
      <Sidebar />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          ml: "240px",
          p: { xs: 2, md: 4 },
          bgcolor: "#F3F6FA",
          boxSizing: "border-box",
        }}
      >
        {/* Page heading */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            flexWrap: "wrap",
            gap: 2,
            mb: 4,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#101D33" }}>
              Your Tournaments
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Manage your sports events in one place.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/create-event")}
            sx={{
              bgcolor: "#079447",
              "&:hover": { bgcolor: "#06783A" },
              borderRadius: 2,
              px: 3,
              py: 1.3,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Create Tournament
          </Button>
        </Box>

        {/* Summary cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            {
              label: "Total Tournaments",
              value: events.length,
              icon: <EmojiEventsIcon />,
            },
            {
              label: "Upcoming Events",
              value: events.length,
              icon: <CalendarMonthIcon />,
            },
            {
              label: "Registered Teams",
              value: totalTeams,
              icon: <GroupsIcon />,
            },
            {
              label: "Sports Categories",
              value: sports.length - 1,
              icon: <SportsSoccerIcon />,
            },
          ].map((stat) => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={stat.label}>
              <Card
                sx={{
                  borderRadius: 3,
                  height: "100%",
                  boxShadow: "0 3px 15px rgba(16,29,51,0.05)",
                }}
              >
                <CardContent
                  sx={{ display: "flex", gap: 2, alignItems: "center" }}
                >
                  <Box
                    sx={{
                      bgcolor: "#DDF7E7",
                      color: "#079447",
                      borderRadius: 2,
                      p: 1.5,
                      display: "flex",
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 800, color: "#101D33" }}
                    >
                      {stat.value}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Search and filters */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
            mb: 3,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#101D33" }}>
            All Events
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder="Search tournaments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ bgcolor: "white", minWidth: 230 }}
            />
            <TextField
              select
              size="small"
              label="Sport"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              sx={{ bgcolor: "white", minWidth: 150 }}
            >
              {sports.map((item) => (
                <MenuItem key={item} value={item}>
                  {item === "All" ? "All Sports" : item}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>

        {/* Event cards */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredEvents.map((item) => {
              const registered = registeredCounts[item.id] ?? 0;
              const progress =
                item.numberOfTeams > 0
                  ? Math.min(
                      100,
                      Math.round((registered / item.numberOfTeams) * 100),
                    )
                  : 0;

              return (
                <Grid size={{ xs: 12, sm: 6, xl: 4 }} key={item.id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: 3,
                      overflow: "hidden",
                      boxShadow: "0 4px 18px rgba(16,29,51,0.07)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 10px 28px rgba(16,29,51,0.12)",
                      },
                    }}
                  >
                    <Box sx={{ position: "relative" }}>
                      <CardMedia
                        component="img"
                        image={getSportImage(
                          item.sportCategory,
                          item.eventType,
                        )}
                        alt={item.eventType}
                        loading="lazy"
                        sx={{ height: 160, objectFit: "cover" }}
                      />
                      <Chip
                        label={item.eventType}
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          fontWeight: 700,
                          bgcolor: "rgba(255,255,255,0.9)",
                          color: "#101D33",
                        }}
                      />
                    </Box>

                    <CardContent
                      sx={{
                        p: 2.5,
                        display: "flex",
                        flexDirection: "column",
                        flexGrow: 1,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 800, color: "#101D33", mb: 2 }}
                      >
                        {item.name}
                      </Typography>

                      <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
                        <CalendarMonthIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(item.startDate)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                        <LocationOnOutlinedIcon
                          fontSize="small"
                          color="action"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {item.venue}
                        </Typography>
                      </Box>

                      {item.ageGroups && (
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                            mb: 2,
                          }}
                        >
                          {item.ageGroups.split(",").map((age) => (
                            <Chip
                              key={age}
                              label={age.trim()}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      )}

                      <Box sx={{ mt: "auto" }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 1,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {registered} / {item.numberOfTeams} teams registered
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {progress}%
                          </Typography>
                        </Box>

                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 8,
                            borderRadius: 5,
                            mb: 2.5,
                            bgcolor: "#E2E8F0",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: "#079447",
                              borderRadius: 5,
                            },
                          }}
                        />

                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => navigate(`/events/${item.id}`)}
                          sx={{
                            bgcolor: "#079447",
                            "&:hover": { bgcolor: "#06783A" },
                            borderRadius: 2,
                            py: 1.2,
                            textTransform: "none",
                            fontWeight: 700,
                          }}
                        >
                          View Event →
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {!loading && filteredEvents.length === 0 && (
          <Card sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              No tournaments found
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Try another search or select a different sport.
            </Typography>
          </Card>
        )}
      </Box>

      {/* Floating AI tournament creation button */}
      <Tooltip title="Create a tournament using SportsHub AI" placement="left">
        <Fab
          variant="extended"
          aria-label="Create tournament with AI"
          onClick={() => setAiChatOpen(true)}
          sx={{
            position: "fixed",
            bottom: { xs: 20, md: 32 },
            right: { xs: 20, md: 32 },
            zIndex: 1200,
            bgcolor: "#101D33",
            color: "#FFFFFF",
            fontWeight: 700,
            textTransform: "none",
            px: 3,
            gap: 1,
            boxShadow: "0 8px 24px rgba(7,148,71,0.25)",
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: "#101D35",
              transform: "translateY(-3px)",
              boxShadow: "0 12px 28px rgba(7,148,71,0.35)",
            },
            borderRadius: 5,
          }}
        >
          <AutoAwesomeIcon />
          Create with AI
        </Fab>
      </Tooltip>

      {/* AI chat dialog */}
      <CreateEventAiChat
        open={aiChatOpen}
        onClose={() => {
          setAiChatOpen(false);
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </Box>
  );
}
