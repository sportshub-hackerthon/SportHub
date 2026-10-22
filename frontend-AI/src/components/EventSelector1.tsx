import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import type { AgentEventInfo } from "../types/agentEvent";
import { C } from "../theme/sportsHubTheme";

interface Props {
  loadEvents: () => Promise<AgentEventInfo[]>;
  onSelect: (event: AgentEventInfo) => void;
}

export default function EventSelector({ loadEvents, onSelect }: Props) {
  const [events, setEvents] = useState<AgentEventInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchEvents() {
      setLoading(true);
      setError("");

      try {
        const data = await loadEvents();
        if (active) setEvents(data);
      } catch {
        if (active) setError("Unable to load available events.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchEvents();
    return () => {
      active = false;
    };
  }, [loadEvents]);

  const selectedEvent = events.find((event) => event.id === selectedId);

  const formatDate = (value: string) => {
    if (!value) return "Date to be confirmed";

    const date = new Date(`${value.slice(0, 10)}T12:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        bgcolor: C.background,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        p: { xs: 2, sm: 4 },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 960 }}>
        {/* Welcome heading */}
        <Stack spacing={2} sx={{ mb: 4, mt: 3, alignItems: "center" }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              bgcolor: C.greenLight,
              display: "grid",
              placeItems: "center",
            }}
          >
            <EventAvailableIcon sx={{ fontSize: 36, color: C.green }} />
          </Box>

          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: 24, sm: 30 },
              fontWeight: 800,
              color: C.navy,
              textAlign: "center",
            }}
          >
            Which event are you joining?
          </Typography>

          <Typography
            sx={{ textAlign: "center" }}
            color="text.secondary"
            variant="body2"
          >
            Select your sports event to start chatting with Amusema AI.
          </Typography>
        </Stack>

        {/* Selection panel */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            bgcolor: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 3,
            boxShadow: "0 8px 24px rgba(16,29,51,0.05)",
          }}
        >
          <Typography color={C.navy} sx={{ mb: 2, fontWeight: 700 }}>
            Choose an event
          </Typography>

          {loading && (
            <Stack sx={{ py: 4, alignItems: "center" }}>
              <CircularProgress />
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && events.length === 0 && (
            <Alert severity="info">No events are currently available.</Alert>
          )}

          {!loading && !error && events.length > 0 && (
            <Stack spacing={2}>
              {events.map((event) => {
                const isSelected = selectedId === event.id;

                return (
                  <Box
                    key={event.id}
                    component="button"
                    type="button"
                    onClick={() => setSelectedId(event.id)}
                    aria-pressed={isSelected}
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      bgcolor: isSelected ? "#F0FBF4" : C.white,
                      border: `1px solid ${isSelected ? C.green : C.border}`,
                      borderRadius: 2,
                      p: 2,
                      color: C.navy,
                      transition: "all 0.15s ease",
                      "&:hover": {
                        borderColor: C.green,
                        bgcolor: "#F7FCF9",
                      },
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        sx={{
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        spacing={2}
                      >
                        <Typography sx={{ fontWeight: 700 }}>
                          {event.name}
                        </Typography>

                        {isSelected ? (
                          <CheckCircleIcon sx={{ color: C.green }} />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ color: "#94A3B8" }} />
                        )}
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center" }}
                      >
                        <LocationOnOutlinedIcon
                          sx={{ fontSize: 18, color: C.muted }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {event.venue}
                        </Typography>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center" }}
                      >
                        <CalendarMonthOutlinedIcon
                          sx={{ fontSize: 18, color: C.muted }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(event.startDate)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}

              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={!selectedEvent}
                onClick={() => {
                  if (selectedEvent) onSelect(selectedEvent);
                }}
                sx={{
                  mt: 1,
                  py: 1.5,
                  bgcolor: C.green,
                  "&:hover": { bgcolor: C.greenHover },
                }}
              >
                Continue to AI Chat
              </Button>
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
