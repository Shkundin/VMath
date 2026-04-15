import { err, type AppError, type WsCommand, type WsEvent } from "@vm/shared";

export type WsState = "disconnected" | "connecting" | "connected" | "offline";

export interface WsClientOptions {
  url: string;
  maxRetries?: number;
  pingIntervalMs?: number;
  getToken?: () => Promise<string | null>;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private retries = 0;
  private state: WsState = "disconnected";
  private readonly maxRetries: number;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly opts: WsClientOptions,
    private readonly onEvent: (event: WsEvent) => void,
    private readonly onError?: (error: AppError) => void
  ) {
    this.maxRetries = opts.maxRetries ?? 8;
  }

  getState(): WsState {
    return this.state;
  }

  connect() {
    void this.connectInternal();
  }

  private async connectInternal() {
    if (this.state === "connecting" || this.state === "connected") {
      return;
    }

    this.state = "connecting";
    const token = (await this.opts.getToken?.()) ?? null;
    const wsUrl = token
      ? `${this.opts.url}${this.opts.url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
      : this.opts.url;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.retries = 0;
      this.state = "connected";
      this.startPing();
      const now = new Date().toISOString();
      this.onEvent({
        type: "HELLO",
        payload: {
          ts: now,
          serverTime: now
        }
      });
    };

    this.ws.onmessage = (event) => {
      try {
        this.onEvent(JSON.parse(event.data as string) as WsEvent);
      } catch {
        this.onError?.(
          err("WS", "Failed to parse WSS event", { raw: event.data }, true)
        );
      }
    };

    this.ws.onclose = () => {
      this.reconnect("Socket closed");
    };

    this.ws.onerror = () => {
      this.reconnect("Socket error");
    };
  }

  disconnect() {
    this.stopPing();
    this.state = "disconnected";

    try {
      this.ws?.close();
    } finally {
      this.ws = null;
    }
  }

  send(command: WsCommand) {
    if (!this.ws || this.state !== "connected") {
      this.onError?.(err("WS", "WSS connection is not ready", command, true));
      return;
    }

    this.ws.send(JSON.stringify(command));
  }

  private reconnect(reason: string) {
    this.stopPing();

    if (this.retries >= this.maxRetries) {
      this.state = "offline";
      this.onError?.(err("WS", "WSS reconnect limit reached", { reason }, false));
      return;
    }

    const delay = Math.min(1000 * 2 ** this.retries, 15000);
    const jitter = Math.floor(Math.random() * 250);
    this.retries += 1;
    this.state = "connecting";

    setTimeout(() => this.connect(), delay + jitter);
  }

  private startPing() {
    const intervalMs = this.opts.pingIntervalMs ?? 25000;
    this.pingTimer = setInterval(() => {
      try {
        if (this.ws && this.state === "connected") {
          this.ws.send(JSON.stringify({ type: "PING", ts: Date.now() }));
        }
      } catch (error) {
        this.onError?.(err("WS", "PING failed", error, true));
      }
    }, intervalMs);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    this.pingTimer = null;
  }
}
