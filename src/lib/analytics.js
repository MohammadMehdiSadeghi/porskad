// ════════════════════════════════════════════════════════════════
// آنالیتیکس گروهی فیلد چندانتخابی — Multi-Select Analytics
// اسپک: multi-select-analytics-spec.md
// ════════════════════════════════════════════════════════════════
// سه خروجی:
//   ۱. Member-level (خام) — هر ردیف = یک پاسخ کاربر
//   ۲. Frequency — شمارش هر گزینه به تفکیک هر سطح شناسه (Pivot-ready)
//   ۳. Union — گزینه‌های یکتای انتخاب‌شده per سطح
// + پرچم invalid_record: رکوردهایی که selected_count > max_selections
// ════════════════════════════════════════════════════════════════

/**
 * شناسایی رکوردهای نامعتبر (جنبه‌ی ۳ اسپک)
 * selected_count > max_selectable یا selected_count === 0 برای فیلد اجباری
 */
export function getInvalidRecords(questions, answers, responses) {
  const multiSelectQs = questions.filter(
    (q) => q.type === "choice" && (q.max_selections ?? 1) > 1
  );
  if (!multiSelectQs.length) return [];

  const qMap = new Map(questions.map((q) => [q.id, q]));
  const invalid = [];

  for (const a of answers) {
    const q = qMap.get(a.question_id);
    if (!q || q.type !== "choice" || (q.max_selections ?? 1) <= 1) continue;
    if (a.value === null || a.value === undefined) continue;

    const arr = Array.isArray(a.value) ? a.value : [a.value];
    const maxSel = q.max_selections ?? 1;
    const isRequired = q.required;

    if (arr.length > maxSel) {
      invalid.push({
        response_id: a.response_id,
        question_id: a.question_id,
        question_title: q.title,
        selected_options: arr,
        selected_count: arr.length,
        max_selectable: maxSel,
        reason: `تعداد انتخاب‌ها (${arr.length}) بیش از حد مجاز (${maxSel})`,
        type: "over_limit",
      });
    } else if (isRequired && arr.length === 0) {
      invalid.push({
        response_id: a.response_id,
        question_id: a.question_id,
        question_title: q.title,
        selected_options: [],
        selected_count: 0,
        max_selectable: maxSel,
        reason: "فیلد اجباری خالی است",
        type: "empty_required",
      });
    }
  }

  return invalid;
}

/**
 * گزارش سطح ۱ (Member-level) — هر ردیف = یک پاسخ کاربر
 *
 * @param {Array} questions — سوالات فرم
 * @param {Array} answers — همه پاسخ‌های answers
 * @param {Array} responses — همه responses (با متادیتا)
 * @param {Array} identifierMapping — [{level, field_id, label}] از form.identifier_mapping
 * @param {string|null} multiSelectFieldId — id فیلد چندانتخابی موردنظر (یا null برای همه)
 * @returns {Array} — [{response_id, submitted_at, identifiers: [{level, field_id, value}], selected_options, selected_count, field_id, question_title, is_invalid}]
 */
export function getMemberLevelReport({
  questions,
  answers,
  responses,
  identifierMapping = [],
  multiSelectFieldId = null,
}) {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const rMap = new Map(responses.map((r) => [r.id, r]));
  const idFieldIds = new Set(
    (identifierMapping || []).map((m) => m.field_id)
  );

  // همه answers مربوط به فیلدهای چندانتخابی
  const multiQs = questions.filter(
    (q) => q.type === "choice" && (q.max_selections ?? 1) > 1
  );
  const targetQs = multiSelectFieldId
    ? multiQs.filter((q) => q.id === multiSelectFieldId)
    : multiQs;

  if (!targetQs.length) return [];

  const targetQIds = new Set(targetQs.map((q) => q.id));
  // همه answers مربوط به فیلدهای شناسه
  const idAnswers = {};
  const multiAnswers = [];

  for (const a of answers) {
    if (idFieldIds.has(a.question_id)) {
      if (!idAnswers[a.response_id]) idAnswers[a.response_id] = {};
      idAnswers[a.response_id][a.question_id] = a.value;
    }
    if (targetQIds.has(a.question_id)) {
      multiAnswers.push(a);
    }
  }

  const rows = [];
  for (const a of multiAnswers) {
    const r = rMap.get(a.response_id);
    const q = qMap.get(a.question_id);
    if (!r || !q) continue;

    const arr = Array.isArray(a.value) ? a.value : a.value != null ? [a.value] : [];
    const maxSel = q.max_selections ?? 1;
    const isInvalid = arr.length > maxSel;

    const identifiers = (identifierMapping || []).map((m) => ({
      level: m.level,
      field_id: m.field_id,
      label: m.label,
      value: idAnswers[a.response_id]?.[m.field_id] ?? "—",
    }));

    rows.push({
      response_id: a.response_id,
      submitted_at: r.submitted_at || r.created_at,
      identifiers,
      selected_options: arr,
      selected_count: arr.length,
      max_selectable: maxSel,
      field_id: q.id,
      question_title: q.title,
      is_invalid: isInvalid,
    });
  }

  return rows;
}

