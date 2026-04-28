import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";

import type { SocialIdentity } from "../../auth/socialAuth";
import type { AppTheme } from "../../theme";
import { fixText } from "../../utils/fixText";

const VK_ID_SDK_SRC = "https://unpkg.com/@vkid/sdk@2.6.5/dist-sdk/umd/index.js";

type VkIdWebWidgetsProps = {
  appId: string;
  appName: string;
  onSuccess: (identity: SocialIdentity) => Promise<void> | void;
  redirectUrl: string;
  theme: AppTheme;
};

type VkLoginSuccessPayload = {
  code?: string;
  device_id?: string;
  deviceId?: string;
};

type VkTokenResult = {
  access_token?: string;
  user_id?: number | string;
};

type VkUserInfoResult = {
  user?: {
    avatar?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    user_id?: number | string;
  };
};

type VkWidgetHandle = {
  on: (eventName: string, listener: (payload: unknown) => void) => VkWidgetHandle;
};

type VkIdSdk = {
  Auth: {
    exchangeCode: (code: string, deviceId: string) => Promise<VkTokenResult>;
    userInfo: (accessToken: string) => Promise<VkUserInfoResult>;
  };
  Config: {
    init: (params: {
      app: number;
      redirectUrl: string;
      responseMode: string;
      scope: string;
      source: string;
    }) => void;
  };
  ConfigResponseMode: {
    Callback: string;
  };
  ConfigSource: {
    LOWCODE: string;
  };
  OAuthName?: {
    MAIL?: string;
    OK?: string;
  };
  OneTap: new () => {
    render: (params: {
      container: HTMLElement;
      oauthList?: string[];
      showAlternativeLogin?: boolean;
    }) => VkWidgetHandle;
  };
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
  if (typeof window === "undefined" || !window.VKIDSDK) {
    return null;
  }

  return window.VKIDSDK;
}

function loadVkIdSdk(): Promise<VkIdSdk> {
  const existingSdk = readVkIdSdkFromWindow();
  if (existingSdk) {
    return Promise.resolve(existingSdk);
  }

  if (vkIdSdkPromise) {
    return vkIdSdkPromise;
  }

  vkIdSdkPromise = new Promise<VkIdSdk>((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("VK ID widgets доступны только в браузере."));
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${VK_ID_SDK_SRC}"]`
    );

    const handleReady = () => {
      const sdk = readVkIdSdkFromWindow();
      if (!sdk) {
        reject(new Error("VK ID SDK загрузился, но объект SDK недоступен."));
        return;
      }

      resolve(sdk);
    };

    if (existingScript) {
      if (readVkIdSdkFromWindow()) {
        handleReady();
        return;
      }

      existingScript.addEventListener("load", handleReady, { once: true });
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
    script.onload = handleReady;
    script.onerror = () => reject(new Error("Не удалось загрузить VK ID SDK."));
    document.head.appendChild(script);
  }).catch((error) => {
    vkIdSdkPromise = null;
    throw error;
  });

  return vkIdSdkPromise;
}

function toVkIdentity(
  userInfo: VkUserInfoResult,
  fallbackUserId?: number | string,
  accessToken?: string
): SocialIdentity {
  const vkUser = userInfo.user ?? {};
  const subject = String(vkUser.user_id ?? fallbackUserId ?? "").trim();
  const email =
    typeof vkUser.email === "string" && vkUser.email.includes("@")
      ? vkUser.email.trim().toLowerCase()
      : null;
  const fullName = [vkUser.first_name, vkUser.last_name]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!subject) {
    throw new Error("VK не вернул идентификатор пользователя.");
  }

  return {
    provider: "vk",
    subject,
    email,
    fullName: fullName || email || `VK user ${subject}`,
    avatarUrl: typeof vkUser.avatar === "string" ? vkUser.avatar.trim() || null : null,
    vkAccessToken: accessToken?.trim() || undefined
  };
}

