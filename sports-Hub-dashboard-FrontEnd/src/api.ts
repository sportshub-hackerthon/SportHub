const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://sporthub-rng4.onrender.com';

const BASE = '/Events';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }

  // Handle endpoints that return no response body.
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export interface EventResponse {
  id: number;
  name: string;
  eventType: string;
  sportCategory: string;
  venue: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  numberOfTeams: number;
  description: string;
  ageGroups: string;
  pitchStartTime: string;
  pitchEndTime: string;
  matchDurationMinutes: number;
  breakBetweenMatchesMinutes: number;
  maxMatchesPerTeam: number;
  minRestTimeBetweenMatches: number;
  createdAt: string;
}

export interface CreateEventRequest {
  name: string;
  venue: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  numberOfTeams: number;
  pitchStartTime: string;
  pitchEndTime: string;
  description?: string;
  ageGroups?: string;
  eventType?: string;
  sportCategory?: string;
  matchDurationMinutes?: number;
  breakBetweenMatchesMinutes?: number;
  maxMatchesPerTeam?: number;
  minRestTimeBetweenMatches?: number;
}

export interface TeamResponse {
  id: number;
  name: string;
  schoolName: string;
  coachName: string;
  coachPhone: string;
  ageGroup: string;
  createdAt: string;
}

export interface CreateTeamRequest {
  name: string;
  schoolName: string;
  coachName: string;
  coachPhone: string;
  ageGroup: string;
}

export const teamsApi = {
  list: () => request<TeamResponse[]>('/teams'),

  create: (data: CreateTeamRequest) =>
    request<TeamResponse>('/Teams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface FixtureResponse {
  id: number;
  eventId: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  pitchId: number;
  kickOffTime: string;
  status: string;
  ageGroup: string;
  division: string;
}

export interface RegistrationResponse {
  id: number;
  eventId: number;
  teamId: number;
  teamName: string;
  ageGroup: string;
  division: string;
  status: string;
  registeredAt: string;
}

export const registrationsApi = {
  getByEvent: (eventId: number) =>
    request<RegistrationResponse[]>(
      `/Registrations/Event/${eventId}`
    ),

  // Returns a map of teamId → event names the team is registered for
  getAllAcrossEvents: async (events: EventResponse[]): Promise<Map<number, string[]>> => {
    if (events.length === 0) return new Map();
    const results = await Promise.all(
      events.map((ev) =>
        request<RegistrationResponse[]>(`/Registrations/Event/${ev.id}`)
          .then((regs) => ({ eventName: ev.name, regs }))
          .catch(() => ({ eventName: ev.name, regs: [] as RegistrationResponse[] }))
      )
    );
    const map = new Map<number, string[]>();
    for (const { eventName, regs } of results) {
      for (const reg of regs) {
        const existing = map.get(reg.teamId) ?? [];
        if (!existing.includes(eventName)) existing.push(eventName);
        map.set(reg.teamId, existing);
      }
    }
    return map;
  },
};


export const fixturesApi = {
  getByEvent: (eventId: number) =>
    request<FixtureResponse[]>(`/Fixtures/${eventId}`),

  generate: (
    eventId: number,
    pitchId: number
  ) =>
    request<FixtureResponse[]>('/Fixtures/Generate', {
      method: 'POST',
      body: JSON.stringify({
        eventId,
        pitchId,
      }),
    }),
};


export const eventsApi = {
  list: () => request<EventResponse[]>(BASE),

  get: (id: number) =>
    request<EventResponse>(`${BASE}/${id}`),

  create: (data: CreateEventRequest) =>
    request<EventResponse>(BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CreateEventRequest>) =>
    request<EventResponse>(`${BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}${BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`${res.status} ${res.statusText}: ${body}`);
    }
  },
};