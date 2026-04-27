import type { QuizAnswerPayload, SubmitQuizResponse } from "@vm/integration";
import type {
  LectureBlock,
  LectureDetails,
  LectureSummary,
  QuizBlock,
  QuizQuestion,
  SessionState
} from "@vm/shared";
import type { LectureItem } from "../mocks/lectures";
import {
  evaluateSubmission,
  type Question,
  type SessionData,
  type TaskAnswer,
  type TaskResult,
  type TaskSubmission
} from "../mocks/session";
import type {
  TeacherManagedSession,
  TeacherParticipantStatus
} from "../mocks/teacher";

type QuizQuestionWithAnswers = QuizQuestion & {
  correctOptionId?: string;
  correctAnswerText?: string;
};

function blockTitle(block: LectureBlock, index: number): string {
  return block.title || `Блок ${index + 1}`;
}

function findFirstQuizBlock(details: LectureDetails): QuizBlock | null {
  const block = details.blocks.find((item) => item.type === "quiz");
  return block?.type === "quiz" ? block : null;
}

function findActiveQuizBlock(
  details: LectureDetails,
  sessionState: SessionState
): QuizBlock | null {
  const activeBlock = details.blocks.find((item) => item.id === sessionState.activeBlockId);
  if (activeBlock?.type === "quiz") {
    return activeBlock;
  }

  return findFirstQuizBlock(details);
}

function mapQuestion(question: QuizQuestion, timeLimitSec = 60): Question {
  const enriched = question as QuizQuestionWithAnswers;

  if (question.type === "short") {
    return {
      id: question.id,
      type: "short-answer",
      prompt: question.text,
      correctAnswerText: enriched.correctAnswerText ?? question.correctAnswerHint ?? "",
      explanation: question.correctAnswerHint
        ? `Подсказка: ${question.correctAnswerHint}`
        : "Проверка выполняется сервером.",
      timeLimitSec,
      points: 1
    };
  }

  return {
    id: question.id,
    type: "single-choice",
    prompt: question.text,
    options: (question.options ?? []).map((option) => ({
      id: option.id,
      label: option.text
    })),
    correctOptionId: enriched.correctOptionId,
    explanation: question.correctAnswerHint ?? "Проверка выполняется сервером.",
    timeLimitSec,
    points: 1
  };
}

function mapParticipantStatus(
  status: SessionState["participants"][number]["status"]
): TeacherParticipantStatus {
  switch (status) {
    case "connected":
      return "online";
    case "idle":
    case "working":
      return "in-progress";
    case "submitted":
      return "completed";
    case "disconnected":
    default:
      return "offline";
  }
}

export function mapLectureSummaryToLectureItem(
  summary: LectureSummary,
  previous?: Partial<LectureItem>
): LectureItem {
  return {
    id: summary.id,
    title: summary.title,
    author: previous?.author ?? "VM Server",
    subject: previous?.subject ?? "Математика",
    semester: previous?.semester ?? "2 семестр",
    level: previous?.level ?? "Базовый",
    tags: summary.tags ?? previous?.tags ?? [],
    description:
      summary.description ??
      previous?.description ??
      "Описание загрузится после открытия лекции.",
    blocks: previous?.blocks ?? [],
    participationRequirements:
      previous?.participationRequirements ?? ["Авторизация в приложении", "Доступ к сети"],
    estimatedDuration: previous?.estimatedDuration ?? "20–30 минут"
  };
}

export function mapLectureDetailsToLectureItem(
  details: LectureDetails,
  previous?: Partial<LectureItem>
): LectureItem {
  return {
    id: details.id,
    title: details.title,
    author: previous?.author ?? "VM Server",
    subject: previous?.subject ?? "Математика",
    semester: previous?.semester ?? "2 семестр",
    level: previous?.level ?? "Базовый",
    tags: previous?.tags ?? details.blocks.map((block) => block.type),
    description: details.description ?? previous?.description ?? "",
    blocks: details.blocks.map(blockTitle),
    participationRequirements:
      previous?.participationRequirements ?? ["Авторизация в приложении", "Подключение к сети"],
    estimatedDuration:
      previous?.estimatedDuration ?? `${Math.max(20, details.blocks.length * 10)} минут`
  };
}

export function mapSessionToSessionData(params: {
  lecture: LectureItem;
  details: LectureDetails;
  sessionState: SessionState;
}): SessionData {
  const { lecture, details, sessionState } = params;

  const quizBlock = findActiveQuizBlock(details, sessionState) ?? findFirstQuizBlock(details);
  const timeLimitSec = quizBlock?.payload.timeLimitSec ?? 60;

  const fallbackQuestion: Question = {
    id: "no-quiz",
    type: "short-answer",
    prompt: "В этой лекции нет активного проверочного блока.",
    correctAnswerText: "",
    explanation: "Сервер не вернул активный quiz-блок.",
    timeLimitSec: 30,
    points: 0
  };

  const questions =
    quizBlock?.payload.questions?.length
      ? quizBlock.payload.questions.map((question) => mapQuestion(question, timeLimitSec))
      : [fallbackQuestion];

  const activeBlock = details.blocks.find((block) => block.id === sessionState.activeBlockId);

  return {
    sessionId: sessionState.sessionId,
    sessionCode: sessionState.sessionId.toUpperCase(),
    lectureId: lecture.id,
    lectureTitle: lecture.title,
    connectionStatus: "online",
    status: "active",
    currentBlockTitle: activeBlock?.title ?? "Активный блок",
    participantsCount: sessionState.participants.length,
    startedAt: sessionState.updatedAt,
    questions
  };
}

export function mapTaskAnswerToApiPayload(
  question: Question,
  answer: TaskAnswer
): QuizAnswerPayload {
  if (question.type === "single-choice") {
    return {
      type: "single",
      optionId: answer.selectedOptionId ?? ""
    };
  }

  return {
    type: "short",
    text: answer.shortAnswer?.trim() ?? ""
  };
}

export function mapQuizResponseToTaskResult(params: {
  session: SessionData;
  submission: TaskSubmission;
  response: SubmitQuizResponse;
}): TaskResult {
  const localResult = evaluateSubmission(params.session, params.submission);

  return {
    ...localResult,
    correctCount: params.response.score,
    earnedPoints: params.response.score,
    maxPoints: params.response.maxScore
  };
}

export function mapSessionToTeacherManagedSession(params: {
  lecture: LectureItem;
  sessionState: SessionState;
}): TeacherManagedSession {
  const { lecture, sessionState } = params;

  return {
    sessionId: sessionState.sessionId,
    sessionCode: sessionState.sessionId.toUpperCase(),
    lectureId: lecture.id,
    lectureTitle: lecture.title,
    status: "draft",
    blocks: lecture.blocks,
    currentBlockIndex: 0,
    questionPreview: [],
    participants: sessionState.participants.map((participant) => ({
      id: participant.userId,
      name: participant.fullName,
      status: mapParticipantStatus(participant.status),
      score: null,
      correctCount: null,
      totalQuestions: null,
      timeSpentSec: null
    }))
  };
}