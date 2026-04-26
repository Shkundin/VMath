import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import {
  getTeacherCurrentBlock,
  type TeacherManagedSession
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
  const currentBlock = getTeacherCurrentBlock(session);

  const [storedStats, setStoredStats] = useState<StoredTeacherStats | null>(
    readStoredStats(session.lectureId)
  );

  useEffect(() => {
    setStoredStats(readStoredStats(session.lectureId));

    const intervalId = setInterval(() => {
      setStoredStats(readStoredStats(session.lectureId));
    }, 800);

    function handleStorage() {
      setStoredStats(readStoredStats(session.lectureId));
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
      }
    };
  }, [session.lectureId]);

  const participantStats = useMemo(
    () => ({
      online: session.participants.filter((item) => item.status === "online").length,
      inProgress: session.participants.filter((item) => item.status === "in-progress").length,
      completed: session.participants.filter((item) => item.status === "completed").length,
      offline: session.participants.filter((item) => item.status === "offline").length
    }),
    [session.participants]
  );

  const completedCount = storedStats?.completed ?? participantStats.completed;
  const totalScore =
    storedStats?.totalScore ??
    session.participants.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const lastCorrectCount = storedStats?.lastCorrectCount ?? null;

  const participantLines = useMemo(
    () =>
      session.participants.map((participant) => {
        const scoreLabel = participant.score === null ? "—" : String(participant.score);
        return {
          key: participant.id,
          name: participant.name,
          status: participant.status,
          scoreLabel
        };
      }),
    [session.participants]
  );

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Пульт общей сессии"
        subtitle="Управляй ходом занятия, переключай блоки и отслеживай прогресс группы в реальном времени."
        rightSlot={
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{fixText(session.lectureTitle)}</Text>
          </View>
        }
      />

      <View style={styles.statsRow}>
        <SessionStatCard theme={theme} label="Статус" value={fixText(session.status)} />
        <SessionStatCard theme={theme} label="Онлайн" value={String(participantStats.online)} />
        <SessionStatCard theme={theme} label="Завершили" value={String(completedCount)} />
        <SessionStatCard theme={theme} label="Сумма баллов" value={String(totalScore)} />
      </View>

      <SectionCard
        title="Состояние сессии"
        subtitle="Основная информация по коду сессии, активному блоку и учебному потоку."
        theme={theme}
      >
        <View style={styles.metaGrid}>
          <SessionMetaItem theme={theme} label="Код сессии" value={session.sessionCode} />
          <SessionMetaItem theme={theme} label="Текущий блок" value={currentBlock} />
          <SessionMetaItem
            theme={theme}
            label="Позиция"
            value={`${session.currentBlockIndex + 1} / ${session.blocks.length}`}
          />
          <SessionMetaItem
            theme={theme}
            label="Вопросов"
            value={String(session.questionPreview.length)}
          />
          <SessionMetaItem
            theme={theme}
            label="В процессе"
            value={String(participantStats.inProgress)}
          />
          <SessionMetaItem
            theme={theme}
            label="Последний результат"
            value={
              lastCorrectCount === null ? "Пока нет ответов" : `${lastCorrectCount} правильных`
            }
          />
        </View>
      </SectionCard>

      <SectionCard
        title="Участники"
        subtitle="Кто уже в сессии, кто отвечает сейчас и какой текущий результат у каждого."
        theme={theme}
      >
        {participantLines.length === 0 ? (
          <Text style={styles.emptyText}>Пока никто не подключился к общей сессии.</Text>
        ) : (
          participantLines.map((participant) => (
            <View key={participant.key} style={styles.participantCard}>
              <View style={styles.participantTop}>
                <Text style={styles.participantName}>{fixText(participant.name)}</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{fixText(participant.status)}</Text>
                </View>
              </View>
              <Text style={styles.participantMeta}>Баллы: {participant.scoreLabel}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="Действия преподавателя"
        subtitle="Запускай и останавливай общую сессию, затем шагай по блокам лекции."
        theme={theme}
      >
        <View style={styles.actionGroup}>
          <AppButton label="Запустить общую сессию" onPress={onStart} theme={theme} />
        </View>

        <View style={styles.actionGroup}>
          <AppButton
            label="Остановить сессию"
            onPress={onStop}
            theme={theme}
            variant="secondary"
          />
        </View>

        <View style={styles.doubleActionRow}>
          <View style={styles.doubleActionItem}>
            <AppButton
              label="Предыдущий блок"
              onPress={onPrevBlock}
              theme={theme}
              variant="secondary"
            />
          </View>

          <View style={styles.doubleActionItem}>
            <AppButton
              label="Следующий блок"
              onPress={onNextBlock}
              theme={theme}
            />
          </View>
        </View>

        <View style={styles.actionGroup}>
          <AppButton label="Вернуться в кабинет" onPress={onBack} theme={theme} variant="ghost" />
        </View>
      </SectionCard>
    </Screen>
  );
}

type SessionStatCardProps = {
  theme: AppTheme;
  label: string;
  value: string;
};

function SessionStatCard({ theme, label, value }: SessionStatCardProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{fixText(value)}</Text>
      <Text style={styles.statLabel}>{fixText(label)}</Text>
    </View>
  );
}

type SessionMetaItemProps = {
  theme: AppTheme;
  label: string;
  value: string;
};

function SessionMetaItem({ theme, label, value }: SessionMetaItemProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View style={styles.metaCard}>
      <Text style={styles.metaLabel}>{fixText(label)}</Text>
      <Text style={styles.metaValue}>{fixText(value)}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 720;

  return StyleSheet.create({
    headerBadge: {
      alignSelf: "flex-start",
      minHeight: 34,
      maxWidth: isPhone ? "100%" : 320,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    headerBadgeText: {
      color: theme.colors.text,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800"
    },
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.sm
    },
    statCard: {
      flexBasis: isPhone ? "48%" : 170,
      flexGrow: 1,
      minHeight: 112,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm
    },
    statValue: {
      fontFamily: theme.fonts.display,
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    statLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.textSecondary
    },
    metaGrid: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    metaCard: {
      flexBasis: isPhone ? "100%" : "47%",
      flexGrow: 1,
      minHeight: 92,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    metaLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.helper,
      fontWeight: "800",
      color: theme.colors.textSecondary,
      letterSpacing: 0.35,
      textTransform: "uppercase",
      marginBottom: theme.spacing.xs
    },
    metaValue: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body + 1,
      fontWeight: "700",
      color: theme.colors.text
    },
    participantCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    participantTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs
    },
    participantName: {
      flex: 1,
      minWidth: 0,
      marginRight: theme.spacing.sm,
      color: theme.colors.text,
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700"
    },
    statusPill: {
      minHeight: 30,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft
    },
    statusPillText: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800"
    },
    participantMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body
    },
    actionGroup: {
      marginBottom: theme.spacing.md
    },
    doubleActionRow: {
      flexDirection: isPhone ? "column" : "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md
    },
    doubleActionItem: {
      flex: 1
    }
  });
}
