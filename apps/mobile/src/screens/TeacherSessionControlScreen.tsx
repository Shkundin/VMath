import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../components/ui/AppButton";
import { Screen } from "../components/ui/Screen";
import { SectionCard } from "../components/ui/SectionCard";
import {
  getTeacherCurrentBlock,
  type TeacherManagedSession
} from "../mocks/teacher";
import type { AppTheme } from "../theme";

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
  const styles = createStyles(theme);
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
        return `${participant.name} · ${participant.status} · баллы: ${scoreLabel}`;
      }),
    [session.participants]
  );

  return (
    <Screen theme={theme}>
      <Text style={styles.title}>Управление сессией</Text>
      <Text style={styles.subtitle}>{session.lectureTitle}</Text>

      <SectionCard
        title="Состояние сессии"
        subtitle="Текущий блок и статистика ответов"
        theme={theme}
      >
        <Text style={styles.metaText}>Код сессии: {session.sessionCode}</Text>
        <Text style={styles.metaText}>Статус: {session.status}</Text>
        <Text style={styles.metaText}>Текущий блок: {currentBlock}</Text>
        <Text style={styles.metaText}>
          Позиция блока: {session.currentBlockIndex + 1} / {session.blocks.length}
        </Text>
        <Text style={styles.metaText}>
          Вопросов в проверочном блоке: {session.questionPreview.length}
        </Text>
        <Text style={styles.metaText}>Ответило: {completedCount}</Text>
        <Text style={styles.metaText}>В процессе: {participantStats.inProgress}</Text>
        <Text style={styles.metaText}>Онлайн: {participantStats.online}</Text>
        <Text style={styles.metaText}>Оффлайн: {participantStats.offline}</Text>
        <Text style={styles.metaText}>Сумма баллов: {totalScore}</Text>
        <Text style={styles.metaText}>
          Последний результат: {lastCorrectCount === null ? "ещё нет ответов" : `${lastCorrectCount} правильных`}
        </Text>
      </SectionCard>

      <SectionCard
        title="Участники"
        subtitle="Текущее состояние участников"
        theme={theme}
      >
        {participantLines.map((line, index) => (
          <Text key={`${line}-${index}`} style={styles.metaText}>
            {line}
          </Text>
        ))}
      </SectionCard>

      <SectionCard
        title="Управление"
        subtitle="Действия преподавателя"
        theme={theme}
      >
        <View style={styles.actionGroup}>
          <AppButton label="Запустить сессию" onPress={onStart} theme={theme} />
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
          <AppButton label="Назад" onPress={onBack} theme={theme} variant="secondary" />
        </View>
      </SectionCard>
    </Screen>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    title: {
      fontSize: theme.typography.screenTitle,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    subtitle: {
      fontSize: theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg
    },
    metaText: {
      fontSize: theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    actionGroup: {
      marginBottom: theme.spacing.md
    },
    doubleActionRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md
    },
    doubleActionItem: {
      flex: 1
    }
  });
}