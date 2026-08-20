export interface SchoolIdentityInput {
  ipedsUnitId?: string | null;
  name: string;
  officialWebsite?: string | null;
  shortName?: string | null;
}

/**
 * 目录内院校的中文显示名。ID 与公开院校数据中的 ipeds_unitid 保持一致，
 * 因此不依赖不稳定的英文名称匹配。
 */
const chineseNameByInstitutionId: Readonly<Record<string, string>> = {
  "110404": "加州理工学院",
  "110635": "加州大学伯克利分校",
  "110644": "加州大学戴维斯分校",
  "110653": "加州大学欧文分校",
  "110662": "加州大学洛杉矶分校",
  "110671": "加州大学河滨分校",
  "110680": "加州大学圣地亚哥分校",
  "110705": "加州大学圣塔芭芭拉分校",
  "110714": "加州大学圣克鲁兹分校",
  "121150": "佩珀代因大学",
  "122931": "圣克拉拉大学",
  "123961": "南加州大学",
  "126614": "科罗拉多大学博尔德分校",
  "126775": "科罗拉多矿业大学",
  "129020": "康涅狄格大学",
  "130794": "耶鲁大学",
  "130943": "特拉华大学",
  "131159": "美国大学",
  "131469": "乔治华盛顿大学",
  "131496": "乔治城大学",
  "131520": "霍华德大学",
  "133951": "佛罗里达国际大学",
  "134097": "佛罗里达州立大学",
  "134130": "佛罗里达大学",
  "135726": "迈阿密大学",
  "137351": "南佛罗里达大学",
  "139658": "埃默里大学",
  "139755": "佐治亚理工学院",
  "139959": "佐治亚大学",
  "144050": "芝加哥大学",
  "145600": "伊利诺伊大学芝加哥分校",
  "145637": "伊利诺伊大学厄巴纳－香槟分校",
  "147767": "西北大学",
  "151351": "印第安纳大学伯明顿分校",
  "152080": "圣母大学",
  "160755": "杜兰大学",
  "162928": "约翰斯·霍普金斯大学",
  "163286": "马里兰大学学院公园分校",
  "164924": "波士顿学院",
  "164988": "波士顿大学",
  "165015": "布兰迪斯大学",
  "166027": "哈佛大学",
  "166629": "马萨诸塞大学阿默斯特分校",
  "166683": "麻省理工学院",
  "167358": "东北大学",
  "168148": "塔夫茨大学",
  "168421": "伍斯特理工学院",
  "170976": "密歇根大学安娜堡分校",
  "171100": "密歇根州立大学",
  "174066": "明尼苏达大学双城分校",
  "179867": "圣路易斯华盛顿大学",
  "182670": "达特茅斯学院",
  "185828": "新泽西理工学院",
  "186131": "普林斯顿大学",
  "186371": "罗格斯大学卡姆登分校",
  "186380": "罗格斯大学新布朗斯维克分校",
  "186399": "罗格斯大学纽瓦克分校",
  "186867": "史蒂文斯理工学院",
  "190150": "哥伦比亚大学",
  "190415": "康奈尔大学",
  "191241": "福特汉姆大学",
  "193900": "纽约大学",
  "194824": "伦斯勒理工学院",
  "195003": "罗切斯特理工学院",
  "195030": "罗切斯特大学",
  "196079": "纽约州立大学宾汉姆顿大学",
  "196088": "布法罗大学",
  "196097": "石溪大学",
  "196413": "雪城大学",
  "197708": "叶史瓦大学",
  "198419": "杜克大学",
  "199120": "北卡罗来纳大学教堂山分校",
  "199193": "北卡罗来纳州立大学",
  "199847": "维克森林大学",
  "201645": "凯斯西储大学",
  "204796": "俄亥俄州立大学",
  "211440": "卡内基梅隆大学",
  "212054": "德雷塞尔大学",
  "213543": "理海大学",
  "214777": "宾夕法尼亚州立大学",
  "215062": "宾夕法尼亚大学",
  "215293": "匹兹堡大学",
  "216597": "维拉诺瓦大学",
  "217156": "布朗大学",
  "217882": "克莱姆森大学",
  "221999": "范德堡大学",
  "223232": "贝勒大学",
  "227757": "莱斯大学",
  "228246": "南卫理公会大学",
  "228723": "德州农工大学",
  "228778": "德克萨斯大学奥斯汀分校",
  "228875": "德州基督教大学",
  "231624": "威廉与玛丽学院",
  "233921": "弗吉尼亚理工大学",
  "234076": "弗吉尼亚大学",
  "236948": "华盛顿大学西雅图分校",
  "239105": "马凯特大学",
  "240444": "威斯康星大学麦迪逊分校",
  "243744": "斯坦福大学",
  "243780": "普渡大学",
  "445188": "加州大学默塞德分校",
  "BE-KULEUVEN": "鲁汶大学",
  "CA-ALBERTA": "阿尔伯塔大学",
  "CA-MCGILL": "麦吉尔大学",
  "CA-TORONTO": "多伦多大学",
  "CA-UBC": "不列颠哥伦比亚大学",
  "CA-UMONTREAL": "蒙特利尔大学",
  "CA-WATERLOO": "滑铁卢大学",
  "CA-WESTERN": "西安大略大学",
  "CH-EPFL": "洛桑联邦理工学院",
  "CH-ETH": "苏黎世联邦理工学院",
  "DE-HEIDELBERG": "海德堡大学",
  "DE-LMU": "慕尼黑大学",
  "DE-TUM": "慕尼黑工业大学",
  "DK-COPENHAGEN": "哥本哈根大学",
  "ES-BARCELONA": "巴塞罗那大学",
  "FR-IPPARIS": "巴黎综合理工学院",
  "FR-PARISSACLAY": "巴黎萨克雷大学",
  "FR-PSL": "巴黎文理研究大学",
  "FR-SORBONNE": "索邦大学",
  "GB-BRISTOL": "布里斯托大学",
  "GB-CAMBRIDGE": "剑桥大学",
  "GB-EDINBURGH": "爱丁堡大学",
  "GB-IMPERIAL": "帝国理工学院",
  "GB-KCL": "伦敦国王学院",
  "GB-LSE": "伦敦政治经济学院",
  "GB-MANCHESTER": "曼彻斯特大学",
  "GB-OXFORD": "牛津大学",
  "GB-UCL": "伦敦大学学院",
  "GB-WARWICK": "华威大学",
  "HK-CITYU": "香港城市大学",
  "HK-CUHK": "香港中文大学",
  "HK-EDUHK": "香港教育大学",
  "HK-HKBU": "香港浸会大学",
  "HK-HKU": "香港大学",
  "HK-HKUST": "香港科技大学",
  "HK-LINGNAN": "岭南大学",
  "HK-POLYU": "香港理工大学",
  "IE-TRINITY": "都柏林圣三一学院",
  "IE-UCD": "都柏林大学学院",
  "IT-BOCCONI": "博科尼大学",
  "IT-BOLOGNA": "博洛尼亚大学",
  "IT-POLIMI": "米兰理工大学",
  "JP-CHIBA": "千叶大学",
  "JP-HIROSHIMA": "广岛大学",
  "JP-HITOTSUBASHI": "一桥大学",
  "JP-HOKKAIDO": "北海道大学",
  "JP-IST": "东京科学大学",
  "JP-KANAZAWA": "金泽大学",
  "JP-KEIO": "庆应义塾大学",
  "JP-KOBE": "神户大学",
  "JP-KYOTO": "京都大学",
  "JP-KYUSHU": "九州大学",
  "JP-NAGOYA": "名古屋大学",
  "JP-OSAKA": "大阪大学",
  "JP-RITSUMEIKAN": "立命馆大学",
  "JP-TOHOKU": "东北大学（日本）",
  "JP-TMU": "东京都立大学",
  "JP-TSUKUBA": "筑波大学",
  "JP-TUS": "东京理科大学",
  "JP-UTOKYO": "东京大学",
  "JP-WASEDA": "早稻田大学",
  "JP-YNU": "横滨国立大学",
  "NL-LEIDEN": "莱顿大学",
  "NL-TUDELFT": "代尔夫特理工大学",
  "NL-TUE": "埃因霍芬理工大学",
  "NL-UTRECHT": "乌得勒支大学",
  "NL-UVA": "阿姆斯特丹大学",
  "SE-KTH": "瑞典皇家理工学院",
  "SE-LUND": "隆德大学",
};

