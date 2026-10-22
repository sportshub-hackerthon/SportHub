import axios from "axios";
import type { AgentEventInfo } from "../types/agentEvent";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export interface SportsHubEvent {
  id: number;
  name: string;
  eventType: string;
  venue: string;
  startDate: string;
  ageGroups: string;
  numberOfTeams: number;
  numberOfPitches: number;
}


export async function getSportsHubEvents(): Promise<SportsHubEvent[]> {
  const response = await api.get<unknown>("/events");

  const payload = response.data;

  //console.log("SportsHub events API response:", payload);

  // The API returns an array directly.
  if (Array.isArray(payload)) {
    return payload as SportsHubEvent[];
  }

  // Support common paginated/wrapped response formats.
  if (payload && typeof payload === "object") {
    const result = payload as Record<string, unknown>;

    const candidates = [
      result.events,
      result.data,
      result.items,
      result.results,
      result.$values,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as SportsHubEvent[];
      }
    }
  }

  console.error("Unexpected events API response:", payload);

  throw new Error(
    "The events API did not return a valid events array."
  );
}

export async function getAgentEvents(): Promise<AgentEventInfo[]> {
  const response = await api.get<AgentEventInfo[]>(
    "/Events"
  );

  return response.data;
}

export async function getAgentEventInfo(
  eventId: number
): Promise<AgentEventInfo> {
  const response = await api.get<AgentEventInfo>(
    `/api/agent-tools/events/${eventId}`
  );

  return response.data;
}