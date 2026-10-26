
import { useState, type FormEvent } from "react";
import { Box, IconButton, TextField } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

interface Props {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  disabled = false,
}: Props) {
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const value = message.trim();
    if (!value || disabled) return;

    setMessage("");
    void onSend(value);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        gap: 1.5,
        p: 2,
        bgcolor: "#FFFFFF",
        borderTop: "1px solid #E2E8F0",
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Message Amusema AI..."
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={disabled}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 1,
            bgcolor: "#F3F6FA",
          },
        }}
      />

      <IconButton
        type="submit"
        disabled={disabled || !message.trim()}
        aria-label="Send message"
        sx={{
          bgcolor: "#079447",
          color: "#FFFFFF",
          borderRadius: 2,
          width: 42,
          height: 42,
          "&:hover": { bgcolor: "#06783A" },
          "&.Mui-disabled": {
            bgcolor: "#E2E8F0",
            color: "#94A3B8",
          },
        }}
      >
        <ArrowUpwardIcon />
      </IconButton>
    </Box>
  );
}
