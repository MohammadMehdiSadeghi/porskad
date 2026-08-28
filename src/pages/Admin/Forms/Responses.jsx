import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import EmptyState from "../../../components/ui/EmptyState";
import StickerCard from "../../../components/ui/StickerCard";
import { useToast } from "../../../components/ui/Toast";
import { useAuth } from "../../../context/AuthContext";
import { downloadCsv } from "../../../lib/csv";
import { downloadExcel } from "../../../lib/excel";
import {
  faNum,
  faDateTime,
  faDuration,
  DEVICE_FA,
} from "../../../lib/utils";
import { QUESTION_TYPES } from "../../../lib/questionTypes";
import { isCorrectAnswer, calculateScore, hasScoring } from "../../../lib/scoring";
import {
  Eye,
  Download,
  ArrowLeft,
  Search,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessagesSquare,
  SearchX,
  Inbox,
  Puzzle,
  Award,
  Target,
  BarChart2,
  Users,
  Calendar,
  Zap,
} from "lucide-react";
import SEO from "../../../components/ui/SEO";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#14b8a6", "#f97316"];

// ─── نمایش مقدار پاسخ ───
function AnswerValue({ question, value }) {
  if (value === null || value === undefined || value === "") return <span className="text-ink/40">—</span>;
  if (question.type === "rating") return <span>{"⭐".repeat(Number(value))}</span>;
  if (question.type === "checkbox" && Array.isArray(value)) return <span className="font-medium">{value.join("، ")}</span>;
  if (question.type === "phone_ir" || question.type === "email")
    return <span dir="ltr" className="font-mono font-bold">{String(value)}</span>;
  return <span className="font-medium whitespace-pre-wrap">{String(value)}</span>;
}

// ─── نشانگر درست/غلط ───
function CorrectnessBadge({ question, answer }) {
  if (!question.correct_answer || !question.points) return null;
  const correct = isCorrectAnswer(question, answer);
  return (
    <span className={`inline-flex items-center gap-1 text-[0.6rem] font-black px-2 py-0.5 rounded-full ${
      correct ? "bg-teal/15 text-teal-text border border-teal/30" : "bg-magenta/15 text-magenta-text border border-magenta/30"
    }`}>
      {correct ? "✓ صحیح" : "✕ غلط"}
    </span>
  );
}

