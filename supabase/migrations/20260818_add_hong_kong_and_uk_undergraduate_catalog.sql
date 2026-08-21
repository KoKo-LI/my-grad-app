-- Expand the verified undergraduate catalog with the latest published QS
-- cohort for Hong Kong SAR, China (top 8) and the United Kingdom (top 10).
--
-- Every admission fact below is source-attributed. Values marked as an
-- institution-level baseline may vary by programme; they must never be
-- interpreted as a guaranteed offer threshold.

begin;

with institution_seed (
  ipeds_unitid,
  name,
  short_name,
  country,
  region,
  official_website
) as (
  values
    ('HK-HKU', 'The University of Hong Kong', 'HKU', 'China', '中国香港', 'https://www.hku.hk'),
    ('HK-CUHK', 'The Chinese University of Hong Kong', 'CUHK', 'China', '中国香港', 'https://www.cuhk.edu.hk'),
    ('HK-HKUST', 'The Hong Kong University of Science and Technology', 'HKUST', 'China', '中国香港', 'https://hkust.edu.hk'),
    ('HK-POLYU', 'The Hong Kong Polytechnic University', 'PolyU', 'China', '中国香港', 'https://www.polyu.edu.hk'),
    ('HK-CITYU', 'City University of Hong Kong', 'CityUHK', 'China', '中国香港', 'https://www.cityu.edu.hk'),
    ('HK-HKBU', 'Hong Kong Baptist University', 'HKBU', 'China', '中国香港', 'https://www.hkbu.edu.hk'),
    ('HK-EDUHK', 'The Education University of Hong Kong', 'EdUHK', 'China', '中国香港', 'https://www.eduhk.hk'),
    ('HK-LINGNAN', 'Lingnan University', 'Lingnan', 'China', '中国香港', 'https://www.ln.edu.hk'),
    ('GB-IMPERIAL', 'Imperial College London', 'Imperial', 'United Kingdom', '英国', 'https://www.imperial.ac.uk'),
    ('GB-OXFORD', 'University of Oxford', 'Oxford', 'United Kingdom', '英国', 'https://www.ox.ac.uk'),
    ('GB-CAMBRIDGE', 'University of Cambridge', 'Cambridge', 'United Kingdom', '英国', 'https://www.cam.ac.uk'),
    ('GB-UCL', 'University College London', 'UCL', 'United Kingdom', '英国', 'https://www.ucl.ac.uk'),
    ('GB-EDINBURGH', 'The University of Edinburgh', 'Edinburgh', 'United Kingdom', '英国', 'https://www.ed.ac.uk'),
    ('GB-KCL', 'King''s College London', 'KCL', 'United Kingdom', '英国', 'https://www.kcl.ac.uk'),
    ('GB-MANCHESTER', 'The University of Manchester', 'Manchester', 'United Kingdom', '英国', 'https://www.manchester.ac.uk'),
    ('GB-BRISTOL', 'University of Bristol', 'Bristol', 'United Kingdom', '英国', 'https://www.bristol.ac.uk'),
    ('GB-LSE', 'The London School of Economics and Political Science', 'LSE', 'United Kingdom', '英国', 'https://www.lse.ac.uk'),
    ('GB-WARWICK', 'University of Warwick', 'Warwick', 'United Kingdom', '英国', 'https://warwick.ac.uk')
)
insert into public.institutions (
  ipeds_unitid,
  name,
  short_name,
  country,
  region,
  official_website,
  is_published
)
select
  ipeds_unitid,
  name,
  short_name,
  country,
  region,
  official_website,
  true
from institution_seed
on conflict (ipeds_unitid) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  country = excluded.country,
  region = excluded.region,
  official_website = excluded.official_website,
  is_published = true,
  updated_at = now();

