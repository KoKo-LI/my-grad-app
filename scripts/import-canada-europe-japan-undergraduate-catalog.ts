import process from "node:process";
import { inflateRawSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const baseProgramName = "国际本科申请基准（院校级）";
const baseDegreeName = "Bachelor";
const qsSourceUrl = "https://www.topuniversities.com/world-university-rankings";
const qsWorkbookUrl = "https://insights.qs.com/hubfs/Rankings%20Excel%20Reports/2027%20QS%20World%20University%20Rankings%201.1%20%28For%20qs.com%29.xlsx";
const qsSourceYear = "2027";
const qsEdition = "QS World University Rankings 2027";
const maximumWorkbookBytes = 4 * 1024 * 1024;
const maximumEntryBytes = 20 * 1024 * 1024;

type RawRecord = Record<string, unknown>;
type SourceKind = "official_institution" | "official_program" | "ranking";
type RequirementMetric =
  | "act_composite"
  | "ap_subject"
  | "duolingo_english_test"
  | "english_proficiency"
  | "ib_total"
  | "ielts_academic_overall"
  | "sat_total"
  | "toefl_ibt_total"
  | "transcript";
type RequirementKind = "minimum" | "recommended" | "required";
type WorksheetRow = Map<number, string | number | null>;

type ScoreRequirement = {
  maximumScore?: number;
  metric: RequirementMetric;
  minimumScore?: number;
  requirementKind?: RequirementKind;
  scoreScale?: number;
  subjectArea?: string;
  testVersion?: string;
  valueText: string;
};

type ScoreStatistic = {
  metric: Exclude<RequirementMetric, "english_proficiency" | "transcript">;
  scoreScale: number;
  statistic: "average" | "median";
  subjectArea: string;
  testVersion: string;
  value: number;
};

type InstitutionSeed = {
  admissionUrl: string;
  country: string;
  id: string;
  languageRequirementText?: string;
  name: string;
  officialWebsite: string;
  qsAliases: string[];
  region: string;
  scoreRequirements?: ScoreRequirement[];
  scoreStatistics?: ScoreStatistic[];
  shortName: string;
};

type RequirementInsert = {
  applicant_scope: "international";
  application_path: "first_year";
  is_published: true;
  maximum_score: number | null;
  metric: RequirementMetric;
  minimum_score: number | null;
  program_id: string;
  requirement_kind: RequirementKind;
  score_scale: number | null;
  source_id: string;
  source_record_key: string;
  subject_area: string | null;
  test_version: string | null;
  value_text: string;
};

type StatisticInsert = {
  applicant_scope: "international";
  application_path: "first_year";
  cohort: "admitted";
  is_published: true;
  metric: Exclude<RequirementMetric, "english_proficiency" | "transcript">;
  program_id: string;
  score_scale: number;
  source_id: string;
  source_record_key: string;
  statistic: "average" | "median";
  statistic_value: number;
  subject_area: string;
  test_version: string;
};

type QsEntry = {
  country: string;
  rankDisplay: string;
  rankValue: number;
  sourceName: string;
};

const canada: InstitutionSeed[] = [
  {
    id: "CA-MCGILL", name: "McGill University", shortName: "McGill", country: "加拿大", region: "加拿大", officialWebsite: "https://www.mcgill.ca/", qsAliases: ["McGill University"],
    admissionUrl: "https://www.mcgill.ca/undergraduate-admissions/apply/requirements/international",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", valueText: "院校级英语要求；部分专业可有更高要求。" },
      { metric: "toefl_ibt_total", minimumScore: 90, scoreScale: 120, testVersion: "TOEFL iBT", valueText: "院校级英语要求；以所申课程和官方页面为准。" },
    ],
  },
  {
    id: "CA-TORONTO", name: "University of Toronto", shortName: "U of T", country: "加拿大", region: "加拿大", officialWebsite: "https://www.utoronto.ca/", qsAliases: ["University of Toronto"],
    admissionUrl: "https://future.utoronto.ca/apply/english-language-requirements/",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", valueText: "总分 6.5，单项不得低于 6.0。" },
      { metric: "toefl_ibt_total", minimumScore: 100, scoreScale: 120, testVersion: "TOEFL iBT", valueText: "总分 100；Writing 22。" },
    ],
  },
  {
    id: "CA-UBC", name: "University of British Columbia", shortName: "UBC", country: "加拿大", region: "加拿大", officialWebsite: "https://www.ubc.ca/", qsAliases: ["University of British Columbia"],
    admissionUrl: "https://you.ubc.ca/applying-ubc/requirements/english-language-competency/",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", valueText: "总分 6.5，单项不得低于 6.0。" },
      { metric: "toefl_ibt_total", minimumScore: 90, scoreScale: 120, testVersion: "TOEFL iBT", valueText: "Reading、Listening 22，Writing、Speaking 21。" },
    ],
  },
  {
    id: "CA-ALBERTA", name: "University of Alberta", shortName: "UAlberta", country: "加拿大", region: "加拿大", officialWebsite: "https://www.ualberta.ca/", qsAliases: ["University of Alberta"],
    admissionUrl: "https://www.ualberta.ca/en/admissions/undergraduate/admission/admission-requirements/english-language-requirements/index.html",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", valueText: "院校级英语能力要求。" },
      { metric: "toefl_ibt_total", minimumScore: 90, scoreScale: 120, testVersion: "TOEFL iBT", valueText: "院校级英语能力要求。" },
    ],
  },
  {
    id: "CA-WATERLOO", name: "University of Waterloo", shortName: "Waterloo", country: "加拿大", region: "加拿大", officialWebsite: "https://uwaterloo.ca/", qsAliases: ["University of Waterloo"],
    admissionUrl: "https://uwaterloo.ca/future-students/admissions/english-language-requirements",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", valueText: "院校级英语能力要求。" },
      { metric: "toefl_ibt_total", minimumScore: 90, scoreScale: 120, testVersion: "TOEFL iBT", valueText: "院校级英语能力要求。" },
    ],
  },
  {
    id: "CA-WESTERN", name: "Western University", shortName: "Western", country: "加拿大", region: "加拿大", officialWebsite: "https://www.uwo.ca/", qsAliases: ["Western University"],
    admissionUrl: "https://welcome.uwo.ca/next-steps/english-language-proficiency.html",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", valueText: "院校级英语能力要求。" },
      { metric: "toefl_ibt_total", minimumScore: 83, scoreScale: 120, testVersion: "TOEFL iBT", valueText: "院校级英语能力要求。" },
    ],
  },
  {
    id: "CA-UMONTREAL", name: "Université de Montréal", shortName: "UdeM", country: "加拿大", region: "加拿大", officialWebsite: "https://www.umontreal.ca/", qsAliases: ["Université de Montréal", "Universite de Montreal"],
    admissionUrl: "https://admission.umontreal.ca/en/undergraduate/",
    languageRequirementText: "该校大多数本科课程以法语授课；国际申请人须按课程确认法语能力与学历等效要求。官网未发布可用于全校所有本科课程的统一 TOEFL / IELTS 数值门槛，因此不以估算值替代。",
  },
];

