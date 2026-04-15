import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { AppInput } from "../components/ui/AppInput";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusPill } from "../components/ui/StatusPill";
import type { Question, SessionData, TaskSubmission } from "../mocks/session";
import type { AppTheme } from "../theme";
import { fixText } from "../utils/fixText";

type TaskScreenProps = {
  theme: AppTheme;
  session: SessionData;
  onBack: () => void;
  onSubmit: (submission: TaskSubmission) => void;
};

type DraftAnswer = {
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  shortAnswer?: string;
};

export function TaskScreen({ theme, session, onBack, onSubmit }: TaskScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  const initialTime = useMemo(() => {
    return session.questions.reduce((max, question) => Math.max(max, question.timeLimitSec), 60);
  }, [session.questions]);

  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, DraftAnswer>>({});
  const [errorText, setErrorText] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const currentQuestion = session.questions[currentIndex];

  useEffect(() => {
    if (isLocked) {
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(timerId);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isLocked]);

  useEffect(() => {
    if (timeLeft === 0 && !isLocked) {
      handleSubmit("timeout");
    }
  }, [timeLeft, isLocked]);

  const timerLabel = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [timeLeft]);

  const answeredCount = useMemo(() => {
    return session.questions.filter((question) => hasAnswer(question, answersByQuestionId)).length;
  }, [answersByQuestionId, session.questions]);

  const completionPercent = session.questions.length > 0
    ? Math.round((answeredCount / session.questions.length) * 100)
    : 0;

  if (!currentQuestion) {
    return (
      <Screen theme={theme}>
        <ScreenHeader theme={theme} title="Проверочный блок" subtitle="Нет доступных вопросов" />
        <SectionCard theme={theme} title="Пустой блок" subtitle="В этой сессии ещё нет заданий">
          <AppButton label="Назад" onPress={onBack} theme={theme} variant="secondary" />
        </SectionCard>
      </Screen>
    );
  }

  const currentDraft = answersByQuestionId[currentQuestion.id] ?? {};

  function questionTypeLabel(question: Question): string {
    if (question.type === "single-choice") {
      return "Один вариант";
    }

    if (question.type === "multiple-choice") {
      return "Несколько вариантов";
    }

    return "Короткий ответ";
  }

  function hasAnswer(
    question: Question,
    answers: Record<string, DraftAnswer>
  ): boolean {
    const answer = answers[question.id];

    if (!answer) {
      return false;
    }

    if (question.type === "single-choice") {
      return Boolean(answer.selectedOptionId);
    }

    if (question.type === "multiple-choice") {
      return Boolean(answer.selectedOptionIds?.length);
    }

    return Boolean(answer.shortAnswer?.trim());
  }

  function buildSubmission(status: "submitted" | "timeout"): TaskSubmission {
    return {
      answers: session.questions.map((question) => {
        const answer = answersByQuestionId[question.id] ?? {};

        return {
          questionId: question.id,
          selectedOptionId: answer.selectedOptionId,
          selectedOptionIds: answer.selectedOptionIds,
          shortAnswer: answer.shortAnswer
        };
      }),
      timeSpentSec: initialTime - timeLeft,
      status
    };
  }

  function handleSelectSingleOption(optionId: string) {
    setAnswersByQuestionId((current) => ({
      ...current,
      [currentQuestion.id]: {
        ...current[currentQuestion.id],
        selectedOptionId: optionId
      }
    }));
    setErrorText("");
  }

  function handleToggleMultipleOption(optionId: string) {
    setAnswersByQuestionId((current) => {
      const existing = current[currentQuestion.id]?.selectedOptionIds ?? [];
      const nextSelected = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];

      return {
        ...current,
        [currentQuestion.id]: {
          ...current[currentQuestion.id],
          selectedOptionIds: nextSelected
        }
      };
    });
    setErrorText("");
  }

  function handleShortAnswer(value: string) {
    setAnswersByQuestionId((current) => ({
      ...current,
      [currentQuestion.id]: {
        ...current[currentQuestion.id],
        shortAnswer: value
      }
    }));
    setErrorText("");
  }

  function handleSubmit(status: "submitted" | "timeout") {
    if (isLocked) {
      return;
    }

    if (status === "submitted") {
      const unansweredIndex = session.questions.findIndex(
        (question) => !hasAnswer(question, answersByQuestionId)
      );

      if (unansweredIndex !== -1) {
        setCurrentIndex(unansweredIndex);
        setErrorText(`Заполни вопрос ${unansweredIndex + 1} из ${session.questions.length}.`);
        return;
      }
    }

    setErrorText("");
    setIsLocked(true);
    onSubmit(buildSubmission(status));
  }

  function goToQuestion(index: number) {
    setCurrentIndex(index);
    setErrorText("");
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Проверочный блок"
        subtitle={fixText(session.lectureTitle)}
        rightSlot={
          <View style={styles.headerPills}>
            <StatusPill
              theme={theme}
              label={`Вопрос ${currentIndex + 1}/${session.questions.length}`}
              tone="info"
            />
            <StatusPill
              theme={theme}
              label={`${answeredCount} заполнено`}
              tone="success"
            />
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroEyebrow}>Текущий прогресс</Text>
          <Text style={styles.heroTitle}>{timerLabel}</Text>
          <Text style={styles.heroSubtitle}>
            {fixText("Можно свободно переключаться между вопросами до финальной отправки.")}
          </Text>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${completionPercent}%`, backgroundColor: theme.colors.primary }
              ]}
            />
          </View>

          <Text style={styles.progressCaption}>
            {fixText(`Заполнено ${answeredCount} из ${session.questions.length} вопросов (${completionPercent}%).`)}
          </Text>

          <View style={styles.heroActions}>
            <AppButton
              label="Вернуться к сессии"
              onPress={onBack}
              theme={theme}
              variant="secondary"
              fullWidth={false}
              style={styles.heroButton}
            />
            <AppButton
              label={`Отправить ответы (${answeredCount}/${session.questions.length})`}
              onPress={() => handleSubmit("submitted")}
              theme={theme}
              fullWidth={false}
              disabled={isLocked}
              style={styles.heroButton}
            />
          </View>
        </View>

        <View style={styles.heroStats}>
          <MiniStatCard theme={theme} value={String(session.questions.length)} label="Всего вопросов" />
          <MiniStatCard theme={theme} value={String(answeredCount)} label="Заполнено" />
          <MiniStatCard theme={theme} value={questionTypeLabel(currentQuestion)} label="Тип текущего" />
        </View>
      </View>

      <SectionCard
        theme={theme}
        title="Навигация по вопросам"
        subtitle="Нажми на номер, чтобы быстро перейти к нужному вопросу."
      >
        <View style={styles.progressRow}>
          {session.questions.map((question, index) => {
            const isCurrent = index === currentIndex;
            const isAnswered = hasAnswer(question, answersByQuestionId);

            return (
              <Pressable
                key={question.id}
                onPress={() => goToQuestion(index)}
                style={[
                  styles.progressChip,
                  {
                    borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
                    backgroundColor: isAnswered ? theme.colors.surfaceMuted : theme.colors.surface
                  }
                ]}
              >
                <Text
                  style={[
                    styles.progressChipText,
                    { color: isCurrent ? theme.colors.primary : theme.colors.text }
                  ]}
                >
                  {index + 1}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard
        theme={theme}
        title={`Вопрос ${currentIndex + 1}`}
        subtitle={questionTypeLabel(currentQuestion)}
      >
        <View style={styles.questionHero}>
          <Text style={styles.questionPrompt}>{fixText(currentQuestion.prompt)}</Text>
        </View>

        {currentQuestion.type === "single-choice"
          ? currentQuestion.options?.map((option) => {
              const isSelected = option.id === currentDraft.selectedOptionId;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelectSingleOption(option.id)}
                  style={[
                    styles.optionCard,
                    {
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: isSelected ? theme.colors.surfaceMuted : theme.colors.surface
                    }
                  ]}
                >
                  <View style={styles.optionTopRow}>
                    <View
                      style={[
                        styles.optionMarker,
                        {
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface
                        }
                      ]}
                    />
                    <Text style={styles.optionText}>{fixText(option.label)}</Text>
                  </View>
                </Pressable>
              );
            })
          : null}

        {currentQuestion.type === "multiple-choice" ? (
          <>
            <Text style={styles.helperText}>Можно выбрать несколько вариантов.</Text>

            {currentQuestion.options?.map((option) => {
              const selectedIds = currentDraft.selectedOptionIds ?? [];
              const isSelected = selectedIds.includes(option.id);

              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleToggleMultipleOption(option.id)}
                  style={[
                    styles.optionCard,
                    {
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: isSelected ? theme.colors.surfaceMuted : theme.colors.surface
                    }
                  ]}
                >
                  <View style={styles.optionTopRow}>
                    <View
                      style={[
                        styles.optionSquare,
                        {
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface
                        }
                      ]}
                    />
                    <Text style={styles.optionText}>{fixText(option.label)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </>
        ) : null}

        {currentQuestion.type === "short-answer" ? (
          <View style={styles.shortAnswerWrap}>
            <AppInput
              label="Ответ"
              value={currentDraft.shortAnswer ?? ""}
              onChangeText={handleShortAnswer}
              placeholder="Введите ответ"
              keyboardType="numeric"
              theme={theme}
            />
          </View>
        ) : null}

        {errorText ? <Text style={styles.errorText}>{fixText(errorText)}</Text> : null}

        <View style={styles.bottomNavRow}>
          <Pressable
            onPress={() => setCurrentIndex((current) => Math.max(0, current - 1))}
            disabled={currentIndex === 0}
            style={[
              styles.navButton,
              {
                opacity: currentIndex === 0 ? 0.5 : 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface
              }
            ]}
          >
            <Text style={styles.navButtonText}>Назад</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setCurrentIndex((current) => Math.min(session.questions.length - 1, current + 1))
            }
            disabled={currentIndex === session.questions.length - 1}
            style={[
              styles.navButton,
              {
                opacity: currentIndex === session.questions.length - 1 ? 0.5 : 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface
              }
            ]}
          >
            <Text style={styles.navButtonText}>Далее</Text>
          </Pressable>
        </View>
      </SectionCard>
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
      <Text numberOfLines={2} style={styles.miniStatValue}>{fixText(value)}</Text>
      <Text style={styles.miniStatLabel}>{fixText(label)}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 560;
  const isCompact = width < 980;

  return StyleSheet.create({
    headerPills: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    heroCard: {
      flexDirection: isCompact ? "column" : "row",
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
      ...theme.shadow.lg
    },
    heroLeft: {
      flex: 1,
      minWidth: 0,
      paddingRight: isCompact ? 0 : theme.spacing.lg,
      marginBottom: isCompact ? theme.spacing.md : 0
    },
    heroEyebrow: {
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    heroTitle: {
      fontSize: isPhone ? 24 : theme.typography.title,
      fontWeight: "900",
      color: theme.colors.primary,
      lineHeight: isPhone ? 30 : theme.typography.title + 4,
      marginBottom: theme.spacing.sm
    },
    heroSubtitle: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      maxWidth: 760
    },
    progressBarTrack: {
      height: 12,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: "hidden",
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 999
    },
    progressCaption: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md
    },
    heroActions: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    heroButton: {
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    heroStats: {
      width: isCompact ? "100%" : 260,
      justifyContent: "space-between"
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
      fontSize: 22,
      fontWeight: "900",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    miniStatLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    progressRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: isPhone ? "flex-start" : "center"
    },
    progressChip: {
      minWidth: 44,
      height: 44,
      borderWidth: 1,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.xs
    },
    progressChipText: {
      fontSize: theme.typography.body,
      fontWeight: "800"
    },
    questionHero: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    questionPrompt: {
      fontSize: theme.typography.sectionTitle,
      lineHeight: 28,
      fontWeight: "900",
      color: theme.colors.text
    },
    helperText: {
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    optionCard: {
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      ...theme.shadow.sm
    },
    optionTopRow: {
      flexDirection: "row",
      alignItems: "flex-start"
    },
    optionMarker: {
      width: 20,
      height: 20,
      borderRadius: 999,
      borderWidth: 2,
      marginRight: theme.spacing.md
    },
    optionSquare: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      marginRight: theme.spacing.md
    },
    optionText: {
      flex: 1,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      lineHeight: 22
    },
    shortAnswerWrap: {
      marginTop: theme.spacing.xs
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      marginTop: theme.spacing.xs
    },
    bottomNavRow: {
      flexDirection: isPhone ? "column" : "row",
      marginTop: theme.spacing.md
    },
    navButton: {
      flex: 1,
      minHeight: 50,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
      marginRight: isPhone ? 0 : theme.spacing.sm,
      marginBottom: isPhone ? theme.spacing.sm : 0
    },
    navButtonText: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.text
    }
  });
}
