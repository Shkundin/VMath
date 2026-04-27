import AsyncStorage from "@react-native-async-storage/async-storage";

import type { TeacherManagedSession } from "../mocks/teacher";

const PREFIX = "vmMobileUX_v1";

const STORAGE_KEYS = {
  studentResume: `${PREFIX}:studentResume`,
  teacherComposerDraft: `${PREFIX}:teacherComposerDraft`,
  teacherSessionSnapshot: `${PREFIX}:teacherSessionSnapshot`
} as const;

export type StudentResumeStep = "details" | "session" | "task" | "result";

export type StudentResumeContext = {
  lectureId: string;
  step: StudentResumeStep;
  updatedAt: string;
};

export type TeacherComposerDraft = {
  description: string;
  level: string;
  semester: string;
  subject: string;
  theory: string;
  title: string;
  updatedAt: string;
  videoUrl: string;
};

async function readJson<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function readStudentResumeContext(): Promise<StudentResumeContext | null> {
  return readJson<StudentResumeContext>(STORAGE_KEYS.studentResume);
}

export async function writeStudentResumeContext(value: StudentResumeContext): Promise<void> {
  await writeJson(STORAGE_KEYS.studentResume, value);
}

export async function clearStudentResumeContext(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.studentResume);
}

export async function readTeacherComposerDraft(): Promise<TeacherComposerDraft | null> {
  return readJson<TeacherComposerDraft>(STORAGE_KEYS.teacherComposerDraft);
}

export async function writeTeacherComposerDraft(value: TeacherComposerDraft): Promise<void> {
  await writeJson(STORAGE_KEYS.teacherComposerDraft, value);
}

export async function clearTeacherComposerDraft(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.teacherComposerDraft);
}

export async function readTeacherSessionSnapshot(): Promise<TeacherManagedSession | null> {
  return readJson<TeacherManagedSession>(STORAGE_KEYS.teacherSessionSnapshot);
}

export async function writeTeacherSessionSnapshot(value: TeacherManagedSession): Promise<void> {
  await writeJson(STORAGE_KEYS.teacherSessionSnapshot, value);
}

export async function clearTeacherSessionSnapshot(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.teacherSessionSnapshot);
}