const europe: InstitutionSeed[] = [
  { id: "CH-ETH", name: "ETH Zurich", shortName: "ETH", country: "瑞士", region: "欧洲", officialWebsite: "https://ethz.ch/", qsAliases: ["ETH Zurich", "ETH Zurich - Swiss Federal Institute of Technology"], admissionUrl: "https://ethz.ch/en/studies/bachelor/application/non-swiss-matriculation-certificate.html" },
  { id: "CH-EPFL", name: "EPFL", shortName: "EPFL", country: "瑞士", region: "欧洲", officialWebsite: "https://www.epfl.ch/", qsAliases: ["EPFL", "EPFL – École polytechnique fédérale de Lausanne", "Ecole Polytechnique Federale de Lausanne"], admissionUrl: "https://www.epfl.ch/education/bachelor/admission/admission/" },
  { id: "DE-TUM", name: "Technical University of Munich", shortName: "TUM", country: "德国", region: "欧洲", officialWebsite: "https://www.tum.de/", qsAliases: ["Technical University of Munich"], admissionUrl: "https://www.tum.de/en/studies/application/bachelor/application-bachelor" },
  { id: "DE-LMU", name: "LMU Munich", shortName: "LMU", country: "德国", region: "欧洲", officialWebsite: "https://www.lmu.de/", qsAliases: ["LMU Munich", "Ludwig-Maximilians-Universität München"], admissionUrl: "https://www.lmu.de/en/study/all-degrees-and-programs/degree-programs-and-study-opportunities/application-and-admission/index.html" },
  { id: "DE-HEIDELBERG", name: "Heidelberg University", shortName: "Heidelberg", country: "德国", region: "欧洲", officialWebsite: "https://www.uni-heidelberg.de/", qsAliases: ["Heidelberg University", "Universität Heidelberg"], admissionUrl: "https://www.uni-heidelberg.de/en/study/application-enrolment" },
  {
    id: "NL-TUDELFT", name: "Delft University of Technology", shortName: "TU Delft", country: "荷兰", region: "欧洲", officialWebsite: "https://www.tudelft.nl/", qsAliases: ["Delft University of Technology"], admissionUrl: "https://www.tudelft.nl/en/education/admission-and-application/bsc-international-diploma",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", valueText: "英语授课本科的通用英语能力条件；个别项目以课程页为准。" },
      { metric: "toefl_ibt_total", minimumScore: 90, scoreScale: 120, testVersion: "TOEFL iBT", valueText: "英语授课本科的通用英语能力条件；个别项目以课程页为准。" },
    ],
  },
  {
    id: "NL-UVA", name: "University of Amsterdam", shortName: "UvA", country: "荷兰", region: "欧洲", officialWebsite: "https://www.uva.nl/", qsAliases: ["University of Amsterdam"], admissionUrl: "https://www.uva.nl/en/education/admissions/bachelors/bachelors.html",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", valueText: "英语授课本科的常见语言门槛；项目可能不同。" },
      { metric: "toefl_ibt_total", minimumScore: 92, scoreScale: 120, testVersion: "TOEFL iBT", valueText: "英语授课本科的常见语言门槛；项目可能不同。" },
    ],
  },
  {
    id: "NL-LEIDEN", name: "Leiden University", shortName: "Leiden", country: "荷兰", region: "欧洲", officialWebsite: "https://www.universiteitleiden.nl/", qsAliases: ["Leiden University"], admissionUrl: "https://www.universiteitleiden.nl/en/education/admission-and-application/bachelors",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", valueText: "英语授课本科的常见语言门槛；项目可能不同。" },
      { metric: "toefl_ibt_total", minimumScore: 90, scoreScale: 120, testVersion: "TOEFL iBT", valueText: "英语授课本科的常见语言门槛；项目可能不同。" },
    ],
  },
  {
    id: "NL-UTRECHT", name: "Utrecht University", shortName: "Utrecht", country: "荷兰", region: "欧洲", officialWebsite: "https://www.uu.nl/", qsAliases: ["Utrecht University"], admissionUrl: "https://www.uu.nl/en/bachelors/general-information/how-to-apply/english-language-requirements/emi-ready",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6, scoreScale: 9, testVersion: "IELTS Academic", subjectArea: "EMI-ready 英语授课本科", valueText: "该类别公开线为总分 6.0；所选学位如另有要求，以项目页为准。" },
      { metric: "toefl_ibt_total", minimumScore: 83, scoreScale: 120, testVersion: "TOEFL iBT", subjectArea: "EMI-ready 英语授课本科", valueText: "该类别公开线为总分 83（旧量表）；所选学位如另有要求，以项目页为准。" },
    ],
  },
  { id: "NL-TUE", name: "Eindhoven University of Technology", shortName: "TU/e", country: "荷兰", region: "欧洲", officialWebsite: "https://www.tue.nl/", qsAliases: ["Eindhoven University of Technology"], admissionUrl: "https://www.tue.nl/en/education/become-a-student/admission-and-enrollment" },
  {
    id: "BE-KULEUVEN", name: "KU Leuven", shortName: "KU Leuven", country: "比利时", region: "欧洲", officialWebsite: "https://www.kuleuven.be/", qsAliases: ["KU Leuven"], admissionUrl: "https://www.kuleuven.be/english/stuvo/aanvraag-indienen/taalvoorwaarden/certificaten-engelse-taalvaardigheid",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", subjectArea: "英语授课项目通用下限", valueText: "官网公开的通用下限为总分 6.5；具体项目可要求更高。" },
      { metric: "toefl_ibt_total", minimumScore: 79, scoreScale: 120, testVersion: "TOEFL iBT", subjectArea: "英语授课项目通用下限", valueText: "官网公开的通用下限为总分 79；具体项目可要求更高。" },
    ],
  },
  { id: "FR-PSL", name: "Université PSL", shortName: "PSL", country: "法国", region: "欧洲", officialWebsite: "https://psl.eu/", qsAliases: ["Université PSL", "Universite PSL"], admissionUrl: "https://psl.eu/en/education/admissions-and-applications" },
  { id: "FR-IPPARIS", name: "Institut Polytechnique de Paris", shortName: "IP Paris", country: "法国", region: "欧洲", officialWebsite: "https://www.ip-paris.fr/", qsAliases: ["Institut Polytechnique de Paris"], admissionUrl: "https://www.ip-paris.fr/en/education/bachelors-programs" },
  { id: "FR-SORBONNE", name: "Sorbonne University", shortName: "Sorbonne", country: "法国", region: "欧洲", officialWebsite: "https://www.sorbonne-universite.fr/", qsAliases: ["Sorbonne University"], admissionUrl: "https://sciences.sorbonne-universite.fr/en/studies/bachelors" },
  { id: "FR-PARISSACLAY", name: "Université Paris-Saclay", shortName: "Paris-Saclay", country: "法国", region: "欧洲", officialWebsite: "https://www.universite-paris-saclay.fr/", qsAliases: ["Université Paris-Saclay", "Universite Paris-Saclay"], admissionUrl: "https://www.universite-paris-saclay.fr/en/education/bachelor" },
  {
    id: "IT-POLIMI", name: "Politecnico di Milano", shortName: "PoliMi", country: "意大利", region: "欧洲", officialWebsite: "https://www.polimi.it/", qsAliases: ["Politecnico di Milano"], admissionUrl: "https://www.polimi.it/studenti/requisiti-linguistici/studenti-dei-corsi-di-laurea-triennale-in-inglese",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 5, scoreScale: 9, testVersion: "IELTS Academic", subjectArea: "英语授课工程与设计本科（2026/27）", valueText: "官网列出的英语授课三年制本科语言下限为总分 5.0；仅适用于对应英语授课项目。" },
      { metric: "toefl_ibt_total", minimumScore: 59, scoreScale: 120, testVersion: "TOEFL iBT", subjectArea: "英语授课工程与设计本科（2026/27）", valueText: "官网列出的英语授课三年制本科语言下限为总分 59；仅适用于对应英语授课项目。" },
    ],
  },
  { id: "IT-BOLOGNA", name: "University of Bologna", shortName: "Bologna", country: "意大利", region: "欧洲", officialWebsite: "https://www.unibo.it/", qsAliases: ["University of Bologna", "Alma Mater Studiorum - Università di Bologna"], admissionUrl: "https://www.unibo.it/en/study/enrolment-fees-and-other-procedures/international-students" },
  {
    id: "IT-BOCCONI", name: "Bocconi University", shortName: "Bocconi", country: "意大利", region: "欧洲", officialWebsite: "https://www.unibocconi.it/", qsAliases: ["Bocconi University"], admissionUrl: "https://www.unibocconi.it/en/applying-bocconi/bachelor-and-law-programs/application-and-admissions/english-certificates-accepted-enrollment",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic", subjectArea: "英语授课本科 B2 入学要求", valueText: "英语授课本科的 B2 证明路径：总分 6.5，且每个单项不低于 6.0。" },
      { metric: "toefl_ibt_total", minimumScore: 88, scoreScale: 120, testVersion: "TOEFL iBT", subjectArea: "英语授课本科 B2 入学要求", valueText: "英语授课本科的 B2 证明路径：TOEFL iBT 总分最低 88。" },
    ],
  },
  { id: "ES-BARCELONA", name: "University of Barcelona", shortName: "UB", country: "西班牙", region: "欧洲", officialWebsite: "https://www.ub.edu/", qsAliases: ["University of Barcelona"], admissionUrl: "https://www.ub.edu/web/ub/en/estudis/estudiar_UB/estudiar_UB.html" },
  { id: "SE-KTH", name: "KTH Royal Institute of Technology", shortName: "KTH", country: "瑞典", region: "欧洲", officialWebsite: "https://www.kth.se/", qsAliases: ["KTH Royal Institute of Technology"], admissionUrl: "https://www.kth.se/en/studies/bachelor" },
  { id: "SE-LUND", name: "Lund University", shortName: "Lund", country: "瑞典", region: "欧洲", officialWebsite: "https://www.lunduniversity.lu.se/", qsAliases: ["Lund University"], admissionUrl: "https://www.lunduniversity.lu.se/admissions/bachelors-and-masters-studies" },
  { id: "DK-COPENHAGEN", name: "University of Copenhagen", shortName: "UCPH", country: "丹麦", region: "欧洲", officialWebsite: "https://www.ku.dk/", qsAliases: ["University of Copenhagen"], admissionUrl: "https://studies.ku.dk/bachelor/" },
  {
    id: "IE-TRINITY", name: "Trinity College Dublin", shortName: "Trinity", country: "爱尔兰", region: "欧洲", officialWebsite: "https://www.tcd.ie/", qsAliases: ["Trinity College Dublin"], admissionUrl: "https://www.tcd.ie/study/english-language-requirements/",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic Band B", subjectArea: "多数本科课程适用的 Band B", valueText: "Band B 适用于多数本科课程；总分 6.5，具体课程可另有条件。" },
      { metric: "toefl_ibt_total", minimumScore: 90, scoreScale: 120, testVersion: "TOEFL iBT Band B", subjectArea: "多数本科课程适用的 Band B", valueText: "Band B 的 TOEFL iBT 公开线为总分 90；具体课程可另有条件。" },
      { metric: "duolingo_english_test", minimumScore: 120, scoreScale: 160, testVersion: "Duolingo English Test Band B", subjectArea: "多数本科课程适用的 Band B", valueText: "Band B 的 DET 公开线为总分 120；具体课程可另有条件。" },
    ],
  },
  {
    id: "IE-UCD", name: "University College Dublin", shortName: "UCD", country: "爱尔兰", region: "欧洲", officialWebsite: "https://www.ucd.ie/", qsAliases: ["University College Dublin"], admissionUrl: "https://www.ucd.ie/registry/t4media/ELR%20for%20higher%20requirements.pdf",
    scoreRequirements: [
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, testVersion: "IELTS Academic Standard Level 4", subjectArea: "Standard Level 4 英语要求", valueText: "Standard Level 4 总分 6.5、各单项最低 6.0；高要求课程可能适用更高等级。" },
      { metric: "toefl_ibt_total", minimumScore: 90, scoreScale: 120, testVersion: "TOEFL iBT Standard Level 4", subjectArea: "Standard Level 4 英语要求", valueText: "Standard Level 4 的 TOEFL iBT 公开线为总分 90；高要求课程可能适用更高等级。" },
      { metric: "duolingo_english_test", minimumScore: 120, scoreScale: 160, testVersion: "Duolingo English Test Standard Level 4", subjectArea: "Standard Level 4 英语要求", valueText: "Standard Level 4 的 DET 公开线为总分 120、各单项最低 110；高要求课程可能适用更高等级。" },
    ],
  },
];

