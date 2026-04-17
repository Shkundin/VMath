import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions
} from "react-native";

import type { AppTheme } from "../../theme";
import { fixTextSafe as fixText } from "../../utils/fixTextSafe";

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
  const { width } = useWindowDimensions();
  const isPhone = width < 560;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: isPhone ? theme.radius.lg : theme.radius.xl,
          padding: isPhone ? theme.spacing.md : theme.spacing.lg
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
          {fixText(title)}
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
          {fixText(subtitle)}
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
    alignSelf: "stretch",
    overflow: "visible"
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
