import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";

import type { SportsHubEvent } from "../services/agentEventApi";

interface Props {
  loadEvents: () => Promise<SportsHubEvent[]>;
  onSelect: (eventId: number) => void | Promise<void>;
}

const SPORT_IMAGES = {
  football: "/football.jpg",
  rugby: "/rugby.jpg",
  netball: "/netball.jpg",
  default: "/sports-default.jpg",
} as const;

function getSportImage(event: SportsHubEvent): string {
  // The Coach API currently supplies eventType, not sportCategory.
  const sport = (event.eventType ?? "").toLowerCase();
  if (sport.includes("football") || sport.includes("soccer")) return SPORT_IMAGES.football;
  if (sport.includes("rugby")) return SPORT_IMAGES.rugby;
  if (sport.includes("netball")) return SPORT_IMAGES.netball;
  return SPORT_IMAGES.default;
}

function formatDate(value: string): string {
  if (!value) return "Date to be confirmed";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EventSelector({ loadEvents, onSelect }: Props) {
  const [events, setEvents] = useState<SportsHubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("All");

  useEffect(() => {
    let active = true;
    const fetchEvents = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await loadEvents();
        if (!Array.isArray(result)) throw new Error("Events API did not return an array");
        if (active) setEvents(result);
      } catch (err) {
        console.error("Failed to load SportsHub events:", err);
        if (active) setError("Unable to load events. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchEvents();
    return () => { active = false; };
  }, [loadEvents]);

  const sports = useMemo(
    () => ["All", ...new Set(events.map((event) => event.eventType).filter(Boolean))],
    [events]
  );

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        (event.name ?? "").toLowerCase().includes(query) ||
        (event.venue ?? "").toLowerCase().includes(query);
      return matchesSearch && (sport === "All" || event.eventType === sport);
    });
  }, [events, search, sport]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", bgcolor: "#F3F6FA", p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#101D33", mb: 1 }}>
            Explore Sports Events
          </Typography>
          <Typography color="text.secondary">
            Choose a tournament to register your team, check fixtures, or chat with SportsHub AI.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}
          sx={{ mb: 3, justifyContent: "space-between", alignItems: { sm: "center" } }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#101D33" }}>
            All Events
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField size="small" placeholder="Search tournaments..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ bgcolor: "white", minWidth: { sm: 230 } }} />
            <TextField select size="small" label="Sport" value={sport}
              onChange={(e) => setSport(e.target.value)}
              sx={{ bgcolor: "white", minWidth: { sm: 150 } }}>
              {sports.map((value) => (
                <MenuItem key={value} value={value}>{value === "All" ? "All Sports" : value}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>

        {loading && <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress sx={{ color: "#079447" }} /></Box>}
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {!loading && !error && (
          <Grid container spacing={3}>
            {filteredEvents.map((event) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={event.id}>
                <Card sx={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: 1,
                  overflow: "hidden", boxShadow: "0 4px 18px rgba(16,29,51,0.07)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": { transform: "translateY(-4px)", boxShadow: "0 10px 28px rgba(16,29,51,0.12)" },
                }}>
                  <Box sx={{ position: "relative" }}>
                    <CardMedia component="img" image={getSportImage(event)}
                      alt={`${event.eventType || "Sports"} tournament`} loading="lazy"
                      sx={{ height: 160, objectFit: "cover" }} />
                    <Chip label={event.eventType || "Sports Event"} size="small"
                      sx={{ position: "absolute", top: 12, left: 12, fontWeight: 700,
                        bgcolor: "rgba(255,255,255,0.92)", color: "#101D33" }} />
                  </Box>

                  <CardContent sx={{ p: 2.5, display: "flex", flexDirection: "column", flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#101D33", mb: 2 }}>
                      {event.name}
                    </Typography>
                    <Stack direction="row" spacing={1}  sx={{ mb: 1.5, alignItems:"center" }}>
                      <CalendarMonthIcon fontSize="small" color="action" />
                      <Typography variant="body2">{formatDate(event.startDate)}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems:"center" }}>
                      <LocationOnOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">{event.venue || "Venue to be announced"}</Typography>
                    </Stack>
                    {event.ageGroups && (
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                        {event.ageGroups.split(",").map((age) => age.trim()).filter(Boolean).map((age) => (
                          <Chip key={age} label={age} size="small" variant="outlined" />
                        ))}
                      </Box>
                    )}
                    <Box sx={{ mt: "auto" }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems:"center" }}>
                        <SportsSoccerIcon sx={{ fontSize: 18, color: "#079447" }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {event.numberOfTeams ?? "—"} teams · {event.numberOfPitches ?? "—"} pitches
                        </Typography>
                      </Stack>
                      <Button fullWidth variant="contained" startIcon={<ChatBubbleOutlineIcon />}
                        onClick={() => void onSelect(event.id)}
                        sx={{ bgcolor: "#079447", "&:hover": { bgcolor: "#06783A" },
                          borderRadius: 1, py: 1.2, textTransform: "none", fontWeight: 700 }}>
                        Open Event Chat
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        {!loading && !error && filteredEvents.length === 0 && (
          <Card sx={{ p: 5, textAlign: "center", borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>No tournaments found</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>Try another search or sport category.</Typography>
          </Card>
        )}
      </Box>
    </Box>
  );
}
