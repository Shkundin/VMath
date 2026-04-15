import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { Screen } from "../components/ui/Screen";
import { SectionCard } from "../components/ui/SectionCard";
import {
  createDefaultLatexDocument,
  type LatexDocumentState
} from "../storage/latexStorage";
import type { AppTheme } from "../theme";

type LatexWorkspaceScreenProps = {
  theme: AppTheme;
  isTeacher: boolean;
  userName: string;
  document: LatexDocumentState;
  onChangeDocument: (next: LatexDocumentState) => void;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ru-RU");
  } catch {
    return value;
  }
}

function buildLatexHtml(
  latexDocument: LatexDocumentState,
  printMode = false,
  autoPrint = false
): string {
  const escapedTitle = escapeHtml(latexDocument.title || "LaTeX-конспект");
  const escapedAuthor = escapeHtml(latexDocument.authorName || "VisualMath");
  const escapedUpdatedAt = escapeHtml(formatDate(latexDocument.updatedAt));
  const escapedSource = escapeHtml(latexDocument.source || "");

  const helperBlock = printMode
    ? `
      <div class="print-helper">
        PDF откроется в режиме печати. Выбери <strong>«Сохранить как PDF»</strong>
        и скачай чистую версию конспекта.
      </div>
    `
    : "";

  const autoPrintScript = autoPrint
    ? `
        setTimeout(function () {
          window.focus();
          window.print();
        }, 700);

        window.addEventListener("afterprint", function () {
          setTimeout(function () {
            window.close();
          }, 150);
        });
      `
    : "";

  return `
    <!doctype html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapedTitle}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
        <style>
          * { box-sizing: border-box; }

          body {
            margin: 0;
            padding: 32px;
            font-family: Inter, Arial, Helvetica, sans-serif;
            color: #111827;
            background: #ffffff;
          }

          .page {
            max-width: 920px;
            margin: 0 auto;
          }

          .print-helper {
            margin-bottom: 20px;
            padding: 14px 16px;
            border: 1px solid #dbeafe;
            border-radius: 12px;
            background: #eff6ff;
            color: #1e3a8a;
            font-size: 14px;
            line-height: 1.5;
          }

          .meta {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e5e7eb;
          }

          .title {
            font-size: 32px;
            font-weight: 800;
            line-height: 1.2;
            margin: 0 0 10px;
          }

          .sub {
            font-size: 14px;
            color: #6b7280;
            margin: 0 0 6px;
          }

          .content {
            white-space: pre-wrap;
            font-size: 18px;
            line-height: 1.8;
          }

          .katex-display {
            margin: 1em 0;
            overflow-x: auto;
            overflow-y: hidden;
          }

          @page {
            size: A4;
            margin: 14mm;
          }

          @media print {
            body {
              padding: 0;
            }

            .print-helper {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${helperBlock}
          <div class="meta">
            <h1 class="title">${escapedTitle}</h1>
            <p class="sub">Автор: ${escapedAuthor}</p>
            <p class="sub">Обновлено: ${escapedUpdatedAt}</p>
          </div>

          <div id="latex-root" class="content">${escapedSource}</div>
        </div>

        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
        <script>
          window.addEventListener("load", function () {
            const root = document.getElementById("latex-root");
            if (!root || !window.renderMathInElement) return;

            window.renderMathInElement(root, {
              delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "\\\\[", right: "\\\\]", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\\\(", right: "\\\\)", display: false }
              ],
              throwOnError: false,
              strict: false
            });

            ${autoPrintScript}
          });
        </script>
      </body>
    </html>
  `;
}

