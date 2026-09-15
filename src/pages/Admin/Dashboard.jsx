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
import SEO from "../../components/ui/SEO";


export default function Dashboard() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({
    forms: 0,
    responses: 0,
    complete: 0,
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
    let respList = [];

    if (isSuper || formIds.length > 0) {
      const [respCountRes, compCountRes, recentRes] = await Promise.all([
        totalRespQuery,
        totalCompQuery,
        recentQuery,
      ]);
      exactResponsesCount = respCountRes?.count ?? 0;
      exactCompleteCount = compCountRes?.count ?? 0;
      respList = recentRes?.data ?? [];
    }

    const completeList = respList.filter((r) => r.is_complete);
    const durations = completeList.map((r) => r.duration_seconds).filter((d) => d > 0);

    setForms(formList);
    setRecent(respList.slice(0, 8));
    setStats({
      forms: formList.length,
      responses: exactResponsesCount,
      complete: exactCompleteCount,
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
          <h1 className="text-xl sm:text-3xl font-black text-navy dark:text-white">داشبورد کل</h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 mt-1">
            نمای کلی فرم‌ها و پاسخ‌ها
            <span className="live-dot inline-block w-1.5 h-1.5 rounded-full bg-teal mr-1.5 align-middle" />
          </p>
        </div>
        <Button as={Link} to="/admin/forms" variant="teal" size="sm">
          مدیریت فرم‌ها
        </Button>
      </div>

      {/* آمار کلی */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        <StatCard theme="ecosystem" title="فرم‌ها" value={stats.forms} subtitle="کل فرم‌های سامانه" />
        <StatCard theme="college" title="پاسخ‌ها" value={stats.responses} subtitle="ثبت‌شدگان کل" />
        <StatCard theme="male" title="تکمیل" value={stats.complete} subtitle="پاسخ‌های کامل" />
        <StatCard
          theme="female"
          title={durationUnit === "min" ? "میانگین زمان (دقیقه)" : "میانگین زمان (ثانیه)"}
          value={formattedDuration}
          subtitle={durationCaption}
          onClick={toggleDurationUnit}
        />
      </div>

      {/* آخرین پاسخ‌ها */}
      <div>
        <h2 className="text-base sm:text-lg font-black text-sec dark:text-white mb-3 sm:mb-4">آخرین پاسخ‌ها</h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Inbox size={48} />}
            title="هنوز هیچ پاسخی نرسیده!"
            subtitle="اولین فرمت را بساز، لینکش را بفرست و منتظر بمان؛ این‌جا زنده پر می‌شود."
            action={<Button as={Link} to="/admin/forms" variant="teal">ساخت اولین فرم</Button>}
          />
        ) : (
          <div className="rokad-card p-0 overflow-hidden shadow-hard-sm dark:shadow-dark-hard">
            {/* دسکتاپ: جدول افقی */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8F9FA] dark:bg-[#1C2536] border-b-[1.5px] border-[#EAEAEA] dark:border-gray-800 text-xs text-[#6C757D] dark:text-gray-400 font-bold">
                    <th className="text-right px-4 py-3.5">فرم</th>
                    <th className="text-right px-4 py-3.5">زمان ثبت</th>
                    <th className="text-right px-4 py-3.5">وضعیت</th>
                    <th className="text-right px-4 py-3.5">مدت</th>
                    <th className="text-right px-4 py-3.5">دستگاه</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, i) => (
                    <tr
                      key={r.id}
                      className="border-b border-[#F0F0F0] dark:border-gray-800/70 hover:bg-[#F8F9FA] dark:hover:bg-[#1C2536]/50 transition-colors last:border-0"
                    >
                      <td className="px-4 py-3 font-bold text-sec dark:text-slate-100">{formTitleById[r.form_id] ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{faRelative(r.submitted_at ?? r.created_at)}</td>
                      <td className="px-4 py-3">
                        {r.is_complete ? (
                          <Badge color="green">کامل</Badge>
                        ) : (
                          <Badge color="gray">ناقص</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">
                        {r.duration_seconds ? faDuration(r.duration_seconds) : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{DEVICE_FA[r.device] ?? r.device ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* موبایل: ردیف‌های فشرده — اسکرول عمودی */}
            <div className="md:hidden max-h-[24rem] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#F8F9FA] dark:bg-[#1C2536] border-b border-[#EAEAEA] dark:border-gray-800 text-gray-500 dark:text-gray-400 z-10">
                  <tr>
                    <th className="text-right font-bold px-3 py-2.5">فرم</th>
                    <th className="text-right font-bold px-3 py-2.5">زمان</th>
                    <th className="text-center font-bold px-3 py-2.5">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[#F0F0F0] dark:border-gray-800/70 last:border-0"
                    >
                      <td className="px-3 py-2.5 font-bold text-sec dark:text-slate-100 max-w-[45%] truncate" title={formTitleById[r.form_id] ?? "—"}>
                        {formTitleById[r.form_id] ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {faRelative(r.submitted_at ?? r.created_at)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {r.is_complete ? <Badge color="green">کامل</Badge> : <Badge color="gray">ناقص</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
