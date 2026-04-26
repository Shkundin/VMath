import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions
} from "react-native";
import type { LectureDetails, QuizQuestion } from "@vm/shared";

import { AppButton } from "../components/ui/AppButton";
import { AnswerOptionSelector } from "../components/ui/AnswerOptionSelector";
import { AppInput } from "../components/ui/AppInput";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import type { LectureItem } from "../mocks/lectures";
import type { UserProfile } from "../mocks/user";
import type { AppTheme } from "../theme";
import { fixTextSafe as fixText } from "../utils/fixTextSafe";

export type DraftLectureInput = {
  title: string;
  description: string;
  theory: string;
  videoUrl: string;
  subject: string;
  semester: string;
  level: string;
};

export type DraftLectureMetaInput = {
  subject: string;
  semester: string;
  level: string;
  videoUrl: string;
};

export type DraftQuestionInput = {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOptionKey: "A" | "B" | "C" | "D";
  explanation: string;
};

type TeacherSessionSummary = {
  lectureId: string;
  lectureTitle: string;
  sessionCode: string;
  status: "draft" | "active" | "stopped";
};

type TeacherHomeScreenProps = {
  theme: AppTheme;
  user: UserProfile;
  teacherJoinCode: string;
  lectures: LectureItem[];
  lectureDetailsById: Record<string, LectureDetails>;
  activeSession?: TeacherSessionSummary | null;
  onLaunchSharedSession: (lecture: LectureItem) => void;
  onOpenManageSession: (lecture: LectureItem) => void;
  onCreateDraftLecture: (input: DraftLectureInput) => string | null;
  onUpdateDraftLectureMeta: (lectureId: string, input: DraftLectureMetaInput) => void;
  onAddDraftQuestion: (lectureId: string, input: DraftQuestionInput) => void;
  onDeleteDraftQuestion: (lectureId: string, questionId: string) => void;
  onDeleteLecture: (lectureId: string) => void;
  onLogout: () => void;
};

