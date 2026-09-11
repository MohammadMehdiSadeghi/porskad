import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/ui/StatCard";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { DashboardSkeleton } from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/Toast";
import { Inbox } from "lucide-react";
import { faNum, faRelative, faDuration, DEVICE_FA } from "../../lib/utils";
import { getPlan } from "../../lib/plans";
import SEO from "../../components/ui/SEO";


export default function Dashboard() {
  const { user, profile, isOwner, loading: authLoading } = useAuth();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({
    forms: 0,
    responses: 0,
    complete: 0,
    today: 0,
    avgDuration: null,
  });
  const [durationUnit, setDurationUnit] = useState(() => {
    try {
      return localStorage.getItem("porskad_dash_duration_unit") || "sec";
    } catch {
      return "sec";
    }
  });

  const toggleDurationUnit = () => {
    setDurationUnit((prev) => {
      const next = prev === "sec" ? "min" : "sec";
      try {
        localStorage.setItem("porskad_dash_duration_unit", next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  let formattedDuration = "—";
  let durationCaption = "داده‌ای نیست";
  if (stats.avgDuration) {
    if (durationUnit === "min") {
      const mins = stats.avgDuration / 60;
      const minFormatted = mins >= 10 ? Math.round(mins) : mins.toFixed(1);
      formattedDuration = `${faNum(minFormatted)}`;
      durationCaption = "دقیقه/فرم (کلیک برای ثانیه)";
    } else {
      formattedDuration = `${faNum(stats.avgDuration)}`;
      durationCaption = "ثانیه/فرم (کلیک برای دقیقه)";
    }
  }

  const loadAll = useCallback(async (isInitial = false) => {
    if (!user) return;
    if (isInitial) setLoading(true);
    let formsQuery = supabase
      .from("forms")
      .select("id, slug, title, published, created_at, manager_id, created_by")
      .order("created_at", { ascending: false });

    if (!isOwner() && user?.id) {
      formsQuery = formsQuery.or(`manager_id.eq.${user.id},created_by.eq.${user.id}`);
    }

    const { data: formsData } = await formsQuery;
    const formList = formsData ?? [];
    const formIds = formList.map((f) => f.id);
    const isSuper = isOwner();

    // کوئری شمارش دقیق و لیست آخرین پاسخ‌ها
    let totalRespQuery = supabase.from("responses").select("*", { count: "exact", head: true });
    let totalCompQuery = supabase.from("responses").select("*", { count: "exact", head: true }).eq("is_complete", true);
    let recentQuery = supabase
      .from("responses")
      .select("id, form_id, is_complete, submitted_at, duration_seconds, device, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!isSuper) {
      if (formIds.length > 0) {
        totalRespQuery = totalRespQuery.in("form_id", formIds);
        totalCompQuery = totalCompQuery.in("form_id", formIds);
        recentQuery = recentQuery.in("form_id", formIds);
      } else {
        totalRespQuery = null;
        totalCompQuery = null;
        recentQuery = null;
      }
    }

    let exactResponsesCount = 0;
    let exactCompleteCount = 0;
    let todayCount = 0;
    let respList = [];

    if (isSuper || formIds.length > 0) {
      // شمارش پاسخ‌های امروز (مبدأ تهران ≈ UTC+3:30 — سرور ۳:۳۰ بامداد)
      const tehranNow = new Date(Date.now() + 3.5 * 3600 * 1000);
      const dayStartUtc = new Date(
        Date.UTC(
          tehranNow.getUTCFullYear(),
          tehranNow.getUTCMonth(),
          tehranNow.getUTCDate(),
        ),
      ).getTime() - 3.5 * 3600 * 1000;
      let todayQuery = supabase
        .from("responses")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(dayStartUtc).toISOString());
      if (!isSuper) {
        todayQuery =
          formIds.length > 0
            ? todayQuery.in("form_id", formIds)
            : todayQuery.eq("form_id", "00000000-0000-0000-0000-000000000000");
      }
      const [respCountRes, compCountRes, recentRes, todayRes] =
        await Promise.all([
          totalRespQuery,
          totalCompQuery,
          recentQuery,
          todayQuery,
        ]);
      exactResponsesCount = respCountRes?.count ?? 0;
      exactCompleteCount = compCountRes?.count ?? 0;
      todayCount = todayRes?.count ?? 0;
      respList = recentRes?.data ?? [];
    }

    const completeList = respList.filter((r) => r.is_complete);
    const durations = completeList.map((r) => r.duration_seconds).filter((d) => d > 0);

    setForms(formList);
    setRecent(respList.slice(0, 5)); // فقط ۵ آخرین ورودی — برای دیدن
    setStats({
      forms: formList.length,
      responses: exactResponsesCount,
      complete: exactCompleteCount,
      today: todayCount,
      avgDuration: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null,
    });
    setLoading(false);
  }, [user, isOwner]);

  // ref همیشه‌به‌روز از forms — تا callback ریل‌تایم closure قدیمی نگیرد
  const formsRef = useRef(forms);
  useEffect(() => { formsRef.current = forms; }, [forms]);

  useEffect(() => {
    if (authLoading) return;
    loadAll(true);
    if (!supabase) return;
    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses" },
        (payload) => {
          const form = formsRef.current.find((f) => f.id === payload.new.form_id);
          if (form) {
            push(`پاسخ جدید برای «${form?.title ?? "فرم"}» ثبت شد!`, "info");
            loadAll(false);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll, authLoading, push]);

  const formTitleById = useMemo(() => Object.fromEntries(forms.map((f) => [f.id, f.title])), [forms]);

  // ─── داده‌های مشتق: اشتراک + آخرین فرم ───
  const plan = getPlan(profile?.plan);
  const quotaLimit = profile?.max_responses_per_month ?? plan.monthlyResponsesLimit ?? 100;
  const quotaUsed = profile?.monthly_responses_used ?? 0;
  const quotaUnlimited = quotaLimit >= 999999;
  const quotaPct = quotaUnlimited ? 0 : Math.min(Math.round((quotaUsed / quotaLimit) * 100), 100);
  const latestForm = forms[0] ?? null; // forms از قبل newest-first مرتب شده

  if (loading) return <DashboardSkeleton />;

  return (      <div className="flex flex-col gap-6">
      <SEO
        title="داشبورد"
        description="نمای کلی فرم‌ها و پاسخ‌ها — پنل مدیریت پرس‌کاد"
        url="/admin"
        noIndex
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy">داشبورد</h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-1">
            نمای کلی فرم‌ها و پاسخ‌ها
            <span className="live-dot inline-block w-1.5 h-1.5 rounded-full bg-teal mr-1.5 align-middle" />
          </p>
        </div>
        <Button as={Link} to="/admin/forms" variant="teal" size="sm" rotate="-rotate-[1deg]">
          مدیریت فرم‌ها
        </Button>
      </div>

      {/* آمار کلی */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        {/* وضعیت اشتراک */}
        <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none" className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-ink-subtle">وضعیت اشتراک</span>
            <Badge color={plan.id === "free" ? "gray" : plan.id === "pro" ? "teal" : "purple"}>
              {plan.name}
            </Badge>
          </div>
          <div className="text-2xl font-black text-navy leading-none">
            {faNum(quotaUsed)}
            <span className="text-sm font-bold text-ink-subtle"> / {faNum(quotaLimit)}</span>
          </div>
          <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${quotaPct >= 100 ? "bg-magenta" : quotaPct >= 80 ? "bg-orange" : "bg-teal"}`}
              style={{ width: `${Math.min(quotaPct, 100)}%` }}
            />
          </div>
          <div className="text-[11px] font-semibold text-ink-subtle">
            {quotaUnlimited
              ? "پاسخ ماهانه — نامحدود"
              : quotaPct >= 100
                ? "سقف ماهانه پر شده!"
                : `${faNum(quotaPct)}٪ سقف ماهانه مصرف شده`}
          </div>
          {!isOwner() && (
            <Link to="/admin/subscriptions" className="text-[11px] font-black text-teal hover:underline">
              ارتقای اشتراک ←
            </Link>
          )}
        </StickerCard>

        <StatCard theme="orange" label="تعداد کل ورودی‌ها" value={faNum(stats.responses)} caption="مجموع پاسخ‌های همه فرم‌ها" />
        <StatCard theme="navy" label="ورودی‌های امروز" value={faNum(stats.today)} caption="از نیمه‌شب به وقت تهران" />

        {/* آخرین فرم — فقط یکی */}
        <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none" className="p-4 flex flex-col gap-1.5">
          <span className="text-xs font-black text-ink-subtle">آخرین فرم</span>
          {latestForm ? (
            <>
              <Link
                to={`/admin/forms/${latestForm.id}`}
                className="text-base font-black text-navy hover:text-teal truncate leading-snug"
                title={latestForm.title}
              >
                {latestForm.title}
              </Link>
              <div className="flex items-center gap-2 mt-auto">
                {latestForm.published ? <Badge color="green">منتشر</Badge> : <Badge color="gray">پیش‌نویس</Badge>}
                <span className="text-[11px] font-semibold text-ink-subtle">{faRelative(latestForm.created_at)}</span>
              </div>
            </>
          ) : (
            <Link to="/admin/forms" className="text-sm font-bold text-teal hover:underline mt-auto">
              هنوز فرمی نساخته‌اید — بسازید ←
            </Link>
          )}
        </StickerCard>
      </div>

      {/* آخرین ورودی‌ها — فقط ۵ تا، صرفاً برای دیدن */}
      <div>
        <h2 className="text-lg sm:text-xl font-black text-navy mb-3 sm:mb-4">
          آخرین ورودی‌ها
          <span className="text-xs font-bold text-ink-subtle mr-2">(۵ مورد اخیر — برای دیدن وضعیت)</span>
        </h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Inbox size={48} />}
            title="هنوز هیچ پاسخی نرسیده!"
            subtitle="اولین فرمت را بساز، لینکش را بفرست و منتظر بمان؛ این‌جا زنده پر می‌شود."
            action={<Button as={Link} to="/admin/forms" variant="teal">ساخت اولین فرم</Button>}
          />
        ) : (
          <div className="rotate-[0.3deg]">
            <StickerCard theme="white" radius="rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none">
              {/* دسکتاپ: جدول افقی */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-navy border-b-2 border-ink/10">
                      <th className="text-right font-black px-4 py-3">فرم</th>
                      <th className="text-right font-black px-4 py-3">زمان ثبت</th>
                      <th className="text-right font-black px-4 py-3">وضعیت</th>
                      <th className="text-right font-black px-4 py-3">مدت</th>
                      <th className="text-right font-black px-4 py-3">دستگاه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r, i) => (
                      <tr key={r.id} className={`${i % 2 ? "bg-bg-lavender/60" : ""} border-b border-ink/5 last:border-0`}>
                        <td className="px-4 py-3 font-bold text-ink">{formTitleById[r.form_id] ?? "—"}</td>
                        <td className="px-4 py-3 font-semibold text-ink-subtle">{faRelative(r.submitted_at ?? r.created_at)}</td>
                        <td className="px-4 py-3">{r.is_complete ? <Badge color="green">کامل</Badge> : <Badge color="gray">ناقص</Badge>}</td>
                        <td className="px-4 py-3 font-semibold text-ink-subtle">{r.duration_seconds ? faDuration(r.duration_seconds) : "—"}</td>
                        <td className="px-4 py-3 font-semibold text-ink-subtle">{DEVICE_FA[r.device] ?? r.device ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* موبایل: ردیف‌های فشرده — اسکرول عمودی */}
              <div className="md:hidden max-h-[24rem] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-navy border-b-2 border-ink/10">
                      <th className="text-right font-black px-2.5 py-2">فرم</th>
                      <th className="text-right font-black px-2.5 py-2">زمان</th>
                      <th className="text-center font-black px-2 py-2">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r, i) => (
                      <tr key={r.id} className={`${i % 2 ? "bg-bg-lavender/40" : ""} border-b border-ink/5 last:border-0`}
                        style={{ pageBreakInside: 'avoid' }}>
                        <td className="px-2.5 py-2 font-bold text-ink max-w-[45%] truncate" title={formTitleById[r.form_id] ?? "—"}>
                          {formTitleById[r.form_id] ?? "—"}
                        </td>
                        <td className="px-2.5 py-2 font-semibold text-ink-subtle whitespace-nowrap">
                          {faRelative(r.submitted_at ?? r.created_at)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {r.is_complete ? <Badge color="green">کامل</Badge> : <Badge color="gray">ناقص</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StickerCard>
          </div>
        )}
      </div>
    </div>
  );
}
