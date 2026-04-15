import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import type { AppTheme } from "../theme";
import { fixText } from "../utils/fixText";

export type VideoLessonItem = {
  id: string;
  title: string;
  url: string;
  authorName: string;
  createdAt: string;
  teacherLogin?: string;
};

type VideoLessonsScreenProps = {
  theme: AppTheme;
  isTeacher: boolean;
  lessons: VideoLessonItem[];
  onCreateLesson: (input: { title: string; url: string }) => void;
  onDeleteLesson: (lessonId: string) => void;
};

export function VideoLessonsScreen({
  theme,
  isTeacher,
  lessons,
  onCreateLesson,
  onDeleteLesson
}: VideoLessonsScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);
  const isPhone = width < 520;

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");

  const filteredLessons = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return lessons;
    }

    return lessons.filter((lesson) =>
      [lesson.title, lesson.authorName, lesson.url].join(" ").toLowerCase().includes(normalized)
    );
  }, [lessons, query]);

  function handleCreate() {
    const nextTitle = title.trim();
    const nextUrl = url.trim();

    if (!nextTitle || !nextUrl) {
      return;
    }

    onCreateLesson({
      title: nextTitle,
      url: nextUrl
    });

    setTitle("");
    setUrl("");
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Видеоуроки"
        subtitle="Видео по темам курса, лекциям и дополнительным материалам."
      />

      {isTeacher ? (
        <SectionCard
          theme={theme}
          title="Добавить видеоурок"
          subtitle="Добавьте название и ссылку на видео."
        >
          <AppInputBlock
            label="Название урока"
            value={title}
            onChangeText={setTitle}
            placeholder="Например: Производная функции"
            theme={theme}
          />

          <AppInputBlock
            label="Ссылка на видео"
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            theme={theme}
          />

          <AppButton
            label="Добавить видеоурок"
            onPress={handleCreate}
            theme={theme}
            fullWidth
          />
        </SectionCard>
      ) : null}

      <SectionCard
        theme={theme}
        title="Поиск по видео"
        subtitle="Ищи по названию, автору или ссылке."
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Например: производная, предел, Taylor"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.searchInput}
        />
        <Text style={styles.searchMeta}>Найдено: {filteredLessons.length}</Text>
      </SectionCard>

      <SectionCard
        theme={theme}
        title="Список видеоуроков"
        subtitle={filteredLessons.length > 0 ? `Всего найдено: ${filteredLessons.length}` : "Пока видео нет"}
      >
        {filteredLessons.length === 0 ? (
          <Text style={styles.emptyText}>Пока нет добавленных видеоуроков.</Text>
        ) : (
          <View style={styles.list}>
            {filteredLessons.map((lesson) => (
              <View key={lesson.id} style={styles.card}>
                <Text style={styles.cardTitle}>{fixText(lesson.title)}</Text>
                <Text style={styles.cardMeta}>{fixText(`Автор: ${lesson.authorName}`)}</Text>
                <Text style={styles.cardUrl}>{fixText(lesson.url)}</Text>

                {isTeacher ? (
                  <View style={styles.actions}>
                    <AppButton
                      label="Удалить"
                      onPress={() => onDeleteLesson(lesson.id)}
                      theme={theme}
                      variant="ghost"
                      fullWidth={isPhone}
                    />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </Screen>
  );
}

type AppInputBlockProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  theme: AppTheme;
};

function AppInputBlock({
  label,
  value,
  onChangeText,
  placeholder,
  theme
}: AppInputBlockProps) {
  const styles = createStyles(theme, 900);

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
      />
    </View>
  );
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 520;

  return StyleSheet.create({
    inputWrap: {
      marginBottom: theme.spacing.md
    },
    inputLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "800",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    input: {
      minHeight: 52,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.input,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.body
    },
    searchInput: {
      minHeight: 52,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.input,
      color: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.body
    },
    searchMeta: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    emptyText: {
      fontSize: theme.typography.body,
      color: theme.colors.textSecondary
    },
    list: {
      width: "100%"
    },
    card: {
      borderRadius: theme.radius.lg,
      padding: isPhone ? theme.spacing.md : theme.spacing.lg,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    cardTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "900",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    cardMeta: {
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    cardUrl: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.text,
      marginBottom: theme.spacing.md
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap"
    }
  });
}
