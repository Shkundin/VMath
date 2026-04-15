import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusPill } from "../components/ui/StatusPill";
import type { TaskResult } from "../mocks/session";
import type { AppTheme } from "../theme";
import { fixText } from "../utils/fixText";

type TaskResultScreenProps = {
  theme: AppTheme;
  result: TaskResult;
  onBackToSession: () => void;
  onFinish: () => void;
};

export function TaskResultScreen({
  theme,
  result,
  onBackToSession,
  onFinish
}: TaskResultScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);
  const percent = result.totalQuestions > 0
    ? Math.round((result.correctCount / result.totalQuestions) * 100)
    : 0;

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Результаты блока"
        subtitle="Сводка по всем задачам лекции"
        rightSlot={
          <View style={styles.headerPills}>
            <StatusPill
              theme={theme}
              label={result.status === "timeout" ? "Время вышло" : "Отправлено"}
              tone={result.status === "timeout" ? "warning" : "success"}
            />
            <StatusPill
              theme={theme}
              label={`${result.correctCount}/${result.totalQuestions} верно`}
              tone="info"
            />
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroEyebrow}>Итог блока</Text>
          <Text style={styles.heroTitle}>{fixText(`${percent}% результата`)}</Text>
          <Text style={styles.heroSubtitle}>
            {result.status === "timeout"
              ? "Проверочный блок завершён автоматически после окончания времени."
              : "Ответы успешно отправлены и проверены."}
          </Text>

          <View style={styles.heroActions}>
            <AppButton
              label="Назад к сессии"
              onPress={onBackToSession}
              theme={theme}
              variant="secondary"
              fullWidth={false}
              style={styles.heroButton}
            />
            <AppButton
              label="Завершить и вернуться в каталог"
              onPress={onFinish}
              theme={theme}
              fullWidth={false}
              style={styles.heroButton}
            />
          </View>
        </View>

        <View style={styles.heroStats}>
          <MiniStatCard theme={theme} value={`${result.correctCount}/${result.totalQuestions}`} label="Верно" />
          <MiniStatCard theme={theme} value={`${result.earnedPoints} / ${result.maxPoints}`} label="Баллы" />
          <MiniStatCard theme={theme} value={`${result.timeSpentSec} сек`} label="Время" />
        </View>
      </View>

      <View style={styles.grid}>
        <SectionCard
          theme={theme}
          title="Общая сводка"
          subtitle="Ключевые показатели по проверочному блоку."
          style={styles.cardWide}
        >
          <View style={styles.infoGrid}>
            <InfoTile theme={theme} label="Верных ответов" value={`${result.correctCount} из ${result.totalQuestions}`} />
            <InfoTile theme={theme} label="Баллы" value={`${result.earnedPoints} / ${result.maxPoints}`} />
            <InfoTile theme={theme} label="Время" value={`${result.timeSpentSec} сек.`} />
            <InfoTile theme={theme} label="Статус" value={result.status === "timeout" ? "Время вышло" : "Отправлено"} />
          </View>
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Краткий итог"
          subtitle="Насколько уверенно пройден блок."
          style={styles.cardNarrow}
        >
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeValue}>{percent}%</Text>
            <Text style={styles.summaryBadgeLabel}>точность</Text>
          </View>

          <Text style={styles.summaryText}>
            {percent >= 80
              ? "Отличный результат. Блок пройден очень уверенно."
              : percent >= 50
                ? "Хороший базовый результат. Есть несколько мест для доработки."
                : "Есть ошибки. Лучше пройти материал ещё раз и повторить вопросы."}
          </Text>
        </SectionCard>
      </View>

      <SectionCard
        theme={theme}
        title="Разбор ответов"
        subtitle="Ниже приведён результат по каждому вопросу."
      >
        {result.answers.map((answer, index) => (
          <View key={answer.questionId} style={styles.answerCard}>
            <View style={styles.answerTop}>
              <Text style={styles.answerIndex}>{fixText(`Задача ${index + 1}`)}</Text>
              <View
                style={[
                  styles.answerToneBadge,
                  answer.isCorrect ? styles.answerToneBadgeSuccess : styles.answerToneBadgeDanger
                ]}
              >
                <Text
                  style={[
                    styles.answerToneBadgeText,
                    answer.isCorrect ? styles.answerToneBadgeTextSuccess : styles.answerToneBadgeTextDanger
                  ]}
                >
                  {answer.isCorrect ? "Верно" : "Неверно"}
                </Text>
              </View>
            </View>

            <Text style={styles.answerPrompt}>{fixText(answer.prompt)}</Text>

            <View style={styles.answerInfoGrid}>
              <AnswerInfoTile
                theme={theme}
                label="Твой ответ"
                value={fixText(answer.submittedAnswerLabel)}
              />
              <AnswerInfoTile
                theme={theme}
                label="Правильный ответ"
                value={fixText(answer.correctAnswerLabel)}
              />
            </View>

            <Text style={styles.answerExplanation}>
              {fixText(answer.explanation)}
            </Text>
          </View>
        ))}
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

type AnswerInfoTileProps = {
  theme: AppTheme;
  label: string;
  value: string;
};

function AnswerInfoTile({ theme, label, value }: AnswerInfoTileProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.answerInfoTile}>
      <Text style={styles.answerInfoTileLabel}>{fixText(label)}</Text>
      <Text style={styles.answerInfoTileValue}>{fixText(value)}</Text>
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
      lineHeight: isPhone ? 30 : theme.typography.title + 6,
      fontWeight: "900",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    heroSubtitle: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      maxWidth: 760
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
    grid: {
      flexDirection: isCompact ? "column" : "row",
      marginHorizontal: 0
    },
    cardWide: {
      flex: 1.2,
      marginRight: isCompact ? 0 : theme.spacing.md
    },
    cardNarrow: {
      flex: 0.8
    },
    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0
    },
    infoTile: {
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
    infoTileLabel: {
      fontSize: theme.typography.helper,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    infoTileValue: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.text
    },
    summaryBadge: {
      minHeight: isPhone ? 120 : 140,
      borderRadius: theme.radius.xl,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    summaryBadgeValue: {
      fontSize: isPhone ? 36 : 42,
      fontWeight: "900",
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs
    },
    summaryBadgeLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    summaryText: {
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.textSecondary
    },
    answerCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
      ...theme.shadow.sm
    },
    answerTop: {
      flexDirection: isPhone ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isPhone ? "stretch" : "center",
      marginBottom: theme.spacing.sm
    },
    answerIndex: {
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs
    },
    answerToneBadge: {
      minHeight: 30,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      justifyContent: "center",
      marginBottom: theme.spacing.xs
    },
    answerToneBadgeSuccess: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.success
    },
    answerToneBadgeDanger: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.danger
    },
    answerToneBadgeText: {
      fontSize: theme.typography.helper,
      fontWeight: "800"
    },
    answerToneBadgeTextSuccess: {
      color: theme.colors.success
    },
    answerToneBadgeTextDanger: {
      color: theme.colors.danger
    },
    answerPrompt: {
      fontSize: theme.typography.sectionTitle,
      lineHeight: 28,
      fontWeight: "900",
      color: theme.colors.text,
      marginBottom: theme.spacing.md
    },
    answerInfoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm
    },
    answerInfoTile: {
      flexBasis: isPhone ? "100%" : 240,
      flexGrow: 1,
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    answerInfoTileLabel: {
      fontSize: theme.typography.helper,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    answerInfoTileValue: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.text
    },
    answerExplanation: {
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.textSecondary
    }
  });
}
