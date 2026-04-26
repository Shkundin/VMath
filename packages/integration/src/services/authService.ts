import { err, type UserProfile } from "@vm/shared";
import { HttpClient } from "../http/httpClient";
import type { TokenPair, TokenStorage } from "./tokenStorage";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

export interface RegisterStudentInput {
  login: string;
  password: string;
  fullName: string;
  groupName?: string;
}

export interface VkCodeLoginInput {
  code: string;
  codeVerifier: string;
  deviceId: string;
  redirectUri: string;
  state: string;
}

export class AuthService {
  constructor(
    private readonly http: HttpClient,
    private readonly storage: TokenStorage
  ) {}

  async login(
    login: string,
    password: string,
    role?: "student" | "teacher" | "admin"
  ): Promise<void> {
    if (!login || !password) {
      throw err("VALIDATION", "Login and password are required");
    }

    const response = await this.http.postJson<LoginResponse>("/api/v1/auth/login", {
      login,
      password,
      role
    });

    const tokens: TokenPair = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: Date.now() + response.expiresInSec * 1000
    };

    await this.storage.set(tokens);
  }

  async logout(): Promise<void> {
    const tokens = await this.storage.get();

    if (tokens?.refreshToken) {
      try {
        await this.http.postJson("/api/v1/auth/logout", {
          refreshToken: tokens.refreshToken
        });
      } catch {}
    }

    await this.storage.set(null);
  }

  async getAccessToken(): Promise<string | null> {
    const tokens = await this.storage.get();
    if (!tokens) {
      return null;
    }

    if (Date.now() > tokens.expiresAt) {
      return null;
    }

    return tokens.accessToken;
  }

  async refresh(): Promise<void> {
    const tokens = await this.storage.get();
    if (!tokens) {
      throw err("AUTH", "Missing refresh token");
    }

    const response = await this.http.postJson<LoginResponse>("/api/v1/auth/refresh", {
      refreshToken: tokens.refreshToken
    });

    const nextTokens: TokenPair = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: Date.now() + response.expiresInSec * 1000
    };

    await this.storage.set(nextTokens);
  }

  async me(): Promise<UserProfile> {
    return this.http.getJson<UserProfile>("/api/v1/auth/me");
  }

  async registerStudent(input: RegisterStudentInput): Promise<UserProfile> {
    if (!input.login || !input.password || !input.fullName) {
      throw err("VALIDATION", "Login, password, and fullName are required");
    }

    return this.http.postJson<UserProfile>("/api/v1/auth/register/student", input);
  }

  async loginWithGoogleIdToken(idToken: string): Promise<void> {
    if (!idToken.trim()) {
      throw err("VALIDATION", "Google ID token is required");
    }

    const response = await this.http.postJson<LoginResponse>("/api/v1/auth/social/google", {
      idToken
    });

    const nextTokens: TokenPair = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: Date.now() + response.expiresInSec * 1000
    };

    await this.storage.set(nextTokens);
  }

  async loginWithVkCode(input: VkCodeLoginInput): Promise<void> {
    if (!input.code || !input.codeVerifier || !input.deviceId || !input.redirectUri || !input.state) {
      throw err("VALIDATION", "VK auth payload is incomplete");
    }

    const response = await this.http.postJson<LoginResponse>("/api/v1/auth/social/vk", input);

    const nextTokens: TokenPair = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: Date.now() + response.expiresInSec * 1000
    };

    await this.storage.set(nextTokens);
  }
}
