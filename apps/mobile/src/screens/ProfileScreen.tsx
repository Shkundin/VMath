import React, { useMemo } from "react";
import { StyleSheet, Switch, Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StatusPill } from "../components/ui/StatusPill";
import type { UserProfile } from "../mocks/user";
import type { StudentResumeStep } from "../storage/appUXStorage";
import type { TeacherBranch } from "../storage/teacherBranchesStorage";
import type { AppTheme, ThemeMode } from "../theme";
import { fixText } from "../utils/fixText";

type DemoDataMode = "online" | "offline" | "loading" | "error";
type StatusTone = "success" | "warning" | "info" | "danger";

type ProfileScreenProps = {
  theme: AppTheme;
  user: UserProfile;
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  catalogMode: DemoDataMode;
  sessionMode: DemoDataMode;
  selectedTeacherBranch?: TeacherBranch | null;
  resumeLectureTitle?: string | null;
  resumeStep?: StudentResumeStep | null;
  teacherSessionSummary?: {
    lectureTitle: string;
    sessionCode: string;
    status: "draft" | "active" | "stopped";
  } | null;
  onResumeStudy?: () => void;
  onToggleTheme: () => void;
  onToggleNotifications: () => void;
  onCycleCatalogMode: () => void;
  onCycleSessionMode: () => void;
  onOpenTeacherConnection?: () => void;
  onDisconnectTeacher?: () => void;
  onLogout: () => void;
};

