import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import type { AppTheme } from "../../theme";
import { fixTextSafe as fixText } from "../../utils/fixTextSafe";

type ScreenHeaderProps = {
  theme: AppTheme;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export function ScreenHeader({
  theme,
  title,
  subtitle,
  rightSlot
}: ScreenHeaderProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 720;
  const isNarrowPhone = width < 560;
  const titleSize = isNarrowPhone ? theme.typography.title : theme.typography.screenTitle;

  return (
    <View
      style={[
        styles.wrapper,
        {
          flexDirection: isPhone ? "column" : "row",
          alignItems: isPhone ? "flex-start" : "center",
          justifyContent: "space-between",
          marginBottom: theme.spacing.lg
        }
      ]}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.kicker,
            {
              backgroundColor: theme.colors.primarySoft
            }
          ]}
        >
          <Text
            style={[
              styles.kickerText,
              {
                color: theme.colors.primary,
                fontFamily: theme.fonts.body
              }
            ]}
          >
            VisualMath
          </Text>
        </View>

        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
              fontFamily: theme.fonts.display,
              fontSize: titleSize,
              lineHeight: titleSize + 6
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
                fontSize: theme.typography.body,
                lineHeight: isPhone ? 22 : 24
              }
            ]}
          >
            {fixText(subtitle)}
          </Text>
        ) : null}
      </View>

      {rightSlot ? (
        <View
          style={[
            styles.right,
            {
              marginTop: isPhone ? theme.spacing.md : 0,
              alignSelf: isPhone ? "stretch" : "auto",
              width: isPhone ? "100%" : undefined
            }
          ]}
        >
          {rightSlot}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    minWidth: 0
  },
  left: {
    flexShrink: 1,
    width: "100%",
    minWidth: 0
  },
  right: {
    minWidth: 0
  },
  kicker: {
    alignSelf: "flex-start",
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    justifyContent: "center",
    marginBottom: 10
  },
  kickerText: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.45,
    textTransform: "uppercase"
  },
  title: {
    fontWeight: "700",
    marginBottom: 8
  },
  subtitle: {
    lineHeight: 24
  }
});
