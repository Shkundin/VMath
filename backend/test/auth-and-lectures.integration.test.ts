import assert from "node:assert/strict";
import test from "node:test";
import { api, createTestApp, login } from "./test-utils";

test("integration: auth login and lecture retrieval work", async (t) => {
  const fixture = await createTestApp();
  t.after(async () => {
    await fixture.close();
  });

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

  const lectureResponse = await api(
    fixture.baseUrl,
    teacherTokens.accessToken,
    `/api/v1/lectures/${lectures[0]?.id}`
  );
  assert.equal(lectureResponse.status, 200);
  const lecture = (await lectureResponse.json()) as { id: string; blocks: unknown[] };
  assert.equal(Array.isArray(lecture.blocks), true);
});
