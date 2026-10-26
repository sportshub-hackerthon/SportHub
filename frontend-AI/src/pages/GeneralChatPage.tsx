import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  //Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";

import SportsHubHeader from "../components/SportsHubHeader";
import { C } from "../theme/sportsHubTheme";
import { sendGeneralChatMessage } from "../services/eventApi";
import MarkdownMessage from "../components/MarkdownMessage";
interface GeneralChatPageProps {
  onBack: () => void;
}

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function GeneralChatPage({ onBack }: GeneralChatPageProps) {
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Hi! I'm your SportsHub AI assistant. " + "How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sessionIdRef = useRef<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, loading]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) return;

    setError("");
    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
      },
    ]);

    try {
      const result = await sendGeneralChatMessage({
        message,
        ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}),
      });

      // Reuse the backend's session for follow-up messages.
      if (result.sessionId) {
        sessionIdRef.current = result.sessionId;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.response,
        },
      ]);
    } catch (err) {
      console.error("General chat error:", err);
      setError("Unable to contact SportsHub AI. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

     <Box
        sx={{
          flex: 1,
          width: "70%",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignSelf:'center',
          pt: { xs: 1, md: 3 },
          pb: { xs: 0, md: 3 },
          px: { xs: 0, sm: 2 },
          mx: { sx: 0, md: 2 },
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
            border: `1px solid ${C.border}`,
            borderRadius: { xs: 0, sm: 3 },
          }}
        >
          {/* Chat header */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              p: 2,
              bgcolor: C.white,
              borderBottom: `1px solid ${C.border}`,
              alignItems: "center",
            }}
          >
            <IconButton aria-label="Back to events" onClick={onBack}>
              <ArrowBackIcon />
            </IconButton>

            <Avatar
              sx={{
                bgcolor: C.greenLight,
                color: C.green,
                borderRadius: 2,
              }}
            >
              <SmartToyOutlinedIcon />
            </Avatar>

            <Box>
              <Typography sx={{ fontWeight: 800 }} color={C.navy}>
                SportsHub AI
              </Typography>
              <Typography variant="caption" color="text.secondary">
                General Assistant
              </Typography>
            </Box>
          </Stack>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              bgcolor: C.background,
              p: 3,
            }}
          >
            <Stack spacing={2}>
              {messages.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "flex",
                    justifyContent:
                      item.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      width: item.role === "assistant" ? "fit-content" : "auto",
                      maxWidth: item.role === "assistant" ? "100%" : "85%",
                      minWidth: 0,
                      overflow: "hidden",
                      overflowWrap: "anywhere",
                      borderRadius: 3,
                      bgcolor: item.role === "user" ? C.green : C.white,
                      color: item.role === "user" ? C.white : C.navy,
                    }}
                  >
                    {item.role === "assistant" ? (
                      <MarkdownMessage content={item.content} />
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.content}
                      </Typography>
                    )}
                  </Paper>
                </Box>
              ))}

              {loading && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <CircularProgress size={18} sx={{ color: C.green }} />
                  <Typography variant="body2" color="text.secondary">
                    SportsHub AI is thinking...
                  </Typography>
                </Stack>
              )}

              {error && <Alert severity="error">{error}</Alert>}

              <div ref={bottomRef} />
            </Stack>
          </Box>

          {/* Message composer */}
          <Box
            component="form"
            onSubmit={(e: FormEvent) => void handleSend(e)}
            sx={{
              p: 2,
              bgcolor: C.white,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              gap: 1,
              alignItems: "center",
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Ask SportsHub AI anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              slotProps={{
                htmlInput: { "aria-label": "Your message" },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={!input.trim() || loading}
              endIcon={<SendIcon />}
              sx={{
                bgcolor: C.green,
                whiteSpace: "nowrap",
                "&:hover": {
                  bgcolor: C.greenHover,
                },
              }}
            >
              Send
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
