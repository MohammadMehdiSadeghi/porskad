import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import StatCard from "../../components/ui/StatCard";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/Toast";
import { Inbox } from "lucide-react";
import { faNum, faRelative, faDuration, DEVICE_FA } from "../../lib/utils";
import SEO from "../../components/ui/SEO";

export default function Dashboard() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({ forms: 0, responses: 0, complete: 0, avgDuration: null });

  async function loadAll() {
    setLoading(true);
    const [{ data: formsData }, { data: respData }] = await Promise.all([
      supabase.from("forms").select("id, slug, title, published, created_at").order("created_at", { ascending: false }),
      supabase
        .from("responses")
        .select("id, form_id, is_complete, submitted_at, duration_seconds, device, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    const formList = formsData ?? [];
    const respList = respData ?? [];
    const completeList = respList.filter((r) => r.is_complete);
    const durations = completeList.map((r) => r.duration_seconds).filter((d) => d > 0);

    setForms(formList);
    setRecent(respList.slice(0, 8));
    setStats({
      forms: formList.length,
      responses: respList.length,
      complete: completeList.length,
      avgDuration: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null,
    });
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    if (!supabase) return;
    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses" },
        (payload) => {
          const form = forms.find((f) => f.id === payload.new.form_id);
          push(`پاسخ جدید برای «${form?.title ?? "فرم"}» ثبت شد!`, "info");
          loadAll();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forms.length]);

  const formTitleById = useMemo(() => Object.fromEntries(forms.map((f) => [f.id, f.title])), [forms]);

  if (loading) return <Spinner label="داشبورد داره لود می‌شه..." />;

  return (      <div className="flex flex-col gap-6">
      <SEO
        title="داشبورد"
        description="نمای کلی فرم‌ها و پاسخ‌ها — پنل مدیریت پرسکاد"
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
        <StatCard theme="teal" label="فرم‌ها" value={faNum(stats.forms)} caption="کل فرم‌ها" />
        <StatCard theme="orange" label="پاسخ‌ها" value={faNum(stats.responses)} caption="ثبت‌شدگان" />
        <StatCard theme="navy" label="تکمیل" value={faNum(stats.complete)} caption="کامل پر شده" />
        <StatCard
          theme="magenta"
          label="میانگین زمان"
          value={stats.avgDuration ? faNum(stats.avgDuration) : "—"}
          caption={stats.avgDuration ? "ثانیه/فرم" : "داده‌ای نیست"}
        />
      </div>

      {/* آخرین پاسخ‌ها */}
      <div>
        <h2 className="text-xl font-black text-navy mb-4">آخرین پاسخ‌ها</h2>
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
              <div className="overflow-x-auto">
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
                        <td className="px-4 py-3 font-semibold text-ink-subtle">
                          {faRelative(r.submitted_at ?? r.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {r.is_complete ? (
                            <Badge color="green">✓ کامل</Badge>
                          ) : (
                            <Badge color="gray">ناقص</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-ink-subtle">
                          {r.duration_seconds ? faDuration(r.duration_seconds) : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-ink-subtle">
                          {DEVICE_FA[r.device] ?? r.device ?? "—"}
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
