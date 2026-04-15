import React from "react";

import { StyleSheet, Text, View } from "react-native";
import { fixTextSafe as fixText } from "../../utils/fixTextSafe";

import type { AppTheme } from "../../theme";

type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

type StatusPillProps = {
  theme: AppTheme;
  label: string;
  tone?: StatusTone;
};

export function StatusPill({
  theme,
  label,
  tone = "neutral"
}: StatusPillProps) {
  const styles = createStyles(theme, tone);

  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{fixText(label)}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme, tone: StatusTone) {
  const palette = {
    neutral: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      textColor: theme.colors.textSecondary
    },
    success: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.success,
      textColor: theme.colors.success
    },
    warning: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.warning,
      textColor: theme.colors.warning
    },
    danger: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.danger,
      textColor: theme.colors.danger
    },
    info: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.primary,
      textColor: theme.colors.primary
    }
  }[tone];

  return StyleSheet.create({
    pill: {
      alignSelf: "flex-start",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: palette.borderColor,
      backgroundColor: palette.backgroundColor,
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    label: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: palette.textColor
    }
  });
}
