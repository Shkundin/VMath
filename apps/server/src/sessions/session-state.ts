import type { SessionStatus } from "@vm/shared";

export function transitionSessionStatus(
  current: SessionStatus,
  action: "start" | "stop" | "reset"
): SessionStatus {
  if (action === "start") {
    if (current === "stopped") {
      throw new Error("Stopped sessions cannot be restarted");
    }

    return "active";
  }

  if (action === "stop") {
    return "stopped";
  }

  return "draft";
}
