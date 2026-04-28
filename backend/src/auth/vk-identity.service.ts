import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../common/http";
import { AppConfigService } from "../config/app-config";
import type { VerifiedExternalIdentity } from "./external-auth.types";

interface VkTokenResponse {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  state?: string;
  token_type?: string;
  user_id?: number | string;
  error?: string;
  error_description?: string;
}

interface VkUserInfo {
  avatar?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  user_id?: number | string;
}

interface VkUserInfoResponse {
  user?: VkUserInfo;
  error?: string;
  error_description?: string;
}

@Injectable()
export class VkIdentityService {
  constructor(private readonly configService: AppConfigService) {}

  async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    deviceId: string;
    redirectUri: string;
    state: string;
  }): Promise<VerifiedExternalIdentity> {
    const clientId = this.configService.value.vkAppId?.trim();
    if (!clientId) {
      throw new AppException("HTTP", HttpStatus.SERVICE_UNAVAILABLE, "VK sign-in is not configured");
    }

    const code = input.code.trim();
    const codeVerifier = input.codeVerifier.trim();
    const deviceId = input.deviceId.trim();
    const redirectUri = input.redirectUri.trim();
    const state = input.state.trim();

    if (!code || !codeVerifier || !deviceId || !redirectUri || !state) {
      throw new AppException(
        "VALIDATION",
        HttpStatus.BAD_REQUEST,
        "VK auth payload is incomplete"
      );
    }

    const query = new URLSearchParams({
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
      state,
      device_id: deviceId
    });

    const tokenResponse = await fetch(`https://id.vk.ru/oauth2/auth?${query.toString()}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code
      }).toString()
    });

    const tokenPayload = (await tokenResponse.json()) as VkTokenResponse;
    if (!tokenResponse.ok || tokenPayload.error || !tokenPayload.access_token) {
      throw new AppException(
        "AUTH",
        HttpStatus.UNAUTHORIZED,
        "VK authentication failed",
        tokenPayload
      );
    }

    return this.resolveAccessToken(tokenPayload.access_token, {
      fallbackSubject: tokenPayload.user_id,
      scope: tokenPayload.scope ?? null
    });
  }

  async resolveAccessToken(
    accessToken: string,
    options?: { fallbackSubject?: number | string | null; scope?: string | null }
  ): Promise<VerifiedExternalIdentity> {
    const clientId = this.configService.value.vkAppId?.trim();
    if (!clientId) {
      throw new AppException("HTTP", HttpStatus.SERVICE_UNAVAILABLE, "VK sign-in is not configured");
    }

    const normalizedAccessToken = accessToken.trim();
    if (!normalizedAccessToken) {
      throw new AppException("VALIDATION", HttpStatus.BAD_REQUEST, "VK access token is required");
    }

    const userInfoResponse = await fetch(
      `https://id.vk.ru/oauth2/user_info?client_id=${encodeURIComponent(clientId)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          access_token: normalizedAccessToken
        }).toString()
      }
    );

    const userInfoPayload = (await userInfoResponse.json()) as VkUserInfoResponse;
    if (!userInfoResponse.ok || userInfoPayload.error) {
      throw new AppException(
        "AUTH",
        HttpStatus.UNAUTHORIZED,
        "VK user info request failed",
        userInfoPayload
      );
    }

    const vkUser = userInfoPayload.user ?? {};
    const subject = String(vkUser.user_id ?? options?.fallbackSubject ?? "").trim();
    if (!subject) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "VK user id is missing");
    }

    const email =
      typeof vkUser.email === "string" && vkUser.email.includes("@")
        ? vkUser.email.trim().toLowerCase()
        : null;
    const fullName = [vkUser.first_name, vkUser.last_name]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      provider: "vk",
      subject,
      email,
      fullName: fullName || email || `VK user ${subject}`,
      profile: {
        avatar: vkUser.avatar ?? null,
        email,
        phone: vkUser.phone ?? null,
        scope: options?.scope ?? null,
        subject
      }
    };
  }
}