const japan: InstitutionSeed[] = [
  { id: "JP-UTOKYO", name: "The University of Tokyo", shortName: "UTokyo", country: "日本", region: "日本", officialWebsite: "https://www.u-tokyo.ac.jp/", qsAliases: ["The University of Tokyo"], admissionUrl: "https://www.u-tokyo.ac.jp/en/prospective-students/undergraduate.html" },
  {
    id: "JP-KYOTO", name: "Kyoto University", shortName: "Kyoto", country: "日本", region: "日本", officialWebsite: "https://www.kyoto-u.ac.jp/", qsAliases: ["Kyoto University"], admissionUrl: "https://www.iup.kyoto-u.ac.jp/faq/english-language-proficiency/",
    scoreRequirements: [
      { metric: "toefl_ibt_total", minimumScore: 90, requirementKind: "recommended", scoreScale: 120, subjectArea: "Kyoto iUP", testVersion: "TOEFL iBT", valueText: "京都 iUP 官方列出的成功申请者典型分数；不是硬性最低线。" },
      { metric: "ielts_academic_overall", minimumScore: 6.5, requirementKind: "recommended", scoreScale: 9, subjectArea: "Kyoto iUP", testVersion: "IELTS Academic", valueText: "京都 iUP 官方列出的成功申请者典型分数；不是硬性最低线。" },
    ],
  },
  { id: "JP-OSAKA", name: "The University of Osaka", shortName: "Osaka", country: "日本", region: "日本", officialWebsite: "https://www.osaka-u.ac.jp/", qsAliases: ["The University of Osaka", "Osaka University"], admissionUrl: "https://www.osaka-u.ac.jp/en/academics/faculties" },
  {
    id: "JP-IST", name: "Institute of Science Tokyo", shortName: "Science Tokyo", country: "日本", region: "日本", officialWebsite: "https://www.isct.ac.jp/", qsAliases: ["Institute of Science Tokyo"], admissionUrl: "https://admissions.isct.ac.jp/en/013/undergraduate/programs/gsep",
    scoreRequirements: [
      { metric: "toefl_ibt_total", requirementKind: "required", subjectArea: "GSEP 国际本科工程项目", testVersion: "TOEFL iBT", valueText: "须提交两年内有效的 TOEFL iBT 成绩；官网明确未设统一最低分。" },
      { metric: "ielts_academic_overall", requirementKind: "required", subjectArea: "GSEP 国际本科工程项目", testVersion: "IELTS Academic", valueText: "须提交两年内有效的 IELTS Academic 成绩；官网明确未设统一最低分。" },
    ],
  },
  {
    id: "JP-TOHOKU", name: "Tohoku University", shortName: "Tohoku", country: "日本", region: "日本", officialWebsite: "https://www.tohoku.ac.jp/", qsAliases: ["Tohoku University"], admissionUrl: "https://www.tohoku.ac.jp/en/admissions/admission_undergraduate.html",
    scoreRequirements: [
      { metric: "toefl_ibt_total", minimumScore: 79, scoreScale: 120, subjectArea: "自费国际学生日语授课本科路径", testVersion: "TOEFL iBT", valueText: "官网列明 TOEFL iBT 79；同时须参加学院指定 EJU 科目及校内考试。" },
    ],
  },
  {
    id: "JP-NAGOYA", name: "Nagoya University", shortName: "Nagoya", country: "日本", region: "日本", officialWebsite: "https://www.nagoya-u.ac.jp/", qsAliases: ["Nagoya University"], admissionUrl: "https://admissions.g30.nagoya-u.ac.jp/admissions/undergraduate",
    scoreRequirements: [
      { metric: "toefl_ibt_total", minimumScore: 80, scoreScale: 120, subjectArea: "G30 英语授课本科", testVersion: "TOEFL iBT", valueText: "G30 本科英语能力最低要求；以当年 Appendix 1 为准。" },
      { metric: "ielts_academic_overall", minimumScore: 6, scoreScale: 9, subjectArea: "G30 英语授课本科", testVersion: "IELTS Academic", valueText: "G30 本科英语能力最低要求；以当年 Appendix 1 为准。" },
      { metric: "duolingo_english_test", minimumScore: 110, scoreScale: 160, subjectArea: "G30 英语授课本科", testVersion: "Duolingo English Test", valueText: "G30 本科英语能力最低要求；以当年 Appendix 1 为准。" },
    ],
  },
  {
    id: "JP-KYUSHU", name: "Kyushu University", shortName: "Kyushu", country: "日本", region: "日本", officialWebsite: "https://www.kyushu-u.ac.jp/", qsAliases: ["Kyushu University"], admissionUrl: "https://www.kyushu-u.ac.jp/f/42084/Second%20round%20screening0115.pdf",
    scoreRequirements: [
      { metric: "toefl_ibt_total", minimumScore: 80, scoreScale: 120, subjectArea: "国际本科项目", testVersion: "TOEFL iBT", valueText: "官方申请指南列明的最低分；满足四年英语授课中学教育者可按指南申请豁免。" },
      { metric: "ielts_academic_overall", minimumScore: 6.5, scoreScale: 9, subjectArea: "国际本科项目", testVersion: "IELTS Academic", valueText: "官方申请指南列明的最低总分；满足四年英语授课中学教育者可按指南申请豁免。" },
      { metric: "ap_subject", requirementKind: "required", subjectArea: "国际本科工程类项目", testVersion: "AP", valueText: "工程类课程须提交指定数学（Calculus）及理科 AP 成绩；项目和科目以当年申请指南为准。" },
    ],
  },
  { id: "JP-HOKKAIDO", name: "Hokkaido University", shortName: "Hokkaido", country: "日本", region: "日本", officialWebsite: "https://www.global.hokudai.ac.jp/", qsAliases: ["Hokkaido University"], admissionUrl: "https://www.global.hokudai.ac.jp/admissions/" },
  {
    id: "JP-WASEDA", name: "Waseda University", shortName: "Waseda", country: "日本", region: "日本", officialWebsite: "https://www.waseda.jp/", qsAliases: ["Waseda University"], admissionUrl: "https://www.waseda.jp/inst/admission/en/undergraduate/english/",
    scoreRequirements: [
      { metric: "sat_total", requirementKind: "required", subjectArea: "英语授课本科项目", testVersion: "SAT", valueText: "须提交至少一项标准化考试成绩；官网明确多数项目不设最低分。" },
      { metric: "toefl_ibt_total", requirementKind: "required", subjectArea: "英语授课本科项目", testVersion: "TOEFL iBT", valueText: "须提交英语能力成绩；除 JCulP 外，官网说明多数项目不设统一最低分。" },
    ],
    scoreStatistics: [
      { metric: "sat_total", statistic: "average", value: 1416, scoreScale: 1600, subjectArea: "School of International Liberal Studies（2025 成功申请者）", testVersion: "SAT" },
      { metric: "act_composite", statistic: "average", value: 32.3, scoreScale: 36, subjectArea: "School of International Liberal Studies（2025 成功申请者）", testVersion: "ACT Composite" },
      { metric: "ib_total", statistic: "average", value: 36.9, scoreScale: 42, subjectArea: "School of International Liberal Studies（2025 成功申请者）", testVersion: "IB Diploma（含预测分）" },
    ],
  },
  {
    id: "JP-KEIO", name: "Keio University", shortName: "Keio", country: "日本", region: "日本", officialWebsite: "https://www.keio.ac.jp/", qsAliases: ["Keio University"], admissionUrl: "https://www.keio.ac.jp/en/admissions/faculty/faq/pearl/",
    scoreRequirements: [
      { metric: "sat_total", requirementKind: "required", subjectArea: "PEARL 英语授课经济学本科", testVersion: "SAT", valueText: "PEARL 要求提交 IB 或 SAT 作为学术能力材料；官网明确没有 cut-off 分数。" },
      { metric: "ib_total", requirementKind: "required", subjectArea: "PEARL 英语授课经济学本科", testVersion: "IB Diploma", valueText: "PEARL 接受 IB Diploma；官网明确没有 cut-off 分数。" },
      { metric: "toefl_ibt_total", requirementKind: "required", subjectArea: "PEARL 英语授课经济学本科", testVersion: "TOEFL iBT", valueText: "所有申请人均须提交 TOEFL iBT 和/或 IELTS；官网明确没有 cut-off 分数。" },
      { metric: "ielts_academic_overall", requirementKind: "required", subjectArea: "PEARL 英语授课经济学本科", testVersion: "IELTS Academic", valueText: "所有申请人均须提交 TOEFL iBT 和/或 IELTS；官网明确没有 cut-off 分数。" },
    ],
  },
  { id: "JP-TSUKUBA", name: "University of Tsukuba", shortName: "Tsukuba", country: "日本", region: "日本", officialWebsite: "https://www.tsukuba.ac.jp/", qsAliases: ["University of Tsukuba"], admissionUrl: "https://www.tsukuba.ac.jp/en/admission/" },
  { id: "JP-KOBE", name: "Kobe University", shortName: "Kobe", country: "日本", region: "日本", officialWebsite: "https://www.kobe-u.ac.jp/", qsAliases: ["Kobe University"], admissionUrl: "https://www.kobe-u.ac.jp/en/academics/admission/" },
  { id: "JP-HIROSHIMA", name: "Hiroshima University", shortName: "Hiroshima", country: "日本", region: "日本", officialWebsite: "https://www.hiroshima-u.ac.jp/", qsAliases: ["Hiroshima University"], admissionUrl: "https://www.hiroshima-u.ac.jp/en/admissions" },
  { id: "JP-TUS", name: "Tokyo University of Science", shortName: "TUS", country: "日本", region: "日本", officialWebsite: "https://www.tus.ac.jp/en/", qsAliases: ["Tokyo University of Science"], admissionUrl: "https://www.tus.ac.jp/en/admissions/" },
  {
    id: "JP-RITSUMEIKAN", name: "Ritsumeikan University", shortName: "Ritsumeikan", country: "日本", region: "日本", officialWebsite: "https://en.ritsumei.ac.jp/", qsAliases: ["Ritsumeikan University"], admissionUrl: "https://en.ritsumei.ac.jp/e-ug/apply/howto.html/?version=English",
    scoreRequirements: [
      { metric: "toefl_ibt_total", minimumScore: 72, scoreScale: 120, subjectArea: "英语授课本科（CRPS / ISSE 最低项目线）", testVersion: "TOEFL iBT 0–120", valueText: "官网列示最低项目线为 72；不同英语授课项目为 72–85，应按目标项目核验。" },
      { metric: "ielts_academic_overall", minimumScore: 5.5, scoreScale: 9, subjectArea: "英语授课本科（CRPS / ISSE 最低项目线）", testVersion: "IELTS Academic", valueText: "官网列示最低项目线为 5.5；不同英语授课项目为 5.5–6.5，应按目标项目核验。" },
      { metric: "duolingo_english_test", minimumScore: 105, scoreScale: 160, subjectArea: "英语授课本科（CRPS / ISSE 最低项目线）", testVersion: "Duolingo English Test", valueText: "官网列示最低项目线为 105；不同英语授课项目为 105–120，应按目标项目核验。" },
    ],
  },
  { id: "JP-YNU", name: "Yokohama National University", shortName: "YNU", country: "日本", region: "日本", officialWebsite: "https://www.ynu.ac.jp/english/", qsAliases: ["Yokohama National University"], admissionUrl: "https://www.ynu.ac.jp/english/academics/admissions/" },
  { id: "JP-CHIBA", name: "Chiba University", shortName: "Chiba", country: "日本", region: "日本", officialWebsite: "https://www.chiba-u.jp/", qsAliases: ["Chiba University"], admissionUrl: "https://www.chiba-u.jp/e/admissions/" },
  { id: "JP-KANAZAWA", name: "Kanazawa University", shortName: "Kanazawa", country: "日本", region: "日本", officialWebsite: "https://www.kanazawa-u.ac.jp/", qsAliases: ["Kanazawa University"], admissionUrl: "https://www.kanazawa-u.ac.jp/en/admission/" },
  { id: "JP-HITOTSUBASHI", name: "Hitotsubashi University", shortName: "Hitotsubashi", country: "日本", region: "日本", officialWebsite: "https://www.hit-u.ac.jp/eng/", qsAliases: ["Hitotsubashi University"], admissionUrl: "https://www.hit-u.ac.jp/eng/admission/" },
  { id: "JP-TMU", name: "Tokyo Metropolitan University", shortName: "TMU", country: "日本", region: "日本", officialWebsite: "https://www.tmu.ac.jp/english/", qsAliases: ["Tokyo Metropolitan University"], admissionUrl: "https://www.tmu.ac.jp/english/admission.html" },
];

