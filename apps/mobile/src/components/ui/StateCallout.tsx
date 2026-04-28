import React from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import type { AppTheme } from "../../theme";
import { fixTextSafe as fixText } from "../../utils/fixTextSafe";

type StateCalloutTone = "info" | "success" | "warning" | "danger";

type StateCalloutProps = {
  theme: AppTheme;
  tone?: StateCalloutTone;
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StateCallout({
  theme,
  tone = "info",
  icon = "•",
  title,
  description,
  actionLabel,
  onAction
}: StateCalloutProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width, tone);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.iconText}>{fixText(icon)}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{fixText(title)}</Text>
        <Text style={styles.description}>{fixText(description)}</Text>

        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={styles.action}>
            <Text style={styles.actionText}>{fixText(actionLabel)}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme, width: number, tone: StateCalloutTone) {
  const isPhone = width < 560;
  const toneStyles = {
    info: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primarySoft,
      iconColor: theme.colors.primary
    },
    success: {
      backgroundColor: "#EAF7F1",
      borderColor: "#EAF7F1",
      iconColor: theme.colors.success
    },
    warning: {
      backgroundColor: "#FFF6E5",
      borderColor: "#FFF6E5",
      iconColor: theme.colors.warning
    },
    danger: {
      backgroundColor: "#FDEDEA",
      borderColor: "#FDEDEA",
      iconColor: theme.colors.danger
    }
  }[tone];

  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "flex-start",
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: toneStyles.borderColor,
      backgroundColor: toneStyles.backgroundColor,
      padding: isPhone ? theme.spacing.md : theme.spacing.lg
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing.md
    },
    iconText: {
      fontFamily: theme.fonts.display,
      fontSize: 22,
      lineHeight: 22,
      fontWeight: "700",
      color: toneStyles.iconColor
    },
    content: {
      flex: 1,
      minWidth: 0
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
      alignSelf: "flex-start",
      minHeight: 34,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      marginTop: theme.spacing.md
    },
    actionText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: toneStyles.iconColor
    }
  });
}
