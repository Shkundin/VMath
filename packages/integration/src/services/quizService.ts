import { err } from "@vm/shared";
import { HttpClient } from "../http/httpClient";

export type QuizAnswerPayload =
  | { type: "single"; optionId: string }
  | { type: "multi"; optionIds: string[] }
  | { type: "short"; text: string };

export interface SubmitQuizRequest {
  sessionId: string;
  blockId: string;
  answers: { questionId: string; payload: QuizAnswerPayload }[];
}

export interface SubmitQuizResponse {
  ok: boolean;
  questionsCount: number;
  finalized: boolean;
  attemptId: string;
  score: number;
  maxScore: number;
  checkedAt: string;
}

export class QuizService {
  constructor(private readonly http: HttpClient) {}

  async submit(request: SubmitQuizRequest): Promise<SubmitQuizResponse> {
    if (!request.sessionId || !request.blockId) {
      throw err("VALIDATION", "sessionId and blockId are required");
    }

    if (!request.answers?.length) {
      throw err("VALIDATION", "At least one answer is required");
    }

    const response = await this.http.postJson<{
      ok: boolean;
      questionsCount: number;
      finalized: boolean;
    }>(
      `/api/v1/sessions/${request.sessionId}/blocks/${request.blockId}/answers`,
      {
        answers: request.answers.map((answer) => ({
          questionId: answer.questionId,
          selectedOptionIds:
            answer.payload.type === "single"
              ? [answer.payload.optionId]
              : answer.payload.type === "multi"
                ? answer.payload.optionIds
                : [],
          answerText: answer.payload.type === "short" ? answer.payload.text : undefined
        })),
        finalize: true
      }
    );

    return {
      ...response,
      attemptId: `${request.sessionId}:${request.blockId}`,
      score: 0,
      maxScore: response.questionsCount,
      checkedAt: new Date().toISOString()
    };
  }
}
