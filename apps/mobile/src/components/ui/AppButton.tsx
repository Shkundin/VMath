import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
  const [isHovered, setIsHovered] = useState(false);
  const styles = createStyles(theme, variant, disabled, fullWidth, isHovered);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onHoverIn={Platform.OS === "web" ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setIsHovered(false) : undefined}
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.buttonPressed : null,
        style
      ]}
    >
      <Text style={styles.label}>{fixText(label)}</Text>
    </Pressable>
  );
}

function createStyles(
  theme: AppTheme,
  variant: ButtonVariant,
  disabled: boolean,
  fullWidth: boolean,
  isHovered: boolean
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
        ? isHovered
          ? "#1F52E6"
          : theme.colors.primary
        : isSecondary
          ? isHovered
            ? theme.colors.surfaceMuted
            : theme.colors.surface
          : "transparent",
      borderWidth: isGhost ? 0 : 1,
      borderColor: isPrimary ? theme.colors.primary : theme.colors.border,
      opacity: disabled ? 0.5 : 1,
      transform: [{ translateY: isHovered && !disabled ? -1 : 0 }],
      ...(isPrimary ? theme.shadow.md : isSecondary ? theme.shadow.sm : {})
    },
    buttonPressed: {
      transform: [{ translateY: 0.5 }]
    },
    label: {
      color: isPrimary ? "#FFFFFF" : theme.colors.text,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      fontWeight: isPrimary ? "800" : "700",
      letterSpacing: isPrimary ? 0.2 : 0.1,
      textAlign: "center",
      flexShrink: 1
    }
  });
}
