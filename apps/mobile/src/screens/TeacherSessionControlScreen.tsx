import React, { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StateCallout } from "../components/ui/StateCallout";
import {
  getTeacherCurrentBlock,
  type TeacherManagedSession,
  type TeacherParticipant,
  type TeacherParticipantStatus
} from "../mocks/teacher";
import type { AppTheme } from "../theme";
import { fixTextSafe as fixText } from "../utils/fixTextSafe";

type TeacherSessionControlScreenProps = {
  theme: AppTheme;
  session: TeacherManagedSession;
  onBack: () => void;
  onStart: () => void;
  onStop: () => void;
  onPrevBlock: () => void;
  onNextBlock: () => void;
};

type StoredTeacherStats = {
  completed: number;
  totalScore: number;
  lastCorrectCount: number;
  updatedAt: string;
};

const TEACHER_STATS_KEY = "vm.teacher.session.stats.v1";

function readStoredStats(lectureId: string): StoredTeacherStats | null {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (!storage) {
      return null;
    }

    const raw = storage.getItem(TEACHER_STATS_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, StoredTeacherStats>;
    return parsed[lectureId] ?? null;
  } catch {
    return null;
  }
}

function getSessionStatusLabel(status: TeacherManagedSession["status"]): string {
  if (status === "active") {
    return "Активна";
  }

  if (status === "stopped") {
    return "Остановлена";
  }

  return "Подготовка";
}

function getParticipantStatusLabel(status: TeacherParticipantStatus): string {
  if (status === "online") {
    return "На связи";
  }

  if (status === "in-progress") {
    return "В процессе";
  }

  if (status === "completed") {
    return "Завершил";
  }

  return "Не в сети";
}

function getParticipantTone(
  status: TeacherParticipantStatus
): "success" | "warning" | "info" | "neutral" {
  if (status === "completed") {
    return "success";
  }

  if (status === "in-progress") {
    return "info";
  }

  if (status === "online") {
    return "warning";
  }

  return "neutral";
}

function formatStartedAt(value: string | null): string {
  if (!value) {
    return "ещё не начата";
  }

  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "ещё не начата";
  }
}

function formatDurationFromStart(value: string | null, nowTs: number): string {
  if (!value) {
    return "00:00";
  }

  const diff = Math.max(0, nowTs - new Date(value).getTime());
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function sortParticipants(participants: TeacherParticipant[]): TeacherParticipant[] {
  const order: Record<TeacherParticipantStatus, number> = {
    "in-progress": 0,
    online: 1,
    completed: 2,
    offline: 3
  };

  return [...participants].sort((left, right) => {
    const byStatus = order[left.status] - order[right.status];
    if (byStatus !== 0) {
      return byStatus;
    }

    return (right.score ?? -1) - (left.score ?? -1);
  });
}

async function copyText(value: string): Promise<boolean> {
  try {
    const maybeNavigator = globalThis as typeof globalThis & {
      navigator?: { clipboard?: { writeText?: (text: string) => Promise<void> } };
    };

    if (maybeNavigator.navigator?.clipboard?.writeText) {
      await maybeNavigator.navigator.clipboard.writeText(value);
      return true;
    }

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      textarea.remove();
      return success;
    }
  } catch {}

  return false;
}

