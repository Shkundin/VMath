import AsyncStorage from "@react-native-async-storage/async-storage";

export type TestingAnswerKey = "A" | "B" | "C" | "D";

export type ActiveTestingQuestion = {
  id: string;
  text: string;
  options: Array<{
    key: TestingAnswerKey;
    text: string;
  }>;
  correctAnswerKey: TestingAnswerKey;
  explanation: string;
};

export type ActiveTestingSession = {
  id: string;
  teacherLogin: string;
  title: string;
  durationMin: number;
  startedAt: string;
  questions: ActiveTestingQuestion[];
};

export type TestingSubmission = {
  id: string;
  sessionId: string;
  teacherLogin: string;
  studentLogin: string;
  studentName: string;
  answers: Record<string, TestingAnswerKey>;
  submittedAt: string;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalQuestions: number;
  percent: number;
};

export type LectureTestResult = {
  id: string;
  lectureId: string;
  lectureTitle: string;
  blockId: string;
  blockTitle: string;
  teacherLogin?: string;
  studentLogin: string;
  studentName: string;
  submittedAt: string;
  correctCount: number;
  totalQuestions: number;
  percent: number;
};

const ACTIVE_SESSION_KEY = "vm.testing.active.session.v1";
const TESTING_SUBMISSIONS_KEY = "vm.testing.submissions.v1";
const LECTURE_TEST_RESULTS_KEY = "vm.testing.lecture.results.v1";

function isWeb(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

async function readRawValue(key: string): Promise<string | null> {
  try {
    if (isWeb()) {
      return window.localStorage.getItem(key);
    }

    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function writeRawValue(key: string, value: string | null): Promise<void> {
  try {
    if (isWeb()) {
      if (value === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }

      return;
    }

    if (value === null) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch {}
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await readRawValue(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T | null): Promise<void> {
  if (value === null) {
    await writeRawValue(key, null);
    return;
  }

  await writeRawValue(key, JSON.stringify(value));
}

export async function readActiveTestingSession(): Promise<ActiveTestingSession | null> {
  return readJson<ActiveTestingSession | null>(ACTIVE_SESSION_KEY, null);
}

export async function writeActiveTestingSession(
  value: ActiveTestingSession | null
): Promise<void> {
  await writeJson(ACTIVE_SESSION_KEY, value);
}

export async function readTestingSubmissions(): Promise<TestingSubmission[]> {
  const value = await readJson<TestingSubmission[]>(TESTING_SUBMISSIONS_KEY, []);
  return Array.isArray(value) ? value : [];
}

export async function writeTestingSubmissions(
  value: TestingSubmission[]
): Promise<void> {
  await writeJson(TESTING_SUBMISSIONS_KEY, value);
}

export async function readLectureTestResults(): Promise<LectureTestResult[]> {
  const value = await readJson<LectureTestResult[]>(LECTURE_TEST_RESULTS_KEY, []);
  return Array.isArray(value) ? value : [];
}

export async function writeLectureTestResults(
  value: LectureTestResult[]
): Promise<void> {
  await writeJson(LECTURE_TEST_RESULTS_KEY, value);
}
