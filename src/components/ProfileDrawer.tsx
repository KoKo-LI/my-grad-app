"use client";

import { ArrowLeft, Check, GearSix, GraduationCap, Moon, Sun, Trash } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import type {
  AcademicRecord,
  AcademicSubjectScore,
  DegreeTarget,
  StandardizedTestType,
  StudentProfile,
} from "@/types";
import {
  apSubjectOptions,
  clearLocalProfileData,
  createProfileFromPreset,
  emptyProfile,
  graduateTests,
  graduateStageOptions,
  ibSubjectOptions,
  languageTests,
  majorOptions,
  clampNumericValue,
  regionOptions,
  profilePresets,
  sanitizeNumericValue,
  sanitizePlainText,
  sanitizePositiveScore,
  saveProfile,
  testOptions,
  undergraduateTests,
  undergraduateStageOptions,
} from "@/utils/profileStorage";

type DrawerTab = "profile" | "settings";
type ThemeMode = "light" | "dark";

interface ProfileDrawerProps {
  onClose: () => void;
  onSaved: (profile: StudentProfile) => void;
  onThemeChange: (theme: ThemeMode) => void;
  open: boolean;
  profile: StudentProfile | null;
  theme: ThemeMode;
}

function ProfileField({
  helper,
  label,
  maxLength = 5,
  maxValue,
  disallowZero = false,
  placeholder,
  value,
  onChange,
}: {
  helper?: string;
  disallowZero?: boolean;
  label: string;
  maxLength?: number;
  maxValue?: number;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {helper && <span className="text-xs font-normal text-slate-400">{helper}</span>}
      </span>
      <input
        className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3.5 text-sm text-slate-900 shadow-inner shadow-slate-950/[0.03] outline-none transition-all placeholder:text-slate-400 hover:border-violet-400/50 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-black/20 dark:hover:border-violet-500/40 dark:focus:border-violet-500/60 dark:text-white"
        inputMode="decimal"
        max={maxValue}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(
            maxValue === undefined
              ? sanitizeNumericValue(event.target.value, maxLength)
              : disallowZero
                ? sanitizePositiveScore(event.target.value, maxValue, maxLength)
                : clampNumericValue(event.target.value, maxValue, maxLength),
          )
        }
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function OptionalTextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        <span className="text-xs font-normal text-slate-400">选填</span>
      </span>
      <input
        className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3.5 text-sm text-slate-900 shadow-inner shadow-slate-950/[0.03] outline-none transition-all placeholder:text-slate-400 hover:border-violet-400/50 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-black/20 dark:hover:border-violet-500/40 dark:focus:border-violet-500/60 dark:text-white"
        maxLength={120}
        onChange={(event) => onChange(sanitizePlainText(event.target.value, 120))}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function SelectionChip({
  isSelected,
  label,
  onClick,
}: {
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${
        isSelected
          ? "border-violet-500/50 bg-violet-600 text-white shadow-sm shadow-violet-600/20 dark:border-violet-500/50 dark:bg-violet-500/80"
          : "border-slate-200/80 bg-white/80 text-slate-600 hover:border-violet-400/50 hover:bg-violet-50/60 dark:border-white/10 dark:bg-zinc-900/50 dark:text-slate-300 dark:hover:border-violet-500/40"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className={`flex size-4 items-center justify-center rounded-full ${isSelected ? "bg-white/20" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
        {isSelected ? <Check aria-hidden="true" size={12} weight="bold" /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      {label}
    </button>
  );
}

function AcademicRecordFields({
  academicRecord,
  degreeTarget,
  onCompetitionAdd,
  onCompetitionRemove,
  onScalarChange,
  onIbTotalChange,
  onSubjectAdd,
  onSubjectChange,
  onSubjectRemove,
}: {
  academicRecord: AcademicRecord;
  degreeTarget: DegreeTarget;
  onCompetitionAdd: (award: string) => void;
  onCompetitionRemove: (index: number) => void;
  onScalarChange: (field: "paperCount" | "researchProjectCount" | "academicAwardCount", value: string) => void;
  onIbTotalChange: (value: string) => void;
  onSubjectAdd: (field: "apSubjects" | "ibSubjects", subject: string) => void;
  onSubjectChange: (field: "apSubjects" | "ibSubjects", index: number, value: AcademicSubjectScore) => void;
  onSubjectRemove: (field: "apSubjects" | "ibSubjects", index: number) => void;
}) {
  if (degreeTarget === "undergraduate") {
    return (
      <div className="space-y-5">
        <SubjectScoreBranch
          label="AP 科目成绩"
          onAdd={(subject) => onSubjectAdd("apSubjects", subject)}
          onChange={(index, value) => onSubjectChange("apSubjects", index, value)}
          onRemove={(index) => onSubjectRemove("apSubjects", index)}
          maximumScore={5}
          scoreHelper="1–5 分"
          subjectOptions={apSubjectOptions}
          subjects={academicRecord.apSubjects}
        />
        <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
          <ProfileField disallowZero helper="24–45 分" label="IB 总分" maxValue={45} onChange={onIbTotalChange} placeholder="例如：42" value={academicRecord.ibTotalScore} />
          <div className="mt-5">
            <SubjectScoreBranch
              label="IB 科目成绩"
              onAdd={(subject) => onSubjectAdd("ibSubjects", subject)}
              onChange={(index, value) => onSubjectChange("ibSubjects", index, value)}
              onRemove={(index) => onSubjectRemove("ibSubjects", index)}
              maximumScore={7}
              scoreHelper="1–7 分"
              subjectOptions={ibSubjectOptions}
              subjects={academicRecord.ibSubjects}
            />
          </div>
        </div>
        <CompetitionAwards
          awards={academicRecord.competitionAwards}
          onAdd={onCompetitionAdd}
          onRemove={onCompetitionRemove}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <ProfileField label="论文数量" onChange={(value) => onScalarChange("paperCount", value)} placeholder="例如：2" value={academicRecord.paperCount} />
        <ProfileField label="科研项目" onChange={(value) => onScalarChange("researchProjectCount", value)} placeholder="例如：3" value={academicRecord.researchProjectCount} />
        <ProfileField label="学术奖项" onChange={(value) => onScalarChange("academicAwardCount", value)} placeholder="例如：1" value={academicRecord.academicAwardCount} />
      </div>
      <CompetitionAwards
        awards={academicRecord.competitionAwards}
        onAdd={onCompetitionAdd}
        onRemove={onCompetitionRemove}
      />
    </div>
  );
}

function CompetitionAwards({
  awards,
  onAdd,
  onRemove,
}: {
  awards: string[];
  onAdd: (award: string) => void;
  onRemove: (index: number) => void;
}) {
  const [draftAward, setDraftAward] = useState("");
  const canAdd = Boolean(draftAward.trim()) && awards.length < 12;

  return (
    <section className="border-t border-slate-200 pt-5 dark:border-slate-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">竞赛与获奖</h4>
          <p className="mt-1 text-xs text-slate-500">选填，例如：AMC 12 AIME 晋级、科研竞赛一等奖。</p>
        </div>
        <span className="rounded-full border border-violet-200/60 bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">{awards.length}/12</span>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          aria-label="竞赛与获奖"
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm text-slate-900 shadow-inner shadow-slate-950/[0.03] outline-none transition-all placeholder:text-slate-400 hover:border-violet-400/50 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-black/20 dark:hover:border-violet-500/40 dark:focus:border-violet-500/60 dark:text-white"
          maxLength={80}
          onChange={(event) => setDraftAward(sanitizePlainText(event.target.value, 80))}
          placeholder="输入竞赛或奖项名称"
          value={draftAward}
        />
        <button
          className="h-10 shrink-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-xs font-bold text-violet-700 transition-all hover:border-violet-400/50 hover:bg-violet-50/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900/50 dark:text-violet-300 dark:hover:border-violet-500/40"
          disabled={!canAdd}
          onClick={() => {
            if (!canAdd) return;
            onAdd(draftAward.trim());
            setDraftAward("");
          }}
          type="button"
        >
          + 添加
        </button>
      </div>
      {awards.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {awards.map((award, index) => (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 py-1 pl-2.5 pr-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-zinc-900/50 dark:text-slate-200" key={award}>
              {award}
              <button aria-label={`删除竞赛奖项 ${award}`} className="flex size-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" onClick={() => onRemove(index)} type="button">×</button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function SubjectScoreBranch({
  label,
  maximumScore,
  onAdd,
  onChange,
  onRemove,
  scoreHelper,
  subjectOptions,
  subjects,
}: {
  label: string;
  maximumScore: number;
  onAdd: (subject: string) => void;
  onChange: (index: number, value: AcademicSubjectScore) => void;
  onRemove: (index: number) => void;
  scoreHelper: string;
  subjectOptions: readonly string[];
  subjects: AcademicSubjectScore[];
}) {
  const [newSubject, setNewSubject] = useState("");
  const selectedSubjects = new Set(subjects.map((item) => item.subject));
  const availableSubjects = subjectOptions.filter((subject) => !selectedSubjects.has(subject));

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div><h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</h4><p className="mt-1 text-xs text-slate-500">按科目录入，每门课程可单独修改。</p></div>
        <span className="rounded-full border border-violet-200/60 bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">{subjects.length} 门</span>
      </div>
      <div className="mt-3 flex gap-2">
        <select aria-label={`选择${label}`} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm text-slate-800 shadow-inner shadow-slate-950/[0.03] outline-none transition-all hover:border-violet-400/50 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-black/20 dark:hover:border-violet-500/40 dark:focus:border-violet-500/60 dark:text-white" disabled={availableSubjects.length === 0} onChange={(event) => setNewSubject(event.target.value)} value={newSubject}>
          <option value="">选择科目</option>
          {availableSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
        </select>
        <button className="h-10 shrink-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-xs font-bold text-violet-700 transition-all hover:border-violet-400/50 hover:bg-violet-50/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900/50 dark:text-violet-300 dark:hover:border-violet-500/40" disabled={!newSubject} onClick={() => { onAdd(newSubject); setNewSubject(""); }} type="button">+ 添加</button>
      </div>
      {subjects.length > 0 && <div className="mt-3 space-y-3">
        {subjects.map((subjectScore, index) => (
          <div className="grid grid-cols-[minmax(0,1fr)_100px_auto] gap-2" key={subjectScore.subject}>
            <select aria-label={`${label} ${index + 1}`} className="min-w-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm text-slate-800 shadow-inner shadow-slate-950/[0.03] outline-none transition-all hover:border-violet-400/50 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-black/20 dark:hover:border-violet-500/40 dark:focus:border-violet-500/60 dark:text-white" onChange={(event) => onChange(index, { ...subjectScore, subject: event.target.value })} value={subjectScore.subject}>
              {subjectOptions.map((subject) => <option disabled={subject !== subjectScore.subject && selectedSubjects.has(subject)} key={subject} value={subject}>{subject}</option>)}
            </select>
            <input aria-label={`${label} 分数 ${index + 1}`} className="h-10 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm text-slate-900 shadow-inner shadow-slate-950/[0.03] outline-none transition-all hover:border-violet-400/50 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-black/20 dark:hover:border-violet-500/40 dark:focus:border-violet-500/60 dark:text-white" inputMode="numeric" max={maximumScore} maxLength={1} onChange={(event) => onChange(index, { ...subjectScore, score: sanitizePositiveScore(event.target.value, maximumScore, 1) })} placeholder={scoreHelper} value={subjectScore.score} />
            <button aria-label={`删除${label} ${subjectScore.subject}`} className="rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30" onClick={() => onRemove(index)} type="button">×</button>
          </div>
        ))}
      </div>}
    </section>
  );
}

function ProfileForm({ initialProfile, onSaved }: { initialProfile: StudentProfile; onSaved: (profile: StudentProfile) => void }) {
  const [draft, setDraft] = useState<StudentProfile>(initialProfile);
  const [validationError, setValidationError] = useState<string | null>(null);
  const targetTests = draft.degreeTarget === "undergraduate" ? undergraduateTests : graduateTests;
  const stageOptions = draft.degreeTarget === "undergraduate" ? undergraduateStageOptions : graduateStageOptions;
  const standardizedTestHint =
    draft.degreeTarget === "undergraduate" ? "SAT / ACT / AP / IB 成绩" : "GRE / GMAT 成绩";
  const selectedTests = new Map(draft.standardizedTests.map((test) => [test.test, test.score]));

  const updateDraft = (updater: (profile: StudentProfile) => StudentProfile) => {
    setDraft((currentProfile) => updater(currentProfile));
  };

  const applyPreset = (presetId: (typeof profilePresets)[number]["id"]) => {
    const presetProfile = createProfileFromPreset(presetId);
    setDraft(presetProfile);
    setValidationError(null);
    onSaved(saveProfile(presetProfile));
  };

  const updateAcademicRecord = (
    field: "paperCount" | "researchProjectCount" | "academicAwardCount" | "ibTotalScore",
    value: string,
  ) => {
    updateDraft((currentProfile) => ({
      ...currentProfile,
      academicRecord: { ...currentProfile.academicRecord, [field]: value },
    }));
  };

  const addAcademicSubject = (field: "apSubjects" | "ibSubjects", subject: string) => {
    updateDraft((currentProfile) => ({
      ...currentProfile,
      academicRecord: {
        ...currentProfile.academicRecord,
        [field]: [...currentProfile.academicRecord[field], { subject, score: "" }],
      },
    }));
  };

  const updateAcademicSubject = (
    field: "apSubjects" | "ibSubjects",
    index: number,
    value: AcademicSubjectScore,
  ) => {
    updateDraft((currentProfile) => ({
      ...currentProfile,
      academicRecord: {
        ...currentProfile.academicRecord,
        [field]: currentProfile.academicRecord[field].map((subjectScore, subjectIndex) =>
          subjectIndex === index ? value : subjectScore,
        ),
      },
    }));
  };

  const removeAcademicSubject = (field: "apSubjects" | "ibSubjects", index: number) => {
    updateDraft((currentProfile) => ({
      ...currentProfile,
      academicRecord: {
        ...currentProfile.academicRecord,
        [field]: currentProfile.academicRecord[field].filter((_, subjectIndex) => subjectIndex !== index),
      },
    }));
  };

  const addCompetitionAward = (award: string) => {
    updateDraft((currentProfile) => ({
      ...currentProfile,
      academicRecord: {
        ...currentProfile.academicRecord,
        competitionAwards: [...currentProfile.academicRecord.competitionAwards, award],
      },
    }));
  };

  const removeCompetitionAward = (index: number) => {
    updateDraft((currentProfile) => ({
      ...currentProfile,
      academicRecord: {
        ...currentProfile.academicRecord,
        competitionAwards: currentProfile.academicRecord.competitionAwards.filter(
          (_, awardIndex) => awardIndex !== index,
        ),
      },
    }));
  };

  const toggleTest = (testType: StandardizedTestType) => {
    updateDraft((currentProfile) => {
      const hasTest = currentProfile.standardizedTests.some((test) => test.test === testType);

      return {
        ...currentProfile,
        standardizedTests: hasTest
          ? currentProfile.standardizedTests.filter((test) => test.test !== testType)
          : [...currentProfile.standardizedTests, { test: testType, score: "" }],
      };
    });
  };

  const updateTestScore = (testType: StandardizedTestType, value: string) => {
    const maxLength = testType === "IELTS" ? 3 : 5;
    updateDraft((currentProfile) => ({
      ...currentProfile,
      standardizedTests: currentProfile.standardizedTests.map((test) =>
        test.test === testType
          ? { ...test, score: clampNumericValue(value, testOptions[testType].max, maxLength) }
          : test,
      ),
    }));
  };

  const toggleRegion = (region: string) => {
    updateDraft((currentProfile) => ({
      ...currentProfile,
      targetRegions: currentProfile.targetRegions.includes(region)
        ? currentProfile.targetRegions.filter((item) => item !== region)
        : [...currentProfile.targetRegions, region],
    }));
  };

  const updateDegreeTarget = (degreeTarget: DegreeTarget) => {
    updateDraft((currentProfile) => ({
      ...currentProfile,
      degreeTarget,
      currentStage: (degreeTarget === "undergraduate"
        ? (undergraduateStageOptions as readonly string[])
        : (graduateStageOptions as readonly string[])
      ).includes(currentProfile.currentStage)
        ? currentProfile.currentStage
        : "",
      standardizedTests: currentProfile.standardizedTests.filter(
        (test) =>
          languageTests.includes(test.test) ||
          (degreeTarget === "undergraduate"
            ? undergraduateTests.includes(test.test)
            : graduateTests.includes(test.test)),
      ),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const hasCompletedApScore = draft.academicRecord.apSubjects.some((subjectScore) => {
      const score = Number(subjectScore.score);
      return Number.isFinite(score) && score >= 1 && score <= 5;
    });
    const ibTotalScore = Number(draft.academicRecord.ibTotalScore);
    const hasCompletedIbScore = Number.isFinite(ibTotalScore) && ibTotalScore >= 24 && ibTotalScore <= 45;

    if (draft.degreeTarget === "undergraduate" && !hasCompletedApScore && !hasCompletedIbScore) {
      setValidationError("申请本科时，请完成 AP 至少一门科目成绩或填写 IB 总分；两者任选其一即可。");
      return;
    }

    setValidationError(null);
    onSaved(saveProfile(draft));
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-violet-400/50 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-2xl dark:hover:border-violet-500/40">
        <p className="text-xs font-bold tracking-[0.14em] text-violet-700 dark:text-violet-300">QUICK PRESETS</p>
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">快速建立申请基准</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">选择后将立即保存背景并返回 Dashboard，你仍可随时修改。</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {profilePresets.map((preset) => (
            <button
              className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-left text-xs font-semibold text-violet-800 shadow-sm backdrop-blur-xl transition-all hover:border-violet-500/50 hover:bg-violet-50/60 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:text-violet-200 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/10 dark:hover:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              type="button"
            >
              <span className="block">{preset.label}</span>
              <span className="mt-0.5 block text-[11px] font-normal text-slate-500 dark:text-slate-400">{preset.description}</span>
            </button>
          ))}
        </div>
      </section>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">申请目标</legend>
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800/40">
          {([
            ["undergraduate", "申请本科"],
            ["graduate", "申请研究生"],
          ] as const).map(([target, label]) => (
            <button
              aria-pressed={draft.degreeTarget === target}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                draft.degreeTarget === target
                  ? "bg-white/80 text-violet-700 shadow-sm backdrop-blur-xl dark:bg-zinc-900/50 dark:text-violet-200"
                  : "text-slate-500 hover:text-violet-700 dark:text-slate-400 dark:hover:text-violet-200"
              }`}
              key={target}
              onClick={() => updateDegreeTarget(target)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">当前阶段</span>
          <select
            aria-label="当前阶段"
            className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3.5 text-sm text-slate-900 shadow-inner shadow-slate-950/[0.03] outline-none transition-all hover:border-violet-400/50 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-black/20 dark:hover:border-violet-500/40 dark:focus:border-violet-500/60 dark:text-white"
            onChange={(event) => updateDraft((profile) => ({ ...profile, currentStage: event.target.value }))}
            value={draft.currentStage}
          >
            <option value="">请选择当前阶段</option>
            {stageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </label>
        <OptionalTextField label="当前就读院校" onChange={(value) => updateDraft((profile) => ({ ...profile, currentSchool: value }))} placeholder="例如：北京大学（选填）" value={draft.currentSchool} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileField disallowZero helper="成绩" label="GPA" maxValue={Number(draft.gpaMax) || 4} onChange={(value) => updateDraft((profile) => ({ ...profile, gpa: value }))} placeholder="例如：3.8" value={draft.gpa} />
        <ProfileField disallowZero helper="可修改" label="GPA 满分" maxLength={5} maxValue={100} onChange={(value) => updateDraft((profile) => ({ ...profile, gpaMax: value, gpa: value ? clampNumericValue(profile.gpa, Number(value)) : profile.gpa }))} placeholder="例如：4.0" value={draft.gpaMax} />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">目标专业</span>
        <select
          aria-label="目标专业"
          className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3.5 text-sm text-slate-900 shadow-inner shadow-slate-950/[0.03] outline-none transition-all hover:border-violet-400/50 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-black/20 dark:hover:border-violet-500/40 dark:focus:border-violet-500/60 dark:text-white"
          onChange={(event) => updateDraft((profile) => ({ ...profile, targetMajor: event.target.value }))}
          value={draft.targetMajor}
        >
          <option value="">请选择目标专业</option>
          {majorOptions.map((major) => <option key={major} value={major}>{major}</option>)}
        </select>
      </label>

      <fieldset className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-violet-400/50 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-2xl dark:hover:border-violet-500/40">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-100">考试成绩</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">先选择考试类型，再填写对应分数。</p>
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-slate-400">LANGUAGE</p>
            <div className="flex flex-wrap gap-2">
              {languageTests.map((test) => <SelectionChip isSelected={selectedTests.has(test)} key={test} label={test} onClick={() => toggleTest(test)} />)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-slate-400">{standardizedTestHint}</p>
            <div className="flex flex-wrap gap-2">
              {targetTests.map((test) => <SelectionChip isSelected={selectedTests.has(test)} key={test} label={test} onClick={() => toggleTest(test)} />)}
            </div>
          </div>
        </div>
        {draft.standardizedTests.length > 0 && (
          <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 dark:border-slate-700">
            {draft.standardizedTests.map((test) => {
              const config = testOptions[test.test];
              return <ProfileField disallowZero helper={config.helper} key={test.test} label={`${test.test} 分数`} maxLength={test.test === "IELTS" ? 3 : 5} maxValue={config.max} onChange={(value) => updateTestScore(test.test, value)} placeholder={config.placeholder} value={test.score} />;
            })}
          </div>
        )}
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-violet-400/50 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-2xl dark:hover:border-violet-500/40">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-100">学术成绩</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">{draft.degreeTarget === "undergraduate" ? "完成 AP 至少一门科目成绩或填写 IB 总分，两者任选其一即可。" : "可随时补充论文、科研和学术奖项。"}</p>
        <div className="mt-4"><AcademicRecordFields academicRecord={draft.academicRecord} degreeTarget={draft.degreeTarget} onCompetitionAdd={addCompetitionAward} onCompetitionRemove={removeCompetitionAward} onIbTotalChange={(value) => updateAcademicRecord("ibTotalScore", value)} onScalarChange={updateAcademicRecord} onSubjectAdd={addAcademicSubject} onSubjectChange={updateAcademicSubject} onSubjectRemove={removeAcademicSubject} /></div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">目标地区</legend>
        <div className="flex flex-wrap gap-2">
          {regionOptions.map((region) => <SelectionChip isSelected={draft.targetRegions.includes(region)} key={region} label={region} onClick={() => toggleRegion(region)} />)}
        </div>
      </fieldset>

      <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
        {validationError && <p aria-live="polite" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-5 text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">{validationError}</p>}
        <p className="mb-3 text-xs leading-5 text-slate-500">输入只会按受限数值和白名单选项保存，React 会安全转义界面内容。</p>
        <button className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition-all hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30" type="submit">保存并更新选校梯度</button>
      </div>
    </form>
  );
}

export default function ProfileDrawer({ onClose, onSaved, onThemeChange, open, profile, theme }: ProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("profile");
  const formKey = profile ? JSON.stringify(profile) : "new-profile";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleClear = () => {
    clearLocalProfileData();
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <motion.button
            aria-label="关闭个人资料中心"
            className="absolute inset-0 cursor-default bg-zinc-950/55 backdrop-blur-sm"
            onClick={onClose}
            type="button"
          />
          <motion.aside
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label="个人资料与系统设置"
            aria-modal="true"
            className="absolute inset-0 flex min-h-[100dvh] flex-col overflow-hidden bg-[#f5f5f7] shadow-2xl shadow-zinc-950/30 dark:bg-zinc-950"
            exit={{ opacity: 0, scale: 0.985, y: 18 }}
            initial={{ opacity: 0, scale: 0.985, y: 18 }}
            role="dialog"
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="border-b border-zinc-200/80 bg-white/80 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 sm:px-8">
              <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.18em] text-violet-700 dark:text-violet-300">MY GRAD PATH</p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">完善个人背景</h2>
                  <p className="mt-1 hidden text-sm text-zinc-500 dark:text-zinc-400 sm:block">完成后将即时更新你的选校梯度与申请建议。</p>
                </div>
                <button aria-label="返回 Dashboard" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold text-zinc-700 shadow-sm backdrop-blur-xl transition-all hover:border-violet-400/50 hover:bg-violet-50/60 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:border-violet-500/40 dark:hover:bg-violet-500/10 dark:hover:text-violet-100" onClick={onClose} type="button"><ArrowLeft aria-hidden="true" size={16} weight="bold" />返回 Dashboard</button>
              </div>
            </div>

            <div className="border-b border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/65 sm:px-8">
              <div className="mx-auto grid w-full max-w-5xl grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800/40">
                {([
                  ["profile", "个人背景", GraduationCap],
                  ["settings", "系统设置", GearSix],
                ] as const).map(([tab, label, Icon]) => (
                  <button aria-pressed={activeTab === tab} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${activeTab === tab ? "bg-white/80 text-violet-700 shadow-sm backdrop-blur-xl dark:bg-zinc-900/50 dark:text-violet-200" : "text-zinc-500 hover:text-violet-700 dark:text-zinc-400 dark:hover:text-violet-200"}`} key={tab} onClick={() => setActiveTab(tab)} type="button"><Icon aria-hidden="true" size={17} weight={activeTab === tab ? "fill" : "bold"} />{label}</button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
              <div className="mx-auto w-full max-w-5xl pb-8">
                {activeTab === "profile" ? (
                  <ProfileForm initialProfile={profile ?? emptyProfile} key={formKey} onSaved={onSaved} />
                ) : (
                  <section className="space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">外观主题</h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">选择更适合当前环境的 Dashboard 主题。</p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {([
                          ["light", "浅色", Sun],
                          ["dark", "深色", Moon],
                        ] as const).map(([option, label, Icon]) => (
                          <button aria-pressed={theme === option} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${theme === option ? "border-violet-400/50 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-500/50 dark:bg-violet-500/10 dark:text-violet-200" : "border-slate-200/80 bg-white/80 text-zinc-600 hover:border-violet-400/50 hover:text-violet-700 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:border-violet-500/40 dark:hover:text-violet-200"}`} key={option} onClick={() => onThemeChange(option)} type="button"><Icon aria-hidden="true" size={18} weight="duotone" />{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-400/20 dark:bg-rose-500/10">
                      <h3 className="font-bold text-rose-800 dark:text-rose-200">重新开始</h3>
                      <p className="mt-1 text-sm leading-6 text-rose-700 dark:text-rose-200/80">将删除本应用的背景资料与主题偏好，并返回未初始化的 Dashboard。</p>
                      <button className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-md shadow-rose-600/20 hover:bg-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/20" onClick={handleClear} type="button"><Trash aria-hidden="true" size={16} weight="bold" />清空本地数据并重新引导</button>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
