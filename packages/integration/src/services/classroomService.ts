import { err, type ClassroomTestingAnswerKey, type ClassroomTestingQuestionView, type ClassroomTestingSessionView, type TeacherBranchSummary, type ClassroomMeetingView, type ClassroomHomeworkView, type ClassroomHomeworkSubmissionView, type ClassroomTestingSubmissionView } from "@vm/shared";
import { HttpClient } from "../http/httpClient";

export class ClassroomService {
  constructor(private readonly http: HttpClient) {}

  async listTeacherBranches(): Promise<TeacherBranchSummary[]> {
    const response = await this.http.getJson<TeacherBranchSummary[]>("/api/v1/classroom/branches");
    return Array.isArray(response) ? response : [];
  }

  async listMeetings(teacherLogin: string): Promise<ClassroomMeetingView[]> {
    this.assertTeacherLogin(teacherLogin);
    const response = await this.http.getJson<ClassroomMeetingView[]>(
      `/api/v1/classroom/teachers/${encodeURIComponent(teacherLogin)}/meetings`
    );
    return Array.isArray(response) ? response : [];
  }

  async createMeeting(input: {
    title: string;
    platform: string;
    url: string;
    scheduledAt: string;
    durationMin: number;
    description?: string;
  }): Promise<ClassroomMeetingView> {
    return this.http.postJson<ClassroomMeetingView>("/api/v1/classroom/meetings", input);
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    this.assertId("meetingId", meetingId);
    await this.http.deleteJson(`/api/v1/classroom/meetings/${encodeURIComponent(meetingId)}`);
  }

  async listHomeworks(teacherLogin: string): Promise<ClassroomHomeworkView[]> {
    this.assertTeacherLogin(teacherLogin);
    const response = await this.http.getJson<ClassroomHomeworkView[]>(
      `/api/v1/classroom/teachers/${encodeURIComponent(teacherLogin)}/homeworks`
    );
    return Array.isArray(response) ? response : [];
  }

  async createHomework(input: {
    title: string;
    description: string;
    dueAt: string;
    allowedFormats: string[];
    maxScore: number;
  }): Promise<ClassroomHomeworkView> {
    return this.http.postJson<ClassroomHomeworkView>("/api/v1/classroom/homeworks", input);
  }

  async deleteHomework(homeworkId: string): Promise<void> {
    this.assertId("homeworkId", homeworkId);
    await this.http.deleteJson(`/api/v1/classroom/homeworks/${encodeURIComponent(homeworkId)}`);
  }

  async listHomeworkSubmissions(teacherLogin: string): Promise<ClassroomHomeworkSubmissionView[]> {
    this.assertTeacherLogin(teacherLogin);
    const response = await this.http.getJson<ClassroomHomeworkSubmissionView[]>(
      `/api/v1/classroom/teachers/${encodeURIComponent(teacherLogin)}/homework-submissions`
    );
    return Array.isArray(response) ? response : [];
  }

  async createHomeworkSubmission(
    homeworkId: string,
    input: { fileName: string; fileType: string; fileData: string }
  ): Promise<ClassroomHomeworkSubmissionView> {
    this.assertId("homeworkId", homeworkId);
    return this.http.postJson<ClassroomHomeworkSubmissionView>(
      `/api/v1/classroom/homeworks/${encodeURIComponent(homeworkId)}/submissions`,
      input
    );
  }

  async deleteHomeworkSubmission(submissionId: string): Promise<void> {
    this.assertId("submissionId", submissionId);
    await this.http.deleteJson(
      `/api/v1/classroom/homework-submissions/${encodeURIComponent(submissionId)}`
    );
  }

  async gradeHomeworkSubmission(
    submissionId: string,
    input: { score: number | null; comment: string }
  ): Promise<ClassroomHomeworkSubmissionView> {
    this.assertId("submissionId", submissionId);
    return this.http.postJson<ClassroomHomeworkSubmissionView>(
      `/api/v1/classroom/homework-submissions/${encodeURIComponent(submissionId)}/grade`,
      input
    );
  }

  async getActiveTestingSession(
    teacherLogin: string
  ): Promise<ClassroomTestingSessionView | null> {
    this.assertTeacherLogin(teacherLogin);
    const response = await this.http.getJson<ClassroomTestingSessionView | null>(
      `/api/v1/classroom/teachers/${encodeURIComponent(teacherLogin)}/testing/active`
    );
    return response ?? null;
  }

  async listTestingSubmissions(sessionId: string): Promise<ClassroomTestingSubmissionView[]> {
    this.assertId("sessionId", sessionId);
    const response = await this.http.getJson<ClassroomTestingSubmissionView[]>(
      `/api/v1/classroom/testing/sessions/${encodeURIComponent(sessionId)}/submissions`
    );
    return Array.isArray(response) ? response : [];
  }

  async startTestingSession(input: {
    title: string;
    durationMin: number;
    questions: ClassroomTestingQuestionView[];
  }): Promise<ClassroomTestingSessionView> {
    return this.http.postJson<ClassroomTestingSessionView>(
      "/api/v1/classroom/testing/sessions",
      input
    );
  }

  async finishTestingSession(sessionId: string): Promise<ClassroomTestingSessionView> {
    this.assertId("sessionId", sessionId);
    return this.http.postJson<ClassroomTestingSessionView>(
      `/api/v1/classroom/testing/sessions/${encodeURIComponent(sessionId)}/finish`,
      {}
    );
  }

  async submitTestingAnswers(
    sessionId: string,
    answers: Record<string, ClassroomTestingAnswerKey>
  ): Promise<ClassroomTestingSubmissionView> {
    this.assertId("sessionId", sessionId);
    return this.http.postJson<ClassroomTestingSubmissionView>(
      `/api/v1/classroom/testing/sessions/${encodeURIComponent(sessionId)}/submissions`,
      { answers }
    );
  }

  private assertTeacherLogin(teacherLogin: string) {
    if (!teacherLogin.trim()) {
      throw err("VALIDATION", "teacherLogin is required");
    }
  }

  private assertId(field: string, value: string) {
    if (!value.trim()) {
      throw err("VALIDATION", `${field} is required`);
    }
  }
}
