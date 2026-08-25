import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import EmptyState from "../../../components/ui/EmptyState";
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
import {
  Eye,
  Download,
  BarChart3,
  ArrowLeft,
  Filter,
  Search,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessagesSquare,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#14b8a6", "#f97316"];

function AnswerValue({ question, value }) {
  if (value === null || value === undefined || value === "") return <span className="text-gray-400">—</span>;
  if (question.type === "rating") return <span>{"⭐".repeat(Number(value))}</span>;
  if (question.type === "phone_ir" || question.type === "email")
    return <span dir="ltr" className="font-mono font-bold">{String(value)}</span>;
  return <span className="font-medium whitespace-pre-wrap">{String(value)}</span>;
}

function QuestionAnalysis({ question, answers, totalResponses }) {
  const values = answers.map((a) => a.value).filter((v) => v !== null && v !== undefined && v !== "");
  const total = values.length;

  const dist = useMemo(() => {
    let keys;
    if (question.type === "choice") keys = question.options ?? [];
    else if (question.type === "yes_no") keys = ["بله", "خیر"];
    else if (question.type === "rating") keys = [5, 4, 3, 2, 1];
    if (!keys) return null;

    const counts = Object.fromEntries(keys.map((k) => [String(k), 0]));
    for (const v of values) {
      const k = String(v);
      if (k in counts) counts[k]++;
    }
    return keys.map((k) => ({
      key: k,
      count: counts[String(k)],
      pct: total ? Math.round((counts[String(k)] / total) * 100) : 0,
    }));
  }, [question, values]);

  // Numeric stats
  const numericStats = useMemo(() => {
    if (question.type !== "number" && question.type !== "rating") return null;
    const nums = values.map((v) => Number(v)).filter((n) => !isNaN(n));
    if (!nums.length) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const variance = nums.reduce((acc, n) => acc + Math.pow(n - avg, 2), 0) / nums.length;
    const stdDev = Math.sqrt(variance);
    return { avg: avg.toFixed(2), median, min, max, stdDev: stdDev.toFixed(2), count: nums.length };
  }, [question.type, values]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h4 className="font-bold text-gray-900">
            {QUESTION_TYPES[question.type]?.icon} {question.title}
          </h4>
          <p className="text-xs text-gray-400 mt-0.5">
            {question.type === "choice" ? "چندگزینه‌ای" :
             question.type === "yes_no" ? "بله/خیر" :
             question.type === "rating" ? "امتیاز" :
             question.type === "number" ? "عددی" : "متنی"}
          </p>
        </div>
        <Badge color="indigo">{faNum(total)} جواب</Badge>
      </div>

      {total === 0 && (
        <p className="text-sm text-gray-400">هنوز جوابی ثبت نشده.</p>
      )}

      {/* Distribution chart for choice/yes_no/rating */}
      {dist && total > 0 && (
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-2">
            {dist.map((d) => (
              <div key={String(d.key)} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-medium text-gray-600 truncate">
                  {question.type === "rating" ? "⭐".repeat(Number(d.key)) : d.key}
                </span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className="w-14 text-xs font-bold text-indigo-600 text-left" dir="ltr">
                  {d.pct}٪
                </span>
              </div>
            ))}
          </div>
          <div className="w-32 shrink-0">
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie
                  data={dist}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {dist.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center text-[0.65rem] text-gray-400 mt-1">توزیع</p>
          </div>
        </div>
      )}

      {/* Numeric stats */}
      {numericStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          <StatItem label="میانگین" value={numericStats.avg} />
          <StatItem label="میانگه" value={numericStats.median} />
          <StatItem label="حداکثر" value={numericStats.max} />
          <StatItem label="حداقل" value={numericStats.min} />
          <StatItem label="انحراف معیار" value={numericStats.stdDev} />
          <StatItem label="تعداد" value={numericStats.count} />
        </div>
      )}

      {/* Text answers list */}
      {!dist && !numericStats && total > 0 && (
        <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {values.map((v, i) => (
            <li
              key={i}
              className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-medium text-gray-700"
            >
              {question.type === "rating" ? "⭐".repeat(Number(v)) : String(v)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-[0.65rem] text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

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

  async function load() {
    const [{ data: f }, { data: qs }, { data: rs }] = await Promise.all([
      supabase.from("forms").select("*").eq("id", id).maybeSingle(),
      supabase.from("questions").select("*").eq("form_id", id).order("position"),
      supabase
        .from("responses")
        .select("*")
        .eq("form_id", id)
        .order("created_at", { ascending: false }),
    ]);
    setForm(f);
    setQuestions(qs ?? []);
    setResponses(rs ?? []);
    if (rs?.length) {
      const { data: ans } = await supabase
        .from("answers")
        .select("id, response_id, question_id, value, time_spent_seconds")
        .in("response_id", rs.map((r) => r.id));
      setAnswers(ans ?? []);
    } else {
      setAnswers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`responses-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `form_id=eq.${id}` },
        () => {
          push("پاسخ جدیدی ثبت شد! 🎉", "info");
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const answersByResponse = useMemo(() => {
    const map = {};
    for (const a of answers) {
      (map[a.response_id] ??= []).push(a);
    }
    return map;
  }, [answers]);

  const questionById = useMemo(
    () => Object.fromEntries(questions.map((q) => [q.id, q])),
    [questions]
  );

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

  const stats = useMemo(() => {
    const complete = responses.filter((r) => r.is_complete);
    const durations = complete.map((r) => r.duration_seconds).filter((d) => d > 0);
    const today = responses.filter((r) => {
      const d = new Date(r.submitted_at || r.created_at);
      const todayStr = new Date().toISOString().slice(0, 10);
      return d.toISOString().slice(0, 10) === todayStr;
    });
    return {
      total: responses.length,
      complete: complete.length,
      today: today.length,
      avg: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    };
  }, [responses]);

  function exportData(format = "csv") {
    if (!hasPermission("export_excel") && format === "excel") {
      push("شما مجوز خروجی اکسل ندارید.", "error");
      return;
    }

    const header = [
      "شناسه پاسخ",
      "زمان ثبت",
      "تکمیل‌شده",
      "مدت (ثانیه)",
      "دستگاه",
      "مرورگر",
      "سیستم‌عامل",
      ...questions.map((q) => q.title),
    ];

    const rows = filtered.map((r) => {
      const rAnswers = answersByResponse[r.id] ?? [];
      const vals = questions.map((q) => {
        const a = rAnswers.find((x) => x.question_id === q.id);
        if (!a || a.value === null || a.value === undefined) return "";
        if (q.type === "rating") return Number(a.value);
        return a.value;
      });
      return [
        r.id,
        r.submitted_at ? new Date(r.submitted_at).toLocaleString("fa-IR") : "",
        r.is_complete ? "بله" : "خیر",
        r.duration_seconds ?? "",
        DEVICE_FA[r.device] ?? r.device ?? "",
        r.browser ?? "",
        r.os ?? "",
        ...vals,
      ];
    });

    if (format === "excel") {
      downloadExcel(`${form?.slug ?? "form"}-responses.xlsx`, header, rows);
    } else {
      downloadCsv(`${form?.slug ?? "form"}-responses.csv`, [header, ...rows]);
    }
    push(`فایل ${format === "excel" ? "Excel" : "CSV"} دانلود شد 📥`);
  }

  async function deleteResponse(r) {
    if (!confirm("آیا از حذف این پاسخ مطمئنید؟")) return;
    const { error } = await supabase.from("responses").delete().eq("id", r.id);
    if (error) {
      push("حذف ناموفق بود", "error");
      return;
    }
    push("پاسخ حذف شد");
    setDetail(null);
    load();
  }

  if (loading) return <Spinner label="پاسخ‌ها در حال بارگذاری..." />;

  if (!form) {
    return (
      <EmptyState
        icon="🤷"
        title="فرم پیدا نشد!"
        action={<Button as={Link} to="/admin/forms" variant="indigo">برگشت به فرم‌ها</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button as={Link} to={`/admin/forms/${id}`} variant="ghost" size="sm">
            <ArrowLeft size={14} />
            ویرایش فرم
          </Button>
          <div>
            <h1 className="text-xl font-black text-gray-900">{form.title}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {questions.length} سوال • {stats.total} پاسخ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            زنده
          </span>
          {hasPermission("export_excel") && (
            <Button variant="ghost" size="sm" onClick={() => exportData("csv")}>
              <Download size={14} />
              CSV
            </Button>
          )}
          {hasPermission("export_excel") && (
            <Button variant="ghost" size="sm" onClick={() => exportData("excel")}>
              <Download size={14} />
              Excel
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={MessagesSquare}
          label="کل پاسخ‌ها"
          value={stats.total}
          color="indigo"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="کامل‌شده"
          value={stats.complete}
          sub={`${stats.total ? Math.round((stats.complete / stats.total) * 100) : 0}٪`}
          color="emerald"
        />
        <SummaryCard
          icon={TrendingUp}
          label="امروز"
          value={stats.today}
          color="amber"
        />
        <SummaryCard
          icon={Clock}
          label="میانگین زمان"
          value={stats.avg ? `${stats.avg}ث` : "—"}
          color="violet"
        />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="جستجو در پاسخ‌ها..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg pr-9 pl-4 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-2">
          <input
            type="checkbox"
            checked={onlyComplete}
            onChange={(e) => setOnlyComplete(e.target.checked)}
            className="accent-indigo-600 w-4 h-4"
          />
          فقط کامل‌ها
        </label>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "list", label: `📋 پاسخ‌ها (${filtered.length})` },
          { key: "analysis", label: "📊 تحلیل سوال‌ها" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
              tab === t.key
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List Tab */}
      {tab === "list" && (
        filtered.length === 0 ? (
          <EmptyState
            icon="📭"
            title="هنوز پاسخی ثبت نشده!"
            subtitle="لینک فرم را بفرست؛ هر پاسخ جدید اینجا ظاهر می‌شود."
            action={form.published ? (
              <Button as="a" href={`/f/${form.slug}`} target="_blank" variant="indigo">
                مشاهده فرم ↗
              </Button>
            ) : null}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-right font-semibold text-gray-600 px-4 py-3">#</th>
                    <th className="text-right font-semibold text-gray-600 px-4 py-3">زمان ثبت</th>
                    <th className="text-right font-semibold text-gray-600 px-4 py-3">وضعیت</th>
                    <th className="text-right font-semibold text-gray-600 px-4 py-3">مدت</th>
                    <th className="text-right font-semibold text-gray-600 px-4 py-3">دستگاه</th>
                    <th className="text-right font-semibold text-gray-600 px-4 py-3">پاسخ نمونه</th>
                    <th className="text-left font-semibold text-gray-600 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const rAns = answersByResponse[r.id] ?? [];
                    const firstText = questions
                      .map((q) => rAns.find((a) => a.question_id === q.id))
                      .find((a) => a && a.value !== null && a.value !== undefined && String(a.value) !== "");
                    return (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {faDateTime(r.submitted_at || r.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {r.is_complete ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={12} /> کامل
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              <AlertCircle size={12} /> ناقص
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {r.duration_seconds ? faDuration(r.duration_seconds) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {DEVICE_FA[r.device] ?? r.device ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[12rem] truncate">
                          {firstText ? String(firstText.value).slice(0, 40) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setDetail(r)}>
                            <Eye size={14} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Analysis Tab */}
      {tab === "analysis" && (
        <div className="grid lg:grid-cols-2 gap-4">
          {questions.length === 0 ? (
            <EmptyState icon="🧩" title="این فرم هنوز سوالی ندارد!" />
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

      {/* Detail Modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">جزئیات پاسخ</h3>
              <button
                onClick={() => setDetail(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Metadata */}
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-5">
                <MetaItem label="شروع" value={faDateTime(detail.started_at)} />
                <MetaItem label="ثبت" value={faDateTime(detail.submitted_at || detail.created_at)} />
                <MetaItem label="مدت" value={detail.duration_seconds ? faDuration(detail.duration_seconds) : "—"} />
                <MetaItem label="دستگاه" value={DEVICE_FA[detail.device] ?? detail.device ?? "—"} />
                <MetaItem label="مرورگر" value={`${detail.browser ?? "—"} / ${detail.os ?? "—"}`} />
                <MetaItem
                  label="منبع"
                  value={detail.referer ? (() => { try { return new URL(detail.referer).hostname; } catch { return "مستقیم"; } })() : "مستقیم"}
                />
              </div>

              {/* Answers */}
              <div className="flex flex-col gap-3">
                {questions.map((q, i) => {
                  const a = (answersByResponse[detail.id] ?? []).find((x) => x.question_id === q.id);
                  return (
                    <div key={q.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="text-sm font-bold text-gray-900">
                          {i + 1}. {q.title}
                        </span>
                        {a?.time_spent_seconds > 0 && (
                          <span className="text-[0.65rem] font-medium text-gray-400 whitespace-nowrap">
                            ⏱ {faDuration(a.time_spent_seconds)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700">
                        <AnswerValue question={q} value={a?.value} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <Button
                variant="red"
                size="sm"
                onClick={() => deleteResponse(detail)}
              >
                🗑 حذف این پاسخ
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
                بستن
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-xl font-black text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
