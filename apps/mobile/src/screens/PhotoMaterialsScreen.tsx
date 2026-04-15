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

export type PhotoMaterialItem = {
  id: string;
  title: string;
  resourceUrl: string;
  note: string;
  authorName: string;
  createdAt: string;
  teacherLogin?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  mimeType?: string;
};

type PhotoMaterialsScreenProps = {
  theme: AppTheme;
  isTeacher: boolean;
  materials: PhotoMaterialItem[];
  onCreateMaterial: (input: {
    title: string;
    resourceUrl: string;
    note: string;
    fileName?: string;
    fileType?: string;
    fileData?: string;
    mimeType?: string;
  }) => void;
  onDeleteMaterial: (materialId: string) => void;
};

export function PhotoMaterialsScreen({
  theme,
  isTeacher,
  materials,
  onCreateMaterial,
  onDeleteMaterial
}: PhotoMaterialsScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);
  const isPhone = width < 520;

  const [title, setTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [pickedFile, setPickedFile] = useState<WebPickedFile | null>(null);
  const [errorText, setErrorText] = useState("");

  const filteredMaterials = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return materials;
    }

    return materials.filter((material) =>
      [
        material.title,
        material.note,
        material.authorName,
        material.resourceUrl,
        material.fileName ?? "",
        material.fileType ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [materials, query]);

  function handleCreate() {
    const nextTitle = title.trim();
    const nextResourceUrl = resourceUrl.trim();
    const nextNote = note.trim();

    if (!nextTitle || (!nextResourceUrl && !pickedFile)) {
      setErrorText("Укажи название и добавь ссылку или файл.");
      return;
    }

    onCreateMaterial({
      title: nextTitle,
      resourceUrl: nextResourceUrl,
      note: nextNote,
      fileName: pickedFile?.fileName,
      fileType: pickedFile?.fileType,
      fileData: pickedFile?.fileData,
      mimeType: pickedFile?.mimeType
    });

    setTitle("");
    setResourceUrl("");
    setNote("");
    setPickedFile(null);
    setErrorText("");
  }

  function handlePickFile() {
    pickWebFile({
      accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt",
      onPicked: (file) => {
        setPickedFile(file);
        setErrorText("");
      },
      onError: setErrorText
    });
  }

  function handleOpenMaterial(material: PhotoMaterialItem) {
    if (material.fileData && material.fileName && material.fileType) {
      openWebFile(material.fileData, material.fileName, material.fileType);
      return;
    }

    if (material.resourceUrl.trim()) {
      void Linking.openURL(material.resourceUrl);
    }
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Материалы"
        subtitle="Фотографии, PDF, таблицы и дополнительные файлы курса."
      />

      {isTeacher ? (
        <SectionCard
          theme={theme}
          title="Добавить материал"
          subtitle="Добавь ссылку на материал или загрузи изображение, PDF, Excel и другие документы."
        >
          <AppInputBlock
            label="Название материала"
            value={title}
            onChangeText={setTitle}
            placeholder="Например: Конспект по пределам"
            theme={theme}
            multiline={false}
          />

          <AppInputBlock
            label="Ссылка на материал"
            value={resourceUrl}
            onChangeText={setResourceUrl}
            placeholder="https://... или загрузите файл"
            theme={theme}
            multiline={false}
          />

          {Platform.OS === "web" ? (
            <View style={styles.fileButtonWrap}>
              <AppButton
                label="Загрузить файл"
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

          <AppInputBlock
            label="Описание"
            value={note}
            onChangeText={setNote}
            placeholder="Краткое описание материала"
            theme={theme}
            multiline
          />

          <Text style={styles.helperText}>
            В браузере можно загружать изображения, PDF, Word, Excel, CSV и другие учебные файлы.
          </Text>

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <AppButton
            label="Добавить материал"
            onPress={handleCreate}
            theme={theme}
            fullWidth
          />
        </SectionCard>
      ) : null}

      <SectionCard
        theme={theme}
        title="Поиск по материалам"
        subtitle="Ищи по названию, описанию, файлу и автору."
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Например: график, касательная, конспект"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.searchInput}
        />
        <Text style={styles.searchMeta}>Найдено: {filteredMaterials.length}</Text>
      </SectionCard>

      <SectionCard
        theme={theme}
        title="Список материалов"
        subtitle={filteredMaterials.length > 0 ? `Всего найдено: ${filteredMaterials.length}` : "Пока материалов нет"}
      >
        {filteredMaterials.length === 0 ? (
          <Text style={styles.emptyText}>Пока нет добавленных материалов.</Text>
        ) : (
          <View style={styles.list}>
            {filteredMaterials.map((material) => (
              <View key={material.id} style={styles.card}>
                <Text style={styles.cardTitle}>{fixText(material.title)}</Text>
                <Text style={styles.cardMeta}>{fixText(`Автор: ${material.authorName}`)}</Text>

                {material.fileName ? (
                  <Text style={styles.cardUrl}>
                    {fixText(`Файл: ${material.fileName}${material.fileType ? ` • ${material.fileType.toUpperCase()}` : ""}`)}
                  </Text>
                ) : null}

                {material.resourceUrl ? (
                  <Text style={styles.cardUrl}>{fixText(material.resourceUrl)}</Text>
                ) : null}

                {material.note ? (
                  <Text style={styles.cardNote}>{fixText(material.note)}</Text>
                ) : null}

                <View style={styles.actions}>
                  {(material.fileData || material.resourceUrl) ? (
                    <AppButton
                      label={material.fileData ? "Открыть файл" : "Открыть ссылку"}
                      onPress={() => handleOpenMaterial(material)}
                      theme={theme}
                      variant="secondary"
                      fullWidth={isPhone}
                      style={styles.actionButton}
                    />
                  ) : null}

                  {isTeacher ? (
                    <AppButton
                      label="Удалить"
                      onPress={() => onDeleteMaterial(material.id)}
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
  multiline?: boolean;
};

function AppInputBlock({
  label,
  value,
  onChangeText,
  placeholder,
  theme,
  multiline = false
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
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
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
    inputMultiline: {
      minHeight: 120,
      paddingTop: theme.spacing.md,
      textAlignVertical: "top"
    },
    fileButtonWrap: {
      marginBottom: theme.spacing.md
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
      marginBottom: theme.spacing.sm
    },
    cardNote: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
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
