import React from "react";
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
import type { TeacherBranch } from "../storage/teacherBranchesStorage";
import type { AppTheme } from "../theme";
import { fixText } from "../utils/fixText";

type TeacherBranchSelectScreenProps = {
  theme: AppTheme;
  branches: TeacherBranch[];
  selectedTeacherLogin: string | null;
  onJoinByCode: (
    joinCode: string
  ) => { ok: true; branch: TeacherBranch } | { ok: false; error: string };
  onDisconnectCurrent?: () => void;
};

export function TeacherBranchSelectScreen({
  theme,
  branches,
  selectedTeacherLogin,
  onJoinByCode,
  onDisconnectCurrent
}: TeacherBranchSelectScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);
  const [joinCode, setJoinCode] = React.useState("");
  const [joinError, setJoinError] = React.useState("");
  const [joinSuccess, setJoinSuccess] = React.useState("");

  const sortedBranches = [...branches].sort((left, right) =>
    left.teacherName.localeCompare(right.teacherName, "ru")
  );
  const selectedBranch =
    sortedBranches.find((branch) => branch.teacherLogin === selectedTeacherLogin) ?? null;

  function handleConnect(nextCode?: string) {
    const result = onJoinByCode(nextCode ?? joinCode);

    if (!result.ok) {
      setJoinSuccess("");
      setJoinError(result.error);
      return;
    }

    setJoinCode(result.branch.joinCode);
    setJoinError("");
    setJoinSuccess(`Подключено: ${result.branch.teacherName}`);
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Подключение к курсу"
        subtitle="Подключись по коду преподавателя и открой лекции, материалы, задания и встречи нужного курса."
        rightSlot={
          <View style={styles.headerChip}>
            <Text style={styles.headerChipText}>{sortedBranches.length} курсов</Text>
          </View>
        }
      />

      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Код доступа</Text>
        <Text style={styles.heroTitle}>Подключись по коду преподавателя</Text>
        <Text style={styles.heroSubtitle}>
          Преподаватель выдаёт код курса, а студент по нему открывает свою учебную ветку и получает доступ к материалам.
        </Text>
      </View>

      <SectionCard
        theme={theme}
        title="Код курса"
        subtitle={
          selectedBranch
            ? `Сейчас открыт курс преподавателя ${fixText(selectedBranch.teacherName)}.`
            : "Введи код и подключись к нужному преподавателю."
        }
      >
        <AppInput
          label="Код преподавателя"
          theme={theme}
          value={joinCode}
          onChangeText={(value) => {
            setJoinCode(value.toUpperCase());
            setJoinError("");
            setJoinSuccess("");
          }}
          placeholder="Например: TEAC-H3R9"
          autoCapitalize="characters"
          autoCorrect={false}
          error={joinError || undefined}
        />

        {joinSuccess ? <Text style={styles.successText}>{fixText(joinSuccess)}</Text> : null}

        <View style={styles.connectButtonWrap}>
          <AppButton
            label="Подключиться"
            onPress={() => handleConnect()}
            theme={theme}
          />

          {selectedBranch ? (
            <AppButton
              label="Отключиться от текущего преподавателя"
              onPress={() => {
                setJoinCode("");
                setJoinError("");
                setJoinSuccess("");
                onDisconnectCurrent?.();
              }}
              theme={theme}
              variant="ghost"
              style={styles.disconnectButton}
            />
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        theme={theme}
        title="Доступные курсы"
        subtitle={
          sortedBranches.length > 0
            ? "Выбери нужный курс из списка и подключись к нему в один клик."
            : "Пока ни один преподаватель не создал свою учебную ветку."
        }
      >
        {sortedBranches.length === 0 ? (
          <Text style={styles.emptyText}>Пока нет доступных курсов преподавателей.</Text>
        ) : (
          <View style={styles.branchList}>
            {sortedBranches.map((branch) => {
              const isActive = branch.teacherLogin === selectedTeacherLogin;

              return (
                <Pressable
                  key={branch.teacherLogin}
                  onPress={() => handleConnect(branch.joinCode)}
                  style={[
                    styles.branchCard,
                    isActive ? styles.branchCardActive : null
                  ]}
                >
                  <View style={styles.branchTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getTeacherInitials(branch.teacherName)}
                      </Text>
                    </View>

                    <View style={styles.branchTextWrap}>
                      <Text style={styles.branchTitle}>{fixText(branch.title)}</Text>
                      <Text style={styles.branchMeta}>{fixText(branch.teacherName)}</Text>
                      <Text style={styles.branchCode}>Код: {fixText(branch.joinCode)}</Text>
                    </View>

                    <View style={isActive ? styles.statusActive : styles.statusIdle}>
                      <Text style={isActive ? styles.statusActiveText : styles.statusIdleText}>
                        {isActive ? "Открыт" : "Войти"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.branchDescription}>{fixText(branch.description)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </SectionCard>
    </Screen>
  );
}

function getTeacherInitials(value: string): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "П";
  }

  return parts.map((item) => item[0]?.toUpperCase() ?? "").join("");
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 520;

  return StyleSheet.create({
    headerChip: {
      alignSelf: "flex-start",
      minHeight: 34,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    headerChipText: {
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.text
    },
    heroCard: {
      borderRadius: theme.radius.lg,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
      ...theme.shadow.lg
    },
    heroEyebrow: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.45
    },
    heroTitle: {
      fontFamily: theme.fonts.display,
      fontSize: isPhone ? 24 : theme.typography.title,
      lineHeight: isPhone ? 30 : theme.typography.title + 4,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    heroSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.textSecondary
    },
    emptyText: {
      fontSize: theme.typography.body,
      color: theme.colors.textSecondary
    },
    branchList: {
      width: "100%"
    },
    branchCard: {
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: isPhone ? theme.spacing.md : theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      ...theme.shadow.sm
    },
    branchCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceMuted
    },
    branchTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: theme.spacing.sm
    },
    avatar: {
      width: isPhone ? 42 : 48,
      height: isPhone ? 42 : 48,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      marginRight: theme.spacing.md
    },
    avatarText: {
      color: "#FFFFFF",
      fontSize: theme.typography.body,
      fontWeight: "900"
    },
    branchTextWrap: {
      flex: 1,
      paddingRight: theme.spacing.sm
    },
    branchTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    branchMeta: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: 2
    },
    branchCode: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.primary,
      marginTop: theme.spacing.xs
    },
    statusActive: {
      minHeight: 30,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary
    },
    statusIdle: {
      minHeight: 30,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    statusActiveText: {
      color: "#FFFFFF",
      fontSize: theme.typography.caption,
      fontWeight: "800"
    },
    statusIdleText: {
      color: theme.colors.text,
      fontSize: theme.typography.caption,
      fontWeight: "800"
    },
    branchDescription: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary
    },
    connectButtonWrap: {
      marginTop: theme.spacing.sm
    },
    disconnectButton: {
      marginTop: theme.spacing.sm
    },
    successText: {
      color: theme.colors.success,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      marginTop: -theme.spacing.xs
    }
  });
}
