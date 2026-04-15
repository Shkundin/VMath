import React, { useMemo, useState } from "react";
import {
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

export type PhotoMaterialItem = {
  id: string;
  title: string;
  imageUrl: string;
  note: string;
  authorName: string;
  createdAt: string;
  teacherLogin?: string;
};

type PhotoMaterialsScreenProps = {
  theme: AppTheme;
  isTeacher: boolean;
  materials: PhotoMaterialItem[];
  onCreateMaterial: (input: { title: string; imageUrl: string; note: string }) => void;
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
  const [imageUrl, setImageUrl] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");

  const filteredMaterials = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return materials;
    }

    return materials.filter((material) =>
      [material.title, material.note, material.authorName].join(" ").toLowerCase().includes(normalized)
    );
  }, [materials, query]);

  function handleCreate() {
    const nextTitle = title.trim();
    const nextImageUrl = imageUrl.trim();
    const nextNote = note.trim();

    if (!nextTitle || !nextImageUrl) {
      return;
    }

    onCreateMaterial({
      title: nextTitle,
      imageUrl: nextImageUrl,
      note: nextNote
    });

    setTitle("");
    setImageUrl("");
    setNote("");
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Фотоматериалы"
        subtitle="Иллюстрации, схемы, изображения и дополнительные визуальные материалы."
      />

      {isTeacher ? (
        <SectionCard
          theme={theme}
          title="Добавить материал"
          subtitle="Загрузите или добавьте ссылку на иллюстрацию."
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
            label="Ссылка на изображение"
            value={imageUrl}
            onChangeText={setImageUrl}
            placeholder="https://... или выберите файл"
            theme={theme}
            multiline={false}
          />

          {Platform.OS === "web" ? (
            <View style={styles.fileButtonWrap}>
              <AppButton
                label="Выбрать иллюстрацию"
                onPress={() => {}}
                theme={theme}
                variant="secondary"
                fullWidth={isPhone}
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
        subtitle="Ищи по названию, описанию и автору."
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
                <Text style={styles.cardUrl}>{fixText(material.imageUrl)}</Text>

                {material.note ? (
                  <Text style={styles.cardNote}>{fixText(material.note)}</Text>
                ) : null}

                {isTeacher ? (
                  <View style={styles.actions}>
                    <AppButton
                      label="Удалить"
                      onPress={() => onDeleteMaterial(material.id)}
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
    }
  });
}
