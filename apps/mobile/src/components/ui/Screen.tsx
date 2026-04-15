import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions
} from "react-native";

import type { AppTheme } from "../../theme";

type ScreenProps = {
  theme: AppTheme;
  children: React.ReactNode;
};

export function Screen({ theme, children }: ScreenProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 560;

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        { backgroundColor: theme.colors.background }
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isPhone ? theme.spacing.sm : theme.spacing.md,
            paddingTop: isPhone ? theme.spacing.sm : theme.spacing.md,
            paddingBottom: isPhone ? theme.spacing.xl * 4 : theme.spacing.xl * 2
          }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        bounces
      >
        <View style={styles.inner}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minWidth: 0
  },
  scroll: {
    flex: 1,
    minWidth: 0
  },
  content: {
    flexGrow: 1
  },
  inner: {
    width: "100%",
    minWidth: 0,
    alignSelf: "stretch"
  }
});
