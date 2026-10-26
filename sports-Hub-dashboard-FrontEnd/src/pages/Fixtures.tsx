import { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

import Sidebar from "../components/Sidebar";
import {
  eventsApi,
  fixturesApi,
  registrationsApi,
  type EventResponse,
  type FixtureResponse,
} from "../api";

export default function Fixtures() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | "">("");
  const [fixtures, setFixtures] = useState<FixtureResponse[]>([]);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  useEffect(() => {
    eventsApi.list().then((evs) => {
      setEvents(evs);
      if (evs.length > 0) setSelectedEventId(evs[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedEventId === "") return;
    setGenerateError("");
    setLoadingFixtures(true);
    Promise.all([
      fixturesApi.getByEvent(selectedEventId),
      registrationsApi.getByEvent(selectedEventId),
    ])
      .then(([fx, regs]) => {
        setFixtures(fx);
        setRegisteredCount(regs.length);
      })
      .finally(() => setLoadingFixtures(false));
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const isFull = selectedEvent ? registeredCount >= selectedEvent.numberOfTeams : false;
  const progress = selectedEvent && selectedEvent.numberOfTeams > 0
    ? Math.min(100, Math.round((registeredCount / selectedEvent.numberOfTeams) * 100))
    : 0;

  const nextFixture = fixtures.find((f) => f.status !== "Completed");

  const handleGenerate = async () => {
    if (!selectedEvent || !isFull) return;
    setGenerating(true);
    setGenerateError("");
    try {
      const generated = await fixturesApi.generate(selectedEvent.id, 0);
      setFixtures(generated);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Failed to generate fixtures.");
    } finally {
      setGenerating(false);
    }
  };

  const statusColor = (status: string): "info" | "success" | "default" | "warning" => {
    switch (status.toLowerCase()) {
      case "completed": return "success";
      case "inprogress": return "warning";
      case "scheduled": return "info";
      default: return "default";
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f7fb" }}>
      <Sidebar />

      <Box component="main" sx={{ marginLeft: "240px", width: "calc(100% - 240px)", p: 4 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>Fixtures</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Match schedule for your events
            </Typography>
          </Box>

          {events.length > 0 && (
            <TextField
              select
              size="small"
              label="Event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
              sx={{ bgcolor: "white", minWidth: 240 }}
            >
              {events.map((ev) => (
                <MenuItem key={ev.id} value={ev.id}>{ev.name}</MenuItem>
              ))}
            </TextField>
          )}
        </Box>

        {/* Event Summary + capacity */}
        {selectedEvent && (
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <CalendarMonthIcon sx={{ fontSize: 40, color: "#079447" }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {selectedEvent.name}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, mt: 0.5, flexWrap: "wrap" }}>
                      <Typography color="text.secondary" variant="body2">
                        {selectedEvent.startDate}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <LocationOnOutlinedIcon fontSize="small" color="action" />
                        <Typography color="text.secondary" variant="body2">
                          {selectedEvent.venue}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Generate button */}
                <Button
                  variant="contained"
                  startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
                  disabled={!isFull || generating || fixtures.length > 0}
                  onClick={handleGenerate}
                  sx={{
                    bgcolor: "#079447",
                    "&:hover": { bgcolor: "#06783A" },
                    "&.Mui-disabled": { bgcolor: "#E2E8F0", color: "#94A3B8" },
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                  }}
                >
                  {generating ? "Generating..." : fixtures.length > 0 ? "Fixtures Generated" : "Generate Fixtures"}
                </Button>
              </Box>

              {/* Capacity progress */}
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Team Capacity</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {registeredCount} / {selectedEvent.numberOfTeams} registered
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 8,
                    borderRadius: 5,
                    bgcolor: "#E2E8F0",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: isFull ? "#079447" : "#F59E0B",
                      borderRadius: 5,
                    },
                  }}
                />
                {!isFull && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    {selectedEvent.numberOfTeams - registeredCount} more team{selectedEvent.numberOfTeams - registeredCount !== 1 ? "s" : ""} needed before fixtures can be generated.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {generateError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{generateError}</Alert>
        )}

        {/* Next Match */}
        {nextFixture && (
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Next Match</Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {nextFixture.homeTeamName} vs {nextFixture.awayTeamName}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Pitch {nextFixture.pitchId} · {nextFixture.ageGroup} {nextFixture.division && `· Division ${nextFixture.division}`}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {nextFixture.kickOffTime}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Fixtures Table */}
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0 }}>
            {loadingFixtures ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Kick-off</strong></TableCell>
                      <TableCell><strong>Pitch</strong></TableCell>
                      <TableCell><strong>Home Team</strong></TableCell>
                      <TableCell><strong>Away Team</strong></TableCell>
                      <TableCell><strong>Age Group</strong></TableCell>
                      <TableCell><strong>Division</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {fixtures.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          {!selectedEvent
                            ? "Select an event to view fixtures."
                            : !isFull
                            ? "Tournament is not at full capacity — fixtures cannot be generated yet."
                            : "No fixtures yet. Click \"Generate Fixtures\" to create the schedule."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      fixtures.map((fixture) => (
                        <TableRow key={fixture.id}>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{fixture.kickOffTime}</Typography>
                          </TableCell>
                          <TableCell>Pitch {fixture.pitchId}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600 }}>{fixture.homeTeamName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600 }}>{fixture.awayTeamName}</Typography>
                          </TableCell>
                          <TableCell>
                            {fixture.ageGroup && (
                              <Chip label={fixture.ageGroup} size="small" />
                            )}
                          </TableCell>
                          <TableCell>
                            {fixture.division && (
                              <Chip
                                label={`Div ${fixture.division}`}
                                size="small"
                                sx={{ bgcolor: "#DDF7E7", color: "#079447", fontWeight: 600 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip label={fixture.status} color={statusColor(fixture.status)} size="small" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