with source_seed (
  source_kind,
  title,
  source_url,
  source_year,
  source_excerpt
) as (
  values
    ('ranking', 'QS World University Rankings 2027', 'https://www.topuniversities.com/world-university-rankings', '2027', 'QS global rankings, latest edition published before this migration.'),
    ('official_institution', 'HKU — International qualifications and English language requirements', 'https://admissions.hku.hk/apply/international-qualifications/english-language-requirement', '2026 entry', 'Institutional English-language requirement and accepted qualifications.'),
    ('official_institution', 'HKU — International admissions information guide', 'https://admissions.hku.hk/sites/default/files/2025-10/HKU-International-Admissions-Information-2026.pdf', '2026 entry', 'Programme examples for international qualifications; not a universal cutoff.'),
    ('official_institution', 'CUHK — Overseas and other qualifications requirements', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'Institutional international-qualification and English-language requirements.'),
    ('official_institution', 'HKUST — International qualifications', 'https://join.hkust.edu.hk/admissions/international-qualifications', '2026 entry', 'Institutional international-qualification admissions requirements.'),
    ('official_institution', 'HKUST — English language admissions requirements', 'https://join.hkust.edu.hk/oas/elar.pdf', '2026 entry', 'Institutional English-language admissions requirements.'),
    ('official_institution', 'PolyU — International and other qualifications English requirements', 'https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications/international-other-qualifications-english', '2026 entry', 'Institutional English-language requirements for non-local applicants.'),
    ('official_institution', 'CityUHK — Undergraduate admissions', 'https://www.cityu.edu.hk/admo/', '2026/27', 'Institutional undergraduate admissions information; programme pages determine final conditions.'),
    ('official_program', 'CityUHK — Bachelor of Veterinary Medicine admission', 'https://www.cityu.edu.hk/admo/programmes/bachelor-veterinary-medicine', '2026/27', 'Programme-specific academic and English requirements; not an institution-wide cutoff.'),
    ('official_institution', 'HKBU — International qualifications', 'https://admissions.hkbu.edu.hk/admissions/international-qualifications.html', '2026 entry', 'Institutional international-qualification and English-language requirements.'),
    ('official_institution', 'HKBU — International qualifications 2026', 'https://admissions.hkbu.edu.hk/content/dam/ao-assets/document/download-area/international-qualifications-2026.pdf', '2026 entry', 'Published U.S. curriculum entry pathway requirements.'),
    ('official_institution', 'EdUHK — International qualifications entrance requirements', 'https://www.apply.eduhk.hk/ug/nonlocal', '2026 entry', 'Institutional international-qualification and English-language requirements.'),
    ('official_institution', 'Lingnan University — Undergraduate admissions', 'https://www.ln.edu.hk/admissions/ug/', '2026 entry', 'Institutional undergraduate admissions landing page; programme pages determine final conditions.'),
    ('official_institution', 'Imperial College London — English language requirements', 'https://www.imperial.ac.uk/study/apply/english-language/', '2026/27', 'Institutional English-language standards; degree pages choose Standard or Higher level.'),
    ('official_institution', 'Imperial College London — Undergraduate application', 'https://www.imperial.ac.uk/study/apply/undergraduate/', '2026/27', 'Undergraduate academic entry requirements are set by degree.'),
    ('official_institution', 'University of Oxford — Undergraduate English language requirements', 'https://www.ox.ac.uk/admissions/undergraduate/applying/for-international-students/english-language-requirements-visas', '2026/27', 'Institutional Standard and Higher English-language levels; course page specifies the required level.'),
    ('official_institution', 'University of Oxford — Undergraduate admissions', 'https://www.ox.ac.uk/admissions/undergraduate', '2026/27', 'Undergraduate course pages define academic entry requirements.'),
    ('official_institution', 'University of Cambridge — English language requirements', 'https://www.undergraduate.study.cam.ac.uk/international-students/english-language-requirements', '2026/27', 'Institutional English-language requirements for undergraduate applicants.'),
    ('official_institution', 'University of Cambridge — Undergraduate study', 'https://www.undergraduate.study.cam.ac.uk/', '2026/27', 'Course and college pages define international academic requirements.'),
    ('official_institution', 'UCL — Undergraduate English language requirements', 'https://www.ucl.ac.uk/prospective-students/undergraduate/how-apply/english-language-requirements', '2026/27', 'Institutional English-language levels; individual programmes set a level.'),
    ('official_institution', 'UCL — Undergraduate study', 'https://www.ucl.ac.uk/prospective-students/undergraduate', '2026/27', 'Degree pages define academic entry and applicable language levels.'),
    ('official_institution', 'University of Edinburgh — Undergraduate English language requirements', 'https://www.ed.ac.uk/studying/undergraduate/applying/requirements/english-language', '2026/27', 'Institutional English-language requirements; the degree finder confirms programme level.'),
    ('official_institution', 'King''s College London — Undergraduate English language requirements', 'https://www.kcl.ac.uk/study/undergraduate/how-to-apply/english-language-requirements', '2026/27', 'Institutional English-language bands; individual courses specify the applicable band.'),
    ('official_institution', 'King''s College London — Undergraduate study', 'https://www.kcl.ac.uk/study/undergraduate', '2026/27', 'Degree pages define academic entry and applicable English language band.'),
    ('official_institution', 'University of Manchester — Undergraduate entry requirements', 'https://www.manchester.ac.uk/study/undergraduate/applications/entry-requirements/', '2026/27', 'Institutional and course-level undergraduate entry requirements.'),
    ('official_institution', 'University of Bristol — English language requirements', 'https://www.bristol.ac.uk/study/language-requirements/', '2026/27', 'Institutional English-language profiles; individual courses specify the required profile.'),
    ('official_institution', 'University of Bristol — Undergraduate study', 'https://www.bristol.ac.uk/study/undergraduate/', '2026/27', 'Degree pages define academic entry requirements and language profile.'),
    ('official_institution', 'LSE — Undergraduate entry requirements', 'https://www.lse.ac.uk/study-at-lse/Undergraduate/Prospective-Students/How-to-Apply/entry-requirements', '2026 entry', 'Institutional undergraduate academic ranges; each programme states its exact offer.'),
    ('official_institution', 'LSE — Undergraduate English language requirements', 'https://www.lse.ac.uk/study-at-lse/Undergraduate/Prospective-Students/How-to-Apply/English-language-requirements', '2026 entry', 'Institutional undergraduate English-language requirements.'),
    ('official_institution', 'University of Warwick — Undergraduate entry requirements', 'https://warwick.ac.uk/study/undergraduate/apply/entry-requirements/', '2026/27', 'Institutional and course-level undergraduate entry requirements.'),
    ('official_program', 'University of Edinburgh — Computer Science and Mathematics BSc entry requirements', 'https://study.ed.ac.uk/programmes/undergraduate/2026/64-computer-science-and-mathematics/entry-requirements', '2026 entry', 'Published undergraduate programme-level academic and English-language requirements; retained as a programme example, not an institution-wide cutoff.'),
    ('official_program', 'University of Manchester — BSc Computer Science entry requirements', 'https://www.manchester.ac.uk/study/undergraduate/courses/2026/00560/bsc-computer-science/', '2026 entry', 'Published 2026 Computer Science BSc academic offer and English-language requirements; not a universal institutional cutoff.'),
    ('official_program', 'University of Bristol — BSc Computer Science entry requirements', 'https://www.bristol.ac.uk/study/undergraduate/2026/computer-science/bsc-computer-science/', '2026 entry', 'Published 2026 Computer Science BSc academic offer and English-language profile; not a universal institutional cutoff.'),
    ('official_institution', 'University of Warwick — Undergraduate English language requirements', 'https://warwick.ac.uk/study/undergraduate/applying/english-language-requirements/', '2026/27', 'Official Band A, B and C English-language matrix. Course pages determine the applicable band.')
)
insert into public.data_sources (
  source_kind,
  title,
  source_url,
  source_year,
  source_excerpt,
  verification_status
)
select
  seed.source_kind,
  seed.title,
  seed.source_url,
  seed.source_year,
  seed.source_excerpt,
  'verified'
