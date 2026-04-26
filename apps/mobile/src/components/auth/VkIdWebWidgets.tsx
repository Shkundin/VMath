import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";

import type { SocialIdentity } from "../../auth/socialAuth";
import type { AppTheme } from "../../theme";
import { fixText } from "../../utils/fixText";

const VK_ID_SDK_SRC = "https://unpkg.com/@vkid/sdk@2/dist-sdk/umd/index.js";
const VK_ONE_TAP_OAUTH_LIST = ["ok_ru", "mail_ru"] as const;
const VK_OAUTH_LIST_FALLBACK = ["vkid", "mail_ru", "ok_ru"] as const;

type VkIdWebWidgetsProps = {
  theme: AppTheme;
  appId: string;
  appName?: string;
  redirectUrl: string;
  onSuccess: (identity: SocialIdentity) => Promise<void> | void;
};

type VkLoginSuccessPayload = {
  code?: string;
  device_id?: string;
  deviceId?: string;
};

type VkTokenResult = {
  access_token?: string;
  accessToken?: string;
  email?: string;
  user_id?: number | string;
  userId?: number | string;
};

type VkUserInfoItem = {
  avatar?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  user_id?: number | string;
};

type VkUserInfoResult = {
  user?: VkUserInfoItem;
};

type VkWidgetHandle = {
  on: (event: string, callback: (payload: unknown) => void) => VkWidgetHandle;
};

type VkWidgetInstance = {
  render: (params: Record<string, unknown>) => VkWidgetHandle;
};

type VkIdSdk = {
  Auth: {
    exchangeCode: (code: string, deviceId: string) => Promise<VkTokenResult>;
    userInfo?: (accessToken: string) => Promise<VkUserInfoResult>;
  };
  Config: {
    init: (params: {
      app: number;
      redirectUrl: string;
      responseMode: string;
      source: string;
      scope: string;
    }) => void;
  };
  ConfigResponseMode: {
    Callback: string;
  };
  ConfigSource: {
    LOWCODE: string;
  };
  FloatingOneTapInternalEvents?: {
    LOGIN_SUCCESS?: string;
  };
  OAuthList: new () => VkWidgetInstance;
  OAuthListInternalEvents: {
    LOGIN_SUCCESS: string;
  };
  OneTap: new () => VkWidgetInstance;
  OneTapInternalEvents: {
    LOGIN_SUCCESS: string;
  };
  WidgetEvents: {
    ERROR: string;
  };
};

declare global {
  interface Window {
    VKIDSDK?: VkIdSdk;
  }
}

let vkIdSdkPromise: Promise<VkIdSdk> | null = null;

function readVkIdSdkFromWindow(): VkIdSdk | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.VKIDSDK ?? null;
}

function loadVkIdSdk(): Promise<VkIdSdk> {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return Promise.reject(new Error("VK ID web widgets доступны только в браузере."));
  }

  const existingSdk = readVkIdSdkFromWindow();
  if (existingSdk) {
    return Promise.resolve(existingSdk);
  }

  if (vkIdSdkPromise) {
    return vkIdSdkPromise;
  }

  vkIdSdkPromise = new Promise<VkIdSdk>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-vkid-sdk="true"]'
    );

    const finishResolve = () => {
      const sdk = readVkIdSdkFromWindow();
      if (sdk) {
        resolve(sdk);
        return;
      }

      reject(new Error("VK ID SDK загрузился, но объект window.VKIDSDK не появился."));
    };

    if (existingScript) {
      if (existingScript.getAttribute("data-loaded") === "true") {
        finishResolve();
        return;
      }

      existingScript.addEventListener("load", finishResolve, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Не удалось загрузить VK ID SDK.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = VK_ID_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-vkid-sdk", "true");
    script.onload = () => {
      script.setAttribute("data-loaded", "true");
      finishResolve();
    };
    script.onerror = () => {
      reject(new Error("Не удалось загрузить VK ID SDK."));
    };

    document.head.appendChild(script);
  }).catch((error: unknown) => {
    vkIdSdkPromise = null;
    throw error;
  });

  return vkIdSdkPromise;
}

function readVkCallbackPayload(): VkLoginSuccessPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const pathname = String(window.location.pathname ?? "").toLowerCase();
  if (!pathname.endsWith("/auth/vk")) {
    return null;
  }

  const search = new URLSearchParams(window.location.search);
  const code = search.get("code")?.trim() || "";
  const deviceId = search.get("device_id")?.trim() || search.get("deviceId")?.trim() || "";

  if (!code || !deviceId) {
    return null;
  }

  return {
    code,
    device_id: deviceId
  };
}

