import { err, type LectureDetails, type LectureSummary } from "@vm/shared";
import { HttpClient } from "../http/httpClient";

export class CatalogService {
  constructor(private readonly http: HttpClient) {}

  async listLectures(query?: {
    q?: string;
    subjectId?: string;
    subjectCode?: string;
    semester?: number;
    level?: string;
    authorId?: string;
    tag?: string;
  }): Promise<LectureSummary[]> {
    const searchParams = new URLSearchParams();

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.set(key, String(value));
        }
      }
    }

    const suffix = searchParams.toString();
    const response = await this.http.getJson<LectureSummary[]>(
      `/api/v1/lectures${suffix ? `?${suffix}` : ""}`
    );
    return Array.isArray(response) ? response : [];
  }

  async getLecture(id: string): Promise<LectureDetails> {
    if (!id) {
      throw err("VALIDATION", "Lecture id is required");
    }

    return this.http.getJson<LectureDetails>(`/api/v1/lectures/${id}`);
  }

  async getLectureBlocks(id: string) {
    if (!id) {
      throw err("VALIDATION", "Lecture id is required");
    }

    return this.http.getJson<LectureDetails["blocks"]>(`/api/v1/lectures/${id}/blocks`);
  }
}
