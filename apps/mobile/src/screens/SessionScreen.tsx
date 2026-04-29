import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { ErrorState } from "../components/ui/ErrorState";
import { LatexText } from "../components/ui/LatexText";
import { OfflineState } from "../components/ui/OfflineState";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusPill } from "../components/ui/StatusPill";
import type { LectureItem } from "../mocks/lectures";
import type { Question, SessionData } from "../mocks/session";
import type { AppTheme } from "../theme";
import { fixText } from "../utils/fixText";
import type { LectureBlock, LectureDetails } from "@vm/shared";

type SessionScreenProps = {
  theme: AppTheme;
  lecture: LectureItem;
  session: SessionData;
  lectureDetails?: LectureDetails | null;
  isOffline?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  onBack: () => void;
  onOpenTask: () => void;
};

export function SessionScreen({
  theme,
  lecture,
  session,
  lectureDetails,
  isOffline = false,
  hasError = false,
  onRetry,
  onBack,
  onOpenTask
}: SessionScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  const previewQuestions = session.questions.slice(0, 3);
  const remainingQuestions = Math.max(session.questions.length - previewQuestions.length, 0);
  const activeBlock =
    lectureDetails?.blocks.find((block) => block.id === session.activeBlockId) ??
    lectureDetails?.blocks.find((block) => block.title === session.currentBlockTitle) ??
    null;

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title={fixText(lecture.title)}
        subtitle="Активная сессия занятия"
        rightSlot={
          <View style={styles.headerPills}>
            <StatusPill
              theme={theme}
              label={session.connectionStatus === "online" ? "Online" : "Offline"}
              tone={session.connectionStatus === "online" ? "success" : "warning"}
            />
            <StatusPill
              theme={theme}
              label={session.status === "active" ? "Идёт занятие" : "Ожидание"}
              tone={session.status === "active" ? "info" : "neutral"}
            />
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroEyebrow}>Текущая сессия</Text>
          <Text style={styles.heroTitle}>{fixText(session.currentBlockTitle)}</Text>
          <Text style={styles.heroSubtitle}>
            Здесь отображается краткая сводка по активной лекции, текущему блоку и проверочному материалу.
          </Text>

          <View style={styles.heroActions}>
            <AppButton
              label={`Открыть блок из ${session.questions.length} вопросов`}
              onPress={onOpenTask}
              theme={theme}
              fullWidth={false}
              style={styles.heroButton}
            />
            <AppButton
              label="Назад к лекции"
              onPress={onBack}
              theme={theme}
              variant="secondary"
              fullWidth={false}
              style={styles.heroButton}
            />
          </View>
        </View>

        <View style={styles.heroStats}>
          <MiniStatCard theme={theme} value={session.sessionCode} label="Код сессии" />
          <MiniStatCard theme={theme} value={String(session.participantsCount)} label="Участников" />
          <MiniStatCard theme={theme} value={String(session.questions.length)} label="Вопросов" />
        </View>
      </View>

      {isOffline ? <OfflineState theme={theme} onRetry={onRetry} /> : null}
      {hasError ? <ErrorState theme={theme} onRetry={onRetry} /> : null}

      <SectionCard
        theme={theme}
        title="Сейчас у студента"
        subtitle="Этот блок меняется, когда преподаватель переключает занятие."
      >
        {activeBlock ? (
          <ActiveBlockPreview theme={theme} block={activeBlock} />
        ) : (
          <View style={styles.emptyBlockPreview}>
            <Text style={styles.emptyBlockTitle}>{fixText(session.currentBlockTitle)}</Text>
            <Text style={styles.emptyBlockText}>
              {fixText("Контент блока загрузится после подключения к активной сессии.")}
            </Text>
          </View>
        )}
      </SectionCard>

      <View style={styles.grid}>
        <SectionCard
          theme={theme}
          title="Сводка по сессии"
          subtitle="Ключевые параметры текущего занятия."
          style={styles.cardWide}
        >
          <View style={styles.infoGrid}>
            <InfoTile theme={theme} label="Код сессии" value={session.sessionCode} />
            <InfoTile theme={theme} label="Текущий блок" value={session.currentBlockTitle} />
            <InfoTile theme={theme} label="Участников" value={String(session.participantsCount)} />
            <InfoTile theme={theme} label="Проверочный блок" value={`${session.questions.length} вопросов`} />
          </View>
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Состояние соединения"
          subtitle="Текущий статус связи и лекции."
          style={styles.cardNarrow}
        >
          <View style={styles.statusWrap}>
            <StatusPill
              theme={theme}
              label={session.connectionStatus === "online" ? "Соединение активно" : "Нет соединения"}
              tone={session.connectionStatus === "online" ? "success" : "warning"}
            />
          </View>

          <View style={styles.statusWrap}>
            <StatusPill
              theme={theme}
              label={session.status === "active" ? "Занятие запущено" : "Ожидание запуска"}
              tone={session.status === "active" ? "info" : "neutral"}
            />
          </View>
        </SectionCard>
      </View>

      <SectionCard
        theme={theme}
        title="Структура лекции"
        subtitle="Список активных блоков этой лекции."
      >
        <View style={styles.blockList}>
          {lecture.blocks.map((block, index) => (
            <View key={`${block}-${index}`} style={styles.blockCard}>
              <Text style={styles.blockIndex}>Блок {index + 1}</Text>
              <Text style={styles.blockTitle}>{fixText(block)}</Text>
              <Text style={styles.blockMeta}>
                {fixText(block) === fixText(session.currentBlockTitle) ? "Активный сейчас" : "Ожидает показа"}
              </Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard
        theme={theme}
        title="Preview проверочного блока"
        subtitle="Первые вопросы перед запуском решения."
      >
        {previewQuestions.map((question, index) => (
          <QuestionPreviewCard
            key={question.id}
            theme={theme}
            question={question}
            index={index}
          />
        ))}

        {remainingQuestions > 0 ? (
          <Text style={styles.remainingText}>
            {fixText(`И ещё ${remainingQuestions} вопросов в этом блоке.`)}
          </Text>
        ) : null}

        <View style={styles.bottomActions}>
          <AppButton
            label="Перейти к вопросам"
            onPress={onOpenTask}
            theme={theme}
            fullWidth={false}
            style={styles.bottomButton}
          />
          <AppButton
            label="Назад"
            onPress={onBack}
            theme={theme}
            variant="secondary"
            fullWidth={false}
            style={styles.bottomButton}
          />
        </View>
      </SectionCard>
    </Screen>
  );
}

type ActiveBlockPreviewProps = {
  theme: AppTheme;
  block: LectureBlock;
};

function ActiveBlockPreview({ theme, block }: ActiveBlockPreviewProps) {
  const styles = createStyles(theme, 1200);

  if (block.type === "text") {
    return <LatexText theme={theme} content={block.payload.markdown} />;
  }

  if (block.type === "formula") {
    return <LatexText theme={theme} content={block.payload.markdown || `$$${block.payload.latex}$$`} />;
  }

  if (block.type === "quiz") {
    return (
      <View style={styles.activeQuizWrap}>
        <Text style={styles.activeQuizTitle}>{fixText(block.title ?? "Проверочный блок")}</Text>
        {block.payload.questions.slice(0, 3).map((question, index) => (
          <View key={question.id} style={styles.activeQuizQuestion}>
            <Text style={styles.blockIndex}>{fixText(`Вопрос ${index + 1}`)}</Text>
            <LatexText theme={theme} content={question.text} compact />
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "visual") {
    return (
      <View style={styles.emptyBlockPreview}>
        <Text style={styles.emptyBlockTitle}>{fixText(block.title ?? "Визуальный блок")}</Text>
        <Text style={styles.emptyBlockText}>
          {fixText(block.payload.caption || "Интерактивный визуальный блок.")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyBlockPreview}>
      <Text style={styles.emptyBlockTitle}>{fixText(block.title ?? "Блок")}</Text>
      <Text style={styles.emptyBlockText}>{fixText("Блок готов к показу.")}</Text>
    </View>
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
      <Text numberOfLines={2} style={styles.miniStatValue}>
        {fixText(value)}
      </Text>
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

type QuestionPreviewCardProps = {
  theme: AppTheme;
  question: Question;
  index: number;
};

function QuestionPreviewCard({ theme, question, index }: QuestionPreviewCardProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewTop}>
        <Text style={styles.previewIndex}>{fixText(`Вопрос ${index + 1}`)}</Text>
        <View style={styles.previewTypeBadge}>
          <Text style={styles.previewTypeBadgeText}>{fixText(questionTypeLabel(question))}</Text>
        </View>
      </View>

      <Text style={styles.previewPrompt}>{fixText(question.prompt)}</Text>
    </View>
  );
}

function questionTypeLabel(question: Question): string {
  if (question.type === "single-choice") {
    return "Один вариант";
  }

  if (question.type === "multiple-choice") {
    return "Несколько вариантов";
  }

  return "Короткий ответ";
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
      width: isCompact ? "100%" : 260
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
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    miniStatLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    grid: {
      flexDirection: isCompact ? "column" : "row"
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
      fontWeight: "700",
      color: theme.colors.text
    },
    statusWrap: {
      marginBottom: theme.spacing.sm
    },
    emptyBlockPreview: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg
    },
    emptyBlockTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    emptyBlockText: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary
    },
    activeQuizWrap: {
      gap: theme.spacing.sm
    },
    activeQuizTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    activeQuizQuestion: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md
    },
    blockList: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0
    },
    blockCard: {
      flexBasis: isPhone ? "100%" : 260,
      flexGrow: 1,
      marginHorizontal: 0,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm
    },
    blockIndex: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs
    },
    blockTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    blockMeta: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    previewCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      ...theme.shadow.sm
    },
    previewTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      marginBottom: theme.spacing.sm
    },
    previewIndex: {
      fontSize: theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: "700",
      marginBottom: theme.spacing.xs
    },
    previewTypeBadge: {
      minHeight: 28,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
      marginBottom: theme.spacing.xs
    },
    previewTypeBadgeText: {
      fontSize: theme.typography.helper,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    previewPrompt: {
      fontSize: theme.typography.body,
      color: theme.colors.text,
      lineHeight: 22
    },
    remainingText: {
      fontSize: theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md
    },
    bottomActions: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    bottomButton: {
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    }
  });
}
