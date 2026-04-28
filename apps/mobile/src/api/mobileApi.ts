import {
  AuthService,
  CatalogService,
  ClassroomService,
  HttpClient,
  QuizService,
  SessionService,
  WsClient,
  type TokenProvider
} from "@vm/integration";
import { normalizeError } from "@vm/shared";
import { API_BASE_URL, WS_BASE_URL } from "../config/api";
import { clearAuthSession, mobileTokenStorage } from "../storage/authStorage";

class RefreshingTokenProvider implements TokenProvider {
  private authService: AuthService | null = null;
  private refreshPromise: Promise<void> | null = null;

  bind(authService: AuthService) {
    this.authService = authService;
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.authService) {
      return null;
    }

    return this.authService.getAccessToken();
  }

  async onAuthFail(): Promise<void> {
    if (!this.authService) {
      return;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.authService
        .refresh()
        .catch(async (error: unknown) => {
          await clearAuthSession();
          throw error;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    if (this.refreshPromise) {
      await this.refreshPromise;
    }
  }
}

const tokenProvider = new RefreshingTokenProvider();

const httpClient = new HttpClient(
  {
    baseUrl: API_BASE_URL,
    timeoutMs: 15000,
    maxRetries: 2
  },
  tokenProvider
);

const wsClient = new WsClient(
  {
    url: WS_BASE_URL,
    maxRetries: 8,
    pingIntervalMs: 25000,
    getToken: () => tokenProvider.getAccessToken()
  },
  () => {
  },
  () => {
  }
);

export const authApi = new AuthService(httpClient, mobileTokenStorage);
tokenProvider.bind(authApi);

export const catalogApi = new CatalogService(httpClient);
export const classroomApi = new ClassroomService(httpClient);
export const sessionApi = new SessionService(httpClient, wsClient);
export const quizApi = new QuizService(httpClient);

function extractServerMessage(details: unknown): string | null {
  if (!details) {
    return null;
  }

  if (typeof details === "string") {
    try {
      return extractServerMessage(JSON.parse(details));
    } catch {
      return details.trim() || null;
    }
  }

  if (typeof details !== "object") {
    return null;
  }

  const payload = details as {
    error?: { message?: unknown };
    message?: unknown;
  };
  const message = payload.error?.message ?? payload.message;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

function translateServerMessage(message: string): string {
  switch (message) {
    case "Google sign-in is not configured":
      return "Google-вход не настроен на сервере. Добавь GOOGLE_OAUTH_CLIENT_IDS в backend env.";
    case "VK sign-in is not configured":
      return "VK-вход не настроен на сервере. Добавь VK_APP_ID в backend env.";
    case "VK user info request failed":
      return "VK не подтвердил профиль. Проверь VK_APP_ID и настройки VK ID.";
    case "VK authentication failed":
      return "VK не подтвердил вход. Попробуй снова или проверь настройки VK ID.";
    case "Google token audience is invalid":
      return "Google client ID не совпадает с настройками backend.";
    case "Google token signature verification failed":
    case "Invalid Google ID token":
      return "Google не подтвердил токен входа. Попробуй снова.";
    default:
      return message;
  }
}

export function toUserMessage(error: unknown): string {
  const normalized = normalizeError(error);
  const serverMessage = extractServerMessage(normalized.details);

  if ((normalized.code === "HTTP" || normalized.code === "AUTH") && serverMessage) {
    return translateServerMessage(serverMessage);
  }

  switch (normalized.code) {
    case "AUTH":
      return "Сессия истекла или логин/пароль неверны.";
    case "NETWORK":
      return "Нет соединения с сервером. Проверь адрес API и сеть.";
    case "HTTP":
      return "Сервер ответил ошибкой. Попробуй ещё раз.";
    case "VALIDATION":
      return normalized.message;
    case "WS":
      return "Проблема с каналом синхронизации.";
    default:
      return "Что-то пошло не так. Попробуй ещё раз.";
  }
}
