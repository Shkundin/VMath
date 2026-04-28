import { Platform } from "react-native";

const LOCAL_API_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_PRODUCTION_API_BASE_URL = "https://vmath.onrender.com";

const envBaseUrl =
  process.env.EXPO_PUBLIC_VM_API_BASE_URL?.trim() ||
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  "";
const envWsUrl =
  process.env.EXPO_PUBLIC_VM_WS_URL?.trim() ||
  process.env.EXPO_PUBLIC_WS_URL?.trim() ||
  "";

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").replace(/\/api\/v1$/i, "");
}

function getDefaultBaseUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0";

    if (isLocalHost) {
      return envBaseUrl ? normalizeApiBaseUrl(envBaseUrl) : LOCAL_API_BASE_URL;
    }

    return origin;
  }

  if (envBaseUrl) {
    return normalizeApiBaseUrl(envBaseUrl);
  }

  return LOCAL_API_BASE_URL;
}

function getDefaultWsUrl(): string {
  if (envWsUrl) {
    return envWsUrl.replace(/\/+$/, "");
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const normalizedHost = hostname.trim().toLowerCase();
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0";
    const looksLikeBackendHost = normalizedHost.endsWith(".onrender.com");

    if (!isLocalHost && !looksLikeBackendHost) {
      return `${DEFAULT_PRODUCTION_API_BASE_URL.replace(/^http/i, "ws")}/ws`;
    }

    return `${origin.replace(/^http/i, "ws")}/ws`;
  }

  return `${API_BASE_URL.replace(/^http/i, "ws")}/ws`;
}

export const API_BASE_URL = getDefaultBaseUrl().replace(/\/+$/, "");
export const WS_BASE_URL = getDefaultWsUrl();
