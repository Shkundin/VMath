import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";

import { AppButton } from "../components/ui/AppButton";
import { AppInput } from "../components/ui/AppInput";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { StateCallout } from "../components/ui/StateCallout";
import { StatusPill } from "../components/ui/StatusPill";
import type { AppTheme } from "../theme";
import { fixText } from "../utils/fixText";
import type { HomeworkItem, HomeworkSubmissionItem } from "../storage/homeworkStorage";

export type HomeworkDraftInput = {
  title: string;
  description: string;
  dueAt: string;
  allowedFormats: string[];
  maxScore: number;
};

export type HomeworkSubmissionDraftInput = {
  homeworkId: string;
  studentLogin: string;
  studentName: string;
  fileName: string;
  fileType: string;
  fileData: string;
};

type HomeworkScreenProps = {
  theme: AppTheme;
  isTeacher: boolean;
  userLogin: string;
  userName: string;
  homeworks: HomeworkItem[];
  submissions: HomeworkSubmissionItem[];
  onCreateHomework: (input: HomeworkDraftInput) => void;
  onDeleteHomework: (homeworkId: string) => void;
  onCreateSubmission: (input: HomeworkSubmissionDraftInput) => void;
  onDeleteSubmission: (submissionId: string) => void;
  onGradeSubmission: (submissionId: string, score: number | null, comment: string) => void;
};

const FORMAT_OPTIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg"] as const;

type StatusTone = "success" | "warning" | "info" | "neutral";

