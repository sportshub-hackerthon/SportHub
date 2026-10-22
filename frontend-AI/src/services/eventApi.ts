import { api } from "./api";

export interface BedrockChatRequest {
  message: string;
  sessionId: string;
}

export interface BedrockChatResponse {
  sessionId: string;
  response: string;
  timestamp: string;
}

export async function sendAgentMessage(
  request: BedrockChatRequest
): Promise<BedrockChatResponse> {
  const { data } = await api.post<BedrockChatResponse>(
    "/api/chat/invoke",
    request
  );

  return data;
}