export function TeacherSessionControlScreen({
  theme,
  session,
  onBack,
  onStart,
  onStop,
  onPrevBlock,
  onNextBlock
}: TeacherSessionControlScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);
  const isCompact = width < 920;
  const currentBlock = getTeacherCurrentBlock(session);

  const [storedStats, setStoredStats] = useState<StoredTeacherStats | null>(
    readStoredStats(session.lectureId)
  );
  const [nowTs, setNowTs] = useState(Date.now());
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    setStoredStats(readStoredStats(session.lectureId));

    const statsIntervalId = setInterval(() => {
      setStoredStats(readStoredStats(session.lectureId));
    }, 30000);

    const timerId = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    function handleStorage() {
      setStoredStats(readStoredStats(session.lectureId));
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      clearInterval(statsIntervalId);
      clearInterval(timerId);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, [session.lectureId]);

  useEffect(() => {
    if (!copyState) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setCopyState("");
    }, 2200);

    return () => clearTimeout(timeoutId);
  }, [copyState]);

  const participantStats = useMemo(
    () => ({
      online: session.participants.filter((item) => item.status === "online").length,
      inProgress: session.participants.filter((item) => item.status === "in-progress").length,
      completed: session.participants.filter((item) => item.status === "completed").length,
      offline: session.participants.filter((item) => item.status === "offline").length
    }),
    [session.participants]
  );

  const sortedParticipants = useMemo(
    () => sortParticipants(session.participants),
    [session.participants]
  );

  const completedCount = storedStats?.completed ?? participantStats.completed;
  const totalScore =
    storedStats?.totalScore ??
    session.participants.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const lastCorrectCount = storedStats?.lastCorrectCount ?? null;
  const isActive = session.status === "active";
  const startedAtLabel = formatStartedAt(session.startedAt);
  const durationLabel = formatDurationFromStart(session.startedAt, nowTs);
  const connectedCount =
    participantStats.online + participantStats.inProgress + participantStats.completed;
  const engagementPercent =
    session.participants.length > 0
      ? Math.round((connectedCount / session.participants.length) * 100)
      : 0;
  const averageScore =
    completedCount > 0 ? Math.round(totalScore / completedCount) : 0;

  async function handleCopySessionCode() {
    const success = await copyText(session.sessionCode);
    setCopyState(
      success
        ? "Код занятия скопирован."
        : "Не удалось скопировать код автоматически."
    );
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Общая сессия"
        subtitle="Управляй ходом занятия, переключай блоки и отслеживай прогресс группы в одном экране."
        rightSlot={
          <View
            style={[
              styles.statusBadge,
              isActive ? styles.statusBadgeActive : styles.statusBadgeDraft
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isActive ? styles.statusBadgeTextActive : null
              ]}
            >
              {getSessionStatusLabel(session.status)}
            </Text>
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.heroGlowPrimary} />
        <View style={styles.heroGlowSecondary} />

        <View style={styles.heroMain}>
          <Text style={styles.heroEyebrow}>VisualMath Session</Text>
          <Text style={styles.heroTitle}>{fixText(session.lectureTitle)}</Text>
          <Text style={styles.heroSubtitle}>
            Код сессии {fixText(session.sessionCode)} • блок {session.currentBlockIndex + 1} из{" "}
            {session.blocks.length}
          </Text>

          <View style={styles.heroMetaRow}>
            <HeroChip theme={theme} label={`Текущий блок: ${fixText(currentBlock)}`} />
            <HeroChip theme={theme} label={`Вопросов: ${session.questionPreview.length}`} />
            <HeroChip theme={theme} label={`Старт: ${startedAtLabel}`} />
            <HeroChip theme={theme} label={`Длительность: ${durationLabel}`} />
          </View>
        </View>

        <View style={styles.heroAside}>
          <MetricCard theme={theme} value={String(completedCount)} label="Завершили" />
          <MetricCard
            theme={theme}
            value={String(participantStats.inProgress)}
            label="В процессе"
          />
          <MetricCard theme={theme} value={String(totalScore)} label="Сумма баллов" />
        </View>
      </View>

      <View style={styles.grid}>
        <SectionCard
          theme={theme}
          title="Управление сессией"
          subtitle="Запуск, остановка, копирование кода и быстрый возврат в кабинет преподавателя."
          style={styles.cardWide}
        >
          <View style={styles.actionStack}>
            <AppButton
              label={isActive ? "Сессия уже запущена" : "Запустить общую сессию"}
              onPress={onStart}
              theme={theme}
              disabled={isActive}
            />

            <View style={styles.inlineActions}>
              <AppButton
                label="Скопировать код"
                onPress={() => {
                  void handleCopySessionCode();
                }}
                theme={theme}
                variant="secondary"
                fullWidth={false}
                style={styles.inlineButton}
              />

              <AppButton
                label="Остановить сессию"
                onPress={onStop}
                theme={theme}
                variant="secondary"
                disabled={!isActive}
                fullWidth={false}
                style={styles.inlineButton}
              />

              <AppButton
                label="Вернуться в кабинет"
                onPress={onBack}
                theme={theme}
                variant="ghost"
                fullWidth={false}
                style={styles.inlineButton}
              />
            </View>
          </View>

          {copyState ? <Text style={styles.helperText}>{copyState}</Text> : null}
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Текущий блок"
          subtitle="Переключай содержимое занятия и держи общий темп группы."
          style={styles.cardNarrow}
        >
          <Text style={styles.currentBlockLabel}>Сейчас у студентов открыт</Text>
          <Text style={styles.currentBlockValue}>{fixText(currentBlock)}</Text>
          <Text style={styles.currentBlockHint}>
            Позиция {session.currentBlockIndex + 1} / {session.blocks.length}
          </Text>

          <View
            style={[
              styles.doubleActionRow,
              isCompact ? styles.doubleActionRowCompact : null
            ]}
          >
            <View style={styles.doubleActionItem}>
              <AppButton
                label="Предыдущий блок"
                onPress={onPrevBlock}
                theme={theme}
                variant="secondary"
              />
            </View>

            <View style={styles.doubleActionItem}>
              <AppButton label="Следующий блок" onPress={onNextBlock} theme={theme} />
            </View>
          </View>
        </SectionCard>
      </View>

      <View style={styles.grid}>
        <SectionCard
          theme={theme}
          title="Сводка группы"
          subtitle="Живое состояние участников по текущей общей сессии."
          style={styles.cardWide}
        >
          <View style={styles.summaryGrid}>
            <SummaryTile
              theme={theme}
              value={String(participantStats.online)}
              label="На связи"
              tone="warning"
            />
            <SummaryTile
              theme={theme}
              value={String(participantStats.inProgress)}
              label="В процессе"
              tone="info"
            />
            <SummaryTile
              theme={theme}
              value={String(completedCount)}
              label="Завершили"
              tone="success"
            />
            <SummaryTile
              theme={theme}
              value={`${engagementPercent}%`}
              label="Вовлечённость"
              tone="neutral"
            />
          </View>

          <View style={styles.summaryInlineCards}>
            <MetricCard theme={theme} value={String(averageScore)} label="Средний балл" />
            <MetricCard
              theme={theme}
              value={lastCorrectCount === null ? "—" : String(lastCorrectCount)}
              label="Последний результат"
            />
          </View>
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Участники"
          subtitle="Статус, баллы и готовность студентов."
          style={styles.cardNarrow}
        >
          {sortedParticipants.length === 0 ? (
            <StateCallout
              theme={theme}
              title="Пока нет участников"
              description="Когда студенты подключатся к общей сессии, здесь появятся их статусы и результаты."
              tone="info"
            />
          ) : (
            sortedParticipants.map((participant) => (
              <View key={participant.id} style={styles.participantRow}>
                <View style={styles.participantMeta}>
                  <Text style={styles.participantName}>{fixText(participant.name)}</Text>
                  <View
                    style={[
                      styles.participantPill,
                      getParticipantTone(participant.status) === "success"
                        ? styles.participantPillSuccess
                        : null,
                      getParticipantTone(participant.status) === "info"
                        ? styles.participantPillInfo
                        : null,
                      getParticipantTone(participant.status) === "warning"
                        ? styles.participantPillWarning
                        : null
                    ]}
                  >
                    <Text style={styles.participantPillText}>
                      {getParticipantStatusLabel(participant.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.participantDetails}>
                  Баллы: {participant.score ?? "—"} • Верно: {participant.correctCount ?? "—"} •
                  Вопросов: {participant.totalQuestions ?? "—"}
                </Text>
              </View>
            ))
          )}
        </SectionCard>
      </View>
    </Screen>
  );
}

