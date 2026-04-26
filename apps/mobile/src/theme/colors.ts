export type ThemeMode = "light" | "dark";

const commonColors = {
  primary: "#1A73E8",
  primarySoft: "#E8F0FE",
  success: "#188038",
  danger: "#D93025",
  warning: "#F9AB00",
  info: "#1A73E8"
};

export function getColors(mode: ThemeMode) {
  if (mode === "dark") {
    return {
      ...commonColors,
      background: "#0F172A",
      surface: "#111827",
      surfaceMuted: "#172033",
      surfaceElevated: "#1E293B",
      border: "#2A3A52",
      input: "#0F1A2E",
      text: "#F8FAFC",
      textSecondary: "#94A3B8",
      shadow: "#000000",
      overlay: "rgba(2, 6, 23, 0.72)"
    };
  }

  return {
    ...commonColors,
    background: "#F6F8FC",
    surface: "#FFFFFF",
    surfaceMuted: "#F1F3F4",
    surfaceElevated: "#FCFDFF",
    border: "#DADCE0",
    input: "#FFFFFF",
    text: "#202124",
    textSecondary: "#5F6368",
    shadow: "#202124",
    overlay: "rgba(32, 33, 36, 0.18)"
  };
}