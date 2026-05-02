import React from "react";

import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppButton } from "./AppButton";
import type { AppTheme } from "../../theme";
import { fixTextSafe as fixText } from "../../utils/fixTextSafe";

type OfflineStateProps = {
  theme: AppTheme;
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function OfflineState({
  theme,
  title = "Материалы открыты из сохраненной версии",
  description = "Можно продолжать обучение. Когда данные обновятся, приложение аккуратно подтянет свежие лекции и результаты.",
  onRetry
}: OfflineStateProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width, Boolean(onRetry));

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>{fixText(title)}</Text>
        <Text style={styles.description}>{fixText(description)}</Text>
      </View>
      {onRetry ? (
        <AppButton
          label="Обновить"
          onPress={onRetry}
          theme={theme}
          variant="secondary"
          fullWidth={false}
          style={styles.retryButton}
        />
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme, width: number, hasRetry: boolean) {
  const isPhone = width < 560;

  return StyleSheet.create({
    container: {
      flexDirection: isPhone ? "column" : "row",
      alignItems: isPhone ? "stretch" : "center",
      justifyContent: "space-between",
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.md
    },
    copy: {
      flex: 1,
      minWidth: 0,
      paddingRight: isPhone ? 0 : theme.spacing.lg
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      marginBottom: theme.spacing.xs,
      textAlign: isPhone ? "center" : "left"
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.body,
      lineHeight: 22,
      textAlign: isPhone ? "center" : "left",
      marginBottom: isPhone && hasRetry ? theme.spacing.md : 0
    },
    retryButton: {
      alignSelf: isPhone ? "stretch" : "flex-start",
      minWidth: isPhone ? undefined : 180
    }
  });
}