from source_seed as seed
where not exists (
  select 1
  from public.data_sources as existing
  where existing.source_url = seed.source_url
    and existing.source_year = seed.source_year
);

-- Source records are inserted idempotently above. Existing verified metadata is
-- deliberately preserved instead of being overwritten by a catalog migration.

with ranking_seed (ipeds_unitid, rank_value, rank_display) as (
  values
    ('HK-HKU', 11, '#11'),
    ('HK-CUHK', 18, '#18'),
    ('HK-HKUST', 33, '#33'),
    ('HK-POLYU', 50, '#50'),
    ('HK-CITYU', 52, '#=52'),
    ('HK-HKBU', 216, '#216'),
    ('HK-EDUHK', 406, '#=406'),
    ('HK-LINGNAN', 581, '#=581'),
    ('GB-IMPERIAL', 2, '#=2'),
    ('GB-OXFORD', 4, '#4'),
    ('GB-CAMBRIDGE', 6, '#6'),
    ('GB-UCL', 8, '#=8'),
    ('GB-EDINBURGH', 35, '#35'),
    ('GB-KCL', 37, '#37'),
    ('GB-MANCHESTER', 40, '#=40'),
    ('GB-BRISTOL', 57, '#57'),
    ('GB-LSE', 62, '#62'),
    ('GB-WARWICK', 68, '#=68')
), qs_source as (
  select id
  from public.data_sources
  where source_url = 'https://www.topuniversities.com/world-university-rankings'
    and source_year = '2027'
  order by created_at asc
  limit 1
)
insert into public.institution_rankings (
  institution_id,
  source_id,
  ranking_key,
  edition,
  rank_value,
  rank_display,
  is_published
)
select
  institution.id,
  qs_source.id,
  'qs_world_university_rankings',
  'QS World University Rankings 2027',
  seed.rank_value,
  seed.rank_display,
  true
from ranking_seed as seed
join public.institutions as institution on institution.ipeds_unitid = seed.ipeds_unitid
cross join qs_source
on conflict (institution_id, source_id, ranking_key) do update
set
  edition = excluded.edition,
  rank_value = excluded.rank_value,
  rank_display = excluded.rank_display,
  is_published = true,
  updated_at = now();

with program_seed (ipeds_unitid, program_name, degree_name, field_of_study, major_categories, official_url) as (
  values
    ('HK-HKU', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '商业分析', '金融 / 经济学', '国际关系', '教育学', '人机交互 / 设计'], 'https://admissions.hku.hk/apply/international-qualifications'),
    ('HK-CUHK', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '商业分析', '金融 / 经济学', '国际关系', '教育学', '人机交互 / 设计'], 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/'),
    ('HK-HKUST', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '商业分析', '金融 / 经济学', '生物学 / 生命科学'], 'https://join.hkust.edu.hk/admissions/international-qualifications'),
    ('HK-POLYU', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '商业分析', '金融 / 经济学', '建筑学 / 城市规划', '艺术与设计'], 'https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications/'),
    ('HK-CITYU', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '商业分析', '金融 / 经济学', '生物学 / 生命科学'], 'https://www.cityu.edu.hk/admo/'),
    ('HK-HKBU', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '商业分析', '金融 / 经济学', '传媒 / 新闻学', '艺术与设计'], 'https://admissions.hkbu.edu.hk/admissions/international-qualifications.html'),
    ('HK-EDUHK', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['教育学', '心理学', '国际关系', '计算机科学', '艺术与设计'], 'https://www.apply.eduhk.hk/ug/nonlocal'),
    ('HK-LINGNAN', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['商业分析', '金融 / 经济学', '国际关系', '社会学', '心理学', '传媒 / 新闻学'], 'https://www.ln.edu.hk/admissions/ug/'),
    ('GB-IMPERIAL', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '机械工程', '化学工程', '生物医学工程', '数学 / 应用数学', '物理学'], 'https://www.imperial.ac.uk/study/apply/undergraduate/'),
    ('GB-OXFORD', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数学 / 应用数学', '物理学', '金融 / 经济学', '法律 / 法学', '国际关系', '心理学'], 'https://www.ox.ac.uk/admissions/undergraduate'),
    ('GB-CAMBRIDGE', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '数学 / 应用数学', '物理学', '金融 / 经济学', '法律 / 法学'], 'https://www.undergraduate.study.cam.ac.uk/'),
    ('GB-UCL', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '建筑学 / 城市规划', '法律 / 法学', '教育学', '人机交互 / 设计'], 'https://www.ucl.ac.uk/prospective-students/undergraduate'),
    ('GB-EDINBURGH', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '金融 / 经济学', '教育学', '艺术与设计'], 'https://www.ed.ac.uk/studying/undergraduate'),
    ('GB-KCL', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '金融 / 经济学', '法律 / 法学', '国际关系', '心理学', '公共卫生'], 'https://www.kcl.ac.uk/study/undergraduate'),
    ('GB-MANCHESTER', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '机械工程', '金融 / 经济学', '生物学 / 生命科学'], 'https://www.manchester.ac.uk/study/undergraduate/'),
    ('GB-BRISTOL', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '金融 / 经济学', '法律 / 法学', '艺术与设计'], 'https://www.bristol.ac.uk/study/undergraduate/'),
    ('GB-LSE', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['金融 / 经济学', '商业分析', '国际关系', '公共政策 / 公共管理', '社会学', '法律 / 法学'], 'https://www.lse.ac.uk/study-at-lse/Undergraduate'),
    ('GB-WARWICK', '国际本科申请基准（院校级）', 'Bachelor', '院校级国际本科申请要求', array['计算机科学', '数据科学 / 人工智能', '电子与计算机工程', '商业分析', '金融 / 经济学', '法律 / 法学', '教育学'], 'https://warwick.ac.uk/study/undergraduate/')
)
insert into public.undergraduate_programs (
  institution_id,
  program_name,
  degree_name,
  field_of_study,
  major_categories,
  official_url,
  is_published
)
select
  institution.id,
  seed.program_name,
  seed.degree_name,
  seed.field_of_study,
  seed.major_categories,
  seed.official_url,
  true
