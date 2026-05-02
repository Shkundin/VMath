import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import type {
  FormulaBlock,
  LectureBlock,
  LectureDetails,
  QuizBlock,
  QuizQuestion,
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
  onSaveLectureTestResult?: (result: {
    lectureId: string;
    lectureTitle: string;
    blockId: string;
    blockTitle: string;
    correctCount: number;
    totalQuestions: number;
    percent: number;
  }) => void;
};

export function LectureDetailsScreen({
  theme,
  lecture,
  lectureDetails,
  onBack,
  onSaveLectureTestResult
}: LectureDetailsScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  const videoUrl = String((lecture as { videoUrl?: string }).videoUrl ?? "").trim();
  const blocks = lectureDetails?.blocks ?? [];
  const fallbackSlides = useMemo(
    () => fixTextList(lecture.id.startsWith("draft-lecture-") ? ["Теория", "Практика"] : lecture.blocks),
    [lecture.blocks, lecture.id]
  );
  const totalSlides = blocks.length > 0 ? blocks.length : fallbackSlides.length;
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkedBlocks, setCheckedBlocks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setActiveSlideIndex(0);
    setAnswers({});
    setCheckedBlocks({});
  }, [lecture.id]);

  function goBackSlide() {
    setActiveSlideIndex((current) => Math.max(0, current - 1));
  }

  function goNextSlide() {
    setActiveSlideIndex((current) => Math.min(Math.max(totalSlides - 1, 0), current + 1));
  }

  function selectAnswer(questionId: string, optionId: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: optionId
    }));
  }

  function checkBlock(blockId: string) {
    const block = blocks.find((item) => item.id === blockId);
    if ((block?.type === "quiz" || block?.type === "checking_block") && onSaveLectureTestResult) {
      const quizBlock = block as QuizBlock;
      const totalQuestions = quizBlock.payload.questions.length;
      const correctCount = quizBlock.payload.questions.filter((question) =>
        isQuestionAnswerCorrect(question, answers[question.id])
      ).length;

      onSaveLectureTestResult({
        lectureId: lecture.id,
        lectureTitle: lecture.title,
        blockId: block.id,
        blockTitle: block.title || "Практика",
        correctCount,
        totalQuestions,
        percent: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
      });
    }

    setCheckedBlocks((current) => ({
      ...current,
      [blockId]: true
    }));
  }

  const activeBlock = blocks[activeSlideIndex] ?? null;
  const activeFallbackSlide = fallbackSlides[activeSlideIndex] ?? null;

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
              label={fixText(totalSlides > 0 ? `${totalSlides} слайд.` : lecture.estimatedDuration)}
              tone="neutral"
            />
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.heroMain}>
          <Text style={styles.heroEyebrow}>Лекция</Text>
          <Text style={styles.heroTitle}>{fixText(lecture.title)}</Text>
          <Text style={styles.heroSubtitle}>{fixText(lecture.description)}</Text>

          <View style={styles.tagRow}>
            <InfoBadge theme={theme} label={lecture.subject} />
            <InfoBadge theme={theme} label={lecture.semester} />
            <InfoBadge theme={theme} label={lecture.level} />
          </View>

          <View style={styles.heroActions}>
            <AppButton
              label="Назад"
              onPress={onBack}
              theme={theme}
              variant="secondary"
              fullWidth={false}
              style={styles.inlineButton}
            />
            {videoUrl ? (
              <AppButton
                label="Открыть видео"
                onPress={() => void Linking.openURL(videoUrl)}
                theme={theme}
                variant="secondary"
                fullWidth={false}
                style={styles.inlineButton}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.heroStats}>
          <MiniStatCard theme={theme} value={String(totalSlides)} label="Слайдов" />
          <MiniStatCard theme={theme} value={String(lecture.tags.length)} label="Тегов" />
          <MiniStatCard
            theme={theme}
            value={fixText(lecture.id.startsWith("draft-lecture-") ? "Черновик" : lecture.author)}
            label="Автор"
          />
        </View>
      </View>

      <SectionCard
        theme={theme}
        title="Материал лекции"
        subtitle="Листай слайды снизу. Практику можно пройти прямо здесь, без запуска занятия."
      >
        {activeBlock ? (
          <LectureSlide
            theme={theme}
            styles={styles}
            block={activeBlock}
            slideIndex={activeSlideIndex}
            totalSlides={blocks.length}
            answers={answers}
            checked={Boolean(checkedBlocks[activeBlock.id])}
            onSelectAnswer={selectAnswer}
            onCheck={() => checkBlock(activeBlock.id)}
          />
        ) : (
          <View style={styles.presentationSlide}>
            <View style={styles.slideChrome}>
              <Text style={styles.slideCounter}>{`${Math.min(activeSlideIndex + 1, totalSlides || 1)} / ${totalSlides || 1}`}</Text>
              <Text style={styles.slideKind}>{fixText(activeFallbackSlide || "Материал")}</Text>
            </View>
            <Text style={styles.slideTitle}>{fixText(activeFallbackSlide || "Материал")}</Text>
            <Text style={styles.slidePlaceholder}>
              {fixText("Материал появится здесь, когда блоки лекции загрузятся.")}
            </Text>
          </View>
        )}

        <SlideControls
          theme={theme}
          styles={styles}
          activeIndex={activeSlideIndex}
          totalSlides={totalSlides}
          onBack={goBackSlide}
          onNext={goNextSlide}
        />
      </SectionCard>
    </Screen>
  );
}

