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
      return "Вход преподавателя";
    }

    return authMode === "register" ? "Регистрация студента" : "Вход студента";
  }, [role, authMode]);

  const roleSubtitle = useMemo(() => {
    if (role === "teacher") {
      return "Доступ преподавателя открыт только по выданному логину и паролю.";
    }

    return authMode === "register"
      ? "Создай студенческий аккаунт и используй его для входа в учебный кабинет."
      : "Войди в аккаунт, чтобы открыть курсы, материалы, домашние задания и результаты.";
  }, [role, authMode]);

  const submitLabel = useMemo(() => {
    if (role === "teacher") {
      return "Войти как преподаватель";
    }

    return authMode === "register" ? "Зарегистрироваться" : "Войти как студент";
  }, [role, authMode]);

  function applyPreset(nextRole: LoginRole, nextMode: AuthMode) {
    setError("");
    setSuccessText("");
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
      applyPreset(nextRole, "login");
      return;
    }

    applyPreset(nextRole, authMode);
  }

  function handleModeChange(nextMode: AuthMode) {
    if (role === "teacher") {
      return;
    }

    setAuthMode(nextMode);
    applyPreset(role, nextMode);
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
    setError("");
    setSuccessText("");

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
    setError("");
    setSuccessText("");

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
    setError("");
    setSuccessText("");

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

            <Pressable onPress={() => setStage("auth")} style={styles.introBrandButton}>
              <BrandMark theme={theme} />
              <Text style={styles.introTitle}>VisualMath</Text>
              <Text style={styles.introSubtitle}>
                Нажми на эмблему и открой вход в учебное пространство для студента или преподавателя.
              </Text>
            </Pressable>

            <View style={styles.introFeatureGrid}>
              <FeatureTile
                theme={theme}
                code="01"
                title="Курсы"
                subtitle="Лекции, видео и материалы в одном месте."
              />
              <FeatureTile
                theme={theme}
                code="02"
                title="Решатель"
                subtitle="Быстрые вычисления и пошаговые объяснения."
              />
              <FeatureTile
                theme={theme}
                code="03"
                title="Контроль"
                subtitle="Домашние задания, тестирование и итоги."
              />
            </View>

            <AppButton
              label="Открыть вход"
              onPress={() => setStage("auth")}
              theme={theme}
              fullWidth={width < 640}
              style={styles.introButton}
            />

            <View style={styles.partnerRow}>
              <PartnerChip theme={theme} label="Google" />
              <PartnerChip theme={theme} label="VK ID" />
              <PartnerChip theme={theme} label="Mail.ru" />
              <PartnerChip theme={theme} label="OK" />
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen theme={theme}>
      <View style={styles.page}>
        <View style={styles.authTopRow}>
          <Pressable onPress={() => setStage("intro")} style={styles.backChip}>
            <Text style={styles.backChipText}>К эмблеме</Text>
          </Pressable>

          <View style={styles.authBrandRow}>
            <BrandMark theme={theme} compact />
            <View style={styles.authBrandTextWrap}>
              <Text style={styles.authBrandTitle}>VisualMath</Text>
              <Text style={styles.authBrandSubtitle}>Вход в учебный кабинет</Text>
            </View>
          </View>
        </View>

        <View style={styles.layout}>
          <View style={styles.heroPanel}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>VisualMath Mobile</Text>
            </View>

            <Text style={styles.heroTitle}>Математика в одном учебном пространстве</Text>
            <Text style={styles.heroSubtitle}>
              Курсы, материалы, встречи, тестирование и домашние задания в аккуратном интерфейсе учебного кабинета.
            </Text>

            <View style={styles.heroSignals}>
              <HeroSignal theme={theme} title="Курсы" subtitle="Лекции и материалы" />
              <HeroSignal theme={theme} title="Сессии" subtitle="Общие занятия онлайн" />
              <HeroSignal theme={theme} title="Контроль" subtitle="Тесты и результаты" />
            </View>

            <View style={styles.roleGrid}>
              <RoleCard
                theme={theme}
                title="Студент"
                subtitle="Курсы, задания и результаты"
                accent="С"
                isActive={role === "student"}
                onPress={() => handleRoleChange("student")}
                isStacked={width < 860}
                isPhone={width < 560}
              />
              <RoleCard
                theme={theme}
                title="Преподаватель"
                subtitle="Управление курсом и группой"
                accent="П"
                isActive={role === "teacher"}
                onPress={() => handleRoleChange("teacher")}
                isStacked={width < 860}
                isPhone={width < 560}
              />
            </View>
          </View>

          <View style={styles.formPanel}>
            <View style={styles.modeRow}>
              <ModeChip
                theme={theme}
                label="Вход"
                isActive={authMode === "login"}
                onPress={() => handleModeChange("login")}
              />
              {role === "student" ? (
                <ModeChip
                  theme={theme}
                  label="Регистрация"
                  isActive={authMode === "register"}
                  onPress={() => handleModeChange("register")}
                />
              ) : null}
            </View>

            <Text style={styles.formTitle}>{roleTitle}</Text>
            <Text style={styles.formSubtitle}>{roleSubtitle}</Text>

            {role === "student" && authMode === "register" ? (
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {successText ? <Text style={styles.successText}>{successText}</Text> : null}

            <AppButton
              label={isSubmitting ? "Подождите..." : submitLabel}
              onPress={() => {
                void handleSubmit();
              }}
              theme={theme}
              style={styles.primaryButton}
            />

            {role === "student" ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>или</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialSection}>
                  <Text style={styles.socialSectionTitle}>Быстрый вход</Text>
                  <Text style={styles.socialSectionSubtitle}>
                    Официальный вход через Google и VK ID без отдельного пароля для соцсети.
                  </Text>

                  <AppButton
                    label={isGoogleSubmitting ? "Подключаем Google..." : "Продолжить через Google"}
                    onPress={() => {
                      void handleGoogle();
                    }}
                    theme={theme}
                    variant="secondary"
                    style={styles.socialButton}
                  />

                  {vkWebWidget ? (
                    vkWebWidget
                  ) : (
                    <AppButton
                      label={isVkSubmitting ? "Подключаем VK..." : "Продолжить через VK"}
                      onPress={() => {
                        void handleVk();
                      }}
                      theme={theme}
                      variant="secondary"
                    />
                  )}

                  <View style={styles.socialTrustRow}>
                    <PartnerChip theme={theme} label="Google" compact />
                    <PartnerChip theme={theme} label="VK ID" compact />
                    <PartnerChip theme={theme} label="Mail.ru" compact />
                    <PartnerChip theme={theme} label="OK" compact />
                  </View>
                </View>
              </>
            ) : null}

            <Text style={styles.helperText}>
              {role === "teacher"
                ? "Преподавательский доступ: teacher / teacher"
                : authMode === "register"
                  ? "После регистрации студент входит только по сохранённому логину и паролю."
                  : "Если аккаунта ещё нет, сначала зарегистрируйся."}
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

type RoleCardProps = {
  theme: AppTheme;
  title: string;
  subtitle: string;
  accent: string;
  isActive: boolean;
  onPress: () => void;
  isStacked: boolean;
  isPhone: boolean;
};

type BrandMarkProps = {
  theme: AppTheme;
  compact?: boolean;
};

function BrandMark({ theme, compact = false }: BrandMarkProps) {
  const styles = createBrandMarkStyles(theme, compact);

  return (
    <View style={styles.shell}>
      <View style={styles.core}>
        <View style={styles.ring} />
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
  const size = compact ? 54 : 136;
  const innerSize = compact ? 42 : 104;

  return StyleSheet.create({
    shell: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: compact ? "#EFF6FF" : "#E8F0FE",
      borderWidth: 1,
      borderColor: "#C9DBFF"
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
    ring: {
      position: "absolute",
      width: compact ? 28 : 74,
      height: compact ? 28 : 74,
      borderRadius: compact ? 14 : 37,
      borderWidth: compact ? 3 : 6,
      borderColor: "rgba(255, 255, 255, 0.28)"
    },
    dotPrimary: {
      position: "absolute",
      top: compact ? 8 : 18,
      right: compact ? 10 : 24,
      width: compact ? 6 : 12,
      height: compact ? 6 : 12,
      borderRadius: compact ? 3 : 6,
      backgroundColor: "#FFFFFF"
    },
    dotSecondary: {
      position: "absolute",
      bottom: compact ? 10 : 24,
      left: compact ? 8 : 18,
      width: compact ? 5 : 10,
      height: compact ? 5 : 10,
      borderRadius: compact ? 2.5 : 5,
      backgroundColor: "#F9AB00"
    },
    gridLineHorizontal: {
      position: "absolute",
      left: compact ? 8 : 14,
      right: compact ? 8 : 14,
      height: 1,
      backgroundColor: "rgba(255, 255, 255, 0.2)"
    },
    gridLineVertical: {
      position: "absolute",
      top: compact ? 8 : 14,
      bottom: compact ? 8 : 14,
      width: 1,
      backgroundColor: "rgba(255, 255, 255, 0.2)"
    },
    symbol: {
      color: "#FFFFFF",
      fontFamily: theme.fonts.display,
      fontSize: compact ? 16 : 34,
      fontWeight: "900",
      letterSpacing: compact ? 0.8 : 1.2
    }
  });
}

type FeatureTileProps = {
  theme: AppTheme;
  code: string;
  title: string;
  subtitle: string;
};

function FeatureTile({ theme, code, title, subtitle }: FeatureTileProps) {
  const styles = createFeatureTileStyles(theme);

  return (
    <View style={styles.card}>
      <Text style={styles.code}>{code}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function createFeatureTileStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      flexBasis: 180,
      flexGrow: 1,
      minHeight: 116,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: "rgba(255, 255, 255, 0.88)",
      borderWidth: 1,
      borderColor: "#D6E3FF"
    },
    code: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.helper,
      fontWeight: "800",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      letterSpacing: 0.6
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

type PartnerChipProps = {
  theme: AppTheme;
  label: string;
  compact?: boolean;
};

function PartnerChip({ theme, label, compact = false }: PartnerChipProps) {
  const styles = createPartnerChipStyles(theme, compact);

  return (
    <View style={styles.shell}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function createPartnerChipStyles(theme: AppTheme, compact: boolean) {
  return StyleSheet.create({
    shell: {
      minHeight: compact ? 30 : 34,
      paddingHorizontal: compact ? theme.spacing.sm + 2 : theme.spacing.md,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: compact ? theme.colors.border : "#D6E3FF",
      backgroundColor: compact ? theme.colors.surfaceMuted : "rgba(255, 255, 255, 0.88)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.xs,
      marginBottom: theme.spacing.xs
    },
    label: {
      fontFamily: theme.fonts.body,
      fontSize: compact ? theme.typography.helper : theme.typography.caption,
      fontWeight: "800",
      color: compact ? theme.colors.text : theme.colors.primary
    }
  });
}

type HeroSignalProps = {
  theme: AppTheme;
  title: string;
  subtitle: string;
};

function HeroSignal({ theme, title, subtitle }: HeroSignalProps) {
  const styles = createHeroSignalStyles(theme);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function createHeroSignalStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      flexBasis: 156,
      flexGrow: 1,
      minHeight: 72,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      backgroundColor: "rgba(255, 255, 255, 0.72)",
      borderWidth: 1,
      borderColor: "#D6E3FF"
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
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

function RoleCard({
  theme,
  title,
  subtitle,
  accent,
  isActive,
  onPress,
  isStacked,
  isPhone
}: RoleCardProps) {
  const styles = createRoleCardStyles(theme, isActive, isStacked, isPhone);

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

function createRoleCardStyles(theme: AppTheme, isActive: boolean, isStacked: boolean, isPhone: boolean) {
  return StyleSheet.create({
    card: {
      width: isStacked ? "100%" : undefined,
      flex: isStacked ? undefined : 1,
      minHeight: isPhone ? 108 : 132,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: isActive ? theme.colors.primary : theme.colors.border,
      backgroundColor: isActive ? "#EEF5FF" : theme.colors.surface,
      shadowColor: theme.colors.shadow,
      shadowOpacity: isActive ? 0.1 : 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: isActive ? 4 : 1
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceMuted,
      marginBottom: theme.spacing.sm
    },
    iconText: {
      fontFamily: theme.fonts.display,
      color: isActive ? "#FFFFFF" : theme.colors.text,
      fontSize: 16,
      fontWeight: "700"
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
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xxl,
      backgroundColor: "#F7FAFF",
      borderWidth: 1,
      borderColor: "#D7E4FF",
      minHeight: isPhone ? 620 : 680,
      alignItems: "center",
      justifyContent: "space-between",
      ...theme.shadow.lg
    },
    introGlowPrimary: {
      position: "absolute",
      top: -60,
      left: -40,
      width: isPhone ? 180 : 260,
      height: isPhone ? 180 : 260,
      borderRadius: 999,
      backgroundColor: "rgba(26, 115, 232, 0.12)"
    },
    introGlowSecondary: {
      position: "absolute",
      right: -50,
      bottom: -70,
      width: isPhone ? 200 : 280,
      height: isPhone ? 200 : 280,
      borderRadius: 999,
      backgroundColor: "rgba(249, 171, 0, 0.14)"
    },
    introBrandButton: {
      width: "100%",
      alignItems: "center",
      paddingTop: isPhone ? theme.spacing.lg : theme.spacing.xxl
    },
    introTitle: {
      fontFamily: theme.fonts.display,
      marginTop: theme.spacing.lg,
      fontSize: isPhone ? 30 : 44,
      lineHeight: isPhone ? 36 : 50,
      fontWeight: "900",
      color: theme.colors.text
    },
    introSubtitle: {
      fontFamily: theme.fonts.body,
      marginTop: theme.spacing.sm,
      fontSize: isPhone ? theme.typography.body : theme.typography.sectionTitle,
      lineHeight: isPhone ? 22 : 28,
      color: theme.colors.textSecondary,
      textAlign: "center",
      maxWidth: 620
    },
    introFeatureGrid: {
      width: "100%",
      flexDirection: isPhone ? "column" : "row",
      gap: theme.spacing.md
    },
    introButton: {
      marginTop: theme.spacing.xl
    },
    partnerRow: {
      width: "100%",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      marginTop: theme.spacing.lg
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
      fontWeight: "800",
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
    heroPanel: {
      width: "100%",
      flex: isStacked ? undefined : 1.1,
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xxl,
      backgroundColor: "#F7FAFF",
      borderWidth: 1,
      borderColor: "#D7E4FF",
      marginBottom: isStacked ? theme.spacing.lg : 0,
      marginRight: isStacked ? 0 : theme.spacing.lg,
      ...theme.shadow.lg
    },
    formPanel: {
      width: "100%",
      flex: isStacked ? undefined : 0.95,
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xxl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.lg
    },
    heroBadge: {
      alignSelf: "flex-start",
      minHeight: 30,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primarySoft,
      justifyContent: "center",
      marginBottom: theme.spacing.md
    },
    heroBadgeText: {
      fontFamily: theme.fonts.body,
      color: theme.colors.primary,
      fontSize: theme.typography.caption,
      fontWeight: "800"
    },
    heroTitle: {
      fontFamily: theme.fonts.display,
      fontSize: isPhone ? 24 : theme.typography.hero,
      lineHeight: isPhone ? 30 : theme.typography.hero + 6,
      fontWeight: "900",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    heroSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xl,
      maxWidth: 520
    },
    heroSignals: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl
    },
    roleGrid: {
      flexDirection: width < 860 ? "column" : "row",
      alignItems: "stretch",
      gap: theme.spacing.md
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
      fontWeight: "700",
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
    errorText: {
      fontFamily: theme.fonts.body,
      color: theme.colors.danger,
      fontSize: theme.typography.caption,
      marginBottom: theme.spacing.sm,
      fontWeight: "700"
    },
    successText: {
      fontFamily: theme.fonts.body,
      color: theme.colors.success,
      fontSize: theme.typography.caption,
      marginBottom: theme.spacing.sm,
      fontWeight: "700"
    },
    primaryButton: {
      marginTop: theme.spacing.xs
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.lg
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border
    },
    dividerText: {
      fontFamily: theme.fonts.body,
      marginHorizontal: theme.spacing.md,
      color: theme.colors.textSecondary,
      fontSize: theme.typography.caption,
      fontWeight: "800"
    },
    socialButton: {
      marginBottom: theme.spacing.sm
    },
    socialSection: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    socialSectionTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    socialSectionSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md
    },
    socialTrustRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: theme.spacing.sm
    },
    helperText: {
      marginTop: theme.spacing.lg,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary,
      textAlign: "center"
    }
  });
}
