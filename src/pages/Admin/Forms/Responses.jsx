import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import StickerCard from "../../../components/ui/StickerCard";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Modal from "../../../components/ui/Modal";
import Spinner from "../../../components/ui/Spinner";
import EmptyState from "../../../components/ui/EmptyState";
import { useToast } from "../../../components/ui/Toast";
import { downloadCsv } from "../../../lib/csv";
import {
  faNum,
  faDateTime,
  faDuration,
  DEVICE_FA,
} from "../../../lib/utils";
import { QUESTION_TYPES } from "../../../lib/questionTypes";

// نمایش مقدار یک جواب با توجه به نوع سوال
function AnswerValue({ question, value }) {
  if (value === null || value === undefined || value === "") return <span className="text-ink-subtle/60">—</span>;
  if (question.type === "rating") return <span>{"⭐".repeat(Number(value))}</span>;
  if (question.type === "phone_ir" || question.type === "email")
    return <span dir="ltr" className="font-bold">{String(value)}</span>;
  return <span className="font-bold whitespace-pre-wrap">{String(value)}</span>;
}

// تحلیل یک سوال: میله‌های درصدی یا فهرست جواب‌ها
function QuestionAnalysis({ question, answers }) {
  const values = answers.map((a) => a.value).filter((v) => v !== null && v !== undefined && v !== "");
  const total = values.length;

  const dist = useMemo(() => {
    // برای گزینه‌ای/بله‌خیر: ترتیب گزینه‌ها حفظ شود؛ برای ستاره: ۵ تا ۱
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
    return keys.map((k) => ({ key: k, count: counts[String(k)], pct: total ? Math.round((counts[String(k)] / total) * 100) : 0 }));
  }, [question, values]);

  return (
    <div className="rotate-[0.3deg]">
      <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-black text-navy leading-8">
              {QUESTION_TYPES[question.type].icon} {question.title}
            </h4>
            <Badge color="teal">{faNum(total)} جواب</Badge>
          </div>

          {total === 0 && <p className="text-sm font-semibold text-ink-subtle">هنوز جوابی برای این سوال ثبت نشده.</p>}

          {dist && total > 0 && (
            <div className="flex flex-col gap-2.5">
              {dist.map((d) => (
                <div key={String(d.key)} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm font-bold text-ink truncate">
                    {question.type === "rating" ? "⭐".repeat(Number(d.key)) : d.key}
                  </span>
                  <div className="flex-1 h-6 relative rounded-pill-sm bg-[#ededec] overflow-hidden border border-black/5">
                    <div
                      className="absolute inset-y-0 right-0 bg-teal transition-all duration-500"
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-xs font-black text-teal-text text-left" dir="ltr">
                    {faNum(d.pct)}٪ ({faNum(d.count)})
                  </span>
                </div>
              ))}
            </div>
          )}

          {!dist && total > 0 && (
            <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto pl-1">
              {values.map((v, i) => (
                <li
                  key={i}
                  className="bg-bg-lavender border border-navy/10 rounded-pill-md px-3.5 py-2 text-sm font-semibold text-ink"
                >
                  {question.type === "rating" ? "⭐".repeat(Number(v)) : String(v)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </StickerCard>
    </div>
  );
}

export default function Responses() {
  const { id } = useParams();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [answers, setAnswers] = useState([]); // همه‌ی جواب‌ها
  const [tab, setTab] = useState("list"); // list | analysis
  const [detail, setDetail] = useState(null); // response در حال مشاهده
  const [onlyComplete, setOnlyComplete] = useState(false);

  async function load() {
    const [{ data: f }, { data: qs }, { data: rs }] = await Promise.all([
      supabase.from("forms").select("*").eq("id", id).maybeSingle(),
      supabase.from("questions").select("*").eq("form_id", id).order("position"),
      supabase.from("responses").select("*").eq("form_id", id).order("created_at", { ascending: false }),
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
    // ریل‌تایم: پاسخ جدید → توست + بارگذاری مجدد
    const channel = supabase
      .channel(`responses-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `form_id=eq.${id}` },
        () => {
          push("پاسخ جدیدی ثبت شد! 🎉", "info");
          load();
        },
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
    [questions],
  );

  const filtered = useMemo(
    () => (onlyComplete ? responses.filter((r) => r.is_complete) : responses),
    [responses, onlyComplete],
  );

  const stats = useMemo(() => {
    const complete = responses.filter((r) => r.is_complete);
    const durations = complete.map((r) => r.duration_seconds).filter((d) => d > 0);
    return {
      total: responses.length,
      complete: complete.length,
      avg: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    };
  }, [responses]);

  function exportCsv() {
    const header = [
      "#",
      "زمان ثبت",
      "تکمیل‌شده",
      "مدت (ثانیه)",
      "دستگاه",
      "مرورگر",
      "سیستم‌عامل",
      "منبع ورود",
      ...questions.map((q) => q.title),
      ...questions.map((q) => `زمان سوال: ${q.title} (ثانیه)`),
    ];
    const rows = filtered.map((r, i) => {
      const rAnswers = answersByResponse[r.id] ?? [];
      const vals = questions.map((q) => {
        const a = rAnswers.find((x) => x.question_id === q.id);
        if (!a || a.value === null || a.value === undefined) return "";
        if (q.type === "rating") return Number(a.value);
        return a.value;
      });
      const times = questions.map((q) => {
        const a = rAnswers.find((x) => x.question_id === q.id);
        return a?.time_spent_seconds ?? "";
      });
      return [
        i + 1,
        r.submitted_at ? new Date(r.submitted_at).toLocaleString("fa-IR") : "",
        r.is_complete ? "بله" : "خیر",
        r.duration_seconds ?? "",
        DEVICE_FA[r.device] ?? r.device ?? "",
        r.browser ?? "",
        r.os ?? "",
        r.referer ?? "",
        ...vals,
        ...times,
      ];
    });
    downloadCsv(`${form?.slug ?? "form"}-responses.csv`, [header, ...rows]);
    push("فایل CSV دانلود شد 📥");
  }

  async function deleteResponse(r) {
    const { error } = await supabase.from("responses").delete().eq("id", r.id);
    if (error) {
      push("حذف ناموفق بود", "error");
      return;
    }
    push("پاسخ حذف شد");
    setDetail(null);
    load();
  }

  if (loading) return <Spinner label="پاسخ‌ها دارن لود می‌شن..." />;

  if (!form) {
    return (
      <EmptyState
        icon="🤷"
        title="فرم پیدا نشد!"
        action={<Button as={Link} to="/admin/forms" variant="navy">برگشت به فرم‌ها</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button as={Link} to={`/admin/forms/${id}`} variant="ghost" size="sm">↩ ویرایش فرم</Button>
          <h1 className="text-xl sm:text-2xl font-black text-navy">{form.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="live-dot inline-block w-2 h-2 rounded-full bg-teal" />
          <span className="text-xs font-bold text-teal-text">زنده</span>
          <Button variant="white" size="sm" onClick={exportCsv}>📥 خروجی CSV</Button>
        </div>
      </div>

      {/* آمار */}
      <div className="flex flex-wrap gap-2.5">
        <Badge color="navy" className="!text-sm !px-3.5 !py-1.5">📥 کل: {faNum(stats.total)}</Badge>
        <Badge color="teal" className="!text-sm !px-3.5 !py-1.5">✓ کامل: {faNum(stats.complete)}</Badge>
        <Badge color="orange" className="!text-sm !px-3.5 !py-1.5">
          ⏱ میانگین: {stats.avg ? faDuration(stats.avg) : "—"}
        </Badge>
        <label className="flex items-center gap-1.5 text-xs font-bold text-ink-subtle cursor-pointer select-none mr-2">
          <input
            type="checkbox"
            checked={onlyComplete}
            onChange={(e) => setOnlyComplete(e.target.checked)}
            className="accent-teal w-4 h-4"
          />
          فقط کامل‌ها
        </label>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-2">
        {[
          { key: "list", label: `📋 پاسخ‌ها (${faNum(filtered.length)})` },
          { key: "analysis", label: "📊 تحلیل سوال‌ها" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-pill-md text-sm font-extrabold border-2 transition-all cursor-pointer ${
              tab === t.key
                ? "bg-navy text-white border-navy -rotate-[0.5deg]"
                : "bg-white text-navy border-ink/15 hover:border-navy/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* لیست پاسخ‌ها */}
      {tab === "list" &&
        (filtered.length === 0 ? (
          <EmptyState
            icon="📭"
            title="هنوز پاسخی برای این فرم نیامده!"
            subtitle="لینک فرم را بفرست؛ هر پاسخ جدید همین‌جا لحظه‌ای ظاهر می‌شود."
            action={form.published ? (
              <Button as="a" href={`/f/${form.slug}`} target="_blank" variant="teal">مشاهده‌ی فرم ↗</Button>
            ) : null}
          />
        ) : (
          <div className="rotate-[0.2deg]">
            <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-navy border-b-2 border-ink/10">
                      <th className="text-right font-black px-4 py-3">#</th>
                      <th className="text-right font-black px-4 py-3">ساعت پاسخ</th>
                      <th className="text-right font-black px-4 py-3">وضعیت</th>
                      <th className="text-right font-black px-4 py-3">مدت</th>
                      <th className="text-right font-black px-4 py-3">دستگاه</th>
                      <th className="text-right font-black px-4 py-3">جواب‌ها</th>
                      <th className="text-right font-black px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => {
                      const rAns = answersByResponse[r.id] ?? [];
                      const firstText = questions
                        .map((q) => rAns.find((a) => a.question_id === q.id))
                        .find((a) => a && a.value !== null && a.value !== undefined && String(a.value) !== "");
                      return (
                        <tr key={r.id} className={i % 2 ? "bg-bg-lavender/60" : ""}>
                          <td className="px-4 py-3 font-black text-ink-subtle">{faNum(i + 1)}</td>
                          <td className="px-4 py-3 font-semibold text-ink">{faDateTime(r.submitted_at ?? r.created_at)}</td>
                          <td className="px-4 py-3">
                            {r.is_complete ? <Badge color="green">✓ کامل</Badge> : <Badge color="gray">ناقص</Badge>}
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink-subtle">
                            {r.duration_seconds ? faDuration(r.duration_seconds) : "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink-subtle">
                            {DEVICE_FA[r.device] ?? r.device ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink max-w-[14rem] truncate">
                        {firstText ? String(firstText.value).slice(0, 40) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="white" size="sm" onClick={() => setDetail(r)}>👁 مشاهده</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </StickerCard>
          </div>
        ))}

      {/* تحلیل سوال‌ها */}
      {tab === "analysis" && (
        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {questions.length === 0 ? (
            <EmptyState icon="🧩" title="این فرم هنوز سوالی ندارد!" />
          ) : (
            questions.map((q) => (
              <QuestionAnalysis
                key={q.id}
                question={q}
                answers={answers.filter((a) => a.question_id === q.id)}
              />
            ))
          )}
        </div>
      )}

      {/* مودال جزئیات پاسخ */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="جزئیات پاسخ" wide>
        {detail && (
          <div className="flex flex-col gap-5">
            {/* متادیتا */}
            <div className="bg-bg-mint border-2 border-teal/40 rounded-pill-md p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="block text-xs font-bold text-teal-text">ساعت شروع</span>
                <span className="font-extrabold text-ink">{faDateTime(detail.started_at)}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-teal-text">ساعت ثبت</span>
                <span className="font-extrabold text-ink">{faDateTime(detail.submitted_at ?? detail.created_at)}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-teal-text">مدت کل</span>
                <span className="font-extrabold text-ink">
                  {detail.duration_seconds ? faDuration(detail.duration_seconds) : "—"}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-teal-text">دستگاه</span>
                <span className="font-extrabold text-ink">{DEVICE_FA[detail.device] ?? detail.device ?? "—"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-teal-text">مرورگر / سیستم‌عامل</span>
                <span className="font-extrabold text-ink" dir="ltr">
                  {detail.browser ?? "—"} / {detail.os ?? "—"}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-teal-text">منبع ورود</span>
                <span className="font-extrabold text-ink truncate block max-w-[10rem]" dir="ltr" title={detail.referer ?? ""}>
                  {detail.referer ? new URL(detail.referer).hostname : "مستقیم"}
                </span>
              </div>
            </div>

            {/* جواب‌ها */}
            <div className="flex flex-col gap-3">
              {questions.map((q, i) => {
                const a = (answersByResponse[detail.id] ?? []).find((x) => x.question_id === q.id);
                return (
                  <div
                    key={q.id}
                    className="border-2 border-ink/10 rounded-pill-md p-4 flex flex-col gap-1.5 bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-black text-navy">
                        {faNum(i + 1)}. {q.title}
                      </span>
                      {a?.time_spent_seconds > 0 && (
                        <span className="text-[0.7rem] font-bold text-ink-subtle whitespace-nowrap">
                          ⏱ {faDuration(a.time_spent_seconds)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-ink">
                      <AnswerValue question={q} value={a?.value} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-1">
              <Button variant="magenta" size="sm" onClick={() => deleteResponse(detail)}>
                🗑 حذف این پاسخ
              </Button>
              <Button variant="white" size="sm" onClick={() => setDetail(null)}>بستن</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