type LectureSlideProps = {
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
  block: LectureBlock;
  slideIndex: number;
  totalSlides: number;
  answers: Record<string, string>;
  checked: boolean;
  onSelectAnswer: (questionId: string, optionId: string) => void;
  onCheck: () => void;
};

function LectureSlide({
  theme,
  styles,
  block,
  slideIndex,
  totalSlides,
  answers,
  checked,
  onSelectAnswer,
  onCheck
}: LectureSlideProps) {
  return (
    <View style={styles.presentationSlide}>
      <View style={styles.slideChrome}>
        <Text style={styles.slideCounter}>{`${slideIndex + 1} / ${totalSlides}`}</Text>
        <Text style={styles.slideKind}>{fixText(blockLabel(block))}</Text>
      </View>

      <Text style={styles.slideTitle}>{fixText(block.title || blockLabel(block))}</Text>

      <View style={styles.slideBody}>
        <BlockContent
          theme={theme}
          styles={styles}
          block={block}
          answers={answers}
          checked={checked}
          onSelectAnswer={onSelectAnswer}
          onCheck={onCheck}
        />
      </View>
    </View>
  );
}

type BlockContentProps = {
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
  block: LectureBlock;
  answers: Record<string, string>;
  checked: boolean;
  onSelectAnswer: (questionId: string, optionId: string) => void;
  onCheck: () => void;
};

function BlockContent({
  theme,
  styles,
  block,
  answers,
  checked,
  onSelectAnswer,
  onCheck
}: BlockContentProps) {
  if (block.type === "text") {
    const textBlock = block as TextBlock;
    return <LatexText theme={theme} content={normalizeLatexContent(textBlock.payload.markdown)} />;
  }

  if (block.type === "formula") {
    const formulaBlock = block as FormulaBlock;
    return (
      <LatexText
        theme={theme}
        content={normalizeLatexContent(formulaBlock.payload.markdown || `$$${formulaBlock.payload.latex}$$`)}
      />
    );
  }

  if (block.type === "visual" || block.type === "visual_module") {
    const visualBlock = block as VisualBlock;
    return (
      <VisualModuleFallback
        theme={theme}
        compact
        title={fixText(visualBlock.title || "Визуализация")}
        description={fixText(visualBlock.payload.caption || "Интерактивный визуальный блок лекции.")}
      />
    );
  }

  if (block.type === "quiz" || block.type === "checking_block") {
    const quizBlock = block as QuizBlock;
    return (
      <QuizSlideContent
        theme={theme}
        styles={styles}
        block={quizBlock}
        answers={answers}
        checked={checked}
        onSelectAnswer={onSelectAnswer}
        onCheck={onCheck}
      />
    );
  }

  return (
    <Text style={styles.sectionText}>
      {fixText("Этот блок содержит дополнительный материал лекции.")}
    </Text>
  );
}