from program_seed as seed
join public.institutions as institution on institution.ipeds_unitid = seed.ipeds_unitid
on conflict (institution_id, program_name, degree_name) do update
set
  field_of_study = excluded.field_of_study,
  major_categories = excluded.major_categories,
  official_url = excluded.official_url,
  is_published = true,
  updated_at = now();

with requirement_seed (
  ipeds_unitid,
  metric,
  requirement_kind,
  applicant_scope,
  minimum_score,
  maximum_score,
  score_scale,
  test_version,
  subject_area,
  value_text,
  source_url,
  source_year,
  source_record_key
) as (
  values
    -- Hong Kong SAR, China: institution-level requirements and explicitly marked programme examples.
    ('HK-HKU', 'transcript', 'required', 'international', null, null, null, null, null, '提交国际课程或国家课程的完整成绩单；课程要求不同。', 'https://admissions.hku.hk/apply/international-qualifications/english-language-requirement', '2026 entry', 'hk-hku-transcript'),
    ('HK-HKU', 'ielts_academic_overall', 'minimum', 'international', 6.5, null, 9, 'IELTS Academic', '院校级英语要求', '单次考试总分；结果须在指定有效期内。', 'https://admissions.hku.hk/apply/international-qualifications/english-language-requirement', '2026 entry', 'hk-hku-ielts'),
    ('HK-HKU', 'toefl_ibt_total', 'minimum', 'international', 93, null, 120, 'TOEFL iBT', '院校级英语要求', '单次考试总分；不接受页面列明的部分考试形式。', 'https://admissions.hku.hk/apply/international-qualifications/english-language-requirement', '2026 entry', 'hk-hku-toefl'),
    ('HK-HKU', 'ib_total', 'recommended', 'international', 32, null, 45, 'IB Diploma', '官方指南中的部分课程示例', '公开指南显示课程门槛随专业约为 32–41；此处为示例中较低项目值，不是统一最低线。', 'https://admissions.hku.hk/sites/default/files/2025-10/HKU-International-Admissions-Information-2026.pdf', '2026 entry', 'hk-hku-ib-example'),
    ('HK-HKU', 'sat_total', 'recommended', 'international', 1380, null, 1600, 'SAT + AP pathway', '官方指南中的部分课程示例', '示例路径通常同时要求指定数量的 AP；高竞争专业门槛更高。', 'https://admissions.hku.hk/sites/default/files/2025-10/HKU-International-Admissions-Information-2026.pdf', '2026 entry', 'hk-hku-sat-example'),
    ('HK-HKU', 'ap_subject', 'recommended', 'international', 3, null, 5, 'AP', '官方指南中的部分课程示例', '示例路径要求多门 AP；各课程的门数和分数不同。', 'https://admissions.hku.hk/sites/default/files/2025-10/HKU-International-Admissions-Information-2026.pdf', '2026 entry', 'hk-hku-ap-example'),

    ('HK-CUHK', 'transcript', 'required', 'international', null, null, null, null, null, '提交获认可课程体系的学历和成绩证明；最终审核按所申课程进行。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-transcript'),
    ('HK-CUHK', 'ielts_academic_overall', 'minimum', 'international', 6, null, 9, 'IELTS Academic', '院校级英语要求', '总分要求；个别课程可提高。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-ielts'),
    ('HK-CUHK', 'toefl_ibt_total', 'minimum', 'international', 80, null, 120, 'TOEFL iBT（2026 入学说明）', '院校级英语要求', '新旧 TOEFL 计分版本适用规则见官方页面。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-toefl'),
    ('HK-CUHK', 'sat_ebrw', 'minimum', 'international', 590, null, 800, 'Digital SAT', '院校级英语要求', 'Evidence-Based Reading and Writing。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-sat-ebrw'),
    ('HK-CUHK', 'act_ela', 'minimum', 'international', 23, null, 36, 'ACT ELA', '院校级英语要求', 'ACT English Language Arts。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-act-ela'),
    ('HK-CUHK', 'ib_subject', 'minimum', 'international', 4, null, 7, 'IB English', '院校级英语要求', 'IB English Language 科目成绩。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-ib-english'),
    ('HK-CUHK', 'ib_total', 'minimum', 'international', 30, null, 45, 'IB Diploma', '国际本科通用学术最低要求', 'IB Diploma 总分最低 30/45；课程科目偏好与竞争性要求另行适用。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-ib-total'),
    ('HK-CUHK', 'sat_total', 'minimum', 'international', 1190, null, 1600, 'Digital SAT', '美式课程通用学术最低要求', 'SAT 总分最低 1190；须配合至少两门 AP 各 3 分。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-sat-total'),
    ('HK-CUHK', 'act_composite', 'minimum', 'international', 24, null, 36, 'ACT', '美式课程通用学术最低要求', 'ACT Composite 最低 24；须配合至少两门 AP 各 3 分。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-act-composite'),
    ('HK-CUHK', 'ap_subject', 'minimum', 'international', 3, null, 5, 'AP', '美式课程通用学术最低要求', '至少两门 AP，每门最低 3 分。', 'https://admission.cuhk.edu.hk/application/overseas-other-qualifications-non-local-international-team/requirements/', '2026 entry', 'hk-cuhk-ap-subject'),

    ('HK-HKUST', 'transcript', 'required', 'international', null, null, null, null, null, '提交国际课程或其他获认可学历文件；学校和课程可能另设科目要求。', 'https://join.hkust.edu.hk/admissions/international-qualifications', '2026 entry', 'hk-hkust-transcript'),
    ('HK-HKUST', 'sat_total', 'minimum', 'international', 1190, null, 1600, 'SAT', '国际学历直申路径', '该路径还要求至少两门 AP，每门达到官方所列分数；或使用其他认可学历路径。', 'https://join.hkust.edu.hk/admissions/international-qualifications', '2026 entry', 'hk-hkust-sat'),
    ('HK-HKUST', 'ap_subject', 'minimum', 'international', 3, null, 5, 'AP', '国际学历直申路径', '至少两门 AP；与 SAT 路径一起核验。', 'https://join.hkust.edu.hk/admissions/international-qualifications', '2026 entry', 'hk-hkust-ap'),
    ('HK-HKUST', 'act_composite', 'minimum', 'international', 24, null, 36, 'ACT', '国际学历直申路径', '须符合官网关于单次考试及 Science 的说明。', 'https://join.hkust.edu.hk/admissions/international-qualifications', '2026 entry', 'hk-hkust-act'),
    ('HK-HKUST', 'ielts_academic_overall', 'minimum', 'international', 6, null, 9, 'IELTS Academic', '院校级英语要求', '最终以课程和当年官网规定为准。', 'https://join.hkust.edu.hk/oas/elar.pdf', '2026 entry', 'hk-hkust-ielts'),
    ('HK-HKUST', 'toefl_ibt_total', 'minimum', 'international', 80, null, 120, 'TOEFL iBT', '院校级英语要求', '最终以课程和当年官网规定为准。', 'https://join.hkust.edu.hk/oas/elar.pdf', '2026 entry', 'hk-hkust-toefl'),

    ('HK-POLYU', 'transcript', 'required', 'international', null, null, null, null, null, '提交国际或地区学历文件；个别课程可设置额外专业要求。', 'https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications/international-other-qualifications-english', '2026 entry', 'hk-polyu-transcript'),
    ('HK-POLYU', 'ielts_academic_overall', 'minimum', 'international', 6, null, 9, 'IELTS Academic', '院校级英语要求', '一次考试总分；个别课程可另有规定。', 'https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications/international-other-qualifications-english', '2026 entry', 'hk-polyu-ielts'),
    ('HK-POLYU', 'toefl_ibt_total', 'minimum', 'international', 80, null, 120, 'TOEFL iBT', '院校级英语要求', '一次考试总分；官网列明不接受的考试形式。', 'https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications/international-other-qualifications-english', '2026 entry', 'hk-polyu-toefl'),
    ('HK-POLYU', 'ib_subject', 'minimum', 'international', 4, null, 7, 'IB English / English Literature', '院校级英语要求', 'IB HL 或 SL English / English Literature。', 'https://www.polyu.edu.hk/study/ug/admissions/international-other-qualifications/international-other-qualifications-english', '2026 entry', 'hk-polyu-ib-english'),

    ('HK-CITYU', 'transcript', 'required', 'international', null, null, null, null, null, '提交中学成绩、公开考试成绩和英语能力证明；创意媒体等课程可能要求作品集。', 'https://www.cityu.edu.hk/admo/', '2026/27', 'hk-cityu-transcript'),
    ('HK-CITYU', 'ielts_academic_overall', 'minimum', 'international', 7, null, 9, 'IELTS Academic', '兽医学学士（BVM）课程', '仅 BVM 项目级要求，不代表 CityUHK 所有课程。', 'https://www.cityu.edu.hk/admo/programmes/bachelor-veterinary-medicine', '2026/27', 'hk-cityu-bvm-ielts'),
    ('HK-CITYU', 'toefl_ibt_total', 'minimum', 'international', 100, null, 120, 'TOEFL iBT', '兽医学学士（BVM）课程', '仅 BVM 项目级要求，不代表 CityUHK 所有课程。', 'https://www.cityu.edu.hk/admo/programmes/bachelor-veterinary-medicine', '2026/27', 'hk-cityu-bvm-toefl'),
    ('HK-CITYU', 'ib_total', 'recommended', 'international', 37, null, 45, 'IB Diploma', '兽医学学士（BVM）竞争性参考', '官网标为 indicative competitive score；不是保证录取线。', 'https://www.cityu.edu.hk/admo/programmes/bachelor-veterinary-medicine', '2026/27', 'hk-cityu-bvm-ib'),
    ('HK-CITYU', 'ib_subject', 'minimum', 'international', 4, null, 7, 'IB HL', '兽医学学士（BVM）课程', '数学 HL 4 或数学 SL 5；生物 HL 和化学 HL 均为 4。', 'https://www.cityu.edu.hk/admo/programmes/bachelor-veterinary-medicine', '2026/27', 'hk-cityu-bvm-ib-subject'),

    ('HK-HKBU', 'transcript', 'required', 'international', null, null, null, null, null, '提交中学毕业与公开考试文件；课程可能另设专业条件。', 'https://admissions.hkbu.edu.hk/admissions/international-qualifications.html', '2026 entry', 'hk-hkbu-transcript'),
    ('HK-HKBU', 'ielts_academic_overall', 'minimum', 'international', 6, null, 9, 'IELTS Academic', '院校级英语要求', '总分要求；官网说明考试形式限制。', 'https://admissions.hkbu.edu.hk/admissions/international-qualifications.html', '2026 entry', 'hk-hkbu-ielts'),
    ('HK-HKBU', 'toefl_ibt_total', 'minimum', 'international', 79, null, 120, 'TOEFL iBT', '院校级英语要求', '官网同时列出纸笔考试替代要求。', 'https://admissions.hkbu.edu.hk/admissions/international-qualifications.html', '2026 entry', 'hk-hkbu-toefl'),
    ('HK-HKBU', 'sat_total', 'minimum', 'international', 1190, null, 1600, 'SAT', '美式课程一般入学要求', '该学历路径另要求 AP 或其他规定；最终以当年课程页面为准。', 'https://admissions.hkbu.edu.hk/content/dam/ao-assets/document/download-area/international-qualifications-2026.pdf', '2026 entry', 'hk-hkbu-sat'),
    ('HK-HKBU', 'act_composite', 'minimum', 'international', 23, null, 36, 'ACT', '美式课程一般入学要求', 'ACT 综合分。', 'https://admissions.hkbu.edu.hk/content/dam/ao-assets/document/download-area/international-qualifications-2026.pdf', '2026 entry', 'hk-hkbu-act'),
    ('HK-HKBU', 'ap_subject', 'minimum', 'international', 3, null, 5, 'AP', '美式课程一般入学要求', '至少两门 AP 达到 3 分。', 'https://admissions.hkbu.edu.hk/content/dam/ao-assets/document/download-area/international-qualifications-2026.pdf', '2026 entry', 'hk-hkbu-ap'),

    ('HK-EDUHK', 'transcript', 'required', 'international', null, null, null, null, null, '提交获认可学历、成绩和语言证明；部分中文授课项目另有中文要求。', 'https://www.apply.eduhk.hk/ug/nonlocal', '2026 entry', 'hk-eduhk-transcript'),
    ('HK-EDUHK', 'ielts_academic_overall', 'minimum', 'international', 6, null, 9, 'IELTS Academic', '院校级英语要求', '单次考试总分。', 'https://www.apply.eduhk.hk/ug/nonlocal', '2026 entry', 'hk-eduhk-ielts'),
    ('HK-EDUHK', 'toefl_ibt_total', 'minimum', 'international', 80, null, 120, 'TOEFL iBT（旧量表）', '院校级英语要求', '2026 年 1 月 21 日后的新版量表规则见官网。', 'https://www.apply.eduhk.hk/ug/nonlocal', '2026 entry', 'hk-eduhk-toefl'),
    ('HK-EDUHK', 'sat_ebrw', 'minimum', 'international', 590, null, 800, 'Digital SAT', '院校级英语要求', 'Evidence-Based Reading and Writing。', 'https://www.apply.eduhk.hk/ug/nonlocal', '2026 entry', 'hk-eduhk-sat-ebrw'),
    ('HK-EDUHK', 'ib_subject', 'minimum', 'international', 4, null, 7, 'IB English', '院校级英语要求', '认可的 IB English 科目成绩。', 'https://www.apply.eduhk.hk/ug/nonlocal', '2026 entry', 'hk-eduhk-ib-english'),

    ('HK-LINGNAN', 'transcript', 'required', 'international', null, null, null, null, null, '提交国际/地区学历和成绩文件；英语和课程条件以所申请课程的官方页面为准。', 'https://www.ln.edu.hk/admissions/ug/', '2026 entry', 'hk-lingnan-transcript'),
    ('HK-LINGNAN', 'english_proficiency', 'required', 'international', null, null, null, null, '院校级国际本科申请', '须满足所申课程公布的英语能力和学历条件；当前不以推测数值补齐。', 'https://www.ln.edu.hk/admissions/ug/', '2026 entry', 'hk-lingnan-english'),

    -- United Kingdom: language bands are an institutional minimum or the least demanding published band; individual degree pages may require more.
    ('GB-IMPERIAL', 'transcript', 'required', 'international', null, null, null, null, null, '提交认可学历和满足所申学位的学术成绩；课程页决定具体学术条件。', 'https://www.imperial.ac.uk/study/apply/undergraduate/', '2026/27', 'gb-imperial-transcript'),
    ('GB-IMPERIAL', 'ielts_academic_overall', 'minimum', 'international', 6.5, null, 9, 'IELTS Academic Standard', '院校级英语要求', 'Standard：总分 6.5、各单项 6.0；Higher 课程要求更高。', 'https://www.imperial.ac.uk/study/apply/english-language/', '2026/27', 'gb-imperial-ielts'),
    ('GB-IMPERIAL', 'duolingo_english_test', 'minimum', 'international', 115, null, 160, 'Duolingo English Test Standard', '院校级英语要求', 'Standard：总分 115；Higher 课程要求更高。', 'https://www.imperial.ac.uk/study/apply/english-language/', '2026/27', 'gb-imperial-det'),

    ('GB-OXFORD', 'transcript', 'required', 'international', null, null, null, null, null, '课程页列出相应学历的学术条件；先确认课程对应的 Standard 或 Higher English level。', 'https://www.ox.ac.uk/admissions/undergraduate', '2026/27', 'gb-oxford-transcript'),
    ('GB-OXFORD', 'ielts_academic_overall', 'minimum', 'international', 7, null, 9, 'IELTS Academic Standard', '院校级英语要求', 'Standard：总分 7.0、单项 6.5；Higher：7.5、单项 7.0。', 'https://www.ox.ac.uk/admissions/undergraduate/applying/for-international-students/english-language-requirements-visas', '2026/27', 'gb-oxford-ielts'),
    ('GB-OXFORD', 'toefl_ibt_total', 'minimum', 'international', 100, null, 120, 'TOEFL iBT Standard', '院校级英语要求', 'Standard 旧量表 100；官网说明 2026 年测试版本的接受规则。', 'https://www.ox.ac.uk/admissions/undergraduate/applying/for-international-students/english-language-requirements-visas', '2026/27', 'gb-oxford-toefl'),

    ('GB-CAMBRIDGE', 'transcript', 'required', 'international', null, null, null, null, null, '课程和学院将审核国际学历、科目组合与成绩；所有条件以 offer 为准。', 'https://www.undergraduate.study.cam.ac.uk/', '2026/27', 'gb-cambridge-transcript'),
    ('GB-CAMBRIDGE', 'ielts_academic_overall', 'minimum', 'international', 7.5, null, 9, 'IELTS Academic', '院校级英语要求', '通常要求总分 7.5、各单项 7.0；课程/学院可另设条件。', 'https://www.undergraduate.study.cam.ac.uk/international-students/english-language-requirements', '2026/27', 'gb-cambridge-ielts'),
    ('GB-CAMBRIDGE', 'toefl_ibt_total', 'minimum', 'international', 110, null, 120, 'TOEFL iBT', '院校级英语要求', '通常要求总分 110；各单项要求以官网为准。', 'https://www.undergraduate.study.cam.ac.uk/international-students/english-language-requirements', '2026/27', 'gb-cambridge-toefl'),

    ('GB-UCL', 'transcript', 'required', 'international', null, null, null, null, null, '提交课程认可的国际学历；不同学位对应不同学术和语言等级。', 'https://www.ucl.ac.uk/prospective-students/undergraduate', '2026/27', 'gb-ucl-transcript'),
    ('GB-UCL', 'ielts_academic_overall', 'minimum', 'international', 6.5, null, 9, 'IELTS Academic Standard', '院校级英语要求', 'Standard：总分 6.5、各单项 6.0；其他语言等级更高。', 'https://www.ucl.ac.uk/prospective-students/undergraduate/how-apply/english-language-requirements', '2026/27', 'gb-ucl-ielts'),
    ('GB-UCL', 'toefl_ibt_total', 'minimum', 'international', 92, null, 120, 'TOEFL iBT Level 1（旧量表）', '院校级英语要求', '官网同时列出 2026 年新版量表要求和更高语言等级。', 'https://www.ucl.ac.uk/prospective-students/undergraduate/how-apply/english-language-requirements', '2026/27', 'gb-ucl-toefl'),

    ('GB-EDINBURGH', 'transcript', 'required', 'international', null, null, null, null, null, '学术与英语要求按学位列示；使用 Degree Finder 核对对应课程。', 'https://www.ed.ac.uk/studying/undergraduate/applying/requirements/english-language', '2026/27', 'gb-edinburgh-transcript'),
    ('GB-EDINBURGH', 'english_proficiency', 'required', 'international', null, null, null, null, '课程分档英语要求', '英语最低要求由具体学位的 entry requirements 决定；不以推测分数补齐。', 'https://www.ed.ac.uk/studying/undergraduate/applying/requirements/english-language', '2026/27', 'gb-edinburgh-english'),
    ('GB-EDINBURGH', 'ielts_academic_overall', 'minimum', 'international', 6.5, null, 9, 'IELTS Academic', 'Computer Science and Mathematics BSc（2026）', '该课程公开线为总分 6.5、各单项最低 5.5；仅作项目级参考。', 'https://study.ed.ac.uk/programmes/undergraduate/2026/64-computer-science-and-mathematics/entry-requirements', '2026 entry', 'gb-edinburgh-cs-ielts'),
    ('GB-EDINBURGH', 'toefl_ibt_total', 'minimum', 'international', 92, null, 120, 'TOEFL iBT（旧量表）', 'Computer Science and Mathematics BSc（2026）', '该课程公开线为总分 92、各单项最低 20；仅作项目级参考。', 'https://study.ed.ac.uk/programmes/undergraduate/2026/64-computer-science-and-mathematics/entry-requirements', '2026 entry', 'gb-edinburgh-cs-toefl'),

    ('GB-KCL', 'transcript', 'required', 'international', null, null, null, null, null, '提交相应国际学历和成绩；课程页列出学术与英语 Band。', 'https://www.kcl.ac.uk/study/undergraduate', '2026/27', 'gb-kcl-transcript'),
    ('GB-KCL', 'ielts_academic_overall', 'minimum', 'international', 6.5, null, 9, 'IELTS Academic Band C', '院校级英语要求', 'Band C：总分 6.5、各单项 6.0；Band A/B 课程更高。', 'https://www.kcl.ac.uk/study/undergraduate/how-to-apply/english-language-requirements', '2026/27', 'gb-kcl-ielts'),
    ('GB-KCL', 'toefl_ibt_total', 'minimum', 'international', 92, null, 120, 'TOEFL iBT Band C（旧量表）', '院校级英语要求', 'Band C 旧量表 92；官网同时列出 2026 年新版量表。', 'https://www.kcl.ac.uk/study/undergraduate/how-to-apply/english-language-requirements', '2026/27', 'gb-kcl-toefl'),

    ('GB-MANCHESTER', 'transcript', 'required', 'international', null, null, null, null, null, '不同课程和学历体系的学术、英语条件均在课程页面披露。', 'https://www.manchester.ac.uk/study/undergraduate/applications/entry-requirements/', '2026/27', 'gb-manchester-transcript'),
    ('GB-MANCHESTER', 'english_proficiency', 'required', 'international', null, null, null, null, '课程级英语要求', '请按课程页面确认英语语言等级；不同学位不应合并为一个统一分数。', 'https://www.manchester.ac.uk/study/undergraduate/applications/entry-requirements/', '2026/27', 'gb-manchester-english'),
    ('GB-MANCHESTER', 'ielts_academic_overall', 'minimum', 'international', 7, null, 9, 'IELTS Academic', 'BSc Computer Science（2026）', '该课程公开线为总分 7.0、各单项最低 6.5；仅作项目级参考。', 'https://www.manchester.ac.uk/study/undergraduate/courses/2026/00560/bsc-computer-science/', '2026 entry', 'gb-manchester-cs-ielts'),
    ('GB-MANCHESTER', 'toefl_ibt_total', 'minimum', 'international', 100, null, 120, 'TOEFL iBT（旧量表）', 'BSc Computer Science（2026）', '该课程公开线为总分 100、各单项最低 22；仅作项目级参考。', 'https://www.manchester.ac.uk/study/undergraduate/courses/2026/00560/bsc-computer-science/', '2026 entry', 'gb-manchester-cs-toefl'),
    ('GB-MANCHESTER', 'ib_total', 'recommended', 'international', 38, null, 45, 'IB Diploma', 'BSc Computer Science（2026）典型 offer', '该课程典型 offer 为总分 38，三门 HL 为 7、7、6；不是所有课程统一分数。', 'https://www.manchester.ac.uk/study/undergraduate/courses/2026/00560/bsc-computer-science/', '2026 entry', 'gb-manchester-cs-ib-total'),

    ('GB-BRISTOL', 'transcript', 'required', 'international', null, null, null, null, null, '提交相应国际学历和成绩；学术及语言 Profile 由课程页面确定。', 'https://www.bristol.ac.uk/study/undergraduate/', '2026/27', 'gb-bristol-transcript'),
    ('GB-BRISTOL', 'english_proficiency', 'required', 'international', null, null, null, null, '课程 Profile 英语要求', '各课程对应不同英语 Profile；仅显示官网已明确的项目分数，避免错误统一化。', 'https://www.bristol.ac.uk/study/language-requirements/', '2026/27', 'gb-bristol-english'),
    ('GB-BRISTOL', 'ielts_academic_overall', 'minimum', 'international', 6.5, null, 9, 'IELTS Academic Profile E', 'BSc Computer Science（2026）', '该课程使用 Profile E：总分 6.5、各单项最低 6.0；仅作项目级参考。', 'https://www.bristol.ac.uk/study/undergraduate/2026/computer-science/bsc-computer-science/', '2026 entry', 'gb-bristol-cs-ielts'),
    ('GB-BRISTOL', 'ib_total', 'recommended', 'international', 38, null, 45, 'IB Diploma', 'BSc Computer Science（2026）典型 offer', '该课程典型 offer 为总分 38、三门 HL 合计 18，HL 数学为 7；不是所有课程统一分数。', 'https://www.bristol.ac.uk/study/undergraduate/2026/computer-science/bsc-computer-science/', '2026 entry', 'gb-bristol-cs-ib-total'),

    ('GB-LSE', 'transcript', 'required', 'international', null, null, null, null, null, '提交国际学历和课程要求的学术科目；LSE 按课程评估。', 'https://www.lse.ac.uk/study-at-lse/Undergraduate/Prospective-Students/How-to-Apply/entry-requirements', '2026 entry', 'gb-lse-transcript'),
    ('GB-LSE', 'ib_total', 'minimum', 'international', 37, null, 45, 'IB Diploma', '本科课程公开学术区间', '本科课程公开区间为 37–39，总计三门 HL 通常为 666–766；以具体学位为准。', 'https://www.lse.ac.uk/study-at-lse/Undergraduate/Prospective-Students/How-to-Apply/entry-requirements', '2026 entry', 'gb-lse-ib'),
    ('GB-LSE', 'ielts_academic_overall', 'minimum', 'international', 7, null, 9, 'IELTS Academic', '院校级英语要求', '总分及各单项 7.0；结果须在指定有效期内。', 'https://www.lse.ac.uk/study-at-lse/Undergraduate/Prospective-Students/How-to-Apply/English-language-requirements', '2026 entry', 'gb-lse-ielts'),
    ('GB-LSE', 'toefl_ibt_total', 'minimum', 'international', 100, null, 120, 'TOEFL iBT（旧量表）', '院校级英语要求', '官网列出各单项要求及 2026 年新版量表。', 'https://www.lse.ac.uk/study-at-lse/Undergraduate/Prospective-Students/How-to-Apply/English-language-requirements', '2026 entry', 'gb-lse-toefl'),

    ('GB-WARWICK', 'transcript', 'required', 'international', null, null, null, null, null, '课程页面披露国际学历、学术成绩和英语条件。', 'https://warwick.ac.uk/study/undergraduate/apply/entry-requirements/', '2026/27', 'gb-warwick-transcript'),
    ('GB-WARWICK', 'english_proficiency', 'required', 'international', null, null, null, null, '课程级英语要求', '课程可采用不同语言等级；请在最终申请前查看所选课程当年页面。', 'https://warwick.ac.uk/study/undergraduate/apply/entry-requirements/', '2026/27', 'gb-warwick-english'),
    ('GB-WARWICK', 'ielts_academic_overall', 'minimum', 'international', 6, null, 9, 'IELTS Academic Band A', 'Band A 英语要求', 'Band A 为总分 6.0、各单项最低 5.5；适用等级由课程页确定。', 'https://warwick.ac.uk/study/undergraduate/applying/english-language-requirements/', '2026/27', 'gb-warwick-band-a-ielts'),
    ('GB-WARWICK', 'toefl_ibt_total', 'minimum', 'international', 87, null, 120, 'TOEFL iBT Band A（旧量表）', 'Band A 英语要求', 'Band A 旧量表总分 87；适用等级由课程页确定。', 'https://warwick.ac.uk/study/undergraduate/applying/english-language-requirements/', '2026/27', 'gb-warwick-band-a-toefl')
)
insert into public.admission_requirements (
  program_id,
  source_id,
  metric,
  requirement_kind,
  applicant_scope,
  application_path,
  minimum_score,
  maximum_score,
  score_scale,
  test_version,
  subject_area,
  value_text,
  source_record_key,
  is_published
)
select
  program.id,
  source.id,
  seed.metric,
  seed.requirement_kind,
  seed.applicant_scope,
  'first_year',
  seed.minimum_score::numeric,
  seed.maximum_score::numeric,
  seed.score_scale::numeric,
  seed.test_version,
  seed.subject_area,
  seed.value_text,
  seed.source_record_key,
  true
from requirement_seed as seed
join public.institutions as institution on institution.ipeds_unitid = seed.ipeds_unitid
join public.undergraduate_programs as program
  on program.institution_id = institution.id
  and program.program_name = '国际本科申请基准（院校级）'
  and program.degree_name = 'Bachelor'
join public.data_sources as source
  on source.source_url = seed.source_url
  and source.source_year = seed.source_year
on conflict (program_id, source_id, source_record_key) do update
set
  metric = excluded.metric,
  requirement_kind = excluded.requirement_kind,
  applicant_scope = excluded.applicant_scope,
  application_path = excluded.application_path,
  minimum_score = excluded.minimum_score,
  maximum_score = excluded.maximum_score,
  score_scale = excluded.score_scale,
  test_version = excluded.test_version,
  subject_area = excluded.subject_area,
  value_text = excluded.value_text,
  is_published = true,
  updated_at = now();

commit;
