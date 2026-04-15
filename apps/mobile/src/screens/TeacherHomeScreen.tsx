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

type TeacherHomeScreenProps = {
  theme: AppTheme;
  user: UserProfile;
  teacherJoinCode: string;
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
  teacherJoinCode,
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
      setCreateError("Р’РІРµРґРёС‚Рµ РЅР°Р·РІР°РЅРёРµ Р»РµРєС†РёРё.");
      return;
    }

    if (!nextDescription) {
      setCreateSuccess("");
      setCreateError("Р’РІРµРґРёС‚Рµ РєСЂР°С‚РєРѕРµ РѕРїРёСЃР°РЅРёРµ.");
      return;
    }

    if (!nextTheory) {
      setCreateSuccess("");
      setCreateError("Р’РІРµРґРёС‚Рµ С‚РµРѕСЂРµС‚РёС‡РµСЃРєРёР№ РјР°С‚РµСЂРёР°Р».");
      return;
    }

    if (!nextSubject || !nextSemester || !nextLevel) {
      setCreateSuccess("");
      setCreateError("Р—Р°РїРѕР»РЅРё РїСЂРµРґРјРµС‚, СЃРµРјРµСЃС‚СЂ Рё СѓСЂРѕРІРµРЅСЊ.");
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
      setCreateError("РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ Р»РµРєС†РёСЋ.");
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
    setCreateSuccess("Р›РµРєС†РёСЏ СЃРѕР·РґР°РЅР°. РўРµРїРµСЂСЊ РјРѕР¶РЅРѕ РѕС‚РєСЂС‹С‚СЊ СЂРµРґР°РєС‚РѕСЂ Рё РґРѕР±Р°РІРёС‚СЊ РІРѕРїСЂРѕСЃС‹.");
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

    setMetaSuccess("РџР°СЂР°РјРµС‚СЂС‹ Р»РµРєС†РёРё РѕР±РЅРѕРІР»РµРЅС‹.");
  }

  function handleAddQuestion() {
    if (!expandedLecture) {
      return;
    }

    if (!questionText.trim()) {
      setQuestionSuccess("");
      setQuestionError("Р’РІРµРґРёС‚Рµ С‚РµРєСЃС‚ РІРѕРїСЂРѕСЃР°.");
      return;
    }

    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setQuestionSuccess("");
      setQuestionError("Р—Р°РїРѕР»РЅРё РІСЃРµ С‡РµС‚С‹СЂРµ РІР°СЂРёР°РЅС‚Р° РѕС‚РІРµС‚Р°.");
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
    setQuestionSuccess("Р’РѕРїСЂРѕСЃ РґРѕР±Р°РІР»РµРЅ.");
  }

  return (
    <Screen theme={theme}>
      <ScreenHeader
        theme={theme}
        title="РљР°Р±РёРЅРµС‚ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ"
        subtitle="РЎРѕР·РґР°РІР°Р№ Р»РµРєС†РёРё, СѓРїСЂР°РІР»СЏР№ РјР°С‚РµСЂРёР°Р»Р°РјРё, РїСЂРѕРІРµСЂРѕС‡РЅС‹РјРё Р±Р»РѕРєР°РјРё Рё Р±С‹СЃС‚СЂС‹РјРё СЃРµСЃСЃРёСЏРјРё."
      />

      <View style={styles.heroCard}>
        <View style={styles.heroMain}>
          <Text style={styles.heroEyebrow}>{fixText("Р Р°Р±РѕС‡РµРµ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРѕ")}</Text>
          <Text style={styles.heroTitle}>{teacherDisplayName}</Text>
          <Text style={styles.heroSubtitle}>
            {fixText("Р’СЃС‘ РІР°Р¶РЅРѕРµ РІ РѕРґРЅРѕРј РјРµСЃС‚Рµ: СЃРѕР·РґР°РЅРёРµ Р»РµРєС†РёР№, СЂРµРґР°РєС‚РѕСЂ РІРѕРїСЂРѕСЃРѕРІ, Р·Р°РїСѓСЃРє С‚РµСЃС‚РѕРІ Рё РїСЂРѕРІРµСЂРєР° СЂРµР·СѓР»СЊС‚Р°С‚РѕРІ.")}
          </Text>

          <View style={styles.infoRow}>
            <InfoBadge theme={theme} label={fixText(`Р›РѕРіРёРЅ: ${user.login}`)} />
            <InfoBadge theme={theme} label={fixText(`Р“СЂСѓРїРїР°: ${user.group}`)} />
            <InfoBadge theme={theme} label={fixText(`РљРѕРґ РєСѓСЂСЃР°: ${teacherJoinCode}`)} />
          </View>

          <View style={styles.heroActionRow}>
            <AppButton
              label="Р’С‹Р№С‚Рё РёР· Р°РєРєР°СѓРЅС‚Р°"
              onPress={onLogout}
              theme={theme}
              variant="secondary"
              fullWidth={false}
              style={styles.inlineButton}
            />
          </View>
        </View>

        <View style={styles.heroStats}>
          <StatTile theme={theme} value={String(lectures.length)} label="Р›РµРєС†РёР№" />
          <StatTile theme={theme} value={String(totalDraftLectures)} label="Р§РµСЂРЅРѕРІРёРєРѕРІ" />
          <StatTile theme={theme} value={String(totalQuestions)} label="Р’РѕРїСЂРѕСЃРѕРІ" />
        </View>
      </View>

      <View style={styles.dashboardRow}>
        <SectionCard
          theme={theme}
          title="РЎРѕР·РґР°С‚СЊ РЅРѕРІСѓСЋ Р»РµРєС†РёСЋ"
          subtitle="РЎРЅР°С‡Р°Р»Р° СЃРѕР·РґР°С‘Рј РѕСЃРЅРѕРІСѓ, РїРѕС‚РѕРј РѕС‚РєСЂС‹РІР°РµРј СЂРµРґР°РєС‚РѕСЂ Рё РЅР°РїРѕР»РЅСЏРµРј РІРѕРїСЂРѕСЃР°РјРё."
          style={styles.dashboardWide}
        >
          <AppInput
            label="РќР°Р·РІР°РЅРёРµ Р»РµРєС†РёРё"
            theme={theme}
            value={title}
            onChangeText={setTitle}
            placeholder="РќР°РїСЂРёРјРµСЂ: РџСЂРѕРёР·РІРѕРґРЅР°СЏ Рё РєР°СЃР°С‚РµР»СЊРЅР°СЏ"
            autoCorrect={false}
          />

          <AppInput
            label="РљСЂР°С‚РєРѕРµ РѕРїРёСЃР°РЅРёРµ"
            theme={theme}
            value={description}
            onChangeText={setDescription}
            placeholder="Рћ С‡С‘Рј СЌС‚Р° Р»РµРєС†РёСЏ"
            multiline
            numberOfLines={3}
          />

          <AppInput
            label="РўРµРѕСЂРµС‚РёС‡РµСЃРєРёР№ РјР°С‚РµСЂРёР°Р»"
            theme={theme}
            value={theory}
            onChangeText={setTheory}
            placeholder="Р’СЃС‚Р°РІСЊ РѕСЃРЅРѕРІРЅРѕР№ С‚РµРєСЃС‚ Р»РµРєС†РёРё"
            multiline
            numberOfLines={8}
          />

          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <AppInput
                label="РџСЂРµРґРјРµС‚"
                theme={theme}
                value={subject}
                onChangeText={setSubject}
                placeholder="РњР°С‚РµРјР°С‚РёС‡РµСЃРєРёР№ Р°РЅР°Р»РёР·"
              />
            </View>

            <View style={styles.formCol}>
              <AppInput
                label="РЎРµРјРµСЃС‚СЂ"
                theme={theme}
                value={semester}
                onChangeText={setSemester}
                placeholder="1 СЃРµРјРµСЃС‚СЂ"
              />
            </View>

            <View style={styles.formCol}>
              <AppInput
                label="РЈСЂРѕРІРµРЅСЊ"
                theme={theme}
                value={level}
                onChangeText={setLevel}
                placeholder="Р‘Р°Р·РѕРІС‹Р№"
              />
            </View>
          </View>

          <AppInput
            label="РЎСЃС‹Р»РєР° РЅР° РІРёРґРµРѕРјР°С‚РµСЂРёР°Р»"
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
            label="РЎРѕР·РґР°С‚СЊ Р»РµРєС†РёСЋ"
            onPress={handleCreateLecture}
            theme={theme}
            style={styles.actionTop}
          />
        </SectionCard>

        <SectionCard
          theme={theme}
          title="Р¤РѕРєСѓСЃ РґРЅСЏ"
          subtitle="Р‘С‹СЃС‚СЂС‹Р№ РґРѕСЃС‚СѓРї Рє РіР»Р°РІРЅС‹Рј РґРµР№СЃС‚РІРёСЏРј РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ."
          style={styles.dashboardNarrow}
        >
          <ActionMiniCard
            theme={theme}
            title="Р›РµРєС†РёРё"
            subtitle="РћС‚РєСЂС‹РІР°Р№ СЂРµРґР°РєС‚РѕСЂ Рё РґРѕРїРѕР»РЅСЏР№ СЃС‚СЂСѓРєС‚СѓСЂСѓ РєСѓСЂСЃР°."
          />
          <ActionMiniCard
            theme={theme}
            title="РЎРµСЃСЃРёРё"
            subtitle="Р—Р°РїСѓСЃРєР°Р№ Р·Р°РЅСЏС‚РёРµ Рё РїРµСЂРµРєР»СЋС‡Р°Р№ СѓС‡РµР±РЅС‹Рµ Р±Р»РѕРєРё."
          />
          <ActionMiniCard
            theme={theme}
            title="РўРµСЃС‚РёСЂРѕРІР°РЅРёРµ"
            subtitle="Р”РµР»Р°Р№ Р±С‹СЃС‚СЂС‹Рµ РїСЂРѕРІРµСЂРѕС‡РЅС‹Рµ С‚РµСЃС‚С‹ РїСЂСЏРјРѕ РЅР° Р·Р°РЅСЏС‚РёРё."
          />
          <ActionMiniCard
            theme={theme}
            title="РС‚РѕРіРё"
            subtitle="РЎРјРѕС‚СЂРё, РєС‚Рѕ СѓР¶Рµ СЃРґР°Р» Р·Р°РґР°РЅРёСЏ Рё РєР°Рє РїСЂРѕС€Р»Рё РїСЂРѕРІРµСЂРєРё."
          />
        </SectionCard>
      </View>

      <SectionCard
        theme={theme}
        title="Р›РµРєС†РёРё РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ"
        subtitle="Р—Р°РїСѓСЃРє СЃРµСЃСЃРёРё, СЂРµРґР°РєС‚РѕСЂ Рё СѓРїСЂР°РІР»РµРЅРёРµ РІРѕРїСЂРѕСЃР°РјРё вЂ” РїСЂСЏРјРѕ РёР· РєР°СЂС‚РѕС‡РєРё Р»РµРєС†РёРё."
      >
        {lectures.length === 0 ? (
          <Text style={styles.emptyText}>{fixText("РџРѕРєР° РЅРµС‚ Р»РµРєС†РёР№. РЎРѕР·РґР°Р№ РїРµСЂРІСѓСЋ Р»РµРєС†РёСЋ РІС‹С€Рµ.")}</Text>
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
                        <TinyPill theme={theme} label="Р§РµСЂРЅРѕРІРёРє" tone="success" />
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
                  <MetaItem theme={theme} label="Р‘Р»РѕРєРѕРІ" value={String(lecture.blocks.length)} />
                  <MetaItem theme={theme} label="Р’РѕРїСЂРѕСЃРѕРІ" value={String(questions.length)} />
                  <MetaItem theme={theme} label="Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ" value={fixText(lecture.estimatedDuration)} />
                </View>

                {videoValue ? (
                  <Text style={styles.videoHint}>{fixText(`Р’РёРґРµРѕ: ${videoValue}`)}</Text>
                ) : null}

                <View style={styles.actionsRow}>
                  <AppButton
                    label="Р—Р°РїСѓСЃС‚РёС‚СЊ СЃРµСЃСЃРёСЋ"
                    onPress={() => onOpenManageSession(lecture)}
                    theme={theme}
                    fullWidth={false}
                    style={styles.inlineButton}
                  />
                  <AppButton
                    label={isExpanded ? "РЎРєСЂС‹С‚СЊ СЂРµРґР°РєС‚РѕСЂ" : "РћС‚РєСЂС‹С‚СЊ СЂРµРґР°РєС‚РѕСЂ"}
                    onPress={() => handleToggleEditor(lecture.id)}
                    theme={theme}
                    variant="secondary"
                    fullWidth={false}
                    style={styles.inlineButton}
                  />
                  <AppButton
                    label="РЈРґР°Р»РёС‚СЊ Р»РµРєС†РёСЋ"
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
                        title="РџР°СЂР°РјРµС‚СЂС‹ Р»РµРєС†РёРё"
                        subtitle="РџСЂРµРґРјРµС‚, СЃРµРјРµСЃС‚СЂ, СѓСЂРѕРІРµРЅСЊ Рё РІРёРґРµРѕРјР°С‚РµСЂРёР°Р»."
                        style={styles.editorCard}
                      >
                        <AppInput
                          label="РџСЂРµРґРјРµС‚"
                          theme={theme}
                          value={metaSubject}
                          onChangeText={setMetaSubject}
                          placeholder="РџСЂРµРґРјРµС‚"
                        />

                        <AppInput
                          label="РЎРµРјРµСЃС‚СЂ"
                          theme={theme}
                          value={metaSemester}
                          onChangeText={setMetaSemester}
                          placeholder="РЎРµРјРµСЃС‚СЂ"
                        />

                        <AppInput
                          label="РЈСЂРѕРІРµРЅСЊ"
                          theme={theme}
                          value={metaLevel}
                          onChangeText={setMetaLevel}
                          placeholder="РЈСЂРѕРІРµРЅСЊ"
                        />

                        <AppInput
                          label="РЎСЃС‹Р»РєР° РЅР° РІРёРґРµРѕ"
                          theme={theme}
                          value={metaVideoUrl}
                          onChangeText={setMetaVideoUrl}
                          placeholder="https://..."
                          autoCapitalize="none"
                          autoCorrect={false}
                        />

                        {metaSuccess ? <Text style={styles.successText}>{fixText(metaSuccess)}</Text> : null}

                        <AppButton
                          label="РЎРѕС…СЂР°РЅРёС‚СЊ РїР°СЂР°РјРµС‚СЂС‹"
                          onPress={handleSaveMeta}
                          theme={theme}
                          style={styles.actionTop}
                        />
                      </SectionCard>

                      <SectionCard
                        theme={theme}
                        title="РўРµРѕСЂРёСЏ Р»РµРєС†РёРё"
                        subtitle="РџСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ РѕСЃРЅРѕРІРЅРѕРіРѕ РјР°С‚РµСЂРёР°Р»Р°."
                        style={styles.editorCard}
                      >
                        <Text style={styles.theoryPreview}>
                          {fixText(expandedTheory || "РўРµРѕСЂРёСЏ РїРѕРєР° РЅРµ РґРѕР±Р°РІР»РµРЅР°.")}
                        </Text>
                      </SectionCard>
                    </View>

                    <View style={styles.editorRow}>
                      <SectionCard
                        theme={theme}
                        title="Р”РѕР±Р°РІРёС‚СЊ РІРѕРїСЂРѕСЃ"
                        subtitle="РЎРѕР±РµСЂРё РЅРѕРІС‹Р№ РІРѕРїСЂРѕСЃ РґР»СЏ РїСЂРѕРІРµСЂРѕС‡РЅРѕРіРѕ Р±Р»РѕРєР°."
                        style={styles.editorCard}
                      >
                        <AppInput
                          label="РўРµРєСЃС‚ РІРѕРїСЂРѕСЃР°"
                          theme={theme}
                          value={questionText}
                          onChangeText={setQuestionText}
                          placeholder="Р’РІРµРґРёС‚Рµ РІРѕРїСЂРѕСЃ"
                          multiline
                          numberOfLines={3}
                        />

                        <View style={styles.formRow}>
                          <View style={styles.halfCol}>
                            <AppInput
                              label="Р’Р°СЂРёР°РЅС‚ A"
                              theme={theme}
                              value={optionA}
                              onChangeText={setOptionA}
                              placeholder="РџРµСЂРІС‹Р№ РІР°СЂРёР°РЅС‚"
                            />
                          </View>
                          <View style={styles.halfCol}>
                            <AppInput
                              label="Р’Р°СЂРёР°РЅС‚ B"
                              theme={theme}
                              value={optionB}
                              onChangeText={setOptionB}
                              placeholder="Р’С‚РѕСЂРѕР№ РІР°СЂРёР°РЅС‚"
                            />
                          </View>
                        </View>

                        <View style={styles.formRow}>
                          <View style={styles.halfCol}>
                            <AppInput
                              label="Р’Р°СЂРёР°РЅС‚ C"
                              theme={theme}
                              value={optionC}
                              onChangeText={setOptionC}
                              placeholder="РўСЂРµС‚РёР№ РІР°СЂРёР°РЅС‚"
                            />
                          </View>
                          <View style={styles.halfCol}>
                            <AppInput
                              label="Р’Р°СЂРёР°РЅС‚ D"
                              theme={theme}
                              value={optionD}
                              onChangeText={setOptionD}
                              placeholder="Р§РµС‚РІС‘СЂС‚С‹Р№ РІР°СЂРёР°РЅС‚"
                            />
                          </View>
                        </View>

                        <Text style={styles.sectionLabel}>{fixText("РџСЂР°РІРёР»СЊРЅС‹Р№ РѕС‚РІРµС‚")}</Text>
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
                          label="РџРѕСЏСЃРЅРµРЅРёРµ"
                          theme={theme}
                          value={questionExplanation}
                          onChangeText={setQuestionExplanation}
                          placeholder="РљРѕСЂРѕС‚РєРѕРµ РїРѕСЏСЃРЅРµРЅРёРµ Рє РїСЂР°РІРёР»СЊРЅРѕРјСѓ РѕС‚РІРµС‚Сѓ"
                          multiline
                          numberOfLines={3}
                        />

                        {questionError ? <Text style={styles.errorText}>{fixText(questionError)}</Text> : null}
                        {questionSuccess ? <Text style={styles.successText}>{fixText(questionSuccess)}</Text> : null}

                        <AppButton
                          label="Р”РѕР±Р°РІРёС‚СЊ РІРѕРїСЂРѕСЃ"
                          onPress={handleAddQuestion}
                          theme={theme}
                          style={styles.actionTop}
                        />
                      </SectionCard>

                      <SectionCard
                        theme={theme}
                        title="РўРµРєСѓС‰РёРµ РІРѕРїСЂРѕСЃС‹"
                        subtitle="Р’РѕРїСЂРѕСЃС‹ РґР»СЏ СЌС‚РѕР№ Р»РµРєС†РёРё."
                        style={styles.editorCard}
                      >
                        {expandedQuestions.length === 0 ? (
                          <Text style={styles.emptyText}>{fixText("РџРѕРєР° РЅРµС‚ РІРѕРїСЂРѕСЃРѕРІ.")}</Text>
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
                                label="РЈРґР°Р»РёС‚СЊ РІРѕРїСЂРѕСЃ"
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
  const styles = createStyles(theme, 1200);

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
  const styles = createStyles(theme, 1200);

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
};

function ActionMiniCard({ theme, title, subtitle }: ActionMiniCardProps) {
  const styles = createStyles(theme, 1200);

  return (
    <View style={styles.actionMiniCard}>
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

