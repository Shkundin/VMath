import { Injectable } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { Role } from "@vm/shared";
import { AppException, type AuthenticatedUser } from "../common/http";
import { AppConfigService } from "../config/app-config";

export interface AccessTokenPayload {
  sub: string;
  login: string;
  role: Role;
  sid: string;
  jti: string;
  type: "access";
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  login: string;
  role: Role;
  sid: string;
  jti: string;
  type: "refresh";
  iat: number;
  exp: number;
}

type TokenPayload = AccessTokenPayload | RefreshTokenPayload;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

@Injectable()
export class JwtTokenService {
  constructor(private readonly configService: AppConfigService) {}

  get accessTokenTtlSec(): number {
    return this.configService.value.accessTokenTtlSec;
  }

  get refreshTokenTtlSec(): number {
    return this.configService.value.refreshTokenTtlSec;
  }

  issueAccessToken(user: {
    id: string;
    login: string;
    role: Role;
    refreshSessionId: string;
  }): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: AccessTokenPayload = {
      sub: user.id,
      login: user.login,
      role: user.role,
      sid: user.refreshSessionId,
      jti: randomUUID(),
      type: "access",
      iat: now,
      exp: now + this.accessTokenTtlSec
    };

    return this.sign(payload, this.configService.value.jwtAccessSecret);
  }

  issueRefreshToken(user: {
    id: string;
    login: string;
    role: Role;
    refreshSessionId: string;
  }): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: RefreshTokenPayload = {
      sub: user.id,
      login: user.login,
      role: user.role,
      sid: user.refreshSessionId,
      jti: randomUUID(),
      type: "refresh",
      iat: now,
      exp: now + this.refreshTokenTtlSec
    };

    return this.sign(payload, this.configService.value.jwtRefreshSecret);
  }

  verifyAccessToken(token: string): AuthenticatedUser {
    const payload = this.verify(token, this.configService.value.jwtAccessSecret);
    if (payload.type !== "access") {
      throw new AppException("AUTH", 401, "Invalid access token");
    }

    return {
      userId: payload.sub,
      login: payload.login,
      role: payload.role,
      sessionId: payload.sid
    };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verify(token, this.configService.value.jwtRefreshSecret);
    if (payload.type !== "refresh") {
      throw new AppException("AUTH", 401, "Invalid refresh token");
    }

    return payload;
  }

  private sign(payload: TokenPayload, secret: string): string {
    const header = {
      alg: "HS256",
      typ: "JWT"
    };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = createHmac("sha256", secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verify(token: string, secret: string): TokenPayload {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new AppException("AUTH", 401, "Malformed token");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const expectedSignature = createHmac("sha256", secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    const actualBuffer = Buffer.from(encodedSignature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new AppException("AUTH", 401, "Invalid token signature");
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new AppException("AUTH", 401, "Token expired");
    }

    return payload;
  }
}
