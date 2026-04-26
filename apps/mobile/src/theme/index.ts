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
    radius: {
      xs: 8,
      sm: 12,
      md: 14,
      lg: 18,
      xl: 24,
      pill: 999
    },
    shadow: {
      sm: {
        shadowColor: colors.shadow,
        shadowOpacity: mode === "dark" ? 0.18 : 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2
      },
      md: {
        shadowColor: colors.shadow,
        shadowOpacity: mode === "dark" ? 0.22 : 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4
      },
      lg: {
        shadowColor: colors.shadow,
        shadowOpacity: mode === "dark" ? 0.26 : 0.12,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6
      }
    }
  };
}

export type AppTheme = ReturnType<typeof createAppTheme>;