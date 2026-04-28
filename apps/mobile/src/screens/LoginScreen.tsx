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
import type { AppTheme } from "../theme";

export type LoginRole = "student" | "teacher";
export type AuthMode = "login" | "register";
type LoginStage = "intro" | "auth";
type StudentEntryMode = "social" | "credentials";

export type GoogleLoginPayload = {
  mode: AuthMode;
  email?: string;
  fullName?: string;
  name?: string;
};

export type VkLoginPayload = {
  mode: AuthMode;
  email?: string;
  fullName?: string;
  name?: string;
  vkId?: string;
};

type LoginScreenProps = {
  theme: AppTheme;
  onLogin: (input: {
    login: string;
    password: string;
    role: LoginRole;
    mode: AuthMode;
    fullName?: string;
  }) => Promise<string | null>;
  onGoogleLogin: (payload: GoogleLoginPayload) => Promise<string | null>;
  onVkLogin: (payload: VkLoginPayload) => Promise<string | null>;
  vkWebWidget?: React.ReactNode;
};

export function LoginScreen({
  theme,
  onLogin,
  onGoogleLogin,
  onVkLogin,
  vkWebWidget
}: LoginScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  const [stage, setStage] = useState<LoginStage>("intro");
  const [role, setRole] = useState<LoginRole>("student");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [studentEntryMode, setStudentEntryMode] = useState<StudentEntryMode>("social");
  const [fullName, setFullName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successText, setSuccessText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isVkSubmitting, setIsVkSubmitting] = useState(false);

  const roleTitle = useMemo(() => {
    if (role === "teacher") {
      return "Кабинет преподавателя";
    }

    if (studentEntryMode === "social") {
      return authMode === "register" ? "Создай кабинет студента" : "Вход студента";
    }

    return authMode === "register" ? "Регистрация студента" : "Вход студента";
  }, [authMode, role, studentEntryMode]);

  const roleSubtitle = useMemo(() => {
    if (role === "teacher") {
      return "Вход по рабочему логину и паролю.";
    }

    if (studentEntryMode === "social") {
      return authMode === "register"
        ? "Открой кабинет через Google или VK."
        : "Выбери знакомый способ входа и продолжай обучение.";
    }

    return authMode === "register"
      ? "Создай локальный аккаунт для входа по логину и паролю."
      : "Войди по логину и паролю.";
  }, [authMode, role, studentEntryMode]);

  const submitLabel = useMemo(() => {
    if (role === "teacher") {
      return "Войти как преподаватель";
    }

    return authMode === "register" ? "Создать аккаунт" : "Войти как студент";
  }, [authMode, role]);

  const googleLabel = authMode === "register" ? "Создать через Google" : "Продолжить через Google";
  const vkLabel = authMode === "register" ? "Создать через VK" : "Продолжить через VK";

  const helperText = useMemo(() => {
    if (role === "teacher") {
      return "Демо-доступ: teacher / teacher";
    }

    if (studentEntryMode === "social") {
      return authMode === "register"
        ? "Профиль создастся автоматически после подтверждения у провайдера."
        : "Используй тот же Google или VK, если уже входил раньше.";
    }

    return authMode === "register"
      ? "После регистрации вход выполняется по сохранённым данным."
      : "Нет аккаунта? Переключись на регистрацию или выбери быстрый вход.";
  }, [authMode, role, studentEntryMode]);

  function resetMessages() {
    setError("");
    setSuccessText("");
  }

  function applyPreset(nextRole: LoginRole, nextMode: AuthMode) {
    resetMessages();
    setFullName("");
    setLogin("");
    setPassword("");

    if (nextRole === "teacher" && nextMode === "login") {
      setLogin("teacher");
      setPassword("teacher");
    }
  }

  function handleRoleChange(nextRole: LoginRole) {
    setRole(nextRole);

    if (nextRole === "teacher") {
      setAuthMode("login");
      setStudentEntryMode("credentials");
      applyPreset("teacher", "login");
      return;
    }

    setStudentEntryMode("social");
    applyPreset("student", authMode);
  }

  function handleModeChange(nextMode: AuthMode) {
    if (role === "teacher") {
      return;
    }

    setAuthMode(nextMode);
    applyPreset("student", nextMode);
  }

  async function handleSubmit() {
    if (!login.trim() || !password.trim()) {
      setError("Заполни логин и пароль.");
      return;
    }

    if (role === "student" && authMode === "register" && !fullName.trim()) {
      setError("Укажи имя студента.");
      return;
    }

    setIsSubmitting(true);
    resetMessages();

    try {
      const nextError = await onLogin({
        login,
        password,
        role,
        mode: authMode,
        fullName
      });

      if (nextError?.startsWith("REGISTRATION_SUCCESS::")) {
        const registeredLogin = nextError.replace("REGISTRATION_SUCCESS::", "").trim();

        setAuthMode("login");
        setRole("student");
        setStudentEntryMode("credentials");
        setLogin(registeredLogin);
        setPassword("");
        setSuccessText("Регистрация прошла. Теперь войди под своим логином и паролем.");
        return;
      }

      if (nextError) {
        setError(nextError);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    setIsGoogleSubmitting(true);
    resetMessages();

    try {
      const nextError = await onGoogleLogin({ mode: authMode });

      if (nextError) {
        setError(nextError);
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleVk() {
    setIsVkSubmitting(true);
    resetMessages();

    try {
      const nextError = await onVkLogin({ mode: authMode });

      if (nextError) {
        setError(nextError);
      }
    } finally {
      setIsVkSubmitting(false);
    }
  }

  if (stage === "intro") {
    return (
      <Screen theme={theme}>
        <View style={styles.page}>
          <View style={styles.introShell}>
            <View style={styles.introGlowPrimary} />
            <View style={styles.introGlowSecondary} />
            <View style={styles.introHalo} />

            <Pressable onPress={() => setStage("auth")} style={styles.introBrandButton}>
              <BrandMark theme={theme} />
            </Pressable>

            <Text style={styles.introTitle}>VisualMath</Text>
            <Text style={styles.introHint}>Нажми на эмблему, чтобы открыть вход</Text>
          </View>
        </View>
      </Screen>
    );
  }

  const isStudent = role === "student";
  const showStudentModeChips = isStudent;
  const showCredentialForm = role === "teacher" || studentEntryMode === "credentials";
  const showStudentSocial = isStudent && studentEntryMode === "social";

  return (
    <Screen theme={theme}>
      <View style={styles.page}>
        <View style={styles.authTopRow}>
          <Pressable onPress={() => setStage("intro")} style={styles.backChip}>
            <Text style={styles.backChipText}>Назад</Text>
          </Pressable>

          <View style={styles.authBrandRow}>
            <BrandMark theme={theme} compact />
            <View style={styles.authBrandTextWrap}>
              <Text style={styles.authBrandTitle}>VisualMath</Text>
              <Text style={styles.authBrandSubtitle}>Студент и преподаватель</Text>
            </View>
          </View>
        </View>

        <View style={styles.layout}>
          <View style={styles.selectorPanel}>
            <View style={styles.panelGlow} />
            <Text style={styles.panelEyebrow}>Шаг 1</Text>
            <Text style={styles.panelTitle}>Кто будет входить?</Text>
            <Text style={styles.panelSubtitle}>
              Сначала выбери роль, потом способ входа.
            </Text>

            <View style={styles.roleGrid}>
              <RoleCard
                theme={theme}
                title="Студент"
                subtitle="Курсы, материалы, тесты и задания"
                accent="С"
                isActive={role === "student"}
                onPress={() => handleRoleChange("student")}
                isStacked={width < 860}
              />

              <RoleCard
                theme={theme}
                title="Преподаватель"
                subtitle="Лекции, группа и управление общей сессией"
                accent="П"
                isActive={role === "teacher"}
                onPress={() => handleRoleChange("teacher")}
                isStacked={width < 860}
              />
            </View>

            {isStudent ? (
              <View style={styles.methodSection}>
                <Text style={styles.methodTitle}>Шаг 2</Text>
                <Text style={styles.methodSubtitle}>Выбери удобный формат входа.</Text>

                <View style={styles.methodGrid}>
                  <AccessMethodCard
                    theme={theme}
                    title="Google и VK"
                    subtitle="Быстрое продолжение без ручного ввода"
                    accent="G/VK"
                    isActive={studentEntryMode === "social"}
                    onPress={() => {
                      setStudentEntryMode("social");
                      resetMessages();
                    }}
                  />

                  <AccessMethodCard
                    theme={theme}
                    title="Логин и пароль"
                    subtitle="Локальный аккаунт студента"
                    accent="ID"
                    isActive={studentEntryMode === "credentials"}
                    onPress={() => {
                      setStudentEntryMode("credentials");
                      resetMessages();
                    }}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.teacherCallout}>
                <Text style={styles.teacherCalloutTitle}>Преподавательский доступ</Text>
                <Text style={styles.teacherCalloutText}>
                  Вход только по выданному логину и паролю, затем доступ к лекциям и общей сессии.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.formPanel}>
            <View style={styles.formPanelGlow} />
            {showStudentModeChips ? (
              <View style={styles.modeRow}>
                <ModeChip
                  theme={theme}
                  label="Вход"
                  isActive={authMode === "login"}
                  onPress={() => handleModeChange("login")}
                />
                <ModeChip
                  theme={theme}
                  label="Регистрация"
                  isActive={authMode === "register"}
                  onPress={() => handleModeChange("register")}
                />
              </View>
            ) : null}

            <Text style={styles.formTitle}>{roleTitle}</Text>
            <Text style={styles.formSubtitle}>{roleSubtitle}</Text>

            {showStudentSocial ? (
              <>
                <View style={styles.socialStack}>
                  <AppButton
                    label={isGoogleSubmitting ? "Подключаем Google..." : googleLabel}
                    onPress={() => {
                      void handleGoogle();
                    }}
                    theme={theme}
                    variant="secondary"
                    style={styles.socialButton}
                  />

                  {vkWebWidget ? (
                    <View style={styles.vkWidgetShell}>{vkWebWidget}</View>
                  ) : (
                    <AppButton
                      label={isVkSubmitting ? "Подключаем VK..." : vkLabel}
                      onPress={() => {
                        void handleVk();
                      }}
                      theme={theme}
                      variant="secondary"
                      style={styles.socialButton}
                    />
                  )}
                </View>

                <View style={styles.socialFooter}>
                  <Pressable
                    onPress={() => {
                      setStudentEntryMode("credentials");
                      resetMessages();
                    }}
                    style={styles.inlineLink}
                  >
                    <Text style={styles.inlineLinkText}>Или войти по логину и паролю</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {showCredentialForm ? (
              <>
                {isStudent ? (
                  <View style={styles.formBadgeRow}>
                    <Text style={styles.formBadgeText}>Локальный вход</Text>
                  </View>
                ) : (
                  <View style={styles.formBadgeRow}>
                    <Text style={styles.formBadgeText}>Доступ преподавателя</Text>
                  </View>
                )}

                {isStudent && authMode === "register" ? (
                  <AppInput
                    label="Имя студента"
                    theme={theme}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Например: Глеб Шкундин"
                    autoCorrect={false}
                  />
                ) : null}

                <AppInput
                  label={role === "teacher" ? "Логин преподавателя" : "Логин студента"}
                  theme={theme}
                  value={login}
                  onChangeText={setLogin}
                  placeholder={role === "teacher" ? "teacher" : "student_login"}
                  autoCorrect={false}
                  autoCapitalize="none"
                />

                <AppInput
                  label="Пароль"
                  theme={theme}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={authMode === "register" ? "Придумай пароль" : "Введите пароль"}
                  secureTextEntry
                  autoCorrect={false}
                  autoCapitalize="none"
                />

                {isStudent ? (
                  <View style={styles.socialFooter}>
                    <Pressable
                      onPress={() => {
                        setStudentEntryMode("social");
                        resetMessages();
                      }}
                      style={styles.inlineLink}
                    >
                      <Text style={styles.inlineLinkText}>Вернуться к Google и VK</Text>
                    </Pressable>
                  </View>
                ) : null}

                <AppButton
                  label={isSubmitting ? "Подождите..." : submitLabel}
                  onPress={() => {
                    void handleSubmit();
                  }}
                  theme={theme}
                  style={styles.primaryButton}
                />
              </>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {successText ? <Text style={styles.successText}>{successText}</Text> : null}

            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>Важно</Text>
              <Text style={styles.noteText}>{helperText}</Text>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

type BrandMarkProps = {
  theme: AppTheme;
  compact?: boolean;
};

function BrandMark({ theme, compact = false }: BrandMarkProps) {
  const styles = createBrandMarkStyles(theme, compact);

  return (
    <View style={styles.shell}>
      <View style={styles.core}>
        <View style={styles.outerRing} />
        <View style={styles.innerRing} />
        <View style={styles.orbit} />
        <View style={styles.dotPrimary} />
        <View style={styles.dotSecondary} />
        <View style={styles.gridLineHorizontal} />
        <View style={styles.gridLineVertical} />
        <Text style={styles.symbol}>VM</Text>
      </View>
    </View>
  );
}

function createBrandMarkStyles(theme: AppTheme, compact: boolean) {
  const size = compact ? 58 : 158;
  const innerSize = compact ? 44 : 118;

  return StyleSheet.create({
    shell: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: compact ? "#EFF4FF" : "#F3F7FF",
      borderWidth: 1,
      borderColor: "#D8E4FF",
      shadowColor: "#17347C",
      shadowOpacity: compact ? 0.08 : 0.16,
      shadowRadius: compact ? 10 : 26,
      shadowOffset: { width: 0, height: compact ? 6 : 16 },
      elevation: compact ? 3 : 7
    },
    core: {
      width: innerSize,
      height: innerSize,
      borderRadius: innerSize / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      position: "relative",
      overflow: "hidden"
    },
    outerRing: {
      position: "absolute",
      width: compact ? 30 : 82,
      height: compact ? 30 : 82,
      borderRadius: 999,
      borderWidth: compact ? 3 : 7,
      borderColor: "rgba(255, 255, 255, 0.24)"
    },
    innerRing: {
      position: "absolute",
      width: compact ? 18 : 48,
      height: compact ? 18 : 48,
      borderRadius: 999,
      borderWidth: compact ? 2 : 4,
      borderColor: "rgba(255, 255, 255, 0.18)"
    },
    orbit: {
      position: "absolute",
      width: compact ? 46 : 116,
      height: compact ? 46 : 116,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.12)"
    },
    dotPrimary: {
      position: "absolute",
      top: compact ? 8 : 20,
      right: compact ? 10 : 28,
      width: compact ? 6 : 12,
      height: compact ? 6 : 12,
      borderRadius: 999,
      backgroundColor: "#FFFFFF"
    },
    dotSecondary: {
      position: "absolute",
      bottom: compact ? 10 : 26,
      left: compact ? 8 : 20,
      width: compact ? 5 : 10,
      height: compact ? 5 : 10,
      borderRadius: 999,
      backgroundColor: "#F9AB00"
    },
    gridLineHorizontal: {
      position: "absolute",
      left: compact ? 9 : 16,
      right: compact ? 9 : 16,
      height: 1,
      backgroundColor: "rgba(255, 255, 255, 0.16)"
    },
    gridLineVertical: {
      position: "absolute",
      top: compact ? 9 : 16,
      bottom: compact ? 9 : 16,
      width: 1,
      backgroundColor: "rgba(255, 255, 255, 0.16)"
    },
    symbol: {
      color: "#FFFFFF",
      fontSize: compact ? 16 : 36,
      fontWeight: "900",
      letterSpacing: compact ? 0.9 : 1.4
    }
  });
}

type RoleCardProps = {
  theme: AppTheme;
  title: string;
  subtitle: string;
  accent: string;
  isActive: boolean;
  onPress: () => void;
  isStacked: boolean;
};

function RoleCard({
  theme,
  title,
  subtitle,
  accent,
  isActive,
  onPress,
  isStacked
}: RoleCardProps) {
  const styles = createRoleCardStyles(theme, isActive, isStacked);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>{accent}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function createRoleCardStyles(theme: AppTheme, isActive: boolean, isStacked: boolean) {
  return StyleSheet.create({
    card: {
      width: isStacked ? "100%" : undefined,
      flex: isStacked ? undefined : 1,
      minHeight: 136,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: isActive ? theme.colors.primary : "#D7E4FF",
      backgroundColor: isActive ? "#EEF4FF" : "rgba(255, 255, 255, 0.86)",
      shadowColor: theme.colors.shadow,
      shadowOpacity: isActive ? 0.1 : 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: isActive ? 4 : 1
    },
    icon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceMuted,
      marginBottom: theme.spacing.sm
    },
    iconText: {
      color: isActive ? "#FFFFFF" : theme.colors.text,
      fontSize: theme.typography.caption,
      fontWeight: "800"
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.sectionTitle,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    subtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 18,
      color: theme.colors.textSecondary
    }
  });
}

type AccessMethodCardProps = {
  theme: AppTheme;
  title: string;
  subtitle: string;
  accent: string;
  isActive: boolean;
  onPress: () => void;
};

function AccessMethodCard({
  theme,
  title,
  subtitle,
  accent,
  isActive,
  onPress
}: AccessMethodCardProps) {
  const styles = createAccessMethodCardStyles(theme, isActive);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={styles.accent}>{accent}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function createAccessMethodCardStyles(theme: AppTheme, isActive: boolean) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 114,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: isActive ? theme.colors.primary : theme.colors.border,
      backgroundColor: isActive ? theme.colors.surface : "rgba(255, 255, 255, 0.62)"
    },
    accent: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.helper,
      fontWeight: "800",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    subtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 18,
      color: theme.colors.textSecondary
    }
  });
}

type ModeChipProps = {
  theme: AppTheme;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

function ModeChip({ theme, label, isActive, onPress }: ModeChipProps) {
  const styles = createModeChipStyles(theme, isActive);

  return (
    <Pressable onPress={onPress} style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function createModeChipStyles(theme: AppTheme, isActive: boolean) {
  return StyleSheet.create({
    chip: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: isActive ? theme.colors.primary : theme.colors.border,
      backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surface,
      alignItems: "center",
      justifyContent: "center"
    },
    label: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: isActive ? theme.colors.primary : theme.colors.text
    }
  });
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 560;
  const isStacked = width < 980;

  return StyleSheet.create({
    page: {
      width: "100%",
      maxWidth: 1160,
      alignSelf: "center"
    },
    introShell: {
      position: "relative",
      overflow: "hidden",
      minHeight: isPhone ? 620 : 700,
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xxl,
      backgroundColor: "#F8FBFF",
      borderWidth: 1,
      borderColor: "#DCE6FA",
      alignItems: "center",
      justifyContent: "center"
    },
    introGlowPrimary: {
      position: "absolute",
      top: -70,
      left: -40,
      width: isPhone ? 220 : 320,
      height: isPhone ? 220 : 320,
      borderRadius: 999,
      backgroundColor: "rgba(36, 87, 230, 0.12)"
    },
    introGlowSecondary: {
      position: "absolute",
      right: -50,
      bottom: -70,
      width: isPhone ? 220 : 320,
      height: isPhone ? 220 : 320,
      borderRadius: 999,
      backgroundColor: "rgba(197, 138, 23, 0.14)"
    },
    introHalo: {
      position: "absolute",
      width: isPhone ? 260 : 420,
      height: isPhone ? 260 : 420,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(36, 87, 230, 0.08)"
    },
    introBrandButton: {
      alignItems: "center",
      justifyContent: "center"
    },
    introTitle: {
      marginTop: theme.spacing.lg,
      fontFamily: theme.fonts.display,
      fontSize: isPhone ? 30 : 46,
      lineHeight: isPhone ? 36 : 52,
      fontWeight: "900",
      color: theme.colors.text
    },
    introHint: {
      marginTop: theme.spacing.sm,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary,
      letterSpacing: 0.3
    },
    authTopRow: {
      flexDirection: isPhone ? "column" : "row",
      alignItems: isPhone ? "stretch" : "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.lg
    },
    backChip: {
      alignSelf: isPhone ? "flex-start" : "auto",
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: isPhone ? theme.spacing.md : 0
    },
    backChipText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.text
    },
    authBrandRow: {
      flexDirection: "row",
      alignItems: "center"
    },
    authBrandTextWrap: {
      marginLeft: theme.spacing.sm
    },
    authBrandTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.text
    },
    authBrandSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary
    },
    layout: {
      flexDirection: isStacked ? "column" : "row",
      alignItems: "stretch"
    },
    selectorPanel: {
      position: "relative",
      overflow: "hidden",
      width: "100%",
      flex: isStacked ? undefined : 1.02,
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xxl,
      backgroundColor: "#F8FBFF",
      borderWidth: 1,
      borderColor: "#DCE6FA",
      marginBottom: isStacked ? theme.spacing.lg : 0,
      marginRight: isStacked ? 0 : theme.spacing.lg
    },
    panelGlow: {
      position: "absolute",
      top: -72,
      right: -52,
      width: 180,
      height: 180,
      borderRadius: 999,
      backgroundColor: "rgba(36, 87, 230, 0.10)"
    },
    panelEyebrow: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    panelTitle: {
      fontFamily: theme.fonts.display,
      fontSize: isPhone ? 24 : theme.typography.hero,
      lineHeight: isPhone ? 30 : theme.typography.hero + 6,
      fontWeight: "900",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    panelSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl
    },
    roleGrid: {
      flexDirection: width < 860 ? "column" : "row",
      gap: theme.spacing.md
    },
    methodSection: {
      marginTop: theme.spacing.xl
    },
    methodTitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    methodSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md
    },
    methodGrid: {
      flexDirection: isPhone ? "column" : "row",
      gap: theme.spacing.md
    },
    teacherCallout: {
      marginTop: theme.spacing.xl,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: "rgba(255, 255, 255, 0.76)",
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    teacherCalloutTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    teacherCalloutText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    formPanel: {
      position: "relative",
      overflow: "hidden",
      width: "100%",
      flex: isStacked ? undefined : 0.98,
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xxl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4
    },
    formPanelGlow: {
      position: "absolute",
      left: -44,
      bottom: -84,
      width: 220,
      height: 220,
      borderRadius: 999,
      backgroundColor: "rgba(249, 171, 0, 0.08)"
    },
    modeRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg
    },
    formTitle: {
      fontFamily: theme.fonts.display,
      fontSize: isPhone ? 22 : theme.typography.screenTitle,
      lineHeight: isPhone ? 28 : theme.typography.screenTitle + 4,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    formSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg
    },
    socialStack: {
      width: "100%"
    },
    vkWidgetShell: {
      marginTop: theme.spacing.sm
    },
    socialButton: {
      marginBottom: theme.spacing.sm
    },
    socialFooter: {
      marginBottom: theme.spacing.md
    },
    inlineLink: {
      alignSelf: "flex-start"
    },
    inlineLinkText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary
    },
    formBadgeRow: {
      alignSelf: "flex-start",
      minHeight: 30,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      marginBottom: theme.spacing.md
    },
    formBadgeText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary
    },
    primaryButton: {
      marginTop: theme.spacing.xs
    },
    errorText: {
      marginTop: theme.spacing.md,
      color: theme.colors.danger,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    },
    successText: {
      marginTop: theme.spacing.md,
      color: theme.colors.success,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    },
    noteCard: {
      marginTop: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: "#F8FBFF",
      borderWidth: 1,
      borderColor: "#DCE6FA"
    },
    noteTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    noteText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    }
  });
}
