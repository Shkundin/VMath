import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { AppInput } from "../components/ui/AppInput";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import type { AppTheme } from "../theme";
import { fixText } from "../utils/fixText";
import type {
  ActiveTestingQuestion,
  ActiveTestingSession,
  TestingAnswerKey,
  TestingSubmission
} from "../storage/testingStorage";

export type TestingRunResult = {
  id: string;
  sessionId?: string;
  title: string;
  createdAt: string;
  durationMin: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  percent: number;
};

type TestingScreenProps = {
  theme: AppTheme;
  isTeacher: boolean;
  userLogin: string;
  userName: string;
  activeSession: ActiveTestingSession | null;
  submissions: TestingSubmission[];
  onStartSession: (input: {
    title: string;
    durationMin: number;
    questions: ActiveTestingQuestion[];
  }) => void;
  onFinishSession: () => void;
  onSubmitStudentAnswers: (answers: Record<string, TestingAnswerKey>) => void;
  onOpenGrades: () => void;
};

const ANSWER_KEYS: TestingAnswerKey[] = ["A", "B", "C", "D"];

export function TestingScreen({
  theme,
  isTeacher,
  userLogin,
  userName,
  activeSession,
  submissions,
  onStartSession,
  onFinishSession,
  onSubmitStudentAnswers,
  onOpenGrades
}: TestingScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  const [testTitle, setTestTitle] = useState("Экспресс-тест");
  const [durationMin, setDurationMin] = useState("3");

  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswerKey, setCorrectAnswerKey] = useState<TestingAnswerKey>("A");
  const [explanation, setExplanation] = useState("");

  const [draftQuestions, setDraftQuestions] = useState<ActiveTestingQuestion[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, TestingAnswerKey | null>>({});
  const [nowTs, setNowTs] = useState(Date.now());
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const timerId = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    setStudentAnswers({});
  }, [activeSession?.id]);

  const remainingSec = useMemo(() => {
    if (!activeSession) {
      return 0;
    }

    const startedAtTs = new Date(activeSession.startedAt).getTime();
    const endTs = startedAtTs + activeSession.durationMin * 60 * 1000;
    return Math.max(0, Math.floor((endTs - nowTs) / 1000));
  }, [activeSession, nowTs]);

  const isExpired = Boolean(activeSession) && remainingSec <= 0;

  const mySubmission = useMemo(() => {
    if (!activeSession) {
      return null;
    }

    return submissions.find((submission) => submission.studentLogin === userLogin) ?? null;
  }, [activeSession, submissions, userLogin]);

  function resetDraftInputs() {
    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectAnswerKey("A");
    setExplanation("");
  }

  function handleAddQuestion() {
    const nextQuestionText = questionText.trim();
    const nextOptionA = optionA.trim();
    const nextOptionB = optionB.trim();
    const nextOptionC = optionC.trim();
    const nextOptionD = optionD.trim();

    if (!nextQuestionText || !nextOptionA || !nextOptionB || !nextOptionC || !nextOptionD) {
      setErrorText("Заполни вопрос и все 4 варианта ответа.");
      return;
    }

    const nextQuestion: ActiveTestingQuestion = {
      id: `testing-question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: nextQuestionText,
      options: [
        { key: "A", text: nextOptionA },
        { key: "B", text: nextOptionB },
        { key: "C", text: nextOptionC },
        { key: "D", text: nextOptionD }
      ],
      correctAnswerKey,
      explanation: explanation.trim()
    };

    setDraftQuestions((current) => [...current, nextQuestion]);
    setErrorText("");
    resetDraftInputs();
  }

  function handleDeleteQuestion(questionId: string) {
    setDraftQuestions((current) => current.filter((question) => question.id !== questionId));
  }

  function handleStart() {
    const parsedDuration = Number(durationMin.replace(",", ".").trim());

    if (draftQuestions.length === 0) {
      setErrorText("Добавь хотя бы один вопрос.");
      return;
    }

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setErrorText("Укажи корректную длительность в минутах.");
      return;
    }

    onStartSession({
      title: testTitle.trim() || "Экспресс-тест",
      durationMin: parsedDuration,
      questions: draftQuestions
    });

    setErrorText("");
  }

  function handleSubmitStudent() {
    if (!activeSession) {
      return;
    }

    const preparedAnswers: Record<string, TestingAnswerKey> = {};

    for (const question of activeSession.questions) {
      const value = studentAnswers[question.id];
      if (value) {
        preparedAnswers[question.id] = value;
      }
    }

    onSubmitStudentAnswers(preparedAnswers);
  }

  function handleSelectStudentAnswer(questionId: string, answerKey: TestingAnswerKey) {
    setStudentAnswers((current) => ({
      ...current,
      [questionId]: answerKey
    }));
  }

  if (isTeacher) {
    return (
      <Screen theme={theme}>
        <ScreenHeader
          theme={theme}
          title="Тестирование"
          subtitle="Быстрые classroom-проверки: собери тест, запусти его и сразу смотри ответы."
          rightSlot={
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {activeSession ? "Тест активен" : `${draftQuestions.length} вопросов`}
              </Text>
            </View>
          }
        />

        {activeSession ? (
          <>
            <SectionCard
              theme={theme}
              title={activeSession.title}
              subtitle="Активный тест для студентов"
            >
              <View style={styles.infoGrid}>
                <InfoCard theme={theme} label="Вопросов" value={String(activeSession.questions.length)} />
                <InfoCard theme={theme} label="Длительность" value={`${activeSession.durationMin} мин`} />
                <InfoCard theme={theme} label="Осталось" value={formatDuration(remainingSec)} />
                <InfoCard theme={theme} label="Сдано" value={String(submissions.length)} />
              </View>

              <View style={styles.inlineActions}>
                <AppButton
                  label="Завершить тест"
                  onPress={onFinishSession}
                  theme={theme}
                  fullWidth={false}
                  style={styles.inlineButton}
                />
                <AppButton
                  label="Открыть итоги"
                  onPress={onOpenGrades}
                  theme={theme}
                  variant="secondary"
                  fullWidth={false}
                  style={styles.inlineButton}
                />
              </View>
            </SectionCard>

            <SectionCard
              theme={theme}
              title="Ответы студентов"
              subtitle={submissions.length > 0 ? `Получено ответов: ${submissions.length}` : "Пока никто не отправил ответы"}
            >
              {submissions.length === 0 ? (
                <Text style={styles.helperText}>
                  {fixText("Студенты увидят тест во вкладке «Тестирование» после синхронизации.")}
                </Text>
              ) : (
                submissions.map((submission) => (
                  <View key={submission.id} style={styles.questionCard}>
                    <View style={styles.resultTop}>
                      <View style={styles.resultTextWrap}>
                        <Text style={styles.questionTitle}>{fixText(submission.studentName)}</Text>
                        <Text style={styles.questionText}>
                          {fixText(`Результат: ${submission.correctCount}/${submission.totalQuestions} (${submission.percent}%)`)}
                        </Text>
                        <Text style={styles.explanationText}>
                          {fixText(`Отправлено: ${formatDateTime(submission.submittedAt)}`)}
                        </Text>
                      </View>

                      <View style={styles.resultChip}>
                        <Text style={styles.resultChipText}>{submission.percent}%</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </SectionCard>
          </>
        ) : (
          <View style={styles.dashboardRow}>
            <SectionCard
              theme={theme}
              title="Параметры теста"
              subtitle="Собери тест и запусти его для студентов."
              style={styles.dashboardWide}
            >
              <AppInput
                label="Название теста"
                theme={theme}
                value={testTitle}
                onChangeText={setTestTitle}
                placeholder="Например: Быстрая проверка по пределам"
              />

              <AppInput
                label="Длительность, минут"
                theme={theme}
                value={durationMin}
                onChangeText={setDurationMin}
                placeholder="3"
                keyboardType="numeric"
              />

              {errorText ? <Text style={styles.errorText}>{fixText(errorText)}</Text> : null}

              <AppButton
                label="Запустить тест для студентов"
                onPress={handleStart}
                theme={theme}
                style={styles.actionTop}
              />
            </SectionCard>

            <SectionCard
              theme={theme}
              title="Добавить вопрос"
              subtitle="Один вопрос и 4 варианта ответа."
              style={styles.dashboardWide}
            >
              <AppInput
                label="Текст вопроса"
                theme={theme}
                value={questionText}
                onChangeText={setQuestionText}
                placeholder="Введите вопрос"
                multiline
                numberOfLines={3}
              />

              <View style={styles.inputGrid}>
                <View style={styles.inputCol}>
                  <AppInput label="Вариант A" theme={theme} value={optionA} onChangeText={setOptionA} placeholder="Ответ A" />
                </View>
                <View style={styles.inputCol}>
                  <AppInput label="Вариант B" theme={theme} value={optionB} onChangeText={setOptionB} placeholder="Ответ B" />
                </View>
                <View style={styles.inputCol}>
                  <AppInput label="Вариант C" theme={theme} value={optionC} onChangeText={setOptionC} placeholder="Ответ C" />
                </View>
                <View style={styles.inputCol}>
                  <AppInput label="Вариант D" theme={theme} value={optionD} onChangeText={setOptionD} placeholder="Ответ D" />
                </View>
              </View>

              <Text style={styles.sectionLabel}>Правильный ответ</Text>
              <View style={styles.answerKeyRow}>
                {ANSWER_KEYS.map((answerKey) => {
                  const isActive = correctAnswerKey === answerKey;

                  return (
                    <Pressable
                      key={answerKey}
                      onPress={() => setCorrectAnswerKey(answerKey)}
                      style={[
                        styles.answerKeyChip,
                        {
                          borderColor: isActive ? theme.colors.primary : theme.colors.border,
                          backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surface
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.answerKeyChipText,
                          { color: isActive ? theme.colors.primary : theme.colors.text }
                        ]}
                      >
                        {answerKey}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <AppInput
                label="Пояснение"
                theme={theme}
                value={explanation}
                onChangeText={setExplanation}
                placeholder="Необязательно"
                multiline
                numberOfLines={3}
              />

              <AppButton
                label="Добавить вопрос"
                onPress={handleAddQuestion}
                theme={theme}
                style={styles.actionTop}
              />
            </SectionCard>
          </View>
        )}

        {!activeSession ? (
          <SectionCard
            theme={theme}
            title="Собранные вопросы"
            subtitle={draftQuestions.length > 0 ? `Всего вопросов: ${draftQuestions.length}` : "Пока вопросов нет"}
          >
            {draftQuestions.length === 0 ? (
              <Text style={styles.helperText}>
                {fixText("Добавь вопросы, потом запусти тест для студентов.")}
              </Text>
            ) : (
              draftQuestions.map((question, index) => (
                <View key={question.id} style={styles.questionCard}>
                  <View style={styles.questionTop}>
                    <View style={styles.questionTextWrap}>
                      <Text style={styles.questionTitle}>{fixText(`Вопрос ${index + 1}`)}</Text>
                      <Text style={styles.questionText}>{fixText(question.text)}</Text>
                    </View>

                    <AppButton
                      label="Удалить"
                      onPress={() => handleDeleteQuestion(question.id)}
                      theme={theme}
                      variant="ghost"
                      fullWidth={false}
                      style={styles.inlineButton}
                    />
                  </View>

                  <View style={styles.optionList}>
                    {question.options.map((option) => (
                      <View key={option.key} style={styles.optionRow}>
                        <Text style={styles.optionKey}>{option.key}</Text>
                        <Text style={styles.optionText}>{fixText(option.text)}</Text>
                        {option.key === question.correctAnswerKey ? (
                          <Text style={styles.correctMark}>Правильный</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        ) : null}
      </Screen>
    );
  }

  if (!activeSession) {
    return (
      <Screen theme={theme}>
        <ScreenHeader
          theme={theme}
          title="Тестирование"
          subtitle="Здесь появится активный тест преподавателя."
        />

        <SectionCard
          theme={theme}
          title="Сейчас нет активного теста"
          subtitle="Ожидай, когда преподаватель запустит тест."
        >
          <Text style={styles.helperText}>
            {fixText("Когда преподаватель запустит тестирование, оно автоматически появится здесь.")}
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  if (mySubmission) {
    return (
      <Screen theme={theme}>
        <ScreenHeader
          theme={theme}
          title="Тестирование"
          subtitle="Ответ уже отправлен."
        />

        <SectionCard
          theme={theme}
          title={activeSession.title}
          subtitle="Результат студента"
        >
          <View style={styles.infoGrid}>
            <InfoCard theme={theme} label="Студент" value={fixText(userName)} />
            <InfoCard theme={theme} label="Результат" value={`${mySubmission.correctCount}/${mySubmission.totalQuestions}`} />
            <InfoCard theme={theme} label="Процент" value={`${mySubmission.percent}%`} />
            <InfoCard theme={theme} label="Отправлено" value={formatDateTime(mySubmission.submittedAt)} />
          </View>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Тестирование"
        subtitle="Активный тест преподавателя. Выбери ответы и отправь результат."
        rightSlot={
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{formatDuration(remainingSec)}</Text>
          </View>
        }
      />

      <SectionCard
        theme={theme}
        title={activeSession.title}
        subtitle={isExpired ? "Время вышло" : `Осталось времени: ${formatDuration(remainingSec)}`}
      >
        <View style={styles.infoGrid}>
          <InfoCard theme={theme} label="Вопросов" value={String(activeSession.questions.length)} />
          <InfoCard theme={theme} label="Длительность" value={`${activeSession.durationMin} мин`} />
          <InfoCard theme={theme} label="Статус" value={isExpired ? "Завершён" : "Активен"} />
        </View>

        {activeSession.questions.map((question, index) => (
          <View key={question.id} style={styles.questionCard}>
            <Text style={styles.questionTitle}>{fixText(`Вопрос ${index + 1}`)}</Text>
            <Text style={styles.questionText}>{fixText(question.text)}</Text>

            <View style={styles.optionList}>
              {question.options.map((option) => {
                const isSelected = studentAnswers[question.id] === option.key;

                return (
                  <Pressable
                    key={option.key}
                    disabled={isExpired}
                    onPress={() => handleSelectStudentAnswer(question.id, option.key)}
                    style={[
                      styles.answerKeyChip,
                      styles.answerOptionWide,
                      {
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        backgroundColor: isSelected ? theme.colors.primarySoft : theme.colors.surface,
                        opacity: isExpired ? 0.6 : 1
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.answerKeyChipText,
                        { color: isSelected ? theme.colors.primary : theme.colors.text }
                      ]}
                    >
                      {fixText(`${option.key}. ${option.text}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <AppButton
          label={isExpired ? "Время вышло" : "Отправить ответы"}
          onPress={handleSubmitStudent}
          theme={theme}
          disabled={isExpired}
          style={styles.actionTop}
        />
      </SectionCard>
    </Screen>
  );
}

