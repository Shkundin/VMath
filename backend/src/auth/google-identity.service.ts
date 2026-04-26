import { HttpStatus, Injectable } from "@nestjs/common";
import { createPublicKey, createVerify, type JsonWebKey } from "crypto";
import { AppException } from "../common/http";
import { AppConfigService } from "../config/app-config";
import type { VerifiedExternalIdentity } from "./external-auth.types";

interface GoogleJwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface GoogleJwtPayload {
  aud?: string | string[];
  email?: string;
  email_verified?: boolean | string;
  exp?: number | string;
  iat?: number | string;
  iss?: string;
  name?: string;
  nbf?: number | string;
  sub?: string;
}

interface GoogleJwksResponse {
  keys?: JsonWebKey[];
}

type CachedGoogleKeys = {
  expiresAt: number;
  keys: Map<string, JsonWebKey>;
};

@Injectable()
export class GoogleIdentityService {
  private cachedKeys: CachedGoogleKeys | null = null;

  constructor(private readonly configService: AppConfigService) {}

  async verifyIdToken(idToken: string): Promise<VerifiedExternalIdentity> {
    const allowedClientIds = this.configService.value.googleOauthClientIds ?? [];
    if (allowedClientIds.length === 0) {
      throw new AppException(
        "HTTP",
        HttpStatus.SERVICE_UNAVAILABLE,
        "Google sign-in is not configured"
      );
    }

    const normalizedToken = idToken.trim();
    if (!normalizedToken) {
      throw new AppException("VALIDATION", HttpStatus.BAD_REQUEST, "idToken is required");
    }

    const parts = normalizedToken.split(".");
    if (parts.length !== 3) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Invalid Google ID token");
    }

    const [headerPart, payloadPart, signaturePart] = parts;
    const header = this.decodeJwtPart<GoogleJwtHeader>(headerPart, "header");
    const payload = this.decodeJwtPart<GoogleJwtPayload>(payloadPart, "payload");

    if (header.alg !== "RS256" || !header.kid) {
      throw new AppException(
        "AUTH",
        HttpStatus.UNAUTHORIZED,
        "Unsupported Google token signature"
      );
    }

    const key = await this.getGoogleKey(header.kid);
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerPart}.${payloadPart}`);
    verifier.end();

    const isSignatureValid = verifier.verify(
      createPublicKey({ key, format: "jwk" }),
      Buffer.from(signaturePart, "base64url")
    );

    if (!isSignatureValid) {
      throw new AppException(
        "AUTH",
        HttpStatus.UNAUTHORIZED,
        "Google token signature verification failed"
      );
    }

    const subject = String(payload.sub ?? "").trim();
    const issuer = String(payload.iss ?? "").trim();
    const email = String(payload.email ?? "").trim().toLowerCase();
    const emailVerified = payload.email_verified === true || payload.email_verified === "true";
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud].filter(Boolean);
    const expiresAtSec = Number(payload.exp ?? 0);
    const notBeforeSec = payload.nbf === undefined ? null : Number(payload.nbf);

    if (!subject) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Google token subject is missing");
    }

    if (
      issuer !== "accounts.google.com" &&
      issuer !== "https://accounts.google.com"
    ) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Google token issuer is invalid");
    }

    if (!audience.some((item) => allowedClientIds.includes(String(item)))) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Google token audience is invalid");
    }

    if (!Number.isFinite(expiresAtSec) || expiresAtSec * 1000 <= Date.now()) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Google token has expired");
    }

    if (notBeforeSec !== null && Number.isFinite(notBeforeSec) && notBeforeSec * 1000 > Date.now()) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Google token is not active yet");
    }

    if (!email || !emailVerified) {
      throw new AppException(
        "AUTH",
        HttpStatus.UNAUTHORIZED,
        "Google account email is missing or not verified"
      );
    }

    return {
      provider: "google",
      subject,
      email,
      fullName: String(payload.name ?? "").trim() || email,
      profile: {
        email,
        emailVerified,
        issuer,
        name: payload.name ?? null,
        subject
      }
    };
  }

  private decodeJwtPart<T>(part: string, segment: string): T {
    try {
      return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
    } catch {
      throw new AppException(
        "AUTH",
        HttpStatus.UNAUTHORIZED,
        `Invalid Google token ${segment}`
      );
    }
  }

  private async getGoogleKey(kid: string): Promise<JsonWebKey> {
    const cached = await this.getCachedKeys();
    const key = cached.keys.get(kid);
    if (!key) {
      throw new AppException("AUTH", HttpStatus.UNAUTHORIZED, "Unknown Google signing key");
    }

    return key;
  }

  private async getCachedKeys(): Promise<CachedGoogleKeys> {
    if (this.cachedKeys && this.cachedKeys.expiresAt > Date.now()) {
      return this.cachedKeys;
    }

    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!response.ok) {
      throw new AppException(
        "HTTP",
        HttpStatus.BAD_GATEWAY,
        "Could not fetch Google signing keys"
      );
    }

    const body = (await response.json()) as GoogleJwksResponse;
    const keys = new Map<string, JsonWebKey>();

    for (const key of body.keys ?? []) {
      const kid = typeof key.kid === "string" ? key.kid : "";
      if (kid) {
        keys.set(kid, key);
      }
    }

    if (keys.size === 0) {
      throw new AppException(
        "HTTP",
        HttpStatus.BAD_GATEWAY,
        "Google signing keys response was empty"
      );
    }

    const maxAgeSec = this.parseMaxAgeSec(response.headers.get("cache-control"));
    this.cachedKeys = {
      expiresAt: Date.now() + maxAgeSec * 1000,
      keys
    };

    return this.cachedKeys;
  }

  private parseMaxAgeSec(cacheControl: string | null): number {
    const match = cacheControl?.match(/max-age=(\d+)/i);
    const maxAgeSec = match ? Number(match[1]) : NaN;

    if (!Number.isFinite(maxAgeSec) || maxAgeSec <= 0) {
      return 60 * 60;
    }

    return maxAgeSec;
  }
}
