/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Alert, Avatar, Box, Button, CircularProgress, Dialog, DialogContent,
  DialogTitle, IconButton, Paper, Stack, TextField, Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://sporthub-rng4.onrender.com";

type ChatItem = { id: string; role: "assistant" | "user"; content: string };
type ChatResponse = { sessionId: string; response: string; timestamp?: string };

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CreateEventAiChat({ open, onClose }: Props) {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sessionIdRef = useRef<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    sessionIdRef.current = undefined;
    setInput("");
    setError("");
    setMessages([{
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Tell me about the tournament you'd like to create. I can help gather the name, venue, dates, age groups, and match settings before creating it.",
    }]);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setError("");
    setLoading(true);
    setMessages((items) => [...items, { id: crypto.randomUUID(), role: "user", content: message }]);

    try {
      const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/chat/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          message,
          ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}),
        }),
      });
      if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`Chat API error (${response.status}): ${details.slice(0, 200)}`);
      }
      const data = (await response.json()) as ChatResponse;
      if (typeof data.response !== "string") throw new Error("Unexpected chat response");
      if (data.sessionId) sessionIdRef.current = data.sessionId;
      setMessages((items) => [...items, {
        id: crypto.randomUUID(), role: "assistant", content: data.response,
      }]);
    } catch (err) {
      console.error("Create Event AI chat failed", err);
      setError("The AI assistant couldn't process that message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => { if (reason !== "backdropClick" && !loading) onClose(); }}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: 3, height: { xs: "90dvh", sm: 650 }, maxHeight: "90dvh" } } }}
    >
      <DialogTitle sx={{ bgcolor: "#101D33", color: "white", px: 2.5, py: 2 }}>
        <Stack direction="row" sx={{alignItems:"center"}} spacing={1.5}>
          <Avatar sx={{ bgcolor: "#079447", width: 38, height: 38 }}><AutoAwesomeIcon /></Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{fontWeight:800}}>Create Tournament with AI</Typography>
            <Typography variant="caption" sx={{ color: "#CBD5E1" }}>SportsHub Organiser Assistant</Typography>
          </Box>
          <IconButton aria-label="Close AI chat" onClick={onClose} disabled={loading} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", minHeight: 0, bgcolor: "#F3F6FA" }}>
        <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2.5 }}>
          <Stack spacing={1.5}>
            {messages.map((item) => (
              <Box key={item.id} sx={{ display: "flex", justifyContent: item.role === "user" ? "flex-end" : "flex-start" }}>
                <Paper elevation={0} sx={{
                  p: 1.5, maxWidth: "90%", borderRadius: 2.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                  bgcolor: item.role === "user" ? "#079447" : "white",
                  color: item.role === "user" ? "white" : "#101D33",
                  border: item.role === "user" ? "none" : "1px solid #E2E8F0",
                }}>
                  <Typography variant="body2" sx={{ whiteSpace: "inherit" }}>{item.content}</Typography>
                </Paper>
              </Box>
            ))}
            {loading && <Stack direction="row" spacing={1} sx={{alignItems:"center"}}><CircularProgress size={16}/><Typography variant="caption">SportsHub AI is thinking...</Typography></Stack>}
            {error && <Alert severity="error">{error}</Alert>}
            <div ref={bottomRef} />
          </Stack>
        </Box>
        <Box component="form" onSubmit={(e: FormEvent<HTMLFormElement>) => void handleSend(e)} sx={{ display: "flex", gap: 1, p: 2, bgcolor: "white", borderTop: "1px solid #E2E8F0" }}>
          <TextField
            fullWidth size="small" placeholder="Describe your tournament..."
            value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
            slotProps={{ htmlInput: { "aria-label": "Tournament chat message" } }}
          />
          <Button type="submit" variant="contained" disabled={loading || !input.trim()} endIcon={<SendIcon />}
            sx={{ bgcolor: "#079447", textTransform: "none", "&:hover": { bgcolor: "#06783A" } }}>
            Send
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
