import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes
} from "@react-native-google-signin/google-signin";
import type {
  LectureDetails,
  QuizBlock,
  QuizQuestion,
  TextBlock,
  UserProfile as ApiUserProfile
} from "@vm/shared";
import { createMockSession, evaluateSubmission, type SessionData, type TaskResult, type TaskSubmission } from "../mocks/session";
import { clearTeacherParticipants, createTeacherManagedSession, moveTeacherSessionBlock, updateTeacherSessionStatus, type TeacherManagedSession } from "../mocks/teacher";
import { mockLectures, type LectureItem } from "../mocks/lectures";
import type { UserProfile } from "../mocks/user";
import { CatalogScreen } from "../screens/CatalogScreen";
import { LectureDetailsScreen } from "../screens/LectureDetailsScreen";
import { LoginScreen, type GoogleLoginPayload, type VkLoginPayload } from "../screens/LoginScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SessionScreen } from "../screens/SessionScreen";
import { SolverScreen } from "../screens/SolverScreen";
import { VideoLessonsScreen, type VideoLessonItem } from "../screens/VideoLessonsScreen";
import { PhotoMaterialsScreen, type PhotoMaterialItem } from "../screens/PhotoMaterialsScreen";
import { MeetingsScreen, type MeetingDraftInput } from "../screens/MeetingsScreen";
import { HomeworkScreen, type HomeworkDraftInput, type HomeworkSubmissionDraftInput } from "../screens/HomeworkScreen";
import { GradesScreen } from "../screens/GradesScreen";
import { TestingScreen, type TestingRunResult } from "../screens/TestingScreen";
import {
  readActiveTestingSession,
  readTestingSubmissions,
  writeActiveTestingSession,
  writeTestingSubmissions,
  type ActiveTestingQuestion,
  type ActiveTestingSession,
  type TestingAnswerKey,
  type TestingSubmission
} from "../storage/testingStorage";
import { TeacherBranchSelectScreen } from "../screens/TeacherBranchSelectScreen";
import { LatexWorkspaceScreen } from "../screens/LatexWorkspaceScreen";
import { TaskResultScreen } from "../screens/TaskResultScreen";
import { TaskScreen } from "../screens/TaskScreen";
import { TeacherHomeScreen, type DraftLectureInput, type DraftLectureMetaInput, type DraftQuestionInput } from "../screens/TeacherHomeScreen";
import { TeacherSessionControlScreen } from "../screens/TeacherSessionControlScreen";
import {
  clearAuthSession,
  readAuthMeta,
  writeAuthMeta
} from "../storage/authStorage";
import {
  readCatalogSnapshot,
  readLastLectureId,
  readNotificationsEnabled,
  readThemeMode,
  writeCatalogSnapshot,
  writeLastLectureId,
  writeNotificationsEnabled,
  writeThemeMode
} from "../storage/mobileCache";
import { createAppTheme, type AppTheme, type ThemeMode } from "../theme";
import { createDefaultLatexDocument, readLatexDocument, writeLatexDocument, type LatexDocumentState } from "../storage/latexStorage";
import { readMeetings, writeMeetings, type MeetingItem } from "../storage/meetingsStorage";
import {
  readHomeworks,
  readHomeworkSubmissions,
  writeHomeworks,
  writeHomeworkSubmissions,
  type HomeworkItem,
  type HomeworkSubmissionItem
} from "../storage/homeworkStorage";
import {
  createTeacherJoinCode,
  normalizeTeacherJoinCode,
  readTeacherBranches,
  readSelectedTeacherLogin,
  writeTeacherBranches,
  writeSelectedTeacherLogin,
  type TeacherBranch
} from "../storage/teacherBranchesStorage";
import { fixText } from "../utils/fixText";
import { authApi, catalogApi, quizApi, sessionApi, toUserMessage } from "../api/mobileApi";
import {
  mapLectureDetailsToLectureItem,
  mapLectureSummaryToLectureItem,
  mapQuizResponseToTaskResult,
  mapSessionToSessionData,
  mapSessionToTeacherManagedSession,
  mapTaskAnswerToApiPayload
} from "../api/mappers";

type ScreenKey =
  | "catalog"
  | "details"
  | "session"
  | "task"
  | "result"
  | "teacherHome"
  | "teacherSession"
  | "solver"
  | "videoLessons"
  | "photoMaterials"
  | "meetings"
  | "homework"
  | "grades"
  | "testing"
  | "teacherBranchSelect"
  | "latex"
  | "profile";

type MenuScreenKey =
  | "catalog"
  | "solver"
  | "videoLessons"
  | "photoMaterials"
  | "meetings"
  | "homework"
  | "grades"
  | "testing"
  | "latex"
  | "profile";

type LoginRole = "student" | "teacher";
type AuthMode = "login" | "register";
type DemoDataMode = "online" | "offline" | "loading" | "error";

const GOOGLE_WEB_CLIENT_ID = "PASTE_YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com";
const DEFAULT_STUDENT_GROUP = "BPI-248";
const DEFAULT_USER: UserProfile = {
  fullName: "",
  login: "",
  role: "student",
  group: DEFAULT_STUDENT_GROUP
};

function mapApiProfileToMobileUser(profile: ApiUserProfile): UserProfile {
  return {
    fullName: profile.fullName,
    login: profile.login,
    role: profile.role === "teacher" ? "teacher" : "student",
    group: profile.groupName?.trim() || profile.group?.trim() || DEFAULT_STUDENT_GROUP
  };
}

function getNavigationLabel(screen: MenuScreenKey): string {
  if (screen === "catalog") {
    return "Курсы";
  }

  if (screen === "meetings") {
    return "Занятия";
  }

  if (screen === "homework") {
    return "Домашние задания";
  }

  if (screen === "testing") {
    return "Тесты";
  }

  if (screen === "grades") {
    return "Успеваемость";
  }

  if (screen === "videoLessons") {
    return "Видео";
  }

  if (screen === "photoMaterials") {
    return "Материалы";
  }

  if (screen === "solver") {
    return "Решение задач";
  }

  if (screen === "latex") {
    return "Конспекты";
  }

  return "Профиль";
}

function getNavigationOrder(screen: MenuScreenKey): number {
  if (screen === "catalog") {
    return 1;
  }

  if (screen === "meetings") {
    return 2;
  }

  if (screen === "homework") {
    return 3;
  }

  if (screen === "testing") {
    return 4;
  }

  if (screen === "grades") {
    return 5;
  }

  if (screen === "videoLessons") {
    return 6;
  }

  if (screen === "photoMaterials") {
    return 7;
  }

  if (screen === "solver") {
    return 8;
  }

  if (screen === "latex") {
    return 9;
  }

  return 10;
}

function nextMode(currentMode: DemoDataMode): DemoDataMode {
  if (currentMode === "online") {
    return "offline";
  }

  if (currentMode === "offline") {
    return "loading";
  }

  if (currentMode === "loading") {
    return "error";
  }

  return "online";
}

function upsertLecture(lectures: LectureItem[], lecture: LectureItem): LectureItem[] {
  const existingIndex = lectures.findIndex((item) => item.id === lecture.id);

  if (existingIndex === -1) {
    return [...lectures, lecture];
  }

  const next = [...lectures];
  next[existingIndex] = lecture;
  return next;
}

function createDraftLectureItem(
  lectureId: string,
  input: DraftLectureInput,
  authorName: string,
  teacherLogin: string
): LectureItem {
  const lecture: LectureItem = {
    id: lectureId,
    title: input.title.trim() || "\u041d\u043e\u0432\u0430\u044f \u043b\u0435\u043a\u0446\u0438\u044f",
    author: authorName || "Visual Math Team",
    teacherLogin,
    subject: input.subject.trim() || "\u041c\u0430\u0442\u0435\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 \u0430\u043d\u0430\u043b\u0438\u0437",
    semester: input.semester.trim() || "1 \u0441\u0435\u043c\u0435\u0441\u0442\u0440",
    level: input.level.trim() || "\u0411\u0430\u0437\u043e\u0432\u044b\u0439",
    tags: ["draft", "teacher"],
    description: input.description.trim() || "\u041a\u0440\u0430\u0442\u043a\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435.",
    blocks: ["\u0422\u0435\u043e\u0440\u0438\u044f", "\u041f\u0440\u043e\u0432\u0435\u0440\u043e\u0447\u043d\u044b\u0439 \u0431\u043b\u043e\u043a"],
    participationRequirements: ["\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043b\u0435\u043a\u0446\u0438\u044e \u0438 \u043d\u0430\u0447\u043d\u0438\u0442\u0435 \u0441\u0435\u0441\u0441\u0438\u044e"],
    estimatedDuration: "15 \u043c\u0438\u043d\u0443\u0442"
  };

  const trimmedVideoUrl = input.videoUrl.trim();

  if (trimmedVideoUrl) {
    (lecture as LectureItem & { videoUrl?: string }).videoUrl = trimmedVideoUrl;
  }

  return lecture;
}

function createDraftLectureDetails(
  lectureId: string,
  input: DraftLectureInput
): LectureDetails {
  const theoryBlock: TextBlock = {
    id: `${lectureId}-theory`,
    type: "text",
    title: "Theory",
    payload: {
      markdown: input.theory
    }
  };

  const quizBlock: QuizBlock = {
    id: `${lectureId}-quiz`,
    type: "quiz",
    title: "Questions",
    payload: {
      questions: []
    }
  };

  return {
    id: lectureId,
    title: input.title,
    description: input.description,
    blocks: [theoryBlock, quizBlock]
  };
}

function ensureEditableLectureDetails(
  lecture: LectureItem | null,
  details?: LectureDetails | null
): LectureDetails | null {
  if (details) {
    return details;
  }

  if (!lecture) {
    return null;
  }

  const theoryBlock: TextBlock = {
    id: `${lecture.id}-theory`,
    type: "text",
    title: "Theory",
    payload: {
      markdown: lecture.description || ""
    }
  };

  const quizBlock: QuizBlock = {
    id: `${lecture.id}-quiz`,
    type: "quiz",
    title: "Questions",
    payload: {
      questions: []
    }
  };

  return {
    id: lecture.id,
    title: lecture.title,
    description: lecture.description,
    blocks: [theoryBlock, quizBlock]
  };
}