export function LatexWorkspaceScreen({
  theme,
  isTeacher,
  userName,
  document: latexDocument,
  onChangeDocument
}: LatexWorkspaceScreenProps) {
  const styles = createStyles(theme);
  const isWeb = Platform.OS === "web";

  const previewHtml = useMemo(() => buildLatexHtml(latexDocument, false), [latexDocument]);

  function handleUpdate(patch: Partial<LatexDocumentState>) {
    onChangeDocument({
      ...latexDocument,
      ...patch,
      authorName: isTeacher
        ? (userName || latexDocument.authorName || "Преподаватель")
        : latexDocument.authorName,
      updatedAt: new Date().toISOString()
    });
  }

  function handleResetTemplate() {
    onChangeDocument(createDefaultLatexDocument(userName || "Преподаватель"));
  }

  function handleOpenPdfVersion() {
    if (!isWeb) {
      return;
    }

    const html = buildLatexHtml(latexDocument, true, true);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const opened = globalThis.open?.(url, "_blank");

    if (!opened) {
      alert("Браузер заблокировал окно экспорта. Разреши pop-up и попробуй снова.");
      URL.revokeObjectURL(url);
      return;
    }

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  }

  const iframeStyle = {
    width: "100%",
    height: 560,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 18,
    backgroundColor: "#ffffff"
  } as const;

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>LaTeX</Text>
        <Text style={styles.subtitle}>
          {isTeacher
            ? "Преподаватель редактирует код, а предпросмотр обновляется автоматически."
            : "Студент видит готовый LaTeX-документ и может открыть чистую версию для сохранения в PDF."}
        </Text>

        <SectionCard title="Текущий документ" subtitle="Общие метаданные" theme={theme}>
          <Text style={styles.metaText}>Название: {latexDocument.title || "Без названия"}</Text>
          <Text style={styles.metaText}>Автор: {latexDocument.authorName || "VisualMath"}</Text>
          <Text style={styles.metaText}>Обновлено: {formatDate(latexDocument.updatedAt)}</Text>
        </SectionCard>

        {isTeacher ? (
          <SectionCard title="Редактор LaTeX" subtitle="Изменения сохраняются автоматически" theme={theme}>
            <Text style={styles.label}>Название документа</Text>
            <TextInput
              value={latexDocument.title}
              onChangeText={(value) => handleUpdate({ title: value })}
              placeholder="Например: Производная и интеграл"
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.titleInput}
            />

            <Text style={styles.label}>Код LaTeX</Text>
            <TextInput
              value={latexDocument.source}
              onChangeText={(value) => handleUpdate({ source: value })}
              placeholder="Пиши текст и формулы в синтаксисе LaTeX"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              textAlignVertical="top"
              style={styles.editorInput}
            />
          </SectionCard>
        ) : null}

        <SectionCard
          title="Предпросмотр"
          subtitle={isWeb ? "Формулы рендерятся автоматически." : "На мобильных платформах показываем текстовую версию."}
          theme={theme}
        >
          {isWeb ? (
            React.createElement("iframe" as any, {
              id: "latex-preview-frame",
              title: "latex-preview",
              srcDoc: previewHtml,
              style: iframeStyle
            })
          ) : (
            <View style={styles.nativeFallback}>
              <Text style={styles.nativeFallbackText}>{latexDocument.source}</Text>
            </View>
          )}
        </SectionCard>

        <SectionCard
          title={isTeacher ? "Экспорт и шаблон" : "PDF"}
          subtitle={isTeacher ? "Можно сразу скачать PDF-конспект или сбросить пример." : "Откроется системное окно сохранения PDF."}
          theme={theme}
        >
          <AppButton
            label="Скачать PDF"
            onPress={handleOpenPdfVersion}
            theme={theme}
            style={styles.buttonSpacing}
          />

          {isTeacher ? (
            <AppButton
              label="Сбросить пример"
              onPress={handleResetTemplate}
              theme={theme}
              variant="secondary"
            />
          ) : null}

          <Text style={styles.helpText}>
            PDF формируется из аккуратной печатной версии конспекта.
          </Text>
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    contentContainer: {
      paddingBottom: theme.spacing.xl
    },
    title: {
      fontSize: theme.typography.screenTitle,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    subtitle: {
      fontSize: theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg
    },
    metaText: {
      fontSize: theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    label: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    titleInput: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      backgroundColor: theme.colors.input,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      fontSize: theme.typography.body
    },
    editorInput: {
      minHeight: 300,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 18,
      backgroundColor: theme.colors.input,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: 16,
      lineHeight: 24
    },
    nativeFallback: {
      minHeight: 240,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 18,
      backgroundColor: theme.colors.input,
      padding: theme.spacing.md
    },
    nativeFallbackText: {
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.text
    },
    buttonSpacing: {
      marginBottom: theme.spacing.sm
    },
    helpText: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary
    }
  });
}
