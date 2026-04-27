import React from "react";
import { Platform } from "react-native";

import { AppNavigation } from "./src/navigation/AppNavigation";

function VercelAnalytics() {
  if (Platform.OS !== "web") {
    return null;
  }

  const { Analytics } =
    require("@vercel/analytics/react") as typeof import("@vercel/analytics/react");

  return <Analytics />;
}

function VercelSpeedInsights() {
  if (Platform.OS !== "web") {
    return null;
  }

  const { SpeedInsights } =
    require("@vercel/speed-insights/react") as typeof import("@vercel/speed-insights/react");

  return <SpeedInsights />;
}

export default function App() {
  return (
    <>
      <AppNavigation />
      <VercelAnalytics />
      <VercelSpeedInsights />
    </>
  );
}
