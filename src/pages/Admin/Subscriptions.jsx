import { useMemo, useState } from "react";
import { Check, X, Crown, Sparkles, Building2, Ticket, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { getEffectivePlans, getPlanIds, getPlan } from "../../lib/plans";
import { faNum } from "../../lib/utils";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import SEO from "../../components/ui/SEO";
import { useToast } from "../../components/ui/Toast";

// ════════════════════════════════════════════════════════
// صفحه «اشتراک‌ها» — کاربر طرح فعلی‌اش را می‌بیند و برای
// خرید/ارتقا تیکت می‌فرستد (تیکت category=subscription که
// پنل پشتیبانی به‌صورت اختصاصی پارس و فعال‌سازی می‌کند).
// ════════════════════════════════════════════════════════

const PLAN_ICONS = {
  free: Ticket,
  pro: Sparkles,
  enterprise: Building2,
};

const PLAN_THEMES = {
  free: "white",
  pro: "teal",
  enterprise: "navy",
};

const DURATIONS = [
  { days: 30, label: "۱ ماهه (۳۰ روز)" },
  { days: 90, label: "۳ ماهه (۹۰ روز)" },
  { days: 180, label: "۶ ماهه (۱۸۰ روز)" },
  { days: 365, label: "۱ ساله (۳۶۵ روز)" },
];

const fmtToman = (rial) => `${faNum(Math.round((rial || 0) / 10))} تومان`;

export default function Subscriptions() {
  const { user, profile, isOwner } = useAuth();
  const toast = useToast();
  const plans = useMemo(() => getEffectivePlans(), []);
  const planIds = useMemo(() => getPlanIds(plans), [plans]);
  const currentPlan = getPlan(profile?.plan);

  const [buyPlan, setBuyPlan] = useState(null); // plan object of open modal
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestUpgrade() {
    if (!user || !buyPlan) return;
    setSubmitting(true);
    try {
      const priceRial = duration.days === 365 ? buyPlan.priceYearly : buyPlan.priceMonthly * Math.round(duration.days / 30);
      const subject = `درخواست ارتقای اشتراک به طرح ${buyPlan.name} (${duration.label})`;
      const message = [
        "با سلام،",
        "",
        "درخواست خرید/ارتقای اشتراک را ثبت می‌کنم:",
        "",
        `• طرح درخواستی: ${buyPlan.name}`,
        `• شناسه طرح: ${buyPlan.id}`,
        `• دوره اشتراک: ${duration.label}`,
        `• مبلغ فاکتور: ${fmtToman(priceRial)}`,
        "",
        `کاربر: ${profile?.full_name || user.email}`,
        "لطفاً پس از هماهنگی و پرداخت، اشتراک را فعال فرمایید.",
      ].join("\n");

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject,
        message,
        status: "open",
        archived_by_user: false,
        archived_by_admin: false,
      });
      if (error) throw error;

      toast.push("درخواست شما به‌صورت تیکت ثبت شد. به‌زودی از طریق پشتیبانی هماهنگ می‌شود. 💎", "success");
      setBuyPlan(null);
    } catch (err) {
      toast.push("خطا در ثبت درخواست: " + (err.message || err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto" dir="rtl">
      <SEO
        title="اشتراک‌ها | پرس‌کاد"
        description="مقایسه طرح‌های اشتراک پرس‌کاد و ارتقای حساب کاربری"
        url="/admin/subscriptions"
        noIndex
      />

      {/* هدر صفحه + وضعیت فعلی */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy dark:text-white flex items-center gap-2">
            <Crown size={24} className="text-amber-500" />
            <span>اشتراک‌ها و طرح‌ها</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-subtle dark:text-slate-400 mt-1 font-medium">
            طرح فعلی خود را ببینید و برای ارتقا درخواست بدهید — فعال‌سازی پس از هماهنگی پشتیبانی انجام می‌شود.
          </p>
        </div>
        {profile && (
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800/90 border-2 border-teal/30 dark:border-teal/25 rounded-2xl [corner-shape:squircle] px-4 py-2.5">
            <ShieldCheck size={18} className="text-teal" />
            <div className="text-xs font-bold text-ink dark:text-slate-200">
              طرح فعلی:{" "}
              <span className="text-teal font-black">
                {isOwner() ? "مدیریت کل (نامحدود)" : currentPlan.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* کارت طرح‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {planIds.map((pid, idx) => {
          const plan = plans[pid];
          if (!plan || String(pid).startsWith("_")) return null;
          const Icon = PLAN_ICONS[pid] || Sparkles;
          const theme = PLAN_THEMES[pid] || "white";
          const isCurrent = !isOwner() && getPlan(profile?.plan).id === plan.id;
          const isFree = plan.id === "free" || (plan.priceMonthly || 0) === 0;
          return (
            <StickerCard
              key={plan.id}
              theme={theme}
              rotate={idx % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"}
              className="h-full"
            >
              <div className="p-5 sm:p-6 flex flex-col gap-4 h-full">
                {/* بج‌های بالا */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl [corner-shape:squircle] bg-white/80 dark:bg-slate-900/60 border border-ink/10 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-navy dark:text-slate-100" />
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-black text-navy dark:text-white leading-6">{plan.name}</div>
                      <div className="text-[11px] font-bold text-ink/45 dark:text-slate-400">{plan.nameEn}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {plan.isPopular && <Badge color="teal" rotate="rotate-[-2deg]">⭐ محبوب‌ترین</Badge>}
                    {isCurrent && <Badge color="navy">طرح شما</Badge>}
                  </div>
                </div>

                {/* قیمت */}
                <div className="border-t-2 border-dashed border-ink/10 dark:border-slate-700 pt-3">
                  {isFree ? (
                    <div className="text-2xl font-black text-ink dark:text-white">رایگان</div>
                  ) : (
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl lg:text-3xl font-black text-navy dark:text-white">{fmtToman(plan.priceMonthly)}</span>
                      <span className="text-xs font-bold text-ink/50 dark:text-slate-400">ماهانه</span>
                      {(plan.priceYearly || 0) > 0 && (
                        <span className="text-[11px] font-bold text-teal">
                          سالانه: {fmtToman(plan.priceYearly)} (۱۷٪ تخفیف)
                        </span>
                      )}
                    </div>
                  )}
                  {plan.description && (
                    <p className="text-xs font-medium text-ink/60 dark:text-slate-400 mt-2 leading-6">{plan.description}</p>
                  )}
                </div>

                {/* امکانات */}
                <ul className="flex flex-col gap-2 grow">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs font-medium leading-6 ${f.included ? "text-ink dark:text-slate-200" : "text-ink/35 dark:text-slate-600 line-through"}`}>
                      {f.included ? (
                        <Check size={15} className="shrink-0 mt-0.5 text-teal" />
                      ) : (
                        <X size={15} className="shrink-0 mt-0.5 text-rose-400" />
                      )}
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>

                {/* دکمه */}
                <div className="mt-auto pt-2">
                  {isCurrent ? (
                    <Button variant="ghost" disabled className="w-full justify-center text-ink/50">
                      طرح فعلی شما ✦
                    </Button>
                  ) : isOwner() ? (
                    <Button variant="navy" disabled className="w-full justify-center">
                      دسترسی مدیر کل — نامحدود ✨
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-full justify-center"
                      onClick={() => {
                        setDuration(DURATIONS[0]);
                        setBuyPlan(plan);
                      }}
                    >
                      <Crown size={15} />
                      <span>خرید / ارتقا به {plan.name}</span>
                    </Button>
                  )}
                </div>
              </div>
            </StickerCard>
          );
        })}
      </div>

      <div className="text-[11px] font-medium text-ink/45 dark:text-slate-500 leading-6 px-1">
        💡 با ثبت درخواست، یک تیکت «ارتقای اشتراک» در پنل پشتیبانی ساخته می‌شود. کارشناسان پرس‌کاد مبلغ و روش پرداخت را
        برایتان می‌فرستند و پس از واریز، اشتراک به‌صورت دستی فعال می‌شود.
      </div>

      {/* مودال انتخاب دوره */}
      <Modal open={Boolean(buyPlan)} onClose={() => !submitting && setBuyPlan(null)} title={buyPlan ? `ارتقا به طرح ${buyPlan.name}` : ""}>
        {buyPlan && (
          <div className="flex flex-col gap-4">
            <div className="text-sm font-bold text-ink dark:text-slate-200 leading-7">
              دورهٔ اشتراک را انتخاب کنید — درخواست نهایی به‌صورت تیکت برای پشتیبانی ارسال می‌شود.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DURATIONS.map((d) => {
                const priceRial = d.days === 365 ? buyPlan.priceYearly : buyPlan.priceMonthly * Math.round(d.days / 30);
                const active = duration.days === d.days;
                return (
                  <button
                    key={d.days}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`text-right rounded-2xl [corner-shape:squircle] border-2 p-3.5 transition-all ${
                      active
                        ? "border-teal bg-teal/5 dark:bg-teal/10 shadow-[2px_2px_0_0_rgba(0,0,0,0.12)]"
                        : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal/50"
                    }`}
                  >
                    <div className="text-sm font-black text-navy dark:text-white">{d.label}</div>
                    <div className={`text-xs font-bold mt-1 ${active ? "text-teal" : "text-ink/50 dark:text-slate-400"}`}>
                      {(priceRial || 0) === 0 ? "رایگان" : fmtToman(priceRial)}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button variant="primary" className="flex-1 justify-center" disabled={submitting} onClick={handleRequestUpgrade}>
                {submitting ? "در حال ثبت تیکت..." : "✅ ثبت درخواست و ارسال تیکت"}
              </Button>
              <Button variant="ghost" disabled={submitting} onClick={() => setBuyPlan(null)}>
                انصراف
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
