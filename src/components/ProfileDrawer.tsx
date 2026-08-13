"use client";

import { FormEvent, useState } from "react";
import type {
  AcademicRecord,
  DegreeTarget,
  StandardizedTestType,
  StudentProfile,
} from "@/types";
import {
  clearLocalProfileData,
  currentStageOptions,
  emptyProfile,
  graduateTests,
  languageTests,
  majorOptions,
  regionOptions,
  sanitizeNumericValue,
  saveProfile,
  testOptions,
  undergraduateTests,
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

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.2 4.2L19 6.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function ProfileField({
  helper,
  label,
  maxLength = 5,
  placeholder,
  value,
  onChange,
}: {
  helper?: string;
  label: string;
  maxLength?: number;
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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        inputMode="decimal"
        maxLength={maxLength}
        onChange={(event) => onChange(sanitizeNumericValue(event.target.value, maxLength))}
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${
        isSelected
          ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className={`flex size-4 items-center justify-center rounded-full ${isSelected ? "bg-white/20" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
        {isSelected ? <CheckIcon /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      {label}
    </button>
  );
}

function AcademicRecordFields({
  academicRecord,
  degreeTarget,
  onChange,
}: {
  academicRecord: AcademicRecord;
  degreeTarget: DegreeTarget;
  onChange: (field: keyof AcademicRecord, value: string) => void;
}) {
  if (degreeTarget === "undergraduate") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <ProfileField helper="1–5 分" label="AP 成绩" onChange={(value) => onChange("apScore", value)} placeholder="例如：5" value={academicRecord.apScore} />
        <ProfileField helper="24–45 分" label="IB 总分" onChange={(value) => onChange("ibScore", value)} placeholder="例如：42" value={academicRecord.ibScore} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ProfileField label="论文数量" onChange={(value) => onChange("paperCount", value)} placeholder="例如：2" value={academicRecord.paperCount} />
      <ProfileField label="科研项目" onChange={(value) => onChange("researchProjectCount", value)} placeholder="例如：3" value={academicRecord.researchProjectCount} />
      <ProfileField label="学术奖项" onChange={(value) => onChange("academicAwardCount", value)} placeholder="例如：1" value={academicRecord.academicAwardCount} />
    </div>
  );
}

function ProfileForm({ initialProfile, onSaved }: { initialProfile: StudentProfile; onSaved: (profile: StudentProfile) => void }) {
  const [draft, setDraft] = useState<StudentProfile>(initialProfile);
  const targetTests = draft.degreeTarget === "undergraduate" ? undergraduateTests : graduateTests;
  const standardizedTestHint =
    draft.degreeTarget === "undergraduate" ? "SAT / ACT / AP / IB 成绩" : "GRE / GMAT 成绩";
  const selectedTests = new Map(draft.standardizedTests.map((test) => [test.test, test.score]));

  const updateDraft = (updater: (profile: StudentProfile) => StudentProfile) => {
    setDraft((currentProfile) => updater(currentProfile));
  };

  const updateAcademicRecord = (field: keyof AcademicRecord, value: string) => {
    updateDraft((currentProfile) => ({
      ...currentProfile,
      academicRecord: { ...currentProfile.academicRecord, [field]: value },
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
        test.test === testType ? { ...test, score: sanitizeNumericValue(value, maxLength) } : test,
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
    onSaved(saveProfile(draft));
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">申请目标</legend>
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {([
            ["undergraduate", "申请本科"],
            ["graduate", "申请研究生"],
          ] as const).map(([target, label]) => (
            <button
              aria-pressed={draft.degreeTarget === target}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                draft.degreeTarget === target
                  ? "bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            onChange={(event) => updateDraft((profile) => ({ ...profile, currentStage: event.target.value }))}
            value={draft.currentStage}
          >
            <option value="">请选择当前阶段</option>
            {currentStageOptions.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </label>
        <ProfileField helper="仅数字" label="GPA" onChange={(value) => updateDraft((profile) => ({ ...profile, gpa: value }))} placeholder="例如：3.8" value={draft.gpa} />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">目标专业</span>
        <select
          aria-label="目标专业"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          onChange={(event) => updateDraft((profile) => ({ ...profile, targetMajor: event.target.value }))}
          value={draft.targetMajor}
        >
          <option value="">请选择目标专业</option>
          {majorOptions.map((major) => <option key={major} value={major}>{major}</option>)}
        </select>
      </label>

      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
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
              return <ProfileField helper={config.helper} key={test.test} label={`${test.test} 分数`} maxLength={test.test === "IELTS" ? 3 : 5} onChange={(value) => updateTestScore(test.test, value)} placeholder={config.placeholder} value={test.score} />;
            })}
          </div>
        )}
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-100">学术成绩</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">{draft.degreeTarget === "undergraduate" ? "补充 AP、IB 等课程成绩。" : "可随时补充论文、科研和学术奖项。"}</p>
        <div className="mt-4"><AcademicRecordFields academicRecord={draft.academicRecord} degreeTarget={draft.degreeTarget} onChange={updateAcademicRecord} /></div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">目标地区</legend>
        <div className="flex flex-wrap gap-2">
          {regionOptions.map((region) => <SelectionChip isSelected={draft.targetRegions.includes(region)} key={region} label={region} onClick={() => toggleRegion(region)} />)}
        </div>
      </fieldset>

      <div className="border-t border-slate-200 pt-5 dark:border-slate-700">
        <p className="mb-3 text-xs leading-5 text-slate-500">输入只会按受限数值和白名单选项保存，React 会安全转义界面内容。</p>
        <button className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20" type="submit">保存并更新选校梯度</button>
      </div>
    </form>
  );
}

export default function ProfileDrawer({ onClose, onSaved, onThemeChange, open, profile, theme }: ProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("profile");
  const formKey = profile ? JSON.stringify(profile) : "onboarding";

  const handleClear = () => {
    clearLocalProfileData();
    window.location.reload();
  };

  return (
    <div aria-hidden={!open} className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <button aria-label="关闭个人资料抽屉" className={`absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} tabIndex={open ? 0 : -1} type="button" />
      <aside aria-label="个人资料与系统设置" aria-modal="true" className={`absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-700 dark:bg-slate-950 ${open ? "translate-x-0" : "translate-x-full"}`} role="dialog">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-blue-600">MY GRAD PATH</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">个人资料中心</h2>
          </div>
          {profile && <button aria-label="关闭抽屉" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" onClick={onClose} type="button"><CloseIcon /></button>}
        </div>

        <div className="mx-5 mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {([
            ["profile", "🎓 个人背景"],
            ["settings", "⚙️ 系统设置"],
          ] as const).map(([tab, label]) => (
            <button className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === tab ? "bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">{label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {activeTab === "profile" ? (
            <ProfileForm initialProfile={profile ?? emptyProfile} key={formKey} onSaved={onSaved} />
          ) : (
            <section className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">外观主题</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">选择更适合当前环境的 Dashboard 主题。</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {([
                    ["light", "☀️ 浅色"],
                    ["dark", "🌙 深色"],
                  ] as const).map(([option, label]) => (
                    <button aria-pressed={theme === option} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${theme === option ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "border-slate-200 text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:text-slate-300"}`} key={option} onClick={() => onThemeChange(option)} type="button">{label}</button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/70 dark:bg-rose-950/30">
                <h3 className="font-bold text-rose-800 dark:text-rose-200">重新开始</h3>
                <p className="mt-1 text-sm leading-6 text-rose-700 dark:text-rose-300">将删除本应用的背景资料与主题偏好，并重新打开引导。</p>
                <button className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-500/20" onClick={handleClear} type="button">🗑️ 清空本地数据并重新引导</button>
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
