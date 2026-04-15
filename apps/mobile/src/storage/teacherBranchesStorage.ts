import AsyncStorage from "@react-native-async-storage/async-storage";

export type TeacherBranch = {
  teacherLogin: string;
  teacherName: string;
  title: string;
  description: string;
  createdAt: string;
  joinCode: string;
};

const STORAGE_KEYS = {
  branches: "vmTeacherBranches_v1:teacherBranches_v1",
  selectedTeacherLogin: "vmTeacherBranches_v1:selectedTeacherLogin_v1"
} as const;

async function readJson<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function normalizeTeacherJoinCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function formatTeacherJoinCode(value: string): string {
  const parts = value.match(/.{1,4}/g) ?? [value];
  return parts.join("-");
}

export function createTeacherJoinCode(teacherLogin: string): string {
  const normalizedLogin = teacherLogin.trim().toLowerCase();
  const cleanedLogin = normalizeTeacherJoinCode(normalizedLogin) || "VMCLASS";
  let hash = 0;

  for (const symbol of normalizedLogin) {
    hash = (hash * 31 + symbol.charCodeAt(0)) % 1679616;
  }

  const suffix = hash.toString(36).toUpperCase().padStart(4, "0");
  const rawCode = `${cleanedLogin}${suffix}`.slice(0, 8);

  return formatTeacherJoinCode(rawCode);
}

function normalizeBranch(branch: TeacherBranch): TeacherBranch {
  return {
    ...branch,
    joinCode: branch.joinCode || createTeacherJoinCode(branch.teacherLogin)
  };
}

export async function readTeacherBranches(): Promise<TeacherBranch[] | null> {
  const branches = await readJson<TeacherBranch[]>(STORAGE_KEYS.branches);

  if (!Array.isArray(branches)) {
    return null;
  }

  return branches.map(normalizeBranch);
}

export async function writeTeacherBranches(branches: TeacherBranch[]): Promise<void> {
  await writeJson(STORAGE_KEYS.branches, branches.map(normalizeBranch));
}

export async function readSelectedTeacherLogin(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.selectedTeacherLogin);
}

export async function writeSelectedTeacherLogin(value: string | null): Promise<void> {
  if (!value) {
    await AsyncStorage.removeItem(STORAGE_KEYS.selectedTeacherLogin);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEYS.selectedTeacherLogin, value);
}