const institutions = [...canada, ...europe, ...japan];

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required. Keep it in .env.local and never commit it.`);
  return value;
}

function isValidateOnly(): boolean {
  return process.argv.includes("--validate-only");
}

function getListCountry(): string | null {
  const argument = process.argv.find((value) => value.startsWith("--list="));
  return argument ? argument.slice("--list=".length).trim() || null : null;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bthe\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRank(value: unknown): number | null {
  const rank = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isInteger(rank) && rank > 0 && rank <= 10_000 ? rank : null;
}

function assertRange(buffer: Buffer, offset: number, length: number, label: string): void {
  if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`QS workbook contains an invalid ${label} range.`);
  }
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error("QS workbook is missing the ZIP central directory.");
}

function readZipEntry(buffer: Buffer, targetPath: string): Buffer {
  const endOffset = findEndOfCentralDirectory(buffer);
  assertRange(buffer, endOffset, 22, "central directory");
  const directorySize = buffer.readUInt32LE(endOffset + 12);
  let directoryOffset = buffer.readUInt32LE(endOffset + 16);
  const directoryEnd = directoryOffset + directorySize;
  assertRange(buffer, directoryOffset, directorySize, "central directory");

  while (directoryOffset < directoryEnd) {
    assertRange(buffer, directoryOffset, 46, "central directory entry");
    if (buffer.readUInt32LE(directoryOffset) !== 0x02014b50) throw new Error("QS workbook contains an unsupported ZIP directory entry.");
    const compressionMethod = buffer.readUInt16LE(directoryOffset + 10);
    const compressedSize = buffer.readUInt32LE(directoryOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(directoryOffset + 24);
    const nameLength = buffer.readUInt16LE(directoryOffset + 28);
    const extraLength = buffer.readUInt16LE(directoryOffset + 30);
    const commentLength = buffer.readUInt16LE(directoryOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(directoryOffset + 42);
    const entryLength = 46 + nameLength + extraLength + commentLength;
    assertRange(buffer, directoryOffset, entryLength, "central directory entry");
    const entryPath = buffer.toString("utf8", directoryOffset + 46, directoryOffset + 46 + nameLength);

    if (entryPath === targetPath) {
      if (uncompressedSize > maximumEntryBytes || compressedSize > maximumEntryBytes) throw new Error(`QS workbook entry ${targetPath} exceeds the 20 MB safety limit.`);
      assertRange(buffer, localHeaderOffset, 30, "local file header");
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) throw new Error(`QS workbook entry ${targetPath} has an invalid local header.`);
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      assertRange(buffer, dataOffset, compressedSize, "compressed entry");
      const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
      const output = compressionMethod === 0
        ? Buffer.from(compressed)
        : compressionMethod === 8
          ? inflateRawSync(compressed, { maxOutputLength: maximumEntryBytes })
          : null;
      if (!output || output.length !== uncompressedSize) throw new Error(`QS workbook entry ${targetPath} could not be safely decompressed.`);
      return output;
    }
    directoryOffset += entryLength;
  }
  throw new Error(`QS workbook does not contain ${targetPath}.`);
}

function decodeXmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .replace(/&#(\d+);/g, (_match, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readXmlCellText(value: string): string {
  return Array.from(value.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)).map((match) => decodeXmlText(match[1])).join("");
}

function getXmlAttribute(openingTag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(openingTag);
  return match ? decodeXmlText(match[1]) : null;
}

function spreadsheetColumnToIndex(reference: string): number | null {
  const match = /^([A-Z]+)\d+$/i.exec(reference);
  if (!match) return null;
  return match[1].toUpperCase().split("").reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function parseSharedStrings(workbookBuffer: Buffer): string[] {
  let xml: string;
  try {
    xml = readZipEntry(workbookBuffer, "xl/sharedStrings.xml").toString("utf8");
  } catch {
    return [];
  }
  return Array.from(xml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map((match) => readXmlCellText(match[1]));
}

function parseWorksheetRows(workbookBuffer: Buffer, sharedStrings: string[]): WorksheetRow[] {
  const xml = readZipEntry(workbookBuffer, "xl/worksheets/sheet1.xml").toString("utf8");
  const rows: WorksheetRow[] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = new Map<number, string | number | null>();
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const reference = getXmlAttribute(cellMatch[1], "r");
      const columnIndex = reference ? spreadsheetColumnToIndex(reference) : null;
      if (columnIndex === null) continue;
      const cellType = getXmlAttribute(cellMatch[1], "t");
      const rawValue = /<v>([\s\S]*?)<\/v>/.exec(cellMatch[2])?.[1] ?? null;
      if (cellType === "s" && rawValue !== null) row.set(columnIndex, sharedStrings[Number(rawValue)] ?? null);
      else if (cellType === "inlineStr") row.set(columnIndex, readXmlCellText(cellMatch[2]));
      else if (rawValue !== null) {
        const numericValue = Number(rawValue);
        row.set(columnIndex, Number.isFinite(numericValue) ? numericValue : decodeXmlText(rawValue));
      } else row.set(columnIndex, null);
    }
    rows.push(row);
  }
  return rows;
}

function parseQsEntries(workbookBuffer: Buffer): QsEntry[] {
  const rows = parseWorksheetRows(workbookBuffer, parseSharedStrings(workbookBuffer));
  const headerRowIndex = rows.findIndex((row) => {
    const headers = Array.from(row.values());
    return headers.includes("Rank") && headers.includes("Name") && headers.includes("Country/Territory");
  });
  if (headerRowIndex < 0) throw new Error("The QS workbook does not include expected ranking columns.");

  const columns = new Map<string, number>();
  rows[headerRowIndex].forEach((cell, index) => {
    const header = readText(cell);
    if (header) columns.set(header, index);
  });
  const rankColumn = columns.get("Rank");
  const nameColumn = columns.get("Name");
  const countryColumn = columns.get("Country/Territory");
  if (rankColumn === undefined || nameColumn === undefined || countryColumn === undefined) throw new Error("The QS workbook column map is incomplete.");

  const entries = rows.slice(headerRowIndex + 1).flatMap((row): Array<Omit<QsEntry, "rankDisplay">> => {
    const country = readText(row.get(countryColumn));
    const sourceName = readText(row.get(nameColumn));
    const rankValue = readRank(row.get(rankColumn));
    return country && sourceName && rankValue ? [{ country, rankValue, sourceName }] : [];
  });
  const rankCounts = new Map<number, number>();
  entries.forEach((entry) => rankCounts.set(entry.rankValue, (rankCounts.get(entry.rankValue) ?? 0) + 1));
  return entries.map((entry) => ({ ...entry, rankDisplay: rankCounts.get(entry.rankValue) === 1 ? `#${entry.rankValue}` : `#=${entry.rankValue}` }));
}