// ─── تحلیل هر سوال ───
function QuestionAnalysis({ question, answers, totalResponses }) {
  const values = answers.map((a) => a.value).filter((v) => v !== null && v !== undefined && v !== "");
  const total = values.length;
  const completionRate = totalResponses > 0 ? Math.round((total / totalResponses) * 100) : 0;
  const times = answers.map((a) => a.time_spent_seconds).filter((t) => t > 0);
  const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  // ─── توزیع گزینه‌ها (choice / yes_no / checkbox) ───
  const dist = useMemo(() => {
    let keys;
    if (question.type === "choice") keys = question.options ?? [];
    else if (question.type === "yes_no") keys = ["بله", "خیر"];
    else if (question.type === "checkbox") keys = question.options ?? [];
    else if (question.type === "rating") keys = [5, 4, 3, 2, 1];
    if (!keys) return null;

    const isCheckbox = question.type === "checkbox";
    const counts = Object.fromEntries(keys.map((k) => [String(k), 0]));

    for (const v of values) {
      if (isCheckbox && Array.isArray(v)) {
        for (const item of v) {
          const k = String(item);
          if (k in counts) counts[k]++;
        }
      } else {
        const k = String(v);
        if (k in counts) counts[k]++;
      }
    }

    // برای checkbox، denominator تعداد پاسخ‌دهندگانه نه تعداد انتخاب‌ها
    const denom = isCheckbox ? total : total;

    return keys.map((k) => ({
      key: k,
      count: counts[String(k)],
      pct: denom ? Math.round((counts[String(k)] / denom) * 100) : 0,
    }));
  }, [question, values, total]);

  // ─── آمار عددی ───
  const numericStats = useMemo(() => {
    if (question.type !== "number" && question.type !== "rating") return null;
    const nums = values.map((v) => Number(v)).filter((n) => !isNaN(n));
    if (!nums.length) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const variance = nums.reduce((acc, n) => acc + Math.pow(n - avg, 2), 0) / nums.length;
    const stdDev = Math.sqrt(variance);
    return { avg: avg.toFixed(1), median, min, max, stdDev: stdDev.toFixed(1), count: nums.length };
  }, [question.type, values]);

  // ─── نرخ پاسخ صحیح ───
  const correctRate = useMemo(() => {
    if (!question.correct_answer || !question.points) return null;
    const answered = answers.filter((a) => a.value !== null && a.value !== undefined && a.value !== "");
    if (!answered.length) return null;
    const correctCount = answered.filter((a) => isCorrectAnswer(question, a.value)).length;
    return {
      correct: correctCount,
      total: answered.length,
      pct: Math.round((correctCount / answered.length) * 100),
    };
  }, [question, answers]);

  return (
    <div className="bg-white rounded-xl border border-ink/10 p-5">
      {/* هدر */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <h4 className="font-bold text-navy flex items-center gap-2">
            <span>{QUESTION_TYPES[question.type]?.icon}</span>
            {question.title}
            {question.correct_answer && question.points && (
              <Badge color="teal" rotate="0">🎯 {faNum(question.points)} نمره</Badge>
            )}
          </h4>
          <p className="text-xs text-ink/40 mt-0.5">
            {QUESTION_TYPES[question.type]?.label || question.type}
          </p>
        </div>
        <Badge color="indigo">{faNum(total)} جواب</Badge>
      </div>

      {/* نوار آمار سریع */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[0.65rem] font-bold text-ink/50 bg-bg-neutral px-2 py-1 rounded-full">
          📊 نرخ پاسخ: {faNum(completionRate)}٪
        </span>
        {avgTime !== null && avgTime > 0 && (
          <span className="text-[0.65rem] font-bold text-ink/50 bg-bg-neutral px-2 py-1 rounded-full">
            ⏱ میانگین: {faDuration(avgTime)}
          </span>
        )}
        {correctRate && (
          <span className={`text-[0.65rem] font-bold px-2 py-1 rounded-full ${
            correctRate.pct >= 70 ? "text-teal-text bg-teal/10" : correctRate.pct >= 40 ? "text-orange bg-orange/10" : "text-magenta-text bg-magenta/10"
          }`}>
            🎯 نرخ صحیح: {faNum(correctRate.pct)}٪ ({faNum(correctRate.correct)}/{faNum(correctRate.total)})
          </span>
        )}
      </div>

      {total === 0 && (
        <p className="text-sm text-ink/40">هنوز جوابی ثبت نشده.</p>
      )}

      {/* نمودار توزیع */}
      {dist && total > 0 && (
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-2">
            {dist.map((d, i) => (
              <div key={String(d.key)} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs font-medium text-ink/70 truncate" title={String(d.key)}>
                  {question.type === "rating" ? "⭐".repeat(Number(d.key)) : String(d.key).slice(0, 15)}
                </span>
                <div className="flex-1 h-6 bg-bg-neutral rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${d.pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                </div>
                <span className="w-20 text-xs font-bold text-navy text-left flex items-center gap-1" dir="ltr">
                  {d.count} <span className="text-ink/40">({d.pct}٪)</span>
                </span>
              </div>
            ))}
          </div>
          <div className="w-28 shrink-0 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={110}>
              <PieChart>
                <Pie
                  data={dist}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={42}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {dist.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} پاسخ`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-[0.6rem] text-ink/40">توزیع پاسخ‌ها</p>
          </div>
        </div>
      )}

      {/* آمار عددی */}
      {numericStats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
          <MiniStat label="میانگین" value={numericStats.avg} />
          <MiniStat label="میانگه" value={numericStats.median} />
          <MiniStat label="حداکثر" value={numericStats.max} />
          <MiniStat label="حداقل" value={numericStats.min} />
          <MiniStat label="انحراف معیار" value={numericStats.stdDev} />
          <MiniStat label="تعداد" value={numericStats.count} />
        </div>
      )}

      {/* لیست پاسخ‌های متنی */}
      {!dist && !numericStats && total > 0 && (
        <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5">
          {values.slice(0, 20).map((v, i) => (
            <div key={i} className="bg-bg-neutral border border-ink/10 rounded-lg px-3 py-1.5 text-xs font-medium text-ink flex items-center gap-2">
              <span className="text-ink/30 font-mono">{i + 1}.</span>
              <span className="truncate">{String(v).slice(0, 80)}</span>
            </div>
          ))}
          {values.length > 20 && (
            <span className="text-[0.6rem] text-ink/40 text-center">+ {faNum(values.length - 20)} پاسخ دیگر</span>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-bg-neutral rounded-lg px-2 py-1.5 text-center">
      <p className="text-[0.6rem] text-ink/40">{label}</p>
      <p className="text-xs font-bold text-navy">{value}</p>
    </div>
  );
}

// ─── تحلیل فردی یک پاسخ ───
function PersonAnalytics({ response, questions, answersByResponse, allAnswers, questionById }) {
  const rAnswers = answersByResponse[response.id] ?? [];
  const scored = hasScoring(questions);

  const scoreData = useMemo(() => {
    if (!scored) return null;
    const answersObj = {};
    for (const a of rAnswers) {
      answersObj[a.question_id] = a.value;
    }
    return calculateScore(questions, answersObj);
  }, [scored, rAnswers, questions]);

  // مقایسه با میانگین
  const comparison = useMemo(() => {
    if (!scored || !scoreData) return null;
    // میانگین نمره بقیه
    const otherResponses = allAnswers.length > 0 ? rAnswers : [];
    return null; // TODO: implement when we have all scores
  }, [scored, scoreData, rAnswers, allAnswers]);

  return (
    <div className="flex flex-col gap-4">
      {/* اطلاعات فرد */}
      <div className="bg-bg-lavender/50 rounded-xl p-4 border border-navy/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-black text-sm">
            <Users size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-navy">پاسخ‌دهنده</h4>
            <p className="text-xs text-ink/50">{faDateTime(response.submitted_at || response.created_at)}</p>
          </div>
          <div className="mr-auto flex items-center gap-2">
            {response.duration_seconds > 0 && (
              <span className="text-xs font-bold text-ink/50 bg-white px-2 py-1 rounded-full">
                ⏱ {faDuration(response.duration_seconds)}
              </span>
            )}
            <span className="text-xs font-bold text-ink/50 bg-white px-2 py-1 rounded-full">
              {DEVICE_FA[response.device] ?? response.device ?? "—"}
            </span>
          </div>
        </div>

        {/* نمره */}
        {scoreData && (
          <div className={`flex items-center gap-4 p-3 rounded-xl border-2 ${
            scoreData.total > 0 && (scoreData.score / scoreData.total) >= 0.7
              ? "bg-teal/5 border-teal/30"
              : (scoreData.score / scoreData.total) >= 0.4
                ? "bg-orange/5 border-orange/30"
                : "bg-magenta/5 border-magenta/30"
          }`}>
            <div className="flex items-center gap-2">
              <Award size={20} className={
                (scoreData.score / scoreData.total) >= 0.7 ? "text-teal-text" :
                (scoreData.score / scoreData.total) >= 0.4 ? "text-orange" : "text-magenta-text"
              } />
              <div>
                <p className="text-xs font-bold text-ink/50">نمره</p>
                <p className="text-lg font-black text-navy">
                  {faNum(scoreData.score)} <span className="text-sm text-ink/40">از {faNum(scoreData.total)}</span>
                </p>
              </div>
            </div>
            <div className="mr-auto flex items-center gap-1">
              <div className="w-16 h-2 bg-ink/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${scoreData.total > 0 ? (scoreData.score / scoreData.total) * 100 : 0}%`,
                    backgroundColor: (scoreData.score / scoreData.total) >= 0.7 ? "#10b981" :
                      (scoreData.score / scoreData.total) >= 0.4 ? "#f59e0b" : "#ec4899"
                  }}
                />
              </div>
              <span className="text-xs font-bold text-navy">
                {faNum(Math.round((scoreData.score / scoreData.total) * 100))}٪
              </span>
            </div>
          </div>
        )}
      </div>

      {/* جزئیات پاسخ‌ها */}
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => {
          const a = rAnswers.find((x) => x.question_id === q.id);
          const correct = q.correct_answer && q.points ? isCorrectAnswer(q, a?.value) : null;
          const answered = a?.value !== null && a?.value !== undefined && a?.value !== "";

          return (
            <div key={q.id} className={`border rounded-xl p-3 transition-colors ${
              correct === true ? "border-teal/30 bg-teal/5" :
              correct === false ? "border-magenta/30 bg-magenta/5" :
              "border-ink/10 bg-white"
            }`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                  <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-navy/10 text-[0.6rem] font-black">
                    {i + 1}
                  </span>
                  {q.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {q.points > 0 && (
                    <span className="text-[0.6rem] font-bold text-ink/40">{faNum(q.points)} نمره</span>
                  )}
                  <CorrectnessBadge question={q} answer={a?.value} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-ink flex-1">
                  {answered ? (
                    <AnswerValue question={q} value={a?.value} />
                  ) : (
                    <span className="text-ink/30 text-xs">پاسخی داده نشده</span>
                  )}
                </div>

                {/* نشان دادن گزینه صحیح اگر غلط جواب داده */}
                {correct === false && q.correct_answer && (
                  <span className="text-[0.6rem] font-bold text-teal-text bg-teal/10 px-2 py-0.5 rounded-full shrink-0">
                    پاسخ صحیح: {Array.isArray(q.correct_answer) ? q.correct_answer.join("، ") : String(q.correct_answer)}
                  </span>
                )}
              </div>

              {a?.time_spent_seconds > 0 && (
                <span className="text-[0.6rem] text-ink/30 mt-1 block">
                  ⏱ {faDuration(a.time_spent_seconds)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── صفحه اصلی ───
export default function Responses() {
  const { id } = useParams();
  const { push } = useToast();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [tab, setTab] = useState("list");
  const [detail, setDetail] = useState(null);
  const [onlyComplete, setOnlyComplete] = useState(false);
  const [search, setSearch] = useState("");

  const PAGE_SIZE = 500;
  const ANSWER_CHUNK = 100;

  async function load() {
    try {
      let allResponses = [];
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from("responses")
          .select("*")
          .eq("form_id", id)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        allResponses = allResponses.concat(data ?? []);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const [{ data: f, error: formError }, { data: qs, error: qError }] =
        await Promise.all([
          supabase.from("forms").select("*").eq("id", id).maybeSingle(),
          supabase.from("questions").select("*").eq("form_id", id).order("position"),
        ]);
      if (formError) throw formError;
      if (qError) throw qError;

      setForm(f);
      setQuestions(qs ?? []);
      setResponses(allResponses);

      let allAnswers = [];
      if (allResponses.length) {
        const ids = allResponses.map((r) => r.id);
        for (let i = 0; i < ids.length; i += ANSWER_CHUNK) {
          const chunk = ids.slice(i, i + ANSWER_CHUNK);
          const { data: ans, error: ansError } = await supabase
            .from("answers")
            .select("id, response_id, question_id, value, time_spent_seconds")
            .in("response_id", chunk);
          if (ansError) throw ansError;
          allAnswers = allAnswers.concat(ans ?? []);
        }
      }
      setAnswers(allAnswers);
    } catch (err) {
      console.error("load error:", err);
      push("خطا در بارگذاری پاسخ‌ها: " + (err.message || ""), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`responses-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `form_id=eq.${id}` },
        () => { push("پاسخ جدیدی ثبت شد!", "info"); load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const answersByResponse = useMemo(() => {
    const map = {};
    for (const a of answers) { (map[a.response_id] ??= []).push(a); }
    return map;
  }, [answers]);

  const questionById = useMemo(() => Object.fromEntries(questions.map((q) => [q.id, q])), [questions]);

  const filtered = useMemo(() => {
    let result = onlyComplete ? responses.filter((r) => r.is_complete) : responses;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((r) => {
        const rAns = answersByResponse[r.id] ?? [];
        return rAns.some((a) => {
          const q = questionById[a.question_id];
          return q && a.value !== null && String(a.value).toLowerCase().includes(s);
        });
      });
    }
    return result;
  }, [responses, onlyComplete, search, answersByResponse, questionById]);

  // ─── آمار کلی ───
  const stats = useMemo(() => {
    const complete = responses.filter((r) => r.is_complete);
    const durations = complete.map((r) => r.duration_seconds).filter((d) => d > 0);
    const now = new Date();
    const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayStr = localDateStr(now);
    const today = responses.filter((r) => localDateStr(new Date(r.submitted_at || r.created_at)) === todayStr);

    // آمار نمره‌دهی
    let scoreStats = null;
    if (hasScoring(questions)) {
      const scores = [];
      for (const r of complete) {
        const rAns = answersByResponse[r.id] ?? [];
        const ansObj = {};
        for (const a of rAns) ansObj[a.question_id] = a.value;
        const s = calculateScore(questions, ansObj);
        if (s.total > 0) scores.push(s);
      }
      if (scores.length) {
        const allScores = scores.map((s) => s.score);
        const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        const max = Math.max(...allScores);
        const min = Math.min(...allScores);
        scoreStats = { count: scores.length, avg: avg.toFixed(1), max, min };
      }
    }

    return {
      total: responses.length,
      complete: complete.length,
      today: today.length,
      avg: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
      scoreStats,
    };
  }, [responses, questions, answersByResponse]);

  // ─── داده نمودار روند (۳۰ روز اخیر) ───
  const trendData = useMemo(() => {
    const days = 30;
    const now = new Date();
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      buckets.push({ date: key, count: 0 });
    }
    const dateStr = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    for (const r of responses) {
      const d = new Date(r.submitted_at || r.created_at);
      const key = dateStr(d);
      const bucket = buckets.find((b) => b.date === key);
      if (bucket) bucket.count++;
    }
    return buckets;
  }, [responses]);

  function exportData(format = "csv") {
    if (!hasPermission("export_excel") && format === "excel") {
      push("شما مجوز خروجی اکسل ندارید.", "error");
      return;
    }
    const header = [
      "شناسه پاسخ", "زمان ثبت", "تکمیل‌شده", "مدت (ثانیه)", "دستگاه", "مرورگر", "سیستم‌عامل",
      ...questions.map((q) => q.title),
    ];
    const rows = filtered.map((r) => {
      const rAnswers = answersByResponse[r.id] ?? [];
      const vals = questions.map((q) => {
        const a = rAnswers.find((x) => x.question_id === q.id);
        if (!a || a.value === null || a.value === undefined) return "";
        if (q.type === "rating") return Number(a.value);
        if (q.type === "checkbox" && Array.isArray(a.value)) return a.value.join(", ");
        return a.value;
      });
      return [
        r.id, r.submitted_at ? new Date(r.submitted_at).toLocaleString("fa-IR") : "",
        r.is_complete ? "بله" : "خیر", r.duration_seconds ?? "",
        DEVICE_FA[r.device] ?? r.device ?? "", r.browser ?? "", r.os ?? "",
        ...vals,
      ];
    });
    if (format === "excel") downloadExcel(`${form?.slug ?? "form"}-responses.xlsx`, header, rows);
    else downloadCsv(`${form?.slug ?? "form"}-responses.csv`, [header, ...rows]);
    push(`فایل ${format === "excel" ? "Excel" : "CSV"} دانلود شد 📥`);
  }

  async function deleteResponse(r) {
    if (!confirm("آیا از حذف این پاسخ مطمئنید؟")) return;
    const { error } = await supabase.from("responses").delete().eq("id", r.id);
    if (error) { push("حذف ناموفق بود", "error"); return; }
    push("پاسخ حذف شد");
    setDetail(null);
    load();
  }

  if (loading) return <Spinner label="پاسخ‌ها در حال بارگذاری..." />;

  if (!form) {
    return (
      <EmptyState
        icon={<SearchX size={48} />}
        title="فرم پیدا نشد!"
        action={<Button as={Link} to="/admin/forms" variant="indigo">برگشت به فرم‌ها</Button>}
      />
    );
  }

  const scored = hasScoring(questions);

  return (
    <div className="flex flex-col gap-6">
      <SEO title={`پاسخ‌ها: ${form.title}`} description={`تحلیل پاسخ‌های فرم ${form.title}`} url={`/admin/forms/${id}/responses`} noIndex />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button as={Link} to={`/admin/forms/${id}`} variant="ghost" size="sm">
            <ArrowLeft size={14} /> ویرایش فرم
          </Button>
          <div>
            <h1 className="text-xl font-black text-navy">{form.title}</h1>
            <p className="text-xs text-ink/40 mt-0.5">
              {faNum(questions.length)} سوال • {faNum(stats.total)} پاسخ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-text bg-bg-mint px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" /> زنده
          </span>
          {hasPermission("export_excel") && (
            <Button variant="ghost" size="sm" onClick={() => exportData("csv")}><Download size={14} /> CSV</Button>
          )}
          {hasPermission("export_excel") && (
            <Button variant="ghost" size="sm" onClick={() => exportData("excel")}><Download size={14} /> Excel</Button>
          )}
        </div>
      </div>

      {/* کارت‌های خلاصه */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon={MessagesSquare} label="کل پاسخ‌ها" value={stats.total} color="indigo" />
        <SummaryCard icon={CheckCircle2} label="کامل‌شده" value={stats.complete} sub={`${stats.total ? Math.round((stats.complete / stats.total) * 100) : 0}٪`} color="emerald" />
        <SummaryCard icon={TrendingUp} label="امروز" value={stats.today} color="amber" />
        <SummaryCard icon={Clock} label="میانگین زمان" value={stats.avg ? `${faNum(stats.avg)}ث` : "—"} color="violet" />
      </div>

      {/* کارت نمره‌دهی */}
      {scored && stats.scoreStats && (
        <div className="bg-gradient-to-l from-teal/5 to-bg-mint border-2 border-teal/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Award size={20} className="text-teal-text" />
            <h3 className="text-sm font-black text-navy">آمار نمره‌دهی</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat label="میانگین نمره" value={`${stats.scoreStats.avg} از ${faNum(questions.reduce((s, q) => s + (q.points || 0), 0))}`} />
            <MiniStat label="بالاترین نمره" value={faNum(stats.scoreStats.max)} />
            <MiniStat label="پایین‌ترین نمره" value={faNum(stats.scoreStats.min)} />
            <MiniStat label="تعداد آزمون‌دهندگان" value={faNum(stats.scoreStats.count)} />
          </div>
        </div>
      )}

      {/* نمودار روند */}
      {responses.length > 1 && (
        <div className="bg-white rounded-xl border border-ink/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={16} className="text-navy" />
            <h3 className="text-sm font-black text-navy">روند پاسخ‌ها (۳۰ روز اخیر)</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v} پاسخ`, "تعداد"]} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* جستجو و فیلتر */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40" size={16} />
          <input
            type="text"
            placeholder="جستجو در پاسخ‌ها..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-ink/15 rounded-lg pr-9 pl-4 py-2 text-sm font-medium text-navy focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-ink/70 cursor-pointer bg-white border border-ink/15 rounded-lg px-3 py-2">
          <input type="checkbox" checked={onlyComplete} onChange={(e) => setOnlyComplete(e.target.checked)} className="accent-teal w-4 h-4" />
          فقط کامل‌ها
        </label>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-1 bg-bg-neutral rounded-lg p-1 w-fit">
        {[
          { key: "list", label: `پاسخ‌ها (${filtered.length})` },
          { key: "analysis", label: "تحلیل سوال‌ها" },
          { key: "trend", label: "روندها" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
              tab === t.key ? "bg-white text-teal-text shadow-sm" : "text-ink/50 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* تب لیست */}
      {tab === "list" && (
        filtered.length === 0 ? (
          <EmptyState
            icon={<Inbox size={48} />}
            title="هنوز پاسخی ثبت نشده!"
            subtitle="لینک فرم را بفرست؛ هر پاسخ جدید اینجا ظاهر می‌شود."
            action={form.published ? (
              <Button as="a" href={`/f/${form.slug}`} target="_blank" variant="indigo">مشاهده فرم ↗</Button>
            ) : null}
          />
        ) : (
          <div className="rotate-[0.3deg]">
            <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-navy border-b-2 border-ink/10">
                      <th className="text-right font-semibold text-ink/70 px-4 py-3">#</th>
                      <th className="text-right font-semibold text-ink/70 px-4 py-3">زمان ثبت</th>
                      <th className="text-right font-semibold text-ink/70 px-4 py-3">وضعیت</th>
                      <th className="text-right font-semibold text-ink/70 px-4 py-3">مدت</th>
                      <th className="text-right font-semibold text-ink/70 px-4 py-3">دستگاه</th>
                      {scored && <th className="text-right font-semibold text-ink/70 px-4 py-3">نمره</th>}
                      <th className="text-right font-semibold text-ink/70 px-4 py-3">پاسخ نمونه</th>
                      <th className="text-left font-semibold text-ink/70 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const rAns = answersByResponse[r.id] ?? [];
                      const firstText = questions
                        .map((q) => rAns.find((a) => a.question_id === q.id))
                        .find((a) => a && a.value !== null && a.value !== undefined && String(a.value) !== "");

                      // محاسبه نمره
                      let personScore = null;
                      if (scored) {
                        const ansObj = {};
                        for (const a of rAns) ansObj[a.question_id] = a.value;
                        const s = calculateScore(questions, ansObj);
                        if (s.total > 0) personScore = s;
                      }

                      return (
                        <tr key={r.id} className="border-b border-ink/5 last:border-0 hover:bg-bg-neutral/50 cursor-pointer" onClick={() => setDetail(r)}>
                          <td className="px-4 py-3 font-mono text-ink/40 text-xs">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-navy">{faDateTime(r.submitted_at || r.created_at)}</td>
                          <td className="px-4 py-3">
                            {r.is_complete ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-text bg-bg-mint px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={12} /> کامل
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink/50 bg-bg-neutral px-2 py-0.5 rounded-full">
                                <AlertCircle size={12} /> ناقص
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-ink/50">{r.duration_seconds ? faDuration(r.duration_seconds) : "—"}</td>
                          <td className="px-4 py-3 text-ink/50">{DEVICE_FA[r.device] ?? r.device ?? "—"}</td>
                          {scored && (
                            <td className="px-4 py-3">
                              {personScore ? (
                                <span className={`text-xs font-black ${
                                  (personScore.score / personScore.total) >= 0.7 ? "text-teal-text" :
                                  (personScore.score / personScore.total) >= 0.4 ? "text-orange" : "text-magenta-text"
                                }`}>
                                  {faNum(personScore.score)}/{faNum(personScore.total)}
                                </span>
                              ) : (
                                <span className="text-xs text-ink/30">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-ink/70 max-w-[12rem] truncate">
                            {firstText ? String(firstText.value).slice(0, 40) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDetail(r); }}>
                              <Eye size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </StickerCard>
          </div>
        )
      )}

      {/* تب تحلیل سوالات */}
      {tab === "analysis" && (
        <div className="grid lg:grid-cols-2 gap-4">
          {questions.length === 0 ? (
            <EmptyState icon={<Puzzle size={48} />} title="این فرم هنوز سوالی ندارد!" />
          ) : (
            questions.map((q) => (
              <QuestionAnalysis
                key={q.id}
                question={q}
                answers={answers.filter((a) => a.question_id === q.id)}
                totalResponses={responses.length}
              />
            ))
          )}
        </div>
      )}

      {/* تب روندها */}
      {tab === "trend" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-ink/10 p-4">
            <h3 className="text-sm font-black text-navy mb-3 flex items-center gap-2">
              <Calendar size={16} /> روند پاسخ‌ها (۳۰ روز اخیر)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCountFull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v} پاسخ`, "تعداد"]} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#colorCountFull)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* توزیع دستگاه */}
          <div className="bg-white rounded-xl border border-ink/10 p-4">
            <h3 className="text-sm font-black text-navy mb-3 flex items-center gap-2">
              <Zap size={16} /> توزیع دستگاه‌ها
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(() => {
                const counts = {};
                for (const r of responses) {
                  const d = DEVICE_FA[r.device] ?? r.device ?? "نامشخص";
                  counts[d] = (counts[d] || 0) + 1;
                }
                return Object.entries(counts).map(([name, value]) => ({ name, value }));
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} پاسخ`, "تعداد"]} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* مودال جزئیات */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-[2px]" onClick={() => setDetail(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <StickerCard theme="white" rotate="-rotate-[0.5deg]">
              <div className="bg-white max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10 shrink-0">
                  <h3 className="text-lg font-bold text-navy">جزئیات پاسخ</h3>
                  <button onClick={() => setDetail(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/40 hover:text-ink/70 hover:bg-bg-neutral">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <PersonAnalytics
                    response={detail}
                    questions={questions}
                    answersByResponse={answersByResponse}
                    allAnswers={answers}
                    questionById={questionById}
                  />
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-t border-ink/10 shrink-0">
                  <Button variant="red" size="sm" onClick={() => deleteResponse(detail)}>حذف این پاسخ</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>بستن</Button>
                </div>
              </div>
            </StickerCard>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    indigo: "bg-bg-lavender text-navy",
    emerald: "bg-bg-mint text-teal-text",
    amber: "bg-[#FEF7EC] text-orange",
    violet: "bg-[#FEFAFB] text-magenta-text",
  };
  return (
    <div className="bg-white rounded-tl-[1rem] rounded-br-[1rem] rounded-tr-none rounded-bl-none border-2 border-ink/10 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-pill-md flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-xs font-bold text-ink-subtle">{label}</p>
          <p className="text-xl font-black text-navy">{value}</p>
          {sub && <p className="text-xs font-semibold text-ink-subtle">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
