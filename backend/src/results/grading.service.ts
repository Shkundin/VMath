import { Injectable } from "@nestjs/common";
import type { QuizQuestion, ResultSummaryView, SubmissionAnswerView } from "@vm/shared";

export interface SubmissionAnswerInput {
  questionId: string;
  selectedOptionIds?: string[];
  answerText?: string | null;
  formulaAnswer?: string | null;
  isRefused?: boolean;
}

export interface SubmissionGradingResult {
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  answers: SubmissionAnswerView[];
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeOptionIds(values: string[] | undefined): string[] {
  return [...(values ?? [])].map((value) => String(value).trim()).filter(Boolean).sort();
}

@Injectable()
export class GradingService {
  gradeSubmission(
    questions: QuizQuestion[],
    answers: SubmissionAnswerInput[]
  ): SubmissionGradingResult {
    const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
    const gradedAnswers = questions.map((question) =>
      this.gradeSingleQuestion(question, answersByQuestionId.get(question.id))
    );

    return {
      score: gradedAnswers.reduce((sum, answer) => sum + (answer.scoreDelta ?? 0), 0),
      maxScore: questions.length,
      correctCount: gradedAnswers.filter((answer) => answer.isCorrect === true).length,
      incorrectCount: gradedAnswers.filter((answer) => answer.isCorrect === false).length,
      skippedCount: gradedAnswers.filter((answer) => answer.isCorrect === undefined).length,
      answers: gradedAnswers
    };
  }

  attachSummary(
    base: Omit<ResultSummaryView, "score" | "maxScore" | "correctCount" | "incorrectCount" | "skippedCount" | "answers">,
    questions: QuizQuestion[],
    answers: SubmissionAnswerInput[]
  ): ResultSummaryView {
    const graded = this.gradeSubmission(questions, answers);
    return {
      ...base,
      score: graded.score,
      maxScore: graded.maxScore,
      correctCount: graded.correctCount,
      incorrectCount: graded.incorrectCount,
      skippedCount: graded.skippedCount,
      answers: graded.answers
    };
  }

  private gradeSingleQuestion(
    question: QuizQuestion,
    answer: SubmissionAnswerInput | undefined
  ): SubmissionAnswerView {
    const correctPenaltyDivisor = Math.max(question.options?.length ?? 1, 1);
    const penalty = -1 / correctPenaltyDivisor;

    if (!answer || answer.isRefused) {
      return {
        questionId: question.id,
        questionText: question.text,
        selectedOptionIds: [],
        answerText: answer?.answerText ?? null,
        formulaAnswer: answer?.formulaAnswer ?? null,
        isRefused: answer?.isRefused ?? false,
        isCorrect: undefined,
        scoreDelta: 0
      };
    }

    if (question.type === "single") {
      const selectedOptionId = normalizeOptionIds(answer.selectedOptionIds)[0];
      const isCorrect = selectedOptionId === String(question.correctOptionId ?? "");
      return {
        questionId: question.id,
        questionText: question.text,
        selectedOptionIds: selectedOptionId ? [selectedOptionId] : [],
        answerText: answer.answerText ?? null,
        formulaAnswer: answer.formulaAnswer ?? null,
        isRefused: false,
        isCorrect,
        scoreDelta: isCorrect ? 1 : penalty
      };
    }

    if (question.type === "multi") {
      const selectedOptionIds = normalizeOptionIds(answer.selectedOptionIds);
      const correctOptionIds = normalizeOptionIds(question.correctOptionIds);
      const isCorrect =
        selectedOptionIds.length === correctOptionIds.length &&
        selectedOptionIds.every((value, index) => value === correctOptionIds[index]);

      return {
        questionId: question.id,
        questionText: question.text,
        selectedOptionIds,
        answerText: answer.answerText ?? null,
        formulaAnswer: answer.formulaAnswer ?? null,
        isRefused: false,
        isCorrect,
        scoreDelta: isCorrect ? 1 : penalty
      };
    }

    if (question.type === "numeric") {
      const expected = Number(question.correctAnswerText ?? "");
      const actual = Number(answer.answerText ?? answer.formulaAnswer ?? "");
      const isCorrect = Number.isFinite(expected) && Number.isFinite(actual) && actual === expected;
      return {
        questionId: question.id,
        questionText: question.text,
        selectedOptionIds: [],
        answerText: answer.answerText ?? null,
        formulaAnswer: answer.formulaAnswer ?? null,
        isRefused: false,
        isCorrect,
        scoreDelta: isCorrect ? 1 : penalty
      };
    }

    const actualText = normalizeText(answer.formulaAnswer ?? answer.answerText);
    const expectedText = normalizeText(question.correctAnswerText);
    const isCorrect = Boolean(actualText) && actualText === expectedText;

    return {
      questionId: question.id,
      questionText: question.text,
      selectedOptionIds: [],
      answerText: answer.answerText ?? null,
      formulaAnswer: answer.formulaAnswer ?? null,
      isRefused: false,
      isCorrect,
      scoreDelta: isCorrect ? 1 : penalty
    };
  }
}
