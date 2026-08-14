import type { SchoolMatchInput } from "@/types";

/**
 * The presentation catalog is intentionally separate from the matching rules.
 * Future database/API data can replace this export without changing the engine.
 */
export const schoolCatalog: SchoolMatchInput[] = [
  {
    id: "cmu-mscs",
    name: "Carnegie Mellon University",
    shortName: "CMU",
    program: "M.S. in Computer Science",
    region: "美国",
    deadline: "2026-12-10",
    majorCategories: ["计算机科学", "软件工程", "数据科学 / 人工智能", "网络安全"],
    medianGpa: 3.9,
    minimumToefl: 102,
  },
  {
    id: "columbia-msds",
    name: "Columbia University",
    shortName: "CU",
    program: "M.S. in Data Science",
    region: "美国",
    deadline: "2027-01-15",
    majorCategories: ["数据科学 / 人工智能", "统计学", "商业分析"],
    medianGpa: 3.8,
    minimumToefl: 100,
  },
  {
    id: "uw-msds",
    name: "University of Washington",
    shortName: "UW",
    program: "M.S. in Data Science",
    region: "美国",
    deadline: "2027-01-05",
    majorCategories: ["数据科学 / 人工智能", "统计学", "计算机科学"],
    medianGpa: 3.7,
    minimumToefl: 92,
  },
  {
    id: "imperial-ai",
    name: "Imperial College London",
    shortName: "ICL",
    program: "M.Sc. Artificial Intelligence",
    region: "英国",
    deadline: "2027-03-31",
    majorCategories: ["数据科学 / 人工智能", "计算机科学", "机器人学"],
    medianGpa: 3.75,
    minimumIelts: 7,
  },
  {
    id: "utoronto-mie",
    name: "University of Toronto",
    shortName: "UofT",
    program: "MEng in Engineering",
    region: "加拿大",
    deadline: "2027-01-31",
    majorCategories: ["电子与计算机工程", "机械工程", "材料科学与工程"],
    medianGpa: 3.55,
    minimumToefl: 93,
  },
  {
    id: "northeastern-mscs",
    name: "Northeastern University",
    shortName: "NEU",
    program: "M.S. in Computer Science",
    region: "美国",
    deadline: "2027-04-15",
    majorCategories: ["计算机科学", "软件工程", "网络安全", "信息系统 / 信息管理"],
    medianGpa: 3.45,
    minimumToefl: 90,
  },
];
