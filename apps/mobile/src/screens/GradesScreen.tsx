import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { AppInput } from "../components/ui/AppInput";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusPill } from "../components/ui/StatusPill";
import type { HomeworkItem, HomeworkSubmissionItem } from "../storage/homeworkStorage";
import type { LectureTestResult, TestingSubmission } from "../storage/testingStorage";
import type { AppTheme } from "../theme";
import { fixText } from "../utils/fixText";
import type { TestingRunResult } from "./TestingScreen";

type GradesScreenProps = {
  theme: AppTheme;
  isTeacher: boolean;
  userLogin: string;
  userName: string;
  homeworks: HomeworkItem[];
  submissions: HomeworkSubmissionItem[];
  testingResults: TestingRunResult[];
  testingSubmissions: TestingSubmission[];
  lectureTestResults: LectureTestResult[];
  onGradeSubmission: (submissionId: string, score: number | null, comment: string) => void;
  onClearHomeworkResults: () => void;
  onClearTestingResults: (sessionIds: string[]) => void;
  onClearLectureTestResults: (resultIds: string[]) => void;
};

type StudentGradeRow = {
  homework: HomeworkItem;
  submission: HomeworkSubmissionItem | null;
};

type TeacherGradeRow = {
  homework: HomeworkItem;
  relatedSubmissions: HomeworkSubmissionItem[];
  checkedSubmissions: number;
  avgScore: number | null;
};

type StatusTone = "success" | "warning" | "info" | "neutral";