type MetricCardProps = {
  theme: AppTheme;
  value: string;
  label: string;
};

function MetricCard({ theme, value, label }: MetricCardProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{fixText(value)}</Text>
      <Text style={styles.metricLabel}>{fixText(label)}</Text>
    </View>
  );
}

type HeroChipProps = {
  theme: AppTheme;
  label: string;
};

function HeroChip({ theme, label }: HeroChipProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View style={styles.heroChip}>
      <Text style={styles.heroChipText}>{fixText(label)}</Text>
    </View>
  );
}

type SummaryTileProps = {
  theme: AppTheme;
  value: string;
  label: string;
  tone: "success" | "warning" | "info" | "neutral";
};

function SummaryTile({ theme, value, label, tone }: SummaryTileProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View
      style={[
        styles.summaryTile,
        tone === "success" ? styles.summaryTileSuccess : null,
        tone === "warning" ? styles.summaryTileWarning : null,
        tone === "info" ? styles.summaryTileInfo : null
      ]}
    >
      <Text style={styles.summaryValue}>{fixText(value)}</Text>
      <Text style={styles.summaryLabel}>{fixText(label)}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 560;
  const isCompact = width < 920;

  return StyleSheet.create({
    statusBadge: {
      minHeight: 38,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1
    },
    statusBadgeActive: {
      backgroundColor: "#E7F5EF",
      borderColor: "#E7F5EF"
    },
    statusBadgeDraft: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border
    },
    statusBadgeText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.text
    },
    statusBadgeTextActive: {
      color: theme.colors.success
    },
    heroCard: {
      position: "relative",
      overflow: "hidden",
      flexDirection: isCompact ? "column" : "row",
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
      ...theme.shadow.md
    },
    heroGlowPrimary: {
      position: "absolute",
      top: -42,
      right: -18,
      width: isPhone ? 150 : 220,
      height: isPhone ? 150 : 220,
      borderRadius: 999,
      backgroundColor: theme.colors.primarySoft,
      opacity: 0.84
    },
    heroGlowSecondary: {
      position: "absolute",
      left: -42,
      bottom: -62,
      width: isPhone ? 160 : 230,
      height: isPhone ? 160 : 230,
      borderRadius: 999,
      backgroundColor: "rgba(197, 138, 23, 0.10)"
    },
    heroMain: {
      flex: 1,
      minWidth: 0,
      paddingRight: isCompact ? 0 : theme.spacing.lg,
      marginBottom: isCompact ? theme.spacing.md : 0
    },
    heroEyebrow: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary,
      letterSpacing: 0.3,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase"
    },
    heroTitle: {
      fontFamily: theme.fonts.display,
      fontSize: isPhone ? 24 : theme.typography.title,
      lineHeight: isPhone ? 30 : theme.typography.title + 4,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    heroSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md
    },
    heroMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    heroChip: {
      minHeight: 34,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    heroChipText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.text
    },
    heroAside: {
      width: isCompact ? "100%" : 280
    },
    metricCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
      ...theme.shadow.sm
    },
    metricValue: {
      fontFamily: theme.fonts.display,
      fontSize: 26,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    metricLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    grid: {
      flexDirection: isCompact ? "column" : "row"
    },
    cardWide: {
      flexGrow: isCompact ? 0 : 1.1,
      flexShrink: 0,
      flexBasis: isCompact ? "auto" : 0,
      marginRight: isCompact ? 0 : theme.spacing.md
    },
    cardNarrow: {
      flexGrow: isCompact ? 0 : 0.9,
      flexShrink: 0,
      flexBasis: isCompact ? "auto" : 0
    },
    actionStack: {
      gap: theme.spacing.sm
    },
    inlineActions: {
      flexDirection: isPhone ? "column" : "row",
      flexWrap: "wrap"
    },
    inlineButton: {
      marginRight: isPhone ? 0 : theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    helperText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    currentBlockLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    currentBlockValue: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.title,
      lineHeight: theme.typography.title + 4,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    currentBlockHint: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md
    },
    doubleActionRow: {
      flexDirection: "row",
      alignItems: "stretch"
    },
    doubleActionRowCompact: {
      flexDirection: "column"
    },
    doubleActionItem: {
      flex: 1,
      marginRight: isCompact ? 0 : theme.spacing.sm,
      marginBottom: isCompact ? theme.spacing.sm : 0
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.md
    },
    summaryInlineCards: {
      flexDirection: isPhone ? "column" : "row",
      gap: theme.spacing.sm
    },
    summaryTile: {
      minWidth: isPhone ? "47%" : 150,
      flexGrow: 1,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      ...theme.shadow.sm
    },
    summaryTileSuccess: {
      backgroundColor: theme.mode === "dark" ? "#132B23" : "#F0FAF5",
      borderColor: theme.colors.success
    },
    summaryTileWarning: {
      backgroundColor: theme.mode === "dark" ? "#302310" : "#FFF7E8",
      borderColor: theme.colors.warning
    },
    summaryTileInfo: {
      backgroundColor: theme.mode === "dark" ? "#13213A" : "#EDF2FF",
      borderColor: theme.colors.primary
    },
    summaryValue: {
      fontFamily: theme.fonts.display,
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    summaryLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    participantRow: {
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border
    },
    participantMeta: {
      flexDirection: isPhone ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isPhone ? "flex-start" : "center",
      marginBottom: theme.spacing.xs
    },
    participantName: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: isPhone ? theme.spacing.xs : 0
    },
    participantPill: {
      minHeight: 30,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    participantPillSuccess: {
      backgroundColor: theme.mode === "dark" ? "#132B23" : "#F0FAF5",
      borderColor: theme.colors.success
    },
    participantPillInfo: {
      backgroundColor: theme.mode === "dark" ? "#13213A" : "#EDF2FF",
      borderColor: theme.colors.primary
    },
    participantPillWarning: {
      backgroundColor: theme.mode === "dark" ? "#302310" : "#FFF7E8",
      borderColor: theme.colors.warning
    },
    participantPillText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.text
    },
    participantDetails: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    }
  });
}
