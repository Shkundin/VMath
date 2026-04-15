import { err, normalizeError, type AppError } from "@vm/shared";

export interface HttpClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface TokenProvider {
  getAccessToken(): Promise<string | null>;
  onAuthFail?(): Promise<void>;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}

function normalizeTransportError(error: unknown): AppError {
  if (error instanceof TypeError) {
    return err("NETWORK", error.message, undefined, true);
  }

  return normalizeError(error);
}

export class HttpClient {
  constructor(
    private readonly opts: HttpClientOptions,
    private readonly tokenProvider: TokenProvider
  ) {}

  async getJson<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  async patchJson<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body)
    });
  }

  async putJson<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = this.opts.baseUrl.replace(/\/$/, "") + path;
    const timeoutMs = this.opts.timeoutMs ?? 15000;
    const maxRetries = this.opts.maxRetries ?? 2;

    const allowAuthRecovery = !path.startsWith("/auth/");
    let last: AppError | null = null;
    let didAuthRecovery = false;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const token = await this.tokenProvider.getAccessToken();

      const headers = new Headers(init.headers ?? {});
      headers.set("Accept", "application/json");

      if (init.body) {
        headers.set("Content-Type", "application/json");
      }

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          headers,
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          const raw = await response.text().catch(() => "");
          const isAuth = response.status === 401 || response.status === 403;
          const retryable = response.status >= 500;

          if (isAuth && allowAuthRecovery && !didAuthRecovery && this.tokenProvider.onAuthFail) {
            didAuthRecovery = true;
            await this.tokenProvider.onAuthFail();
            continue;
          }

          throw err(
            isAuth ? "AUTH" : "HTTP",
            `HTTP ${response.status} ${response.statusText}`,
            raw,
            retryable,
            response.status
          );
        }

        if (response.status === 204) {
          return undefined as T;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          const text = await response.text().catch(() => "");
          throw err(
            "HTTP",
            "Expected JSON response",
            { contentType, text },
            false,
            response.status
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        clearTimeout(timer);

        const normalized = normalizeTransportError(error);
        last = normalized;

        const retryable =
          isAbortError(error) ||
          normalized.code === "NETWORK" ||
          (normalized.code === "HTTP" && normalized.retryable === true);

        if (!retryable || attempt === maxRetries) {
          break;
        }

        const backoff = 250 * 2 ** attempt;
        const jitter = Math.floor(Math.random() * 150);
        await sleep(Math.min(backoff + jitter, 2500));
      }
    }

    throw last ?? err("UNKNOWN", "Request failed", { path }, true);
  }
}