function getVkAlternativeOauthList(sdk: VkIdSdk): string[] {
  return [sdk.OAuthName?.OK ?? "ok_ru", sdk.OAuthName?.MAIL ?? "mail_ru"];
}

export function VkIdWebWidgets({
  appId,
  appName: _appName,
  onSuccess,
  redirectUrl,
  theme
}: VkIdWebWidgetsProps) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const oneTapContainerId = useMemo(
    () => `vkid-one-tap-${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    if (!appId.trim()) {
      setIsLoading(false);
      setError("Для VK входа добавь EXPO_PUBLIC_VK_APP_ID в переменные окружения фронта.");
      return;
    }

    let isDisposed = false;

    const handleError = (reason: unknown) => {
      const message =
        reason instanceof Error && reason.message
          ? reason.message
          : "Не удалось выполнить вход через VK.";

      if (!isDisposed) {
        setError(fixText(message));
      }
    };

    const handleLoginSuccess = async (sdk: VkIdSdk, payload: unknown) => {
      try {
        setError("");

        const safePayload = (payload ?? {}) as VkLoginSuccessPayload;
        const code = String(safePayload.code ?? "").trim();
        const deviceId = String(safePayload.device_id ?? safePayload.deviceId ?? "").trim();

        if (!code || !deviceId) {
          throw new Error("VK не вернул код авторизации для завершения входа.");
        }

        const tokenResult = await sdk.Auth.exchangeCode(code, deviceId);
        const accessToken = String(tokenResult.access_token ?? "").trim();

        if (!accessToken) {
          throw new Error("VK не выдал access token для входа.");
        }

        const userInfo = await sdk.Auth.userInfo(accessToken);
        const identity = toVkIdentity(userInfo, tokenResult.user_id, accessToken);

        await onSuccessRef.current(identity);
      } catch (reason: unknown) {
        handleError(reason);
      }
    };

    void (async () => {
      try {
        const sdk = await loadVkIdSdk();
        if (isDisposed) {
          return;
        }

        const numericAppId = Number.parseInt(appId, 10);
        if (!Number.isFinite(numericAppId) || numericAppId <= 0) {
          throw new Error("EXPO_PUBLIC_VK_APP_ID должен быть числом из кабинета VK ID.");
        }

        sdk.Config.init({
          app: numericAppId,
          redirectUrl,
          responseMode: sdk.ConfigResponseMode.Callback,
          source: sdk.ConfigSource.LOWCODE,
          scope: "email"
        });

        const oneTapContainer = document.getElementById(oneTapContainerId);
        if (!oneTapContainer) {
          throw new Error("Не удалось подготовить контейнер для VK ID виджета.");
        }

        const oneTap = new sdk.OneTap();
        oneTap
          .render({
            container: oneTapContainer,
            showAlternativeLogin: true,
            oauthList: getVkAlternativeOauthList(sdk)
          })
          .on(sdk.WidgetEvents.ERROR, handleError)
          .on(sdk.OneTapInternalEvents.LOGIN_SUCCESS, (payload) => {
            void handleLoginSuccess(sdk, payload);
          });

        setIsLoading(false);
      } catch (reason: unknown) {
        setIsLoading(false);
        handleError(reason);
      }
    })();

    return () => {
      isDisposed = true;
    };
  }, [appId, oneTapContainerId, redirectUrl]);

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <View style={styles.card}>
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Подключаем VK ID...</Text>
        </View>
      ) : null}

      <View nativeID={oneTapContainerId} style={styles.oneTapContainer} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      width: "100%"
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 28,
      marginBottom: theme.spacing.sm
    },
    loadingText: {
      marginLeft: theme.spacing.sm,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary
    },
    oneTapContainer: {
      minHeight: 52
    },
    errorText: {
      marginTop: theme.spacing.sm,
      color: theme.colors.danger,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    }
  });
}
