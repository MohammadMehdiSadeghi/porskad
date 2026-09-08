import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import { ResponsesSkeleton } from "../../../components/ui/Skeleton";
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
  getInvalidRecords,
  getMemberLevelReport,
  getFrequencyReport,
  getPivotTable,
  getUnionReport,
  getAvailableLevels,
  formatOptionsForExport,
} from "../../../lib/analytics";
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
  Trash2,
  Puzzle,
  ChevronDown,
  Award,
  Target,
  BarChart2,
  Users,
  Calendar,
  Zap,
  Layers,
  AlertTriangle,
  Filter,
  X,
  Star,
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
  if (value === null || value === undefined || value === "") return <span className="text-ink/40 dark:text-slate-500">—</span>;
  
  if (question.type === "rating") {
    const count = Math.max(0, Math.min(5, Number(value) || 0));
    return (
      <span className="inline-flex items-center gap-0.5 text-amber-500" dir="ltr">
        {Array.from({ length: count }).map((_, i) => (
          <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
        ))}
      </span>
    );
  }

  if (question.type === "nps") {
    const n = Number(value);
    const badgeColor = n >= 9 ? "bg-teal/15 text-teal-text dark:text-teal-300 border-teal/30" : n >= 7 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30";
    const label = n >= 9 ? "مروج (Promoter)" : n >= 7 ? "بی‌تفاوت (Passive)" : "مخالف (Detractor)";
    return (
      <div className="inline-flex items-center gap-2">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${badgeColor}`}>
          امتیاز: {faNum(n)} از ۱۰
        </span>
        <span className="text-xs text-ink/50 dark:text-slate-400 font-semibold">({label})</span>
      </div>
    );
  }

  if (question.type === "likert") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal/10 text-teal-text dark:text-teal-300 rounded-lg text-xs font-bold border border-teal/20">
        {String(value)}
      </span>
    );
  }

  if (question.type === "matrix" && typeof value === "object" && value !== null) {
    return (
      <div className="flex flex-col gap-1 text-xs">
        {Object.entries(value).map(([row, col], idx) => (
          <div key={idx} className="flex items-center gap-2 bg-black/5 dark:bg-slate-800 px-2 py-1 rounded">
            <span className="font-bold text-ink/70 dark:text-slate-300">{row}:</span>
            <span className="text-teal-text dark:text-teal-300 font-black">{String(col)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "ranking" && Array.isArray(value)) {
    return (
      <div className="flex flex-col gap-1 text-xs">
        {value.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 font-medium text-ink dark:text-slate-200">
            <span className="w-5 h-5 rounded-full bg-navy/10 dark:bg-slate-700 text-navy dark:text-white flex items-center justify-center text-[10px] font-black">
              {faNum(idx + 1)}
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "file_upload") {
    if (typeof value === "object" && value !== null) {
      return (
        <a href={value.url || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 bg-male-light dark:bg-slate-800 text-male-normal dark:text-teal-300 rounded-lg text-xs font-bold hover:underline border border-ink/10">
          📎 {value.name || "مشاهده فایل"} {value.size ? `(${faNum(Math.round(value.size / 1024))} KB)` : ""}
        </a>
      );
    }
    return <span className="font-mono text-xs text-male-normal dark:text-teal-300">{String(value)}</span>;
  }

  if (question.type === "link") {
    const href = String(value).startsWith("http") ? String(value) : `https://${value}`;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1 font-mono text-xs text-teal-text dark:text-teal-300 underline font-bold">
        🔗 {String(value)}
      </a>
    );
  }

  if (question.type === "choice" || question.type === "picture_choice") {
    if (Array.isArray(value)) {
      return <span className="font-medium text-ink dark:text-slate-100">{value.join("، ")}</span>;
    }
    return <span className="font-medium text-ink dark:text-slate-100">{String(value)}</span>;
  }

  if (question.type === "phone_ir" || question.type === "email" || question.type === "telegram_id")
    return <span dir="ltr" className="font-mono font-bold text-navy dark:text-teal-300">{String(value)}</span>;

  return <span className="font-medium whitespace-pre-wrap text-ink dark:text-slate-100">{String(value)}</span>;
}

// ─── مقدار پاسخ غیرخالی است؟ ───
function hasAnswerValue(ans) {
  if (!ans) return false;
  const v = ans.value;
  return v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : typeof v === "object" ? Object.keys(v).length > 0 : String(v) !== "");
}

// ─── نمایش پاسخ داخل سلول ستون «پاسخ» (خلاصه + «…» برای پاسخ بلند) ───
function CellAnswer({ question, value, max = 60 }) {
  const empty =
    value === null || value === undefined || value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0);
  if (!question || empty) return <span className="text-ink/25 dark:text-slate-600 text-xs">—</span>;

  if (question.type === "rating") {
    const count = Math.max(0, Math.min(5, Number(value) || 0));
    return (
      <span className="inline-flex items-center gap-0.5 text-amber-500" dir="ltr">
        {Array.from({ length: count }).map((_, i) => (
          <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
        ))}
      </span>
    );
  }

  if (question.type === "nps") {
    return <span className="font-bold text-xs text-teal-text dark:text-teal-300">امتیاز: {faNum(value)}/۱۰</span>;
  }

  if (question.type === "matrix" && typeof value === "object") {
    const formatted = Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(" | ");
    return <span className="font-medium text-xs text-ink/90 dark:text-slate-200 truncate block max-w-full" title={formatted}>{formatted}</span>;
  }

  if (question.type === "ranking" && Array.isArray(value)) {
    const formatted = value.map((v, i) => `${faNum(i + 1)}. ${v}`).join(" ➔ ");
    return <span className="font-medium text-xs text-ink/90 dark:text-slate-200 truncate block max-w-full" title={formatted}>{formatted}</span>;
  }

  if (question.type === "file_upload") {
    const name = typeof value === "object" ? value.name : String(value);
    return <span className="text-xs font-bold text-male-normal dark:text-teal-300 truncate block max-w-full">📎 {name}</span>;
  }

  const ltr = question.type === "phone_ir" || question.type === "email" || question.type === "telegram_id" || question.type === "link";
  const text = Array.isArray(value) ? value.join("، ") : typeof value === "object" ? JSON.stringify(value) : String(value);
  const shown = text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
  return (
    <span
      dir={ltr ? "ltr" : undefined}
      title={text}
      className={`block max-w-full truncate leading-5 ${ltr ? "font-mono font-bold text-xs text-navy dark:text-teal-300" : "font-medium text-ink/90 dark:text-slate-200"}`}
    >
      {shown}
    </span>
  );
}

