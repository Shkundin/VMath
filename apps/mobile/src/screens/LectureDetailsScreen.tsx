import React from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import type {
  LectureBlock,
  LectureDetails,
  FormulaBlock,
  QuizBlock,
  TextBlock,
  VisualBlock
} from "@vm/shared";

import { AppButton } from "../components/ui/AppButton";
import { LatexText } from "../components/ui/LatexText";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusPill } from "../components/ui/StatusPill";
import { VisualModuleFallback } from "../components/visual/VisualModuleFallback";
import type { LectureItem } from "../mocks/lectures";
import type { AppTheme } from "../theme";
import { fixText, fixTextList } from "../utils/fixText";

type LectureDetailsScreenProps = {
  theme: AppTheme;
  lecture: LectureItem;
  lectureDetails?: LectureDetails | null;
  onBack: () => void;
  onOpenSession: () => void;
};

export function LectureDetailsScreen({
  theme,
  lecture,
  lectureDetails,
  onBack,
  onOpenSession
}: LectureDetailsScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  const videoUrl = String((lecture as { videoUrl?: string }).videoUrl ?? "").trim();
  const blocks = lectureDetails?.blocks ?? [];
  const requirements = fixTextList(
    lecture.id.startsWith("draft-lecture-")
      ? ["Открой лекцию и перейди к занятию.", "После этого можно пройти проверочный блок."]
      : lecture.participationRequirements
  ).filter((item) => {
    const normalized = item.toLowerCase();
    return !normalized.includes("сети") && !normalized.includes("подключ");
  });

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title={fixText(lecture.title)}
        subtitle={fixText(lecture.subject)}
        rightSlot={
          <View style={styles.headerPills}>
            <StatusPill theme={theme} label={fixText(lecture.level)} tone="info" />
            <StatusPill
              theme={theme}
              label={fixText(lecture.id.startsWith("draft-lecture-") ? "15 минут" : lecture.estimatedDuration)}
              tone="neutral"
            />
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroEyebrow}>Карточка лекции</Text>
          <Text style={styles.heroTitle}>{fixText(lecture.title)}</Text>
          <Text style={styles.heroSubtitle}>{fixText(lecture.description)}</Text>

          <View style={styles.tagRow}>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{fixText(lecture.subject)}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{fixText(lecture.semester)}</Text>
            </View>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>{fixText(lecture.level)}</Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <AppButton
              label="Начать занятие"
              onPress={onOpenSession}
              theme={theme}
              fullWidth={false}
              style={styles.heroButton}
            />
            <AppButton
              label="Назад"
              onPress={onBack}
              theme={theme}
              variant="secondary"
              fullWidth={false}
              style={styles.heroButton}
            />
          </View>
        </View>

        <View style={styles.heroStats}>
          <MiniStatCard
            theme={theme}
            value={String(blocks.length > 0 ? blocks.length : lecture.blocks.length)}
            label="Блоков"
          />
          <MiniStatCard theme={theme} value={String(lecture.tags.length)} label="Тегов" />
          <MiniStatCard
            theme={theme}
            value={fixText(lecture.id.startsWith("draft-lecture-") ? "Черновик" : lecture.author)}
            label="Автор"
          />
        </View>
      </View>

      <View style={styles.grid}>
        <SectionCard
          theme={theme}
          title="Основная информация"
          subtitle="Краткая сводка перед началом занятия."
          style={styles.cardWide}
        >
          <View style={styles.infoGrid}>
            <InfoTile
              theme={theme}
              label="Автор"
              value={lecture.id.startsWith("draft-lecture-") ? "Visual Math Team" : lecture.author}
            />
            <InfoTile theme={theme} label="Семестр" value={lecture.semester} />
            <InfoTile theme={theme} label="Предмет" value={lecture.subject} />
            <InfoTile
              theme={theme}
              label="Длительность"
              value={lecture.id.startsWith("draft-lecture-") ? "15 минут" : lecture.estimatedDuration}
            />
          </View>

          <Text style={styles.sectionText}>
            {fixText("Теги")}: {fixText(lecture.tags.join(", "))}
          </Text>
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Подготовка"
          subtitle="Что желательно знать перед открытием занятия."
          style={styles.cardNarrow}
        >
          {requirements.map((item, index) => (
            <Text key={`${item}-${index}`} style={styles.listItem}>
              • {fixText(item)}
            </Text>
          ))}
        </SectionCard>
      </View>

      {videoUrl ? (
        <SectionCard
          title="Видеоматериал"
          subtitle="Дополнительный видеоурок или запись по теме."
          theme={theme}
        >
          <Pressable onPress={() => void Linking.openURL(videoUrl)} style={styles.videoCard}>
            <Text style={styles.videoTitle}>Открыть видео</Text>
            <Text style={styles.videoSubtitle}>{videoUrl}</Text>
          </Pressable>
        </SectionCard>
      ) : null}

      <SectionCard
        theme={theme}
        title="Презентация лекции"
        subtitle="Студент проходит блоки по порядку: сначала один экран, затем следующий."
      >
        {blocks.length > 0 ? (
          <View style={styles.slideDeck}>
            {blocks.map((block, index) => (
              <View key={`${block.type}-${index}`} style={styles.presentationSlide}>
                <View style={styles.slideChrome}>
                  <Text style={styles.slideCounter}>{`${index + 1} / ${blocks.length}`}</Text>
                  <Text style={styles.slideKind}>{fixText(blockLabel(block))}</Text>
                </View>

                <Text style={styles.slideTitle}>{fixText(block.title || blockLabel(block))}</Text>
                <View style={styles.slideBody}>
                  <BlockPreview theme={theme} block={block} embedded />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.slideDeck}>
            {fixTextList(
              lecture.id.startsWith("draft-lecture-") ? ["Теория", "Практика"] : lecture.blocks
            ).map((block, index) => (
              <View key={`${block}-${index}`} style={styles.presentationSlide}>
                <View style={styles.slideChrome}>
                  <Text style={styles.slideCounter}>{`${index + 1} / ${lecture.blocks.length || 2}`}</Text>
                  <Text style={styles.slideKind}>{fixText(block)}</Text>
                </View>
                <Text style={styles.slideTitle}>{fixText(block)}</Text>
                <Text style={styles.slidePlaceholder}>
                  {fixText("Материал появится здесь как отдельный экран презентации.")}
                </Text>
              </View>
            ))}
          </View>
        )}
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

type BlockSummaryProps = {
  theme: AppTheme;
  block: LectureBlock;
};

function BlockSummary({ theme, block }: BlockSummaryProps) {
  const styles = createStyles(theme, 1200);

  if (block.type === "text") {
    const textBlock = block as TextBlock;
    const lines = textBlock.payload.markdown
      .split("\n")
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .filter(Boolean);

    return (
      <Text numberOfLines={3} style={styles.blockSummaryText}>
        {fixText(lines.slice(0, 3).join(" "))}
      </Text>
    );
  }

  if (block.type === "formula") {
    const formulaBlock = block as FormulaBlock;
    return (
      <LatexText
        theme={theme}
        compact
        content={formulaBlock.payload.markdown || `$$${formulaBlock.payload.latex}$$`}
      />
    );
  }

  if (block.type === "visual") {
    const visualBlock = block as VisualBlock;
    return (
      <Text numberOfLines={3} style={styles.blockSummaryText}>
        {fixText(visualBlock.payload.caption || "Интерактивный визуальный модуль для этой лекции.")}
      </Text>
    );
  }

  if (block.type !== "quiz" && block.type !== "checking_block") {
    return (
      <Text numberOfLines={3} style={styles.blockSummaryText}>
        {fixText("Медиа-блок лекции. Открой занятие, чтобы посмотреть содержимое.")}
      </Text>
    );
  }

  const quizBlock = block as QuizBlock;
  return (
    <Text style={styles.blockSummaryText}>
      {fixText(`Вопросов: ${quizBlock.payload.questions.length}. Ограничение: ${quizBlock.payload.timeLimitSec ?? 0} сек.`)}
    </Text>
  );
}

type BlockPreviewProps = {
  theme: AppTheme;
  block: LectureBlock;
  embedded?: boolean;
};

function BlockPreview({ theme, block, embedded = false }: BlockPreviewProps) {
  const styles = createStyles(theme, 1200);

  if (block.type === "text") {
    const textBlock = block as TextBlock;

    return (
      <View style={embedded ? styles.embeddedPreview : undefined}>
        <LatexText theme={theme} content={textBlock.payload.markdown} />
      </View>
    );
  }

  if (block.type === "formula") {
    const formulaBlock = block as FormulaBlock;

    return (
      <View style={embedded ? styles.embeddedPreview : undefined}>
        <LatexText
          theme={theme}
          content={formulaBlock.payload.markdown || `$$${formulaBlock.payload.latex}$$`}
        />
      </View>
    );
  }

  if (block.type === "visual") {
    const visualBlock = block as VisualBlock;
    const sceneName =
      typeof visualBlock.payload.scene === "object" &&
      visualBlock.payload.scene !== null &&
      "preset" in visualBlock.payload.scene
        ? String((visualBlock.payload.scene as { preset?: unknown }).preset ?? "scene")
        : "scene";

    return (
      <View style={embedded ? styles.embeddedPreview : undefined}>
        <Text style={styles.sectionText}>{fixText(`Сцена: ${sceneName}`)}</Text>
        <VisualModuleFallback
          theme={theme}
          compact
          title="Preview визуального модуля"
          description="Пока здесь безопасный UI-fallback. Позже этот контейнер можно заменить на реальный рендер VM Graphics."
        />
      </View>
    );
  }

  if (block.type !== "quiz" && block.type !== "checking_block") {
    return (
      <View style={embedded ? styles.embeddedPreview : undefined}>
        <Text style={styles.sectionText}>
          {fixText("Этот блок содержит дополнительный материал лекции.")}
        </Text>
      </View>
    );
  }

  const quizBlock = block as QuizBlock;

  return (
    <View style={embedded ? styles.embeddedPreview : undefined}>
      <Text style={styles.sectionText}>
        {fixText(`Ограничение по времени: ${quizBlock.payload.timeLimitSec ?? 0} сек.`)}
      </Text>

      {quizBlock.payload.questions.map((question, questionIndex) => (
        <View key={`${question.text}-${questionIndex}`} style={styles.quizPreviewQuestion}>
          <Text style={styles.listItem}>{questionIndex + 1}.</Text>
          <LatexText theme={theme} compact content={question.text} />
        </View>
      ))}
    </View>
  );
}

function blockLabel(block: LectureBlock): string {
  if (block.type === "text") {
    return "Текст";
  }

  if (block.type === "formula") {
    return "Формула";
  }

  if (block.type === "visual") {
    return "Визуализация";
  }

  return "Проверка";
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
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.md
    },
    infoBadge: {
      minHeight: 34,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    infoBadgeText: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.text
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
    sectionText: {
      fontSize: theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      lineHeight: 22
    },
    listItem: {
      fontSize: theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      lineHeight: 22
    },
    videoCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    videoTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs
    },
    videoSubtitle: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    blockList: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0
    },
    slideDeck: {
      gap: theme.spacing.md
    },
    presentationSlide: {
      minHeight: isPhone ? 360 : 430,
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.md
    },
    slideChrome: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      marginBottom: theme.spacing.md
    },
    slideCounter: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary
    },
    slideKind: {
      minHeight: 30,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      overflow: "hidden",
      backgroundColor: theme.colors.primarySoft,
      color: theme.colors.primary,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    },
    slideTitle: {
      fontSize: isPhone ? 24 : 32,
      lineHeight: isPhone ? 30 : 38,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.lg
    },
    slideBody: {
      flex: 1,
      minHeight: 0
    },
    slidePlaceholder: {
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.textSecondary
    },
    embeddedPreview: {
      width: "100%"
    },
    blockSummaryCard: {
      flexBasis: isPhone ? "100%" : 300,
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
    blockSummaryTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      marginBottom: theme.spacing.sm
    },
    blockIndex: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs
    },
    blockTypeBadge: {
      minHeight: 28,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
      marginBottom: theme.spacing.xs
    },
    blockTypeBadgeText: {
      fontSize: theme.typography.helper,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    blockTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    blockSummaryText: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary
    },
    previewSpacing: {
      marginTop: theme.spacing.sm
    },
    previewTextLine: {
      fontSize: theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      lineHeight: 22
    },
    quizPreviewQuestion: {
      marginBottom: theme.spacing.sm
    }
  });
}