const chineseNameByEnglishName: Readonly<Record<string, string>> = {
  "Carnegie Mellon University": "卡内基梅隆大学",
  "Columbia University": "哥伦比亚大学",
  "Imperial College London": "帝国理工学院",
  "Northeastern University": "东北大学",
  "University of Toronto": "多伦多大学",
  "University of Washington": "华盛顿大学西雅图分校",
};

const institutionIdByLegacyEnglishName: Readonly<Record<string, string>> = {
  "Carnegie Mellon University": "211440",
  "Columbia University": "190150",
  "Imperial College London": "GB-IMPERIAL",
  "Northeastern University": "167358",
  "University of Toronto": "CA-TORONTO",
  "University of Washington": "236948",
};

function getCanonicalInstitutionId(school: Pick<SchoolIdentityInput, "ipedsUnitId" | "name">) {
  return school.ipedsUnitId ?? institutionIdByLegacyEnglishName[school.name] ?? null;
}

export function getSchoolChineseName(school: Pick<SchoolIdentityInput, "ipedsUnitId" | "name">) {
  const institutionId = getCanonicalInstitutionId(school);
  return (institutionId ? chineseNameByInstitutionId[institutionId] : undefined) ?? chineseNameByEnglishName[school.name] ?? school.name;
}

export function getSchoolLogoUrl(school: Pick<SchoolIdentityInput, "ipedsUnitId" | "name" | "officialWebsite">) {
  const institutionId = getCanonicalInstitutionId(school);
  if (institutionId && chineseNameByInstitutionId[institutionId]) {
    return `/school-logos/${encodeURIComponent(institutionId)}.webp`;
  }

  if (!school.officialWebsite) return null;

  try {
    return new URL("/favicon.ico", school.officialWebsite).toString();
  } catch {
    return null;
  }
}

export function getSchoolMonogram(school: Pick<SchoolIdentityInput, "name" | "shortName">) {
  return (school.shortName?.trim() || school.name.trim()).slice(0, 4);
}

export function getInstitutionIdFromTargetId(targetId: string) {
  return targetId.startsWith("directory-") ? targetId.slice("directory-".length) : null;
}
