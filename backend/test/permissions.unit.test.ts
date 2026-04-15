import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageTeacherOwnedResource,
  canReadLectureByRole
} from "../src/common/permissions";

test("permission logic respects teacher ownership and admin override", () => {
  assert.equal(
    canManageTeacherOwnedResource({ role: "teacher", userId: "teacher-1" }, "teacher-1"),
    true
  );
  assert.equal(
    canManageTeacherOwnedResource({ role: "teacher", userId: "teacher-1" }, "teacher-2"),
    false
  );
  assert.equal(
    canManageTeacherOwnedResource({ role: "admin", userId: "admin-1" }, "teacher-2"),
    true
  );
});

test("lecture visibility helper respects role and publication state", () => {
  assert.equal(
    canReadLectureByRole({
      currentUser: { role: "student", userId: "student-1" },
      authorId: "teacher-1",
      status: "published",
      availableForRoles: ["student"]
    }),
    true
  );

  assert.equal(
    canReadLectureByRole({
      currentUser: { role: "student", userId: "student-1" },
      authorId: "teacher-1",
      status: "draft",
      availableForRoles: ["student"]
    }),
    false
  );
});
