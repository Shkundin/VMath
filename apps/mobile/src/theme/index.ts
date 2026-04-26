import { Platform } from "react-native";

import { getColors, type ThemeMode } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";

export type { ThemeMode };

export function createAppTheme(mode: ThemeMode) {
  const colors = getColors(mode);

  return {
    mode,
    colors,
    spacing,
    typography,
    fonts: {
      display: Platform.select({
        web: "\"Iowan Old Style\", \"Palatino Linotype\", Georgia, serif",
        ios: "Georgia",
        default: "serif"
      }),
      body: Platform.select({
        web: "\"Avenir Next\", \"Segoe UI\", \"Helvetica Neue\", Arial, sans-serif",
        ios: "Avenir Next",
        default: "sans-serif"
      }),
      mono: Platform.select({
        web: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", Menlo, monospace",
        ios: "Menlo",
        default: "monospace"
      })
    },
    radius: {
      xs: 8,
      sm: 13,
      md: 16,
      lg: 20,
      xl: 28,
      pill: 999
    },
    shadow: {
      sm: {
        shadowColor: colors.shadow,
        shadowOpacity: mode === "dark" ? 0.18 : 0.07,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2
      },
      md: {
        shadowColor: colors.shadow,
        shadowOpacity: mode === "dark" ? 0.24 : 0.11,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5
      },
      lg: {
        shadowColor: colors.shadow,
        shadowOpacity: mode === "dark" ? 0.28 : 0.13,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 14 },
        elevation: 7
      }
    }
  };
}

export type AppTheme = ReturnType<typeof createAppTheme>;