function withQuestionAdded(
  details: LectureDetails,
  input: DraftQuestionInput
): LectureDetails {
  const questionId = `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const question: QuizQuestion = {
    id: questionId,
    type: "single",
    text: input.text,
    options: [
      { id: "A", text: input.optionA },
      { id: "B", text: input.optionB },
      { id: "C", text: input.optionC },
      { id: "D", text: input.optionD }
    ],
    correctAnswerHint: input.explanation
      ? `Correct answer: ${input.correctOptionKey}. ${input.explanation}`
      : `Correct answer: ${input.correctOptionKey}.`
  };

  let quizFound = false;

  const nextBlocks = details.blocks.map((block) => {
    if (block.type !== "quiz") {
      return block;
    }

    quizFound = true;

    return {
      ...block,
      payload: {
        ...block.payload,
        questions: [...block.payload.questions, question]
      }
    };
  });

  if (!quizFound) {
    nextBlocks.push({
      id: `${details.id}-quiz`,
      type: "quiz",
      title: "Questions",
      payload: {
        questions: [question]
      }
    } as QuizBlock);
  }

  return {
    ...details,
    blocks: nextBlocks
  };
}

function withQuestionDeleted(details: LectureDetails, questionId: string): LectureDetails {
  return {
    ...details,
    blocks: details.blocks.map((block) => {
      if (block.type !== "quiz") {
        return block;
      }

      return {
        ...block,
        payload: {
          ...block.payload,
          questions: block.payload.questions.filter((question) => question.id !== questionId)
        }
      };
    })
  };
}

const DRAFT_LECTURES_STORAGE_KEY = "vm_mobile_draft_lectures_v1000";

type DraftStorageShape = {
  lectures: LectureItem[];
  lectureDetailsById: Record<string, LectureDetails>;
};

function readDraftStorage(): DraftStorageShape | null {
  try {
    const storage = (globalThis as {
      localStorage?: {
        getItem: (key: string) => string | null;
      };
    }).localStorage;

    if (!storage) {
      return null;
    }

    const raw = storage.getItem(DRAFT_LECTURES_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as DraftStorageShape;

    return {
      lectures: Array.isArray(parsed.lectures) ? parsed.lectures : [],
      lectureDetailsById:
        parsed.lectureDetailsById && typeof parsed.lectureDetailsById === "object"
          ? parsed.lectureDetailsById
          : {}
    };
  } catch {
    return null;
  }
}

function writeDraftStorage(payload: DraftStorageShape) {
  try {
    const storage = (globalThis as {
      localStorage?: {
        setItem: (key: string, value: string) => void;
      };
    }).localStorage;

    if (!storage) {
      return;
    }

    storage.setItem(DRAFT_LECTURES_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function mergeDraftLectures(base: LectureItem[], drafts: LectureItem[]): LectureItem[] {
  const next = new Map<string, LectureItem>();

  for (const lecture of base) {
    next.set(lecture.id, lecture);
  }

  for (const lecture of drafts) {
    next.set(lecture.id, lecture);
  }

  return Array.from(next.values());
}

function pickDraftLectureDetails(
  details: Record<string, LectureDetails>
): Record<string, LectureDetails> {
  return Object.fromEntries(
    Object.entries(details).filter(([lectureId]) => lectureId.startsWith("draft-lecture-"))
  );
}

const WEB_DRAFTS_KEY_V4 = "vm_mobile_web_drafts_v1000";

type WebDraftStateV4 = {
  lectures: LectureItem[];
  lectureDetailsById: Record<string, LectureDetails>;
};

function isDraftLectureV4(lectureId: string): boolean {
  return lectureId.startsWith("draft-lecture-");
}

function readWebDraftStateV4(): WebDraftStateV4 {
  try {
    const storage = (globalThis as {
      localStorage?: {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
      };
    }).localStorage;

    if (!storage) {
      return { lectures: [], lectureDetailsById: {} };
    }

    const raw = storage.getItem(WEB_DRAFTS_KEY_V4);

    if (!raw) {
      return { lectures: [], lectureDetailsById: {} };
    }

    const parsed = JSON.parse(raw) as WebDraftStateV4;

    return {
      lectures: Array.isArray(parsed.lectures) ? parsed.lectures : [],
      lectureDetailsById:
        parsed.lectureDetailsById && typeof parsed.lectureDetailsById === "object"
          ? parsed.lectureDetailsById
          : {}
    };
  } catch {
    return { lectures: [], lectureDetailsById: {} };
  }
}

function writeWebDraftStateV4(payload: WebDraftStateV4) {
  try {
    const storage = (globalThis as {
      localStorage?: {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
      };
    }).localStorage;

    if (!storage) {
      return;
    }

    storage.setItem(WEB_DRAFTS_KEY_V4, JSON.stringify(payload));
  } catch {}
}

function mergeWithDraftsV4(base: LectureItem[], drafts: LectureItem[]): LectureItem[] {
  const next = new Map<string, LectureItem>();

  for (const lecture of base) {
    next.set(lecture.id, lecture);
  }

  for (const lecture of drafts) {
    next.set(lecture.id, lecture);
  }

  return Array.from(next.values());
}

function persistDraftsV4(
  lectures: LectureItem[],
  lectureDetailsById: Record<string, LectureDetails>
) {
  writeWebDraftStateV4({
    lectures: lectures.filter((lecture) => isDraftLectureV4(lecture.id)),
    lectureDetailsById: Object.fromEntries(
      Object.entries(lectureDetailsById).filter(([lectureId]) => isDraftLectureV4(lectureId))
    )
  });
}

function isDraftLecture(lectureId: string): boolean {
  return lectureId.startsWith("draft-lecture-");
}

function mergeDraftLecturesIntoCatalog(
  apiLectures: LectureItem[],
  currentLectures: LectureItem[]
): LectureItem[] {
  const next = new Map<string, LectureItem>();

  for (const lecture of apiLectures) {
    next.set(lecture.id, lecture);
  }

  for (const lecture of currentLectures) {
    if (isDraftLecture(lecture.id)) {
      next.set(lecture.id, lecture);
    }
  }

  return Array.from(next.values());
}

function withTeacherScope<T extends { teacherLogin?: string }>(
  items: T[],
  teacherLogin: string | null
): T[] {
  if (!teacherLogin) {
    return items;
  }

  return items.map((item) =>
    item.teacherLogin ? item : { ...item, teacherLogin }
  );
}

const TEACHER_STATS_KEY = "vm.teacher.session.stats.v1";

type TeacherSessionStatsRecord = Record<
  string,
  {
    completed: number;
    totalScore: number;
    lastCorrectCount: number;
    updatedAt: string;
  }
>;

function readTeacherSessionStats(): TeacherSessionStatsRecord {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (!storage) {
      return {};
    }

    const raw = storage.getItem(TEACHER_STATS_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as TeacherSessionStatsRecord;
  } catch {
    return {};
  }
}

function writeTeacherSessionStats(value: TeacherSessionStatsRecord) {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (!storage) {
      return;
    }

    storage.setItem(TEACHER_STATS_KEY, JSON.stringify(value));
  } catch {}
}

function resetTeacherSessionStats(lectureId: string) {
  const current = readTeacherSessionStats();
  current[lectureId] = {
    completed: 0,
    totalScore: 0,
    lastCorrectCount: 0,
    updatedAt: new Date().toISOString()
  };
  writeTeacherSessionStats(current);
}

function appendTeacherSessionResult(lectureId: string, correctCount: number) {
  const current = readTeacherSessionStats();
  const previous = current[lectureId] ?? {
    completed: 0,
    totalScore: 0,
    lastCorrectCount: 0,
    updatedAt: new Date().toISOString()
  };

  current[lectureId] = {
    completed: previous.completed + 1,
    totalScore: previous.totalScore + correctCount,
    lastCorrectCount: correctCount,
    updatedAt: new Date().toISOString()
  };

  writeTeacherSessionStats(current);
}

const VIDEO_LESSONS_STORAGE_KEY = "vm_mobile_video_lessons_v1";

function readVideoLessons(): VideoLessonItem[] {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (!storage) {
      return [];
    }

    const raw = storage.getItem(VIDEO_LESSONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as VideoLessonItem[];
    return Array.isArray(parsed)
      ? parsed.map((item) => ({
          ...item,
          title: fixText(String(item.title ?? "")),
          url: String(item.url ?? ""),
          authorName: fixText(String(item.authorName ?? "")),
          fileName: item.fileName ? fixText(String(item.fileName)) : undefined,
          fileType: item.fileType ? String(item.fileType) : undefined,
          fileData: item.fileData ? String(item.fileData) : undefined,
          mimeType: item.mimeType ? String(item.mimeType) : undefined
        }))
      : [];
  } catch {
    return [];
  }
}

function writeVideoLessons(value: VideoLessonItem[]) {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (!storage) {
      return;
    }

    storage.setItem(VIDEO_LESSONS_STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

const PHOTO_MATERIALS_STORAGE_KEY = "vm_mobile_photo_materials_v1";

function readPhotoMaterials(): PhotoMaterialItem[] {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (!storage) {
      return [];
    }

    const raw = storage.getItem(PHOTO_MATERIALS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Array<PhotoMaterialItem & { imageUrl?: string }>;
    return Array.isArray(parsed)
      ? parsed.map((item) => ({
          ...item,
          resourceUrl: String(item.resourceUrl ?? item.imageUrl ?? ""),
          title: fixText(String(item.title ?? "")),
          note: fixText(String(item.note ?? "")),
          authorName: fixText(String(item.authorName ?? "")),
          fileName: item.fileName ? fixText(String(item.fileName)) : undefined,
          fileType: item.fileType ? String(item.fileType) : undefined,
          fileData: item.fileData ? String(item.fileData) : undefined,
          mimeType: item.mimeType ? String(item.mimeType) : undefined
        }))
      : [];
  } catch {
    return [];
  }
}

function writePhotoMaterials(value: PhotoMaterialItem[]) {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (!storage) {
      return;
    }

    storage.setItem(PHOTO_MATERIALS_STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

export function AppNavigation() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("catalog");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [catalogLectures, setCatalogLectures] = useState<LectureItem[]>(mockLectures);
  const [selectedLecture, setSelectedLecture] = useState<LectureItem | null>(null);
  const [lastOpenedLectureId, setLastOpenedLectureId] = useState<string | null>(null);

  const [lectureDetailsById, setLectureDetailsById] = useState<Record<string, LectureDetails>>({});
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [videoLessons, setVideoLessons] = useState<VideoLessonItem[]>(readVideoLessons());
  const [photoMaterials, setPhotoMaterials] = useState<PhotoMaterialItem[]>(readPhotoMaterials());
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkSubmissionItem[]>([]);
  const [teacherBranches, setTeacherBranches] = useState<TeacherBranch[]>([]);
  const [selectedTeacherLogin, setSelectedTeacherLogin] = useState<string | null>(null);
  const [latexDocument, setLatexDocument] = useState<LatexDocumentState>(
    createDefaultLatexDocument()
  );
  const [latexScopeLogin, setLatexScopeLogin] = useState<string | null>(null);
  const [testingResults, setTestingResults] = useState<TestingRunResult[]>([]);
  const [activeTestingSession, setActiveTestingSession] = useState<ActiveTestingSession | null>(null);
  const [testingSubmissions, setTestingSubmissions] = useState<TestingSubmission[]>([]);

  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [currentResult, setCurrentResult] = useState<TaskResult | null>(null);
  const [currentTeacherSession, setCurrentTeacherSession] = useState<TeacherManagedSession | null>(null);

  const [catalogMode, setCatalogMode] = useState<DemoDataMode>("loading");
  const [sessionMode, setSessionMode] = useState<DemoDataMode>("online");
  const [isHydrating, setIsHydrating] = useState(true);

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);
  const isTeacher = user.role === "teacher";
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 820;
  const isPhoneLayout = width < 520;
  const headerTitleSize = isPhoneLayout ? 24 : isCompactLayout ? 26 : theme.typography.screenTitle;
  const topBarPaddingX = isPhoneLayout ? theme.spacing.sm : theme.spacing.md;
  const topBarPaddingTop = isPhoneLayout ? theme.spacing.sm : theme.spacing.md;
  const menuPanelLeft = isPhoneLayout ? theme.spacing.sm : theme.spacing.md;

  const selectedTeacherBranch = useMemo(
    () => teacherBranches.find((branch) => branch.teacherLogin === selectedTeacherLogin) ?? null,
    [teacherBranches, selectedTeacherLogin]
  );
  const ownTeacherBranch = useMemo(
    () => teacherBranches.find((branch) => branch.teacherLogin === user.login) ?? null,
    [teacherBranches, user.login]
  );
  const displayRoleBadgeLabel = fixText(
    isTeacher ? "Преподаватель" : selectedTeacherBranch?.teacherName || "Ветка"
  );

  const roleBadgeLabel = isTeacher
    ? "Преподаватель"
    : selectedTeacherBranch?.teacherName || "Выбор преподавателя";

  const scopedTeacherLogin = isTeacher ? user.login : selectedTeacherLogin;
  const studentLandingScreen: "catalog" | "teacherBranchSelect" = selectedTeacherLogin
    ? "catalog"
    : "teacherBranchSelect";

  const visibleLectures = useMemo(() => {
    if (!scopedTeacherLogin) {
      return isTeacher ? catalogLectures : [];
    }

    const scoped = catalogLectures.filter((lecture) => lecture.teacherLogin === scopedTeacherLogin);

    if (scoped.length > 0) {
      return scoped;
    }

    return catalogLectures.filter((lecture) => !lecture.teacherLogin);
  }, [catalogLectures, isTeacher, scopedTeacherLogin]);

  const visibleVideoLessons = useMemo(() => {
    if (!scopedTeacherLogin) {
      return isTeacher ? videoLessons : [];
    }

    const scoped = videoLessons.filter((lesson) => lesson.teacherLogin === scopedTeacherLogin);

    if (scoped.length > 0) {
      return scoped;
    }

    return videoLessons.filter((lesson) => !lesson.teacherLogin);
  }, [isTeacher, scopedTeacherLogin, videoLessons]);

  const visiblePhotoMaterials = useMemo(() => {
    if (!scopedTeacherLogin) {
      return isTeacher ? photoMaterials : [];
    }

    const scoped = photoMaterials.filter((material) => material.teacherLogin === scopedTeacherLogin);

    if (scoped.length > 0) {
      return scoped;
    }

    return photoMaterials.filter((material) => !material.teacherLogin);
  }, [isTeacher, photoMaterials, scopedTeacherLogin]);

  const visibleMeetings = useMemo(() => {
    if (!scopedTeacherLogin) {
      return isTeacher ? meetings : [];
    }

    const scoped = meetings.filter((meeting) => meeting.teacherLogin === scopedTeacherLogin);

    if (scoped.length > 0) {
      return scoped;
    }

    return meetings.filter((meeting) => !meeting.teacherLogin);
  }, [isTeacher, meetings, scopedTeacherLogin]);

  const visibleHomeworks = useMemo(() => {
    if (!scopedTeacherLogin) {
      return isTeacher ? homeworks : [];
    }

    const scoped = homeworks.filter((homework) => homework.teacherLogin === scopedTeacherLogin);

    if (scoped.length > 0) {
      return scoped;
    }

    return homeworks.filter((homework) => !homework.teacherLogin);
  }, [homeworks, isTeacher, scopedTeacherLogin]);

  const visibleHomeworkSubmissions = useMemo(() => {
    if (!scopedTeacherLogin) {
      return isTeacher ? homeworkSubmissions : [];
    }

    const scoped = homeworkSubmissions.filter(
      (submission) => submission.teacherLogin === scopedTeacherLogin
    );

    const base = scoped.length > 0
      ? scoped
      : homeworkSubmissions.filter((submission) => !submission.teacherLogin);

    return isTeacher
      ? base
      : base.filter((submission) => submission.studentLogin === user.login);
  }, [homeworkSubmissions, isTeacher, scopedTeacherLogin, user.login]);

  const visibleActiveTestingSession = useMemo(() => {
    if (!activeTestingSession) {
      return null;
    }

    if (isTeacher) {
      return activeTestingSession.teacherLogin === user.login ? activeTestingSession : null;
    }

    if (!selectedTeacherLogin) {
      return null;
    }

    return activeTestingSession.teacherLogin === selectedTeacherLogin
      ? activeTestingSession
      : null;
  }, [activeTestingSession, isTeacher, selectedTeacherLogin, user.login]);

  const visibleTestingSubmissions = useMemo(() => {
    if (!visibleActiveTestingSession) {
      return [];
    }

    return testingSubmissions.filter(
      (submission) => submission.sessionId === visibleActiveTestingSession.id
    );
  }, [testingSubmissions, visibleActiveTestingSession]);
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false
    });
  }, []);

  useEffect(() => {
    const savedDrafts = readDraftStorage();

    if (savedDrafts) {
      setCatalogLectures((current) => mergeDraftLectures(current, savedDrafts.lectures));
      setLectureDetailsById((current) => ({
        ...current,
        ...savedDrafts.lectureDetailsById
      }));
    }

    setDraftsLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftsLoaded) {
      return;
    }

    writeDraftStorage({
      lectures: catalogLectures.filter((lecture) => lecture.id.startsWith("draft-lecture-")),
      lectureDetailsById: pickDraftLectureDetails(lectureDetailsById)
    });
  }, [draftsLoaded, catalogLectures, lectureDetailsById]);

  useEffect(() => {
    writeVideoLessons(videoLessons);
  }, [videoLessons]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAppState() {
      try {
        const [
          cachedLectures,
          cachedLastLectureId,
          cachedThemeMode,
          cachedNotificationsEnabled,
          storedAuthMeta,
          storedMeetings,
          storedHomeworks,
          storedHomeworkSubmissions,
          storedTeacherBranches,
          storedSelectedTeacherLogin,
          storedActiveTestingSession,
          storedTestingSubmissions
        ] = await Promise.all([
          readCatalogSnapshot(),
          readLastLectureId(),
          readThemeMode(),
          readNotificationsEnabled(),
          readAuthMeta(),
          readMeetings(),
          readHomeworks(),
          readHomeworkSubmissions(),
          readTeacherBranches(),
          readSelectedTeacherLogin(),
          readActiveTestingSession(),
          readTestingSubmissions()
        ]);

        if (!isMounted) {
          return;
        }

        const teacherScopedLogin = storedAuthMeta?.role === "teacher" ? storedAuthMeta.userLogin : null;
        const webDraftState = readWebDraftStateV4();

        if (cachedLectures && cachedLectures.length > 0) {
          setCatalogLectures(
            mergeWithDraftsV4(
              withTeacherScope(cachedLectures, teacherScopedLogin),
              webDraftState.lectures
            )
          );
          setCatalogMode("offline");
        } else {
          setCatalogLectures(
            mergeWithDraftsV4(
              withTeacherScope(mockLectures, teacherScopedLogin),
              webDraftState.lectures
            )
          );
        }

        if (Object.keys(webDraftState.lectureDetailsById).length > 0) {
          setLectureDetailsById((current) => ({
            ...current,
            ...webDraftState.lectureDetailsById
          }));
        }

        if (cachedLastLectureId) {
          setLastOpenedLectureId(cachedLastLectureId);
        }

        if (cachedThemeMode) {
          setThemeMode(cachedThemeMode);
        }

        if (typeof cachedNotificationsEnabled === "boolean") {
          setNotificationsEnabled(cachedNotificationsEnabled);
        }

        if (Array.isArray(storedMeetings) && storedMeetings.length > 0) {
          setMeetings(withTeacherScope(storedMeetings, teacherScopedLogin));
        }

        if (Array.isArray(storedHomeworks) && storedHomeworks.length > 0) {
          setHomeworks(withTeacherScope(storedHomeworks, teacherScopedLogin));
        }

        if (Array.isArray(storedHomeworkSubmissions) && storedHomeworkSubmissions.length > 0) {
          setHomeworkSubmissions(withTeacherScope(storedHomeworkSubmissions, teacherScopedLogin));
        }

        if (Array.isArray(storedTeacherBranches) && storedTeacherBranches.length > 0) {
          setTeacherBranches(storedTeacherBranches);
        }

        if (storedSelectedTeacherLogin) {
          setSelectedTeacherLogin(storedSelectedTeacherLogin);
        }

        if (storedActiveTestingSession) {
          setActiveTestingSession(storedActiveTestingSession);
        }

        if (Array.isArray(storedTestingSubmissions) && storedTestingSubmissions.length > 0) {
          setTestingSubmissions(storedTestingSubmissions);
        }

        if (storedAuthMeta?.userLogin) {
          try {
            const profile = await authApi.me();

            if (!isMounted) {
              return;
            }

            const nextUser = mapApiProfileToMobileUser(profile);
            setUser(nextUser);

            await writeAuthMeta({
              userLogin: nextUser.login,
              role: nextUser.role,
              fullName: nextUser.fullName,
              group: nextUser.group
            });

            if (nextUser.role === "teacher") {
              ensureTeacherBranch(nextUser.login, nextUser.fullName || nextUser.login);
            }

            setIsAuthenticated(true);
            setActiveScreen(
              nextUser.role === "teacher"
                ? "teacherHome"
                : storedSelectedTeacherLogin
                  ? "catalog"
                  : "teacherBranchSelect"
            );

            const summaries = await catalogApi.listLectures();
            if (!isMounted) {
              return;
            }

            const nextLectures = summaries.map((summary) =>
              mapLectureSummaryToLectureItem(
                summary,
                cachedLectures?.find((item) => item.id === summary.id)
              )
            );

            const scopedLectures =
              nextUser.role === "teacher"
                ? nextLectures.map((lecture) => ({
                    ...lecture,
                    teacherLogin: lecture.teacherLogin ?? nextUser.login
                  }))
                : nextLectures;

            const mergedLectures = mergeWithDraftsV4(scopedLectures, webDraftState.lectures);

            setCatalogLectures(mergedLectures);
            setLectureDetailsById((current) => ({
              ...current,
              ...webDraftState.lectureDetailsById
            }));
            setCatalogMode("online");
            await writeCatalogSnapshot(mergedLectures);
          } catch {
            await clearAuthSession();
            setIsAuthenticated(false);
            setUser(DEFAULT_USER);
            setCatalogMode(cachedLectures?.length ? "offline" : "error");
          }
        } else {
          setCatalogMode(cachedLectures?.length ? "offline" : "error");
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    }

    void hydrateAppState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeCatalogSnapshot(catalogLectures);
  }, [catalogLectures, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    persistDraftsV4(catalogLectures, lectureDetailsById);
  }, [catalogLectures, lectureDetailsById, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeThemeMode(themeMode);
  }, [themeMode, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeNotificationsEnabled(notificationsEnabled);
  }, [notificationsEnabled, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeMeetings(meetings);
  }, [meetings, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeHomeworks(homeworks);
  }, [homeworks, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeHomeworkSubmissions(homeworkSubmissions);
  }, [homeworkSubmissions, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeTeacherBranches(teacherBranches);
  }, [teacherBranches, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeSelectedTeacherLogin(selectedTeacherLogin);
  }, [selectedTeacherLogin, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    setLatexDocument(readLatexDocument(scopedTeacherLogin));
    setLatexScopeLogin(scopedTeacherLogin);
  }, [isHydrating, scopedTeacherLogin]);

  useEffect(() => {
    if (isHydrating || !scopedTeacherLogin || latexScopeLogin !== scopedTeacherLogin) {
      return;
    }

    void writeLatexDocument(latexDocument, scopedTeacherLogin);
  }, [isHydrating, latexDocument, latexScopeLogin, scopedTeacherLogin]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeActiveTestingSession(activeTestingSession);
  }, [activeTestingSession, isHydrating]);

  useEffect(() => {
    if (isHydrating) {
      return;
    }

    void writeTestingSubmissions(testingSubmissions);
  }, [testingSubmissions, isHydrating]);

  useEffect(() => {
    if (!isAuthenticated || isHydrating) {
      return;
    }

    let isMounted = true;

    async function syncTestingState() {
      const [storedSession, storedSubmissions] = await Promise.all([
        readActiveTestingSession(),
        readTestingSubmissions()
      ]);

      if (!isMounted) {
        return;
      }

      setActiveTestingSession(storedSession);
      setTestingSubmissions(Array.isArray(storedSubmissions) ? storedSubmissions : []);
    }

    void syncTestingState();

    const timerId = setInterval(() => {
      void syncTestingState();
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, [isAuthenticated, isHydrating]);

  function ensureTeacherBranch(nextTeacherLogin: string, nextTeacherName: string) {
    setTeacherBranches((current) => {
      const existingIndex = current.findIndex((branch) => branch.teacherLogin === nextTeacherLogin);
      const baseBranch: TeacherBranch = {
        teacherLogin: nextTeacherLogin,
        teacherName: nextTeacherName,
        title: nextTeacherName,
        joinCode: createTeacherJoinCode(nextTeacherLogin),
        description: `Материалы преподавателя ${nextTeacherName}`,
        createdAt:
          existingIndex === -1
            ? new Date().toISOString()
            : current[existingIndex].createdAt
      };

      if (existingIndex === -1) {
        return [baseBranch, ...current];
      }

      const next = [...current];
      next[existingIndex] = {
        ...next[existingIndex],
        teacherName: nextTeacherName,
        joinCode: next[existingIndex].joinCode || baseBranch.joinCode,
        title: next[existingIndex].title || baseBranch.title,
        description: next[existingIndex].description || baseBranch.description
      };

      return next;
    });
  }

  function adoptTeacherContent(nextTeacherLogin: string) {
    setCatalogLectures((current) => withTeacherScope(current, nextTeacherLogin));
    setVideoLessons((current) => withTeacherScope(current, nextTeacherLogin));
    setPhotoMaterials((current) => withTeacherScope(current, nextTeacherLogin));
    setMeetings((current) => withTeacherScope(current, nextTeacherLogin));
    setHomeworks((current) => withTeacherScope(current, nextTeacherLogin));
    setHomeworkSubmissions((current) => withTeacherScope(current, nextTeacherLogin));
  }

  function handleSelectTeacherBranch(nextTeacherLogin: string) {
    setSelectedTeacherLogin(nextTeacherLogin);
    resetStudentFlow();
    resetTeacherFlow();
    setActiveScreen("catalog");
  }

  function handleDisconnectTeacherBranch() {
    setSelectedTeacherLogin(null);
    resetStudentFlow();
    resetTeacherFlow();
    setActiveScreen("teacherBranchSelect");
  }

  function handleOpenTeacherBranchSelector() {
    resetStudentFlow();
    resetTeacherFlow();
    setActiveScreen("teacherBranchSelect");
  }

  function handleJoinTeacherBranch(
    joinCode: string
  ): { ok: true; branch: TeacherBranch } | { ok: false; error: string } {
    const normalizedCode = normalizeTeacherJoinCode(joinCode);

    if (!normalizedCode) {
      return { ok: false, error: "Введите код преподавателя." };
    }

    const matchedBranch =
      teacherBranches.find(
        (branch) => normalizeTeacherJoinCode(branch.joinCode) === normalizedCode
      ) ?? null;

    if (!matchedBranch) {
      return { ok: false, error: "Курс с таким кодом не найден. Проверь код и попробуй снова." };
    }

    handleSelectTeacherBranch(matchedBranch.teacherLogin);
    return { ok: true, branch: matchedBranch };
  }

  async function refreshCatalogFromApi(nextTeacherLogin?: string) {
    setCatalogMode("loading");

    try {
      const summaries = await catalogApi.listLectures();

      const nextLectures = summaries.map((summary) =>
        mapLectureSummaryToLectureItem(
          summary,
          catalogLectures.find((item) => item.id === summary.id)
        )
      );

      const scopedLectures = nextTeacherLogin
        ? nextLectures.map((lecture) => ({
            ...lecture,
            teacherLogin: lecture.teacherLogin ?? nextTeacherLogin
          }))
        : nextLectures;

      const mergedLectures = mergeDraftLecturesIntoCatalog(scopedLectures, catalogLectures);

      setCatalogLectures(mergedLectures);
      setCatalogMode("online");

      await writeCatalogSnapshot(mergedLectures);
    } catch {
      setCatalogMode(catalogLectures.length > 0 ? "offline" : "error");
    }
  }

  async function ensureLectureDetails(lecture: LectureItem): Promise<LectureDetails | null> {
    const cachedDetails = lectureDetailsById[lecture.id];
    if (cachedDetails) {
      return cachedDetails;
    }

    try {
      const details = await catalogApi.getLecture(lecture.id);

      setLectureDetailsById((current) => ({
        ...current,
        [lecture.id]: details
      }));

      const mappedLecture = {
        ...mapLectureDetailsToLectureItem(details, lecture),
        teacherLogin: lecture.teacherLogin
      };

      setCatalogLectures((current) => upsertLecture(current, mappedLecture));
      setSelectedLecture(mappedLecture);

      return details;
    } catch {
      return null;
    }
  }

  async function persistAuthenticatedUser(nextUser: UserProfile) {
    await writeAuthMeta({
      userLogin: nextUser.login,
      role: nextUser.role,
      fullName: nextUser.fullName,
      group: nextUser.group
    });

    if (nextUser.role === "teacher") {
      ensureTeacherBranch(nextUser.login, nextUser.fullName || nextUser.login);
      adoptTeacherContent(nextUser.login);
      setActiveScreen("teacherHome");
    } else {
      setSelectedTeacherLogin(null);
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("teacherBranchSelect");
    }

    setUser(nextUser);
    setIsAuthenticated(true);

    try {
      await refreshCatalogFromApi(nextUser.role === "teacher" ? nextUser.login : undefined);
    } catch {}
  }

  async function handleLogin(input: {
    login: string;
    password: string;
    role: LoginRole;
    mode: "login" | "register";
    fullName?: string;
  }): Promise<string | null> {
    return handleBackendLogin(input);
    /*
    const safeLogin = input.login.trim().toLowerCase();
    const safePassword = input.password.trim();

    if (!safeLogin || !safePassword) {
      return "Заполни логин и пароль.";
    }

    if (input.role === "teacher") {
      if (input.mode === "register") {
        return "Регистрация преподавателя отключена. Используй логин teacher и пароль teacher.";
      }

      const teacherAccount = findTeacherAccount(safeLogin, safePassword);

      if (!teacherAccount) {
        return "Неверный логин или пароль преподавателя.";
      }

      const nextUser: UserProfile = {
        fullName: teacherAccount.fullName,
        login: teacherAccount.login,
        role: "teacher",
        group: teacherAccount.group
      };

      await writeAuthMeta({
        userLogin: nextUser.login,
        role: "teacher",
        fullName: nextUser.fullName,
        group: nextUser.group
      });

      ensureTeacherBranch(nextUser.login, nextUser.fullName);
      adoptTeacherContent(nextUser.login);

      setUser(nextUser);
      setIsAuthenticated(true);
      setActiveScreen("teacherHome");

      try {
        await refreshCatalogFromApi(nextUser.login);
      } catch {}

      return null;
    }

    if (input.mode === "register") {
      const registerResult = await registerStudentAccount({
        login: safeLogin,
        password: safePassword,
        fullName: input.fullName?.trim() || safeLogin,
        group: mockUser.group
      });

      if (!registerResult.ok) {
        return registerResult.error;
      }

      return `REGISTRATION_SUCCESS::${registerResult.account.login}`;
    }

    const studentAccount = await validateStudentCredentials(safeLogin, safePassword);

    if (!studentAccount) {
      return "Студент с таким логином и паролем не найден. Сначала зарегистрируйся или проверь данные.";
    }

    const nextUser: UserProfile = {
      fullName: studentAccount.fullName,
      login: studentAccount.login,
      role: "student",
      group: studentAccount.group
    };

    await writeAuthMeta({
      userLogin: nextUser.login,
      role: "student",
      fullName: nextUser.fullName,
      group: nextUser.group
    });

    setUser(nextUser);
    setIsAuthenticated(true);
    setSelectedTeacherLogin(null);
    resetStudentFlow();
    resetTeacherFlow();
    setActiveScreen("teacherBranchSelect");

    try {
      await refreshCatalogFromApi();
    } catch {}

    return null;
    */
  }

  async function handleGoogleLogin(_payload: GoogleLoginPayload): Promise<string | null> {
    return handleBackendGoogleLogin(_payload);
    /*
    if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID.startsWith("PASTE_YOUR_WEB_CLIENT_ID_HERE")) {
      return "Сначала вставь реальный Google Web Client ID в AppNavigation.tsx.";
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return "Вход через Google отменён.";
      }

      const googleUser = response.data.user;
      const safeEmail = String(googleUser.email ?? "").trim().toLowerCase();
      const safeName = String(googleUser.name ?? "").trim();

      if (!safeEmail) {
        return "Google не вернул email пользователя.";
      }

      const existingAccounts = await readStudentAccounts();
      const existingAccount =
        existingAccounts.find((account) => account.login === safeEmail) ?? null;

      if (!existingAccount) {
        const registerResult = await registerStudentAccount({
          login: safeEmail,
          password: "google_oauth_account",
          fullName: safeName || safeEmail,
          group: mockUser.group
        });

        if (!registerResult.ok) {
          return registerResult.error;
        }
      }

      const nextUser: UserProfile = {
        fullName: existingAccount?.fullName || safeName || safeEmail,
        login: safeEmail,
        role: "student",
        group: existingAccount?.group || mockUser.group
      };

      await writeAuthMeta({
        userLogin: nextUser.login,
        role: "student",
        fullName: nextUser.fullName,
        group: nextUser.group
      });

      setUser(nextUser);
      setIsAuthenticated(true);
      setSelectedTeacherLogin(null);
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("teacherBranchSelect");

      try {
        await refreshCatalogFromApi();
      } catch {}

      return null;
    } catch (error: unknown) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            return "Вход через Google уже выполняется.";
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            return "На устройстве недоступны Google Play Services.";
          default:
            return "Не удалось выполнить вход через Google.";
        }
      }

      return "Не удалось выполнить вход через Google.";
    }
  }

    */
  }

  async function handleVkLogin(_payload: VkLoginPayload): Promise<string | null> {
    return "Для реального входа через VK сначала добавь VK APP ID и redirect URL.";
  }

  async function handleBackendLogin(input: {
    login: string;
    password: string;
    role: LoginRole;
    mode: "login" | "register";
    fullName?: string;
  }): Promise<string | null> {
    const safeLogin = input.login.trim().toLowerCase();
    const safePassword = input.password.trim();

    if (!safeLogin || !safePassword) {
      return fixText("Заполни логин и пароль.");
    }

    try {
      if (input.role === "teacher" && input.mode === "register") {
        return fixText(
          "Регистрация преподавателя отключена. Преподавателя создает администратор через backend."
        );
      }

      if (input.mode === "register") {
        const registeredUser = await authApi.registerStudent({
          login: safeLogin,
          password: safePassword,
          fullName: input.fullName?.trim() || safeLogin,
          groupName: DEFAULT_STUDENT_GROUP
        });

        return `REGISTRATION_SUCCESS::${registeredUser.login}`;
      }

      await authApi.login(
        safeLogin,
        safePassword,
        input.role === "teacher" ? "teacher" : "student"
      );
      const profile = await authApi.me();
      const nextUser = mapApiProfileToMobileUser(profile);

      if (input.role === "teacher" && nextUser.role !== "teacher") {
        await authApi.logout();
        await clearAuthSession();
        return fixText("Этот аккаунт не имеет доступа преподавателя.");
      }

      await persistAuthenticatedUser(nextUser);
      return null;
    } catch (error: unknown) {
      return fixText(toUserMessage(error));
    }
  }

  async function handleBackendGoogleLogin(_payload: GoogleLoginPayload): Promise<string | null> {
    if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID.startsWith("PASTE_YOUR_WEB_CLIENT_ID_HERE")) {
      return fixText("Сначала вставь реальный Google Web Client ID в AppNavigation.tsx.");
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return fixText("Вход через Google отменен.");
      }

      const googleUser = response.data.user;
      const safeEmail = String(googleUser.email ?? "").trim().toLowerCase();
      const safeName = String(googleUser.name ?? "").trim();

      if (!safeEmail) {
        return fixText("Google не вернул email пользователя.");
      }

      try {
        await authApi.registerStudent({
          login: safeEmail,
          password: "google_oauth_account",
          fullName: safeName || safeEmail,
          groupName: DEFAULT_STUDENT_GROUP
        });
      } catch {}

      await authApi.login(safeEmail, "google_oauth_account", "student");
      const profile = await authApi.me();
      await persistAuthenticatedUser(mapApiProfileToMobileUser(profile));

      return null;
    } catch (error: unknown) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            return fixText("Вход через Google уже выполняется.");
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            return fixText("На устройстве недоступны Google Play Services.");
          default:
            return fixText("Не удалось выполнить вход через Google.");
        }
      }

      return fixText("Не удалось выполнить вход через Google.");
    }
  }

  async function handleBackendLogout() {
    try {
      await authApi.logout();
    } catch {}

    setIsAuthenticated(false);
    setActiveScreen("catalog");
    setSelectedLecture(null);
    setCurrentSession(null);
    setCurrentResult(null);
    setCurrentTeacherSession(null);
    setLastOpenedLectureId(null);
    setLectureDetailsById((current) => pickDraftLectureDetails(current));
    setUser(DEFAULT_USER);

    try {
      await clearAuthSession();
    } catch {}

    try {
      await GoogleSignin.signOut();
    } catch {}
  }

  function resetStudentFlow() {
    setSelectedLecture(null);
    setCurrentSession(null);
    setCurrentResult(null);
    setSessionMode("online");
  }

  function resetTeacherFlow() {
    setCurrentTeacherSession(null);
  }

  function handleUpdateDraftLectureMeta(lectureId: string, input: DraftLectureMetaInput) {
    setCatalogLectures((current) =>
      current.map((lecture) => {
        if (lecture.id !== lectureId) {
          return lecture;
        }

        const nextLecture = {
          ...lecture,
          subject: input.subject,
          semester: input.semester,
          level: input.level
        } as LectureItem & { videoUrl?: string };

        const trimmedVideoUrl = input.videoUrl.trim();

        if (trimmedVideoUrl) {
          nextLecture.videoUrl = trimmedVideoUrl;
        } else {
          delete nextLecture.videoUrl;
        }

        return nextLecture;
      })
    );
  }

  function handleDeleteLecture(lectureId: string) {
    setCatalogLectures((current) => current.filter((lecture) => lecture.id !== lectureId));

    setLectureDetailsById((current) => {
      const next = { ...current };
      delete next[lectureId];
      return next;
    });

    setSelectedLecture((current) => (current?.id === lectureId ? null : current));
    setLastOpenedLectureId((current) => (current === lectureId ? null : current));
  }

  function handleCreateDraftLecture(input: DraftLectureInput): string | null {
    const lectureId = `draft-lecture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextLecture = createDraftLectureItem(lectureId, input, user.fullName, user.login);
    const nextDetails = createDraftLectureDetails(lectureId, input);

    setCatalogLectures((current) => upsertLecture(current, nextLecture));
    setLectureDetailsById((current) => ({
      ...current,
      [lectureId]: nextDetails
    }));
    setSelectedLecture(nextLecture);
    setLastOpenedLectureId(lectureId);
    void writeLastLectureId(lectureId);

    return lectureId;
  }

  function handleAddDraftQuestion(lectureId: string, input: DraftQuestionInput) {
    const lecture = catalogLectures.find((item) => item.id === lectureId) ?? null;

    setLectureDetailsById((current) => {
      const editable = ensureEditableLectureDetails(lecture, current[lectureId]);

      if (!editable) {
        return current;
      }

      const questionId = `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const nextQuestion: QuizQuestion = {
        id: questionId,
        type: "single",
        text: input.text,
        options: [
          { id: "A", text: input.optionA },
          { id: "B", text: input.optionB },
          { id: "C", text: input.optionC },
          { id: "D", text: input.optionD }
        ],
        correctAnswerHint: input.explanation
          ? `Correct answer: ${String(input.correctOptionKey).trim().toUpperCase()}. ${input.explanation}`
          : `Correct answer: ${String(input.correctOptionKey).trim().toUpperCase()}.`
      };

      (nextQuestion as QuizQuestion & { correctOptionId?: string }).correctOptionId =
        String(input.correctOptionKey).trim().toUpperCase();

      let quizFound = false;

      const nextBlocks = editable.blocks.map((block) => {
        if (block.type !== "quiz") {
          return block;
        }

        quizFound = true;

        return {
          ...block,
          payload: {
            ...block.payload,
            questions: [...block.payload.questions, nextQuestion]
          }
        };
      });

      if (!quizFound) {
        nextBlocks.push({
          id: `${lectureId}-quiz`,
          type: "quiz",
          title: "Questions",
          payload: {
            questions: [nextQuestion]
          }
        } as QuizBlock);
      }

      return {
        ...current,
        [lectureId]: {
          ...editable,
          blocks: nextBlocks
        }
      };
    });
  }

  function handleDeleteDraftQuestion(lectureId: string, questionId: string) {
    const lecture = catalogLectures.find((item) => item.id === lectureId) ?? null;

    setLectureDetailsById((current) => {
      const editable = ensureEditableLectureDetails(lecture, current[lectureId]);
      if (!editable) {
        return current;
      }

      return {
        ...current,
        [lectureId]: withQuestionDeleted(editable, questionId)
      };
    });
  }

  function handleCreateVideoLesson(input: {
    title: string;
    url: string;
    fileName?: string;
    fileType?: string;
    fileData?: string;
    mimeType?: string;
  }) {
    const nextTitle = input.title.trim();
    const nextUrl = input.url.trim();
    const nextFileName = input.fileName?.trim() ?? "";
    const nextFileType = input.fileType?.trim() ?? "";
    const nextFileData = input.fileData?.trim() ?? "";
    const nextMimeType = input.mimeType?.trim() ?? "";

    if (!nextTitle || (!nextUrl && !nextFileData)) {
      return;
    }

    const nextLesson: VideoLessonItem = {
      id: `video-lesson-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: nextTitle,
      url: nextUrl,
      authorName: fixText(user.fullName || "Visual Math Team"),
      createdAt: new Date().toISOString(),
      teacherLogin: user.login
    };

    if (nextFileName && nextFileType && nextFileData) {
      nextLesson.fileName = nextFileName;
      nextLesson.fileType = nextFileType;
      nextLesson.fileData = nextFileData;
      nextLesson.mimeType = nextMimeType || "video/mp4";
    }

    setVideoLessons((current: VideoLessonItem[]) => [nextLesson, ...current]);
  }

  function handleDeleteVideoLesson(lessonId: string) {
    setVideoLessons((current: VideoLessonItem[]) =>
      current.filter((lesson: VideoLessonItem) => lesson.id !== lessonId)
    );
  }

  async function handleLogout() {
    setIsAuthenticated(false);
    setActiveScreen("catalog");
    setSelectedLecture(null);
    setCurrentSession(null);
    setCurrentResult(null);
    setCurrentTeacherSession(null);
    setLastOpenedLectureId(null);
    setLectureDetailsById((current) => pickDraftLectureDetails(current));
    setUser(DEFAULT_USER);

    try {
      await clearAuthSession();
    } catch {}

    try {
      await GoogleSignin.signOut();
    } catch {}

    try {
      await authApi.logout();
    } catch {}
  }

  async function handleOpenLecture(lecture: LectureItem) {
    setSelectedLecture(lecture);
    setLastOpenedLectureId(lecture.id);
    void writeLastLectureId(lecture.id);
    setCurrentSession(null);
    setCurrentResult(null);
    setActiveScreen("details");

    const details = await ensureLectureDetails(lecture);
    if (!details) {
      setCatalogMode("offline");
    }
  }

  function handleBackToCatalog() {
    resetStudentFlow();
    setActiveScreen(studentLandingScreen);
  }

  async function handleOpenSession() {
    if (!selectedLecture) {
      return;
    }

    setSessionMode("loading");

    const details =
      lectureDetailsById[selectedLecture.id] ?? (await ensureLectureDetails(selectedLecture));

    if (selectedLecture.id.startsWith("draft-lecture-")) {
      setCurrentSession(createMockSession(selectedLecture, details));
      setCurrentResult(null);
      setSessionMode("online");
      setActiveScreen("session");
      return;
    }

    if (!details) {
      setCurrentSession(createMockSession(selectedLecture));
      setCurrentResult(null);
      setSessionMode("offline");
      setActiveScreen("session");
      return;
    }

    try {
      const sessionState = await sessionApi.getSession(selectedLecture.id);
      const mappedSession = mapSessionToSessionData({
        lecture: selectedLecture,
        details,
        sessionState
      });

      setCurrentSession(mappedSession);
      setCurrentResult(null);
      setSessionMode("online");
      setActiveScreen("session");
    } catch {
      setCurrentSession(createMockSession(selectedLecture, details));
      setCurrentResult(null);
      setSessionMode("offline");
      setActiveScreen("session");
    }
  }

  function handleBackToLecture() {
    setCurrentResult(null);
    setActiveScreen("details");
  }

  function handleOpenTask() {
    if (!currentSession) {
      return;
    }

    setActiveScreen("task");
  }

  async function handleSubmitTask(submission: TaskSubmission) {
    if (!currentSession) {
      return;
    }

    const result = evaluateSubmission(currentSession, submission);

    appendTeacherSessionResult(currentSession.lectureId, result.correctCount);

    setCurrentResult(result);
    setActiveScreen("result");

    if (currentTeacherSession && currentTeacherSession.lectureId === currentSession.lectureId) {
      setCurrentTeacherSession((current) => {
        if (!current) {
          return current;
        }

        const participantIndex = current.participants.findIndex(
          (participant) =>
            participant.status === "online" || participant.status === "in-progress"
        );

        if (participantIndex === -1) {
          return current;
        }

        const nextParticipants = current.participants.map((participant, index) =>
          index === participantIndex
            ? {
                ...participant,
                status: "completed" as const,
                score: result.correctCount
              }
            : participant
        );

        return {
          ...current,
          participants: nextParticipants
        };
      });
    }
  }

  function handleBackToSession() {
    setActiveScreen("session");
  }

  async function handleOpenManageTeacherSession(lecture: LectureItem) {
    const details = lectureDetailsById[lecture.id];

    const quizQuestions =
      details?.blocks
        .filter((block) => block.type === "quiz")
        .flatMap((block) =>
          block.type === "quiz" ? block.payload.questions : []
        ) ?? [];

    setSelectedLecture(lecture);
    setCurrentTeacherSession(createTeacherManagedSession(lecture, quizQuestions));
    setActiveScreen("teacherSession");
  }

  function handleBackToTeacherHome() {
    resetTeacherFlow();
    setActiveScreen("teacherHome");
  }

  function handleTeacherStartSession() {
    if (!currentTeacherSession) {
      return;
    }

    resetTeacherSessionStats(currentTeacherSession.lectureId);
    setCurrentTeacherSession(updateTeacherSessionStatus(currentTeacherSession, "active"));
  }

  function handleTeacherStopSession() {
    if (!currentTeacherSession) {
      return;
    }

    setCurrentTeacherSession(updateTeacherSessionStatus(currentTeacherSession, "stopped"));
  }

  async function handleTeacherMoveBlock(direction: "prev" | "next") {
    if (!currentTeacherSession) {
      return;
    }

    const details = lectureDetailsById[currentTeacherSession.lectureId];

    if (!details) {
      setCurrentTeacherSession(moveTeacherSessionBlock(currentTeacherSession, direction));
      return;
    }

    const nextIndex =
      direction === "next"
        ? Math.min(currentTeacherSession.currentBlockIndex + 1, details.blocks.length - 1)
        : Math.max(currentTeacherSession.currentBlockIndex - 1, 0);

    const nextBlock = details.blocks[nextIndex];
    if (!nextBlock) {
      return;
    }

    try {
      await sessionApi.setActiveBlock(currentTeacherSession.sessionId, nextBlock.id);
      setCurrentTeacherSession({
        ...currentTeacherSession,
        currentBlockIndex: nextIndex
      });
    } catch {
      setCurrentTeacherSession(moveTeacherSessionBlock(currentTeacherSession, direction));
    }
  }

  function handleCreatePhotoMaterial(input: {
    title: string;
    resourceUrl: string;
    note: string;
    fileName?: string;
    fileType?: string;
    fileData?: string;
    mimeType?: string;
  }) {
    const nextTitle = input.title.trim();
    const nextResourceUrl = input.resourceUrl.trim();
    const nextNote = input.note.trim();
    const nextFileName = input.fileName?.trim() ?? "";
    const nextFileType = input.fileType?.trim() ?? "";
    const nextFileData = input.fileData?.trim() ?? "";
    const nextMimeType = input.mimeType?.trim() ?? "";

    if (!nextTitle || (!nextResourceUrl && !nextFileData)) {
      return;
    }

    const nextMaterial: PhotoMaterialItem = {
      id: `photo-material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: nextTitle,
      resourceUrl: nextResourceUrl,
      note: nextNote,
      authorName: user.fullName || "Visual Math Team",
      createdAt: new Date().toISOString(),
      teacherLogin: user.login
    };

    if (nextFileName && nextFileType && nextFileData) {
      nextMaterial.fileName = nextFileName;
      nextMaterial.fileType = nextFileType;
      nextMaterial.fileData = nextFileData;
      nextMaterial.mimeType = nextMimeType || "application/octet-stream";
    }

    setPhotoMaterials((current: PhotoMaterialItem[]) => [nextMaterial, ...current]);
  }

  function handleDeletePhotoMaterial(materialId: string) {
    setPhotoMaterials((current: PhotoMaterialItem[]) =>
      current.filter((material: PhotoMaterialItem) => material.id !== materialId)
    );
  }

  function handleCreateMeeting(input: MeetingDraftInput) {
    const nextMeeting: MeetingItem = {
      id: `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title.trim(),
      platform: input.platform.trim(),
      url: input.url.trim(),
      scheduledAt: input.scheduledAt,
      durationMin: input.durationMin,
      description: input.description.trim(),
      createdBy: fixText(user.fullName || user.login || "Visual Math Team"),
      createdAt: new Date().toISOString(),
      teacherLogin: user.login
    };

    setMeetings((current: MeetingItem[]) =>
      [nextMeeting, ...current].sort(
        (left, right) =>
          new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
      )
    );
  }

  function handleDeleteMeeting(meetingId: string) {
    setMeetings((current: MeetingItem[]) =>
      current.filter((meeting: MeetingItem) => meeting.id !== meetingId)
    );
  }

  function handleCreateHomework(input: HomeworkDraftInput) {
    const nextHomework: HomeworkItem = {
      id: `homework-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title.trim(),
      description: input.description.trim(),
      dueAt: input.dueAt,
      allowedFormats: input.allowedFormats.map((item) => item.trim().toLowerCase()),
      maxScore: input.maxScore,
      createdBy: fixText(user.fullName || user.login || "Visual Math Team"),
      createdAt: new Date().toISOString(),
      teacherLogin: user.login
    };

    setHomeworks((current: HomeworkItem[]) =>
      [nextHomework, ...current].sort(
        (left, right) =>
          new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
      )
    );
  }

  function handleDeleteHomework(homeworkId: string) {
    setHomeworks((current: HomeworkItem[]) =>
      current.filter((homework: HomeworkItem) => homework.id !== homeworkId)
    );

    setHomeworkSubmissions((current: HomeworkSubmissionItem[]) =>
      current.filter((submission: HomeworkSubmissionItem) => submission.homeworkId !== homeworkId)
    );
  }

  function handleCreateHomeworkSubmission(input: HomeworkSubmissionDraftInput) {
    const relatedHomework = homeworks.find((homework) => homework.id === input.homeworkId) ?? null;

    const nextSubmission: HomeworkSubmissionItem = {
      id: `submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      homeworkId: input.homeworkId,
      studentLogin: input.studentLogin,
      studentName: fixText(input.studentName),
      fileName: input.fileName,
      fileType: input.fileType,
      fileData: input.fileData,
      submittedAt: new Date().toISOString(),
      teacherComment: "",
      score: null,
      teacherLogin: relatedHomework?.teacherLogin ?? selectedTeacherLogin ?? undefined
    };

    setHomeworkSubmissions((current: HomeworkSubmissionItem[]) => [
      nextSubmission,
      ...current.filter(
        (submission: HomeworkSubmissionItem) =>
          !(submission.homeworkId === input.homeworkId && submission.studentLogin === input.studentLogin)
      )
    ]);
  }

  function handleDeleteHomeworkSubmission(submissionId: string) {
    setHomeworkSubmissions((current: HomeworkSubmissionItem[]) =>
      current.filter((submission: HomeworkSubmissionItem) => submission.id !== submissionId)
    );
  }

  function handleGradeHomeworkSubmission(
    submissionId: string,
    score: number | null,
    comment: string
  ) {
    setHomeworkSubmissions((current: HomeworkSubmissionItem[]) =>
      current.map((submission: HomeworkSubmissionItem) =>
        submission.id === submissionId
          ? {
              ...submission,
              score,
              teacherComment: comment
            }
          : submission
      )
    );
  }

  function handleSaveTestingResult(result: TestingRunResult) {
    setTestingResults((current) => [result, ...current].slice(0, 20));
  }

  function handleStartTestingSession(input: {
    title: string;
    durationMin: number;
    questions: ActiveTestingQuestion[];
  }) {
    const nextSession: ActiveTestingSession = {
      id: `active-testing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      teacherLogin: user.login,
      title: input.title.trim(),
      durationMin: input.durationMin,
      startedAt: new Date().toISOString(),
      questions: input.questions
    };

    setActiveTestingSession(nextSession);
  }

  function handleFinishTestingSession() {
    if (!activeTestingSession || activeTestingSession.teacherLogin !== user.login) {
      return;
    }

    const relatedSubmissions = testingSubmissions.filter(
      (submission) => submission.sessionId === activeTestingSession.id
    );

    const totalQuestions = activeTestingSession.questions.length;
    const avgCorrect =
      relatedSubmissions.length > 0
        ? relatedSubmissions.reduce((sum, item) => sum + item.correctCount, 0) / relatedSubmissions.length
        : 0;
    const avgWrong =
      relatedSubmissions.length > 0
        ? relatedSubmissions.reduce((sum, item) => sum + item.wrongCount, 0) / relatedSubmissions.length
        : 0;
    const avgSkipped =
      relatedSubmissions.length > 0
        ? relatedSubmissions.reduce((sum, item) => sum + item.skippedCount, 0) / relatedSubmissions.length
        : 0;
    const avgPercent =
      relatedSubmissions.length > 0
        ? relatedSubmissions.reduce((sum, item) => sum + item.percent, 0) / relatedSubmissions.length
        : 0;

    handleSaveTestingResult({
      id: `testing-summary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: activeTestingSession.id,
      title: `${activeTestingSession.title} — группа`,
      createdAt: new Date().toISOString(),
      durationMin: activeTestingSession.durationMin,
      totalQuestions,
      correctCount: Math.round(avgCorrect),
      wrongCount: Math.round(avgWrong),
      skippedCount: Math.round(avgSkipped),
      percent: Math.round(avgPercent)
    });

    setActiveTestingSession(null);
  }

  function handleSubmitTestingAnswers(answers: Record<string, TestingAnswerKey>) {
    if (isTeacher || !visibleActiveTestingSession) {
      return;
    }

    const totalQuestions = visibleActiveTestingSession.questions.length;

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    for (const question of visibleActiveTestingSession.questions) {
      const answer = answers[question.id];

      if (!answer) {
        skippedCount += 1;
        continue;
      }

      if (answer === question.correctAnswerKey) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }

    const percent =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const nextSubmission: TestingSubmission = {
      id: `testing-submission-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: visibleActiveTestingSession.id,
      teacherLogin: visibleActiveTestingSession.teacherLogin,
      studentLogin: user.login,
      studentName: fixText(user.fullName || user.login),
      answers,
      submittedAt: new Date().toISOString(),
      correctCount,
      wrongCount,
      skippedCount,
      totalQuestions,
      percent
    };

    setTestingSubmissions((current) => [
      nextSubmission,
      ...current.filter(
        (submission) =>
          !(submission.sessionId === visibleActiveTestingSession.id && submission.studentLogin === user.login)
      )
    ]);
  }

  function handleMenuNavigate(
    screen: "catalog" | "solver" | "videoLessons" | "photoMaterials" | "meetings" | "homework" | "grades" | "testing" | "teacherBranchSelect" | "latex" | "profile"
  ) {
    setIsMenuOpen(false);

    const requiresTeacherConnection =
      screen === "catalog" ||
      screen === "videoLessons" ||
      screen === "photoMaterials" ||
      screen === "meetings" ||
      screen === "homework" ||
      screen === "grades" ||
      screen === "testing";

    if (!isTeacher && requiresTeacherConnection && !selectedTeacherLogin) {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("teacherBranchSelect");
      return;
    }

    if (screen === "profile") {
      resetTeacherFlow();
      setActiveScreen("profile");
      return;
    }

    if (screen === "solver") {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("solver");
      return;
    }

    if (screen === "videoLessons") {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("videoLessons");
      return;
    }

    if (screen === "photoMaterials") {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("photoMaterials");
      return;
    }

    if (screen === "meetings") {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("meetings");
      return;
    }

    if (screen === "homework") {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("homework");
      return;
    }

    if (screen === "grades") {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("grades");
      return;
    }

    if (screen === "testing") {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("testing");
      return;
    }

    if (screen === "teacherBranchSelect") {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen(isTeacher ? "teacherHome" : "teacherBranchSelect");
      return;
    }

    if (screen === "latex") {
      resetStudentFlow();
      resetTeacherFlow();
      setActiveScreen("latex");
      return;
    }

    resetTeacherFlow();

    if (isTeacher) {
      setActiveScreen("teacherHome");
      return;
    }

    handleBackToCatalog();
  }

  function handleBottomTabChange(screen: "catalog" | "teacher" | "profile") {
    if (screen === "profile") {
      resetTeacherFlow();
      setActiveScreen("profile");
      return;
    }

    if (screen === "teacher") {
      resetStudentFlow();
      resetTeacherFlow();
      if (isTeacher) {
        setActiveScreen("teacherHome");
        return;
      }

      handleBackToCatalog();
      return;
    }

    resetTeacherFlow();

    if (isTeacher) {
      setActiveScreen("teacherHome");
      return;
    }

    handleBackToCatalog();
  }

  if (isHydrating) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        theme={theme}
        onLogin={handleBackendLogin}
        onGoogleLogin={handleBackendGoogleLogin}
        onVkLogin={handleVkLogin}
      />
    );
  }

  const lastOpenedLecture =
    visibleLectures.find((lecture) => lecture.id === lastOpenedLectureId) ?? null;

  const activeBottomTab: "catalog" | "teacher" | "profile" = isTeacher
    ? activeScreen === "profile"
      ? "profile"
      : "teacher"
    : activeScreen === "profile"
      ? "profile"
      : "catalog";

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: topBarPaddingX,
          paddingTop: isPhoneLayout ? 18 : topBarPaddingTop,
          paddingBottom: isPhoneLayout ? 14 : theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Pressable
            onPress={() => setIsMenuOpen((current) => !current)}
            style={{
              width: isPhoneLayout ? 38 : 42,
              height: isPhoneLayout ? 38 : 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primarySoft,
              marginRight: theme.spacing.sm
            }}
          >
            <Text
              style={{
                fontSize: 22,
                lineHeight: 22,
                fontWeight: "700",
                color: theme.colors.primary
              }}
            >
              ≡
            </Text>
          </Pressable>

          <View style={{ flexShrink: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: isPhoneLayout ? 24 : headerTitleSize,
                fontWeight: "700",
                color: theme.colors.text
              }}
            >
              VisualMath
            </Text>
            {!isPhoneLayout ? (
              <Text
                numberOfLines={1}
                style={{
                  fontSize: theme.typography.caption,
                  color: theme.colors.textSecondary,
                  marginTop: 2
                }}
              >
                Учебный кабинет
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {!isPhoneLayout ? (
            <View
              style={{
                minHeight: 34,
                maxWidth: 180,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.surfaceMuted,
                borderWidth: 1,
                borderColor: theme.colors.border
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: theme.typography.caption,
                  fontWeight: "700",
                  color: theme.colors.text
                }}
              >
                {displayRoleBadgeLabel}
              </Text>
            </View>
          ) : null}

          <View style={{ width: isPhoneLayout ? 8 : 12 }} />
        </View>
      </View>

      {isMenuOpen ? (
        <>
          <Pressable
            onPress={() => setIsMenuOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "rgba(15, 23, 42, 0.12)",
              zIndex: 40
            }}
          />
        <View
          style={{
            position: "absolute",
            top: isPhoneLayout ? 74 : 76,
            left: menuPanelLeft,
            right: isPhoneLayout ? theme.spacing.sm : undefined,
            zIndex: 50,
            width: isPhoneLayout ? undefined : 248,
            maxWidth: isPhoneLayout ? undefined : 248,
            maxHeight: isPhoneLayout ? 560 : undefined,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            padding: theme.spacing.sm,
            shadowColor: "#000000",
            shadowOpacity: 0.14,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10
          }}
        >
          <View
            style={{
              paddingHorizontal: theme.spacing.sm,
              paddingTop: theme.spacing.xs,
              paddingBottom: theme.spacing.sm,
              marginBottom: theme.spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border
            }}
          >
            <Text
              style={{
                fontSize: theme.typography.sectionTitle,
                fontWeight: "700",
                color: theme.colors.text
              }}
            >
              Навигация
            </Text>

            <Text
              style={{
                fontSize: theme.typography.caption,
                color: theme.colors.textSecondary,
                marginTop: 2
              }}
            >
              {isTeacher ? "Инструменты преподавателя" : "Инструменты студента"}
            </Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={isPhoneLayout}
            bounces={false}
          >
          {[
            { key: "videoLessons", label: "Видеоуроки" },
            { key: "meetings", label: "Встречи" },
            { key: "homework", label: "Домашние" },
            { key: "grades", label: "Итоги" },
            { key: "catalog", label: "Каталог" },
            { key: "latex", label: "LaTeX" },
            { key: "profile", label: "Профиль" },
            { key: "solver", label: "Решатель" },
            { key: "testing", label: "Тестирование" },
            { key: "photoMaterials", label: "Фотоматериалы" }
          ]
            .sort(
              (left, right) =>
                getNavigationOrder(left.key as MenuScreenKey) -
                getNavigationOrder(right.key as MenuScreenKey)
            )
            .map((item) => {
            const isCatalogActive =
              item.key === "catalog" &&
              (activeScreen === "catalog" ||
                activeScreen === "details" ||
                activeScreen === "session" ||
                activeScreen === "task" ||
                activeScreen === "result" ||
                activeScreen === "teacherHome" ||
                activeScreen === "teacherSession");

            const isActive = isCatalogActive || activeScreen === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() =>
                  handleMenuNavigate(
                    item.key as "catalog" | "solver" | "videoLessons" | "photoMaterials" | "meetings" | "homework" | "grades" | "testing" | "teacherBranchSelect" | "latex" | "profile"
                  )
                }
                style={{
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isActive ? theme.colors.primarySoft : "transparent",
                  backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surface,
                  marginBottom: theme.spacing.xs
                }}
              >
                <Text
                  style={{
                    fontSize: theme.typography.body,
                    fontWeight: isActive ? "800" : "700",
                    color: isActive ? theme.colors.primary : theme.colors.text
                  }}
                >
                  {getNavigationLabel(item.key as MenuScreenKey)}
                </Text>
              </Pressable>
            );
          })}
          </ScrollView>
        </View>
        </>
      ) : null}

      <View style={styles.content}>
        {!isTeacher && activeScreen === "teacherBranchSelect" ? (
          <TeacherBranchSelectScreen
            theme={theme}
            branches={teacherBranches}
            selectedTeacherLogin={selectedTeacherLogin}
            onJoinByCode={handleJoinTeacherBranch}
            onDisconnectCurrent={handleDisconnectTeacherBranch}
          />
        ) : null}

        {!isTeacher && activeScreen === "catalog" ? (
          <CatalogScreen
            theme={theme}
            lectures={visibleLectures}
            lastOpenedLecture={lastOpenedLecture}
            isLoading={catalogMode === "loading"}
            hasError={catalogMode === "error"}
            isOffline={catalogMode === "offline"}
            onRetry={() => void refreshCatalogFromApi()}
            onOpenLecture={(lecture) => void handleOpenLecture(lecture)}
          />
        ) : null}

        {!isTeacher && activeScreen === "details" && selectedLecture ? (
          <LectureDetailsScreen
            theme={theme}
            lecture={selectedLecture}
            lectureDetails={lectureDetailsById[selectedLecture.id] ?? null}
            onBack={handleBackToCatalog}
            onOpenSession={() => void handleOpenSession()}
          />
        ) : null}

        {!isTeacher && activeScreen === "session" && selectedLecture && currentSession ? (
          <SessionScreen
            theme={theme}
            lecture={selectedLecture}
            session={currentSession}
            isOffline={sessionMode === "offline"}
            hasError={sessionMode === "error"}
            onRetry={() => void handleOpenSession()}
            onBack={handleBackToLecture}
            onOpenTask={handleOpenTask}
          />
        ) : null}

        {!isTeacher && activeScreen === "task" && currentSession ? (
          <TaskScreen
            theme={theme}
            session={currentSession}
            onBack={handleBackToSession}
            onSubmit={(submission) => void handleSubmitTask(submission)}
          />
        ) : null}

        {!isTeacher && activeScreen === "result" && currentResult ? (
          <TaskResultScreen
            theme={theme}
            result={currentResult}
            onBackToSession={handleBackToSession}
            onFinish={handleBackToCatalog}
          />
        ) : null}

        {isTeacher && activeScreen === "teacherHome" ? (
          <TeacherHomeScreen
            theme={theme}
            user={user}
            teacherJoinCode={ownTeacherBranch?.joinCode ?? createTeacherJoinCode(user.login)}
            lectures={visibleLectures}
            lectureDetailsById={lectureDetailsById}
            onOpenManageSession={(lecture) => void handleOpenManageTeacherSession(lecture)}
            onCreateDraftLecture={handleCreateDraftLecture}
            onUpdateDraftLectureMeta={handleUpdateDraftLectureMeta}
            onAddDraftQuestion={handleAddDraftQuestion}
            onDeleteDraftQuestion={handleDeleteDraftQuestion}
            onDeleteLecture={handleDeleteLecture}
            onLogout={() => void handleBackendLogout()}
          />
        ) : null}

        {isTeacher && activeScreen === "teacherSession" && currentTeacherSession ? (
          <TeacherSessionControlScreen
            theme={theme}
            session={currentTeacherSession}
            onBack={handleBackToTeacherHome}
            onStart={handleTeacherStartSession}
            onStop={handleTeacherStopSession}
            onPrevBlock={() => void handleTeacherMoveBlock("prev")}
            onNextBlock={() => void handleTeacherMoveBlock("next")}
          />
        ) : null}

        {activeScreen === "solver" ? (
          <SolverScreen
            theme={theme}
            onBack={handleBackToCatalog}
          />
        ) : null}

        {activeScreen === "videoLessons" ? (
          <VideoLessonsScreen
            theme={theme}
            isTeacher={isTeacher}
            lessons={visibleVideoLessons}
            onCreateLesson={handleCreateVideoLesson}
            onDeleteLesson={handleDeleteVideoLesson}
          />
        ) : null}

        {activeScreen === "photoMaterials" ? (
          <PhotoMaterialsScreen
            theme={theme}
            isTeacher={isTeacher}
            materials={visiblePhotoMaterials}
            onCreateMaterial={handleCreatePhotoMaterial}
            onDeleteMaterial={handleDeletePhotoMaterial}
          />
        ) : null}

        {activeScreen === "meetings" ? (
          <MeetingsScreen
            theme={theme}
            isTeacher={isTeacher}
            meetings={visibleMeetings}
            onCreateMeeting={handleCreateMeeting}
            onDeleteMeeting={handleDeleteMeeting}
          />
        ) : null}

        {activeScreen === "homework" ? (
          <HomeworkScreen
            theme={theme}
            isTeacher={isTeacher}
            userLogin={user.login}
            userName={user.fullName || user.login}
            homeworks={visibleHomeworks}
            submissions={visibleHomeworkSubmissions}
            onCreateHomework={handleCreateHomework}
            onDeleteHomework={handleDeleteHomework}
            onCreateSubmission={handleCreateHomeworkSubmission}
            onDeleteSubmission={handleDeleteHomeworkSubmission}
            onGradeSubmission={handleGradeHomeworkSubmission}
          />
        ) : null}

        {activeScreen === "grades" ? (
          <GradesScreen
            theme={theme}
            isTeacher={isTeacher}
            userLogin={user.login}
            userName={user.fullName || user.login}
            homeworks={visibleHomeworks}
            submissions={visibleHomeworkSubmissions}
            testingResults={testingResults}
            testingSubmissions={
              isTeacher
                ? testingSubmissions.filter((item) => item.teacherLogin === user.login)
                : testingSubmissions.filter(
                    (item) =>
                      item.studentLogin === user.login &&
                      item.teacherLogin === selectedTeacherLogin
                  )
            }
            onGradeSubmission={handleGradeHomeworkSubmission}
          />
        ) : null}

        {activeScreen === "testing" ? (
          <TestingScreen
            theme={theme}
            isTeacher={isTeacher}
            userLogin={user.login}
            userName={user.fullName || user.login}
            activeSession={visibleActiveTestingSession}
            submissions={visibleTestingSubmissions}
            onStartSession={handleStartTestingSession}
            onFinishSession={handleFinishTestingSession}
            onSubmitStudentAnswers={handleSubmitTestingAnswers}
            onOpenGrades={() => setActiveScreen("grades")}
          />
        ) : null}

        {activeScreen === "latex" ? (
          <LatexWorkspaceScreen
            theme={theme}
            isTeacher={isTeacher}
            userName={user.fullName || user.login}
            document={latexDocument}
            onChangeDocument={setLatexDocument}
          />
        ) : null}

        {activeScreen === "profile" ? (
          <ProfileScreen
            theme={theme}
            user={user}
            themeMode={themeMode}
            notificationsEnabled={notificationsEnabled}
            catalogMode={catalogMode}
            sessionMode={sessionMode}
            selectedTeacherBranch={isTeacher ? null : selectedTeacherBranch}
            onToggleTheme={() =>
              setThemeMode((currentMode) =>
                currentMode === "light" ? "dark" : "light"
              )
            }
            onToggleNotifications={() =>
              setNotificationsEnabled((currentValue) => !currentValue)
            }
            onCycleCatalogMode={() =>
              setCatalogMode((currentMode) => nextMode(currentMode))
            }
            onCycleSessionMode={() =>
              setSessionMode((currentMode) => nextMode(currentMode))
            }
            onOpenTeacherConnection={
              isTeacher ? undefined : handleOpenTeacherBranchSelector
            }
            onDisconnectTeacher={
              isTeacher ? undefined : handleDisconnectTeacherBranch
            }
            onLogout={() => {
              void handleBackendLogout();
            }}
          />
        ) : null}
      </View>

      {isPhoneLayout ? (
        <BottomTabs
          theme={theme}
          isTeacher={isTeacher}
          activeScreen={activeBottomTab}
          onChange={handleBottomTabChange}
        />
      ) : null}
    </View>
  );
}

type BottomTabsProps = {
  theme: AppTheme;
  isTeacher: boolean;
  activeScreen: "catalog" | "teacher" | "profile";
  onChange: (screen: "catalog" | "teacher" | "profile") => void;
};

function BottomTabs({
  theme,
  isTeacher,
  activeScreen,
  onChange
}: BottomTabsProps) {
  const bottomInset = Platform.OS === "web" ? 20 : 12;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: bottomInset,
          shadowColor: "#0F172A",
          shadowOpacity: 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -6 },
          elevation: 10
        }
      ]}
    >
      {isTeacher ? (
        <TabButton
          theme={theme}
          label="Главная"
          isActive={activeScreen === "teacher"}
          onPress={() => onChange("teacher")}
        />
      ) : (
        <TabButton
          theme={theme}
          label="Курсы"
          isActive={activeScreen === "catalog"}
          onPress={() => onChange("catalog")}
        />
      )}

      <TabButton
        theme={theme}
        label="Профиль"
        isActive={activeScreen === "profile"}
        onPress={() => onChange("profile")}
      />
    </View>
  );
}

type TabButtonProps = {
  theme: AppTheme;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

function TabButton({ theme, label, isActive, onPress }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabButton,
        {
          backgroundColor: isActive ? theme.colors.surfaceMuted : theme.colors.surface,
          borderColor: isActive ? theme.colors.primarySoft : "transparent"
        }
      ]}
    >
      <Text
        style={[
          styles.tabLabel,
          {
            color: isActive ? theme.colors.primary : theme.colors.textSecondary
          }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0
  },
  content: {
    flex: 1,
    minWidth: 0
  },
  centeredState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 4
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "700"
  }
});