function clearVkCallbackUrl(redirectUrl: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const redirect = new URL(redirectUrl, window.location.origin);
    const cleanPath = redirect.pathname.replace(/\/auth\/vk\/?$/i, "") || "/";
    const nextUrl = `${redirect.origin}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;

    window.history.replaceState({}, document.title, nextUrl);
  } catch {}
}

function getSafeVkMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return fixText(error.message.trim());
  }

  if (error && typeof error === "object") {
    const maybeMessage = Reflect.get(error, "message");
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return fixText(maybeMessage.trim());
    }

    const maybeDescription = Reflect.get(error, "error_description");
    if (typeof maybeDescription === "string" && maybeDescription.trim()) {
      return fixText(maybeDescription.trim());
    }
  }

  return fixText(fallback);
}

function buildMinimalVkIdentity(tokens: VkTokenResult): SocialIdentity {
  const subject = String(tokens.user_id ?? tokens.userId ?? "").trim();
  const email = String(tokens.email ?? "").trim().toLowerCase() || null;

  if (!subject) {
    throw new Error("VK не вернул идентификатор пользователя.");
  }

  return {
    provider: "vk",
    subject,
    email,
    fullName: email || `VK user ${subject}`,
    avatarUrl: null
  };
}

function toVkIdentity(
  userInfo: VkUserInfoResult | null | undefined,
  fallbackTokens: VkTokenResult
): SocialIdentity | null {
  const profile = userInfo?.user;
  if (!profile) {
    return null;
  }

  const subject = String(profile.user_id ?? fallbackTokens.user_id ?? fallbackTokens.userId ?? "").trim();
  const email = String(profile.email ?? fallbackTokens.email ?? "").trim().toLowerCase() || null;
  const fullName = [profile.first_name, profile.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!subject) {
    return null;
  }

  return {
    provider: "vk",
    subject,
    email,
    fullName: fullName || email || `VK user ${subject}`,
    avatarUrl: String(profile.avatar ?? "").trim() || null
  };
}

export function VkIdWebWidgets({
  theme,
  appId,
  appName = "VisualMath",
  redirectUrl,
  onSuccess
}: VkIdWebWidgetsProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const oneTapContainerId = useMemo(
    () => `vkid-onetap-${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const oauthListContainerId = useMemo(
    () => `vkid-oauth-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  const onSuccessRef = useRef(onSuccess);
  const mountedRef = useRef(true);
  const fallbackRenderedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(Platform.OS === "web");
  const [initError, setInitError] = useState("");
  const [authError, setAuthError] = useState("");
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      setIsLoading(false);
      setInitError(fixText("VK ID web widgets доступны только в браузере."));
      return;
    }

    if (typeof document === "undefined") {
      setIsLoading(false);
      setInitError(fixText("Не удалось получить доступ к документу браузера."));
      return;
    }

    const numericAppId = Number(String(appId ?? "").trim());
    if (!Number.isFinite(numericAppId) || numericAppId <= 0) {
      setIsLoading(false);
      setInitError(fixText("Сначала укажи корректный EXPO_PUBLIC_VK_APP_ID."));
      return;
    }

    let cancelled = false;

    function clearContainer(containerId: string) {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = "";
      }
    }

    async function finishVkLogin(sdk: VkIdSdk, payload: VkLoginSuccessPayload) {
      const code = String(payload.code ?? "").trim();
      const deviceId = String(payload.device_id ?? payload.deviceId ?? "").trim();

      if (!code || !deviceId) {
        throw new Error("VK не вернул code или device_id для завершения входа.");
      }

      if (!cancelled && mountedRef.current) {
        setAuthError("");
        setIsLoading(true);
      }

      const tokens = await sdk.Auth.exchangeCode(code, deviceId);
      const accessToken = String(tokens.access_token ?? tokens.accessToken ?? "").trim();

      let identity = buildMinimalVkIdentity(tokens);

      if (accessToken && typeof sdk.Auth.userInfo === "function") {
        try {
          const userInfo = await sdk.Auth.userInfo(accessToken);
          identity = toVkIdentity(userInfo, tokens) ?? identity;
        } catch {}
      }

      clearVkCallbackUrl(redirectUrl);
      await onSuccessRef.current(identity);
    }

    async function renderOAuthListFallback(sdk: VkIdSdk, reason?: unknown) {
      if (cancelled || !mountedRef.current || fallbackRenderedRef.current) {
        return;
      }

      fallbackRenderedRef.current = true;
      setIsFallbackMode(true);
      clearContainer(oneTapContainerId);

      const container = document.getElementById(oauthListContainerId);
      if (!container) {
        setInitError(
          getSafeVkMessage(
            reason,
            "VK ID не нашёл контейнер для резервного способа входа."
          )
        );
        setIsLoading(false);
        return;
      }

      container.innerHTML = "";

      try {
        const oauthList = new sdk.OAuthList();
        oauthList
          .render({
            container,
            oauthList: [...VK_OAUTH_LIST_FALLBACK]
          })
          .on(sdk.WidgetEvents.ERROR, (error) => {
            if (!mountedRef.current || cancelled) {
              return;
            }

            setInitError(
              getSafeVkMessage(
                error,
                "VK ID сейчас не может показать резервный способ входа."
              )
            );
            setIsLoading(false);
          })
          .on(sdk.OAuthListInternalEvents.LOGIN_SUCCESS, (payload) => {
            void finishVkLogin(sdk, payload as VkLoginSuccessPayload).catch((error: unknown) => {
              if (!mountedRef.current || cancelled) {
                return;
              }

              setAuthError(
                getSafeVkMessage(error, "Не удалось выполнить вход через VK.")
              );
              setIsLoading(false);
            });
          });

        setIsLoading(false);
      } catch (error: unknown) {
        setInitError(
          getSafeVkMessage(error, "VK ID не смог включить резервный способ входа.")
        );
        setIsLoading(false);
      }
    }

    async function renderPrimaryOneTap(sdk: VkIdSdk) {
      const container = document.getElementById(oneTapContainerId);
      if (!container) {
        throw new Error("VK ID не нашёл контейнер для основного виджета.");
      }

      container.innerHTML = "";

      const oneTap = new sdk.OneTap();
      oneTap
        .render({
          container,
          showAlternativeLogin: true,
          oauthList: [...VK_ONE_TAP_OAUTH_LIST]
        })
        .on(sdk.WidgetEvents.ERROR, (error) => {
          void renderOAuthListFallback(sdk, error);
        })
        .on(sdk.OneTapInternalEvents.LOGIN_SUCCESS, (payload) => {
          void finishVkLogin(sdk, payload as VkLoginSuccessPayload).catch((error: unknown) => {
            if (!mountedRef.current || cancelled) {
              return;
            }

            setAuthError(
              getSafeVkMessage(error, "Не удалось выполнить вход через VK.")
            );
            setIsLoading(false);
          });
        });

      setIsLoading(false);
    }

    async function initialize() {
      try {
        setIsLoading(true);
        setInitError("");
        setAuthError("");
        setIsFallbackMode(false);
        fallbackRenderedRef.current = false;

        clearContainer(oneTapContainerId);
        clearContainer(oauthListContainerId);

        const sdk = await loadVkIdSdk();
        if (cancelled) {
          return;
        }

        sdk.Config.init({
          app: numericAppId,
          redirectUrl,
          responseMode: sdk.ConfigResponseMode.Callback,
          source: sdk.ConfigSource.LOWCODE,
          scope: ""
        });

        const callbackPayload = readVkCallbackPayload();
        if (callbackPayload) {
          try {
            await finishVkLogin(sdk, callbackPayload);
            return;
          } catch (error: unknown) {
            clearVkCallbackUrl(redirectUrl);

            if (!mountedRef.current || cancelled) {
              return;
            }

            setAuthError(
              getSafeVkMessage(error, "Не удалось завершить вход через VK после возврата.")
            );
          }
        }

        await renderPrimaryOneTap(sdk);
      } catch (error: unknown) {
        if (!mountedRef.current || cancelled) {
          return;
        }

        setInitError(
          getSafeVkMessage(error, "Не удалось подготовить официальный вход VK ID.")
        );
        setIsLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      clearContainer(oneTapContainerId);
      clearContainer(oauthListContainerId);
    };
  }, [appId, oauthListContainerId, oneTapContainerId, redirectUrl]);

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>VK ID</Text>
      <Text style={styles.subtitle}>
        {fixText(`Официальный вход через VK ID, Mail.ru и Одноклассники для сайта ${appName}.`)}
      </Text>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Подключаем официальный VK ID...</Text>
        </View>
      ) : null}

      <View nativeID={oneTapContainerId} style={styles.oneTapHost} />

      <View
        nativeID={oauthListContainerId}
        style={[styles.oauthListHost, !isFallbackMode ? styles.hiddenHost : null]}
      />

      {isFallbackMode ? (
        <Text style={styles.infoText}>
          Основной VK ID виджет сейчас недоступен, поэтому подключён резервный способ входа.
        </Text>
      ) : null}

      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      {initError ? <Text style={styles.errorText}>{initError}</Text> : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing.sm
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    subtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.sm
    },
    loadingText: {
      marginLeft: theme.spacing.sm,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary
    },
    oneTapHost: {
      width: "100%",
      minHeight: 208
    },
    oauthListHost: {
      width: "100%",
      minHeight: 88
    },
    hiddenHost: {
      display: "none"
    },
    infoText: {
      marginTop: theme.spacing.sm,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    errorText: {
      marginTop: theme.spacing.sm,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      fontWeight: "700",
      color: theme.colors.danger
    }
  });
}
