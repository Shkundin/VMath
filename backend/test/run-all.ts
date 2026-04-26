import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import { JwtTokenService } from "../src/auth/jwt-token.service";
import { GoogleIdentityService } from "../src/auth/google-identity.service";
import { PasswordService } from "../src/auth/password.service";
import { AppConfigService, loadAppConfig } from "../src/config/app-config";
import {
  canManageTeacherOwnedResource,
  canReadLectureByRole
} from "../src/common/permissions";
import { GradingService } from "../src/results/grading.service";
import { transitionSessionStatus } from "../src/sessions/session-state";
import { api, createTestApp, login, TEST_LECTURE } from "./test-utils";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function withTemporaryEnv<T>(patch: Record<string, string | undefined>, fn: () => T): T {
  const snapshot = { ...process.env };

  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in snapshot)) {
        delete process.env[key];
      }
    }

    for (const [key, value] of Object.entries(snapshot)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  await run("unit: grading logic", () => {
    const grading = new GradingService();
    const result = grading.gradeSubmission(
      [
        {
          id: "q1",
          type: "single",
          text: "Pick one",
          correctOptionId: "b",
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
            { id: "c", text: "C" }
          ]
        },
        {
          id: "q2",
          type: "short",
          text: "Type 5",
          correctAnswerText: "5"
        },
        {
          id: "q3",
          type: "multi",
          text: "Pick A and C",
          correctOptionIds: ["a", "c"],
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
            { id: "c", text: "C" }
          ]
        }
      ],
      [
        { questionId: "q1", selectedOptionIds: ["b"] },
        { questionId: "q2", answerText: "4" },
        { questionId: "q3", isRefused: true }
      ]
    );

    assert.equal(result.correctCount, 1);
    assert.equal(result.incorrectCount, 1);
    assert.equal(result.skippedCount, 1);
    assert.equal(result.score, 0);
  });

  await run("unit: auth helpers", async () => {
    const passwordService = new PasswordService();
    const hash = await passwordService.hashPassword("secret-pass");
    assert.equal(await passwordService.verifyPassword("secret-pass", hash), true);
    assert.equal(await passwordService.verifyPassword("wrong-pass", hash), false);

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
    assert.equal(jwt.verifyAccessToken(accessToken).userId, "user-1");
  });

  await run("unit: production config enables public CORS fallback", () => {
    const config = withTemporaryEnv(
      {
        NODE_ENV: "production",
        CORS_ORIGIN: undefined,
        WS_CORS_ORIGIN: undefined,
        APP_URL: "https://visualmath-server.onrender.com",
        API_BASE_URL: "https://visualmath-server.onrender.com/api/v1",
        JWT_ACCESS_SECRET: "prod-access-secret",
        JWT_REFRESH_SECRET: "prod-refresh-secret",
        DATABASE_URL: "postgres://prod-db"
      },
      () => loadAppConfig()
    );

    assert.deepEqual(config.corsOrigins, ["*"]);
    assert.deepEqual(config.wsCorsOrigins, ["*"]);
  });

  await run("unit: google identity verification", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048
    });
    const publicJwk = publicKey.export({ format: "jwk" }) as Record<string, unknown>;
    publicJwk.kid = "test-google-kid";
    publicJwk.alg = "RS256";
    publicJwk.use = "sig";

    const encode = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");

    const payload = {
      aud: "google-client-id.apps.googleusercontent.com",
      email: "student@example.com",
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: "https://accounts.google.com",
      name: "Google Student",
      sub: "google-user-1"
    };

    const unsignedToken = `${encode({
      alg: "RS256",
      kid: "test-google-kid",
      typ: "JWT"
    })}.${encode(payload)}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsignedToken);
    signer.end();
    const token = `${unsignedToken}.${signer.sign(privateKey).toString("base64url")}`;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: {
          "cache-control": "public, max-age=3600",
          "content-type": "application/json"
        }
      })) as typeof fetch;

    try {
      const service = new GoogleIdentityService(
        new AppConfigService({
          port: 8787,
          nodeEnv: "test",
          isProduction: false,
          isRender: false,
          trustProxy: false,
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
          googleOauthClientIds: ["google-client-id.apps.googleusercontent.com"],
          vkAppId: "1",
          accessTokenTtlSec: 900,
          refreshTokenTtlSec: 3600
        })
      );

      const identity = await service.verifyIdToken(token);
      assert.equal(identity.provider, "google");
      assert.equal(identity.subject, "google-user-1");
      assert.equal(identity.email, "student@example.com");
      assert.equal(identity.fullName, "Google Student");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await run("unit: permission logic", () => {
    assert.equal(
      canManageTeacherOwnedResource({ role: "teacher", userId: "teacher-1" }, "teacher-1"),
      true
    );
    assert.equal(
      canManageTeacherOwnedResource({ role: "teacher", userId: "teacher-1" }, "teacher-2"),
      false
    );
    assert.equal(
      canReadLectureByRole({
        currentUser: { role: "student", userId: "student-1" },
        authorId: "teacher-1",
        status: "published",
        availableForRoles: ["student"]
      }),
      true
    );
  });

  await run("unit: session state transitions", () => {
    assert.equal(transitionSessionStatus("draft", "start"), "active");
    assert.equal(transitionSessionStatus("active", "stop"), "stopped");
    assert.throws(() => transitionSessionStatus("stopped", "start"));
  });

  await run("integration: auth and lecture retrieval", async () => {
    const fixture = await createTestApp();
    try {
      const teacherTokens = await login(fixture.baseUrl, {
        login: "teacher",
        password: "teacher"
      });
      const lecturesResponse = await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        "/api/v1/lectures"
      );
      assert.equal(lecturesResponse.status, 200);
      const lectures = (await lecturesResponse.json()) as Array<{ id: string }>;
      assert.equal(lectures.length > 0, true);
    } finally {
      await fixture.close();
    }
  });

  await run("integration: root endpoint and student registration", async () => {
    const fixture = await createTestApp();
    try {
      const rootResponse = await fetch(`${fixture.baseUrl}/`);
      assert.equal(rootResponse.status, 200);
      const rootPayload = (await rootResponse.json()) as { ok?: boolean; healthUrl?: string };
      assert.equal(rootPayload.ok, true);
      assert.equal(rootPayload.healthUrl, "/api/v1/health");

      const registerResponse = await fetch(`${fixture.baseUrl}/api/v1/auth/register/student`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          login: "gleb.shkundin",
          password: "secure-pass",
          fullName: "Gleb Shkundin",
          groupName: "BPI-248"
        })
      });

      assert.equal(registerResponse.status, 201);
      const registeredUser = (await registerResponse.json()) as { login: string; role: string };
      assert.equal(registeredUser.login, "gleb.shkundin");
      assert.equal(registeredUser.role, "student");

      const adminTokens = await login(fixture.baseUrl, {
        login: "admin",
        password: "admin"
      });

      const usersResponse = await api(
        fixture.baseUrl,
        adminTokens.accessToken,
        "/api/v1/admin/users?q=gleb.shkundin"
      );
      assert.equal(usersResponse.status, 200);

      const users = (await usersResponse.json()) as Array<{ login: string; fullName: string }>;
      assert.equal(
        users.some((user) => user.login === "gleb.shkundin" && user.fullName === "Gleb Shkundin"),
        true
      );
    } finally {
      await fixture.close();
    }
  });

  await run("e2e: student flow", async () => {
    const fixture = await createTestApp();
    try {
      const teacherTokens = await login(fixture.baseUrl, {
        login: "teacher",
        password: "teacher"
      });
      const studentTokens = await login(fixture.baseUrl, {
        login: "student",
        password: "student"
      });

      const lectureResponse = await api(
        fixture.baseUrl,
        studentTokens.accessToken,
        `/api/v1/lectures/${TEST_LECTURE.id}`
      );
      const lecture = (await lectureResponse.json()) as {
        blocks: Array<{ id: string; type: string }>;
      };
      const checkingBlock = lecture.blocks.find((block) => block.type === "checking_block");
      assert.ok(checkingBlock);

      const createdSessionResponse = await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        "/api/v1/sessions",
        {
          method: "POST",
          body: JSON.stringify({ lectureId: TEST_LECTURE.id })
        }
      );
      const createdSession = (await createdSessionResponse.json()) as { sessionId: string };

      await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        `/api/v1/sessions/${createdSession.sessionId}/start`,
        { method: "POST" }
      );
      await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        `/api/v1/sessions/${createdSession.sessionId}/current-block`,
        {
          method: "PATCH",
          body: JSON.stringify({ blockId: checkingBlock.id })
        }
      );

      const joinResponse = await api(
        fixture.baseUrl,
        studentTokens.accessToken,
        "/api/v1/sessions/join",
        {
          method: "POST",
          body: JSON.stringify({ sessionId: createdSession.sessionId })
        }
      );
      assert.equal(joinResponse.status, 201);

      const submitResponse = await api(
        fixture.baseUrl,
        studentTokens.accessToken,
        `/api/v1/sessions/${createdSession.sessionId}/blocks/${checkingBlock.id}/answers`,
        {
          method: "POST",
          body: JSON.stringify({
            answers: [
              {
                questionId: "00000000-0000-0000-0000-000000006101",
                selectedOptionIds: ["00000000-0000-0000-0000-000000006201"]
              },
              {
                questionId: "00000000-0000-0000-0000-000000006102",
                answerText: "5"
              }
            ],
            finalize: true
          })
        }
      );
      assert.equal(submitResponse.status, 201);

      await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        `/api/v1/sessions/${createdSession.sessionId}/blocks/${checkingBlock.id}/checking/finish`,
        { method: "POST" }
      );

      const resultsResponse = await api(
        fixture.baseUrl,
        studentTokens.accessToken,
        `/api/v1/sessions/${createdSession.sessionId}/results`
      );
      const results = (await resultsResponse.json()) as Array<{ score: number }>;
      assert.equal(results[0]?.score, 2);
    } finally {
      await fixture.close();
    }
  });

  await run("e2e: teacher flow", async () => {
    const fixture = await createTestApp();
    try {
      const teacherTokens = await login(fixture.baseUrl, {
        login: "teacher",
        password: "teacher"
      });
      const studentTokens = await login(fixture.baseUrl, {
        login: "student",
        password: "student"
      });

      const lectureResponse = await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        `/api/v1/lectures/${TEST_LECTURE.id}`
      );
      const lecture = (await lectureResponse.json()) as {
        blocks: Array<{ id: string; type: string }>;
      };
      const checkingBlock = lecture.blocks.find((block) => block.type === "checking_block");
      assert.ok(checkingBlock);

      const createResponse = await api(fixture.baseUrl, teacherTokens.accessToken, "/api/v1/sessions", {
        method: "POST",
        body: JSON.stringify({ lectureId: TEST_LECTURE.id })
      });
      const session = (await createResponse.json()) as { sessionId: string };

      await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        `/api/v1/sessions/${session.sessionId}/start`,
        { method: "POST" }
      );
      await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        `/api/v1/sessions/${session.sessionId}/current-block`,
        {
          method: "PATCH",
          body: JSON.stringify({ blockId: checkingBlock.id })
        }
      );
      await api(fixture.baseUrl, studentTokens.accessToken, "/api/v1/sessions/join", {
        method: "POST",
        body: JSON.stringify({ sessionId: session.sessionId })
      });
      await api(
        fixture.baseUrl,
        studentTokens.accessToken,
        `/api/v1/sessions/${session.sessionId}/blocks/${checkingBlock.id}/answers`,
        {
          method: "POST",
          body: JSON.stringify({
            answers: [
              {
                questionId: "00000000-0000-0000-0000-000000006101",
                selectedOptionIds: ["00000000-0000-0000-0000-000000006201"]
              },
              {
                questionId: "00000000-0000-0000-0000-000000006102",
                answerText: "5"
              }
            ],
            finalize: true
          })
        }
      );
      await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        `/api/v1/sessions/${session.sessionId}/blocks/${checkingBlock.id}/checking/finish`,
        { method: "POST" }
      );

      const statsResponse = await api(
        fixture.baseUrl,
        teacherTokens.accessToken,
        `/api/v1/sessions/${session.sessionId}/stats`
      );
      assert.equal(statsResponse.status, 200);
      const stats = (await statsResponse.json()) as {
        participantCount: number;
        averageScore: number;
      };
      assert.equal(stats.participantCount >= 1, true);
      assert.equal(stats.averageScore >= 1, true);
    } finally {
      await fixture.close();
    }
  });
}

void main();
