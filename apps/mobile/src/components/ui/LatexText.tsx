import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { renderToString } from "katex";
import { WebView } from "react-native-webview";

import type { AppTheme } from "../../theme";
import { fixTextSafe as fixText } from "../../utils/fixTextSafe";

type LatexTextProps = {
  theme: AppTheme;
  content: string;
  compact?: boolean;
};

type Segment =
  | { type: "text"; value: string }
  | { type: "inlineFormula"; value: string }
  | { type: "displayFormula"; value: string };

function splitInlineFormula(line: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line))) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: line.slice(lastIndex, match.index) });
    }

    const token = match[0];
    const isDisplay = token.startsWith("$$") || token.startsWith("\\[");
    const value = token
      .replace(/^\$\$|\$\$$/g, "")
      .replace(/^\\\[|\\\]$/g, "")
      .replace(/^\$|\$$/g, "")
      .replace(/^\\\(|\\\)$/g, "")
      .trim();

    segments.push({ type: isDisplay ? "displayFormula" : "inlineFormula", value });
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    segments.push({ type: "text", value: line.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: line }];
}

function normalizeLines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").split("\n");
}

function latexToReadable(value: string): string {
  return value
    .trim()
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\int_([^\\\s]+)\^([^\\\s]+)\s*/g, "∫[$1,$2] ")
    .replace(/\\int/g, "∫")
    .replace(/\\sum_\{?([^{}]+)\}?\^\{?([^{}]+)\}?/g, "Σ[$1..$2]")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\leq?|\\le/g, "≤")
    .replace(/\\geq?|\\ge/g, "≥")
    .replace(/\\neq?|\\ne/g, "≠")
    .replace(/\\infty/g, "∞")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\pi/g, "π")
    .replace(/\\sin/g, "sin")
    .replace(/\\cos/g, "cos")
    .replace(/\\tan/g, "tan")
    .replace(/\\lim/g, "lim")
    .replace(/\\vec\{([^{}]+)\}/g, "→$1")
    .replace(/\\left|\\right/g, "")
    .replace(/\\,/g, " ")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/_\{([^{}]+)\}/g, "_$1")
    .replace(/([_^])([A-Za-z0-9])/g, "$1$2")
    .replace(/[{}]/g, "")
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderLatexToMathMl(value: string, displayMode: boolean): string | null {
  try {
    return renderToString(value, {
      displayMode,
      output: "mathml",
      throwOnError: false,
      strict: false,
      trust: false
    });
  } catch {
    return null;
  }
}

function renderWebFormula(
  key: string,
  value: string,
  displayMode: boolean,
  style: object
): React.ReactNode {
  const html = renderLatexToMathMl(value, displayMode);

  if (!html) {
    return React.createElement("span", { key, style }, latexToReadable(value));
  }

  return React.createElement("span", {
    key,
    style,
    dangerouslySetInnerHTML: { __html: html }
  });
}

function buildNativeFormulaHtml(value: string, displayMode: boolean): string {
  const math = renderLatexToMathMl(value, displayMode) ?? latexToReadable(value);

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      color: #1F2937;
      font-size: ${displayMode ? 22 : 18}px;
      line-height: 1.25;
      overflow: hidden;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: ${displayMode ? "flex-start" : "center"};
      min-height: ${displayMode ? 52 : 34}px;
    }
    math {
      math-style: ${displayMode ? "normal" : "compact"};
      font-size: ${displayMode ? 22 : 18}px;
    }
  </style>
