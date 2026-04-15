import type { Role } from "@vm/shared";

export function canManageTeacherOwnedResource(
  currentUser: { role: Role; userId: string },
  ownerId?: string | null
): boolean {
  if (currentUser.role === "admin") {
    return true;
  }

  if (currentUser.role !== "teacher") {
    return false;
  }

  if (!ownerId) {
    return true;
  }

  return currentUser.userId === ownerId;
}

export function canReadLectureByRole(input: {
  currentUser: { role: Role; userId: string };
  authorId: string;
  status: "draft" | "published" | "archived";
  availableForRoles: Role[];
}): boolean {
  if (input.currentUser.role === "admin") {
    return true;
  }

  if (input.currentUser.userId === input.authorId) {
    return true;
  }

  return input.status === "published" && input.availableForRoles.includes(input.currentUser.role);
}