export function ProfileScreen({
  theme,
  user,
  themeMode,
  notificationsEnabled,
  catalogMode,
  sessionMode,
  selectedTeacherBranch,
  resumeLectureTitle,
  resumeStep,
  teacherSessionSummary,
  onResumeStudy,
  onToggleTheme,
  onToggleNotifications,
  onCycleCatalogMode,
  onCycleSessionMode,
  onOpenTeacherConnection,
  onDisconnectTeacher,
  onLogout
}: ProfileScreenProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 560;
  const styles = createStyles(theme, width);

  const displayName = useMemo(() => {
    const next = fixText(user.fullName || "").trim();

    if (/[А-Яа-яЁёA-Za-z]/.test(next)) {
      return next;
    }

    return user.role === "teacher" ? "Преподаватель VisualMath" : "Студент VisualMath";
  }, [user.fullName, user.role]);

  const initials = useMemo(() => {
    const parts = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase() ?? "");

    return parts.join("") || "VM";
  }, [displayName]);

  const roleLabel = user.role === "teacher" ? "Преподаватель" : "Студент";
  const isStudent = user.role === "student";

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Профиль"
        subtitle="Аккаунт, интерфейс и быстрые настройки приложения."
        rightSlot={
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>{roleLabel}</Text>
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.heroGlowPrimary} />
        <View style={styles.heroGlowSecondary} />

        <View style={styles.heroLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.heroTextBlock}>
            <Text style={styles.heroEyebrow}>Личный кабинет</Text>
            <Text style={styles.heroName}>{displayName}</Text>
            <Text style={styles.heroSubtitle}>
              Здесь находятся данные аккаунта, статус приложения и основные параметры.
            </Text>

            <View style={styles.heroBadges}>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{fixText(`Логин: ${user.login}`)}</Text>
              </View>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{fixText(`Группа: ${user.group}`)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.heroStats}>
          <MiniStatCard
            theme={theme}
            value={themeMode === "dark" ? "Тёмная" : "Светлая"}
            label="Тема"
          />
          <MiniStatCard
            theme={theme}
            value={notificationsEnabled ? "Вкл" : "Выкл"}
            label="Уведомления"
          />
          <MiniStatCard
            theme={theme}
            value={formatModeLabel(catalogMode)}
            label="Курсы"
          />
        </View>
      </View>

      <View style={styles.grid}>
        <SectionCard
          theme={theme}
          title="Аккаунт"
          subtitle="Основная информация по текущему профилю."
          style={styles.cardWide}
        >
          <View style={styles.infoGrid}>
            <InfoTile theme={theme} label="Имя" value={displayName} />
            <InfoTile theme={theme} label="Роль" value={roleLabel} />
            <InfoTile theme={theme} label="Логин" value={user.login} />
            <InfoTile theme={theme} label="Группа" value={user.group} />
          </View>
        </SectionCard>

        <SectionCard
          theme={theme}
          title={isStudent ? "Фокус обучения" : "Рабочий статус"}
          subtitle={
            isStudent
              ? resumeLectureTitle
                ? `Следующая точка входа: ${resumeLectureTitle}.`
                : "Продолжай обучение, а приложение сохранит удобную точку возврата."
              : teacherSessionSummary
                ? `Общая сессия для лекции ${fixText(teacherSessionSummary.lectureTitle)} уже под рукой.`
                : "Здесь будет показано состояние общей преподавательской сессии."
          }
          style={styles.cardNarrow}
        >
          <View style={styles.statusWrap}>
            <StatusPill
              theme={theme}
              label={`Курсы: ${formatModeLabel(catalogMode)}`}
              tone={mapModeToTone(catalogMode)}
            />
            <StatusPill
              theme={theme}
              label={`Занятия: ${formatModeLabel(sessionMode)}`}
              tone={mapModeToTone(sessionMode)}
            />
          </View>

          {isStudent && resumeLectureTitle ? (
            <View style={styles.focusPanel}>
              <Text style={styles.focusLabel}>Последняя точка возврата</Text>
              <Text style={styles.focusTitle}>{fixText(resumeLectureTitle)}</Text>
              <Text style={styles.focusHint}>{getResumeStepDescription(resumeStep)}</Text>

              {onResumeStudy ? (
                <AppButton
                  label={getResumeButtonLabel(resumeStep)}
                  onPress={onResumeStudy}
                  theme={theme}
                  fullWidth={isPhone}
                  style={styles.focusButton}
                />
              ) : null}
            </View>
          ) : null}

          {!isStudent && teacherSessionSummary ? (
            <View style={styles.focusPanel}>
              <Text style={styles.focusLabel}>Общая сессия</Text>
              <Text style={styles.focusTitle}>{fixText(teacherSessionSummary.lectureTitle)}</Text>
              <Text style={styles.focusHint}>
                {getTeacherSessionStatusLabel(teacherSessionSummary.status)} • код {fixText(teacherSessionSummary.sessionCode)}
              </Text>
            </View>
          ) : null}
        </SectionCard>
      </View>

      <View style={styles.grid}>
        {isStudent ? (
          <SectionCard
            theme={theme}
            title="Подключение к преподавателю"
            subtitle={
              selectedTeacherBranch
                ? `Сейчас открыт каталог преподавателя ${fixText(selectedTeacherBranch.teacherName)}.`
                : "Сначала введи код преподавателя, чтобы открыть его каталог и материалы."
            }
            style={styles.cardWide}
          >
            <View style={styles.infoGrid}>
              <InfoTile
                theme={theme}
                label="Преподаватель"
                value={selectedTeacherBranch?.teacherName || "Не подключен"}
              />
              <InfoTile
                theme={theme}
                label="Код курса"
                value={selectedTeacherBranch?.joinCode || "Не выбран"}
              />
            </View>

            <View style={styles.connectionActions}>
              <AppButton
                label={selectedTeacherBranch ? "Сменить преподавателя" : "Ввести код преподавателя"}
                onPress={onOpenTeacherConnection ?? (() => {})}
                theme={theme}
                variant="secondary"
                fullWidth={isPhone}
                style={styles.connectionButton}
              />

              {selectedTeacherBranch ? (
                <AppButton
                  label="Отключиться"
                  onPress={onDisconnectTeacher ?? (() => {})}
                  theme={theme}
                  variant="ghost"
                  fullWidth={isPhone}
                  style={styles.connectionButton}
                />
              ) : null}
            </View>
          </SectionCard>
        ) : null}

        <SectionCard
          theme={theme}
          title="Интерфейс"
          subtitle="Тема, уведомления и базовые параметры приложения."
          style={isStudent ? styles.cardNarrow : styles.cardWide}
        >
          <SettingRow
            theme={theme}
            title="Тёмная тема"
            description={`Сейчас активна ${themeMode === "dark" ? "тёмная" : "светлая"} тема.`}
            value={themeMode === "dark"}
            onValueChange={onToggleTheme}
          />

          <View style={styles.divider} />

          <SettingRow
            theme={theme}
            title="Уведомления"
            description={notificationsEnabled ? "Уведомления включены." : "Уведомления выключены."}
            value={notificationsEnabled}
            onValueChange={onToggleNotifications}
          />
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Проверка экранов"
          subtitle="Быстрое переключение учебных состояний."
          style={styles.cardNarrow}
        >
          <View style={styles.actionRow}>
            <AppButton
              label="Курсы"
              onPress={onCycleCatalogMode}
              theme={theme}
              variant="secondary"
              style={styles.actionButton}
            />

            <AppButton
              label="Занятие"
              onPress={onCycleSessionMode}
              theme={theme}
              variant="secondary"
              style={styles.actionButton}
            />
          </View>
        </SectionCard>
      </View>

      <SectionCard
        theme={theme}
        title="Аккаунт"
        subtitle="Выход из текущего профиля."
      >
        <View style={styles.logoutWrap}>
          <AppButton
            label="Выйти"
            onPress={onLogout}
            theme={theme}
            variant="secondary"
            fullWidth={isPhone}
            style={styles.logoutButton}
          />
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

type SettingRowProps = {
  theme: AppTheme;
  title: string;
  description: string;
  value: boolean;
  onValueChange: () => void;
};