// ─── نشانگر درست/غلط ───
function CorrectnessBadge({ question, answer }) {
  if (!question.correct_answer || !question.points) return null;
  const correct = isCorrectAnswer(question, answer);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full ${
      correct ? "bg-teal/15 text-teal-text dark:text-teal-300 border border-teal/30 dark:border-teal-700/50" : "bg-magenta/15 text-magenta-text dark:text-rose-300 border border-magenta/30 dark:border-rose-700/50"
    }`}>
      {correct ? "صحیح" : "غلط"}
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
    else if (question.type === "rating") keys = [5, 4, 3, 2, 1];
    if (!keys) return null;

    const isCheckbox = question.type === "choice" && (question.max_selections ?? 1) > 1;
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

    const denom = total;

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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-ink/10 dark:border-slate-800 p-5 shadow-sm">
      {/* هدر */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <h4 className="font-bold text-navy dark:text-white flex items-center gap-2">
            <span>{QUESTION_TYPES[question.type]?.icon}</span>
            {question.title}
            {question.correct_answer && question.points && (
              <Badge color="teal" rotate="0">{faNum(question.points)} نمره</Badge>
            )}
          </h4>
          <p className="text-xs text-ink/40 dark:text-slate-400 mt-0.5">
            {QUESTION_TYPES[question.type]?.label || question.type}
          </p>
        </div>
        <Badge color="indigo">{faNum(total)} جواب</Badge>
      </div>

      {/* نوار آمار سریع */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs font-bold text-ink/70 dark:text-slate-300 bg-bg-neutral dark:bg-slate-800 px-2.5 py-1 rounded-full">
          نرخ پاسخ: {faNum(completionRate)}٪
        </span>
        {avgTime !== null && avgTime > 0 && (
          <span className="text-xs font-bold text-ink/70 dark:text-slate-300 bg-bg-neutral dark:bg-slate-800 px-2.5 py-1 rounded-full">
            میانگین: {faDuration(avgTime)}
          </span>
        )}
        {correctRate && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            correctRate.pct >= 70 ? "text-teal-text dark:text-teal-300 bg-teal/10 dark:bg-teal-950/50" : correctRate.pct >= 40 ? "text-orange dark:text-amber-400 bg-orange/10 dark:bg-amber-950/50" : "text-magenta-text dark:text-rose-300 bg-magenta/10 dark:bg-rose-950/50"
          }`}>
            نرخ صحیح: {faNum(correctRate.pct)}٪ ({faNum(correctRate.correct)}/{faNum(correctRate.total)})
          </span>
        )}
      </div>

      {total === 0 && (
        <p className="text-sm text-ink/40 dark:text-slate-500">هنوز جوابی ثبت نشده.</p>
      )}

      {/* نمودار توزیع */}
      {dist && total > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-2">
            {dist.map((d, i) => (
              <div key={String(d.key)} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs font-medium text-ink/70 dark:text-slate-300 truncate" title={String(d.key)}>
                  {question.type === "rating" ? `${faNum(d.key)} ستاره` : String(d.key).slice(0, 15)}
                </span>
                <div className="flex-1 h-6 bg-bg-neutral dark:bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${d.pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                </div>
                <span className="w-20 text-xs font-bold text-navy dark:text-white text-left flex items-center gap-1" dir="ltr">
                  {d.count} <span className="text-ink/40 dark:text-slate-400">({d.pct}٪)</span>
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
            <p className="text-xs font-semibold text-ink/40 dark:text-slate-400">توزیع پاسخ‌ها</p>
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
            <div key={i} className="bg-bg-neutral dark:bg-slate-800/80 border border-ink/10 dark:border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-medium text-ink dark:text-slate-200 flex items-center gap-2">
              <span className="text-ink/40 dark:text-slate-500 font-mono">{i + 1}.</span>
              <span className="truncate">{String(v).slice(0, 80)}</span>
            </div>
          ))}
          {values.length > 20 && (
            <span className="text-xs font-semibold text-ink/50 dark:text-slate-400 text-center">+ {faNum(values.length - 20)} پاسخ دیگر</span>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-bg-neutral dark:bg-slate-800/90 rounded-lg px-2 py-1.5 text-center border border-transparent dark:border-slate-700/60">
      <p className="text-xs font-semibold text-ink/50 dark:text-slate-400 mb-0.5">{label}</p>
      <p className="text-xs font-bold text-navy dark:text-white">{value}</p>
    </div>
  );
}

// ─── تحلیل فردی یک پاسخ ───
function PersonAnalytics({ response, questions, answersByResponse }) {
  const rAnswers = answersByResponse[response.id] ?? [];
  const scored = hasScoring(questions);
  const [activeQ, setActiveQ] = useState(null);
  const qRefs = useRef({});

  const scoreData = useMemo(() => {
    if (!scored) return null;
    const answersObj = {};
    for (const a of rAnswers) {
      answersObj[a.question_id] = a.value;
    }
    return calculateScore(questions, answersObj);
  }, [scored, rAnswers, questions]);

  function scrollToQ(questionId) {
    setActiveQ(questionId);
    const el = qRefs.current[questionId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* اطلاعات فرد */}
      <div className="bg-bg-lavender/50 dark:bg-slate-800/80 rounded-xl p-4 border border-navy/10 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-navy dark:bg-teal text-white flex items-center justify-center font-black text-sm">
            <Users size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-navy dark:text-white">پاسخ‌دهنده</h4>
            <p className="text-xs text-ink/50 dark:text-slate-400">{faDateTime(response.submitted_at || response.created_at)}</p>
          </div>
          <div className="mr-auto flex items-center gap-2">
            {response.duration_seconds > 0 && (
              <span className="text-xs font-bold text-ink/60 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-1 rounded-full border border-ink/5 dark:border-slate-600">
                ⏱ {faDuration(response.duration_seconds)}
              </span>
            )}
            <span className="text-xs font-bold text-ink/60 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-1 rounded-full border border-ink/5 dark:border-slate-600">
              {DEVICE_FA[response.device] ?? response.device ?? "—"}
            </span>
          </div>
        </div>

        {/* نمره */}
        {scoreData && (
          <div className={`flex items-center gap-4 p-3 rounded-xl border-2 ${
            scoreData.total > 0 && (scoreData.score / scoreData.total) >= 0.7
              ? "bg-teal/5 dark:bg-teal-950/40 border-teal/30 dark:border-teal-700/60"
              : (scoreData.score / scoreData.total) >= 0.4
                ? "bg-orange/5 dark:bg-amber-950/40 border-orange/30 dark:border-amber-700/60"
                : "bg-magenta/5 dark:bg-rose-950/40 border-magenta/30 dark:border-rose-700/60"
          }`}>
            <div className="flex items-center gap-2">
              <Award size={20} className={
                (scoreData.score / scoreData.total) >= 0.7 ? "text-teal-text dark:text-teal-300" :
                (scoreData.score / scoreData.total) >= 0.4 ? "text-orange dark:text-amber-400" : "text-magenta-text dark:text-rose-300"
              } />
              <div>
                <p className="text-xs font-bold text-ink/50 dark:text-slate-400">نمره</p>
                <p className="text-lg font-black text-navy dark:text-white">
                  {faNum(scoreData.score)} <span className="text-sm text-ink/40 dark:text-slate-400">از {faNum(scoreData.total)}</span>
                </p>
              </div>
            </div>
            <div className="mr-auto flex items-center gap-1">
              <div className="w-16 h-2 bg-ink/10 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${scoreData.total > 0 ? (scoreData.score / scoreData.total) * 100 : 0}%`,
                    backgroundColor: (scoreData.score / scoreData.total) >= 0.7 ? "#10b981" :
                      (scoreData.score / scoreData.total) >= 0.4 ? "#f59e0b" : "#ec4899"
                  }}
                />
              </div>
              <span className="text-xs font-bold text-navy dark:text-white">
                {faNum(Math.round((scoreData.score / scoreData.total) * 100))}٪
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── ناوبری سریع بین سوالات ─── */}
      <div className="bg-white dark:bg-slate-900 border border-ink/10 dark:border-slate-800 rounded-xl p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xs font-extrabold text-ink-subtle dark:text-slate-400">پرش به سوال:</span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-none">
          {questions.map((q, i) => {
            const a = rAnswers.find((x) => x.question_id === q.id);
            const answered = a?.value !== null && a?.value !== undefined && a?.value !== "";
            return (
              <button key={q.id}
                onClick={() => scrollToQ(q.id)}
                className={`text-xs font-bold px-2.5 py-1 rounded-pill-sm border transition-all cursor-pointer
                  ${activeQ === q.id ? "border-navy bg-navy text-white dark:bg-teal dark:border-teal" : answered ? "border-teal/40 bg-teal/5 text-teal-text dark:text-teal-300 dark:bg-teal-950/40" : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink-subtle dark:text-slate-300 hover:border-teal/30"}
                `}
                title={q.title}
              >
                {faNum(i + 1)}. {q.title.slice(0, 18)}{q.title.length > 18 ? "…" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* جزئیات پاسخ‌ها */}
      <div className="flex flex-col gap-2">
        {questions.map((q, i) => {
          const a = rAnswers.find((x) => x.question_id === q.id);
          const correct = q.correct_answer && q.points ? isCorrectAnswer(q, a?.value) : null;
          const answered = a?.value !== null && a?.value !== undefined && a?.value !== "";

          return (
            <div key={q.id} ref={(el) => { qRefs.current[q.id] = el; }}
              id={`q-${q.id}`}
              className={`border rounded-xl p-3 transition-colors scroll-mt-20 ${
                activeQ === q.id ? "ring-2 ring-navy/30 dark:ring-teal/40 border-navy/30 dark:border-teal" :
                correct === true ? "border-teal/30 dark:border-teal-800 bg-teal/5 dark:bg-teal-950/25" :
                correct === false ? "border-magenta/30 dark:border-rose-800 bg-magenta/5 dark:bg-rose-950/25" :
                "border-ink/10 dark:border-slate-800 bg-white dark:bg-slate-900"
              }`}
              onClick={() => setActiveQ(q.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-navy dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-navy/10 dark:bg-slate-800 text-xs font-black dark:text-teal-300">
                    {i + 1}
                  </span>
                  {q.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {q.points > 0 && (
                    <span className="text-xs font-bold text-ink/50 dark:text-slate-400">{faNum(q.points)} نمره</span>
                  )}
                  <CorrectnessBadge question={q} answer={a?.value} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-ink dark:text-slate-200 flex-1">
                  {answered ? (
                    <AnswerValue question={q} value={a?.value} />
                  ) : (
                    <span className="text-ink/40 dark:text-slate-500 text-xs">پاسخی داده نشده</span>
                  )}
                </div>

                {correct === false && q.correct_answer && (
                  <span className="text-xs font-bold text-teal-text dark:text-teal-300 bg-teal/10 dark:bg-teal-950/50 px-2 py-0.5 rounded-full shrink-0">
                    پاسخ صحیح: {Array.isArray(q.correct_answer) ? q.correct_answer.join("، ") : String(q.correct_answer)}
                  </span>
                )}
              </div>

              {a?.time_spent_seconds > 0 && (
                <span className="text-xs text-ink/40 dark:text-slate-500 mt-1 block">
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
  const { hasPermission, user, isOwner, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [tab, setTab] = useState("list");
  const [detail, setDetail] = useState(null); // مودال کامل یک پاسخ
  const [quickQId, setQuickQId] = useState(null); // سوالِ سراسریِ انتخابی در «نمایش سریع پاسخ‌ها» (ستون «پاسخ»)
  const [quickBarOpen, setQuickBarOpen] = useState(false); // باز/بسته بودن نوار «نمایش سریع پاسخ‌ها»
  const [onlyComplete, setOnlyComplete] = useState(false);
  const [search, setSearch] = useState("");
  const [questionFilters, setQuestionFilters] = useState({}); // { questionId: value }

  const PAGE_SIZE = 500;
  const ANSWER_CHUNK = 100;
  const MAX_RESPONSES = 5000;

  async function load(silent = false) {
    if (!silent) setLoading(true);
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
        if (!data || data.length < PAGE_SIZE || allResponses.length >= MAX_RESPONSES) break;
        from += PAGE_SIZE;
      }

      const [{ data: f, error: formError }, { data: qs, error: qError }] =
        await Promise.all([
          supabase.from("forms").select("*").eq("id", id).maybeSingle(),
          supabase.from("questions").select("*").eq("form_id", id).order("position"),
        ]);
      if (formError) throw formError;
      if (qError) throw qError;

      if (!isOwner() && (!user || (f && f.manager_id !== user.id && f.created_by !== user.id))) {
        push("شما به پاسخ‌های این فرم دسترسی ندارید.", "error");
        setForm(null);
        setLoading(false);
        return;
      }

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
    if (authLoading) return;
    load(false);
    const channel = supabase
      .channel(`responses-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `form_id=eq.${id}` },
        () => { push("پاسخ جدیدی ثبت شد!", "info"); load(true); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user?.id, isOwner, authLoading]);

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
    // فیلتر بر اساس سوالات
    const activeFilters = Object.entries(questionFilters).filter(([, v]) => v);
    if (activeFilters.length) {
      result = result.filter((r) => {
        const rAns = answersByResponse[r.id] ?? [];
        return activeFilters.every(([qId, filterVal]) => {
          const a = rAns.find((x) => x.question_id === qId);
          if (!a || a.value === null || a.value === undefined) return false;
          if (Array.isArray(a.value)) return a.value.includes(filterVal);
          return String(a.value) === String(filterVal);
        });
      });
    }
    return result;
  }, [responses, onlyComplete, search, answersByResponse, questionById, questionFilters]);

  // سوالِ انتخابیِ سراسری (نمایش سریع) — روی کل لیست پاسخ‌ها اعمال می‌شود
  const activeQuickQ = useMemo(
    () => (quickQId ? questionById[quickQId] ?? null : null),
    [quickQId, questionById]
  );

  // تعداد پاسخ‌های هر سوال در لیست فیلترشده (برای منوی نمایش سریع)
  const quickCounts = useMemo(() => {
    const counts = {};
    for (const q of questions) counts[q.id] = 0;
    for (const r of filtered) {
      for (const a of answersByResponse[r.id] ?? []) {
        if (counts[a.question_id] !== undefined && hasAnswerValue(a)) counts[a.question_id]++;
      }
    }
    return counts;
  }, [filtered, questions, answersByResponse]);

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
        if (q.type === "rating" || q.type === "nps") return Number(a.value);
        if (q.type === "matrix" && typeof a.value === "object") {
          return Object.entries(a.value).map(([k, v]) => `${k}: ${v}`).join(" | ");
        }
        if (q.type === "ranking" && Array.isArray(a.value)) {
          return a.value.map((v, i) => `${i + 1}. ${v}`).join(" | ");
        }
        if (q.type === "file_upload" && typeof a.value === "object") {
          return a.value.url || a.value.name || JSON.stringify(a.value);
        }
        if (Array.isArray(a.value)) return a.value.join(", ");
        if (typeof a.value === "object") return JSON.stringify(a.value);
        return a.value;
      });
      return [
        r.id, r.submitted_at ? new Date(r.submitted_at).toLocaleString("fa-IR") : "",
        r.is_complete ? "بله" : "خیر", r.duration_seconds ?? "",
        DEVICE_FA[r.device] ?? r.device ?? "", r.browser ?? "", r.os ?? "",
        ...vals,
      ];
    });
    if (format === "excel") {
      // تاریخ واقعی اولین و آخرین پاسخ از داده‌ها
      const times = filtered
        .map((r) => new Date(r.submitted_at || r.created_at))
        .filter((d) => !isNaN(d));
      const dates = {
        firstSubmittedAt: times.length ? times.reduce((a, b) => (a < b ? a : b)).toLocaleDateString("fa-IR") : null,
        lastSubmittedAt: times.length ? times.reduce((a, b) => (a > b ? a : b)).toLocaleDateString("fa-IR") : null,
        completeCount: filtered.filter((r) => r.is_complete).length,
      };
      downloadExcel(`${form?.slug ?? "form"}-responses.xlsx`, header, rows, dates);
    } else downloadCsv(`${form?.slug ?? "form"}-responses.csv`, [header, ...rows]);
    push(`فایل ${format === "excel" ? "Excel" : "CSV"} دانلود شد`);
  }

  async function deleteResponse(r) {
    if (!confirm("آیا از حذف این پاسخ مطمئنید؟")) return;
    const { error } = await supabase.from("responses").delete().eq("id", r.id);
    if (error) { push("حذف ناموفق بود", "error"); return; }
    push("پاسخ حذف شد");
    setDetail(null);
    load();
  }

  if (loading) return <ResponsesSkeleton />;

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
  const activeQIdx = activeQuickQ ? questions.findIndex((q) => q.id === activeQuickQ.id) : -1;

  return (
    <div className="flex flex-col gap-5">
      <SEO title={`پاسخ‌ها: ${form.title}`} description={`تحلیل پاسخ‌های فرم ${form.title}`} url={`/admin/forms/${id}/responses`} noIndex />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button as={Link} to={`/admin/forms/${id}`} variant="ghost" size="sm">
            <ArrowLeft size={14} /> ویرایش فرم
          </Button>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-navy dark:text-white">{form.title}</h1>
            <p className="text-xs text-ink/60 dark:text-slate-400 mt-0.5">
              {faNum(questions.length)} سوال • {faNum(stats.total)} پاسخ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-text dark:text-teal-300 bg-bg-mint dark:bg-teal-950/50 px-2 py-1 rounded-full border border-teal/20 dark:border-teal-700/50">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <SummaryCard icon={MessagesSquare} label="کل پاسخ‌ها" value={stats.total} color="indigo" />
        <SummaryCard icon={CheckCircle2} label="کامل‌شده" value={stats.complete} sub={`${stats.total ? Math.round((stats.complete / stats.total) * 100) : 0}٪`} color="emerald" />
        <SummaryCard icon={TrendingUp} label="امروز" value={stats.today} color="amber" />
        <SummaryCard icon={Clock} label="میانگین زمان" value={stats.avg ? `${faNum(stats.avg)}ث` : "—"} color="violet" />
      </div>

      {/* کارت نمره‌دهی */}
      {scored && stats.scoreStats && (
        <div className="bg-gradient-to-l from-teal/5 to-bg-mint dark:from-slate-800 dark:to-teal-950/30 border-2 border-teal/20 dark:border-teal-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Award size={20} className="text-teal-text dark:text-teal-300" />
            <h3 className="text-sm font-black text-navy dark:text-white">آمار نمره‌دهی</h3>
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
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-ink/10 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={16} className="text-navy dark:text-teal-400" />
            <h3 className="text-sm font-black text-navy dark:text-white">روند پاسخ‌ها (۳۰ روز اخیر)</h3>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip formatter={(v) => [`${v} پاسخ`, "تعداد"]} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "0.5rem" }} />
              <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* جستجو و فیلتر */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 dark:text-slate-500" size={16} />
          <input
            type="text"
            placeholder="جستجو در پاسخ‌ها..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-ink/15 dark:border-slate-700 rounded-lg pr-9 pl-4 py-2 text-sm font-medium text-navy dark:text-slate-100 placeholder:text-ink/40 dark:placeholder:text-slate-500 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-ink/70 dark:text-slate-300 cursor-pointer bg-white dark:bg-slate-800 border border-ink/15 dark:border-slate-700 rounded-lg px-3 py-2">
          <input type="checkbox" checked={onlyComplete} onChange={(e) => setOnlyComplete(e.target.checked)} className="accent-teal w-4 h-4 cursor-pointer" />
          فقط کامل‌ها
        </label>
        {Object.keys(questionFilters).some((k) => questionFilters[k]) && (
          <button onClick={() => setQuestionFilters({})} className="text-xs font-bold text-magenta-text dark:text-rose-300 bg-magenta/10 dark:bg-rose-950/40 border border-magenta/20 dark:border-rose-800/40 rounded-lg px-3 py-2 hover:bg-magenta/20 transition-colors flex items-center gap-1.5 cursor-pointer">
            <span>پاک کردن فیلترها</span>
            <X size={13} />
          </button>
        )}
      </div>

      {/* فیلترهای سوالات */}
      {questions.filter((q) => (q.type === "choice" || q.type === "yes_no") && q.options?.length).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {questions
            .filter((q) => (q.type === "choice" || q.type === "yes_no") && q.options?.length)
            .map((q) => {
              const opts = q.type === "yes_no" ? ["بله", "خیر"] : q.options;
              const activeVal = questionFilters[q.id] || "";
              return (
                <select
                  key={q.id}
                  value={activeVal}
                  onChange={(e) => setQuestionFilters((p) => ({ ...p, [q.id]: e.target.value }))}
                  className={`text-xs font-semibold rounded-lg border px-2.5 py-1.5 cursor-pointer transition-colors ${
                    activeVal ? "border-teal bg-teal/10 dark:bg-teal-950/40 text-teal-text dark:text-teal-300" : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink/60 dark:text-slate-300 hover:border-ink/30"
                  }`}
                >
                  <option value="">{q.title.slice(0, 20)}...</option>
                  {opts.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              );
            })}
        </div>
      )}

      {/* تب‌ها */}
      <div className="flex gap-1 bg-bg-neutral dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg p-1 w-fit max-w-full overflow-x-auto scrollbar-none">
        {[
          { key: "list", label: `پاسخ‌ها (${filtered.length})` },
          { key: "analysis", label: "تحلیل سوال‌ها" },
          { key: "group", label: "آنالیتیکس گروهی" },
          { key: "trend", label: "روندها" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors cursor-pointer ${
              tab === t.key ? "bg-white dark:bg-slate-900 text-teal-text dark:text-teal-300 shadow-sm border border-transparent dark:border-slate-700" : "text-ink/50 dark:text-slate-400 hover:text-ink dark:hover:text-white"
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
          <div>
            <StickerCard theme="white" radius="rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">#</th>
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5 hidden sm:table-cell">زمان</th>
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">وضعیت</th>
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5 hidden md:table-cell">مدت</th>
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5 hidden lg:table-cell">دستگاه</th>
                      {scored && <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">نمره</th>}
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5 hidden sm:table-cell whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setQuickBarOpen((o) => !o)}
                          disabled={questions.length === 0}
                          title={questions.length === 0 ? "این فرم سوالی ندارد" : "نمایش سریع پاسخ یک سوال برای همهٔ ردیف‌ها"}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default ${
                            quickBarOpen || activeQuickQ ? "bg-teal/10 dark:bg-teal-950/40 text-teal-text dark:text-teal-300" : "hover:bg-bg-neutral dark:hover:bg-slate-700 text-ink/70 dark:text-slate-300"
                          }`}
                        >
                          <span>{activeQuickQ ? "پاسخ سوال" : "پاسخ"}</span>
                          {activeQuickQ && activeQIdx >= 0 && (
                            <span className="shrink-0 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-navy dark:bg-teal text-white text-xs font-black">
                              {faNum(activeQIdx + 1)}
                            </span>
                          )}
                          {questions.length > 0 && (
                            <ChevronDown size={13} className={`transition-transform duration-200 ${quickBarOpen ? "rotate-180" : ""}`} />
                          )}
                        </button>
                      </th>
                      <th className="text-left font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ─── نوار «نمایش سریع پاسخ‌ها»: انتخاب سوالِ سراسری برای کل لیست ─── */}
                    {quickBarOpen && (
                      <tr className="bg-teal/5 dark:bg-teal-950/30 border-b border-teal/15 dark:border-teal-800/40">
                        <td colSpan={scored ? 8 : 7} className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-text dark:text-teal-300">
                              <Zap size={13} /> نمایش سریع پاسخ‌ها
                            </span>
                            <span className="text-xs font-semibold text-ink/60 dark:text-slate-400">
                              پاسخِ سوالِ انتخابی برای همهٔ {faNum(filtered.length)} ردیفِ این لیست نمایش داده می‌شود:
                            </span>
                            <select
                              value={activeQuickQ?.id ?? ""}
                              onChange={(e) => setQuickQId(e.target.value || null)}
                              className="flex-1 min-w-[220px] max-w-md bg-white dark:bg-slate-800 border border-ink/15 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-navy dark:text-slate-100 cursor-pointer focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
                            >
                              <option value="">— بدون انتخاب (پاسخ اول هر نفر) —</option>
                              {questions.map((q, qi) => (
                                <option key={q.id} value={q.id}>
                                  {faNum(qi + 1)}. {q.title} — {faNum(quickCounts[q.id] ?? 0)} پاسخ
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => { setQuickQId(null); setQuickBarOpen(false); }}
                              className="text-xs font-bold text-magenta-text dark:text-rose-300 bg-magenta/10 dark:bg-rose-950/40 border border-magenta/20 dark:border-rose-800/40 rounded-lg px-2.5 py-1.5 hover:bg-magenta/20 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span>بستن نمایش سریع</span>
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {filtered.map((r, i) => {
                      const rAns = answersByResponse[r.id] ?? [];
                      const firstText = questions
                        .map((q) => rAns.find((a) => a.question_id === q.id))
                        .find((a) => hasAnswerValue(a));
                      const previewQ = activeQuickQ
                        ? activeQuickQ
                        : (firstText ? questionById[firstText.question_id] ?? null : null);
                      const previewValue = previewQ
                        ? (rAns.find((a) => a.question_id === previewQ.id)?.value ?? null)
                        : null;

                      // محاسبه نمره
                      let personScore = null;
                      if (scored) {
                        const ansObj = {};
                        for (const a of rAns) ansObj[a.question_id] = a.value;
                        const s = calculateScore(questions, ansObj);
                        if (s.total > 0) personScore = s;
                      }

                      return (
                        <tr
                          key={r.id}
                          className="border-b border-ink/5 dark:border-slate-800/60 last:border-0 transition-colors cursor-pointer hover:bg-bg-neutral/50 dark:hover:bg-slate-800/50"
                          onClick={() => setDetail(r)}
                        >
                            <td className="px-3 py-2.5 font-mono text-ink/50 dark:text-slate-400 text-xs">{i + 1}</td>
                            <td className="px-3 py-2.5 font-medium text-navy dark:text-slate-200 text-xs hidden sm:table-cell">{faDateTime(r.submitted_at || r.created_at)}</td>
                            <td className="px-3 py-2.5">
                              {r.is_complete ? (
                                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-teal-text dark:text-teal-300 bg-bg-mint dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal/20 dark:border-teal-700/50">
                                  <CheckCircle2 size={11} /> کامل
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-ink/60 dark:text-slate-300 bg-bg-neutral dark:bg-slate-800 px-2 py-0.5 rounded-full border border-ink/10 dark:border-slate-700">
                                  <AlertCircle size={11} /> ناقص
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-ink/50 dark:text-slate-400 text-xs hidden md:table-cell">{r.duration_seconds ? faDuration(r.duration_seconds) : "—"}</td>
                            <td className="px-3 py-2.5 text-ink/50 dark:text-slate-400 text-xs hidden lg:table-cell">{DEVICE_FA[r.device] ?? r.device ?? "—"}</td>
                            {scored && (
                              <td className="px-4 py-3">
                                {personScore ? (
                                  <span className={`text-xs font-black ${
                                    (personScore.score / personScore.total) >= 0.7 ? "text-teal-text dark:text-teal-300" :
                                    (personScore.score / personScore.total) >= 0.4 ? "text-orange dark:text-amber-400" : "text-magenta-text dark:text-rose-300"
                                  }`}>
                                    {faNum(personScore.score)}/{faNum(personScore.total)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-ink/30 dark:text-slate-600">—</span>
                                )}
                              </td>
                            )}
                            <td className="px-3 py-2.5 min-w-0 max-w-[13rem]">
                              <CellAnswer question={previewQ} value={previewValue} />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDetail(r); }}>
                                  <Eye size={14} />
                                </Button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteResponse(r); }}
                                  className="p-1.5 rounded-lg text-ink/30 dark:text-slate-400 hover:text-magenta-text dark:hover:text-rose-400 hover:bg-magenta/10 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="حذف پاسخ"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
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

      {/* تب آنالیتیکس گروهی */}
      {tab === "group" && (
        <GroupAnalytics questions={questions} answers={answers} responses={responses} form={form} />
      )}

      {/* تب روندها */}
      {tab === "trend" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-ink/10 dark:border-slate-800 p-4 shadow-sm">
            <h3 className="text-sm font-black text-navy dark:text-white mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-teal" /> روند پاسخ‌ها (۳۰ روز اخیر)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorCountFull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip formatter={(v) => [`${v} پاسخ`, "تعداد"]} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "0.5rem" }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#colorCountFull)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* توزیع دستگاه */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-ink/10 dark:border-slate-800 p-4 shadow-sm">
            <h3 className="text-sm font-black text-navy dark:text-white mb-3 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" /> توزیع دستگاه‌ها
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
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip formatter={(v) => [`${v} پاسخ`, "تعداد"]} contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "0.5rem" }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* مودال جزئیات */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-[2px]" onClick={() => setDetail(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <StickerCard theme="white">
              <div className="bg-white dark:bg-slate-900 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10 dark:border-slate-800 shrink-0">
                  <h3 className="text-lg font-bold text-navy dark:text-white">جزئیات پاسخ</h3>
                  <button onClick={() => setDetail(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/40 dark:text-slate-400 hover:text-ink dark:hover:text-white hover:bg-bg-neutral dark:hover:bg-slate-800 transition-colors"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <PersonAnalytics
                    response={detail}
                    questions={questions}
                    answersByResponse={answersByResponse}
                  />
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-t border-ink/10 dark:border-slate-800 shrink-0">
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

// ════════════════════════════════════════════════════════════════
// آنالیتیکس گروهی فیلد چندانتخابی (اسپک multi-select analytics)
// سه خروجی: سطح عضو (خام) / فراوانی + Pivot / اجتماع — بر اساس
// سطح‌های شناسه‌ی تعریف‌شده در form.identifier_mapping
// ════════════════════════════════════════════════════════════════
function GroupAnalytics({ questions, answers, responses, form }) {
  const multiQs = useMemo(
    () => questions.filter((q) => q.type === "choice" && (q.max_selections ?? 1) > 1),
    [questions]
  );

  const identifierMapping = useMemo(() => {
    const raw = form?.identifier_mapping;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((m) => m && m.field_id)
      .map((m, i) => ({
        level: m.level ?? i + 1,
        field_id: m.field_id,
        label:
          m.label ||
          questions.find((q) => q.id === m.field_id)?.title ||
          `سطح ${m.level ?? i + 1}`,
      }))
      .sort((a, b) => a.level - b.level);
  }, [form, questions]);

  const [fieldId, setFieldId] = useState(null);
  const [groupByLevel, setGroupByLevel] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [subTab, setSubTab] = useState("members"); // members | frequency | union | invalid
  const [pivotMode, setPivotMode] = useState(true);
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);

  const activeFieldId = fieldId ?? multiQs[0]?.id ?? null;
  const activeField = multiQs.find((q) => q.id === activeFieldId) ?? null;
  const activeLevel = groupByLevel ?? identifierMapping[identifierMapping.length - 1]?.level ?? null;

  // ─── فیلتر بازه زمانی (برای همه‌ی خروجی‌ها) ───
  const filteredResponseIds = useMemo(() => {
    const set = new Set();
    for (const r of responses) {
      const d = r.submitted_at || r.created_at;
      if (!d) { set.add(r.id); continue; }
      if (dateFrom && new Date(d) < new Date(`${dateFrom}T00:00:00`)) continue;
      if (dateTo && new Date(d) > new Date(`${dateTo}T23:59:59`)) continue;
      set.add(r.id);
    }
    return set;
  }, [responses, dateFrom, dateTo]);

  const scopedAnswers = useMemo(
    () => answers.filter((a) => filteredResponseIds.has(a.response_id)),
    [answers, filteredResponseIds]
  );
  const scopedResponses = useMemo(
    () => responses.filter((r) => filteredResponseIds.has(r.id)),
    [responses, filteredResponseIds]
  );

  // ─── پرچم رکوردهای نامعتبر (selected_count > max_selectable) ───
  const invalidRecords = useMemo(
    () => getInvalidRecords(questions, scopedAnswers, scopedResponses),
    [questions, scopedAnswers, scopedResponses]
  );
  const invalidResponseIds = useMemo(
    () => new Set(invalidRecords.map((r) => r.response_id)),
    [invalidRecords]
  );

  // ─── خروجی سطح ۱: Member-level ───
  const memberRows = useMemo(
    () =>
      getMemberLevelReport({
        questions,
        answers: scopedAnswers,
        responses: scopedResponses,
        identifierMapping,
        multiSelectFieldId: activeFieldId,
      }),
    [questions, scopedAnswers, scopedResponses, identifierMapping, activeFieldId]
  );

  // ردیف‌های سالم برای تجمیع (نامعتبرها پرچم می‌خورند، در تجمیع وارد نمی‌شوند)
  const validMemberRows = useMemo(
    () => memberRows.filter((r) => !invalidResponseIds.has(r.response_id)),
    [memberRows, invalidResponseIds]
  );

  const frequencyRows = useMemo(
    () => (activeLevel ? getFrequencyReport(validMemberRows, activeLevel, identifierMapping) : []),
    [validMemberRows, activeLevel, identifierMapping]
  );
  const pivotRows = useMemo(
    () => getPivotTable(frequencyRows),
    [frequencyRows]
  );
  const unionRows = useMemo(
    () => (activeLevel ? getUnionReport(validMemberRows, activeLevel, identifierMapping) : []),
    [validMemberRows, activeLevel, identifierMapping]
  );

  function exportCurrentView() {
    if (!activeField) return;
    const slug = form?.slug ?? "form";
    const fname = `${slug}-group-analytics`;
    if (subTab === "members") {
      const header = [
        "زمان ثبت",
        ...identifierMapping.map((m) => m.label),
        "گزینه‌های انتخاب‌شده",
        "تعداد انتخاب",
        "حد مجاز",
        "وضعیت",
      ];
      const rows = memberRows.map((r) => [
        faDateTime(r.submitted_at),
        ...r.identifiers.map((id) => id.value),
        formatOptionsForExport(r.selected_options),
        r.selected_count,
        r.max_selectable,
        r.is_invalid ? "نامعتبر" : "معتبر",
      ]);
      downloadCsv(`${fname}-members.csv`, [header, ...rows]);
    } else if (subTab === "frequency") {
      if (pivotMode) {
        const header = [identifierMapping.find((m) => m.level === activeLevel)?.label ?? "گروه", ...Object.keys(pivotRows[0] ?? {}).filter((k) => k !== "level_value")];
        const rows = pivotRows.map((p) => [p.level_value, ...Object.keys(p).filter((k) => k !== "level_value").map((k) => p[k])]);
        downloadCsv(`${fname}-frequency-pivot.csv`, [header, ...rows]);
      } else {
        const header = [identifierMapping.find((m) => m.level === activeLevel)?.label ?? "گروه", "گزینه", "تعداد"];
        const rows = frequencyRows.map((f) => [f.level_value, f.option_id, f.vote_count]);
        downloadCsv(`${fname}-frequency.csv`, [header, ...rows]);
      }
    } else if (subTab === "union") {
      const header = [identifierMapping.find((m) => m.level === activeLevel)?.label ?? "گروه", "گزینه‌های یکتا", "تعداد گزینه یکتا"];
      const rows = unionRows.map((u) => [u.level_value, formatOptionsForExport(u.selected_options_union), u.count]);
      downloadCsv(`${fname}-union.csv`, [header, ...rows]);
    } else if (subTab === "invalid") {
      const header = ["سوال", "گزینه‌های انتخاب‌شده", "تعداد", "حد مجاز", "دلیل"];
      const rows = invalidRecords.map((r) => [r.question_title, formatOptionsForExport(r.selected_options), r.selected_count, r.max_selectable, r.reason]);
      downloadCsv(`${fname}-invalid.csv`, [header, ...rows]);
    }
  }

  // ─── گارد: فیلد چندانتخابی نداریم ───
  if (multiQs.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={48} />}
        title="سوال چندانتخابی ندارد!"
        subtitle="برای آنالیتیکس گروهی، حداقل یک سوال چندگزینه‌ای با «تعداد انتخاب مجاز» بیشتر از ۱ لازم است."
      />
    );
  }

  // ─── گارد: نگاشت شناسه تعریف نشده ───
  if (identifierMapping.length === 0) {
    return (
      <EmptyState
        icon={<Users size={48} />}
        title="شناسه‌های گروه‌بندی تعریف نشده!"
        subtitle="در فرم‌ساز → تنظیمات فرم → «شناسه‌های آنالیتیکس»، فیلدهای متنی (مثل نام فرد و نام تیم) را به سطح اختصاص بده."
        action={<Button as={Link} to={`/admin/forms/${form?.id}`} variant="indigo" size="sm">رفتن به فرم‌ساز</Button>}
      />
    );
  }

  const memberViewRows = showInvalidOnly
    ? memberRows.filter((r) => invalidResponseIds.has(r.response_id))
    : memberRows;

  return (
    <div className="flex flex-col gap-4">
      {/* ─── نوار فیلترها ─── */}
      <div className="flex flex-wrap items-center gap-2">
        {multiQs.length > 1 && (
          <select
            value={activeFieldId ?? ""}
            onChange={(e) => setFieldId(e.target.value)}
            className="text-xs font-bold rounded-lg border-2 border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink/70 dark:text-slate-200 px-2.5 py-2 cursor-pointer focus:outline-none focus:border-teal"
          >
            {multiQs.map((q) => (
              <option key={q.id} value={q.id}>{q.title.slice(0, 30)}</option>
            ))}
          </select>
        )}
        <select
          value={activeLevel ?? ""}
          onChange={(e) => setGroupByLevel(Number(e.target.value))}
          className="text-xs font-bold rounded-lg border-2 border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink/70 dark:text-slate-200 px-2.5 py-2 cursor-pointer focus:outline-none focus:border-teal"
        >
          {identifierMapping.map((m) => (
            <option key={m.level} value={m.level}>گروه‌بندی: {m.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs font-bold text-ink/60 dark:text-slate-300 bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
          از
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-xs font-semibold text-navy dark:text-slate-100 bg-transparent focus:outline-none" />
        </label>
        <label className="flex items-center gap-1.5 text-xs font-bold text-ink/60 dark:text-slate-300 bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
          تا
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-xs font-semibold text-navy dark:text-slate-100 bg-transparent focus:outline-none" />
        </label>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-xs font-bold text-magenta-text dark:text-rose-300 bg-magenta/10 dark:bg-rose-950/40 border border-magenta/20 dark:border-rose-800/40 rounded-lg px-3 py-2 hover:bg-magenta/20 transition-colors cursor-pointer"
          >
            پاک کردن بازه
          </button>
        )}
        <Button variant="ghost" size="sm" onClick={exportCurrentView} className="mr-auto">
          <Download size={14} /> خروجی CSV
        </Button>
      </div>

      {/* ─── کارت‌های خلاصه ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <SummaryCard icon={MessagesSquare} label="کل رکوردها" value={faNum(memberRows.length)} color="indigo" />
        <SummaryCard
          icon={AlertTriangle}
          label="نامعتبر (بیش از حد مجاز)"
          value={faNum(invalidRecords.length)}
          color={invalidRecords.length ? "amber" : "emerald"}
        />
        <SummaryCard icon={Users} label={`گروه‌های ${identifierMapping.find((m) => m.level === activeLevel)?.label ?? "—"}`} value={faNum(pivotRows.length)} color="violet" />
        <SummaryCard icon={Target} label="حد مجاز هر پاسخ" value={faNum(activeField?.max_selections ?? 1)} color="emerald" />
      </div>

      {/* ─── زیر تب‌ها ─── */}
      <div className="flex flex-wrap gap-1 bg-bg-neutral dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg p-1 w-fit">
        {[
          { key: "members", label: "سطح عضو" },
          { key: "frequency", label: "فراوانی" },
          { key: "union", label: "اجتماع انتخاب‌ها" },
          { key: "invalid", label: `نامعتبرها${invalidRecords.length ? ` (${invalidRecords.length})` : ""}` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-3.5 py-1.5 rounded-md text-sm font-bold transition-colors cursor-pointer ${
              subTab === t.key ? "bg-white dark:bg-slate-900 text-teal-text dark:text-teal-300 shadow-sm border border-transparent dark:border-slate-700" : "text-ink/50 dark:text-slate-400 hover:text-ink dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── تب سطح عضو (خام) ─── */}
      {subTab === "members" && (
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-ink/60 dark:text-slate-300 cursor-pointer w-fit">
            <input type="checkbox" checked={showInvalidOnly} onChange={(e) => setShowInvalidOnly(e.target.checked)} className="accent-teal w-4 h-4 cursor-pointer" />
            فقط نامعتبرها
          </label>
          {memberViewRows.length === 0 ? (
            <EmptyState icon={<Inbox size={40} />} title="رکوردی در این بازه نیست." />
          ) : (
            <StickerCard theme="white">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">#</th>
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">زمان</th>
                      {identifierMapping.map((m) => (
                        <th key={m.level} className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">{m.label}</th>
                      ))}
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">انتخاب‌ها</th>
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">تعداد</th>
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberViewRows.map((r, i) => (
                      <tr key={`${r.response_id}-${r.field_id}`} className={`border-b border-ink/5 dark:border-slate-800/60 last:border-0 ${r.is_invalid ? "bg-magenta/5 dark:bg-rose-950/20" : ""}`}>
                        <td className="px-3 py-2.5 font-mono text-ink/50 dark:text-slate-400 text-xs">{faNum(i + 1)}</td>
                        <td className="px-3 py-2.5 text-ink/60 dark:text-slate-400 text-xs whitespace-nowrap">{faDateTime(r.submitted_at)}</td>
                        {r.identifiers.map((id) => (
                          <td key={id.level} className="px-3 py-2.5 font-bold text-navy dark:text-white">{id.value}</td>
                        ))}
                        <td className="px-3 py-2.5 text-ink/70 dark:text-slate-300">{formatOptionsForExport(r.selected_options)}</td>
                        <td className="px-3 py-2.5 font-black text-navy dark:text-teal-300">{faNum(r.selected_count)}</td>
                        <td className="px-3 py-2.5">
                          {r.is_invalid ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-magenta-text dark:text-rose-300 bg-magenta/10 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-magenta/20 dark:border-rose-800/40">
                              <AlertTriangle size={11} /> نامعتبر
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-teal-text dark:text-teal-300 bg-bg-mint dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal/20 dark:border-teal-700/50">
                              <CheckCircle2 size={11} /> معتبر
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StickerCard>
          )}
        </div>
      )}

      {/* ─── تب فراوانی (Frequency + Pivot) ─── */}
      {subTab === "frequency" && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-ink/60 dark:text-slate-300 cursor-pointer w-fit">
            <input type="checkbox" checked={pivotMode} onChange={(e) => setPivotMode(e.target.checked)} className="accent-teal w-4 h-4 cursor-pointer" />
            نمایش جدول محوری (Pivot)
          </label>
          {frequencyRows.length === 0 ? (
            <EmptyState icon={<BarChart2 size={40} />} title="داده‌ای برای تجمیع نیست." />
          ) : pivotMode ? (
            <StickerCard theme="white">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">
                        {identifierMapping.find((m) => m.level === activeLevel)?.label ?? "گروه"}
                      </th>
                      {Object.keys(pivotRows[0] ?? {}).filter((k) => k !== "level_value").map((opt) => (
                        <th key={opt} className="text-center font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">{opt}</th>
                      ))}
                      <th className="text-center font-extrabold text-navy dark:text-white px-3 py-2.5 bg-bg-lavender/50 dark:bg-slate-800">جمع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivotRows.map((p, i) => {
                      const opts = Object.keys(p).filter((k) => k !== "level_value");
                      const sum = opts.reduce((acc, k) => acc + (p[k] || 0), 0);
                      const maxVal = Math.max(...opts.map((k) => p[k] || 0), 0);
                      return (
                        <tr key={i} className="border-b border-ink/5 dark:border-slate-800/60 last:border-0">
                          <td className="px-3 py-2.5 font-bold text-navy dark:text-white whitespace-nowrap">{p.level_value}</td>
                          {opts.map((opt) => (
                            <td key={opt} className={`px-3 py-2.5 text-center font-bold ${p[opt] ? (p[opt] === maxVal ? "text-teal-text dark:text-teal-300" : "text-navy dark:text-slate-200") : "text-ink/25 dark:text-slate-600"}`}>
                              {faNum(p[opt] || 0)}
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-center font-black text-navy dark:text-white bg-bg-lavender/30 dark:bg-slate-800/60">{faNum(sum)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </StickerCard>
          ) : (
            <StickerCard theme="white">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">{identifierMapping.find((m) => m.level === activeLevel)?.label ?? "گروه"}</th>
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">گزینه</th>
                      <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">تعداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frequencyRows.map((f, i) => (
                      <tr key={i} className={`border-b border-ink/5 dark:border-slate-800/60 last:border-0 ${f.vote_count > 0 ? "" : "opacity-40"}`}>
                        <td className="px-3 py-2.5 font-bold text-navy dark:text-white">{f.level_value}</td>
                        <td className="px-3 py-2.5 text-ink/70 dark:text-slate-300">{f.option_id}</td>
                        <td className="px-3 py-2.5 font-black text-navy dark:text-teal-300">{faNum(f.vote_count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StickerCard>
          )}

          {/* نمودار میله‌ای فراوانی per گروه */}
          {pivotRows.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-ink/10 dark:border-slate-800 p-4 shadow-sm">
              <h4 className="text-sm font-black text-navy dark:text-white mb-3 flex items-center gap-2">
                <BarChart2 size={16} className="text-teal" /> فراوانی گزینه‌ها به تفکیک {identifierMapping.find((m) => m.level === activeLevel)?.label}
              </h4>
              <ResponsiveContainer width="100%" height={Math.max(160, pivotRows.length * 46 + 40)}>
                <BarChart data={pivotRows.map((p) => {
                  const row = { name: p.level_value };
                  for (const [k, v] of Object.entries(p)) { if (k !== "level_value") row[k] = v; }
                  return row;
                })} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: "0.5rem" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {Object.keys(pivotRows[0] ?? {}).filter((k) => k !== "level_value").map((opt, i) => (
                    <Bar key={opt} dataKey={opt} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === Object.keys(pivotRows[0]).length - 2 ? [0, 4, 4, 0] : undefined} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ─── تب اجتماع (Union) ─── */}
      {subTab === "union" && (
        unionRows.length === 0 ? (
          <EmptyState icon={<Layers size={40} />} title="داده‌ای برای تجمیع نیست." />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {unionRows.map((u, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border-2 border-ink/10 dark:border-slate-800 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-black text-navy dark:text-white truncate">{u.level_value}</h4>
                  <Badge color="teal" rotate="0">{faNum(u.count)} گزینه یکتا</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {u.selected_options_union.map((opt) => (
                    <span key={opt} className="text-xs font-bold text-navy dark:text-slate-100 bg-bg-lavender/60 dark:bg-slate-800 border border-navy/10 dark:border-slate-700 rounded-pill-sm px-2.5 py-1">
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─── تب نامعتبرها ─── */}
      {subTab === "invalid" && (
        invalidRecords.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={40} />}
            title="رکورد نامعتبری وجود ندارد"
            subtitle="همه‌ی پاسخ‌ها در حد مجاز انتخاب داشته‌اند. (پاسخ‌های جدیدی که بیش از حد مجاز تیک بخورند، در دیتابیس رد می‌شوند و اصلاً ثبت نمی‌شوند)"
          />
        ) : (
          <StickerCard theme="white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-navy dark:text-slate-200 border-b-2 border-ink/10 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                    <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">#</th>
                    <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">سوال</th>
                    <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">انتخاب‌ها</th>
                    <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">تعداد / حد</th>
                    <th className="text-right font-extrabold text-ink/70 dark:text-slate-300 px-3 py-2.5">دلیل</th>
                  </tr>
                </thead>
                <tbody>
                  {invalidRecords.map((r, i) => (
                    <tr key={`${r.response_id}-${r.question_id}-${i}`} className="border-b border-ink/5 dark:border-slate-800/60 last:border-0 bg-magenta/5 dark:bg-rose-950/20">
                      <td className="px-3 py-2.5 font-mono text-ink/50 dark:text-slate-400 text-xs">{faNum(i + 1)}</td>
                      <td className="px-3 py-2.5 font-bold text-navy dark:text-white">{r.question_title}</td>
                      <td className="px-3 py-2.5 text-ink/70 dark:text-slate-300">{formatOptionsForExport(r.selected_options)}</td>
                      <td className="px-3 py-2.5 font-black text-magenta-text dark:text-rose-300 whitespace-nowrap">{faNum(r.selected_count)} / {faNum(r.max_selectable)}</td>
                      <td className="px-3 py-2.5 text-ink/60 dark:text-slate-400 text-xs">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StickerCard>
        )
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    indigo: "bg-bg-lavender text-navy dark:bg-indigo-950/60 dark:text-indigo-300",
    emerald: "bg-bg-mint text-teal-text dark:bg-emerald-950/60 dark:text-emerald-300",
    amber: "bg-[#FEF7EC] text-orange dark:bg-amber-950/60 dark:text-amber-300",
    violet: "bg-[#FEFAFB] text-magenta-text dark:bg-pink-950/60 dark:text-pink-300",
  };
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border-2 border-ink/10 dark:border-slate-700 p-3.5 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-xs font-bold text-ink-subtle dark:text-slate-400">{label}</p>
          <p className="text-lg font-extrabold text-navy dark:text-white">{value}</p>
          {sub && <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
