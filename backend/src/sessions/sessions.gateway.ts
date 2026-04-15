import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import type { WsCommand, WsEvent } from "@vm/shared";
import type { IncomingMessage } from "http";
import type { RawData, Server, WebSocket } from "ws";
import { AppException, type AuthenticatedUser } from "../common/http";
import { JwtTokenService } from "../auth/jwt-token.service";
import { AppConfigService } from "../config/app-config";
import { SessionsService } from "./sessions.service";

interface SocketMeta {
  user: AuthenticatedUser;
  sessionId?: string;
}

@WebSocketGateway({
  path: "/ws"
})
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly sockets = new Map<WebSocket, SocketMeta>();

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly configService: AppConfigService
  ) {
    this.sessionsService.attachPublisher((sessionId, event) => {
      this.broadcast(sessionId, event);
    });
  }

  handleConnection(@ConnectedSocket() client: WebSocket, request: IncomingMessage) {
    try {
      const user = this.authenticateRequest(request);
      this.sockets.set(client, { user });

      client.on("message", (raw) => {
        void this.handleMessage(client, raw);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unauthorized";
      client.close(4401, message);
    }
  }

  handleDisconnect(@ConnectedSocket() client: WebSocket) {
    const meta = this.sockets.get(client);
    this.sockets.delete(client);

    if (meta?.sessionId) {
      void this.sessionsService.markParticipantConnection(
        meta.sessionId,
        meta.user,
        "disconnected"
      );
    }
  }

  private authenticateRequest(request: IncomingMessage): AuthenticatedUser {
    this.assertOriginAllowed(request);

    const url = new URL(request.url ?? "", "http://localhost");
    const token =
      url.searchParams.get("token") ??
      request.headers.authorization?.replace(/^Bearer\s+/i, "") ??
      "";

    if (!token) {
      throw new AppException("AUTH", 401, "Missing websocket token");
    }

    return this.jwtTokenService.verifyAccessToken(token);
  }

  private assertOriginAllowed(request: IncomingMessage) {
    const origin = request.headers.origin?.trim();
    if (!origin) {
      return;
    }

    const allowedOrigins = this.configService.value.wsCorsOrigins;
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return;
    }

    throw new AppException("FORBIDDEN", 403, "WebSocket origin is not allowed");
  }

  private async handleMessage(client: WebSocket, raw: RawData) {
    const meta = this.sockets.get(client);
    if (!meta) {
      client.close(4401, "Unauthorized");
      return;
    }

    let command: WsCommand;
    try {
      command = JSON.parse(String(raw)) as WsCommand;
    } catch {
      this.send(client, {
        type: "ERROR",
        payload: {
          code: "VALIDATION",
          message: "Malformed websocket payload",
          retryable: false,
          ts: new Date().toISOString()
        }
      });
      return;
    }

    try {
      switch (command.type) {
        case "JOIN_SESSION": {
          const state = await this.sessionsService.joinSession(meta.user, {
            sessionId: command.payload.sessionId
          });
          meta.sessionId = state.sessionId;
          await this.sessionsService.markParticipantConnection(state.sessionId, meta.user, "connected");
          this.send(client, {
            type: "SESSION_SYNC",
            payload: {
              sessionId: state.sessionId,
              state,
              sequence: state.stateVersion,
              ts: new Date().toISOString()
            }
          });
          return;
        }
        case "LEAVE_SESSION": {
          if (meta.sessionId) {
            await this.sessionsService.markParticipantConnection(meta.sessionId, meta.user, "disconnected");
          }
          meta.sessionId = undefined;
          return;
        }
        case "SET_ACTIVE_BLOCK":
          await this.sessionsService.setCurrentBlock(
            meta.user,
            command.payload.sessionId,
            command.payload.blockId
          );
          return;
        case "UPDATE_VISUAL_MODULE_STATE":
          await this.sessionsService.updateVisualState(
            meta.user,
            command.payload.sessionId,
            command.payload.blockId,
            command.payload.schemaVersion,
            command.payload.state
          );
          return;
        case "START_CHECKING_BLOCK":
          await this.sessionsService.startCheckingBlock(
            meta.user,
            command.payload.sessionId,
            command.payload.blockId,
            command.payload.timeLimitSec
          );
          return;
        case "FINISH_CHECKING_BLOCK":
          await this.sessionsService.finishCheckingBlock(
            meta.user,
            command.payload.sessionId,
            command.payload.blockId
          );
          return;
        case "SYNC_FROM_SEQUENCE": {
          const state = await this.sessionsService.getSession(meta.user, command.payload.sessionId);
          this.send(client, {
            type: "SESSION_SYNC",
            payload: {
              sessionId: state.sessionId,
              state,
              sequence: state.stateVersion,
              ts: new Date().toISOString()
            }
          });
          return;
        }
        default:
          this.send(client, {
            type: "ERROR",
            payload: {
              code: "VALIDATION",
              message: "Unsupported websocket command",
              retryable: false,
              ts: new Date().toISOString()
            }
          });
      }
    } catch (error) {
      this.send(client, this.toErrorEvent(error));
    }
  }

  private broadcast(sessionId: string, event: WsEvent) {
    for (const [client, meta] of this.sockets.entries()) {
      if (meta.sessionId === sessionId && client.readyState === client.OPEN) {
        this.send(client, event);
      }
    }
  }

  private send(client: WebSocket, event: WsEvent) {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(event));
    }
  }

  private toErrorEvent(error: unknown): WsEvent {
    const message = error instanceof Error ? error.message : "Unknown websocket error";
    return {
      type: "ERROR",
      payload: {
        code: "WS",
        message,
        retryable: false,
        ts: new Date().toISOString()
      }
    };
  }
}