export function TeacherHomeScreen({
  theme,
  user,
  teacherJoinCode,
  lectures,
  lectureDetailsById,
  activeSession,
  onLaunchSharedSession,
  onOpenManageSession,
  onCreateDraftLecture,
  onUpdateDraftLectureMeta,
  onAddDraftQuestion,
  onDeleteDraftQuestion,
  onDeleteLecture,
  onLogout
}: TeacherHomeScreenProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);
  const isCompactLayout = width < 980;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [theory, setTheory] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [subject, setSubject] = useState("Математический анализ");
  const [semester, setSemester] = useState("1 семестр");
  const [level, setLevel] = useState("Базовый");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [expandedLectureId, setExpandedLectureId] = useState<string | null>(null);

  const [metaSubject, setMetaSubject] = useState("");
  const [metaSemester, setMetaSemester] = useState("");
  const [metaLevel, setMetaLevel] = useState("");
  const [metaVideoUrl, setMetaVideoUrl] = useState("");
  const [metaSuccess, setMetaSuccess] = useState("");

  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOptionKey, setCorrectOptionKey] = useState<"A" | "B" | "C" | "D">("A");
  const [questionExplanation, setQuestionExplanation] = useState("");
  const [questionError, setQuestionError] = useState("");
  const [questionSuccess, setQuestionSuccess] = useState("");

  const expandedLecture = useMemo(
    () => lectures.find((lecture) => lecture.id === expandedLectureId) ?? null,
    [expandedLectureId, lectures]
  );

  const expandedTheory = useMemo(
    () => getTheoryPreview(expandedLectureId ? lectureDetailsById[expandedLectureId] : undefined),
    [expandedLectureId, lectureDetailsById]
  );

  const expandedQuestions = useMemo(
    () => getQuestions(expandedLectureId ? lectureDetailsById[expandedLectureId] : undefined),
    [expandedLectureId, lectureDetailsById]
  );

  const totalQuestions = useMemo(
    () => lectures.reduce((sum, lecture) => sum + getQuestions(lectureDetailsById[lecture.id]).length, 0),
    [lectureDetailsById, lectures]
  );

  const totalDraftLectures = useMemo(
    () => lectures.filter((lecture) => lecture.id.startsWith("draft-lecture-")).length,
    [lectures]
  );

  const sharedSessionLecture = useMemo(() => {
    if (activeSession) {
      return lectures.find((lecture) => lecture.id === activeSession.lectureId) ?? null;
    }

    return expandedLecture ?? lectures[0] ?? null;
  }, [activeSession, expandedLecture, lectures]);

  const sharedSessionLabel = activeSession?.status === "active"
    ? "Открыть общую сессию"
    : "Запустить общую сессию";

  const sharedSessionHint = activeSession
    ? `Сейчас активна лекция «${fixText(activeSession.lectureTitle)}» • код ${fixText(activeSession.sessionCode)}`
    : sharedSessionLecture
      ? `Сессия запустится для лекции «${fixText(sharedSessionLecture.title)}».`
      : "Сначала создай хотя бы одну лекцию, чтобы запустить общую сессию.";

  const normalizedTeacherName = fixText(user.fullName || "");
  const teacherDisplayName = normalizedTeacherName.trim().length > 0
    ? normalizedTeacherName
    : "Преподаватель VisualMath";

  const teacherVideoUrl =
    expandedLecture ? ((expandedLecture as LectureItem & { videoUrl?: string }).videoUrl ?? "") : "";

  useEffect(() => {
    if (!expandedLecture) {
      setMetaSubject("");
      setMetaSemester("");
      setMetaLevel("");
      setMetaVideoUrl("");
      return;
    }

    setMetaSubject(expandedLecture.subject || "");
    setMetaSemester(expandedLecture.semester || "");
    setMetaLevel(expandedLecture.level || "");
    setMetaVideoUrl(teacherVideoUrl);
  }, [expandedLecture, teacherVideoUrl]);

  function resetQuestionForm() {
    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectOptionKey("A");
    setQuestionExplanation("");
    setQuestionError("");
    setQuestionSuccess("");
  }

  function handleCreateLecture() {
    const nextTitle = title.trim();
    const nextDescription = description.trim();
    const nextTheory = theory.trim();
    const nextSubject = subject.trim();
    const nextSemester = semester.trim();
    const nextLevel = level.trim();

    if (!nextTitle) {
      setCreateSuccess("");
      setCreateError("Введите название лекции.");
      return;
    }

    if (!nextDescription) {
      setCreateSuccess("");
      setCreateError("Введите краткое описание.");
      return;
    }

    if (!nextTheory) {
      setCreateSuccess("");
      setCreateError("Введите теоретический материал.");
      return;
    }

    if (!nextSubject || !nextSemester || !nextLevel) {
      setCreateSuccess("");
      setCreateError("Заполни предмет, семестр и уровень.");
      return;
    }

    const createdLectureId = onCreateDraftLecture({
      title: nextTitle,
      description: nextDescription,
      theory: nextTheory,
      subject: nextSubject,
      semester: nextSemester,
      level: nextLevel,
      videoUrl: videoUrl.trim()
    });

    if (!createdLectureId) {
      setCreateSuccess("");
      setCreateError("Не удалось создать лекцию.");
      return;
    }

    setTitle("");
    setDescription("");
    setTheory("");
    setVideoUrl("");
    setSubject("Математический анализ");
    setSemester("1 семестр");
    setLevel("Базовый");
    setCreateError("");
    setCreateSuccess("Лекция создана. Теперь можно открыть редактор и добавить вопросы.");
    setExpandedLectureId(createdLectureId);
    resetQuestionForm();
  }

  function handleToggleEditor(lectureId: string) {
    setQuestionError("");
    setQuestionSuccess("");
    setMetaSuccess("");

    if (expandedLectureId === lectureId) {
      setExpandedLectureId(null);
      return;
    }

    setExpandedLectureId(lectureId);
    resetQuestionForm();
  }

  function handleSaveMeta() {
    if (!expandedLecture) {
      return;
    }

    const nextSubject = metaSubject.trim();
    const nextSemester = metaSemester.trim();
    const nextLevel = metaLevel.trim();

    if (!nextSubject || !nextSemester || !nextLevel) {
      setMetaSuccess("");
      return;
    }

    onUpdateDraftLectureMeta(expandedLecture.id, {
      subject: nextSubject,
      semester: nextSemester,
      level: nextLevel,
      videoUrl: metaVideoUrl.trim()
    });

    setMetaSuccess("Параметры лекции обновлены.");
  }

  function handleAddQuestion() {
    if (!expandedLecture) {
      return;
    }

    if (!questionText.trim()) {
      setQuestionSuccess("");
      setQuestionError("Введите текст вопроса.");
      return;
    }

    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setQuestionSuccess("");
      setQuestionError("Заполни все четыре варианта ответа.");
      return;
    }

    onAddDraftQuestion(expandedLecture.id, {
      text: questionText.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      optionC: optionC.trim(),
      optionD: optionD.trim(),
      correctOptionKey,
      explanation: questionExplanation.trim()
    });

    resetQuestionForm();
    setQuestionSuccess("Вопрос добавлен.");
  }

  const createLectureSection = (
    <SectionCard
      theme={theme}
      title="Создать новую лекцию"
      subtitle="Сначала создаём основу, потом открываем редактор и наполняем вопросами."
      style={isCompactLayout ? undefined : styles.dashboardWide}
    >
      <AppInput
        label="Название лекции"
        theme={theme}
        value={title}
        onChangeText={setTitle}
        placeholder="Например: Производная и касательная"
        autoCorrect={false}
      />

      <AppInput
        label="Краткое описание"
        theme={theme}
        value={description}
        onChangeText={setDescription}
        placeholder="О чём эта лекция"
        multiline
        numberOfLines={3}
      />

      <AppInput
        label="Теоретический материал"
        theme={theme}
        value={theory}
        onChangeText={setTheory}
        placeholder="Вставь основной текст лекции"
        multiline
        numberOfLines={8}
      />

      <View style={styles.formRow}>
        <View style={styles.formCol}>
          <AppInput
            label="Предмет"
            theme={theme}
            value={subject}
            onChangeText={setSubject}
            placeholder="Математический анализ"
          />
        </View>

        <View style={styles.formCol}>
          <AppInput
            label="Семестр"
            theme={theme}
            value={semester}
            onChangeText={setSemester}
            placeholder="1 семестр"
          />
        </View>

        <View style={styles.formCol}>
          <AppInput
            label="Уровень"
            theme={theme}
            value={level}
            onChangeText={setLevel}
            placeholder="Базовый"
          />
        </View>
      </View>

      <AppInput
        label="Ссылка на видеоматериал"
        theme={theme}
        value={videoUrl}
        onChangeText={setVideoUrl}
        placeholder="https://..."
        autoCapitalize="none"
        autoCorrect={false}
      />

      {createError ? <Text style={styles.errorText}>{fixText(createError)}</Text> : null}
      {createSuccess ? <Text style={styles.successText}>{fixText(createSuccess)}</Text> : null}

      <AppButton
        label="Создать лекцию"
        onPress={handleCreateLecture}
        theme={theme}
        style={styles.actionTop}
      />
    </SectionCard>
  );

  const focusDaySection = (
    <SectionCard
      theme={theme}
      title="Фокус дня"
      subtitle="Быстрый доступ к главным действиям преподавателя."
      style={isCompactLayout ? undefined : styles.dashboardNarrow}
    >
      <View style={styles.quickActionsGrid}>
        <ActionMiniCard
          theme={theme}
          title="Лекции"
          subtitle="Открывай редактор и дополняй структуру курса."
          style={styles.quickActionItem}
        />
        <ActionMiniCard
          theme={theme}
          title="Сессии"
          subtitle="Запускай занятие и переключай учебные блоки."
          style={styles.quickActionItem}
        />
        <ActionMiniCard
          theme={theme}
          title="Тестирование"
          subtitle="Делай быстрые проверочные тесты прямо на занятии."
          style={styles.quickActionItem}
        />
        <ActionMiniCard
          theme={theme}
          title="Итоги"
          subtitle="Смотри, кто уже сдал задания и как прошли проверки."
          style={styles.quickActionItem}
        />
      </View>
    </SectionCard>
  );

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Кабинет преподавателя"
        subtitle="Создавай лекции, управляй материалами, проверочными блоками и быстрыми сессиями."
      />

      <View style={styles.heroCard}>
        <View style={styles.heroGlowPrimary} />
        <View style={styles.heroGlowSecondary} />

        <View style={styles.heroMain}>
          <Text style={styles.heroEyebrow}>Рабочее пространство</Text>
          <Text style={styles.heroTitle}>{teacherDisplayName}</Text>
          <Text style={styles.heroSubtitle}>
            Всё важное в одном месте: создание лекций, редактор вопросов, запуск тестов и проверка результатов.
          </Text>

          <View style={styles.infoRow}>
            <InfoBadge theme={theme} label={`Логин: ${user.login}`} />
            <InfoBadge theme={theme} label={`Группа: ${user.group}`} />
            <InfoBadge theme={theme} label={`Код курса: ${teacherJoinCode}`} />
          </View>

          <View style={styles.heroActionRow}>
            <AppButton
              label={sharedSessionLabel}
              onPress={() => {
                if (sharedSessionLecture) {
                  onLaunchSharedSession(sharedSessionLecture);
                }
              }}
              theme={theme}
              fullWidth={false}
              disabled={!sharedSessionLecture}
              style={styles.heroPrimaryButton}
            />
            <AppButton
              label="Выйти из аккаунта"
              onPress={onLogout}
              theme={theme}
              variant="secondary"
              fullWidth={false}
              style={styles.inlineButton}
            />
          </View>

          <Text style={styles.heroHelperText}>{sharedSessionHint}</Text>
        </View>

        <View style={styles.heroStats}>
          <StatTile theme={theme} value={String(lectures.length)} label="Лекций" />
          <StatTile theme={theme} value={String(totalDraftLectures)} label="Черновиков" />
          <StatTile theme={theme} value={String(totalQuestions)} label="Вопросов" />
        </View>
      </View>

      {isCompactLayout ? (
        <>
          {createLectureSection}
          {focusDaySection}
        </>
      ) : (
        <View style={styles.dashboardRow}>
          {createLectureSection}
          {focusDaySection}
        </View>
      )}

      <SectionCard
        theme={theme}
        title="Лекции преподавателя"
        subtitle="Запуск сессии, редактор и управление вопросами прямо из карточки лекции."
      >
        {lectures.length === 0 ? (
          <Text style={styles.emptyText}>{fixText("РџРѕРєР° РЅРµС‚ Р»РµРєС†РёР№. РЎРѕР·РґР°Р№ РїРµСЂРІСѓСЋ Р»РµРєС†РёСЋ РІС‹С€Рµ.")}</Text>
        ) : (
          lectures.map((lecture) => {
            const isExpanded = expandedLectureId === lecture.id;
            const questions = getQuestions(lectureDetailsById[lecture.id]);
            const videoValue = (lecture as LectureItem & { videoUrl?: string }).videoUrl ?? "";
            const lectureMetaSection = (
              <SectionCard
                theme={theme}
                title="Параметры лекции"
                subtitle="Предмет, семестр, уровень и видеоматериал."
                style={isCompactLayout ? undefined : styles.editorCard}
              >
                <AppInput
                  label="Предмет"
                  theme={theme}
                  value={metaSubject}
                  onChangeText={setMetaSubject}
                  placeholder="Предмет"
                />

                <AppInput
                  label="Семестр"
                  theme={theme}
                  value={metaSemester}
                  onChangeText={setMetaSemester}
                  placeholder="Семестр"
                />

                <AppInput
                  label="Уровень"
                  theme={theme}
                  value={metaLevel}
                  onChangeText={setMetaLevel}
                  placeholder="Уровень"
                />

                <AppInput
                  label="Ссылка на видео"
                  theme={theme}
                  value={metaVideoUrl}
                  onChangeText={setMetaVideoUrl}
                  placeholder="https://..."
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {metaSuccess ? <Text style={styles.successText}>{fixText(metaSuccess)}</Text> : null}

                <AppButton
                  label="Сохранить параметры"
                  onPress={handleSaveMeta}
                  theme={theme}
                  style={styles.actionTop}
                />
              </SectionCard>
            );
            const theorySection = (
              <SectionCard
                theme={theme}
                title="Теория лекции"
                subtitle="Предпросмотр основного материала."
                style={isCompactLayout ? undefined : styles.editorCard}
              >
                <Text style={styles.theoryPreview}>
                  {fixText(expandedTheory || "Теория пока не добавлена.")}
                </Text>
              </SectionCard>
            );
            const addQuestionSection = (
              <SectionCard
                theme={theme}
                title="Добавить вопрос"
                subtitle="Собери новый вопрос для проверочного блока."
                style={isCompactLayout ? undefined : styles.editorCard}
              >
                <AppInput
                  label="Текст вопроса"
                  theme={theme}
                  value={questionText}
                  onChangeText={setQuestionText}
                  placeholder="Введите вопрос"
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.formRow}>
                  <View style={styles.halfCol}>
                    <AppInput
                      label="Вариант A"
                      theme={theme}
                      value={optionA}
                      onChangeText={setOptionA}
                      placeholder="Первый вариант"
                    />
                  </View>
                  <View style={styles.halfCol}>
                    <AppInput
                      label="Вариант B"
                      theme={theme}
                      value={optionB}
                      onChangeText={setOptionB}
                      placeholder="Второй вариант"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.halfCol}>
                    <AppInput
                      label="Вариант C"
                      theme={theme}
                      value={optionC}
                      onChangeText={setOptionC}
                      placeholder="Третий вариант"
                    />
                  </View>
                  <View style={styles.halfCol}>
                    <AppInput
                      label="Вариант D"
                      theme={theme}
                      value={optionD}
                      onChangeText={setOptionD}
                      placeholder="Четвёртый вариант"
                    />
                  </View>
                </View>

                <AnswerOptionSelector
                  theme={theme}
                  label="Правильный ответ"
                  helperText="Выбери правильный вариант прямо по карточке ответа, чтобы на телефоне всё читалось и нажималось без промахов."
                  options={[
                    { key: "A", label: "Вариант A", text: optionA },
                    { key: "B", label: "Вариант B", text: optionB },
                    { key: "C", label: "Вариант C", text: optionC },
                    { key: "D", label: "Вариант D", text: optionD }
                  ]}
                  selectedKey={correctOptionKey}
                  onSelect={setCorrectOptionKey}
                />

                <AppInput
                  label="Пояснение"
                  theme={theme}
                  value={questionExplanation}
                  onChangeText={setQuestionExplanation}
                  placeholder="Короткое пояснение к правильному ответу"
                  multiline
                  numberOfLines={3}
                />

                {questionError ? <Text style={styles.errorText}>{fixText(questionError)}</Text> : null}
                {questionSuccess ? <Text style={styles.successText}>{fixText(questionSuccess)}</Text> : null}

                <AppButton
                  label="Добавить вопрос"
                  onPress={handleAddQuestion}
                  theme={theme}
                  style={styles.actionTop}
                />
              </SectionCard>
            );
            const currentQuestionsSection = (
              <SectionCard
                theme={theme}
                title="Текущие вопросы"
                subtitle="Вопросы для этой лекции."
                style={isCompactLayout ? undefined : styles.editorCard}
              >
                {expandedQuestions.length === 0 ? (
                  <Text style={styles.emptyText}>{fixText("Пока нет вопросов.")}</Text>
                ) : (
                  expandedQuestions.map((question, index) => (
                    <View key={question.id} style={styles.questionCard}>
                      <Text style={styles.questionTitle}>
                        {index + 1}. {fixText(question.text)}
                      </Text>

                      {question.options?.map((option) => (
                        <Text key={option.id} style={styles.questionOption}>
                          {option.id}. {fixText(option.text)}
                        </Text>
                      ))}

                      {question.correctAnswerHint ? (
                        <Text style={styles.questionHint}>{fixText(question.correctAnswerHint)}</Text>
                      ) : null}

                      <AppButton
                        label="Удалить вопрос"
                        onPress={() => onDeleteDraftQuestion(lecture.id, question.id)}
                        theme={theme}
                        variant="secondary"
                        fullWidth={false}
                        style={styles.inlineButton}
                      />
                    </View>
                  ))
                )}
              </SectionCard>
            );

            return (
              <View key={lecture.id} style={[styles.lectureCard, isExpanded ? styles.lectureCardExpanded : null]}>
                <View style={styles.lectureHeader}>
                  <View style={styles.lectureHeaderText}>
                    <View style={styles.pillRow}>
                      <TinyPill theme={theme} label={fixText(lecture.subject)} tone="primary" />
                      <TinyPill theme={theme} label={fixText(lecture.level)} tone="neutral" />
                      {lecture.id.startsWith("draft-lecture-") ? (
                        <TinyPill theme={theme} label="Черновик" tone="success" />
                      ) : null}
                    </View>

                    <Text style={styles.lectureTitle}>{fixText(lecture.title)}</Text>
                    <Text style={styles.lectureMeta}>
                      {`${fixText(lecture.subject)} • ${fixText(lecture.semester)} • ${fixText(lecture.level)}`}
                    </Text>
                    <Text style={styles.lectureDescription}>{fixText(lecture.description)}</Text>
                  </View>
                </View>

                <View style={styles.metaPanel}>
                  <MetaItem theme={theme} label="Блоков" value={String(lecture.blocks.length)} />
                  <MetaItem theme={theme} label="Вопросов" value={String(questions.length)} />
                  <MetaItem theme={theme} label="Длительность" value={fixText(lecture.estimatedDuration)} />
                </View>

                {videoValue ? (
                  <Text style={styles.videoHint}>{`Видео: ${videoValue}`}</Text>
                ) : null}

                <View style={styles.actionsRow}>
                  <AppButton
                    label="Запустить сессию"
                    onPress={() => onOpenManageSession(lecture)}
                    theme={theme}
                    fullWidth={false}
                    style={styles.inlineButton}
                  />
                  <AppButton
                    label={isExpanded ? "Скрыть редактор" : "Открыть редактор"}
                    onPress={() => handleToggleEditor(lecture.id)}
                    theme={theme}
                    variant="secondary"
                    fullWidth={false}
                    style={styles.inlineButton}
                  />
                  <AppButton
                    label="Удалить лекцию"
                    onPress={() => onDeleteLecture(lecture.id)}
                    theme={theme}
                    variant="ghost"
                    fullWidth={false}
                    style={styles.inlineButton}
                  />
                </View>

                {isExpanded ? (
                  <View style={styles.editorShell}>
                    {isCompactLayout ? (
                      <>
                        {lectureMetaSection}
                        {theorySection}
                        {addQuestionSection}
                        {currentQuestionsSection}
                      </>
                    ) : (
                      <>
                        <View style={styles.editorRow}>
                          {lectureMetaSection}
                          {theorySection}
                        </View>

                        <View style={styles.editorRow}>
                          {addQuestionSection}
                          {currentQuestionsSection}
                        </View>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </SectionCard>
    </Screen>
  );
}

type StatTileProps = {
  theme: AppTheme;
  value: string;
  label: string;
};

function StatTile({ theme, value, label }: StatTileProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{fixText(value)}</Text>
      <Text style={styles.statLabel}>{fixText(label)}</Text>
    </View>
  );
}

type InfoBadgeProps = {
  theme: AppTheme;
  label: string;
};

function InfoBadge({ theme, label }: InfoBadgeProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View style={styles.infoBadge}>
      <Text style={styles.infoBadgeText}>{fixText(label)}</Text>
    </View>
  );
}

type TinyPillProps = {
  theme: AppTheme;
  label: string;
  tone: "primary" | "neutral" | "success";
};

function TinyPill({ theme, label, tone }: TinyPillProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View
      style={[
        styles.tinyPill,
        tone === "primary" ? styles.tinyPillPrimary : null,
        tone === "neutral" ? styles.tinyPillNeutral : null,
        tone === "success" ? styles.tinyPillSuccess : null
      ]}
    >
      <Text
        style={[
          styles.tinyPillText,
          tone === "primary" ? styles.tinyPillTextPrimary : null,
          tone === "success" ? styles.tinyPillTextSuccess : null
        ]}
      >
        {fixText(label)}
      </Text>
    </View>
  );
}

type MetaItemProps = {
  theme: AppTheme;
  label: string;
  value: string;
};

function MetaItem({ theme, label, value }: MetaItemProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaItemLabel}>{fixText(label)}</Text>
      <Text style={styles.metaItemValue}>{fixText(value)}</Text>
    </View>
  );
}

