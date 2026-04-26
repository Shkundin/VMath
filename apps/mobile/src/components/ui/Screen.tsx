import React, { useEffect, useRef } from "react";
import {
  Animated,
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
  const isPhone = width < 640;
  const horizontalPadding = isPhone ? theme.spacing.md : theme.spacing.lg;
  const topPadding = isPhone ? theme.spacing.md : theme.spacing.lg;
  const bottomPadding = isPhone
    ? Platform.OS === "web"
      ? 188
      : theme.spacing.xxxl * 4
    : theme.spacing.xxxl * 2;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true
      })
    ]).start();
  }, [fadeAnim, translateAnim]);

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        { backgroundColor: theme.colors.background }
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View
          style={[
            styles.glow,
            styles.glowPrimary,
            {
              backgroundColor: theme.colors.primarySoft,
              opacity: theme.mode === "dark" ? 0.2 : 0.9
            }
          ]}
        />
        <View
          style={[
            styles.glow,
            styles.glowWarm,
            {
              backgroundColor: "rgba(216, 139, 31, 0.14)",
              opacity: theme.mode === "dark" ? 0.18 : 1
            }
          ]}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: topPadding,
            paddingBottom: bottomPadding
          }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        bounces
      >
        <Animated.View
          style={[
            styles.inner,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }]
            }
          ]}
        >
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden"
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject
  },
  glow: {
    position: "absolute",
    borderRadius: 999
  },
  glowPrimary: {
    top: -120,
    right: -80,
    width: 300,
    height: 300
  },
  glowWarm: {
    left: -110,
    bottom: 40,
    width: 260,
    height: 260
  },
  scroll: {
    flex: 1,
    minWidth: 0
  },
  content: {
    flexGrow: 1,
    width: "100%"
  },
  inner: {
    width: "100%",
    minWidth: 0,
    alignSelf: "stretch"
  }
});