type InfoCardProps = {
  theme: AppTheme;
  label: string;
  value: string;
};

function InfoCard({ theme, label, value }: InfoCardProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardValue}>{fixText(value)}</Text>
      <Text style={styles.infoCardLabel}>{fixText(label)}</Text>
    </View>
  );
}

function formatDuration(totalSec: number): string {
  const safeTotalSec = Math.max(0, totalSec);
  const minutes = Math.floor(safeTotalSec / 60);
  const seconds = safeTotalSec % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
    headerBadge: {
      minHeight: 38,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft
    },
    headerBadgeText: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary
    },
    dashboardRow: {
      flexDirection: isCompact ? "column" : "row",
      columnGap: theme.spacing.md
    },
    dashboardWide: {
      flex: 1
    },
    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm
    },
    infoCard: {
      flexBasis: isPhone ? "100%" : 220,
      flexGrow: 1,
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    infoCardValue: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    infoCardLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    inlineActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: theme.spacing.sm
    },
    inlineButton: {
      width: isPhone ? "100%" : undefined,
      marginRight: isPhone ? 0 : theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    inputGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0,
      gap: theme.spacing.sm
    },
    inputCol: {
      flexBasis: isPhone ? "100%" : 260,
      flexGrow: 1,
      paddingHorizontal: 0
    },
    actionTop: {
      marginTop: theme.spacing.sm
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      marginTop: theme.spacing.xs
    },
    helperText: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary
    },
    sectionLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    answerKeyRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm
    },
    answerKeyChip: {
      minHeight: 42,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      justifyContent: "center",
      marginBottom: theme.spacing.sm
    },
    answerOptionWide: {
      marginRight: 0
    },
    answerKeyChipText: {
      fontSize: theme.typography.body,
      fontWeight: "700"
    },
    questionCard: {
      borderRadius: theme.radius.lg,
      padding: isPhone ? theme.spacing.sm + 2 : theme.spacing.md,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    questionTop: {
      flexDirection: isPhone ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isPhone ? "stretch" : "flex-start",
      marginBottom: theme.spacing.sm
    },
    questionTextWrap: {
      flex: 1,
      paddingRight: isPhone ? 0 : theme.spacing.md
    },
    questionTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    questionText: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.text
    },
    optionList: {
      marginTop: theme.spacing.sm
    },
    optionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    optionKey: {
      width: 24,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.primary,
      marginRight: theme.spacing.sm
    },
    optionText: {
      flex: 1,
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.text
    },
    correctMark: {
      marginLeft: theme.spacing.sm,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.success
    },
    resultTop: {
      flexDirection: isPhone ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isPhone ? "stretch" : "flex-start"
    },
    resultTextWrap: {
      flex: 1,
      paddingRight: isPhone ? 0 : theme.spacing.md,
      marginBottom: isPhone ? theme.spacing.sm : 0
    },
    resultChip: {
      minHeight: 34,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center"
    },
    resultChipText: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary
    },
    explanationText: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    }
  });
}
