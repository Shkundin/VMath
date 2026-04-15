import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
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
  style?: ViewStyle;
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
      minHeight: 46,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: fullWidth ? "stretch" : "flex-start",
      backgroundColor: isPrimary
        ? theme.colors.primary
        : isSecondary
          ? theme.colors.surface
          : "transparent",
      borderWidth: isGhost ? 0 : 1,
      borderColor: isPrimary ? theme.colors.primary : theme.colors.border,
      opacity: disabled ? 0.55 : 1,
      ...(isPrimary ? theme.shadow.sm : {})
    },
    label: {
      color: isPrimary ? "#FFFFFF" : theme.colors.text,
      fontSize: theme.typography.body,
      fontWeight: "700",
      letterSpacing: 0.1,
      textAlign: "center",
      flexShrink: 1
    }
  });
}
