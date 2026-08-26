import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  LayoutDashboard,
  FileText,
  MessagesSquare,
  TrendingUp,
  Clock,
  Plus,
  Eye,
  BarChart2,
  LineChart,
} from "lucide-react";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import {
  LineChart as RCLineChart,
  Line,
  BarChart as RCBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({
    totalForms: 0,
    activeForms: 0,
    totalResponses: 0,
    todayResponses: 0,
    weekResponses: 0,
    monthResponses: 0,
    completeRate: 0,
    avgDuration: null,
  });
  const [timeSeries, setTimeSeries] = useState([]);
  const [byForm, setByForm] = useState([]);

  async function loadAll() {
    setLoading(true);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [{ data: formsData }, { data: respData }] = await Promise.all([
      supabase
        .from("forms")
        .select("id, slug, title, published, created_at, manager_id")
        .order("created_at", { ascending: false }),
      supabase
        .from("responses")
        .select("id, form_id, is_complete, submitted_at, duration_seconds, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const formList = formsData ?? [];
    const respList = respData ?? [];

    const completeList = respList.filter((r) => r.is_complete);
    const durations = completeList.map((r) => r.duration_seconds).filter((d) => d > 0);

    const today = respList.filter((r) => r.submitted_at >= todayStart);
    const week = respList.filter((r) => r.submitted_at >= weekStart);
    const month = respList.filter((r) => r.submitted_at >= monthStart);

    setForms(formList);
    setRecent(respList.slice(0, 8));
    setStats({
      totalForms: formList.length,
      activeForms: formList.filter((f) => f.published).length,
      totalResponses: respList.length,
      todayResponses: today.length,
      weekResponses: week.length,
      monthResponses: month.length,
      completeRate: respList.length
        ? Math.round((completeList.length / respList.length) * 100)
        : 0,
      avgDuration: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null,
    });

    // Time series (last 7 days)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const nextDateStr = new Date(d.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const count = respList.filter((r) => {
        const ds = (r.submitted_at || r.created_at).slice(0, 10);
        return ds >= dateStr && ds < nextDateStr;
      }).length;
      days.push({
        date: dateStr.slice(5),
        label: d.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
        responses: count,
      });
    }
    setTimeSeries(days);

    // By form
    const formMap = {};
    for (const r of respList) {
      const f = formList.find((f) => f.id === r.form_id);
      if (!formMap[r.form_id]) {
        formMap[r.form_id] = { name: f?.title ?? "فرم حذف‌شده", count: 0 };
      }
      formMap[r.form_id].count++;
    }
    setByForm(Object.entries(formMap).map(([id, { name, count }]) => ({ name, count })));

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
        () => loadAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Spinner label="داشبورد در حال بارگذاری..." />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">داشبورد</h1>
          <p className="text-sm text-ink/50 mt-0.5">نمای کلی فعالیت‌ها</p>
        </div>
        <Button as={Link} to="/admin/forms" variant="teal" size="md">
          <Plus size={16} />
          فرم جدید
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          icon={FileText}
          label="کل فرم‌ها"
          value={stats.totalForms}
          sub={`${stats.activeForms} منتشرشده`}
          color="navy"
        />
        <StatBox
          icon={MessagesSquare}
          label="کل پاسخ‌ها"
          value={stats.totalResponses}
          sub={`${stats.completeRate}٪ تکمیل`}
          color="teal"
        />
        <StatBox
          icon={TrendingUp}
          label="پاسخ‌های امروز"
          value={stats.todayResponses}
          sub={`این هفته: ${stats.weekResponses}`}
          color="orange"
        />
        <StatBox
          icon={Clock}
          label="میانگین زمان"
          value={stats.avgDuration ? `${stats.avgDuration}ث` : "—"}
          sub="ثانیه"
          color="magenta"
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Time series */}
        <div className="bg-white rounded-[1.25rem] [corner-shape:squircle] border-2 border-ink/10 p-5">
          <h3 className="font-black text-navy mb-4 flex items-center gap-2">
            <LineChart size={16} className="text-teal-text" />
            روند پاسخ‌ها (۷ روز اخیر)
          </h3>
          {timeSeries.length > 0 && timeSeries.some((d) => d.responses > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <RCLineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="responses"
                  stroke="#58bdaf"
                  strokeWidth={2.5}
                  dot={{ fill: "#58bdaf", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </RCLineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📈" title="هنوز داده‌ای نیست" subtitle="پس از ثبت اولین پاسخ، نمودار اینجا نمایش داده می‌شود." />
          )}
        </div>

        {/* By form */}
        <div className="bg-white rounded-[1.25rem] [corner-shape:squircle] border-2 border-ink/10 p-5">
          <h3 className="font-black text-navy mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-teal-text" />
            پاسخ‌ها بر اساس فرم
          </h3>
          {byForm.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <RCBarChart data={byForm.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8", angle: -20, textAnchor: "end" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#21295a" radius={[4, 4, 0, 0]} />
              </RCBarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="📊" title="هنوز داده‌ای نیست" subtitle="پس از ثبت اولین پاسخ، نمودار اینجا نمایش داده می‌شود." />
          )}
        </div>
      </div>

      {/* Recent Responses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-navy">آخرین پاسخ‌ها</h2>
          <Button as={Link} to="/admin/forms" variant="ghost" size="sm">
            مشاهده همه
          </Button>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon="📭"
            title="هنوز پاسخی ثبت نشده!"
            subtitle="اولین فرم خود را بسازید و لینکش را بفرستید."
            action={<Button as={Link} to="/admin/forms" variant="teal">ساخت اولین فرم</Button>}
          />
        ) : (
          <div className="bg-white rounded-[1.25rem] [corner-shape:squircle] border-2 border-ink/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-neutral border-b border-ink/10">
                    <th className="text-right font-bold text-navy/70 px-4 py-3">فرم</th>
                    <th className="text-right font-bold text-navy/70 px-4 py-3">زمان ثبت</th>
                    <th className="text-right font-bold text-navy/70 px-4 py-3">وضعیت</th>
                    <th className="text-right font-bold text-navy/70 px-4 py-3">مدت</th>
                    <th className="text-left font-bold text-navy/70 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => {
                    const f = forms.find((f) => f.id === r.form_id);
                    return (
                      <tr key={r.id} className="border-b border-ink/5 last:border-0 hover:bg-bg-neutral/60">
                        <td className="px-4 py-3 font-bold text-ink">{f?.title ?? "—"}</td>
                        <td className="px-4 py-3 text-ink/50">
                          {new Date(r.submitted_at || r.created_at).toLocaleString("fa-IR")}
                        </td>
                        <td className="px-4 py-3">
                          {r.is_complete ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-text bg-bg-mint border border-teal-text/25 px-2 py-0.5 rounded-[0.4rem] [corner-shape:squircle]">
                              ✓ کامل
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-ink/50 bg-bg-neutral border border-ink/10 px-2 py-0.5 rounded-[0.4rem] [corner-shape:squircle]">
                              ناقص
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink/50">
                          {r.duration_seconds ? `${r.duration_seconds}ث` : "—"}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <Button
                            as={Link}
                            to={`/admin/forms/${r.form_id}/responses`}
                            variant="ghost"
                            size="sm"
                          >
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
        )}
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, sub, color }) {
  const colors = {
    navy: "bg-bg-lavender text-navy",
    teal: "bg-bg-mint text-teal-text",
    orange: "bg-orange-50 text-orange",
    magenta: "bg-blush text-magenta-text",
  };
  return (
    <div className="bg-white rounded-[1.25rem] [corner-shape:squircle] border-2 border-ink/10 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-ink/50 mb-1">{label}</p>
          <p className="text-2xl font-black text-navy">{value}</p>
          <p className="text-xs text-ink/40 mt-0.5">{sub}</p>
        </div>
        <div className={`w-9 h-9 rounded-[0.6rem] [corner-shape:squircle] flex items-center justify-center ${colors[color]}`}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}