/**
 * گزارش سطح بالاتر — Frequency Count
 * تعداد دفعاتی که هر گزینه به تفکیک هر مقدار سطح انتخاب شده
 *
 * @param {Array} memberLevelRows — خروجی getMemberLevelReport
 * @param {number} level — سطح شناسه (مثلاً ۱ برای فرد، ۲ برای تیم)
 * @param {Array} identifierMapping — [{level, field_id, label}]
 * @returns {Array} — [{level_value, option_id, option_label, vote_count}]
 */
export function getFrequencyReport(memberLevelRows, level, identifierMapping) {
  const levelDef = (identifierMapping || []).find((m) => m.level === level);
  if (!levelDef) return [];

  const counts = {}; // { level_value: { option_id: count } }

  for (const row of memberLevelRows) {
    const idVal = row.identifiers.find((id) => id.level === level)?.value ?? "—";
    if (!counts[idVal]) counts[idVal] = {};
    for (const opt of row.selected_options) {
      counts[idVal][opt] = (counts[idVal][opt] || 0) + 1;
    }
  }

  // جمع‌آوری همه option_idها
  const allOptions = new Set();
  for (const idVal of Object.keys(counts)) {
    for (const opt of Object.keys(counts[idVal])) {
      allOptions.add(opt);
    }
  }
  const sortedOptions = [...allOptions].sort();

  const rows = [];
  for (const [levelValue, optionCounts] of Object.entries(counts)) {
    for (const opt of sortedOptions) {
      rows.push({
        level_value: levelValue,
        option_id: opt,
        vote_count: optionCounts[opt] || 0,
      });
    }
  }

  return rows;
}

/**
 * Pivot — تبدیل Frequency Report به جدول محوری
 * سطر = مقدار سطح، ستون = option_id
 */
export function getPivotTable(frequencyRows) {
  const pivot = {}; // { level_value: { option_id: count } }
  const allOptions = new Set();

  for (const row of frequencyRows) {
    if (!pivot[row.level_value]) pivot[row.level_value] = {};
    pivot[row.level_value][row.option_id] = row.vote_count;
    allOptions.add(row.option_id);
  }

  const sortedOptions = [...allOptions].sort();
  const result = [];
  for (const [levelValue, optCounts] of Object.entries(pivot)) {
    const row = { level_value: levelValue };
    for (const opt of sortedOptions) {
      row[opt] = optCounts[opt] || 0;
    }
    result.push(row);
  }

  return result;
}

/**
 * گزارش سطح بالاتر — Union
 * لیست گزینه‌های یکتایی که حداقل یک رکورد در آن مقدار سطح انتخاب کرده
 */
export function getUnionReport(memberLevelRows, level, identifierMapping) {
  const levelDef = (identifierMapping || []).find((m) => m.level === level);
  if (!levelDef) return [];

  const unions = {}; // { level_value: Set<option_id> }

  for (const row of memberLevelRows) {
    const idVal = row.identifiers.find((id) => id.level === level)?.value ?? "—";
    if (!unions[idVal]) unions[idVal] = new Set();
    for (const opt of row.selected_options) {
      unions[idVal].add(opt);
    }
  }

  return Object.entries(unions).map(([levelValue, optionsSet]) => ({
    level_value: levelValue,
    selected_options_union: [...optionsSet].sort(),
    count: optionsSet.size,
  }));
}

/**
 * تمام سطوح شناسه‌ای که در identifier_mapping تعریف شده
 */
export function getAvailableLevels(identifierMapping) {
  if (!identifierMapping || !Array.isArray(identifierMapping)) return [];
  return identifierMapping
    .map((m) => ({ level: m.level, label: m.label, field_id: m.field_id }))
    .sort((a, b) => a.level - b.level);
}

/**
 * تبدیل آرایه‌ی گزینه‌ها به لیبل برای CSV/Excel
 */
export function formatOptionsForExport(options) {
  if (!Array.isArray(options)) return "";
  return options.join(", ");
}