</head>
<body>${math}</body>
</html>`;
}

type NativeFormulaProps = {
  value: string;
  displayMode: boolean;
  width: number;
  style: object;
};

function NativeFormula({ value, displayMode, width, style }: NativeFormulaProps) {
  const readable = latexToReadable(value);
  const formulaWidth = displayMode
    ? "100%"
    : Math.min(Math.max(readable.length * 10 + 28, 76), Math.max(width - 64, 120));

  return (
    <View style={[style, { width: formulaWidth, height: displayMode ? 58 : 38 }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: buildNativeFormulaHtml(value, displayMode) }}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled={false}
        style={{ backgroundColor: "transparent" }}
      />
    </View>
  );
}

export function LatexText({ theme, content, compact = false }: LatexTextProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width, compact);
  const lines = useMemo(() => normalizeLines(content), [content]);

  if (!content.trim()) {
    return null;
  }

  return (
    <View style={styles.container}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <View key={`space-${lineIndex}`} style={styles.spacer} />;
        }

        const headingLevel = trimmed.startsWith("### ")
          ? 3
          : trimmed.startsWith("## ")
            ? 2
            : trimmed.startsWith("# ")
              ? 1
              : 0;

        if (headingLevel > 0) {
          return (
            <Text
              key={`heading-${lineIndex}`}
              style={[
                styles.heading,
                headingLevel === 1 ? styles.headingOne : null,
                headingLevel === 2 ? styles.headingTwo : null
              ]}
            >
              {fixText(trimmed.replace(/^#{1,3}\s*/, ""))}
            </Text>
          );
        }

        const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
        const textToRender = bulletMatch?.[1] ?? trimmed;
        const segments = splitInlineFormula(textToRender);

        if (Platform.OS !== "web" && segments.some((segment) => segment.type !== "text")) {
          return (
            <View key={`line-${lineIndex}`} style={bulletMatch ? styles.bulletRow : styles.lineWrap}>
              {bulletMatch ? <Text style={styles.bulletDot}>•</Text> : null}
              <View style={styles.nativeFormulaRow}>
                {segments.map((segment, segmentIndex) => {
                  const key = `${lineIndex}-${segmentIndex}`;

                  if (segment.type === "displayFormula") {
                    return (
                      <NativeFormula
                        key={key}
                        value={segment.value}
                        displayMode
                        width={width}
                        style={styles.nativeDisplayFormula}
                      />
                    );
                  }

                  if (segment.type === "inlineFormula") {
                    return (
                      <NativeFormula
                        key={key}
                        value={segment.value}
                        displayMode={false}
                        width={width}
                        style={styles.nativeInlineFormula}
                      />
                    );
                  }

                  return (
                    <Text key={key} style={styles.nativeParagraph}>
                      {fixText(segment.value)}
                    </Text>
                  );
                })}
              </View>
            </View>
          );
        }

        return (
          <View key={`line-${lineIndex}`} style={bulletMatch ? styles.bulletRow : styles.lineWrap}>
            {bulletMatch ? <Text style={styles.bulletDot}>•</Text> : null}
            <Text style={styles.paragraph}>
              {segments.map((segment, segmentIndex) => {
                const key = `${lineIndex}-${segmentIndex}`;

                if (segment.type === "displayFormula") {
                  if (Platform.OS === "web") {
                    return renderWebFormula(key, segment.value, true, styles.webDisplayFormula);
                  }

                  return (
                    <Text key={key} style={styles.displayFormula}>
                      {` ${latexToReadable(segment.value)} `}
                    </Text>
                  );
                }

                if (segment.type === "inlineFormula") {
                  if (Platform.OS === "web") {
                    return renderWebFormula(key, segment.value, false, styles.webInlineFormula);
                  }

                  return (
                    <Text key={key} style={styles.inlineFormula}>
                      {latexToReadable(segment.value)}
                    </Text>
                  );
                }

                return <Text key={key}>{fixText(segment.value)}</Text>;
              })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(theme: AppTheme, width: number, compact: boolean) {
  const isPhone = width < 560;

  return StyleSheet.create({
    container: {
      width: "100%"
    },
    spacer: {
      height: compact ? theme.spacing.xs : theme.spacing.sm
    },
    heading: {
      fontFamily: theme.fonts.display,
      fontWeight: "700",
      color: theme.colors.text,
      marginTop: compact ? theme.spacing.xs : theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    headingOne: {
      fontSize: isPhone ? 22 : 26,
      lineHeight: isPhone ? 28 : 32
    },
    headingTwo: {
      fontSize: isPhone ? 19 : 22,
      lineHeight: isPhone ? 25 : 28
    },
    lineWrap: {
      marginBottom: compact ? theme.spacing.xs : theme.spacing.sm
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: compact ? theme.spacing.xs : theme.spacing.sm
    },
    bulletDot: {
      width: 18,
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.primary,
      fontWeight: "800"
    },
    paragraph: {
      flex: 1,
      fontFamily: theme.fonts.body,
      fontSize: compact ? theme.typography.caption : theme.typography.body,
      lineHeight: compact ? 20 : 24,
      color: theme.colors.text
    },
    inlineFormula: {
      fontFamily: theme.fonts.mono,
      color: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
      fontWeight: "700"
    },
    displayFormula: {
      fontFamily: theme.fonts.mono,
      color: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
      fontWeight: "800"
    },
    nativeFormulaRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap"
    },
    nativeParagraph: {
      fontFamily: theme.fonts.body,
      fontSize: compact ? theme.typography.caption : theme.typography.body,
      lineHeight: compact ? 20 : 24,
      color: theme.colors.text
    },
    nativeInlineFormula: {
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: theme.colors.primarySoft,
      marginHorizontal: 2,
      marginVertical: 2
    },
    nativeDisplayFormula: {
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: theme.colors.primarySoft,
      marginVertical: theme.spacing.xs
    },
    webInlineFormula: {
      display: "inline-flex",
      verticalAlign: "middle",
      alignItems: "center",
      color: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: 4,
      paddingLeft: 4,
      paddingRight: 4,
      marginLeft: 2,
      marginRight: 2
    } as unknown as object,
    webDisplayFormula: {
      display: "inline-flex",
      verticalAlign: "middle",
      alignItems: "center",
      color: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: 4,
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 2,
      paddingBottom: 2,
      marginLeft: 2,
      marginRight: 2
    } as unknown as object
  });
}
