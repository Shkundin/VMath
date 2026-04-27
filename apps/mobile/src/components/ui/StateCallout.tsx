import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { AppTheme } from "../../theme";
import { AppButton } from "./AppButton";

type StateCalloutTone = "neutral" | "info" | "success" | "warning";

type StateCalloutProps = {
  theme: AppTheme;
  title: string;
  description: string;
  tone?: StateCalloutTone;
  actionLabel?: string;
  onAction?: () => void;
};

export function StateCallout({
  theme,
  title,
  description,
  tone = "neutral",
  actionLabel,
  onAction
}: StateCalloutProps) {
  const styles = createStyles(theme);

  return (
    <View
      style={[
        styles.shell,
        tone === "info" ? styles.shellInfo : null,
        tone === "success" ? styles.shellSuccess : null,
        tone === "warning" ? styles.shellWarning : null
      ]}
    >
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          theme={theme}
          variant={tone === "neutral" ? "secondary" : "primary"}
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    shell: {
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated,
      ...theme.shadow.sm
    },
    shellInfo: {
      backgroundColor: theme.mode === "dark" ? "#13213A" : "#EDF2FF",
      borderColor: theme.colors.primary
    },
    shellSuccess: {
      backgroundColor: theme.mode === "dark" ? "#132B23" : "#F0FAF5",
      borderColor: theme.colors.success
    },
    shellWarning: {
      backgroundColor: theme.mode === "dark" ? "#302310" : "#FFF7E8",
      borderColor: theme.colors.warning
    },
    textWrap: {
      marginBottom: theme.spacing.md
    },
    title: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    description: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    action: {
      alignSelf: "flex-start"
    }
  });
}
