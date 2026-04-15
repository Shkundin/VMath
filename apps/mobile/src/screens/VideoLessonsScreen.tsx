import React, { useMemo, useState } from "react";
import {
  Linking,
  Platform,
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
import { formatFileSize, openWebFile, pickWebFile, type WebPickedFile } from "../utils/webFiles";

export type VideoLessonItem = {
  id: string;
  title: string;
  url: string;
  authorName: string;
  createdAt: string;
  teacherLogin?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  mimeType?: string;
};

type VideoLessonsScreenProps = {
  theme: AppTheme;
  isTeacher: boolean;
  lessons: VideoLessonItem[];
  onCreateLesson: (input: {
    title: string;
    url: string;
    fileName?: string;
    fileType?: string;
    fileData?: string;
    mimeType?: string;
  }) => void;
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
  const [pickedFile, setPickedFile] = useState<WebPickedFile | null>(null);
  const [errorText, setErrorText] = useState("");

  const filteredLessons = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return lessons;
    }

    return lessons.filter((lesson) =>
      [
        lesson.title,
        lesson.authorName,
        lesson.url,
        lesson.fileName ?? "",
        lesson.fileType ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [lessons, query]);

  function handleCreate() {
    const nextTitle = title.trim();
    const nextUrl = url.trim();

    if (!nextTitle || (!nextUrl && !pickedFile)) {
      setErrorText("Укажи название и добавь ссылку или файл MP4.");
      return;
    }

    onCreateLesson({
      title: nextTitle,
      url: nextUrl,
      fileName: pickedFile?.fileName,
      fileType: pickedFile?.fileType,
      fileData: pickedFile?.fileData,
      mimeType: pickedFile?.mimeType
    });

    setTitle("");
    setUrl("");
    setPickedFile(null);
    setErrorText("");
  }

  function handlePickFile() {
    pickWebFile({
      accept: "video/mp4,.mp4",
      onPicked: (file) => {
        if (file.fileType !== "mp4") {
          setErrorText("Для загрузки видео сейчас поддерживается только формат MP4.");
          return;
        }

        setPickedFile(file);
        setErrorText("");
      },
      onError: setErrorText
    });
  }

  function handleOpenLesson(lesson: VideoLessonItem) {
    if (lesson.fileData && lesson.fileName && lesson.fileType) {
      openWebFile(lesson.fileData, lesson.fileName, lesson.fileType);
      return;
    }

    if (lesson.url.trim()) {
      void Linking.openURL(lesson.url);
    }
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Видеоматериалы"
        subtitle="Видео по темам курса, лекциям и дополнительным материалам."
      />

      {isTeacher ? (
        <SectionCard
          theme={theme}
          title="Добавить видео"
          subtitle="Добавь ссылку на ролик или загрузи файл MP4 прямо в браузер."
        >
          <AppInputBlock
            label="Название видео"
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

          {Platform.OS === "web" ? (
            <View style={styles.fileButtonWrap}>
              <AppButton
                label="Загрузить MP4"
                onPress={handlePickFile}
                theme={theme}
                variant="secondary"
                fullWidth={isPhone}
              />
            </View>
          ) : null}

          {pickedFile ? (
            <View style={styles.selectedFileCard}>
              <Text style={styles.selectedFileTitle}>{fixText(pickedFile.fileName)}</Text>
              <Text style={styles.selectedFileMeta}>
                {fixText(`${pickedFile.fileType.toUpperCase()} • ${formatFileSize(pickedFile.fileSize)}`)}
              </Text>
              <AppButton
                label="Убрать файл"
                onPress={() => setPickedFile(null)}
                theme={theme}
                variant="ghost"
                fullWidth={isPhone}
                style={styles.clearButton}
              />
            </View>
          ) : null}

          <Text style={styles.helperText}>
            MP4 можно загрузить файлом. Для длинных роликов лучше использовать ссылку, чтобы не упереться в память браузера.
          </Text>

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <AppButton
            label="Добавить видео"
            onPress={handleCreate}
            theme={theme}
            fullWidth
          />
        </SectionCard>
      ) : null}

      <SectionCard
        theme={theme}
        title="Поиск по видео"
        subtitle="Ищи по названию, автору, файлу или ссылке."
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
        title="Список видео"
        subtitle={filteredLessons.length > 0 ? `Всего найдено: ${filteredLessons.length}` : "Пока видео нет"}
      >
        {filteredLessons.length === 0 ? (
          <Text style={styles.emptyText}>Пока нет добавленных видео.</Text>
        ) : (
          <View style={styles.list}>
            {filteredLessons.map((lesson) => (
              <View key={lesson.id} style={styles.card}>
                <Text style={styles.cardTitle}>{fixText(lesson.title)}</Text>
                <Text style={styles.cardMeta}>{fixText(`Автор: ${lesson.authorName}`)}</Text>

                {lesson.fileName ? (
                  <Text style={styles.cardResource}>
                    {fixText(`Файл: ${lesson.fileName}${lesson.fileType ? ` • ${lesson.fileType.toUpperCase()}` : ""}`)}
                  </Text>
                ) : null}

                {lesson.url ? (
                  <Text style={styles.cardUrl}>{fixText(lesson.url)}</Text>
                ) : null}

                <View style={styles.actions}>
                  {(lesson.fileData || lesson.url) ? (
                    <AppButton
                      label={lesson.fileData ? "Открыть видео" : "Открыть ссылку"}
                      onPress={() => handleOpenLesson(lesson)}
                      theme={theme}
                      variant="secondary"
                      fullWidth={isPhone}
                      style={styles.actionButton}
                    />
                  ) : null}

                  {isTeacher ? (
                    <AppButton
                      label="Удалить"
                      onPress={() => onDeleteLesson(lesson.id)}
                      theme={theme}
                      variant="ghost"
                      fullWidth={isPhone}
                    />
                  ) : null}
                </View>
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
    fileButtonWrap: {
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
    helperText: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md
    },
    errorText: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.danger,
      marginBottom: theme.spacing.md
    },
    selectedFileCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    selectedFileTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    selectedFileMeta: {
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary
    },
    clearButton: {
      marginTop: theme.spacing.sm
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
      marginBottom: theme.spacing.sm
    },
    cardResource: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.text,
      marginBottom: theme.spacing.md
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    actionButton: {
      marginRight: isPhone ? 0 : theme.spacing.sm,
      marginBottom: theme.spacing.sm
    }
  });
}
