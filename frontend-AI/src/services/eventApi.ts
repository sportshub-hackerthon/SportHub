
import { api } from "./api";

export interface BedrockChatRequest {
  message: string;
  sessionId?: string;
}

export interface BedrockChatResponse {
  sessionId: string;
  response: string;
  timestamp: string;
}

// General SportsHub chat: no event selected
export async function sendGeneralChatMessage(
  request: BedrockChatRequest
): Promise<BedrockChatResponse> {
  const { data } = await api.post<BedrockChatResponse>(
    "/api/chat/invoke",
    request
  );

  return data;
}

// Event-specific SportsHub chat
export async function sendEventChatMessage(
  eventId: number,
  request: BedrockChatRequest
): Promise<BedrockChatResponse> {
  const { data } = await api.post<BedrockChatResponse>(
    "/api/chat/invoke-event",
    {
      message: request.message,
      eventId,
      ...(request.sessionId
        ? { sessionId: request.sessionId }
        : {}),
    }
  );

  return data;
}