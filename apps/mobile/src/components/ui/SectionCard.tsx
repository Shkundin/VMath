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
          padding: isPhone ? theme.spacing.md : theme.spacing.lg,
          ...theme.shadow.md
        },
        style
      ]}
    >
      {title ? (
        <View style={styles.header}>
          <View
            style={[
              styles.accent,
              { backgroundColor: theme.colors.primarySoft }
            ]}
          >
            <View
              style={[
                styles.accentCore,
                { backgroundColor: theme.colors.primary }
              ]}
            />
          </View>

          <View style={styles.headerText}>
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.display,
                  fontSize: theme.typography.sectionTitle
                }
              ]}
            >
              {fixText(title)}
            </Text>

            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.body,
                    fontSize: theme.typography.body
                  }
                ]}
              >
                {fixText(subtitle)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {!title && subtitle ? (
        <Text
          style={[
            styles.subtitleStandalone,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.fonts.body,
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
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16
  },
  accent: {
    width: 16,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  accentCore: {
    width: 5,
    height: 24,
    borderRadius: 999
  },
  headerText: {
    flex: 1,
    minWidth: 0
  },
  title: {
    fontWeight: "700",
    marginBottom: 6
  },
  subtitle: {
    lineHeight: 23
  },
  subtitleStandalone: {
    lineHeight: 23,
    marginBottom: 16
  },
  body: {
    width: "100%",
    minWidth: 0
  }
});
