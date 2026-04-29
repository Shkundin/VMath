import React, { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

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

        return (
          <View key={`line-${lineIndex}`} style={bulletMatch ? styles.bulletRow : styles.lineWrap}>
            {bulletMatch ? <Text style={styles.bulletDot}>•</Text> : null}
            <Text style={styles.paragraph}>
              {segments.map((segment, segmentIndex) => {
                if (segment.type === "displayFormula") {
                  return (
                    <Text key={`${lineIndex}-${segmentIndex}`} style={styles.displayFormula}>
                      {` ${segment.value} `}
                    </Text>
                  );
                }

                if (segment.type === "inlineFormula") {
                  return (
                    <Text key={`${lineIndex}-${segmentIndex}`} style={styles.inlineFormula}>
                      {segment.value}
                    </Text>
                  );
                }

                return (
                  <Text key={`${lineIndex}-${segmentIndex}`}>
                    {fixText(segment.value)}
                  </Text>
                );
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
    }
  });
}
