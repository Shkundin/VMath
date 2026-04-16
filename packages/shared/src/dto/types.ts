export type Role = "student" | "teacher" | "admin";

export type LectureLevel = "basic" | "intermediate" | "advanced";
export type LectureStatus = "draft" | "published" | "archived";
export type ModuleType = "text" | "visual_module" | "questionnaire" | "checking_block";
export type QuizQuestionType = "single" | "multi" | "short" | "numeric";
export type SessionStatus = "draft" | "active" | "stopped";
export type SessionParticipantConnectionStatus =
  | "connected"
  | "reconnecting"
  | "disconnected";
export type SessionParticipantState =
  | "connected"
  | "disconnected"
  | "idle"
  | "working"
  | "submitted";

export type BlockType =
  | "text"
  | "formula"
  | "image"
  | "video"
  | "visual"
  | "visual_module"
  | "quiz"
  | "checking_block";

export interface AssetMetadata {
  bucket?: string;
  path?: string;
  url?: string;
  mimeType?: string;
  fileName?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  checksum?: string;
}

export interface UserProfile {
  id: string;
  login: string;
  fullName: string;
  role: Role;
  group?: string;
  groupName?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  lastSeenAt?: string | null;
  activeSessionCount?: number;
}

export interface UserAuthEventView {
  id: string;
  userId?: string | null;
  login: string;
  fullName?: string | null;
  role?: Role | null;
  eventType: "login" | "refresh" | "logout" | "login_failed";
  status: "success" | "failed";
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

export interface SubjectSummary {
  id: string;
  code: string;
  title: string;
  description?: string;
}

export interface LectureSummary {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  updatedAt?: string;
  authorId?: string;
  authorName?: string;
  subjectId?: string;
  subjectCode?: string;
  subjectName?: string;
  semester?: number;
  level?: LectureLevel;
  status?: LectureStatus;
  availableForRoles?: Role[];
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  order?: number;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  text: string;
  options?: QuizOption[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctAnswerText?: string;
  correctAnswerHint?: string;
  allowFormulaAnswer?: boolean;
  formulaPlaceholder?: string;
  explanation?: string;
  points?: number;
  order?: number;
}

export interface LectureBlockBase {
  id: string;
  type: BlockType;
  title?: string;
  moduleId?: string;
  order?: number;
}

export interface TextBlock extends LectureBlockBase {
  type: "text";
  payload: {
    markdown: string;
    schemaVersion?: number;
  };
}

export interface FormulaBlock extends LectureBlockBase {
  type: "formula";
  payload: {
    latex: string;
    markdown?: string;
    schemaVersion?: number;
  };
}

export interface ImageBlock extends LectureBlockBase {
  type: "image";
  payload: {
    alt?: string;
    caption?: string;
    url?: string;
    asset?: AssetMetadata | null;
  };
}

export interface VideoBlock extends LectureBlockBase {
  type: "video";
  payload: {
    caption?: string;
    provider?: string;
    url?: string;
    durationSec?: number;
    asset?: AssetMetadata | null;
  };
}

export interface VisualBlock extends LectureBlockBase {
  type: "visual" | "visual_module";
  payload: {
    scene?: unknown;
    caption?: string;
    schemaVersion?: number;
    state?: Record<string, unknown> | null;
    assetMetadata?: AssetMetadata[];
  };
}

export interface QuizBlock extends LectureBlockBase {
  type: "quiz";
  payload: {
    questions: QuizQuestion[];
    timeLimitSec?: number;
  };
}

export interface CheckingBlock extends LectureBlockBase {
  type: "checking_block";
  payload: {
    checkingBlockId?: string;
    questions: QuizQuestion[];
    timeLimitSec?: number;
    allowRefuseToAnswer?: boolean;
    scoring?: {
      correct: number;
      incorrectPenaltyDivisor: number;
      skip: number;
    };
  };
}

export type LectureBlock =
  | TextBlock
  | FormulaBlock
  | ImageBlock
  | VideoBlock
  | VisualBlock
  | QuizBlock
  | CheckingBlock;

export interface ModuleSummary {
  id: string;
  title: string;
  description?: string;
  moduleType: ModuleType;
  subjectId?: string;
  subjectCode?: string;
  authorId?: string;
  authorName?: string;
  tags?: string[];
  updatedAt?: string;
}

export interface ModuleDetails extends ModuleSummary {
  content: Record<string, unknown>;
  illustration?: AssetMetadata | null;
  assetMetadata?: AssetMetadata[];
}

export interface LectureDetails extends LectureSummary {
  blocks: LectureBlock[];
}

export interface ParticipantStatus {
  userId: string;
  fullName: string;
  role: Role;
  status: SessionParticipantState;
  connectionStatus?: SessionParticipantConnectionStatus;
  lastSeenAt?: string;
  joinedAt?: string;
  leftAt?: string | null;
  score?: number | null;
}

export interface SessionVisualState {
  schemaVersion: number;
  state: Record<string, unknown>;
  updatedAt: string;
}

export interface SessionState {
  sessionId: string;
  sessionCode?: string;
  lectureId: string;
  status?: SessionStatus;
  activeBlockId: string;
  participants: ParticipantStatus[];
  updatedAt: string;
  startedAt?: string | null;
  stoppedAt?: string | null;
  stateVersion?: number;
  visualState?: SessionVisualState | null;
}

export interface SubmissionAnswerView {
  questionId: string;
  questionText: string;
  selectedOptionIds?: string[];
  answerText?: string | null;
  formulaAnswer?: string | null;
  isRefused?: boolean;
  isCorrect?: boolean;
  scoreDelta?: number;
}

export interface ResultSummaryView {
  submissionId: string;
  sessionId: string;
  userId: string;
  fullName: string;
  lectureBlockId: string;
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  publishedAt?: string | null;
  answers: SubmissionAnswerView[];
}

export interface SessionStatsView {
  sessionId: string;
  lectureId: string;
  participantCount: number;
  onlineCount: number;
  inProgressCount: number;
  completedCount: number;
  averageScore: number;
  distributions: Array<{
    questionId: string;
    questionText: string;
    optionCounts: Array<{ optionId: string; count: number }>;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
  }>;
}
