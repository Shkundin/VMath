import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LectureItem } from "../mocks/lectures";
import type { ThemeMode } from "../theme";

const PREFIX = "vmMobileCache_v2";

const STORAGE_KEYS = {
  catalogSnapshot: `${PREFIX}:catalogSnapshot_v2`,
  deletedLectureIds: `${PREFIX}:deletedLectureIds_v1`,
  lastLectureId: `${PREFIX}:lastLectureId_v2`,
  themeMode: `${PREFIX}:themeMode_v2`,
  notificationsEnabled: `${PREFIX}:notificationsEnabled_v2`
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

export async function readCatalogSnapshot(): Promise<LectureItem[] | null> {
  return readJson<LectureItem[]>(STORAGE_KEYS.catalogSnapshot);
}

export async function writeCatalogSnapshot(lectures: LectureItem[]): Promise<void> {
  await writeJson(STORAGE_KEYS.catalogSnapshot, lectures);
}

export async function readDeletedLectureIds(): Promise<string[] | null> {
  return readJson<string[]>(STORAGE_KEYS.deletedLectureIds);
}

export async function writeDeletedLectureIds(lectureIds: string[]): Promise<void> {
  await writeJson(STORAGE_KEYS.deletedLectureIds, [...new Set(lectureIds)]);
}

export async function readLastLectureId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.lastLectureId);
}

export async function writeLastLectureId(lectureId: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.lastLectureId, lectureId);
}

export async function clearLastLectureId(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.lastLectureId);
}

export async function readThemeMode(): Promise<ThemeMode | null> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.themeMode);

  if (value === "light" || value === "dark") {
    return value;
  }

  return null;
}

export async function writeThemeMode(themeMode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.themeMode, themeMode);
}

export async function readNotificationsEnabled(): Promise<boolean | null> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.notificationsEnabled);

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

export async function writeNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.notificationsEnabled, String(enabled));
}
