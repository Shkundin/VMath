import assert from "node:assert/strict";
import test from "node:test";
import { JwtTokenService } from "../src/auth/jwt-token.service";
import { PasswordService } from "../src/auth/password.service";
import { AppConfigService } from "../src/config/app-config";

test("password service hashes and verifies passwords", async () => {
  const passwordService = new PasswordService();
  const hash = await passwordService.hashPassword("secret-pass");

  assert.notEqual(hash, "secret-pass");
  assert.equal(await passwordService.verifyPassword("secret-pass", hash), true);
  assert.equal(await passwordService.verifyPassword("wrong-pass", hash), false);
});

test("jwt helpers issue and verify access/refresh tokens", () => {
  const jwt = new JwtTokenService(
    new AppConfigService({
      port: 8787,
      nodeEnv: "test",
      appUrl: "http://localhost",
      apiBaseUrl: "http://localhost/api/v1",
      corsOrigins: ["http://localhost"],
      wsCorsOrigins: ["http://localhost"],
      jwtAccessSecret: "test-access",
      jwtRefreshSecret: "test-refresh",
      databaseUrl: "postgres://test",
      supabaseUrl: "http://localhost",
      supabaseAnonKey: "anon",
      supabaseServiceRoleKey: "service",
      accessTokenTtlSec: 900,
      refreshTokenTtlSec: 3600
    })
  );

  const accessToken = jwt.issueAccessToken({
    id: "user-1",
    login: "student",
    role: "student",
    refreshSessionId: "session-1"
  });
  const refreshToken = jwt.issueRefreshToken({
    id: "user-1",
    login: "student",
    role: "student",
    refreshSessionId: "session-1"
  });

  assert.equal(jwt.verifyAccessToken(accessToken).userId, "user-1");
  assert.equal(jwt.verifyRefreshToken(refreshToken).sid, "session-1");
});
