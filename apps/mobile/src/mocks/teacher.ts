import type { QuizQuestion } from "@vm/shared";

import type { LectureItem } from "./lectures";
import type { TaskResult } from "./session";

export type TeacherParticipantStatus =
  | "online"
  | "in-progress"
  | "completed"
  | "offline";

export type TeacherParticipant = {
  id: string;
  name: string;
  status: TeacherParticipantStatus;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  timeSpentSec: number | null;
};

export type TeacherManagedSession = {
  sessionId: string;
  sessionCode: string;
  lectureId: string;
  lectureTitle: string;
  status: "draft" | "active" | "stopped";
  blocks: string[];
  currentBlockIndex: number;
  participants: TeacherParticipant[];
  questionPreview: QuizQuestion[];
};

const teacherParticipantsByLectureId = new Map<string, TeacherParticipant[]>();

function cloneParticipants(participants: TeacherParticipant[]): TeacherParticipant[] {
  return participants.map((participant) => ({ ...participant }));
}

function toParticipantId(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized || "student-demo";
}

export function getTeacherParticipants(lectureId: string): TeacherParticipant[] {
  return cloneParticipants(teacherParticipantsByLectureId.get(lectureId) ?? []);
}

export function clearTeacherParticipants(lectureId?: string) {
  if (lectureId) {
    teacherParticipantsByLectureId.delete(lectureId);
    return;
  }

  teacherParticipantsByLectureId.clear();
}
export function markTeacherParticipantInProgress(
  lectureId: string,
  participantName = "Студент demo"
) {
  const participantId = toParticipantId(participantName);
  const current = teacherParticipantsByLectureId.get(lectureId) ?? [];
  const existing = current.find((participant) => participant.id === participantId);

  if (existing?.status === "completed") {
    return;
  }

  const nextParticipant: TeacherParticipant = {
    id: participantId,
    name: participantName,
    status: "in-progress",
    score: existing?.score ?? null,
    correctCount: existing?.correctCount ?? null,
    totalQuestions: existing?.totalQuestions ?? null,
    timeSpentSec: existing?.timeSpentSec ?? null
  };

  const next = current.filter((participant) => participant.id !== participantId);
  next.push(nextParticipant);
  teacherParticipantsByLectureId.set(lectureId, next);
}

export function recordTeacherParticipantResult(
  lectureId: string,
  result: TaskResult,
  participantName = "Студент demo"
) {
  const nextParticipant: TeacherParticipant = {
    id: toParticipantId(participantName),
    name: participantName,
    status: "completed",
    score: result.earnedPoints,
    correctCount: result.correctCount,
    totalQuestions: result.totalQuestions,
    timeSpentSec: result.timeSpentSec
  };

  const current = teacherParticipantsByLectureId.get(lectureId) ?? [];
  const next = current.filter((participant) => participant.id !== nextParticipant.id);

  next.push(nextParticipant);
  teacherParticipantsByLectureId.set(lectureId, next);
}

export function createTeacherManagedSession(
  lecture: LectureItem,
  questionPreview: QuizQuestion[] = []
): TeacherManagedSession {
  return {
    sessionId: `teacher-session-${lecture.id}`,
    sessionCode: `T-${lecture.id.slice(-1)}${lecture.title.length}`,
    lectureId: lecture.id,
    lectureTitle: lecture.title,
    status: "draft",
    blocks: lecture.blocks,
    currentBlockIndex: 0,
    questionPreview,
    participants: getTeacherParticipants(lecture.id)
  };
}

export function getTeacherCurrentBlock(session: TeacherManagedSession): string {
  return session.blocks[session.currentBlockIndex] ?? "Блок не найден";
}

export function moveTeacherSessionBlock(
  session: TeacherManagedSession,
  direction: "prev" | "next"
): TeacherManagedSession {
  const nextIndex =
    direction === "next"
      ? Math.min(session.currentBlockIndex + 1, session.blocks.length - 1)
      : Math.max(session.currentBlockIndex - 1, 0);

  return {
    ...session,
    currentBlockIndex: nextIndex
  };
}

export function updateTeacherSessionStatus(
  session: TeacherManagedSession,
  status: "draft" | "active" | "stopped"
): TeacherManagedSession {
  return {
    ...session,
    status
  };
}