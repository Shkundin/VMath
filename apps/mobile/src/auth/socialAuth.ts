import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";
import { AuthRequest, Prompt, ResponseType, makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || "";
const VK_APP_ID = process.env.EXPO_PUBLIC_VK_APP_ID?.trim() || "";

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth"
};

const VK_DISCOVERY = {
  authorizationEndpoint: "https://id.vk.ru/authorize"
};

let googleConfigured = false;

function createNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRedirectUri(path: string): string {
  return makeRedirectUri({
    scheme: "visualmath",
    path
  });
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_WEB_CLIENT_ID);
}

export function isVkAuthConfigured(): boolean {
  return Boolean(VK_APP_ID);
}

export function configureGoogleSignIn() {
  if (Platform.OS === "web" || googleConfigured || !GOOGLE_WEB_CLIENT_ID) {
    return;
  }

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
    scopes: ["email", "profile"]
  });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<{ idToken: string }> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Сначала укажи EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
  }

  if (Platform.OS !== "web") {
    return signInWithGoogleNative();
  }

  return signInWithGoogleWeb();
}

async function signInWithGoogleNative(): Promise<{ idToken: string }> {
  configureGoogleSignIn();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new Error("Вход через Google отменен.");
    }

    const idToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
    if (!idToken?.trim()) {
      throw new Error("Google не вернул ID token для входа.");
    }

    return {
      idToken: idToken.trim()
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message) {
      if (!isErrorWithCode(error)) {
        throw error;
      }
    }

    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.IN_PROGRESS:
          throw new Error("Вход через Google уже выполняется.");
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error("На устройстве недоступны Google Play Services.");
        default:
          throw new Error("Не удалось выполнить вход через Google.");
      }
    }

    throw new Error("Не удалось выполнить вход через Google.");
  }
}

async function signInWithGoogleWeb(): Promise<{ idToken: string }> {
  const request = new AuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri: getRedirectUri("auth/google"),
    responseType: ResponseType.IdToken,
    scopes: ["openid", "profile", "email"],
    usePKCE: false,
    prompt: [Prompt.SelectAccount],
    extraParams: {
      nonce: createNonce()
    }
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);
  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("Вход через Google отменен.");
  }

  if (result.type !== "success") {
    throw new Error("Не удалось выполнить вход через Google.");
  }

  const idToken = result.params.id_token?.trim();
  if (!idToken) {
    throw new Error("Google не вернул ID token для входа.");
  }

  return { idToken };
}

export async function signInWithVk(): Promise<{
  code: string;
  codeVerifier: string;
  deviceId: string;
  redirectUri: string;
  state: string;
}> {
  if (!VK_APP_ID) {
    throw new Error("Сначала укажи EXPO_PUBLIC_VK_APP_ID.");
  }

  const redirectUri = getRedirectUri("auth/vk");
  const request = new AuthRequest({
    clientId: VK_APP_ID,
    redirectUri,
    responseType: ResponseType.Code,
    scopes: ["email"],
    prompt: [Prompt.Login],
    usePKCE: true,
    extraParams: {
      app_id: VK_APP_ID,
      sdk_type: "vkid",
      v: "2.6.5"
    }
  });

  const result = await request.promptAsync(VK_DISCOVERY);
  if (result.type === "cancel" || result.type === "dismiss") {
    throw new Error("Вход через VK отменен.");
  }

  if (result.type !== "success") {
    throw new Error("Не удалось выполнить вход через VK.");
  }

  const code = result.params.code?.trim();
  const deviceId = result.params.device_id?.trim();
  const codeVerifier = request.codeVerifier?.trim();

  if (!code || !deviceId || !codeVerifier) {
    throw new Error("VK не вернул данные для завершения авторизации.");
  }

  return {
    code,
    codeVerifier,
    deviceId,
    redirectUri,
    state: request.state
  };
}