type ActionMiniCardProps = {
  theme: AppTheme;
  title: string;
  subtitle: string;
  style?: StyleProp<ViewStyle>;
};

function ActionMiniCard({ theme, title, subtitle, style }: ActionMiniCardProps) {
  const { width } = useWindowDimensions();
  const styles = createStyles(theme, width);

  return (
    <View style={[styles.actionMiniCard, style]}>
      <Text style={styles.actionMiniTitle}>{fixText(title)}</Text>
      <Text style={styles.actionMiniSubtitle}>{fixText(subtitle)}</Text>
    </View>
  );
}

function getTheoryPreview(details?: LectureDetails): string {
  if (!details) {
    return "";
  }

  const theoryBlock = details.blocks.find((block) => block.type === "text");
  if (theoryBlock && theoryBlock.type === "text") {
    return theoryBlock.payload.markdown;
  }

  return details.description ?? "";
}

function getQuestions(details?: LectureDetails): QuizQuestion[] {
  if (!details) {
    return [];
  }

  const quizBlock = details.blocks.find((block) => block.type === "quiz");
  if (!quizBlock || quizBlock.type !== "quiz") {
    return [];
  }

  return quizBlock.payload.questions;
}

function createStyles(theme: AppTheme, width: number) {
  const isPhone = width < 560;
  const isCompact = width < 980;

  return StyleSheet.create({
    heroCard: {
      position: "relative",
      overflow: "hidden",
      flexDirection: isCompact ? "column" : "row",
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
      ...theme.shadow.md
    },
    heroGlowPrimary: {
      position: "absolute",
      top: -46,
      right: -24,
      width: isPhone ? 160 : 230,
      height: isPhone ? 160 : 230,
      borderRadius: 999,
      backgroundColor: theme.colors.primarySoft,
      opacity: 0.84
    },
    heroGlowSecondary: {
      position: "absolute",
      bottom: -58,
      left: -42,
      width: isPhone ? 170 : 240,
      height: isPhone ? 170 : 240,
      borderRadius: 999,
      backgroundColor: "rgba(19, 121, 91, 0.10)"
    },
    heroMain: {
      flex: 1,
      minWidth: 0,
      paddingRight: isCompact ? 0 : theme.spacing.lg,
      marginBottom: isCompact ? theme.spacing.md : 0
    },
    heroEyebrow: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: theme.spacing.sm,
      textTransform: "uppercase",
      letterSpacing: 0.3
    },
    heroTitle: {
      fontFamily: theme.fonts.display,
      fontSize: isPhone ? 24 : theme.typography.title,
      lineHeight: isPhone ? 30 : theme.typography.title + 4,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    heroSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      maxWidth: 760
    },
    infoRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.sm
    },
    infoBadge: {
      minHeight: 34,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: "center",
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    infoBadgeText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.text
    },
    heroActionRow: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    heroPrimaryButton: {
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    heroHelperText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
      maxWidth: 760
    },
    heroStats: {
      width: isCompact ? "100%" : 250,
      flexDirection: isPhone ? "row" : "column",
      flexWrap: isPhone ? "wrap" : "nowrap",
      gap: isPhone ? theme.spacing.sm : 0
    },
    statTile: {
      flexBasis: isPhone ? "30%" : undefined,
      flexGrow: isPhone ? 1 : 0,
      minWidth: isPhone ? 92 : undefined,
      borderRadius: theme.radius.lg,
      padding: isPhone ? theme.spacing.md : theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: isPhone ? 0 : theme.spacing.sm,
      ...theme.shadow.sm
    },
    statValue: {
      fontFamily: theme.fonts.display,
      fontSize: 26,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    statLabel: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    dashboardRow: {
      flexDirection: isCompact ? "column" : "row",
      alignItems: "stretch",
      columnGap: theme.spacing.md
    },
    dashboardWide: {
      flex: isCompact ? 0 : 1.2,
      width: isCompact ? "100%" : undefined
    },
    dashboardNarrow: {
      flex: isCompact ? 0 : 0.8,
      width: isCompact ? "100%" : undefined
    },
    quickActionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    quickActionItem: {
      flexBasis: "100%",
      flexGrow: 0,
      marginBottom: 0
    },
    actionMiniCard: {
      borderRadius: theme.radius.md,
      padding: isPhone ? theme.spacing.sm + 2 : theme.spacing.md,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
      ...theme.shadow.sm
    },
    actionMiniTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    actionMiniSubtitle: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 18,
      color: theme.colors.textSecondary
    },
    formRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0
    },
    formCol: {
      flexBasis: isPhone ? "100%" : 220,
      flexGrow: 1,
      paddingHorizontal: 0
    },
    halfCol: {
      flexBasis: isPhone ? "100%" : 260,
      flexGrow: 1,
      paddingHorizontal: 0
    },
    actionTop: {
      marginTop: theme.spacing.sm
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      marginTop: theme.spacing.xs
    },
    successText: {
      color: theme.colors.success,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      marginTop: theme.spacing.xs
    },
    emptyText: {
      fontSize: theme.typography.body,
      color: theme.colors.textSecondary
    },
    lectureCard: {
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.md : theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
      ...theme.shadow.sm
    },
    lectureCardExpanded: {
      borderColor: theme.colors.primary
    },
    lectureHeader: {
      marginBottom: theme.spacing.sm
    },
    lectureHeaderText: {
      flex: 1
    },
    pillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.md
    },
    tinyPill: {
      minHeight: 30,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      justifyContent: "center",
      borderWidth: 1,
      marginRight: theme.spacing.xs,
      marginBottom: theme.spacing.xs
    },
    tinyPillPrimary: {
      backgroundColor: theme.colors.primarySoft,
      borderColor: theme.colors.primarySoft
    },
    tinyPillNeutral: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border
    },
    tinyPillSuccess: {
      backgroundColor: "#E6F4EA",
      borderColor: "#E6F4EA"
    },
    tinyPillText: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.text
    },
    tinyPillTextPrimary: {
      color: theme.colors.primary
    },
    tinyPillTextSuccess: {
      color: theme.colors.success
    },
    lectureTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.sectionTitle,
      lineHeight: 26,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    lectureMeta: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    lectureDescription: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.textSecondary
    },
    metaPanel: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 0,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm
    },
    metaItem: {
      flexBasis: isPhone ? "100%" : 150,
      flexGrow: 1,
      padding: theme.spacing.md,
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    metaItemLabel: {
      fontSize: theme.typography.helper,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs
    },
    metaItemValue: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text
    },
    videoHint: {
      fontSize: theme.typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    actionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: theme.spacing.sm
    },
    inlineButton: {
      width: isPhone ? "100%" : undefined,
      marginRight: isPhone ? 0 : theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    editorShell: {
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border
    },
    editorRow: {
      flexDirection: isCompact ? "column" : "row",
      columnGap: theme.spacing.md
    },
    editorCard: {
      flex: isCompact ? 0 : 1,
      width: isCompact ? "100%" : undefined
    },
    theoryPreview: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.text,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.input,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md
    },
    questionCard: {
      borderRadius: theme.radius.lg,
      padding: isPhone ? theme.spacing.sm + 2 : theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    questionTitle: {
      fontFamily: theme.fonts.display,
      fontSize: theme.typography.body,
      lineHeight: 22,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    questionOption: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    questionHint: {
      fontFamily: theme.fonts.body,
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    }
  });
}