async function loadQsWorkbook(): Promise<Buffer> {
  const response = await fetch(qsWorkbookUrl, { headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
  if (!response.ok) throw new Error(`QS workbook download failed with HTTP ${response.status}.`);
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maximumWorkbookBytes) throw new Error("QS workbook exceeds the 4 MB safety limit.");
  const workbook = Buffer.from(await response.arrayBuffer());
  if (workbook.length > maximumWorkbookBytes) throw new Error("QS workbook exceeds the 4 MB safety limit.");
  return workbook;
}

function sourceKey(sourceUrl: string, sourceYear: string): string {
  return `${sourceUrl}\u0000${sourceYear}`;
}

function readIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is missing an identifier.`);
  return value;
}

function parseRows(value: unknown, label: string): RawRecord[] {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) throw new Error(`${label} returned an invalid response.`);
  return value;
}

function validateSeeds(): void {
  const ids = new Set<string>();
  institutions.forEach((institution) => {
    if (!/^[A-Z]{2}-[A-Z0-9-]{2,62}$/.test(institution.id)) throw new Error(`Invalid catalog ID: ${institution.id}.`);
    if (ids.has(institution.id)) throw new Error(`Duplicate catalog ID: ${institution.id}.`);
    ids.add(institution.id);
    new URL(institution.officialWebsite);
    new URL(institution.admissionUrl);
    institution.scoreRequirements?.forEach((requirement) => {
      if (requirement.minimumScore !== undefined && (requirement.minimumScore <= 0 || requirement.scoreScale === undefined || requirement.minimumScore > requirement.scoreScale)) {
        throw new Error(`Invalid score requirement for ${institution.id}.`);
      }
      if (requirement.minimumScore === undefined && requirement.scoreScale !== undefined) {
        throw new Error(`Score scale requires a numeric score for ${institution.id}.`);
      }
    });
    institution.scoreStatistics?.forEach((statistic) => {
      if (statistic.value <= 0 || statistic.value > statistic.scoreScale) throw new Error(`Invalid score statistic for ${institution.id}.`);
    });
  });
  if (canada.length !== 7) throw new Error("Canada seed must contain exactly seven QS-ranked institutions.");
  if (japan.length !== 20) throw new Error("Japan seed must contain exactly twenty QS-ranked institutions.");
}

function makeRequirementRows(
  seed: InstitutionSeed,
  programId: string,
  sourceId: string,
): RequirementInsert[] {
  const keyPrefix = seed.id.toLocaleLowerCase("en-US");
  const rows: RequirementInsert[] = [
    {
      applicant_scope: "international", application_path: "first_year", is_published: true, maximum_score: null, metric: "transcript", minimum_score: null,
      program_id: programId, requirement_kind: "required", score_scale: null, source_id: sourceId, source_record_key: `${keyPrefix}-transcript`, subject_area: null, test_version: null,
      value_text: "须提交符合所申本科课程要求的中学学历与完整成绩单；具体学术科目和分数要求以学校官网与课程页面为准。",
    },
    {
      applicant_scope: "international", application_path: "first_year", is_published: true, maximum_score: null, metric: "english_proficiency", minimum_score: null,
      program_id: programId, requirement_kind: "required", score_scale: null, source_id: sourceId, source_record_key: `${keyPrefix}-english`, subject_area: null, test_version: null,
      value_text: seed.languageRequirementText ?? "语言条件因授课语言、申请路径与所选课程而异；请以链接中的学校官方当年要求为准。",
    },
  ];

  seed.scoreRequirements?.forEach((requirement) => {
    rows.push({
      applicant_scope: "international", application_path: "first_year", is_published: true, maximum_score: requirement.maximumScore ?? null,
      metric: requirement.metric, minimum_score: requirement.minimumScore ?? null, program_id: programId, requirement_kind: requirement.requirementKind ?? "minimum", score_scale: requirement.scoreScale ?? null,
      source_id: sourceId, source_record_key: `${keyPrefix}-${requirement.metric}`, subject_area: requirement.subjectArea ?? "院校级英语要求", test_version: requirement.testVersion ?? null, value_text: requirement.valueText,
    });
  });
  return rows;
}

function makeStatisticRows(
  seed: InstitutionSeed,
  programId: string,
  sourceId: string,
): StatisticInsert[] {
  const keyPrefix = seed.id.toLocaleLowerCase("en-US");
  return (seed.scoreStatistics ?? []).map((statistic) => ({
    applicant_scope: "international",
    application_path: "first_year",
    cohort: "admitted",
    is_published: true,
    metric: statistic.metric,
    program_id: programId,
    score_scale: statistic.scoreScale,
    source_id: sourceId,
    source_record_key: `${keyPrefix}-${statistic.metric}-${statistic.statistic}`,
    statistic: statistic.statistic,
    statistic_value: statistic.value,
    subject_area: statistic.subjectArea,
    test_version: statistic.testVersion,
  }));
}

function resolveRanks(entries: QsEntry[]): {
  missingInstitutionNames: string[];
  ranked: Array<{ institutionId: string; rankDisplay: string; rankValue: number }>;
} {
  const byName = new Map<string, QsEntry>();
  entries.forEach((entry) => byName.set(normalizeName(entry.sourceName), entry));
  const missingInstitutionNames: string[] = [];
  const ranked = institutions.flatMap((institution) => {
    const entry = institution.qsAliases
      .map((alias) => byName.get(normalizeName(alias)))
      .find((item): item is QsEntry => item !== undefined);
    // Never infer a QS rank. Some popular institutions are omitted from the
    // downloadable edition (including six of the requested Japan selections).
    if (!entry) {
      missingInstitutionNames.push(institution.name);
      return [];
    }
    return { institutionId: institution.id, rankDisplay: entry.rankDisplay, rankValue: entry.rankValue };
  });
  const rankedCanada = new Set(ranked.map((rank) => rank.institutionId));
  if (canada.some((institution) => !rankedCanada.has(institution.id))) {
    throw new Error("QS 2027 ranking could not be matched for every requested Canada top-seven institution.");
  }
  return { missingInstitutionNames, ranked };
}

async function main(): Promise<void> {
  validateSeeds();
  const scoreRequirementCount = institutions.reduce((count, seed) => count + (seed.scoreRequirements?.length ?? 0), 0);
  const scoreStatisticCount = institutions.reduce((count, seed) => count + (seed.scoreStatistics?.length ?? 0), 0);
  console.log(`Validated ${institutions.length} institutions (${canada.length} Canada, ${europe.length} Europe, ${japan.length} Japan) with ${institutions.length * 2 + scoreRequirementCount} official requirement records and ${scoreStatisticCount} official score statistics.`);

  const listCountry = getListCountry();
  if (isValidateOnly()) return;

  const qsEntries = await loadQsWorkbook().then(parseQsEntries);
  if (listCountry) {
    qsEntries
      .filter((entry) => entry.country === listCountry)
      .sort((first, second) => first.rankValue - second.rankValue || first.sourceName.localeCompare(second.sourceName))
      .slice(0, 30)
      .forEach((entry) => console.log(`${entry.rankDisplay}\t${entry.sourceName}`));
    return;
  }
  const rankResolution = resolveRanks(qsEntries);
  const ranks = rankResolution.ranked;
  if (rankResolution.missingInstitutionNames.length > 0) {
    console.warn(`No QS 2027 workbook row was published for ${rankResolution.missingInstitutionNames.length} selected schools; no QS rank will be stored for: ${rankResolution.missingInstitutionNames.join("; ")}`);
  }

  const client = createClient(
    getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnvironmentValue("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
  );

  const { data: institutionData, error: institutionError } = await client
    .from("institutions")
    .upsert(institutions.map((seed) => ({
      country: seed.country, ipeds_unitid: seed.id, is_published: true, name: seed.name, official_website: seed.officialWebsite, region: seed.region, short_name: seed.shortName,
    })), { onConflict: "ipeds_unitid" })
    .select("id, ipeds_unitid");
  if (institutionError) throw new Error(`Could not upsert international institutions: ${institutionError.message}`);

  const institutionIds = new Map<string, string>();
  parseRows(institutionData, "institution upsert").forEach((row) => institutionIds.set(readIdentifier(row.ipeds_unitid, "institution identifier"), readIdentifier(row.id, "institution")));

  const sourceSeeds = [
    { sourceKind: "ranking" as const satisfies SourceKind, title: qsEdition, sourceUrl: qsSourceUrl, sourceYear: qsSourceYear, sourceExcerpt: "QS global ranking edition published 18 June 2026; rankings can be corrected by QS after publication." },
    ...institutions.map((seed) => ({
      sourceKind: "official_institution" as const satisfies SourceKind, title: `${seed.name} official undergraduate admissions`, sourceUrl: seed.admissionUrl, sourceYear: "2026/27", sourceExcerpt: "Official institutional admissions page; requirements can vary by course, language and application path.",
    })),
  ];
  const sourceUrls = sourceSeeds.map((source) => source.sourceUrl);
  const { data: existingSourceData, error: existingSourceError } = await client.from("data_sources").select("id, source_url, source_year").in("source_url", sourceUrls);
  if (existingSourceError) throw new Error(`Could not inspect catalog sources: ${existingSourceError.message}`);
  const existingSourceKeys = new Set(parseRows(existingSourceData, "source lookup").map((row) => sourceKey(readIdentifier(row.source_url, "source URL"), typeof row.source_year === "string" ? row.source_year : "")));
  const missingSources = sourceSeeds.filter((source) => !existingSourceKeys.has(sourceKey(source.sourceUrl, source.sourceYear)));
  if (missingSources.length > 0) {
    const { error: sourceInsertError } = await client.from("data_sources").insert(missingSources.map((source) => ({
      source_excerpt: source.sourceExcerpt, source_kind: source.sourceKind, source_url: source.sourceUrl, source_year: source.sourceYear, title: source.title, verification_status: "verified",
    })));
    if (sourceInsertError) throw new Error(`Could not create official catalog sources: ${sourceInsertError.message}`);
  }
  const { data: sourceData, error: sourceError } = await client.from("data_sources").select("id, source_url, source_year").in("source_url", sourceUrls);
  if (sourceError) throw new Error(`Could not load catalog sources: ${sourceError.message}`);
  const sourceIds = new Map<string, string>();
  parseRows(sourceData, "source lookup").forEach((row) => sourceIds.set(sourceKey(readIdentifier(row.source_url, "source URL"), typeof row.source_year === "string" ? row.source_year : ""), readIdentifier(row.id, "source")));

  const qsSourceId = sourceIds.get(sourceKey(qsSourceUrl, qsSourceYear));
  if (!qsSourceId) throw new Error("QS World University Rankings 2027 source was unavailable after import.");
  const { error: rankingError } = await client.from("institution_rankings").upsert(ranks.map((rank) => ({
    edition: qsEdition, institution_id: readIdentifier(institutionIds.get(rank.institutionId), `institution ${rank.institutionId}`), is_published: true,
    rank_display: rank.rankDisplay, rank_value: rank.rankValue, ranking_key: "qs_world_university_rankings", source_id: qsSourceId,
  })), { onConflict: "institution_id,source_id,ranking_key" });
  if (rankingError) throw new Error(`Could not publish QS ranking rows: ${rankingError.message}`);

  const { data: programData, error: programError } = await client
    .from("undergraduate_programs")
    .upsert(institutions.map((seed) => ({
      degree_name: baseDegreeName, field_of_study: "跨学科本科", institution_id: readIdentifier(institutionIds.get(seed.id), `institution ${seed.id}`), is_published: true,
      major_categories: ["计算机科学", "数据科学 / 人工智能", "电子与计算机工程", "商业分析", "金融 / 经济学", "教育学", "公共卫生", "人机交互 / 设计"], official_url: seed.admissionUrl, program_name: baseProgramName,
    })), { onConflict: "institution_id,program_name,degree_name" })
    .select("id, institution_id, program_name, degree_name");
  if (programError) throw new Error(`Could not upsert international programs: ${programError.message}`);
  const programIds = new Map<string, string>();
  parseRows(programData, "program upsert").forEach((row) => {
    const key = `${readIdentifier(row.institution_id, "program institution")}\u0000${readIdentifier(row.program_name, "program name")}\u0000${readIdentifier(row.degree_name, "program degree")}`;
    programIds.set(key, readIdentifier(row.id, "program"));
  });

  for (const seed of institutions) {
    const institutionId = readIdentifier(institutionIds.get(seed.id), `institution ${seed.id}`);
    const programId = readIdentifier(programIds.get(`${institutionId}\u0000${baseProgramName}\u0000${baseDegreeName}`), `program ${seed.id}`);
    const recordKeyPrefix = `${seed.id.toLocaleLowerCase("en-US")}-`;
    const [requirementResult, statisticResult] = await Promise.all([
      client.from("admission_requirements").delete().eq("program_id", programId).like("source_record_key", `${recordKeyPrefix}%`),
      client.from("admission_statistics").delete().eq("program_id", programId).like("source_record_key", `${recordKeyPrefix}%`),
    ]);
    if (requirementResult.error || statisticResult.error) {
      throw new Error(`Could not replace generated score records for ${seed.id}: ${requirementResult.error?.message ?? statisticResult.error?.message ?? "unknown error"}`);
    }
  }

  const requirementRows = institutions.flatMap((seed) => {
    const institutionId = readIdentifier(institutionIds.get(seed.id), `institution ${seed.id}`);
    const programId = readIdentifier(programIds.get(`${institutionId}\u0000${baseProgramName}\u0000${baseDegreeName}`), `program ${seed.id}`);
    const sourceId = readIdentifier(sourceIds.get(sourceKey(seed.admissionUrl, "2026/27")), `source ${seed.id}`);
    return makeRequirementRows(seed, programId, sourceId);
  });
  const { error: requirementError } = await client.from("admission_requirements").upsert(requirementRows, { onConflict: "program_id,source_id,source_record_key" });
  if (requirementError) throw new Error(`Could not publish international admission requirements: ${requirementError.message}`);

  const statisticRows = institutions.flatMap((seed) => {
    const institutionId = readIdentifier(institutionIds.get(seed.id), `institution ${seed.id}`);
    const programId = readIdentifier(programIds.get(`${institutionId}\u0000${baseProgramName}\u0000${baseDegreeName}`), `program ${seed.id}`);
    const sourceId = readIdentifier(sourceIds.get(sourceKey(seed.admissionUrl, "2026/27")), `source ${seed.id}`);
    return makeStatisticRows(seed, programId, sourceId);
  });
  if (statisticRows.length > 0) {
    const { error: statisticError } = await client.from("admission_statistics").upsert(statisticRows, { onConflict: "program_id,source_id,source_record_key" });
    if (statisticError) throw new Error(`Could not publish international admission statistics: ${statisticError.message}`);
  }

  console.log(`Published ${institutions.length} verified international institutions, ${ranks.length} QS 2027 rankings, ${requirementRows.length} official admission requirement records, and ${statisticRows.length} official score statistics.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown international catalog import failure.");
  process.exitCode = 1;
});
