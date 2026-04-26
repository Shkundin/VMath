import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  useWindowDimensions
} from "react-native";

import { fixTextSafe as fixText } from "../../utils/fixTextSafe";
import type { AppTheme } from "../../theme";

type AppInputProps = TextInputProps & {
  label: string;
  theme: AppTheme;
  error?: string;
};

export function AppInput({
  label,
  theme,
  error,
  style,
  onFocus,
  onBlur,
  multiline,
  ...props
}: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { width } = useWindowDimensions();
  const useReadableMobileSizing = Platform.OS === "web" && width < 768;
  const styles = createStyles(
    theme,
    Boolean(error),
    isFocused,
    Boolean(multiline),
    useReadableMobileSizing
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{fixText(label)}</Text>
      <TextInput
        placeholder={
          typeof props.placeholder === "string"
            ? fixText(props.placeholder)
            : props.placeholder
        }
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, style]}
        multiline={multiline}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {error ? <Text style={styles.error}>{fixText(error)}</Text> : null}
    </View>
  );
}

function createStyles(
  theme: AppTheme,
  hasError: boolean,
  isFocused: boolean,
  isMultiline: boolean,
  useReadableMobileSizing: boolean
) {
  return StyleSheet.create({
    wrapper: {
      width: "100%",
      maxWidth: "100%",
      marginBottom: theme.spacing.md
    },
    label: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.helper,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      fontWeight: "800",
      letterSpacing: 0.45,
      textTransform: "uppercase"
    },
    input: {
      minHeight: isMultiline ? 132 : 58,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: hasError
        ? theme.colors.danger
        : isFocused
          ? theme.colors.primary
          : theme.colors.border,
      backgroundColor: theme.colors.input,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: isMultiline ? theme.spacing.md : useReadableMobileSizing ? 12 : theme.spacing.sm + 1,
      fontFamily: theme.fonts.body,
      fontSize: useReadableMobileSizing ? 16 : theme.typography.body,
      lineHeight: isMultiline ? 24 : undefined,
      textAlignVertical: isMultiline ? "top" : "center",
      ...(isFocused ? theme.shadow.md : theme.shadow.sm)
    },
    error: {
      marginTop: theme.spacing.xs,
      color: theme.colors.danger,
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700"
    }
  });
}
