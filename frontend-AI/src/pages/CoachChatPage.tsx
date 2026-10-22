import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import axios from "axios";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import type { AgentEventInfo } from "../types/agentEvent";
import type {
  ChatMessage as Message,
  QuickReply,
  Registration,
  RegistrationStatus,
} from "../types/chat";
import type { TeamFixture } from "../types/fixture";
import type { RegistrationStatusResponse } from "../types/registrationStatus";

import { getAgentEventInfo, getSportsHubEvents } from "../services/agentEventApi";
import { sendAgentMessage } from "../services/eventApi";
import {
  checkCanRegister,
  getRegistrationStatus,
  registerTeam,
} from "../services/registrationApi";
import { getTeamFixtures } from "../services/fixtureApi";
import { findTeamByName } from "../services/teamLookupApi";
import { readCanRegister } from "../utils/registration";

import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import RegistrationActions from "../components/RegistrationActions";
import SportsHubHeader from "../components/SportsHubHeader";
import WhatsAppRegistrationButton from "../components/WhatsAppRegistrationButton";
import EventSelector from "../components/EventSelector";
import { C } from "../theme/sportsHubTheme";

const MAIN_MENU: QuickReply[] = [
  { label: "Register Team", value: "register" },
  { label: "Event Info", value: "event info" },
  { label: "Check Fixtures", value: "fixtures" },
  { label: "Registration Status", value: "registration status" },
];

function makeMessage(
  role: "user" | "assistant",
  content: string,
  registration?: Registration,
  quickReplies?: QuickReply[],
): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: new Date().toISOString(),
    registration,
    quickReplies,
  };
}

