import React, { useMemo, useState } from "react";
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
import type { LectureItem } from "../mocks/lectures";
import type { AppTheme } from "../theme";

type CatalogScreenProps = {
  theme: AppTheme;
  lectures: LectureItem[];
  lastOpenedLecture: LectureItem | null;
  isLoading: boolean;
  hasError: boolean;
  isOffline: boolean;
  onRetry: () => void;
  onOpenLecture: (lecture: LectureItem) => void;
};

export function CatalogScreen({
  theme,
  lectures,
  lastOpenedLecture,
  isLoading,
  hasError,
  isOffline,
  onRetry,
  onOpenLecture
}: CatalogScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);
  const [query, setQuery] = useState("");

  const filteredLectures = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return lectures;
    }

    return lectures.filter((lecture) => {
      const haystack = [
        lecture.title,
        lecture.author,
        lecture.subject,
        lecture.semester,
        lecture.level,
        lecture.description,
        ...(lecture.tags ?? [])
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [lectures, query]);

  const totalBlocks = useMemo(
    () => lectures.reduce((sum, lecture) => sum + lecture.blocks.length, 0),
    [lectures]
  );

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Каталог курсов"
        subtitle="Выбирай лекции, продолжай обучение и быстро находи нужные материалы."
        rightSlot={
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{lectures.length} курсов</Text>
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View pointerEvents="none" style={styles.heroGlowPrimary} />
        <View pointerEvents="none" style={styles.heroGlowSecondary} />

        <View style={styles.heroMain}>
          <Text style={styles.heroEyebrow}>Учебный кабинет</Text>
          <Text style={styles.heroTitle}>
            {lastOpenedLecture
              ? `Продолжить: ${lastOpenedLecture.title}`
              : "Открой курс и начни работу"}
          </Text>
          <Text style={styles.heroText}>
            {lastOpenedLecture
              ? "Последняя лекция всегда под рукой. Продолжай с того места, где остановился."
              : "Здесь собраны лекции, визуальные блоки, задания и материалы преподавателя."}
          </Text>

          <View style={styles.signalRow}>
            <HeroSignal theme={theme} label="Лекции" />
            <HeroSignal theme={theme} label="Практика" />
            <HeroSignal theme={theme} label="Материалы" />
          </View>

          <View style={styles.heroActions}>
            {lastOpenedLecture ? (
              <AppButton
                label="Продолжить курс"
                onPress={() => onOpenLecture(lastOpenedLecture)}
                theme={theme}
                fullWidth={false}
                style={styles.heroButton}
              />
            ) : null}

            <AppButton
              label="Обновить каталог"
              onPress={onRetry}
              theme={theme}
              variant="secondary"
              fullWidth={false}
              style={styles.heroButton}
            />
          </View>
        </View>

        <View style={styles.statsRail}>
          <StatCard theme={theme} value={String(lectures.length)} label="Курсов" />
          <StatCard theme={theme} value={String(totalBlocks)} label="Блоков" />
          <StatCard theme={theme} value={isOffline ? "offline" : "online"} label="Режим" />
        </View>
      </View>

      {isOffline ? (
        <View style={styles.bannerInfo}>
          <Text style={styles.bannerInfoTitle}>Оффлайн-режим</Text>
          <Text style={styles.bannerInfoText}>
            Показана сохранённая версия каталога. Некоторые данные могут быть не самыми свежими.
          </Text>
        </View>
      ) : null}

      {hasError ? (
        <View style={styles.bannerError}>
          <View style={styles.bannerErrorTextWrap}>
            <Text style={styles.bannerErrorTitle}>Не удалось обновить каталог</Text>
            <Text style={styles.bannerErrorText}>Проверь соединение и попробуй ещё раз.</Text>
          </View>

          <AppButton
            label="Повторить"
            onPress={onRetry}
            theme={theme}
            variant="secondary"
            fullWidth={false}
          />
        </View>
      ) : null}

      <SectionCard
        title="Поиск по курсам"
        subtitle="Ищи по названию, предмету, автору, описанию и тегам."
        theme={theme}
      >
        <AppInput
          label="Поисковый запрос"
          theme={theme}
          value={query}
          onChangeText={setQuery}
          placeholder="Например: производная, матанализ, пределы..."
        />

        <View style={styles.searchMetaRow}>
          <Text style={styles.searchMetaText}>Найдено: {filteredLectures.length}</Text>
          {query.trim() ? (
            <Pressable onPress={() => setQuery("")} style={styles.clearChip}>
              <Text style={styles.clearChipText}>Сбросить</Text>
            </Pressable>
          ) : null}
        </View>
      </SectionCard>

      {isLoading && lectures.length === 0 ? (
        <View style={styles.grid}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.skeletonCard}>
              <View style={styles.skeletonTitle} />
              <View style={styles.skeletonMeta} />
              <View style={styles.skeletonMetaShort} />
              <View style={styles.skeletonDescription} />
              <View style={styles.skeletonDescriptionShort} />
            </View>
          ))}
        </View>
      ) : filteredLectures.length === 0 ? (
        <SectionCard
          title="Ничего не найдено"
          subtitle="Попробуй другой запрос или очисти поиск."
          theme={theme}
        >
          <AppButton
            label="Сбросить поиск"
            onPress={() => setQuery("")}
            theme={theme}
            variant="secondary"
          />
        </SectionCard>
      ) : (
        <View style={styles.grid}>
          {filteredLectures.map((lecture) => {
            const isLastOpened = lastOpenedLecture?.id === lecture.id;

            return (
              <Pressable
                key={lecture.id}
                onPress={() => onOpenLecture(lecture)}
                style={styles.cardPressable}
              >
                <View style={[styles.lectureCard, isLastOpened ? styles.lectureCardHighlighted : null]}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.badgesRow}>
                      <InfoPill theme={theme} text={lecture.subject} tone="primary" />
                      <InfoPill theme={theme} text={lecture.level} tone="neutral" />
                      {isLastOpened ? <InfoPill theme={theme} text="Продолжить" tone="success" /> : null}
                    </View>
                  </View>

                  <Text style={styles.lectureTitle}>{lecture.title}</Text>

                  <Text style={styles.lectureMeta}>
                    {lecture.author} • {lecture.semester}
                  </Text>

                  <Text numberOfLines={3} style={styles.lectureDescription}>
                    {lecture.description}
                  </Text>

                  <View style={styles.tagsWrap}>
                    {lecture.tags.slice(0, 3).map((tag) => (
                      <View key={tag} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.footerInfoGrid}>
                    <MiniInfoTile theme={theme} label="Блоков" value={String(lecture.blocks.length)} />
                    <MiniInfoTile theme={theme} label="Длительность" value={lecture.estimatedDuration} />
                  </View>

                  <View style={styles.cardFooter}>
                    <AppButton
                      label="Открыть курс"
                      onPress={() => onOpenLecture(lecture)}
                      theme={theme}
                      fullWidth={false}
                      style={styles.openButton}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

type StatCardProps = {
  theme: AppTheme;
  value: string;
  label: string;
};

function StatCard({ theme, value, label }: StatCardProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type MiniInfoTileProps = {
  theme: AppTheme;
  label: string;
  value: string;
};

function MiniInfoTile({ theme, label, value }: MiniInfoTileProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.footerTile}>
      <Text style={styles.footerTileLabel}>{label}</Text>
      <Text style={styles.footerTileValue}>{value}</Text>
    </View>
  );
}

type InfoPillProps = {
  theme: AppTheme;
  text: string;
  tone: "primary" | "neutral" | "success";
};

function InfoPill({ theme, text, tone }: InfoPillProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View
      style={[
        styles.infoPill,
        tone === "primary" ? styles.infoPillPrimary : null,
        tone === "neutral" ? styles.infoPillNeutral : null,
        tone === "success" ? styles.infoPillSuccess : null
      ]}
    >
      <Text
        style={[
          styles.infoPillText,
          tone === "primary" ? styles.infoPillTextPrimary : null,
          tone === "success" ? styles.infoPillTextSuccess : null
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

type HeroSignalProps = {
  theme: AppTheme;
  label: string;
};

function HeroSignal({ theme, label }: HeroSignalProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.heroSignal}>
      <Text style={styles.heroSignalText}>{label}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 560;
  const isCompact = width < 920;

  return StyleSheet.create({
    headerBadge: {
      minHeight: 38,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft
    },
    headerBadgeText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.primary
    },
    heroCard: {
      position: "relative",
      overflow: "hidden",
      flexDirection: isCompact ? "column" : "row",
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
      ...theme.shadow.lg
    },
    heroGlowPrimary: {
      position: "absolute",
      top: -70,
      right: -40,
      width: 220,
      height: 220,
      borderRadius: 999,
      backgroundColor: "rgba(39, 93, 245, 0.10)"
    },
    heroGlowSecondary: {
      position: "absolute",
      bottom: -90,
      left: -50,
      width: 220,
      height: 220,
      borderRadius: 999,
      backgroundColor: "rgba(216, 139, 31, 0.12)"
    },
    heroMain: {
      position: "relative",
      zIndex: 1,
      flex: 1,
      minWidth: 0,
      paddingRight: isCompact ? 0 : theme.spacing.lg,
      marginBottom: isCompact ? theme.spacing.md : 0
    },
    heroEyebrow: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.primary,
      letterSpacing: 0.5,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase"
    },
    heroTitle: {
      fontFamily: theme.fonts.display,
      fontSize: isPhone ? 24 : theme.typography.title,
      lineHeight: isPhone ? 31 : theme.typography.title + 6,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    heroText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      maxWidth: 760
    },
    signalRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.lg
    },
    heroSignal: {
      minHeight: 34,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.82)",
      borderWidth: 1,
      borderColor: "#DCE6F8",
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    heroSignalText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.text
    },
    heroActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center"
    },
    heroButton: {
      width: isPhone ? "100%" : undefined,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    statsRail: {
      position: "relative",
      zIndex: 1,
      width: isCompact ? "100%" : 230
    },
    statCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
      ...theme.shadow.sm
    },
    statValue: {
      fontFamily: theme.fonts.display,
      fontSize: 26,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    statLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary,
      fontWeight: "800"
    },
    bannerInfo: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    bannerInfoTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    bannerInfoText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    bannerError: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      marginBottom: theme.spacing.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap"
    },
    bannerErrorTextWrap: {
      flex: 1,
      minWidth: 240,
      paddingRight: theme.spacing.md
    },
    bannerErrorTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.danger,
      marginBottom: theme.spacing.xs
    },
    bannerErrorText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    searchMetaRow: {
      marginTop: theme.spacing.xs,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap"
    },
    searchMetaText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.textSecondary
    },
    clearChip: {
      minHeight: 34,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center"
    },
    clearChipText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.text
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0
    },
    cardPressable: {
      flexBasis: isPhone ? "100%" : width < 900 ? 320 : 360,
      flexGrow: 1,
      paddingHorizontal: 0,
      marginBottom: theme.spacing.md
    },
    lectureCard: {
      height: "100%",
      minHeight: 320,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm
    },
    lectureCardHighlighted: {
      borderColor: theme.colors.primary,
      backgroundColor: "#F8FBFF",
      ...theme.shadow.md
    },
    cardTopRow: {
      marginBottom: theme.spacing.md
    },
    badgesRow: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    infoPill: {
      minHeight: 30,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      marginRight: theme.spacing.xs,
      marginBottom: theme.spacing.xs
    },
    infoPillPrimary: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primarySoft
    },
    infoPillNeutral: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border
    },
    infoPillSuccess: {
      backgroundColor: "#E6F4EA",
      borderColor: "#E6F4EA"
    },
    infoPillText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.text
    },
    infoPillTextPrimary: {
      color: theme.colors.primary
    },
    infoPillTextSuccess: {
      color: theme.colors.success
    },
    lectureTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.sectionTitle,
      lineHeight: 28,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    lectureMeta: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      fontWeight: "800"
    },
    lectureDescription: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 23,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md
    },
    tagsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.md
    },
    tagChip: {
      minHeight: 28,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      marginRight: theme.spacing.xs,
      marginBottom: theme.spacing.xs
    },
    tagChipText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.textSecondary
    },
    footerInfoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0,
      marginBottom: theme.spacing.md
    },
    footerTile: {
      flexBasis: 140,
      flexGrow: 1,
      padding: theme.spacing.md,
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    footerTileLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    footerTileValue: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text
    },
    cardFooter: {
      marginTop: "auto"
    },
    openButton: {
      alignSelf: "flex-start"
    },
    skeletonCard: {
      flexBasis: isPhone ? "100%" : width < 900 ? 320 : 360,
      flexGrow: 1,
      minHeight: 280,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginHorizontal: 0,
      marginBottom: theme.spacing.md
    },
    skeletonTitle: {
      width: "72%",
      height: 24,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
      marginBottom: theme.spacing.md
    },
    skeletonMeta: {
      width: "56%",
      height: 14,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
      marginBottom: theme.spacing.sm
    },
    skeletonMetaShort: {
      width: "34%",
      height: 14,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
      marginBottom: theme.spacing.lg
    },
    skeletonDescription: {
      width: "100%",
      height: 14,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
      marginBottom: theme.spacing.sm
    },
    skeletonDescriptionShort: {
      width: "78%",
      height: 14,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted
    }
  });
}
