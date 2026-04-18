import React from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import type { AppTheme } from "../../theme";
import { fixTextSafe as fixText } from "../../utils/fixTextSafe";

export type AnswerOptionItem = {
  key: "A" | "B" | "C" | "D";
  label: string;
  text: string;
};

type AnswerOptionSelectorProps = {
  theme: AppTheme;
  label: string;
  helperText?: string;
  options: AnswerOptionItem[];
  selectedKey: "A" | "B" | "C" | "D";
  onSelect: (key: "A" | "B" | "C" | "D") => void;
};

export function AnswerOptionSelector({
  theme,
  label,
  helperText,
  options,
  selectedKey,
  onSelect
}: AnswerOptionSelectorProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 560;
  const styles = createStyles(theme, isPhone);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{fixText(label)}</Text>
      {helperText ? <Text style={styles.helperText}>{fixText(helperText)}</Text> : null}

      <View style={styles.grid}>
        {options.map((option) => {
          const isSelected = selectedKey === option.key;
          const previewText = option.text.trim() || `Сначала заполни ${option.label.toLowerCase()}`;

          return (
            <Pressable
              key={option.key}
              onPress={() => onSelect(option.key)}
              style={[
                styles.card,
                {
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  backgroundColor: isSelected ? theme.colors.primarySoft : theme.colors.surface
                }
              ]}
            >
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.badge,
                    {
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      backgroundColor: isSelected ? "#FFFFFF" : theme.colors.surfaceMuted
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isSelected ? theme.colors.primary : theme.colors.text }
                    ]}
                  >
                    {option.key}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.stateText,
                    { color: isSelected ? theme.colors.primary : theme.colors.textSecondary }
                  ]}
                >
                  {fixText(isSelected ? "Выбран" : "Нажми, чтобы выбрать")}
                </Text>
              </View>

              <Text style={styles.optionLabel}>{fixText(option.label)}</Text>
              <Text numberOfLines={2} style={styles.optionPreview}>{fixText(previewText)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme, isPhone: boolean) {
  return StyleSheet.create({
    wrapper: {
      width: "100%",
      marginBottom: theme.spacing.md
    },
    label: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      letterSpacing: 0.2
    },
    helperText: {
      fontSize: theme.typography.helper,
      lineHeight: 18,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: theme.spacing.sm,
      rowGap: theme.spacing.sm
    },
    card: {
      flexBasis: isPhone ? "100%" : "48%",
      flexGrow: 1,
      minWidth: 0,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      marginBottom: 0
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.sm
    },
    badge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center"
    },
    badgeText: {
      fontSize: theme.typography.body,
      fontWeight: "800"
    },
    stateText: {
      flex: 1,
      fontSize: theme.typography.helper,
      fontWeight: "700",
      textAlign: "right",
      marginLeft: theme.spacing.sm
    },
    optionLabel: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    optionPreview: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    }
  });
}
