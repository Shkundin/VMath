import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { fixTextSafe as fixText } from "../../utils/fixTextSafe";
import type { AppTheme } from "../../theme";

type ButtonVariant = "primary" | "secondary" | "ghost";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  theme: AppTheme;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  onPress,
  theme,
  variant = "primary",
  fullWidth = true,
  disabled = false,
  style
}: AppButtonProps) {
  const styles = createStyles(theme, variant, disabled, fullWidth);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, style]}
    >
      <Text style={styles.label}>{fixText(label)}</Text>
    </TouchableOpacity>
  );
}

function createStyles(
  theme: AppTheme,
  variant: ButtonVariant,
  disabled: boolean,
  fullWidth: boolean
) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";

  return StyleSheet.create({
    button: {
      width: fullWidth ? "100%" : undefined,
      maxWidth: "100%",
      minHeight: 52,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 1,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: fullWidth ? "stretch" : "flex-start",
      backgroundColor: isPrimary
        ? theme.colors.primary
        : isSecondary
          ? theme.colors.surfaceElevated
          : theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: isPrimary
        ? theme.colors.primary
        : isSecondary
          ? theme.colors.border
          : theme.colors.surfaceMuted,
      opacity: disabled ? 0.55 : 1,
      ...(isPrimary ? theme.shadow.md : isSecondary ? theme.shadow.sm : {})
    },
    label: {
      color: isPrimary ? "#FFFFFF" : theme.colors.text,
      fontSize: theme.typography.body,
      fontFamily: theme.fonts.body,
      fontWeight: isPrimary ? "800" : "700",
      letterSpacing: 0.15,
      textAlign: "center",
      flexShrink: 1
    }
  });
}