export function HomeworkScreen({
  theme,
  isTeacher,
  userLogin,
  userName,
  homeworks,
  submissions,
  onCreateHomework,
  onDeleteHomework,
  onCreateSubmission,
  onDeleteSubmission,
  onGradeSubmission
}: HomeworkScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [allowedFormats, setAllowedFormats] = useState<string[]>(["pdf", "docx", "png"]);
  const [error, setError] = useState("");
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const sortedHomeworks = useMemo(() => {
    return [...homeworks].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [homeworks]);

  const reviewedCount = useMemo(() => {
    return submissions.filter((submission) => submission.score !== null).length;
  }, [submissions]);

  const activeCount = useMemo(() => {
    return sortedHomeworks.filter((homework) => Date.now() <= new Date(homework.dueAt).getTime()).length;
  }, [sortedHomeworks]);

  const submittedByMe = useMemo(() => {
    return submissions.filter((submission) => submission.studentLogin === userLogin).length;
  }, [submissions, userLogin]);

  function toggleFormat(format: string) {
    setAllowedFormats((current) =>
      current.includes(format)
        ? current.filter((item) => item !== format)
        : [...current, format]
    );
  }

  function handleCreateHomework() {
    const nextTitle = title.trim();
    const nextDescription = description.trim();
    const nextDueDate = dueDate.trim();
    const nextDueTime = dueTime.trim();
    const nextMaxScore = Number(maxScore);

    if (!nextTitle || !nextDescription || !nextDueDate || !nextDueTime) {
      setError("Заполни название, описание, дату и время.");
      return;
    }

    if (!Number.isFinite(nextMaxScore) || nextMaxScore <= 0) {
      setError("Укажи корректный максимальный балл.");
      return;
    }

    if (allowedFormats.length === 0) {
      setError("Выбери хотя бы один формат файла.");
      return;
    }

    const dueAt = new Date(`${nextDueDate}T${nextDueTime}:00`);

    if (Number.isNaN(dueAt.getTime())) {
      setError("Дата или время указаны неверно.");
      return;
    }

    onCreateHomework({
      title: nextTitle,
      description: nextDescription,
      dueAt: dueAt.toISOString(),
      allowedFormats,
      maxScore: nextMaxScore
    });

    setTitle("");
    setDescription("");
    setDueDate("");
    setDueTime("");
    setMaxScore("100");
    setAllowedFormats(["pdf", "docx", "png"]);
    setError("");
  }

  function handlePickSubmission(homework: HomeworkItem) {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      setError("Загрузка файлов сейчас доступна в web-версии.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = buildAcceptString(homework.allowedFormats);

    input.onchange = () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      const extension = getFileExtension(file.name);
      if (!homework.allowedFormats.includes(extension)) {
        setError(`Допустимые форматы: ${homework.allowedFormats.join(", ")}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";

        if (!result) {
          setError("Не удалось прочитать файл.");
          return;
        }

        onCreateSubmission({
          homeworkId: homework.id,
          studentLogin: userLogin,
          studentName: userName,
          fileName: file.name,
          fileType: extension,
          fileData: result
        });

        setError("");
      };

      reader.readAsDataURL(file);
    };

    input.click();
  }

  function handleDownloadSubmission(submission: HomeworkSubmissionItem) {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }

    const link = document.createElement("a");
    link.href = submission.fileData;
    link.download = submission.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleSaveGrade(submission: HomeworkSubmissionItem, homework: HomeworkItem) {
    const rawScore = (scoreDrafts[submission.id] ?? (submission.score !== null ? String(submission.score) : "")).trim();
    const rawComment = commentDrafts[submission.id] ?? submission.teacherComment ?? "";

    if (!rawScore) {
      onGradeSubmission(submission.id, null, rawComment.trim());
      return;
    }

    const parsedScore = Number(rawScore.replace(",", "."));

    if (!Number.isFinite(parsedScore)) {
      setError("Введите корректную оценку.");
      return;
    }

    const normalizedScore = Math.max(0, Math.min(homework.maxScore, parsedScore));
    onGradeSubmission(submission.id, normalizedScore, rawComment.trim());
    setError("");
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Домашние задания"
        subtitle="Создание, сдача, проверка и хранение домашних работ."
        rightSlot={
          <View style={styles.headerChip}>
            <Text style={styles.headerChipText}>{sortedHomeworks.length} заданий</Text>
          </View>
        }
      />

      <View style={styles.heroCard}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroEyebrow}>Учебная работа</Text>
          <Text style={styles.heroTitle}>
            {isTeacher ? "Управляй заданиями и проверкой" : "Сдавай домашние задания"}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isTeacher
              ? "Создавай задания, ставь дедлайны и проверяй файлы студентов в одном месте."
              : "Здесь видны активные задания, допустимые форматы и текущий статус каждой сдачи."}
          </Text>
          {error ? <Text style={styles.errorText}>{fixText(error)}</Text> : null}
        </View>

        <View style={styles.heroStats}>
          <MiniStatCard theme={theme} value={String(sortedHomeworks.length)} label="Всего заданий" />
          <MiniStatCard
            theme={theme}
            value={String(isTeacher ? submissions.length : submittedByMe)}
            label={isTeacher ? "Всего сдач" : "Моих сдач"}
          />
          <MiniStatCard
            theme={theme}
            value={String(isTeacher ? reviewedCount : activeCount)}
            label={isTeacher ? "Проверено" : "Активно сейчас"}
          />
        </View>
      </View>

      {isTeacher ? (
        <SectionCard
          theme={theme}
          title="Новое домашнее задание"
          subtitle="Заполни карточку задания и выбери допустимые форматы файлов."
        >
          <AppInput
            label="Название задания"
            theme={theme}
            value={title}
            onChangeText={setTitle}
            placeholder="Например: Домашняя работа №1"
            autoCorrect={false}
          />

          <AppInput
            label="Описание"
            theme={theme}
            value={description}
            onChangeText={setDescription}
            placeholder="Что нужно сделать"
            multiline
            numberOfLines={4}
          />

          <View style={styles.inputGrid}>
            <View style={styles.inputCol}>
              <AppInput
                label="Дата дедлайна"
                theme={theme}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="2026-04-20"
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputCol}>
              <AppInput
                label="Время дедлайна"
                theme={theme}
                value={dueTime}
                onChangeText={setDueTime}
                placeholder="23:59"
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputCol}>
              <AppInput
                label="Максимальный балл"
                theme={theme}
                value={maxScore}
                onChangeText={setMaxScore}
                placeholder="100"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Допустимые форматы</Text>
          <View style={styles.formatRow}>
            {FORMAT_OPTIONS.map((format) => {
              const isActive = allowedFormats.includes(format);

              return (
                <Pressable
                  key={format}
                  onPress={() => toggleFormat(format)}
                  style={[
                    styles.formatChip,
                    {
                      borderColor: isActive ? theme.colors.primary : theme.colors.border,
                      backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surface
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.formatChipText,
                      { color: isActive ? theme.colors.primary : theme.colors.text }
                    ]}
                  >
                    {format.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <AppButton
            label="Создать задание"
            onPress={handleCreateHomework}
            theme={theme}
            style={styles.actionTop}
          />
        </SectionCard>
      ) : null}

      <SectionCard
        theme={theme}
        title="Список домашних заданий"
        subtitle={sortedHomeworks.length > 0 ? `Всего заданий: ${sortedHomeworks.length}` : "Пока заданий нет"}
      >
        {sortedHomeworks.length === 0 ? (
          <StateCallout
            theme={theme}
            title={isTeacher ? "Заданий пока нет" : "Преподаватель ещё не выдал задания"}
            description={
              isTeacher
                ? "Создай первое домашнее задание, чтобы здесь появилась рабочая лента сдач и проверок."
                : "Когда преподаватель опубликует домашнюю работу, она автоматически появится в этом разделе."
            }
            tone={isTeacher ? "warning" : "info"}
          />
        ) : (
          <View style={styles.homeworkList}>
            {sortedHomeworks.map((homework) => {
              const relatedSubmissions = submissions.filter((submission) => submission.homeworkId === homework.id);
              const mySubmission = relatedSubmissions.find((submission) => submission.studentLogin === userLogin) ?? null;

              return (
                <View key={homework.id} style={styles.homeworkCard}>
                  <View style={styles.homeworkTop}>
                    <View style={styles.homeworkTextWrap}>
                      <Text style={styles.homeworkTitle}>{fixText(homework.title)}</Text>
                      <Text style={styles.homeworkMeta}>
                        {fixText(`Дедлайн: ${formatDateTime(homework.dueAt)} • Макс. балл: ${homework.maxScore}`)}
                      </Text>
                    </View>

                    <StatusPill
                      theme={theme}
                      label={homeworkStatusLabel(homework, mySubmission)}
                      tone={homeworkStatusTone(homework, mySubmission)}
                    />
                  </View>

                  <Text style={styles.descriptionText}>{fixText(homework.description)}</Text>

                  <View style={styles.infoGrid}>
                    <InfoTile theme={theme} label="Форматы" value={homework.allowedFormats.join(", ").toUpperCase()} />
                    <InfoTile theme={theme} label="Создал" value={homework.createdBy} />
                    <InfoTile theme={theme} label="Сдач" value={String(relatedSubmissions.length)} />
                    <InfoTile theme={theme} label="До дедлайна" value={buildDeadlineHint(homework.dueAt)} />
                  </View>

                  {!isTeacher ? (
                    <View style={styles.actionRow}>
                      <AppButton
                        label={mySubmission ? "Заменить файл" : "Сдать работу"}
                        onPress={() => handlePickSubmission(homework)}
                        theme={theme}
                        fullWidth={false}
                        style={styles.inlineButton}
                      />

                      {mySubmission ? (
                        <>
                          <AppButton
                            label="Скачать мой файл"
                            onPress={() => handleDownloadSubmission(mySubmission)}
                            theme={theme}
                            variant="secondary"
                            fullWidth={false}
                            style={styles.inlineButton}
                          />
                          <AppButton
                            label="Удалить сдачу"
                            onPress={() => onDeleteSubmission(mySubmission.id)}
                            theme={theme}
                            variant="ghost"
                            fullWidth={false}
                            style={styles.inlineButton}
                          />
                        </>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <AppButton
                        label="Удалить задание"
                        onPress={() => onDeleteHomework(homework.id)}
                        theme={theme}
                        variant="ghost"
                        fullWidth={false}
                        style={styles.inlineButton}
                      />
                    </View>
                  )}

                  {mySubmission && !isTeacher ? (
                    <View style={styles.studentSubmissionBox}>
                      <Text style={styles.submissionTitle}>Моя сдача</Text>
                      <Text style={styles.submissionMeta}>
                        {fixText(`Файл: ${mySubmission.fileName} • Отправлено: ${formatDateTime(mySubmission.submittedAt)}`)}
                      </Text>
                      <Text style={styles.submissionMeta}>
                        {fixText(`Оценка: ${mySubmission.score !== null ? mySubmission.score : "ещё не выставлена"}`)}
                      </Text>
                      {mySubmission.teacherComment ? (
                        <Text style={styles.submissionComment}>{fixText(mySubmission.teacherComment)}</Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isTeacher ? (
                    <View style={styles.teacherSubmissionsWrap}>
                      <Text style={styles.teacherSubmissionsTitle}>Сдачи студентов</Text>

                      {relatedSubmissions.length === 0 ? (
                        <StateCallout
                          theme={theme}
                          title="Сдач пока нет"
                          description="Студенты ещё не загрузили файлы по этому заданию. Как только появятся первые работы, они отобразятся здесь."
                          tone="info"
                        />
                      ) : (
                        relatedSubmissions.map((submission) => {
                          const scoreValue =
                            scoreDrafts[submission.id] ??
                            (submission.score !== null ? String(submission.score) : "");

                          const commentValue =
                            commentDrafts[submission.id] ??
                            submission.teacherComment ??
                            "";

                          return (
                            <View key={submission.id} style={styles.submissionCard}>
                              <View style={styles.submissionTop}>
                                <View style={styles.submissionTextWrap}>
                                  <Text style={styles.submissionTitle}>{fixText(submission.studentName)}</Text>
                                  <Text style={styles.submissionMeta}>
                                    {fixText(`Логин: ${submission.studentLogin}`)}
                                  </Text>
                                  <Text style={styles.submissionMeta}>
                                    {fixText(`Файл: ${submission.fileName} • ${submission.fileType.toUpperCase()}`)}
                                  </Text>
                                  <Text style={styles.submissionMeta}>
                                    {fixText(`Сдано: ${formatDateTime(submission.submittedAt)}`)}
                                  </Text>
                                </View>

                                <StatusPill
                                  theme={theme}
                                  label={submission.score !== null ? "Проверено" : "Ожидает проверки"}
                                  tone={submission.score !== null ? "success" : "warning"}
                                />
                              </View>

                              <View style={styles.actionRow}>
                                <AppButton
                                  label="Скачать файл"
                                  onPress={() => handleDownloadSubmission(submission)}
                                  theme={theme}
                                  variant="secondary"
                                  fullWidth={false}
                                  style={styles.inlineButton}
                                />
                                <AppButton
                                  label="Удалить сдачу"
                                  onPress={() => onDeleteSubmission(submission.id)}
                                  theme={theme}
                                  variant="ghost"
                                  fullWidth={false}
                                  style={styles.inlineButton}
                                />
                              </View>

                              <View style={styles.inputGrid}>
                                <View style={styles.inputCol}>
                                  <AppInput
                                    label="Оценка"
                                    theme={theme}
                                    value={scoreValue}
                                    onChangeText={(value) =>
                                      setScoreDrafts((current) => ({
                                        ...current,
                                        [submission.id]: value
                                      }))
                                    }
                                    placeholder="Баллы"
                                    keyboardType="numeric"
                                  />
                                </View>

                                <View style={styles.inputColWide}>
                                  <AppInput
                                    label="Комментарий преподавателя"
                                    theme={theme}
                                    value={commentValue}
                                    onChangeText={(value) =>
                                      setCommentDrafts((current) => ({
                                        ...current,
                                        [submission.id]: value
                                      }))
                                    }
                                    placeholder="Комментарий"
                                  />
                                </View>
                              </View>

                              <AppButton
                                label="Сохранить оценку"
                                onPress={() => handleSaveGrade(submission, homework)}
                                theme={theme}
                                fullWidth={false}
                                style={styles.inlineButton}
                              />
                            </View>
                          );
                        })
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>
    </Screen>
  );
}

type MiniStatCardProps = {
  theme: AppTheme;
  value: string;
  label: string;
};

function MiniStatCard({ theme, value, label }: MiniStatCardProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.miniStatCard}>
      <Text style={styles.miniStatValue}>{fixText(value)}</Text>
      <Text style={styles.miniStatLabel}>{fixText(label)}</Text>
    </View>
  );
}

type InfoTileProps = {
  theme: AppTheme;
  label: string;
  value: string;
};

function InfoTile({ theme, label, value }: InfoTileProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.infoTile}>
      <Text style={styles.infoTileLabel}>{fixText(label)}</Text>
      <Text style={styles.infoTileValue}>{fixText(value)}</Text>
    </View>
  );
}

function buildAcceptString(formats: string[]): string {
  return formats.map((format) => `.${format}`).join(",");
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildDeadlineHint(value: string): string {
  const deadlineTs = new Date(value).getTime();
  const diffMin = Math.round((deadlineTs - Date.now()) / 60000);

  if (diffMin < 0) {
    return "Срок прошёл";
  }

  if (diffMin < 60) {
    return `${diffMin} мин`;
  }

  const hours = Math.floor(diffMin / 60);
  if (hours < 24) {
    return `${hours} ч`;
  }

  const days = Math.floor(hours / 24);
  return `${days} дн`;
}

function homeworkStatusLabel(
  homework: HomeworkItem,
  submission: HomeworkSubmissionItem | null
): string {
  if (submission?.score !== null) {
    return "Проверено";
  }

  if (submission) {
    return "Сдано";
  }

  if (Date.now() > new Date(homework.dueAt).getTime()) {
    return "Просрочено";
  }

  return "Активно";
}

function homeworkStatusTone(
  homework: HomeworkItem,
  submission: HomeworkSubmissionItem | null
): StatusTone {
  if (submission?.score !== null) {
    return "success";
  }

  if (submission) {
    return "info";
  }

  if (Date.now() > new Date(homework.dueAt).getTime()) {
    return "warning";
  }

  return "neutral";
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 560;
  const isCompact = width < 980;

  return StyleSheet.create({
    headerChip: {
      minHeight: 38,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.primarySoft
    },
    headerChipText: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary
    },
    heroCard: {
      flexDirection: isCompact ? "column" : "row",
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg
    },
    heroLeft: {
      flex: 1,
      minWidth: 0,
      paddingRight: isCompact ? 0 : theme.spacing.lg,
      marginBottom: isCompact ? theme.spacing.md : 0
    },
    heroEyebrow: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.3
    },
    heroTitle: {
      fontSize: isPhone ? 24 : theme.typography.title,
      lineHeight: isPhone ? 30 : theme.typography.title + 4,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    heroSubtitle: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      maxWidth: 760
    },
    heroStats: {
      width: isCompact ? "100%" : 260
    },
    miniStatCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm
    },
    miniStatValue: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    miniStatLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    sectionLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    formatRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.md
    },
    formatChip: {
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    formatChipText: {
      fontSize: theme.typography.caption,
      fontWeight: "700"
    },
    inputGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0
    },
    inputCol: {
      flexBasis: isPhone ? "100%" : 220,
      flexGrow: 1,
      paddingHorizontal: 0
    },
    inputColWide: {
      flexBasis: isPhone ? "100%" : 360,
      flexGrow: 1,
      paddingHorizontal: 0
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      marginTop: theme.spacing.xs
    },
    actionTop: {
      marginTop: theme.spacing.sm
    },
    emptyText: {
      fontSize: theme.typography.body,
      color: theme.colors.textSecondary
    },
    homeworkList: {
      width: "100%"
    },
    homeworkCard: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    homeworkTop: {
      flexDirection: isPhone ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isPhone ? "stretch" : "flex-start",
      marginBottom: theme.spacing.md
    },
    homeworkTextWrap: {
      flex: 1,
      paddingRight: isPhone ? 0 : theme.spacing.md,
      marginBottom: isPhone ? theme.spacing.sm : 0
    },
    homeworkTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    homeworkMeta: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary
    },
    descriptionText: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm
    },
    infoTile: {
      flexBasis: isPhone ? "100%" : 220,
      flexGrow: 1,
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    infoTileLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    infoTileValue: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text
    },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: theme.spacing.sm
    },
    inlineButton: {
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    studentSubmissionBox: {
      marginTop: theme.spacing.md,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    teacherSubmissionsWrap: {
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border
    },
    teacherSubmissionsTitle: {
      fontSize: theme.typography.sectionTitle,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.md
    },
    submissionCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    submissionTop: {
      flexDirection: isPhone ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isPhone ? "stretch" : "flex-start",
      marginBottom: theme.spacing.md
    },
    submissionTextWrap: {
      flex: 1,
      paddingRight: isPhone ? 0 : theme.spacing.md,
      marginBottom: isPhone ? theme.spacing.sm : 0
    },
    submissionTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    submissionMeta: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    submissionComment: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs
    }
  });
}
