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
  const motion = useRef(new Animated.Value(0)).current;
  const horizontalPadding = isPhone ? theme.spacing.md : theme.spacing.md;
  const topPadding = isPhone ? theme.spacing.md : theme.spacing.md;
  const bottomPadding = isPhone
    ? Platform.OS === "web"
      ? 188
      : theme.spacing.xxxl * 4
    : theme.spacing.xxxl * 2;

  useEffect(() => {
    motion.setValue(0);

    Animated.spring(motion, {
      toValue: 1,
      velocity: 0.8,
      tension: 55,
      friction: 8,
      useNativeDriver: true
    }).start();
  }, [motion]);

  const translateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });

  return (
    <KeyboardAvoidingView
      style={[
        styles.root,
        { backgroundColor: theme.colors.background }
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View pointerEvents="none" style={styles.backdrop}>
        <View
          style={[
            styles.orb,
            {
              top: -90,
              left: -70,
              width: isPhone ? 180 : 280,
              height: isPhone ? 180 : 280,
              backgroundColor:
                theme.mode === "dark"
                  ? "rgba(36, 87, 230, 0.14)"
                  : "rgba(36, 87, 230, 0.10)"
            }
          ]}
        />
        <View
          style={[
            styles.orb,
            {
              right: -80,
              top: isPhone ? 160 : 110,
              width: isPhone ? 160 : 240,
              height: isPhone ? 160 : 240,
              backgroundColor:
                theme.mode === "dark"
                  ? "rgba(197, 138, 23, 0.10)"
                  : "rgba(197, 138, 23, 0.10)"
            }
          ]}
        />
        <View
          style={[
            styles.orb,
            {
              bottom: -120,
              left: width < 960 ? -60 : "28%",
              width: isPhone ? 190 : 260,
              height: isPhone ? 190 : 260,
              backgroundColor:
                theme.mode === "dark"
                  ? "rgba(19, 121, 91, 0.10)"
                  : "rgba(19, 121, 91, 0.08)"
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
              opacity: motion,
              transform: [{ translateY }]
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
    maxWidth: 1220,
    alignSelf: "center"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  orb: {
    position: "absolute",
    borderRadius: 999
  }
});
