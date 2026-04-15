import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { LectureDetails, QuizQuestion } from "@vm/shared";

import { AppButton } from "../components/ui/AppButton";
import { AppInput } from "../components/ui/AppInput";
import { Screen } from "../components/ui/Screen";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { SectionCard } from "../components/ui/SectionCard";
import type { LectureItem } from "../mocks/lectures";
import type { UserProfile } from "../mocks/user";
import type { AppTheme } from "../theme";
import { fixText } from "../utils/fixText";

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

type TeacherHomeScreenProps = {
  theme: AppTheme;
  user: UserProfile;
  lectures: LectureItem[];
  lectureDetailsById: Record<string, LectureDetails>;
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
  lectures,
  lectureDetailsById,
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [theory, setTheory] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [subject, setSubject] = useState("Р СљР В°РЎвЂљР ВµР СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р в„– Р В°Р Р…Р В°Р В»Р С‘Р В·");
  const [semester, setSemester] = useState("1 РЎРѓР ВµР СР ВµРЎРѓРЎвЂљРЎР‚");
  const [level, setLevel] = useState("Р вЂР В°Р В·Р С•Р Р†РЎвЂ№Р в„–");
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

  const normalizedTeacherName = fixText(user.fullName || "");
  const teacherDisplayName = /[A-Za-z\u0400-\u04FF]/.test(normalizedTeacherName)
    ? normalizedTeacherName
    : "Р СџРЎР‚Р ВµР С—Р С•Р Т‘Р В°Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ VisualMath";

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
      setCreateError("Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р Р…Р В°Р В·Р Р†Р В°Р Р…Р С‘Р Вµ Р В»Р ВµР С”РЎвЂ Р С‘Р С‘.");
      return;
    }

    if (!nextDescription) {
      setCreateSuccess("");
      setCreateError("Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р С”РЎР‚Р В°РЎвЂљР С”Р С•Р Вµ Р С•Р С—Р С‘РЎРѓР В°Р Р…Р С‘Р Вµ.");
      return;
    }

    if (!nextTheory) {
      setCreateSuccess("");
      setCreateError("Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ РЎвЂљР ВµР С•РЎР‚Р ВµРЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р в„– Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В».");
      return;
    }

    if (!nextSubject || !nextSemester || !nextLevel) {
      setCreateSuccess("");
      setCreateError("Р вЂ”Р В°Р С—Р С•Р В»Р Р…Р С‘ Р С—РЎР‚Р ВµР Т‘Р СР ВµРЎвЂљ, РЎРѓР ВµР СР ВµРЎРѓРЎвЂљРЎР‚ Р С‘ РЎС“РЎР‚Р С•Р Р†Р ВµР Р…РЎРЉ.");
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
      setCreateError("Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎРѓР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В»Р ВµР С”РЎвЂ Р С‘РЎР‹.");
      return;
    }

    setTitle("");
    setDescription("");
    setTheory("");
    setVideoUrl("");
    setSubject("Р СљР В°РЎвЂљР ВµР СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р в„– Р В°Р Р…Р В°Р В»Р С‘Р В·");
    setSemester("1 РЎРѓР ВµР СР ВµРЎРѓРЎвЂљРЎР‚");
    setLevel("Р вЂР В°Р В·Р С•Р Р†РЎвЂ№Р в„–");
    setCreateError("");
    setCreateSuccess("Р вЂєР ВµР С”РЎвЂ Р С‘РЎРЏ РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р В°. Р СћР ВµР С—Р ВµРЎР‚РЎРЉ Р СР С•Р В¶Р Р…Р С• Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С•РЎР‚ Р С‘ Р Т‘Р С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓРЎвЂ№.");
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

    setMetaSuccess("Р СџР В°РЎР‚Р В°Р СР ВµРЎвЂљРЎР‚РЎвЂ№ Р В»Р ВµР С”РЎвЂ Р С‘Р С‘ Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…РЎвЂ№.");
  }

  function handleAddQuestion() {
    if (!expandedLecture) {
      return;
    }

    if (!questionText.trim()) {
      setQuestionSuccess("");
      setQuestionError("Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ РЎвЂљР ВµР С”РЎРѓРЎвЂљ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР В°.");
      return;
    }

    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setQuestionSuccess("");
      setQuestionError("Р вЂ”Р В°Р С—Р С•Р В»Р Р…Р С‘ Р Р†РЎРѓР Вµ РЎвЂЎР ВµРЎвЂљРЎвЂ№РЎР‚Р Вµ Р Р†Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљР В° Р С•РЎвЂљР Р†Р ВµРЎвЂљР В°.");
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
    setQuestionSuccess("Р вЂ™Р С•Р С—РЎР‚Р С•РЎРѓ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р….");
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="Р С™Р В°Р В±Р С‘Р Р…Р ВµРЎвЂљ Р С—РЎР‚Р ВµР С—Р С•Р Т‘Р В°Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ"
        subtitle="Р РЋР С•Р В·Р Т‘Р В°Р Р†Р В°Р в„– Р В»Р ВµР С”РЎвЂ Р С‘Р С‘, РЎС“Р С—РЎР‚Р В°Р Р†Р В»РЎРЏР в„– Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»Р В°Р СР С‘, Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С•РЎвЂЎР Р…РЎвЂ№Р СР С‘ Р В±Р В»Р С•Р С”Р В°Р СР С‘ Р С‘ Р В±РЎвЂ№РЎРѓРЎвЂљРЎР‚РЎвЂ№Р СР С‘ РЎРѓР ВµРЎРѓРЎРѓР С‘РЎРЏР СР С‘."
      />

      <View style={styles.heroCard}>
        <View style={styles.heroMain}>
          <Text style={styles.heroEyebrow}>Р В Р В°Р В±Р С•РЎвЂЎР ВµР Вµ Р С—РЎР‚Р С•РЎРѓРЎвЂљРЎР‚Р В°Р Р…РЎРѓРЎвЂљР Р†Р С•</Text>
          <Text style={styles.heroTitle}>{teacherDisplayName}</Text>
          <Text style={styles.heroSubtitle}>
            Р вЂ™РЎРѓРЎвЂ Р Р†Р В°Р В¶Р Р…Р С•Р Вµ Р Р† Р С•Р Т‘Р Р…Р С•Р С Р СР ВµРЎРѓРЎвЂљР Вµ: РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘Р Вµ Р В»Р ВµР С”РЎвЂ Р С‘Р в„–, РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С•РЎР‚ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР С•Р Р†, Р В·Р В°Р С—РЎС“РЎРѓР С” РЎвЂљР ВµРЎРѓРЎвЂљР С•Р Р† Р С‘ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° РЎР‚Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљР С•Р Р†.
          </Text>

          <View style={styles.infoRow}>
            <InfoBadge theme={theme} label={fixText(`Р вЂєР С•Р С–Р С‘Р Р…: ${user.login}`)} />
            <InfoBadge theme={theme} label={fixText(`Р вЂњРЎР‚РЎС“Р С—Р С—Р В°: ${user.group}`)} />
          </View>

          <View style={styles.heroActionRow}>
            <AppButton
              label="Р вЂ™РЎвЂ№Р в„–РЎвЂљР С‘ Р С‘Р В· Р В°Р С”Р С”Р В°РЎС“Р Р…РЎвЂљР В°"
              onPress={onLogout}
              theme={theme}
              variant="secondary"
              fullWidth={false}
              style={styles.inlineButton}
            />
          </View>
        </View>

        <View style={styles.heroStats}>
          <StatTile theme={theme} value={String(lectures.length)} label="Р вЂєР ВµР С”РЎвЂ Р С‘Р в„–" />
          <StatTile theme={theme} value={String(totalDraftLectures)} label="Р В§Р ВµРЎР‚Р Р…Р С•Р Р†Р С‘Р С”Р С•Р Р†" />
          <StatTile theme={theme} value={String(totalQuestions)} label="Р вЂ™Р С•Р С—РЎР‚Р С•РЎРѓР С•Р Р†" />
        </View>
      </View>

      <View style={styles.dashboardRow}>
        <SectionCard
          theme={theme}
          title="Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р Р…Р С•Р Р†РЎС“РЎР‹ Р В»Р ВµР С”РЎвЂ Р С‘РЎР‹"
          subtitle="Р РЋР Р…Р В°РЎвЂЎР В°Р В»Р В° РЎРѓР С•Р В·Р Т‘Р В°РЎвЂР С Р С•РЎРѓР Р…Р С•Р Р†РЎС“, Р С—Р С•РЎвЂљР С•Р С Р С•РЎвЂљР С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С•РЎР‚ Р С‘ Р Р…Р В°Р С—Р С•Р В»Р Р…РЎРЏР ВµР С Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР В°Р СР С‘."
          style={styles.dashboardWide}
        >
          <AppInput
            label="Р СњР В°Р В·Р Р†Р В°Р Р…Р С‘Р Вµ Р В»Р ВµР С”РЎвЂ Р С‘Р С‘"
            theme={theme}
            value={title}
            onChangeText={setTitle}
            placeholder="Р СњР В°Р С—РЎР‚Р С‘Р СР ВµРЎР‚: Р СџРЎР‚Р С•Р С‘Р В·Р Р†Р С•Р Т‘Р Р…Р В°РЎРЏ Р С‘ Р С”Р В°РЎРѓР В°РЎвЂљР ВµР В»РЎРЉР Р…Р В°РЎРЏ"
            autoCorrect={false}
          />

          <AppInput
            label="Р С™РЎР‚Р В°РЎвЂљР С”Р С•Р Вµ Р С•Р С—Р С‘РЎРѓР В°Р Р…Р С‘Р Вµ"
            theme={theme}
            value={description}
            onChangeText={setDescription}
            placeholder="Р С› РЎвЂЎРЎвЂР С РЎРЊРЎвЂљР В° Р В»Р ВµР С”РЎвЂ Р С‘РЎРЏ"
            multiline
            numberOfLines={3}
          />

          <AppInput
            label="Р СћР ВµР С•РЎР‚Р ВµРЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р в„– Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»"
            theme={theme}
            value={theory}
            onChangeText={setTheory}
            placeholder="Р вЂ™РЎРѓРЎвЂљР В°Р Р†РЎРЉ Р С•РЎРѓР Р…Р С•Р Р†Р Р…Р С•Р в„– РЎвЂљР ВµР С”РЎРѓРЎвЂљ Р В»Р ВµР С”РЎвЂ Р С‘Р С‘"
            multiline
            numberOfLines={8}
          />

          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <AppInput
                label="Р СџРЎР‚Р ВµР Т‘Р СР ВµРЎвЂљ"
                theme={theme}
                value={subject}
                onChangeText={setSubject}
                placeholder="Р СљР В°РЎвЂљР ВµР СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р в„– Р В°Р Р…Р В°Р В»Р С‘Р В·"
              />
            </View>

            <View style={styles.formCol}>
              <AppInput
                label="Р РЋР ВµР СР ВµРЎРѓРЎвЂљРЎР‚"
                theme={theme}
                value={semester}
                onChangeText={setSemester}
                placeholder="1 РЎРѓР ВµР СР ВµРЎРѓРЎвЂљРЎР‚"
              />
            </View>

            <View style={styles.formCol}>
              <AppInput
                label="Р Р€РЎР‚Р С•Р Р†Р ВµР Р…РЎРЉ"
                theme={theme}
                value={level}
                onChangeText={setLevel}
                placeholder="Р вЂР В°Р В·Р С•Р Р†РЎвЂ№Р в„–"
              />
            </View>
          </View>

          <AppInput
            label="Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р Р…Р В° Р Р†Р С‘Р Т‘Р ВµР С•Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»"
            theme={theme}
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="https://..."
            autoCapitalize="none"
            autoCorrect={false}
          />

          {createError ? <Text style={styles.errorText}>{createError}</Text> : null}
          {createSuccess ? <Text style={styles.successText}>{createSuccess}</Text> : null}

          <AppButton
            label="Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В»Р ВµР С”РЎвЂ Р С‘РЎР‹"
            onPress={handleCreateLecture}
            theme={theme}
            style={styles.actionTop}
          />
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Р В¤Р С•Р С”РЎС“РЎРѓ Р Т‘Р Р…РЎРЏ"
          subtitle="Р вЂРЎвЂ№РЎРѓРЎвЂљРЎР‚РЎвЂ№Р в„– Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С— Р С” Р С–Р В»Р В°Р Р†Р Р…РЎвЂ№Р С Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘РЎРЏР С Р С—РЎР‚Р ВµР С—Р С•Р Т‘Р В°Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ."
          style={styles.dashboardNarrow}
        >
          <ActionMiniCard
            theme={theme}
            title="Р вЂєР ВµР С”РЎвЂ Р С‘Р С‘"
            subtitle="Р С›РЎвЂљР С”РЎР‚РЎвЂ№Р Р†Р В°Р в„– РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С•РЎР‚ Р С‘ Р Т‘Р С•Р С—Р С•Р В»Р Р…РЎРЏР в„– РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂљРЎС“РЎР‚РЎС“ Р С”РЎС“РЎР‚РЎРѓР В°."
          />
          <ActionMiniCard
            theme={theme}
            title="Р РЋР ВµРЎРѓРЎРѓР С‘Р С‘"
            subtitle="Р вЂ”Р В°Р С—РЎС“РЎРѓР С”Р В°Р в„– Р В·Р В°Р Р…РЎРЏРЎвЂљР С‘Р Вµ Р С‘ Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР В°Р в„– РЎС“РЎвЂЎР ВµР В±Р Р…РЎвЂ№Р Вµ Р В±Р В»Р С•Р С”Р С‘."
          />
          <ActionMiniCard
            theme={theme}
            title="Р СћР ВµРЎРѓРЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ"
            subtitle="Р вЂќР ВµР В»Р В°Р в„– Р В±РЎвЂ№РЎРѓРЎвЂљРЎР‚РЎвЂ№Р Вµ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С•РЎвЂЎР Р…РЎвЂ№Р Вµ РЎвЂљР ВµРЎРѓРЎвЂљРЎвЂ№ Р С—РЎР‚РЎРЏР СР С• Р Р…Р В° Р В·Р В°Р Р…РЎРЏРЎвЂљР С‘Р С‘."
          />
          <ActionMiniCard
            theme={theme}
            title="Р ВРЎвЂљР С•Р С–Р С‘"
            subtitle="Р РЋР СР С•РЎвЂљРЎР‚Р С‘, Р С”РЎвЂљР С• РЎС“Р В¶Р Вµ РЎРѓР Т‘Р В°Р В» Р В·Р В°Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С‘ Р С”Р В°Р С” Р С—РЎР‚Р С•РЎв‚¬Р В»Р С‘ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р С‘."
          />
        </SectionCard>
      </View>

      <SectionCard
        theme={theme}
        title="Р вЂєР ВµР С”РЎвЂ Р С‘Р С‘ Р С—РЎР‚Р ВµР С—Р С•Р Т‘Р В°Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ"
        subtitle="Р вЂ”Р В°Р С—РЎС“РЎРѓР С” РЎРѓР ВµРЎРѓРЎРѓР С‘Р С‘, РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С•РЎР‚ Р С‘ РЎС“Р С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С‘Р Вµ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР В°Р СР С‘ РІР‚вЂќ Р С—РЎР‚РЎРЏР СР С• Р С‘Р В· Р С”Р В°РЎР‚РЎвЂљР С•РЎвЂЎР С”Р С‘ Р В»Р ВµР С”РЎвЂ Р С‘Р С‘."
      >
        {lectures.length === 0 ? (
          <Text style={styles.emptyText}>Р СџР С•Р С”Р В° Р Р…Р ВµРЎвЂљ Р В»Р ВµР С”РЎвЂ Р С‘Р в„–. Р РЋР С•Р В·Р Т‘Р В°Р в„– Р С—Р ВµРЎР‚Р Р†РЎС“РЎР‹ Р В»Р ВµР С”РЎвЂ Р С‘РЎР‹ Р Р†РЎвЂ№РЎв‚¬Р Вµ.</Text>
        ) : (
          lectures.map((lecture) => {
            const isExpanded = expandedLectureId === lecture.id;
            const questions = getQuestions(lectureDetailsById[lecture.id]);
            const videoValue = (lecture as LectureItem & { videoUrl?: string }).videoUrl ?? "";

            return (
              <View key={lecture.id} style={[styles.lectureCard, isExpanded ? styles.lectureCardExpanded : null]}>
                <View style={styles.lectureHeader}>
                  <View style={styles.lectureHeaderText}>
                    <View style={styles.pillRow}>
                      <TinyPill theme={theme} label={fixText(lecture.subject)} tone="primary" />
                      <TinyPill theme={theme} label={fixText(lecture.level)} tone="neutral" />
                      {lecture.id.startsWith("draft-lecture-") ? (
                        <TinyPill theme={theme} label="Р В§Р ВµРЎР‚Р Р…Р С•Р Р†Р С‘Р С”" tone="success" />
                      ) : null}
                    </View>

                    <Text style={styles.lectureTitle}>{fixText(lecture.title)}</Text>
                    <Text style={styles.lectureMeta}>
                      {fixText(`${lecture.subject} РІР‚Сћ ${lecture.semester} РІР‚Сћ ${lecture.level}`)}
                    </Text>
                    <Text style={styles.lectureDescription}>{fixText(lecture.description)}</Text>
                  </View>
                </View>

                <View style={styles.metaPanel}>
                  <MetaItem theme={theme} label="Р вЂР В»Р С•Р С”Р С•Р Р†" value={String(lecture.blocks.length)} />
                  <MetaItem theme={theme} label="Р вЂ™Р С•Р С—РЎР‚Р С•РЎРѓР С•Р Р†" value={String(questions.length)} />
                  <MetaItem theme={theme} label="Р вЂќР В»Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С•РЎРѓРЎвЂљРЎРЉ" value={fixText(lecture.estimatedDuration)} />
                </View>

                {videoValue ? (
                  <Text style={styles.videoHint}>{fixText(`Р вЂ™Р С‘Р Т‘Р ВµР С•: ${videoValue}`)}</Text>
                ) : null}

                <View style={styles.actionsRow}>
                  <AppButton
                    label="Р вЂ”Р В°Р С—РЎС“РЎРѓРЎвЂљР С‘РЎвЂљРЎРЉ РЎРѓР ВµРЎРѓРЎРѓР С‘РЎР‹"
                    onPress={() => onOpenManageSession(lecture)}
                    theme={theme}
                    fullWidth={false}
                    style={styles.inlineButton}
                  />
                  <AppButton
                    label={isExpanded ? "Р РЋР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С•РЎР‚" : "Р С›РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С•РЎР‚"}
                    onPress={() => handleToggleEditor(lecture.id)}
                    theme={theme}
                    variant="secondary"
                    fullWidth={false}
                    style={styles.inlineButton}
                  />
                  <AppButton
                    label="Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ Р В»Р ВµР С”РЎвЂ Р С‘РЎР‹"
                    onPress={() => onDeleteLecture(lecture.id)}
                    theme={theme}
                    variant="ghost"
                    fullWidth={false}
                    style={styles.inlineButton}
                  />
                </View>

                {isExpanded ? (
                  <View style={styles.editorShell}>
                    <View style={styles.editorRow}>
                      <SectionCard
                        theme={theme}
                        title="Р СџР В°РЎР‚Р В°Р СР ВµРЎвЂљРЎР‚РЎвЂ№ Р В»Р ВµР С”РЎвЂ Р С‘Р С‘"
                        subtitle="Р СџРЎР‚Р ВµР Т‘Р СР ВµРЎвЂљ, РЎРѓР ВµР СР ВµРЎРѓРЎвЂљРЎР‚, РЎС“РЎР‚Р С•Р Р†Р ВµР Р…РЎРЉ Р С‘ Р Р†Р С‘Р Т‘Р ВµР С•Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»."
                        style={styles.editorCard}
                      >
                        <AppInput
                          label="Р СџРЎР‚Р ВµР Т‘Р СР ВµРЎвЂљ"
                          theme={theme}
                          value={metaSubject}
                          onChangeText={setMetaSubject}
                          placeholder="Р СџРЎР‚Р ВµР Т‘Р СР ВµРЎвЂљ"
                        />

                        <AppInput
                          label="Р РЋР ВµР СР ВµРЎРѓРЎвЂљРЎР‚"
                          theme={theme}
                          value={metaSemester}
                          onChangeText={setMetaSemester}
                          placeholder="Р РЋР ВµР СР ВµРЎРѓРЎвЂљРЎР‚"
                        />

                        <AppInput
                          label="Р Р€РЎР‚Р С•Р Р†Р ВµР Р…РЎРЉ"
                          theme={theme}
                          value={metaLevel}
                          onChangeText={setMetaLevel}
                          placeholder="Р Р€РЎР‚Р С•Р Р†Р ВµР Р…РЎРЉ"
                        />

                        <AppInput
                          label="Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р Р…Р В° Р Р†Р С‘Р Т‘Р ВµР С•"
                          theme={theme}
                          value={metaVideoUrl}
                          onChangeText={setMetaVideoUrl}
                          placeholder="https://..."
                          autoCapitalize="none"
                          autoCorrect={false}
                        />

                        {metaSuccess ? <Text style={styles.successText}>{metaSuccess}</Text> : null}

                        <AppButton
                          label="Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ Р С—Р В°РЎР‚Р В°Р СР ВµРЎвЂљРЎР‚РЎвЂ№"
                          onPress={handleSaveMeta}
                          theme={theme}
                          style={styles.actionTop}
                        />
                      </SectionCard>

                      <SectionCard
                        theme={theme}
                        title="Р СћР ВµР С•РЎР‚Р С‘РЎРЏ Р В»Р ВµР С”РЎвЂ Р С‘Р С‘"
                        subtitle="Р СџРЎР‚Р ВµР Т‘Р С—РЎР‚Р С•РЎРѓР СР С•РЎвЂљРЎР‚ Р С•РЎРѓР Р…Р С•Р Р†Р Р…Р С•Р С–Р С• Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»Р В°."
                        style={styles.editorCard}
                      >
                        <Text style={styles.theoryPreview}>
                          {fixText(expandedTheory || "Р СћР ВµР С•РЎР‚Р С‘РЎРЏ Р С—Р С•Р С”Р В° Р Р…Р Вµ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р В°.")}
                        </Text>
                      </SectionCard>
                    </View>

                    <View style={styles.editorRow}>
                      <SectionCard
                        theme={theme}
                        title="Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ"
                        subtitle="Р РЋР С•Р В±Р ВµРЎР‚Р С‘ Р Р…Р С•Р Р†РЎвЂ№Р в„– Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ Р Т‘Р В»РЎРЏ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С•РЎвЂЎР Р…Р С•Р С–Р С• Р В±Р В»Р С•Р С”Р В°."
                        style={styles.editorCard}
                      >
                        <AppInput
                          label="Р СћР ВµР С”РЎРѓРЎвЂљ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР В°"
                          theme={theme}
                          value={questionText}
                          onChangeText={setQuestionText}
                          placeholder="Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ"
                          multiline
                          numberOfLines={3}
                        />

                        <View style={styles.formRow}>
                          <View style={styles.halfCol}>
                            <AppInput
                              label="Р вЂ™Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ A"
                              theme={theme}
                              value={optionA}
                              onChangeText={setOptionA}
                              placeholder="Р СџР ВµРЎР‚Р Р†РЎвЂ№Р в„– Р Р†Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ"
                            />
                          </View>
                          <View style={styles.halfCol}>
                            <AppInput
                              label="Р вЂ™Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ B"
                              theme={theme}
                              value={optionB}
                              onChangeText={setOptionB}
                              placeholder="Р вЂ™РЎвЂљР С•РЎР‚Р С•Р в„– Р Р†Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ"
                            />
                          </View>
                        </View>

                        <View style={styles.formRow}>
                          <View style={styles.halfCol}>
                            <AppInput
                              label="Р вЂ™Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ C"
                              theme={theme}
                              value={optionC}
                              onChangeText={setOptionC}
                              placeholder="Р СћРЎР‚Р ВµРЎвЂљР С‘Р в„– Р Р†Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ"
                            />
                          </View>
                          <View style={styles.halfCol}>
                            <AppInput
                              label="Р вЂ™Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ D"
                              theme={theme}
                              value={optionD}
                              onChangeText={setOptionD}
                              placeholder="Р В§Р ВµРЎвЂљР Р†РЎвЂРЎР‚РЎвЂљРЎвЂ№Р в„– Р Р†Р В°РЎР‚Р С‘Р В°Р Р…РЎвЂљ"
                            />
                          </View>
                        </View>

                        <Text style={styles.sectionLabel}>Р СџРЎР‚Р В°Р Р†Р С‘Р В»РЎРЉР Р…РЎвЂ№Р в„– Р С•РЎвЂљР Р†Р ВµРЎвЂљ</Text>
                        <View style={styles.answerRow}>
                          {(["A", "B", "C", "D"] as const).map((key) => {
                            const isActive = correctOptionKey === key;

                            return (
                              <Pressable
                                key={key}
                                onPress={() => setCorrectOptionKey(key)}
                                style={[
                                  styles.answerChip,
                                  {
                                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                                    backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surface
                                  }
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.answerChipText,
                                    { color: isActive ? theme.colors.primary : theme.colors.text }
                                  ]}
                                >
                                  {key}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>

                        <AppInput
                          label="Р СџР С•РЎРЏРЎРѓР Р…Р ВµР Р…Р С‘Р Вµ"
                          theme={theme}
                          value={questionExplanation}
                          onChangeText={setQuestionExplanation}
                          placeholder="Р С™Р С•РЎР‚Р С•РЎвЂљР С”Р С•Р Вµ Р С—Р С•РЎРЏРЎРѓР Р…Р ВµР Р…Р С‘Р Вµ Р С” Р С—РЎР‚Р В°Р Р†Р С‘Р В»РЎРЉР Р…Р С•Р СРЎС“ Р С•РЎвЂљР Р†Р ВµРЎвЂљРЎС“"
                          multiline
                          numberOfLines={3}
                        />

                        {questionError ? <Text style={styles.errorText}>{questionError}</Text> : null}
                        {questionSuccess ? <Text style={styles.successText}>{questionSuccess}</Text> : null}

                        <AppButton
                          label="Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ"
                          onPress={handleAddQuestion}
                          theme={theme}
                          style={styles.actionTop}
                        />
                      </SectionCard>

                      <SectionCard
                        theme={theme}
                        title="Р СћР ВµР С”РЎС“РЎвЂ°Р С‘Р Вµ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓРЎвЂ№"
                        subtitle="Р вЂ™Р С•Р С—РЎР‚Р С•РЎРѓРЎвЂ№ Р Т‘Р В»РЎРЏ РЎРЊРЎвЂљР С•Р в„– Р В»Р ВµР С”РЎвЂ Р С‘Р С‘."
                        style={styles.editorCard}
                      >
                        {expandedQuestions.length === 0 ? (
                          <Text style={styles.emptyText}>Р СџР С•Р С”Р В° Р Р…Р ВµРЎвЂљ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓР С•Р Р†.</Text>
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
                                label="Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ"
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
                    </View>
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
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type InfoBadgeProps = {
  theme: AppTheme;
  label: string;
};

function InfoBadge({ theme, label }: InfoBadgeProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.infoBadge}>
      <Text style={styles.infoBadgeText}>{label}</Text>
    </View>
  );
}

type TinyPillProps = {
  theme: AppTheme;
  label: string;
  tone: "primary" | "neutral" | "success";
};

function TinyPill({ theme, label, tone }: TinyPillProps) {
  const styles = createStyles(theme, 1200);

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
        {label}
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
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaItemLabel}>{label}</Text>
      <Text style={styles.metaItemValue}>{value}</Text>
    </View>
  );
}

type ActionMiniCardProps = {
  theme: AppTheme;
  title: string;
  subtitle: string;
};

function ActionMiniCard({ theme, title, subtitle }: ActionMiniCardProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.actionMiniCard}>
      <Text style={styles.actionMiniTitle}>{title}</Text>
      <Text style={styles.actionMiniSubtitle}>{subtitle}</Text>
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
      flexDirection: isCompact ? "column" : "row",
      borderRadius: theme.radius.xl,
      padding: isPhone ? theme.spacing.lg : theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.lg
    },
    heroMain: {
      flex: 1,
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
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.text
    },
    heroActionRow: {
      flexDirection: "row",
      flexWrap: "wrap"
    },
    heroStats: {
      width: isCompact ? "100%" : 250
    },
    statTile: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm
    },
    statValue: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    statLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary
    },
    dashboardRow: {
      flexDirection: isCompact ? "column" : "row",
      alignItems: "stretch"
    },
    dashboardWide: {
      flex: 1.2,
      marginRight: isCompact ? 0 : theme.spacing.md
    },
    dashboardNarrow: {
      flex: 0.8
    },
    actionMiniCard: {
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm
    },
    actionMiniTitle: {
      fontSize: theme.typography.body,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    actionMiniSubtitle: {
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
      flexBasis: 220,
      minWidth: 0,
      flexGrow: 1,
      paddingHorizontal: 0
    },
    halfCol: {
      flexBasis: 260,
      minWidth: 0,
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
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
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
      fontSize: theme.typography.sectionTitle,
      lineHeight: 26,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    lectureMeta: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    lectureDescription: {
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
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    editorShell: {
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border
    },
    editorRow: {
      flexDirection: isCompact ? "column" : "row"
    },
    editorCard: {
      flex: 1,
      marginRight: isCompact ? 0 : theme.spacing.md
    },
    sectionLabel: {
      fontSize: theme.typography.caption,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm
    },
    theoryPreview: {
      fontSize: theme.typography.body,
      lineHeight: 24,
      color: theme.colors.text,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.input,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md
    },
    answerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.md
    },
    answerChip: {
      minWidth: 56,
      minHeight: 42,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    },
    answerChipText: {
      fontSize: theme.typography.body,
      fontWeight: "700"
    },
    questionCard: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md
    },
    questionTitle: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: theme.spacing.sm
    },
    questionOption: {
      fontSize: theme.typography.body,
      lineHeight: 22,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs
    },
    questionHint: {
      fontSize: theme.typography.caption,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm
    }
  });
}