function buildTestingRows(
  testingResults: TestingRunResult[],
  testingSubmissions: TestingSubmission[]
): TestingRunResult[] {
  const rows = new Map<string, TestingRunResult>();

  for (const result of testingResults) {
    rows.set(result.sessionId ?? result.id, result);
  }

  const groupedSubmissions = new Map<string, TestingSubmission[]>();
  for (const submission of testingSubmissions) {
    const current = groupedSubmissions.get(submission.sessionId) ?? [];
    current.push(submission);
    groupedSubmissions.set(submission.sessionId, current);
  }

  for (const [sessionId, submissionsBySession] of groupedSubmissions) {
    if (rows.has(sessionId) || submissionsBySession.length === 0) {
      continue;
    }

    const total = submissionsBySession.length;
    const latestSubmission = submissionsBySession.reduce((latest, submission) =>
      new Date(submission.submittedAt).getTime() > new Date(latest.submittedAt).getTime()
        ? submission
        : latest
    );

    rows.set(sessionId, {
      id: `testing-summary-${sessionId}`,
      sessionId,
      title: `Тест ${sessionId.slice(0, 8)}`,
      createdAt: latestSubmission.submittedAt,
      durationMin: 0,
      totalQuestions: latestSubmission.totalQuestions,
      correctCount: Math.round(
        submissionsBySession.reduce((sum, submission) => sum + submission.correctCount, 0) / total
      ),
      wrongCount: Math.round(
        submissionsBySession.reduce((sum, submission) => sum + submission.wrongCount, 0) / total
      ),
      skippedCount: Math.round(
        submissionsBySession.reduce((sum, submission) => sum + submission.skippedCount, 0) / total
      ),
      percent: Math.round(
        submissionsBySession.reduce((sum, submission) => sum + submission.percent, 0) / total
      )
    });
  }

  return Array.from(rows.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function GradesScreen({
  theme,
  isTeacher,
  userLogin,
  userName,
  homeworks,
  submissions,
  testingResults,
  testingSubmissions,
  lectureTestResults,
  onGradeSubmission,
  onClearHomeworkResults,
  onClearTestingResults,
  onClearLectureTestResults
}: GradesScreenProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 560;
  const styles = createStyles(theme, width);

  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [errorText, setErrorText] = useState("");
  const [activeResultsTab, setActiveResultsTab] = useState<"homework" | "testing" | "lectureTesting">("homework");

  const studentRows = useMemo(() => {
    return [...homeworks]
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .map((homework) => ({
        homework,
        submission:
          submissions.find(
            (submission) =>
              submission.homeworkId === homework.id &&
              submission.studentLogin === userLogin
          ) ?? null
      }));
  }, [homeworks, submissions, userLogin]);

  const teacherRows = useMemo(() => {
    return [...homeworks]
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .map((homework) => {
        const relatedSubmissions = submissions.filter((submission) => submission.homeworkId === homework.id);
        const checked = relatedSubmissions.filter((submission) => submission.score !== null);
        const avgScore =
          checked.length > 0
            ? checked.reduce((sum, submission) => sum + Number(submission.score ?? 0), 0) / checked.length
            : null;

        return {
          homework,
          relatedSubmissions,
          checkedSubmissions: checked.length,
          avgScore
        };
      });
  }, [homeworks, submissions]);

  const testingRows = useMemo(
    () => buildTestingRows(testingResults, testingSubmissions),
    [testingResults, testingSubmissions]
  );

  const myCheckedCount = studentRows.filter((row) => row.submission?.score !== null).length;

  const myAverage = useMemo(() => {
    const checked = studentRows.filter((row) => row.submission?.score !== null);

    if (checked.length === 0) {
      return null;
    }

    const total = checked.reduce((sum, row) => sum + Number(row.submission?.score ?? 0), 0);
    return total / checked.length;
  }, [studentRows]);

  const testingAverage = useMemo(() => {
    if (testingRows.length === 0) {
      return null;
    }

    const total = testingRows.reduce((sum, item) => sum + item.percent, 0);
    return total / testingRows.length;
  }, [testingRows]);

  const canClearHomeworkResults = submissions.length > 0;
  const canClearTestingResults = isTeacher ? testingRows.length > 0 : testingSubmissions.length > 0;
  const canClearLectureTestResults = lectureTestResults.length > 0;
  const lectureTestingAverage = useMemo(() => {
    if (lectureTestResults.length === 0) {
      return null;
    }

    return lectureTestResults.reduce((sum, item) => sum + item.percent, 0) / lectureTestResults.length;
  }, [lectureTestResults]);

  function handleClearTestingResults() {
    onClearTestingResults(
      testingRows
        .map((item) => item.sessionId)
        .filter((sessionId): sessionId is string => Boolean(sessionId))
    );
  }

  function handleClearLectureTestResults() {
    onClearLectureTestResults(lectureTestResults.map((item) => item.id));
  }

  function handleSaveGrade(submission: HomeworkSubmissionItem, homework: HomeworkItem) {
    const rawScore = (scoreDrafts[submission.id] ?? (submission.score !== null ? String(submission.score) : "")).trim();
    const rawComment = (commentDrafts[submission.id] ?? submission.teacherComment ?? "").trim();

    if (!rawScore) {
      onGradeSubmission(submission.id, null, rawComment);
      setErrorText("");
      return;
    }

    const parsedScore = Number(rawScore.replace(",", "."));

    if (!Number.isFinite(parsedScore)) {
      setErrorText("Введите корректную оценку.");
      return;
    }

    const normalizedScore = Math.max(0, Math.min(homework.maxScore, parsedScore));
    onGradeSubmission(submission.id, normalizedScore, rawComment);
    setErrorText("");
  }

  const lectureTestsSection = (
    <SectionCard
      theme={theme}
      title={isTeacher ? "Тесты с лекций" : "Мои тесты с лекций"}
      subtitle="Баллы за практические блоки, которые студент проходит прямо внутри лекции."
    >
      {isTeacher ? (
        <View style={styles.sectionActions}>
          <AppButton
            label="Очистить итоги"
            onPress={handleClearLectureTestResults}
            theme={theme}
            variant="secondary"
            fullWidth={isPhone}
            disabled={!canClearLectureTestResults}
            style={styles.inlineButton}
          />
        </View>
      ) : null}

      {lectureTestResults.length === 0 ? (
        <Text style={styles.emptyText}>Пока нет результатов практики из лекций.</Text>
      ) : (
        <>
          <View style={styles.infoGrid}>
            <InfoTile theme={theme} label="Попыток" value={String(lectureTestResults.length)} />
            <InfoTile
              theme={theme}
              label="Средний процент"
              value={lectureTestingAverage !== null ? `${lectureTestingAverage.toFixed(1)}%` : "—"}
            />
          </View>

          {[...lectureTestResults]
            .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
            .map((result) => (
              <View key={result.id} style={styles.resultCard}>
                <View style={styles.resultTop}>
                  <View style={styles.resultTextWrap}>
                    <Text style={styles.resultTitle}>{fixText(result.lectureTitle)}</Text>
                    <Text style={styles.resultMeta}>
                      {fixText(`${result.blockTitle} • ${formatDateTime(result.submittedAt)}`)}
                    </Text>
                    {isTeacher ? (
                      <Text style={styles.resultMeta}>{fixText(`Студент: ${result.studentName}`)}</Text>
                    ) : null}
                  </View>

                  <StatusPill
                    theme={theme}
                    label={`${result.percent}%`}
                    tone={result.percent >= 70 ? "success" : result.percent >= 40 ? "warning" : "neutral"}
                  />
                </View>

                <View style={styles.infoGrid}>
                  <InfoTile theme={theme} label="Верно" value={`${result.correctCount}/${result.totalQuestions}`} />
                  <InfoTile theme={theme} label="Процент" value={`${result.percent}%`} />
                </View>
              </View>
            ))}
        </>
      )}
    </SectionCard>
  );

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Итоги"
        subtitle={
          isTeacher
            ? "Журнал домашних заданий и результаты тестирования в classroom-стиле."
            : "Все оценки, комментарии и статусы проверки домашних заданий."
        }
        rightSlot={
          <View style={styles.headerChip}>
            <Text style={styles.headerChipText}>
              {isTeacher ? `${teacherRows.length} заданий` : `${studentRows.length} записей`}
            </Text>
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.heroMain}>
          <Text style={styles.heroEyebrow}>Журнал результатов</Text>
          <Text style={styles.heroTitle}>
            {isTeacher ? "Панель преподавателя" : fixText(userName || userLogin)}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isTeacher
              ? "Проверяй домашние задания, отслеживай средние баллы и смотри рейтинг по тестированию."
              : "Здесь отображаются твои статусы сдачи, оценки и комментарии преподавателя."}
          </Text>
          {errorText ? <Text style={styles.errorText}>{fixText(errorText)}</Text> : null}
        </View>

        <View style={styles.heroStats}>
          {isTeacher ? (
            <>
              <MiniStatCard theme={theme} value={String(teacherRows.length)} label="Заданий" />
              <MiniStatCard theme={theme} value={String(submissions.length)} label="Сдач" />
              <MiniStatCard theme={theme} value={String(testingRows.length)} label="Тестов" />
            </>
          ) : (
            <>
              <MiniStatCard theme={theme} value={String(studentRows.length)} label="Заданий" />
              <MiniStatCard theme={theme} value={String(myCheckedCount)} label="Проверено" />
              <MiniStatCard
                theme={theme}
                value={myAverage !== null ? myAverage.toFixed(1) : "—"}
                label="Средний балл"
              />
            </>
          )}
        </View>
      </View>

      <View style={styles.tabsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeResultsTab === "homework" }}
          onPress={() => setActiveResultsTab("homework")}
          style={[
            styles.tabButton,
            activeResultsTab === "homework" ? styles.tabButtonActive : null
          ]}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeResultsTab === "homework" ? styles.tabButtonTextActive : null
            ]}
          >
            {fixText("Домашние задания")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeResultsTab === "testing" }}
          onPress={() => setActiveResultsTab("testing")}
          style={[
            styles.tabButton,
            activeResultsTab === "testing" ? styles.tabButtonActive : null
          ]}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeResultsTab === "testing" ? styles.tabButtonTextActive : null
            ]}
          >
            {fixText("Результаты тестов")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activeResultsTab === "lectureTesting" }}
          onPress={() => setActiveResultsTab("lectureTesting")}
          style={[
            styles.tabButton,
            activeResultsTab === "lectureTesting" ? styles.tabButtonActive : null
          ]}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeResultsTab === "lectureTesting" ? styles.tabButtonTextActive : null
            ]}
          >
            {fixText("Тесты с лекций")}
          </Text>
        </Pressable>
      </View>

      {isTeacher ? (
        <>
          {activeResultsTab === "homework" ? (
          <SectionCard
            theme={theme}
            title="Домашние задания"
            subtitle="Здесь можно быстро проверить сдачи и выставить оценки."
          >
            <View style={styles.sectionActions}>
              <AppButton
                label="Очистить итоги"
                onPress={onClearHomeworkResults}
                theme={theme}
                variant="secondary"
                fullWidth={isPhone}
                disabled={!canClearHomeworkResults}
                style={styles.inlineButton}
              />
            </View>

            {teacherRows.length === 0 ? (
              <Text style={styles.emptyText}>Пока нет данных по домашним заданиям.</Text>
            ) : (
              teacherRows.map((row) => (
                <View key={row.homework.id} style={styles.resultCard}>
                  <View style={styles.resultTop}>
                    <View style={styles.resultTextWrap}>
                      <Text style={styles.resultTitle}>{fixText(row.homework.title)}</Text>
                      <Text style={styles.resultMeta}>
                        {fixText(`Дедлайн: ${formatDateTime(row.homework.dueAt)} • Макс. балл: ${row.homework.maxScore}`)}
                      </Text>
                    </View>

                    <StatusPill
                      theme={theme}
                      label={row.checkedSubmissions > 0 ? "Есть проверки" : "Ожидает"}
                      tone={row.checkedSubmissions > 0 ? "success" : "warning"}
                    />
                  </View>

                  <View style={styles.infoGrid}>
                    <InfoTile theme={theme} label="Сдач" value={String(row.relatedSubmissions.length)} />
                    <InfoTile theme={theme} label="Проверено" value={String(row.checkedSubmissions)} />
                    <InfoTile
                      theme={theme}
                      label="Средний балл"
                      value={row.avgScore !== null ? row.avgScore.toFixed(1) : "—"}
                    />
                    <InfoTile theme={theme} label="Макс. балл" value={String(row.homework.maxScore)} />
                  </View>

                  {row.relatedSubmissions.length === 0 ? (
                    <Text style={styles.emptyText}>По этому заданию пока нет сдач.</Text>
                  ) : (
                    row.relatedSubmissions.map((submission) => {
                      const scoreValue =
                        scoreDrafts[submission.id] ??
                        (submission.score !== null ? String(submission.score) : "");

                      const commentValue =
                        commentDrafts[submission.id] ??
                        submission.teacherComment ??
                        "";

                      return (
                        <View key={submission.id} style={styles.submissionCard}>
                          <View style={styles.submissionTop}>
                            <View style={styles.submissionTextWrap}>
                              <Text style={styles.submissionTitle}>{fixText(submission.studentName)}</Text>
                              <Text style={styles.submissionMeta}>{fixText(`Логин: ${submission.studentLogin}`)}</Text>
                              <Text style={styles.submissionMeta}>{fixText(`Файл: ${submission.fileName}`)}</Text>
                              <Text style={styles.submissionMeta}>{fixText(`Сдано: ${formatDateTime(submission.submittedAt)}`)}</Text>
                            </View>

                            <StatusPill
                              theme={theme}
                              label={submission.score !== null ? "Проверено" : "Ожидает проверки"}
                              tone={submission.score !== null ? "success" : "info"}
                            />
                          </View>

                          <View style={styles.inputGrid}>
                            <View style={styles.inputCol}>
                              <AppInput
                                label="Оценка"
                                theme={theme}
                                value={scoreValue}
                                onChangeText={(value) =>
                                  setScoreDrafts((current) => ({
                                    ...current,
                                    [submission.id]: value
                                  }))
                                }
                                placeholder={`0-${row.homework.maxScore}`}
                                keyboardType="numeric"
                              />
                            </View>

                            <View style={styles.inputColWide}>
                              <AppInput
                                label="Комментарий"
                                theme={theme}
                                value={commentValue}
                                onChangeText={(value) =>
                                  setCommentDrafts((current) => ({
                                    ...current,
                                    [submission.id]: value
                                  }))
                                }
                                placeholder="Комментарий преподавателя"
                              />
                            </View>
                          </View>

                          <AppButton
                            label="Сохранить оценку"
                            onPress={() => handleSaveGrade(submission, row.homework)}
                            theme={theme}
                            fullWidth={false}
                            style={styles.inlineButton}
                          />
                        </View>
                      );
                    })
                  )}
                </View>
              ))
            )}
          </SectionCard>
          ) : null}

          {activeResultsTab === "testing" ? (
          <SectionCard
            theme={theme}
            title="Итоги по тестированию"
            subtitle="Сохранённые результаты экспресс-тестов и рейтинг студентов."
          >
            <View style={styles.sectionActions}>
              <AppButton
                label="Очистить итоги"
                onPress={handleClearTestingResults}
                theme={theme}
                variant="secondary"
                fullWidth={isPhone}
                disabled={!canClearTestingResults}
                style={styles.inlineButton}
              />
            </View>

            {testingRows.length === 0 ? (
              <Text style={styles.emptyText}>Пока нет сохранённых результатов по тестированию.</Text>
            ) : (
              <>
                <View style={styles.infoGrid}>
                  <InfoTile theme={theme} label="Всего тестов" value={String(testingRows.length)} />
                  <InfoTile
                    theme={theme}
                    label="Средний процент"
                    value={testingAverage !== null ? `${testingAverage.toFixed(1)}%` : "—"}
                  />
                </View>

                {testingRows.map((item) => {
                  const relatedTestingSubmissions = item.sessionId
                    ? testingSubmissions
                        .filter((submission) => submission.sessionId === item.sessionId)
                        .sort((left, right) => {
                          if (right.percent !== left.percent) {
                            return right.percent - left.percent;
                          }

                          if (right.correctCount !== left.correctCount) {
                            return right.correctCount - left.correctCount;
                          }

                          return (
                            new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime()
                          );
                        })
                    : [];

                  return (
                    <View key={item.id} style={styles.resultCard}>
                      <View style={styles.resultTop}>
                        <View style={styles.resultTextWrap}>
                          <Text style={styles.resultTitle}>{fixText(item.title)}</Text>
                          <Text style={styles.resultMeta}>
                            {fixText(`Дата: ${formatDateTime(item.createdAt)} • Длительность: ${item.durationMin} мин`)}
                          </Text>
                        </View>

                        <StatusPill
                          theme={theme}
                          label={`${item.percent}%`}
                          tone={item.percent >= 70 ? "success" : item.percent >= 40 ? "warning" : "neutral"}
                        />
                      </View>

                      <View style={styles.infoGrid}>
                        <InfoTile theme={theme} label="Правильных" value={String(item.correctCount)} />
                        <InfoTile theme={theme} label="Ошибок" value={String(item.wrongCount)} />
                        <InfoTile theme={theme} label="Пропусков" value={String(item.skippedCount)} />
                        <InfoTile theme={theme} label="Всего вопросов" value={String(item.totalQuestions)} />
                        <InfoTile theme={theme} label="Студентов" value={String(relatedTestingSubmissions.length)} />
                      </View>

                      <Text style={styles.teacherSubmissionsTitle}>Рейтинг студентов</Text>

                      {relatedTestingSubmissions.length === 0 ? (
                        <Text style={styles.emptyText}>Пока нет сохранённых результатов студентов по этому тесту.</Text>
                      ) : (
                        relatedTestingSubmissions.map((submission, index) => (
                          <View key={submission.id} style={styles.submissionCard}>
                            <View style={styles.submissionTop}>
                              <View style={styles.submissionTextWrap}>
                                <Text style={styles.submissionTitle}>
                                  {fixText(`${index + 1}. ${submission.studentName}`)}
                                </Text>
                                <Text style={styles.submissionMeta}>
                                  {fixText(`Логин: ${submission.studentLogin}`)}
                                </Text>
                                <Text style={styles.submissionMeta}>
                                  {fixText(`Место: ${index + 1} из ${relatedTestingSubmissions.length}`)}
                                </Text>
                                <Text style={styles.submissionMeta}>
                                  {fixText(`Результат: ${submission.correctCount}/${submission.totalQuestions} (${submission.percent}%)`)}
                                </Text>
                                <Text style={styles.submissionMeta}>
                                  {fixText(`Ошибок: ${submission.wrongCount} • Пропусков: ${submission.skippedCount}`)}
                                </Text>
                                <Text style={styles.submissionMeta}>
                                  {fixText(`Отправлено: ${formatDateTime(submission.submittedAt)}`)}
                                </Text>
                              </View>

                              <StatusPill
                                theme={theme}
                                label={index === 0 ? `Лидер • ${submission.percent}%` : `${submission.percent}%`}
                                tone={submission.percent >= 70 ? "success" : submission.percent >= 40 ? "warning" : "neutral"}
                              />
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </SectionCard>
          ) : null}

          {activeResultsTab === "lectureTesting" ? lectureTestsSection : null}
        </>
      ) : (
        <>
          {activeResultsTab === "homework" ? (
          <SectionCard
            theme={theme}
            title="Мои оценки"
            subtitle="Итоги по всем домашним заданиям."
          >
            {studentRows.length === 0 ? (
              <Text style={styles.emptyText}>Пока нет данных по домашним заданиям.</Text>
            ) : (
              studentRows.map((row) => (
                <View key={row.homework.id} style={styles.resultCard}>
                  <View style={styles.resultTop}>
                    <View style={styles.resultTextWrap}>
                      <Text style={styles.resultTitle}>{fixText(row.homework.title)}</Text>
                      <Text style={styles.resultMeta}>
                        {fixText(`Дедлайн: ${formatDateTime(row.homework.dueAt)} • Макс. балл: ${row.homework.maxScore}`)}
                      </Text>
                    </View>

                    <StatusPill
                      theme={theme}
                      label={studentStatusLabel(row)}
                      tone={studentStatusTone(row)}
                    />
                  </View>

                  <View style={styles.infoGrid}>
                    <InfoTile
                      theme={theme}
                      label="Оценка"
                      value={row.submission?.score !== null && row.submission?.score !== undefined ? String(row.submission.score) : "—"}
                    />
                    <InfoTile
                      theme={theme}
                      label="Сдано"
                      value={row.submission ? formatDateTime(row.submission.submittedAt) : "—"}
                    />
                    <InfoTile
                      theme={theme}
                      label="Файл"
                      value={row.submission?.fileName ?? "—"}
                    />
                    <InfoTile
                      theme={theme}
                      label="Макс. балл"
                      value={String(row.homework.maxScore)}
                    />
                  </View>

                  {row.submission?.teacherComment ? (
                    <Text style={styles.commentText}>{fixText(row.submission.teacherComment)}</Text>
                  ) : (
                    <Text style={styles.commentText}>
                      {row.submission ? "Комментарий преподавателя пока не добавлен." : "Работа ещё не была сдана."}
                    </Text>
                  )}
                </View>
              ))
            )}
          </SectionCard>
          ) : null}

          {activeResultsTab === "testing" ? (
          <SectionCard
            theme={theme}
            title="Мои тесты"
            subtitle="Результаты тестирования по выбранному преподавателю."
          >
            {testingSubmissions.length === 0 ? (
              <Text style={styles.emptyText}>Пока нет результатов по тестированию.</Text>
            ) : (
              testingSubmissions.map((submission) => (
                <View key={submission.id} style={styles.resultCard}>
                  <View style={styles.resultTop}>
                    <View style={styles.resultTextWrap}>
                      <Text style={styles.resultTitle}>{fixText(`Тест ${submission.sessionId.slice(0, 8)}`)}</Text>
                      <Text style={styles.resultMeta}>
                        {fixText(`Отправлено: ${formatDateTime(submission.submittedAt)}`)}
                      </Text>
                    </View>

                    <StatusPill
                      theme={theme}
                      label={`${submission.percent}%`}
                      tone={submission.percent >= 70 ? "success" : submission.percent >= 40 ? "warning" : "neutral"}
                    />
                  </View>

                  <View style={styles.infoGrid}>
                    <InfoTile theme={theme} label="Правильных" value={String(submission.correctCount)} />
                    <InfoTile theme={theme} label="Ошибок" value={String(submission.wrongCount)} />
                    <InfoTile theme={theme} label="Пропусков" value={String(submission.skippedCount)} />
                    <InfoTile theme={theme} label="Всего вопросов" value={String(submission.totalQuestions)} />
                  </View>
                </View>
              ))
            )}
          </SectionCard>
          ) : null}

          {activeResultsTab === "lectureTesting" ? lectureTestsSection : null}
        </>
      )}
    </Screen>
  );
}

type MiniStatCardProps = {
  theme: AppTheme;
  value: string;
  label: string;
};

function MiniStatCard({ theme, value, label }: MiniStatCardProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.miniStatCard}>
      <Text style={styles.miniStatValue}>{fixText(value)}</Text>
      <Text style={styles.miniStatLabel}>{fixText(label)}</Text>
    </View>
  );
}

type InfoTileProps = {
  theme: AppTheme;
  label: string;
  value: string;
};

function InfoTile({ theme, label, value }: InfoTileProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.infoTile}>
      <Text style={styles.infoTileLabel}>{fixText(label)}</Text>
      <Text style={styles.infoTileValue}>{fixText(value)}</Text>
    </View>
  );
}

function studentStatusLabel(row: StudentGradeRow): string {
  if (row.submission?.score !== null && row.submission?.score !== undefined) {
    return "Проверено";
  }

  if (row.submission) {
    return "Сдано";
  }

  if (Date.now() > new Date(row.homework.dueAt).getTime()) {
    return "Просрочено";
  }

  return "Активно";
}

function studentStatusTone(row: StudentGradeRow): StatusTone {
  if (row.submission?.score !== null && row.submission?.score !== undefined) {
    return "success";
  }

  if (row.submission) {
    return "info";
  }

  if (Date.now() > new Date(row.homework.dueAt).getTime()) {
    return "warning";
  }

  return "neutral";
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 560;
  const isCompact = width < 980;

  return StyleSheet.create({
    headerChip: {
      minHeight: 38,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft
    },
    headerChipText: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary
    },
    heroCard: {
      flexDirection: isCompact ? "column" : "row",
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg
    },
    heroMain: {
      flex: 1,
      minWidth: 0,
      paddingRight: isCompact ? 0 : theme.spacing.lg,
      marginBottom: isCompact ? theme.spacing.md : 0
    },
    heroEyebrow: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.3
    },
    heroTitle: {
      fontSize: isPhone ? 24 : theme.typography.title,
      lineHeight: isPhone ? 30 : theme.typography.title + 4,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    heroSubtitle: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      maxWidth: 760
    },
    errorText: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.danger
    },
    heroStats: {
      width: isCompact ? "100%" : 250
    },
    tabsRow: {
      flexDirection: isPhone ? "column" : "row",
      gap: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg
    },
    tabButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm
    },
    tabButtonActive: {
      backgroundColor: theme.colors.primary
    },
    tabButtonText: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      textAlign: "center"
    },
    tabButtonTextActive: {
      color: "#FFFFFF"
    },
    miniStatCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm
    },
    miniStatValue: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    miniStatLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    emptyText: {
      fontSize: theme.typography.body,
      color: theme.colors.textSecondary
    },
    resultCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    resultTop: {
      flexDirection: isPhone ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isPhone ? "stretch" : "flex-start",
      marginBottom: theme.spacing.md
    },
    resultTextWrap: {
      flex: 1,
      paddingRight: isPhone ? 0 : theme.spacing.md,
      marginBottom: isPhone ? theme.spacing.sm : 0
    },
    resultTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    resultMeta: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm
    },
    infoTile: {
      flexBasis: isPhone ? "100%" : 210,
      flexGrow: 1,
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    infoTileLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    infoTileValue: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text
    },
    sectionActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: theme.spacing.md
    },
    commentText: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary
    },
    teacherSubmissionsTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md
    },
    submissionCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing.md
    },
    submissionTop: {
      flexDirection: isPhone ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isPhone ? "stretch" : "flex-start",
      marginBottom: theme.spacing.md
    },
    submissionTextWrap: {
      flex: 1,
      paddingRight: isPhone ? 0 : theme.spacing.md,
      marginBottom: isPhone ? theme.spacing.sm : 0
    },
    submissionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    submissionMeta: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    inputGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0
    },
    inputCol: {
      flexBasis: isPhone ? "100%" : 180,
      flexGrow: 1,
      paddingHorizontal: 0
    },
    inputColWide: {
      flexBasis: isPhone ? "100%" : 360,
      flexGrow: 1,
      paddingHorizontal: 0
    },
    inlineButton: {
      marginTop: theme.spacing.sm
    }
  });
}
