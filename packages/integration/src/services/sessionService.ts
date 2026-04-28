import type { ActiveSessionSummary, SessionState, WsEvent } from "@vm/shared";
import { HttpClient } from "../http/httpClient";
import { WsClient } from "../ws/wsClient";

export class SessionService {
  private currentState: SessionState | null = null;
  private stateVersion = 0;

  constructor(
    private readonly http: HttpClient,
    private readonly ws: WsClient
  ) {}

  async createSession(lectureId: string): Promise<SessionState> {
    const state = await this.http.postJson<SessionState>("/api/v1/sessions", { lectureId });
    this.currentState = state;
    return state;
  }

  async getSession(sessionId: string): Promise<SessionState> {
    const state = await this.http.getJson<SessionState>(`/api/v1/sessions/${sessionId}`);
    this.currentState = state;
    return state;
  }

  async listActiveSessions(): Promise<ActiveSessionSummary[]> {
    const response = await this.http.getJson<ActiveSessionSummary[]>("/api/v1/sessions/active");
    return Array.isArray(response) ? response : [];
  }

  async joinSession(input: { sessionId?: string; sessionCode?: string }) {
    const state = await this.http.postJson<SessionState>("/api/v1/sessions/join", input);
    this.currentState = state;
    return state;
  }

  async startSession(sessionId: string) {
    return this.http.postJson<SessionState>(`/api/v1/sessions/${sessionId}/start`, {});
  }

  async stopSession(sessionId: string) {
    return this.http.postJson<SessionState>(`/api/v1/sessions/${sessionId}/stop`, {});
  }

  joinWs(sessionId: string) {
    this.ws.connect();
    this.ws.send({ type: "JOIN_SESSION", payload: { sessionId } });
  }

  handleWsEvent(event: WsEvent, onStateUpdate: (state: SessionState) => void) {
    if (event.type === "SESSION_JOINED") {
      this.currentState = event.payload.state;
      this.stateVersion = 0;
      onStateUpdate(event.payload.state);
      return;
    }

    if (event.type === "BLOCK_CHANGED" && this.currentState) {
      this.stateVersion = event.payload.stateVersion;
      this.currentState = {
        ...this.currentState,
        activeBlockId: event.payload.activeBlockId,
        updatedAt: new Date().toISOString()
      };
      onStateUpdate(this.currentState);
      return;
    }

    if (event.type === "PARTICIPANT_STATUS" && this.currentState) {
      this.currentState = {
        ...this.currentState,
        participants: this.currentState.participants.map(
          (participant: SessionState["participants"][number]) =>
            participant.userId === event.payload.userId
              ? {
                  ...participant,
                  status: event.payload.status as SessionState["participants"][number]["status"]
                }
              : participant
        ),
        updatedAt: event.payload.ts
      };
      onStateUpdate(this.currentState);
    }
  }

  async setActiveBlock(sessionId: string, blockId: string): Promise<void> {
    await this.http.patchJson(`/api/v1/sessions/${sessionId}/current-block`, { blockId });
    this.ws.send({ type: "SET_ACTIVE_BLOCK", payload: { sessionId, blockId } });
  }

  async getParticipants(sessionId: string) {
    return this.http.getJson(`/api/v1/sessions/${sessionId}/participants`);
  }

  async updateVisualState(input: {
    sessionId: string;
    blockId: string;
    schemaVersion: number;
    state: Record<string, unknown>;
  }) {
    return this.http.patchJson(`/api/v1/sessions/${input.sessionId}/visual-state`, {
      blockId: input.blockId,
      schemaVersion: input.schemaVersion,
      state: input.state
    });
  }

  async startCheckingBlock(input: {
    sessionId: string;
    blockId: string;
    timeLimitSec?: number;
  }) {
    return this.http.postJson(
      `/api/v1/sessions/${input.sessionId}/blocks/${input.blockId}/checking/start`,
      {
        timeLimitSec: input.timeLimitSec
      }
    );
  }

  async finishCheckingBlock(input: { sessionId: string; blockId: string }) {
    return this.http.postJson(
      `/api/v1/sessions/${input.sessionId}/blocks/${input.blockId}/checking/finish`,
      {}
    );
  }

  async getResults(sessionId: string) {
    return this.http.getJson(`/api/v1/sessions/${sessionId}/results`);
  }

  async getStats(sessionId: string) {
    return this.http.getJson(`/api/v1/sessions/${sessionId}/stats`);
  }

  getLocalState(): SessionState | null {
    return this.currentState;
  }

  getStateVersion(): number {
    return this.stateVersion;
  }
}
