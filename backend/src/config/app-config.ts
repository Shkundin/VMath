import { Inject, Injectable } from "@nestjs/common";

export const APP_CONFIG = Symbol("APP_CONFIG");

export interface AppConfig {
  port: number;
  nodeEnv: string;
  isProduction?: boolean;
  isRender?: boolean;
  trustProxy?: boolean;
  appUrl: string;
  apiBaseUrl: string;
  corsOrigins: string[];
  wsCorsOrigins: string[];
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  databaseUrl: string;
  supabaseUrl?: string | null;
  supabaseAnonKey?: string | null;
  supabaseServiceRoleKey?: string | null;
  googleOauthClientIds?: string[];
  vkAppId?: string | null;
  vkAppIds?: string[];
  accessTokenTtlSec: number;
  refreshTokenTtlSec: number;
}

const LOCAL_CORS_FALLBACK =
  "http://localhost:19006,http://127.0.0.1:19006,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://127.0.0.1:8081";

function parseRequired(name: string, isProduction: boolean, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }

  if (!isProduction && fallback) {
    return fallback;
  }

  const suffix = isProduction
    ? "Production deployments must configure this secret explicitly."
    : "Provide it in the environment or update the local .env file.";
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. ${suffix}`);
  }

  return value;
}

function parseNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a finite number`);
  }

  return value;
}

function parseOrigins(value: string | undefined, fallback: string): string[] {
  return (value?.trim() || fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseOptional(name: string, fallback?: string): string | null {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }

  return fallback?.trim() || null;
}

function parseBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) {
    return fallback;
  }

  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function parseStringList(rawValue: string | undefined, fallback: string[] = []): string[] {
  if (!rawValue?.trim()) {
    return fallback;
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadAppConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV?.trim() || "development";
  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.trim() || "";
  const isRender = Boolean(
    process.env.RENDER?.trim() ||
      process.env.RENDER_SERVICE_ID?.trim() ||
      renderExternalUrl
  );
  const isProduction = nodeEnv === "production" || isRender;
  const appUrl = process.env.APP_URL?.trim() || renderExternalUrl || "http://localhost:8787";
  const apiBaseUrl = process.env.API_BASE_URL?.trim() || `${appUrl.replace(/\/+$/, "")}/api/v1`;
  const defaultCorsOrigins = isProduction ? "*" : LOCAL_CORS_FALLBACK;

  return {
    port: parseNumber("PORT", 8787),
    nodeEnv,
    isProduction,
    isRender,
    trustProxy: parseBoolean("TRUST_PROXY", isRender),
    appUrl,
    apiBaseUrl,
    corsOrigins: parseOrigins(process.env.CORS_ORIGIN, defaultCorsOrigins),
    wsCorsOrigins: parseOrigins(process.env.WS_CORS_ORIGIN, defaultCorsOrigins),
    jwtAccessSecret: parseRequired(
      "JWT_ACCESS_SECRET",
      isProduction,
      "vm-dev-access-secret"
    ),
    jwtRefreshSecret: parseRequired(
      "JWT_REFRESH_SECRET",
      isProduction,
      "vm-dev-refresh-secret"
    ),
    databaseUrl: parseRequired(
      "DATABASE_URL",
      isProduction,
      "postgres://postgres:postgres@127.0.0.1:54322/postgres"
    ),
    supabaseUrl: parseOptional("SUPABASE_URL", "http://127.0.0.1:54321"),
    supabaseAnonKey: parseOptional("SUPABASE_ANON_KEY", "vm-dev-anon-key"),
    supabaseServiceRoleKey: parseOptional(
      "SUPABASE_SERVICE_ROLE_KEY",
      "vm-dev-service-role-key"
    ),
    googleOauthClientIds: parseStringList(
      process.env.GOOGLE_OAUTH_CLIENT_IDS ?? process.env.GOOGLE_WEB_CLIENT_ID,
      []
    ),
    vkAppId: parseOptional("VK_APP_ID"),
    vkAppIds: parseStringList(
      [
        process.env.VK_APP_IDS,
        process.env.VK_APP_ID,
        process.env.VK_ANDROID_APP_ID
      ]
        .filter(Boolean)
        .join(","),
      []
    ),
    accessTokenTtlSec: parseNumber("JWT_ACCESS_TTL_SEC", 900),
    refreshTokenTtlSec: parseNumber("JWT_REFRESH_TTL_SEC", 60 * 60 * 24 * 30)
  };
}

@Injectable()
export class AppConfigService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get value(): AppConfig {
    return this.config;
  }
}
