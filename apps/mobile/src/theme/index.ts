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
        web: "Georgia",
        ios: "Georgia",
        default: "serif"
      }),
      body: Platform.select({
        web: "Trebuchet MS",
        ios: "Avenir Next",
        default: "sans-serif"
      }),
      mono: Platform.select({
        web: "Courier New",
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
        shadowOpacity: mode === "dark" ? 0.22 : 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2
      },
      md: {
        shadowColor: colors.shadow,
        shadowOpacity: mode === "dark" ? 0.26 : 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5
      },
      lg: {
        shadowColor: colors.shadow,
        shadowOpacity: mode === "dark" ? 0.3 : 0.14,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 14 },
        elevation: 7
      }
    }
  };
}

export type AppTheme = ReturnType<typeof createAppTheme>;