type QuizSlideContentProps = {
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
  block: QuizBlock;
  answers: Record<string, string>;
  checked: boolean;
  onSelectAnswer: (questionId: string, optionId: string) => void;
  onCheck: () => void;
};

function QuizSlideContent({
  theme,
  styles,
  block,
  answers,
  checked,
  onSelectAnswer,
  onCheck
}: QuizSlideContentProps) {
  const questions = block.payload.questions;
  const answeredCount = questions.filter((question) => Boolean(answers[question.id])).length;
  const correctCount = checked
    ? questions.filter((question) => isQuestionAnswerCorrect(question, answers[question.id])).length
    : 0;

  if (questions.length === 0) {
    return <Text style={styles.sectionText}>{fixText("В этом практическом блоке пока нет вопросов.")}</Text>;
  }

  return (
    <View>
      <View style={styles.quizProgressRow}>
        <Text style={styles.quizProgressText}>{fixText(`Отвечено: ${answeredCount}/${questions.length}`)}</Text>
        {checked ? (
          <Text style={styles.quizResultText}>{fixText(`Верно: ${correctCount}/${questions.length}`)}</Text>
        ) : null}
      </View>

      {questions.map((question, questionIndex) => (
        <View key={question.id} style={styles.quizQuestionCard}>
          <Text style={styles.quizQuestionTitle}>{fixText(`Вопрос ${questionIndex + 1}`)}</Text>
          <LatexText theme={theme} content={normalizeLatexContent(question.text)} compact />

          {(question.options ?? []).map((option) => {
            const selected = answers[question.id] === option.id;
            const correct = isOptionCorrect(question, option.id);
            const showSuccess = checked && selected && correct;
            const showError = checked && selected && !correct;
            const showCorrect = checked && correct;

            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelectAnswer(question.id, option.id)}
                style={[
                  styles.answerCard,
                  selected ? styles.answerCardSelected : null,
                  showCorrect ? styles.answerCardCorrect : null,
                  showError ? styles.answerCardWrong : null
                ]}
              >
                <View style={[
                  styles.answerRadio,
                  selected ? styles.answerRadioSelected : null,
                  showSuccess ? styles.answerRadioCorrect : null,
                  showError ? styles.answerRadioWrong : null
                ]} />
                <LatexText theme={theme} content={normalizeLatexContent(option.text)} compact />
              </Pressable>
            );
          })}

          {checked && question.explanation ? (
            <Text style={styles.quizExplanation}>{fixText(question.explanation)}</Text>
          ) : null}
        </View>
      ))}

      <AppButton
        label={checked ? "Проверено" : "Проверить ответы"}
        onPress={onCheck}
        theme={theme}
        disabled={answeredCount === 0}
        style={styles.checkButton}
      />
    </View>
  );
}

type SlideControlsProps = {
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
  activeIndex: number;
  totalSlides: number;
  onBack: () => void;
  onNext: () => void;
};

function SlideControls({
  theme,
  styles,
  activeIndex,
  totalSlides,
  onBack,
  onNext
}: SlideControlsProps) {
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex < totalSlides - 1;

  return (
    <View style={styles.slideControls}>
      <AppButton
        label="Назад"
        onPress={onBack}
        theme={theme}
        variant="secondary"
        disabled={!hasPrevious}
        fullWidth={false}
        style={styles.slideControlButton}
      />
      <Text style={styles.slideControlsText}>{fixText(`${Math.min(activeIndex + 1, totalSlides || 1)} из ${totalSlides || 1}`)}</Text>
      <AppButton
        label="Далее"
        onPress={onNext}
        theme={theme}
        disabled={!hasNext}
        fullWidth={false}
        style={styles.slideControlButton}
      />
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
      <Text numberOfLines={2} style={styles.miniStatValue}>{fixText(value)}</Text>
      <Text style={styles.miniStatLabel}>{fixText(label)}</Text>
    </View>
  );
}

