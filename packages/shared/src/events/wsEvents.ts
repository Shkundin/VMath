import type {
  ResultSummaryView,
  SessionState,
  SessionVisualState
} from "../dto/types";

export interface WsEnvelopeBase {
  sessionId?: string;
  sequence?: number;
  ts: string;
}

export type WsEvent =
  | { type: "HELLO"; payload: WsEnvelopeBase & { serverTime: string } }
  | {
      type: "SESSION_SYNC";
      payload: WsEnvelopeBase & {
        sessionId: string;
        state: SessionState;
        replayedEvents?: WsEvent[];
      };
    }
  | {
      type: "SESSION_JOINED";
      payload: WsEnvelopeBase & { sessionId: string; state: SessionState };
    }
  | {
      type: "SESSION_STARTED";
      payload: WsEnvelopeBase & { sessionId: string; state: SessionState };
    }
  | {
      type: "SESSION_STOPPED";
      payload: WsEnvelopeBase & { sessionId: string; state: SessionState };
    }
  | {
      type: "PARTICIPANT_JOINED";
      payload: WsEnvelopeBase & { sessionId: string; userId: string; state: SessionState };
    }
  | {
      type: "PARTICIPANT_LEFT";
      payload: WsEnvelopeBase & { sessionId: string; userId: string; state: SessionState };
    }
  | {
      type: "PARTICIPANT_STATUS";
      payload: WsEnvelopeBase & {
        sessionId: string;
        userId: string;
        status: string;
        connectionStatus?: string;
      };
    }
  | {
      type: "BLOCK_CHANGED";
      payload: WsEnvelopeBase & {
        sessionId: string;
        activeBlockId: string;
        stateVersion: number;
      };
    }
  | {
      type: "VISUAL_MODULE_STATE_UPDATED";
      payload: WsEnvelopeBase & {
        sessionId: string;
        blockId: string;
        visualState: SessionVisualState;
        stateVersion: number;
      };
    }
  | {
      type: "GRAPHICS_STATE";
      payload: WsEnvelopeBase & {
        sessionId: string;
        snapshot: unknown;
        stateVersion: number;
      };
    }
  | {
      type: "CHECKING_BLOCK_STARTED";
      payload: WsEnvelopeBase & {
        sessionId: string;
        blockId: string;
        timeLimitSec?: number;
      };
    }
  | {
      type: "ANSWER_SUBMITTED";
      payload: WsEnvelopeBase & {
        sessionId: string;
        blockId: string;
        userId: string;
        submissionId: string;
      };
    }
  | {
      type: "CHECKING_BLOCK_FINISHED";
      payload: WsEnvelopeBase & { sessionId: string; blockId: string };
    }
  | {
      type: "RESULTS_PUBLISHED";
      payload: WsEnvelopeBase & {
        sessionId: string;
        blockId: string;
        results: ResultSummaryView[];
      };
    }
  | {
      type: "QUIZ_RESULT";
      payload: WsEnvelopeBase & { attemptId: string; score: number; maxScore: number };
    }
  | {
      type: "ERROR";
      payload: WsEnvelopeBase & { code: string; message: string; retryable?: boolean };
    };

export type WsCommand =
  | {
      type: "JOIN_SESSION";
      payload: { sessionId: string; lastSequence?: number };
    }
  | { type: "LEAVE_SESSION"; payload: { sessionId: string } }
  | { type: "SET_ACTIVE_BLOCK"; payload: { sessionId: string; blockId: string } }
  | {
      type: "UPDATE_VISUAL_MODULE_STATE";
      payload: {
        sessionId: string;
        blockId: string;
        schemaVersion: number;
        state: Record<string, unknown>;
      };
    }
  | {
      type: "START_CHECKING_BLOCK";
      payload: { sessionId: string; blockId: string; timeLimitSec?: number };
    }
  | {
      type: "FINISH_CHECKING_BLOCK";
      payload: { sessionId: string; blockId: string };
    }
  | {
      type: "SYNC_FROM_SEQUENCE";
      payload: { sessionId: string; lastSequence: number };
    }
  | {
      type: "PUSH_GRAPHICS_SNAPSHOT";
      payload: { sessionId: string; snapshot: unknown };
    };
