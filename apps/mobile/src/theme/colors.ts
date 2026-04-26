export type ThemeMode = "light" | "dark";

const commonColors = {
  primary: "#275DF5",
  primarySoft: "#E8EEFF",
  success: "#187A63",
  danger: "#D64933",
  warning: "#D88B1F",
  info: "#275DF5"
};

export function getColors(mode: ThemeMode) {
  if (mode === "dark") {
    return {
      ...commonColors,
      background: "#0A1220",
      surface: "#10192C",
      surfaceMuted: "#14223A",
      surfaceElevated: "#1A2944",
      border: "#243552",
      input: "#0F1A2E",
      text: "#F7FAFF",
      textSecondary: "#93A4C2",
      shadow: "#000000",
      overlay: "rgba(3, 8, 20, 0.74)"
    };
  }

  return {
    ...commonColors,
    background: "#F3F6FD",
    surface: "#FFFFFF",
    surfaceMuted: "#EEF3FD",
    surfaceElevated: "#FBFCFF",
    border: "#D8E1F0",
    input: "#FFFFFF",
    text: "#182335",
    textSecondary: "#66758F",
    shadow: "#152238",
    overlay: "rgba(19, 28, 44, 0.18)"
  };
}
