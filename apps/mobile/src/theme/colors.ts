export type ThemeMode = "light" | "dark";

const commonColors = {
  primary: "#2457E6",
  primarySoft: "#E8EEFF",
  success: "#13795B",
  danger: "#D1472F",
  warning: "#C58A17",
  info: "#2457E6"
};

export function getColors(mode: ThemeMode) {
  if (mode === "dark") {
    return {
      ...commonColors,
      background: "#09111F",
      surface: "#0F192C",
      surfaceMuted: "#13213A",
      surfaceElevated: "#172743",
      border: "#233554",
      input: "#10203A",
      text: "#F6F8FF",
      textSecondary: "#9AA8C4",
      shadow: "#000000",
      overlay: "rgba(2, 6, 23, 0.72)"
    };
  }

  return {
    ...commonColors,
    background: "#F3F6FD",
    surface: "#FFFFFF",
    surfaceMuted: "#EDF2FF",
    surfaceElevated: "#FAFCFF",
    border: "#D7E0EF",
    input: "#FFFFFF",
    text: "#162033",
    textSecondary: "#68758B",
    shadow: "#152238",
    overlay: "rgba(22, 34, 56, 0.18)"
  };
}
