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

interface GoogleJwtPayload {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

interface VkTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  scope?: string;
  user_id?: number | string;
}

interface VkUserInfo {
  avatar?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  user_id?: number | string;
}

interface VkUserInfoResponse {
  error?: string;
  error_description?: string;
  user?: VkUserInfo;
}

export type SocialIdentity = {
  provider: "google" | "vk";
  subject: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  googleIdToken?: string;
  vkAccessToken?: string;
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

function getVkRedirectUri(): string {
  return `vk${VK_APP_ID}://vk.ru/blank.html`;
}

function decodeJwtPayload<T>(token: string): T {
  const payloadPart = token.split(".")[1]?.trim() || "";
  const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4 || 4)) % 4)}`;

  if (typeof globalThis.atob !== "function") {
    throw new Error("Не удалось прочитать данные профиля Google в этом окружении.");
  }

  try {
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);

    return JSON.parse(json) as T;
  } catch {
    throw new Error("Google вернул некорректные данные профиля.");
  }
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

export async function signInWithGoogle(): Promise<SocialIdentity> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Сначала укажи EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
  }

  if (Platform.OS !== "web") {
    return signInWithGoogleNative();
  }

  return signInWithGoogleWeb();
}

async function signInWithGoogleNative(): Promise<SocialIdentity> {
  configureGoogleSignIn();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new Error("Вход через Google отменен.");
    }

    const googleUser = response.data.user;
    const subject = String(googleUser.id ?? googleUser.email ?? "").trim();
    const email = String(googleUser.email ?? "").trim().toLowerCase() || null;
    const fullName = String(googleUser.name ?? "").trim() || email || `Google user ${subject}`;

    if (!subject) {
      throw new Error("Google не вернул идентификатор пользователя.");
    }

    return {
      provider: "google",
      subject,
      email,
      fullName,
      avatarUrl: googleUser.photo ?? null,
      googleIdToken:
        "idToken" in response.data && typeof response.data.idToken === "string"
          ? response.data.idToken.trim() || undefined
          : undefined
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message && !isErrorWithCode(error)) {
      throw error;
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

async function signInWithGoogleWeb(): Promise<SocialIdentity> {
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

  const payload = decodeJwtPayload<GoogleJwtPayload>(idToken);
  const subject = String(payload.sub ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase() || null;
  const fullName = String(payload.name ?? "").trim() || email || `Google user ${subject}`;

  if (!subject) {
    throw new Error("Google не вернул идентификатор пользователя.");
  }

  return {
    provider: "google",
    subject,
    email,
    fullName,
    avatarUrl: typeof payload.picture === "string" ? payload.picture.trim() || null : null,
    googleIdToken: idToken
  };
}

export async function signInWithVk(): Promise<SocialIdentity> {
  if (!VK_APP_ID) {
    throw new Error("Сначала укажи EXPO_PUBLIC_VK_APP_ID.");
  }

  const redirectUri = getVkRedirectUri();
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
  const state = request.state?.trim();

  if (!code || !deviceId || !codeVerifier || !state) {
    throw new Error("VK не вернул данные для завершения авторизации.");
  }

  const tokenPayload = await exchangeVkCode({
    code,
    codeVerifier,
    deviceId,
    redirectUri,
    state
  });
  const userInfoPayload = await getVkUserInfo(tokenPayload.access_token);
  const vkUser = userInfoPayload.user ?? {};
  const subject = String(vkUser.user_id ?? tokenPayload.user_id ?? "").trim();
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
    vkAccessToken: tokenPayload.access_token
  };
}

async function exchangeVkCode(input: {
  code: string;
  codeVerifier: string;
  deviceId: string;
  redirectUri: string;
  state: string;
}): Promise<VkTokenResponse & { access_token: string }> {
  const query = new URLSearchParams({
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
    client_id: VK_APP_ID,
    code_verifier: input.codeVerifier,
    state: input.state,
    device_id: input.deviceId
  });

  const tokenResponse = await fetch(`https://id.vk.ru/oauth2/auth?${query.toString()}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code: input.code
    }).toString()
  });

  const tokenPayload = (await tokenResponse.json()) as VkTokenResponse;
  if (!tokenResponse.ok || tokenPayload.error || !tokenPayload.access_token) {
    throw new Error("VK не выдал access token для входа.");
  }

  return {
    ...tokenPayload,
    access_token: tokenPayload.access_token
  };
}

async function getVkUserInfo(accessToken: string): Promise<VkUserInfoResponse> {
  const userInfoResponse = await fetch(
    `https://id.vk.ru/oauth2/user_info?client_id=${encodeURIComponent(VK_APP_ID)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        access_token: accessToken
      }).toString()
    }
  );

  const userInfoPayload = (await userInfoResponse.json()) as VkUserInfoResponse;
  if (!userInfoResponse.ok || userInfoPayload.error) {
    throw new Error("VK не вернул данные пользователя.");
  }

  return userInfoPayload;
}
