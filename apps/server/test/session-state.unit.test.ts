import assert from "node:assert/strict";
import test from "node:test";
import { transitionSessionStatus } from "../src/sessions/session-state";

test("session transitions move draft to active and then stopped", () => {
  assert.equal(transitionSessionStatus("draft", "start"), "active");
  assert.equal(transitionSessionStatus("active", "stop"), "stopped");
});

test("stopped sessions cannot be restarted", () => {
  assert.throws(() => transitionSessionStatus("stopped", "start"));
});