type InfoBadgeProps = {
  theme: AppTheme;
  label: string;
};

function InfoBadge({ theme, label }: InfoBadgeProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.infoBadge}>
      <Text style={styles.infoBadgeText}>{fixText(label)}</Text>
    </View>
  );
}

function blockLabel(block: LectureBlock): string {
  if (block.type === "text") {
    return "Теория";
  }

  if (block.type === "formula") {
    return "Формула";
  }

  if (block.type === "visual" || block.type === "visual_module") {
    return "Визуализация";
  }

  if (block.type === "quiz" || block.type === "checking_block") {
    return "Практика";
  }

  return "Материал";
}

function normalizeLatexContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const hasInlineFormula =
        trimmed.includes("$") ||
        trimmed.includes("\\(") ||
        trimmed.includes("\\)") ||
        trimmed.includes("\\[") ||
        trimmed.includes("\\]");
      const isWrapped =
        trimmed.startsWith("$") ||
        trimmed.startsWith("\\(") ||
        trimmed.startsWith("\\[") ||
        trimmed.startsWith("#") ||
        trimmed.startsWith("- ") ||
        trimmed.startsWith("* ");
      const looksLikeLatex = /\\[a-zA-Z]+|[_^]\{?/.test(trimmed);

      if (!trimmed || hasInlineFormula || isWrapped || !looksLikeLatex) {
        return line;
      }

      return `$$${trimmed}$$`;
    })
    .join("\n");
}

function isOptionCorrect(question: QuizQuestion, optionId: string): boolean {
  if (question.correctOptionId) {
    return question.correctOptionId === optionId;
  }

  if (Array.isArray(question.correctOptionIds)) {
    return question.correctOptionIds.includes(optionId);
  }

  return Boolean(question.options?.find((option) => option.id === optionId)?.isCorrect);
}

function isQuestionAnswerCorrect(question: QuizQuestion, optionId?: string): boolean {
  return Boolean(optionId && isOptionCorrect(question, optionId));
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
    inlineButton: {
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
    presentationSlide: {
      minHeight: isPhone ? 420 : 520,
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
      marginBottom: theme.spacing.lg
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
      fontSize: isPhone ? 26 : 38,
      lineHeight: isPhone ? 32 : 44,
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
    sectionText: {
      fontSize: theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      lineHeight: 22
    },
    quizProgressRow: {
      flexDirection: isPhone ? "column" : "row",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md
    },
    quizProgressText: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: isPhone ? theme.spacing.xs : 0
    },
    quizResultText: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.success
    },
    quizQuestionCard: {
      borderRadius: theme.radius.lg,
      padding: isPhone ? theme.spacing.md : theme.spacing.lg,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    quizQuestionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    answerCard: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 52,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing.sm
    },
    answerCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft
    },
    answerCardCorrect: {
      borderColor: theme.colors.success,
      backgroundColor: "#E6F4EA"
    },
    answerCardWrong: {
      borderColor: theme.colors.danger,
      backgroundColor: "#FDECEC"
    },
    answerRadio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.sm
    },
    answerRadioSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary
    },
    answerRadioCorrect: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.success
    },
    answerRadioWrong: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.danger
    },
    quizExplanation: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm
    },
    checkButton: {
      marginTop: theme.spacing.sm
    },
    slideControls: {
      flexDirection: isPhone ? "column" : "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md
    },
    slideControlButton: {
      width: isPhone ? "100%" : 220
    },
    slideControlsText: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      textAlign: "center"
    }
  });
}
