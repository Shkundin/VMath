import assert from "node:assert/strict";
import test from "node:test";
import { api, createTestApp, login, TEST_LECTURE } from "./test-utils";

test("e2e: student login -> lecture selection -> session join -> answer submission -> result retrieval", async (t) => {
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
    studentTokens.accessToken,
    `/api/v1/lectures/${TEST_LECTURE.id}`
  );
  assert.equal(lectureResponse.status, 200);
  const lecture = (await lectureResponse.json()) as {
    blocks: Array<{ id: string; type: string }>;
  };
  const checkingBlock = lecture.blocks.find((block) => block.type === "checking_block");
  assert.ok(checkingBlock);

  const createdSessionResponse = await api(fixture.baseUrl, teacherTokens.accessToken, "/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify({ lectureId: TEST_LECTURE.id })
  });
  const createdSession = (await createdSessionResponse.json()) as {
    sessionId: string;
  };

  await api(
    fixture.baseUrl,
    teacherTokens.accessToken,
    `/api/v1/sessions/${createdSession.sessionId}/start`,
    {
      method: "POST"
    }
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

  const joinResponse = await api(fixture.baseUrl, studentTokens.accessToken, "/api/v1/sessions/join", {
    method: "POST",
    body: JSON.stringify({ sessionId: createdSession.sessionId })
  });
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
          { questionId: "00000000-0000-0000-0000-000000006102", answerText: "5" }
        ],
        finalize: true
      })
    }
  );
  assert.equal(submitResponse.status, 201);

  const publishResponse = await api(
    fixture.baseUrl,
    teacherTokens.accessToken,
    `/api/v1/sessions/${createdSession.sessionId}/blocks/${checkingBlock.id}/checking/finish`,
    {
      method: "POST"
    }
  );
  assert.equal(publishResponse.status, 201);

  const resultsResponse = await api(
    fixture.baseUrl,
    studentTokens.accessToken,
    `/api/v1/sessions/${createdSession.sessionId}/results`
  );
  assert.equal(resultsResponse.status, 200);
  const results = (await resultsResponse.json()) as Array<{ score: number }>;
  assert.equal(results.length, 1);
  assert.equal(results[0]?.score, 2);
});
