import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";

import type { AppTheme } from "../../theme";
import { fixTextSafe as fixText } from "../../utils/fixTextSafe";

export type AppToastTone = "success" | "warning" | "danger" | "info";

export type AppToast = {
  id: number;
  message?: string;
  title: string;
  tone: AppToastTone;
};

type AppToastHostProps = {
  onDismiss: () => void;
  theme: AppTheme;
  toast: AppToast | null;
};

export function AppToastHost({ onDismiss, theme, toast }: AppToastHostProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 720;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-18)).current;

  const palette = useMemo(() => {
    if (!toast) {
      return {
        accent: theme.colors.primary,
        backgroundColor: theme.colors.surface,
        titleColor: theme.colors.text
      };
    }

    if (toast.tone === "success") {
      return {
        accent: theme.colors.success,
        backgroundColor: theme.mode === "dark" ? "#132B23" : "#F0FAF5",
        titleColor: theme.colors.text
      };
    }

    if (toast.tone === "warning") {
      return {
        accent: theme.colors.warning,
        backgroundColor: theme.mode === "dark" ? "#302310" : "#FFF7E8",
        titleColor: theme.colors.text
      };
    }

    if (toast.tone === "danger") {
      return {
        accent: theme.colors.danger,
        backgroundColor: theme.mode === "dark" ? "#311A17" : "#FFF2EF",
        titleColor: theme.colors.text
      };
    }

    return {
      accent: theme.colors.primary,
      backgroundColor: theme.mode === "dark" ? "#13213A" : "#EDF2FF",
      titleColor: theme.colors.text
    };
  }, [theme, toast]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    opacity.setValue(0);
    translateY.setValue(-18);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    const timeoutId = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: -14,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true
        })
      ]).start(({ finished }) => {
        if (finished) {
          onDismiss();
        }
      });
    }, 3200);

    return () => clearTimeout(timeoutId);
  }, [onDismiss, opacity, toast, translateY]);

  if (!toast) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.toastWrap,
          {
            left: isPhone ? 12 : undefined,
            right: isPhone ? 12 : 20,
            maxWidth: isPhone ? undefined : 420,
            opacity,
            transform: [{ translateY }]
          }
        ]}
      >
        <Pressable
          onPress={onDismiss}
          style={[
            styles.toast,
            {
              backgroundColor: palette.backgroundColor,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow
            }
          ]}
        >
          <View
            style={[
              styles.accent,
              { backgroundColor: palette.accent }
            ]}
          />

          <View style={styles.content}>
            <Text
              style={[
                styles.title,
                {
                  color: palette.titleColor,
                  fontFamily: theme.fonts.display
                }
              ]}
            >
              {fixText(toast.title)}
            </Text>

            {toast.message ? (
              <Text
                style={[
                  styles.message,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.body
                  }
                ]}
              >
                {fixText(toast.message)}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 120
  },
  toastWrap: {
    position: "absolute",
    top: 14
  },
  toast: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  accent: {
    width: 5
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  title: {
    fontSize: 16,
    fontWeight: "700"
  },
  message: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18
  }
});
