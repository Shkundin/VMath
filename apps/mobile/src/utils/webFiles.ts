import { Platform } from "react-native";

export type WebPickedFile = {
  fileName: string;
  fileType: string;
  mimeType: string;
  fileData: string;
  fileSize: number;
};

const DOWNLOAD_ONLY_EXTENSIONS = new Set([
  "csv",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "txt",
  "xls",
  "xlsx",
  "zip"
]);
const MAX_UPLOAD_FILE_SIZE = 20 * 1024 * 1024;

export function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
}

export function formatFileSize(fileSize: number): string {
  if (fileSize < 1024) {
    return `${fileSize} B`;
  }

  if (fileSize < 1024 * 1024) {
    return `${Math.round(fileSize / 102.4) / 10} KB`;
  }

  return `${Math.round(fileSize / (1024 * 102.4)) / 10} MB`;
}

export function pickWebFile(options: {
  accept: string;
  onPicked: (file: WebPickedFile) => void;
  onError: (message: string) => void;
}) {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    options.onError("Загрузка файлов сейчас доступна в web-версии.");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = options.accept;

  input.onchange = () => {
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      options.onError("Файл слишком большой. Максимальный размер для загрузки - 20 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      options.onError("Не удалось прочитать файл.");
    };
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      if (!result) {
        options.onError("Не удалось прочитать файл.");
        return;
      }

      options.onPicked({
        fileName: file.name,
        fileType: getFileExtension(file.name),
        mimeType: file.type || "application/octet-stream",
        fileData: result,
        fileSize: file.size
      });
    };

    reader.readAsDataURL(file);
  };

  input.click();
}

export function openWebFile(fileData: string, fileName: string, fileType: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }

  const normalizedType = fileType.toLowerCase();
  const link = document.createElement("a");
  link.href = fileData;

  if (DOWNLOAD_ONLY_EXTENSIONS.has(normalizedType)) {
    link.download = fileName;
  } else {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  document.body.appendChild(link);
  link.click();
  link.remove();
}
