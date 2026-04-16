import { Platform } from "react-native";

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
  if (envBaseUrl) {
    return normalizeApiBaseUrl(envBaseUrl);
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0";

    if (isLocalHost) {
      return "http://127.0.0.1:8787";
    }

    return origin;
  }

  return "http://127.0.0.1:8787";
}

export const API_BASE_URL = getDefaultBaseUrl().replace(/\/+$/, "");
export const WS_BASE_URL = envWsUrl
  ? envWsUrl.replace(/\/+$/, "")
  : `${API_BASE_URL.replace(/^http/i, "ws")}/ws`;
