import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import type { AppTheme } from "../../theme";

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
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text,
              fontSize: titleSize,
              lineHeight: titleSize + 4
            }
          ]}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.body,
                lineHeight: isPhone ? 22 : 24
              }
            ]}
          >
            {subtitle}
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
  title: {
    fontWeight: "900",
    marginBottom: 8
  },
  subtitle: {
    lineHeight: 24
  }
});
