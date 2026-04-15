import assert from "node:assert/strict";
import test from "node:test";
import { GradingService } from "../src/results/grading.service";

test("grading logic applies +1 / penalty / skip rules", () => {
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
