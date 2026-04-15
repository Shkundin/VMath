import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import type { AppTheme } from "../../theme";

type SectionCardProps = {
  theme: AppTheme;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SectionCard({
  theme,
  title,
  subtitle,
  children,
  style
}: SectionCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.lg
        },
        style
      ]}
    >
      {title ? (
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
              fontSize: theme.typography.sectionTitle
            }
          ]}
        >
          {title}
        </Text>
      ) : null}

      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.body
            }
          ]}
        >
          {subtitle}
        </Text>
      ) : null}

      <View style={styles.body}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minWidth: 0,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden"
  },
  title: {
    fontWeight: "900",
    marginBottom: 8
  },
  subtitle: {
    lineHeight: 24,
    marginBottom: 16
  },
  body: {
    width: "100%",
    minWidth: 0
  }
});