export default function CoachChatPage() {
  const [event, setEvent] = useState<AgentEventInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingFixtureTeamName, setAwaitingFixtureTeamName] = useState(false);
  const [status, setStatus] = useState<RegistrationStatus>("idle");
  const [draft, setDraft] = useState<Registration | null>(null);
  // One client-created ID per selected event; reused for all Bedrock messages.
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = loading || saving;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, status]);

  const handleSelectEvent = async (eventId: number) => {
    setError(null);
    setEventLoading(true);
    try {
      const selectedEvent = await getAgentEventInfo(eventId);
      sessionIdRef.current = crypto.randomUUID();
      setEvent(selectedEvent);
      setDraft(null);
      setStatus("idle");
      setAwaitingFixtureTeamName(false);
      setMessages([
  makeMessage(
    "assistant",
    `Ola there`,
  ),
]);
    } catch (err) {
      console.error("Unable to load event", err);
      setError("Unable to open the selected event.");
    } finally {
      setEventLoading(false);
    }
  };

  const addAssistantMessage = (
    content: string,
    extras?: {
      eventDetails?: AgentEventInfo;
      fixtures?: TeamFixture[];
      quickReplies?: QuickReply[];
      registrationStatus?: RegistrationStatusResponse;
    },
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
        ...extras,
      },
    ]);
  };

  const handleSend = async (text: string) => {
    if (!event || busy || !text.trim()) return;
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, makeMessage("user", text)]);
    try {
      const input = text.trim().toLowerCase();

      // Keep existing structured local cards until backend returns equivalents.
      if ([
        "registration status",
        "check registration status",
        "available spots",
        "how many spaces are available",
      ].includes(input)) {
        try {
          const data = await getRegistrationStatus(event.id);
          addAssistantMessage("Here's the latest registration availability:", {
            registrationStatus: data,
            quickReplies: MAIN_MENU,
          });
        } catch {
          addAssistantMessage("I couldn't retrieve registration availability right now. Please try again.", {
            quickReplies: MAIN_MENU,
          });
        }
        return;
      }

      if (awaitingFixtureTeamName) {
        if (input === "cancel") {
          setAwaitingFixtureTeamName(false);
          addAssistantMessage("Fixture lookup cancelled. What would you like to do next?", {
            quickReplies: MAIN_MENU,
          });
          return;
        }
        try {
          const matches = await findTeamByName(event.id, text.trim());
          if (matches.length === 0) {
            addAssistantMessage("I couldn't find that registered team. Please check the spelling and try again, or type cancel.", {
              quickReplies: [{ label: "Cancel", value: "cancel" }],
            });
            return;
          }
          if (matches.length > 1) {
            addAssistantMessage("I found multiple teams matching your search. Please select the correct team:", {
              quickReplies: [
                ...matches.slice(0, 10).map((team) => ({ label: team.teamName, value: team.teamName })),
                { label: "Cancel", value: "cancel" },
              ],
            });
            return;
          }
          const team = matches[0];
          const result = await getTeamFixtures(team.teamId, event.id);
          setAwaitingFixtureTeamName(false);
          addAssistantMessage(
            result.fixtures.length
              ? `I found ${result.fixtureCount} fixtures for ${team.teamName}.`
              : `No fixtures are currently available for ${team.teamName}.`,
            { fixtures: result.fixtures, quickReplies: MAIN_MENU },
          );
        } catch {
          addAssistantMessage("I couldn't retrieve the team information or fixtures. Please try again.", {
            quickReplies: [{ label: "Cancel", value: "cancel" }],
          });
        }
        return;
      }

      if (input === "event info") {
        try {
          const details = await getAgentEventInfo(event.id);
          addAssistantMessage("Here are the details for your event:", {
            eventDetails: details,
            quickReplies: MAIN_MENU,
          });
        } catch {
          addAssistantMessage("I couldn't retrieve the event information right now.", {
            quickReplies: MAIN_MENU,
          });
        }
        return;
      }

      if (input === "fixtures" || input === "check fixtures") {
        setAwaitingFixtureTeamName(true);
        addAssistantMessage("Sure! What's your registered team name? You can also type cancel.");
        return;
      }

      // All other messages go to the real Bedrock-backed chat endpoint.
      // This API accepts only message and an optional sessionId.
      const requestSessionId = sessionIdRef.current;
      const result = await sendAgentMessage({
        message: text.trim(),
        sessionId: requestSessionId,
      });
      // Keep the backend-issued ID if it differs from the initial client ID.
      // Don't let a response from an old event overwrite the current event's session.
      if (sessionIdRef.current === requestSessionId && result.sessionId) {
        sessionIdRef.current = result.sessionId;
      }
      addAssistantMessage(result.response);
    } catch (err: unknown) {
      console.error("SportsHub agent request failed", err);
      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError("Cannot connect to the AI assistant. Please check your connection.");
        } else if (err.response.status === 401) {
          setError("Please sign in to use the AI assistant.");
        } else if (err.response.status === 403) {
          setError("You are not authorised to use the AI assistant.");
        } else {
          setError(`AI assistant returned an error (${err.response.status}).`);
        }
      } else {
        setError("Unable to process your message.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Retained for future structured registration responses. The current
  // Bedrock endpoint does not provide a Registration draft to confirm.
  const handleConfirm = async () => {
    if (!event || !draft || busy) return;
    setSaving(true);
    setError(null);
    try {
      const availability = await checkCanRegister(event.id);
      if (!readCanRegister(availability)) {
        setError("Registration is currently unavailable for this event.");
        return;
      }
      await registerTeam({
        eventId: event.id,
        teamName: draft.teamName,
        schoolName: draft.schoolName,
        coachName: draft.coachName,
        coachPhone: draft.coachPhone,
        coachEmail: draft.coachEmail,
        ageGroup: draft.ageGroup,
        division: draft.division,
      });
      setStatus("completed");
      setDraft(null);
      addAssistantMessage("Your registration request has been submitted successfully.", {
        quickReplies: MAIN_MENU,
      });
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      setError(typeof detail === "string" ? detail : "Unable to register the team.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (busy) return;
    await handleSend("cancel");
  };

  if (!event) {
    return (
      <Box
        sx={{
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          bgcolor: C.background,
        }}
      >
        <SportsHubHeader />
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        <EventSelector
          loadEvents={getSportsHubEvents}
          onSelect={handleSelectEvent}
        />
      </Box>
    );
  }
  return (
    <Box
      sx={{
        height: "100dvh",
        minHeight: 480,
        bgcolor: C.background,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SportsHubHeader />
      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          pt: { xs: 1, md: 3 },
          pb: { xs: 0, md: 3 },
          px: { xs: 0, sm: 2 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: { xs: 0, sm: 3 },
            border: {
              xs: "none",
              sm: `1px solid ${C.border}`,
            },
          }}
        >
          {/* Chat header */}
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              py: 2,
              bgcolor: C.white,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <Stack spacing={2}>
              {/* Assistant information */}
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: "center" }}
              >
                <Avatar
                  sx={{
                    width: 44,
                    height: 44,
                    bgcolor: C.greenLight,
                    color: C.green,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                >
                  <SmartToyOutlinedIcon />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      color: C.navy,
                    }}
                  >
                    Amusema Team Registration
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: "block" }}
                  >
                    {event
                      ? `${event.name} • ${event.venue}`
                      : "Football event registration assistant"}
                  </Typography>
                </Box>
                <Chip
                  label="Web Chat"
                  size="small"
                  sx={{
                    bgcolor: C.greenLight,
                    color: C.green,
                    fontWeight: 700,
                    display: { xs: "none", sm: "flex" },
                  }}
                />
              </Stack>
              {/* WhatsApp channel */}
              {/*  {event && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: { xs: "stretch", sm: "flex-end" },
                    "& .MuiButton-root": {
                      width: { xs: "100%", sm: "auto" },
                    },
                  }}
                >
                  <WhatsAppRegistrationButton event={event} />
                </Box>
              )}
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  sessionIdRef.current = crypto.randomUUID();
                  setEvent(null);
                  setMessages([]);
                  setDraft(null);
                  setStatus("idle");
                  setAwaitingFixtureTeamName(false);
                }}
              >
                Change Event
              </Button> */}
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  pt: { xs: 1.5, md: 0 },
                  borderTop: {
                    xs: `1px solid ${C.border}`,
                    md: "none",
                  },
                  flexWrap: "wrap",
                  rowGap: 1,
                  alignItems: "center",
                  justifyContent: {
                    xs: "flex-end",
                    md: "flex-start",
                    lg: "space-between",
                  },
                }}
              >
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => {
                    sessionIdRef.current = crypto.randomUUID();
                    setEvent(null);
                    setMessages([]);
                    setDraft(null);
                    setStatus("idle");
                    setAwaitingFixtureTeamName(false);
                  }}
                  sx={{
                    color: C.muted,
                    whiteSpace: "nowrap",
                    "&:hover": {
                      bgcolor: C.background,
                      color: C.navy,
                    },
                  }}
                >
                  Change Event
                </Button>
                {event && <WhatsAppRegistrationButton event={event} />}
              </Stack>
            </Stack>
          </Box>
          {/* Scrollable conversation */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              px: { xs: 2, sm: 3 },
              py: 3,
              bgcolor: C.background,
            }}
          >
            {eventLoading && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {/* Welcome section */}
            {event && (
              <Box sx={{ textAlign: "center", mb: 4 }}>
                <Avatar
                  sx={{
                    bgcolor: C.greenLight,
                    color: C.green,
                    width: 56,
                    height: 56,
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <SmartToyOutlinedIcon fontSize="large" />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Welcome to SportsHub
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Your football event registration and fixtures assistant.
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  {event.name} • {event.ageGroups}
                </Typography>
              </Box>
            )}
            {/* Conversation messages */}
            {messages.map((message, index) => {
              const isLatest = index === messages.length - 1;
              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onQuickReply={
                    isLatest && !busy && status !== "review"
                      ? (value) => void handleSend(value)
                      : undefined
                  }
                  quickRepliesDisabled={
                    !isLatest || busy || status === "review"
                  }
                />
              );
            })}
            {/* Typing indicator */}
            {loading && (
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ mb: 2, alignItems: "center" }}
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: C.greenLight,
                    color: C.green,
                  }}
                >
                  <SmartToyOutlinedIcon fontSize="small" />
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    color: C.muted,
                  }}
                >
                  <Typography variant="body2">
                    Amusema SportsHub is typing...
                  </Typography>
                </Paper>
              </Stack>
            )}
            {/* Registration confirmation */}
            {status === "review" && draft && (
              <RegistrationActions
                onConfirm={() => void handleConfirm()}
                onCancel={() => void handleCancel()}
                disabled={busy}
              />
            )}
            {/* Saving state */}
            {saving && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ p: 2, alignItems: "center" }}
              >
                <CircularProgress size={18} />
                <Typography variant="body2">
                  Submitting registration...
                </Typography>
              </Stack>
            )}
            <div ref={bottomRef} />
          </Box>
          {/* Message input */}
          <ChatInput
            onSend={handleSend}
            disabled={!event || busy || status === "review"}
          />
          <Typography
            variant="caption"
            sx={{
              textAlign: "center",
              pb: 1.5,
              bgcolor: C.white,
              color: C.muted,
            }}
          >
            Powered by Amusema SportsHub
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