function SettingRow({
  theme,
  title,
  description,
  value,
  onValueChange
}: SettingRowProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.settingRow}>
      <View style={styles.settingTextBlock}>
        <Text style={styles.settingTitle}>{fixText(title)}</Text>
        <Text style={styles.settingDescription}>{fixText(description)}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary
        }}
      />
    </View>
  );
}

function mapModeToTone(mode: DemoDataMode): StatusTone {
  if (mode === "online") {
    return "success";
  }

  if (mode === "offline") {
    return "warning";
  }

  if (mode === "loading") {
    return "info";
  }

  return "danger";
}

function formatModeLabel(mode: DemoDataMode): string {
  if (mode === "online") {
    return "Онлайн";
  }

  if (mode === "offline") {
    return "Офлайн";
  }

  if (mode === "loading") {
    return "Загрузка";
  }

  return "Ошибка";
}

function getResumeButtonLabel(step: StudentResumeStep | null | undefined): string {
  if (step === "task") {
    return "Вернуться к заданию";
  }

  if (step === "session" || step === "result") {
    return "Продолжить занятие";
  }

  return "Открыть лекцию";
}

function getResumeStepDescription(step: StudentResumeStep | null | undefined): string {
  if (step === "task") {
    return "Остановились на шаге с заданием. Можно вернуться прямо к нему.";
  }

  if (step === "session") {
    return "Открыта точка возврата в учебную сессию.";
  }

  if (step === "result") {
    return "Последний результат отмечен как ориентир для продолжения.";
  }

  return "Последняя открытая лекция сохранена для быстрого продолжения.";
}

function getTeacherSessionStatusLabel(status: "draft" | "active" | "stopped"): string {
  if (status === "active") {
    return "Сессия активна";
  }

  if (status === "stopped") {
    return "Сессия остановлена";
  }

  return "Сессия подготовлена";
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 560;
  const isCompact = width < 980;

  return StyleSheet.create({
    roleChip: {
      minHeight: 38,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft
    },
    roleChipText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary
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
      top: -40,
      right: -22,
      width: isPhone ? 150 : 210,
      height: isPhone ? 150 : 210,
      borderRadius: 999,
      backgroundColor: theme.colors.primarySoft,
      opacity: 0.86
    },
    heroGlowSecondary: {
      position: "absolute",
      bottom: -54,
      left: -38,
      width: isPhone ? 150 : 230,
      height: isPhone ? 150 : 230,
      borderRadius: 999,
      backgroundColor: "rgba(19, 121, 91, 0.09)"
    },
    heroLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: isPhone ? "column" : "row",
      alignItems: isPhone ? "flex-start" : "center",
      paddingRight: isCompact ? 0 : theme.spacing.lg,
      marginBottom: isCompact ? theme.spacing.md : 0
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      marginRight: isPhone ? 0 : theme.spacing.lg,
      marginBottom: isPhone ? theme.spacing.md : 0,
      ...theme.shadow.sm
    },
    avatarText: {
      fontFamily: theme.fonts.display,
      fontSize: 30,
      fontWeight: "700",
      color: "#FFFFFF"
    },
    heroTextBlock: {
      flex: 1
    },
    heroEyebrow: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.3
    },
    heroName: {
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
    heroBadges: {
      flexDirection: "row",
      flexWrap: "wrap"
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
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.text
    },
    heroStats: {
      width: isCompact ? "100%" : 260
    },
    miniStatCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
      ...theme.shadow.sm
    },
    miniStatValue: {
      fontFamily: theme.fonts.display,
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    miniStatLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    grid: {
      flexDirection: isCompact ? "column" : "row"
    },
    cardWide: {
      flexGrow: isCompact ? 0 : 1.2,
      flexShrink: 0,
      flexBasis: isCompact ? "auto" : 0,
      marginRight: isCompact ? 0 : theme.spacing.md
    },
    cardNarrow: {
      flexGrow: isCompact ? 0 : 0.8,
      flexShrink: 0,
      flexBasis: isCompact ? "auto" : 0
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
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm
    },
    infoTileLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.helper,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    infoTileValue: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text
    },
    statusWrap: {
      flexDirection: isPhone ? "column" : "row",
      flexWrap: "wrap",
      alignItems: "flex-start"
    },
    focusPanel: {
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadow.sm
    },
    focusLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.3
    },
    focusTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body + 1,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    focusHint: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    focusButton: {
      marginTop: theme.spacing.md
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    settingTextBlock: {
      flex: 1,
      paddingRight: theme.spacing.md
    },
    settingTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    settingDescription: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.lg
    },
    actionButton: {
      flex: 1,
      minWidth: isPhone ? "100%" : 0,
      marginRight: isPhone ? 0 : theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    actionRow: {
      flexDirection: isPhone ? "column" : "row",
      alignItems: "stretch",
      marginBottom: theme.spacing.xs
    },
    connectionActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: theme.spacing.sm
    },
    connectionButton: {
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    logoutWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingBottom: theme.spacing.xs
    },
    logoutButton: {
      marginTop: theme.spacing.xs
    }
  });
}
