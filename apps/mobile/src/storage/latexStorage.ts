export type LatexDocumentState = {
  title: string;
  source: string;
  authorName: string;
  updatedAt: string;
};

type LatexDocumentsMap = Record<string, LatexDocumentState>;

const STORAGE_KEY = "vm_mobile_latex_documents_v2";
const LEGACY_STORAGE_KEY = "vm_mobile_latex_document_v1";
const GLOBAL_SCOPE_KEY = "__global__";

const DEFAULT_LATEX_SOURCE = String.raw`Рассмотрим функцию $f(x) = x^2$.

Её производная:
$$
f'(x) = \lim_{h \to 0}\frac{(x+h)^2 - x^2}{h} = 2x
$$

Ряд Тейлора для $e^x$:
$$
e^x = \sum_{n=0}^{\infty}\frac{x^n}{n!}
$$

Интеграл:
$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$`;

function getStorage(): Storage | null {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

function getScopeKey(teacherLogin?: string | null): string {
  const safeLogin = teacherLogin?.trim().toLowerCase();
  return safeLogin || GLOBAL_SCOPE_KEY;
}

function normalizeDocument(document?: Partial<LatexDocumentState> | null): LatexDocumentState {
  return {
    title: typeof document?.title === "string" && document.title.trim()
      ? document.title
      : "LaTeX-конспект",
    source: typeof document?.source === "string" && document.source.trim()
      ? document.source
      : DEFAULT_LATEX_SOURCE,
    authorName: typeof document?.authorName === "string" && document.authorName.trim()
      ? document.authorName
      : "VisualMath",
    updatedAt: typeof document?.updatedAt === "string" && document.updatedAt.trim()
      ? document.updatedAt
      : new Date().toISOString()
  };
}

export function createDefaultLatexDocument(authorName = "VisualMath"): LatexDocumentState {
  return {
    title: "LaTeX-конспект",
    source: DEFAULT_LATEX_SOURCE,
    authorName,
    updatedAt: new Date().toISOString()
  };
}

export function readLatexDocument(teacherLogin?: string | null): LatexDocumentState {
  const storage = getStorage();
  const scopeKey = getScopeKey(teacherLogin);

  if (!storage) {
    return createDefaultLatexDocument();
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as LatexDocumentsMap;
      return normalizeDocument(parsed?.[scopeKey] ?? parsed?.[GLOBAL_SCOPE_KEY]);
    }

    const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);

    if (!legacyRaw) {
      return createDefaultLatexDocument();
    }

    const normalized = normalizeDocument(JSON.parse(legacyRaw) as Partial<LatexDocumentState>);
    storage.setItem(STORAGE_KEY, JSON.stringify({ [scopeKey]: normalized } satisfies LatexDocumentsMap));

    return normalized;
  } catch {
    return createDefaultLatexDocument();
  }
}

export async function writeLatexDocument(
  document: LatexDocumentState,
  teacherLogin?: string | null
): Promise<void> {
  const storage = getStorage();
  const scopeKey = getScopeKey(teacherLogin);

  if (!storage) {
    return;
  }

  let currentDocuments: LatexDocumentsMap = {};

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      currentDocuments = JSON.parse(raw) as LatexDocumentsMap;
    }
  } catch {}

  currentDocuments[scopeKey] = normalizeDocument(document);
  storage.setItem(STORAGE_KEY, JSON.stringify(currentDocuments));
}
