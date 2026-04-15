const CP1251_EXTRA_ENCODE = new Map<string, number>([
  ["Ђ", 0x80],
  ["Ѓ", 0x81],
  ["‚", 0x82],
  ["ѓ", 0x83],
  ["„", 0x84],
  ["…", 0x85],
  ["†", 0x86],
  ["‡", 0x87],
  ["€", 0x88],
  ["‰", 0x89],
  ["Љ", 0x8a],
  ["‹", 0x8b],
  ["Њ", 0x8c],
  ["Ќ", 0x8d],
  ["Ћ", 0x8e],
  ["Џ", 0x8f],
  ["ђ", 0x90],
  ["‘", 0x91],
  ["’", 0x92],
  ["“", 0x93],
  ["”", 0x94],
  ["•", 0x95],
  ["–", 0x96],
  ["—", 0x97],
  ["™", 0x99],
  ["љ", 0x9b],
  ["њ", 0x9c],
  ["ћ", 0x9d],
  ["џ", 0x9f],
  ["Ў", 0xa1],
  ["ў", 0xa2],
  ["Ј", 0xa3],
  ["¤", 0xa4],
  ["Ґ", 0xa5],
  ["¦", 0xa6],
  ["§", 0xa7],
  ["Ё", 0xa8],
  ["©", 0xa9],
  ["Є", 0xaa],
  ["«", 0xab],
  ["¬", 0xac],
  ["­", 0xad],
  ["®", 0xae],
  ["Ї", 0xaf],
  ["°", 0xb0],
  ["±", 0xb1],
  ["І", 0xb2],
  ["і", 0xb3],
  ["ґ", 0xb4],
  ["µ", 0xb5],
  ["¶", 0xb6],
  ["·", 0xb7],
  ["ё", 0xb8],
  ["№", 0xb9],
  ["є", 0xba],
  ["»", 0xbb],
  ["ј", 0xbc],
  ["Ѕ", 0xbd],
  ["ѕ", 0xbe],
  ["ї", 0xbf]
]);

function scoreText(value: string): number {
  const cyrillic = (value.match(/[А-Яа-яЁё]/g) ?? []).length;
  const latin = (value.match(/[A-Za-z]/g) ?? []).length;
  const mojibake = (value.match(/[ÐÑÃÂРСЃвЂ]/g) ?? []).length;
  const replacement = (value.match(/\uFFFD/g) ?? []).length;
  return cyrillic * 3 + latin - mojibake * 4 - replacement * 6;
}

function decodeUtf8Bytes(bytes: number[]): string | null {
  try {
    const encoded = bytes
      .map((byte) => `%${byte.toString(16).padStart(2, "0")}`)
      .join("");
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

function encodeCp1251(value: string): number[] | null {
  const bytes: number[] = [];

  for (const char of value) {
    const code = char.charCodeAt(0);

    if (code <= 0x7f) {
      bytes.push(code);
      continue;
    }

    if (code >= 0x0410 && code <= 0x044f) {
      bytes.push(code - 0x350);
      continue;
    }

    const extra = CP1251_EXTRA_ENCODE.get(char);
    if (extra !== undefined) {
      bytes.push(extra);
      continue;
    }

    return null;
  }

  return bytes;
}

function decodeUtf8FromCp1251(value: string): string | null {
  const bytes = encodeCp1251(value);
  return bytes ? decodeUtf8Bytes(bytes) : null;
}

function decodeUtf8FromLatin1(value: string): string | null {
  const bytes: number[] = [];

  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code > 0xff) {
      return null;
    }

    bytes.push(code);
  }

  return decodeUtf8Bytes(bytes);
}

export function fixTextSafe(value: string): string {
  const source = String(value ?? "").replace(/^\uFEFF/, "");
  if (!source) {
    return "";
  }

  const candidates = new Set<string>([source]);
  let frontier = [source];

  for (let depth = 0; depth < 3; depth += 1) {
    const next: string[] = [];

    for (const current of frontier) {
      for (const candidate of [
        decodeUtf8FromLatin1(current),
        decodeUtf8FromCp1251(current)
      ]) {
        if (candidate && !candidates.has(candidate)) {
          candidates.add(candidate);
          next.push(candidate);
        }
      }
    }

    frontier = next;
    if (frontier.length === 0) {
      break;
    }
  }

  let best = source;
  let bestScore = scoreText(source);

  for (const candidate of candidates) {
    const nextScore = scoreText(candidate);
    if (nextScore > bestScore) {
      best = candidate;
      bestScore = nextScore;
    }
  }

  return best;
}

export function fixTextSafeList(values: string[]): string[] {
  return values.map((value) => fixTextSafe(value));
}
