import assert from "node:assert/strict";
import test from "node:test";
import { api, createTestApp, login, TEST_LECTURE } from "./test-utils";

test("e2e: teacher login -> session start -> block switch -> checking block finish -> stats retrieval", async (t) => {
  const fixture = await createTestApp();
  t.after(async () => {
    await fixture.close();
  });

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
  assert.equal(createResponse.status, 201);
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
          { questionId: "00000000-0000-0000-0000-000000006102", answerText: "5" }
        ],
        finalize: true
      })
    }
  );

  const finishResponse = await api(
    fixture.baseUrl,
    teacherTokens.accessToken,
    `/api/v1/sessions/${session.sessionId}/blocks/${checkingBlock.id}/checking/finish`,
    { method: "POST" }
  );
  assert.equal(finishResponse.status, 201);

  const statsResponse = await api(
    fixture.baseUrl,
    teacherTokens.accessToken,
    `/api/v1/sessions/${session.sessionId}/stats`
  );
  assert.equal(statsResponse.status, 200);
  const stats = (await statsResponse.json()) as {
    participantCount: number;
    averageScore: number;
    distributions: Array<{ questionId: string }>;
  };
  assert.equal(stats.participantCount >= 1, true);
  assert.equal(stats.averageScore >= 1, true);
  assert.equal(stats.distributions.length >= 1, true);
});
