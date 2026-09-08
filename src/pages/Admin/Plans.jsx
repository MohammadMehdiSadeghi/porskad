// ══════════════════════════════════════════════════════════════
// صفحه طرح‌ها، تعرفه‌ها و ارتقای اشتراک (Plans & Pricing)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { getEffectivePlans, PLAN_ORDER, getPlan } from "../../lib/plans";
import { faNum, faDate } from "../../lib/utils";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StickerCard from "../../components/ui/StickerCard";
import Modal from "../../components/ui/Modal";
import SEO from "../../components/ui/SEO";
import { PlansSkeleton } from "../../components/ui/Skeleton";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Shield,
  Crown,
  CreditCard,
  Layers,
  Send,
  MessageSquare,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function Plans() {
  const { user, profile, isOwner, loading } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState(() => getEffectivePlans());
  const [billingCycle, setBillingCycle] = useState("monthly"); // "monthly" | "yearly"
  const [checkoutModal, setCheckoutModal] = useState(null); // plan object or null
  const [checkoutDuration, setCheckoutDuration] = useState(30); // 30, 90, 180, 365
  const [userNote, setUserNote] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [successTicketModal, setSuccessTicketModal] = useState(null);

  // گوش دادن به تغییرات طرح‌ها توسط سوپرادمین
  useEffect(() => {
    function handlePlansChanged(e) {
      if (e.detail) setPlans(e.detail);
    }
    window.addEventListener("porskad:plans_changed", handlePlansChanged);
    return () => window.removeEventListener("porskad:plans_changed", handlePlansChanged);
  }, []);

  if (loading && !profile) {
    return <PlansSkeleton />;
  }

  const currentPlan = getPlan(profile?.plan);
  const isGod = Boolean(typeof isOwner === "function" ? isOwner() : isOwner || profile?.is_owner);

  const consumedResponses = profile?.monthly_responses_used ?? 0;
  const maxResponses = isGod || profile?.max_responses_per_month >= 999999 ? "نامحدود ✨" : profile?.max_responses_per_month ?? 100;
  const maxForms = isGod || profile?.max_forms >= 999999 ? "نامحدود ✨" : profile?.max_forms ?? 5;

  function handleOpenCheckout(plan) {
    if (plan.id === "free") {
      push("حساب شما در حال حاضر روی طرح رایگان است.", "info");
      return;
    }
    setCheckoutModal(plan);
    setCheckoutDuration(billingCycle === "yearly" ? 365 : 30);
    setUserNote("");
  }

  // ثبت تیکت درخواست خرید / ارتقای اشتراک
  async function handleSubmitUpgradeTicket(e) {
    if (e) e.preventDefault();
    if (!checkoutModal || !user) return;

    setSubmittingTicket(true);
    const invoice = getInvoiceDetails();

    try {
      const ticketSubject = `💎 درخواست ارتقای اشتراک به طرح ${checkoutModal.name} (${invoice.durationLabel})`;
      const ticketMessage =
        `📌 مشخصات درخواست ارتقای اشتراک:\n\n` +
        `• طرح درخواستی: ${checkoutModal.name} (${checkoutModal.nameEn})\n` +
        `• شناسه طرح: ${checkoutModal.id}\n` +
        `• دوره اشتراک: ${invoice.durationLabel} (${checkoutDuration} روز)\n` +
        `• مبلغ فاکتور: ${invoice.finalAmount.toLocaleString("fa-IR")} تومان\n` +
        `• نام متقاضی: ${profile?.full_name || "ثبت‌نشده"}\n` +
        `• ایمیل: ${user?.email}\n` +
        `• شماره تماس: ${profile?.phone || "ثبت‌نشده"}\n` +
        `• تاریخ ثبت: ${new Date().toLocaleDateString("fa-IR")}\n` +
        (userNote.trim() ? `• توضیحات / یادداشت کاربر: ${userNote.trim()}\n` : "") +
        `\nلطفاً پس از بررسی پرداخت و فاکتور، اشتراک حساب من را فعال نمایید.`;

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: ticketSubject,
          message: ticketMessage,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      push("درخواست ارتقای اشتراک شما با موفقیت به عنوان تیکت ثبت شد 🎉", "success");
      setSuccessTicketModal({
        plan: checkoutModal,
        durationLabel: invoice.durationLabel,
        amount: invoice.finalAmount,
        ticketId: data?.id,
      });
      setCheckoutModal(null);
    } catch (err) {
      push("خطا در ثبت تیکت ارتقا: " + err.message, "error");
    } finally {
      setSubmittingTicket(false);
    }
  }

  // محاسبه قیمت فاکتور
  function getInvoiceDetails() {
    if (!checkoutModal) return null;
    const baseMonthly = checkoutModal.priceMonthly;
    let baseTotal = 0;
    let discount = 0;
    let durationLabel = "۱ ماهه (۳۰ روز)";

    if (checkoutDuration === 30) {
      baseTotal = baseMonthly;
      discount = 0;
      durationLabel = "۱ ماهه (۳۰ روز)";
    } else if (checkoutDuration === 90) {
      baseTotal = baseMonthly * 3;
      discount = Math.round(baseTotal * 0.05);
      durationLabel = "۳ ماهه (۹۰ روز) • ۵٪ تخفیف";
    } else if (checkoutDuration === 180) {
      baseTotal = baseMonthly * 6;
      discount = Math.round(baseTotal * 0.10);
      durationLabel = "۶ ماهه (۱۸۰ روز) • ۱۰٪ تخفیف";
    } else if (checkoutDuration === 365) {
      baseTotal = baseMonthly * 12;
      discount = Math.round(baseTotal * 0.17); // 17% تخفیف سالانه
      durationLabel = "۱ ساله (۳۶۵ روز) • ۱۷٪ تخفیف ویژه";
    }

    const finalAmount = baseTotal - discount;
    return {
      baseTotal,
      discount,
      finalAmount,
      durationLabel,
    };
  }

  const invoice = getInvoiceDetails();

  return (
    <div className="flex flex-col gap-8 pb-16 max-w-6xl mx-auto">
      <SEO title="طرح‌ها و تعرفه‌ها | پرس‌کاد" />

      {/* هدر صفحه و خلاصه طرح‌ها */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/10 text-teal-text dark:text-teal-300 text-xs font-black border border-teal/20">
          <Sparkles size={14} className="text-teal" />
          <span>طرح‌ها و بسته‌های اشتراک پرس‌کاد</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-navy dark:text-white tracking-tight">
          طرح مناسب کسب‌وکار و نیاز خود را انتخاب کنید
        </h1>
        <p className="text-xs sm:text-sm text-ink-subtle dark:text-slate-300 max-w-2xl font-medium">
          شروع رایگان با امکانات کامل، ارتقا به طرح‌های حرفه‌ای و سازمانی با تخفیف ۱۷٪ در پرداخت سالانه و پاسخ‌های نامحدود (با شرط استفاده منصفانه).
        </p>

        {/* سوییچ ماهانه / سالانه */}
        <div className="flex items-center gap-3 mt-4 bg-white dark:bg-slate-800 p-1.5 rounded-full border-2 border-ink/10 dark:border-slate-700 shadow-sm">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-navy text-white shadow-xs"
                : "text-ink/60 dark:text-slate-400 hover:text-navy dark:hover:text-white"
            }`}
          >
            پرداخت ماهانه
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              billingCycle === "yearly"
                ? "bg-teal text-white shadow-xs"
                : "text-ink/60 dark:text-slate-400 hover:text-navy dark:hover:text-white"
            }`}
          >
            <span>پرداخت سالانه</span>
            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              ۱۷٪ تخفیف
            </span>
          </button>
        </div>
      </div>

      {/* وضعیت فعلی حساب کاربر */}
      <div className="rotate-[-0.2deg]">
        <StickerCard theme="teal" radius="rounded-[1.5rem]">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal/15 dark:bg-teal-900/40 flex items-center justify-center text-teal shrink-0">
                {isGod ? <Crown size={24} /> : currentPlan.id === "enterprise" ? <Shield size={24} /> : currentPlan.id === "pro" ? <Zap size={24} /> : <Layers size={24} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink/60 dark:text-slate-400 font-bold">طرح فعال شما:</span>
                  <span className="text-sm sm:text-base font-black text-navy dark:text-white">
                    {isGod ? "مدیریت کل (نامحدود)" : currentPlan.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    currentPlan.id === "enterprise" || isGod ? "bg-orange/15 text-orange border border-orange/30" : currentPlan.id === "pro" ? "bg-teal/15 text-teal-text border border-teal/30" : "bg-black/5 dark:bg-slate-700 text-ink"
                  }`}>
                    {currentPlan.id === "free" ? "حساب رایگان" : "اشتراک ویژه"}
                  </span>
                </div>
                <div className="text-xs text-ink-subtle dark:text-slate-400 font-semibold mt-0.5">
                  مصرف پاسخ این ماه: {faNum(consumedResponses)} / {typeof maxResponses === "number" ? faNum(maxResponses) : maxResponses}
                  {profile?.quota_reset_at && ` • تمدید دوره سهمیه: ${faDate(profile.quota_reset_at)}`}
                </div>
              </div>
            </div>

            {currentPlan.id === "free" && !isGod && (
              <Button
                variant="teal"
                size="sm"
                onClick={() => handleOpenCheckout(plans.pro || plans.enterprise)}
                className="font-black text-xs shrink-0 self-stretch sm:self-auto justify-center shadow-sticker-sm"
              >
                <Sparkles size={14} /> ارتقا به طرح حرفه‌ای
              </Button>
            )}
          </div>
        </StickerCard>
      </div>

      {/* کارت‌های ۳ گانه تعرفه‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {PLAN_ORDER.map((planKey) => {
          const p = plans[planKey] || getPlan(planKey);
          const isCurrent = currentPlan.id === p.id && !isGod;
          const isYearly = billingCycle === "yearly";
          const displayPrice = isYearly ? p.priceYearly : p.priceMonthly;

          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-[1.75rem] border-2 transition-all duration-300 p-6 sm:p-7 ${
                p.isPopular
                  ? "bg-white dark:bg-slate-800/95 border-teal shadow-lg ring-4 ring-teal/10 scale-[1.02] z-10"
                  : "bg-white/80 dark:bg-slate-850 border-ink/10 dark:border-slate-700 shadow-xs hover:border-ink/20"
              }`}
            >
              {/* بج محبوب‌ترین */}
              {p.isPopular && (
                <div className="absolute -top-3.5 right-6 bg-teal text-white text-[11px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Sparkles size={12} /> پیشنهاد ما (محبوب‌ترین)
                </div>
              )}

              {/* عنوان و توضیحات */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-xl font-black text-navy dark:text-white">{p.name}</h3>
                <span className="text-xs font-mono font-bold text-ink/40 dark:text-slate-400">{p.nameEn}</span>
              </div>
              <p className="text-xs text-ink-subtle dark:text-slate-400 min-h-[36px] font-medium leading-relaxed mb-4">
                {p.description}
              </p>

              {/* قیمت */}
              <div className="flex items-baseline gap-1.5 pb-5 border-b border-ink/10 dark:border-slate-700">
                {p.priceMonthly === 0 ? (
                  <span className="text-3xl font-black text-navy dark:text-white">رایگان</span>
                ) : (
                  <>
                    <span className="text-3xl sm:text-4xl font-black text-navy dark:text-white">
                      {faNum(displayPrice.toLocaleString("fa-IR"))}
                    </span>
                    <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">
                      تومان / {isYearly ? "سالانه" : "ماهانه"}
                    </span>
                  </>
                )}
              </div>

              {/* سقف‌های کلیدی */}
              <div className="flex flex-col gap-2 py-4 border-b border-ink/10 dark:border-slate-700 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-ink/60 dark:text-slate-400">سقف دریافت پاسخ:</span>
                  <span className="font-black text-navy dark:text-white">
                    {p.monthlyResponsesLimit >= 999999 ? "نامحدود" : `${faNum(p.monthlyResponsesLimit.toLocaleString("fa-IR"))} پاسخ/ماه`}
                  </span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-ink/60 dark:text-slate-400">تعداد فرم‌های مجاز:</span>
                  <span className="font-black text-navy dark:text-white">
                    {p.maxForms >= 999999 ? "نامحدود" : `${faNum(p.maxForms)} فرم فعال`}
                  </span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-ink/60 dark:text-slate-400">فضای آپلود فایل:</span>
                  <span className="font-black text-navy dark:text-white">
                    {p.storageMb >= 1024 ? `${faNum(p.storageMb / 1024)} گیگابایت` : `${faNum(p.storageMb)} مگابایت`}
                  </span>
                </div>
              </div>

              {/* لیست ویژگی‌ها */}
              <div className="flex-1 flex flex-col gap-2.5 py-5">
                <span className="text-xs font-black text-navy dark:text-slate-200">امکانات شامل:</span>
                {(p.features || []).map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    {feat.included ? (
                      <Check size={16} className="text-teal shrink-0 mt-0.5 stroke-[2.5]" />
                    ) : (
                      <X size={16} className="text-ink/20 dark:text-slate-600 shrink-0 mt-0.5" />
                    )}
                    <span className={feat.included ? "text-ink dark:text-slate-200 font-semibold" : "text-ink/35 dark:text-slate-500 line-through"}>
                      {feat.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* دکمه اقدام */}
              <div className="pt-2 mt-auto">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-pill-md bg-black/5 dark:bg-slate-800 text-ink/50 dark:text-slate-400 text-xs font-black text-center cursor-default border border-ink/10"
                  >
                    طرح فعلی شما
                  </button>
                ) : (
                  <Button
                    variant={p.isPopular ? "teal" : p.isEnterprise ? "orange" : "outline"}
                    size="lg"
                    onClick={() => handleOpenCheckout(p)}
                    className="w-full justify-center text-xs font-black py-3 shadow-sticker-sm"
                  >
                    {p.priceMonthly === 0 ? "انتخاب طرح رایگان" : `درخواست ارتقا به ${p.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════ مودال فاکتور و ثبت تیکت ارتقای اشتراک ═══════════ */}
      <Modal
        open={!!checkoutModal}
        onClose={() => setCheckoutModal(null)}
        title={`درخواست ارتقای اشتراک به طرح ${checkoutModal?.name || ""}`}
      >
        {checkoutModal && invoice && (
          <form onSubmit={handleSubmitUpgradeTicket} className="flex flex-col gap-4">
            {/* انتخاب مدت زمان اشتراک */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-navy dark:text-slate-200">
                مدت زمان اشتراک را انتخاب کنید:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { days: 30, label: "۱ ماهه", tag: "پایه" },
                  { days: 90, label: "۳ ماهه", tag: "۵٪ تخفیف" },
                  { days: 180, label: "۶ ماهه", tag: "۱۰٪ تخفیف" },
                  { days: 365, label: "۱ ساله", tag: "۱۷٪ تخفیف" },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setCheckoutDuration(item.days)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                      checkoutDuration === item.days
                        ? "border-teal bg-teal/10 dark:bg-teal-950/40 text-teal-text font-black ring-2 ring-teal/20"
                        : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-300 hover:border-teal/40"
                    }`}
                  >
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="text-[10px] text-ink-subtle dark:text-slate-400 mt-0.5">{item.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* پیش‌فاکتور شفاف */}
            <div className="p-4 rounded-2xl bg-bg-neutral/80 dark:bg-slate-800/80 border-2 border-ink/10 dark:border-slate-700 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink/60 dark:text-slate-400 font-bold">طرح انتخابی:</span>
                <span className="font-black text-navy dark:text-white">{checkoutModal.name} ({checkoutModal.nameEn})</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink/60 dark:text-slate-400 font-bold">دوره اشتراک:</span>
                <span className="font-bold text-navy dark:text-white">{invoice.durationLabel}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink/60 dark:text-slate-400 font-bold">قیمت پایه:</span>
                <span className="font-mono font-bold text-navy dark:text-white">{faNum(invoice.baseTotal.toLocaleString("fa-IR"))} تومان</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex items-center justify-between text-xs text-teal font-bold">
                  <span>تخفیف ویژه دوره:</span>
                  <span className="font-mono font-black">- {faNum(invoice.discount.toLocaleString("fa-IR"))} تومان</span>
                </div>
              )}
              <div className="pt-2 border-t-2 border-ink/10 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-black text-navy dark:text-white">مبلغ نهایی قابل پرداخت:</span>
                <span className="text-base sm:text-lg font-black text-teal font-mono">
                  {faNum(invoice.finalAmount.toLocaleString("fa-IR"))} تومان
                </span>
              </div>
            </div>

            {/* یادداشت اختیاری کاربر */}
            <div>
              <label className="block text-xs font-black text-navy dark:text-slate-200 mb-1">
                توضیحات یا کد رهگیری واریز (اختیاری):
              </label>
              <textarea
                rows={2}
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="در صورت داشتن کد تخفیف، شماره فیش واریزی یا هرگونه توضیح..."
                className="w-full bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 rounded-pill-md p-2.5 text-xs font-semibold outline-none"
              />
            </div>

            {/* راهنمای فرایند فعال‌سازی */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                پس از کلیک روی «ثبت درخواست خرید»، تیکت شما به صورت اختصاصی برای تیم مدیریت ارسال شده و پس از تایید فاکتور، اشتراک شما فعال می‌گردد.
              </span>
            </div>

            {/* دکمه‌های تایید و پرداخت */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="teal"
                size="md"
                type="submit"
                disabled={submittingTicket}
                className="font-black text-xs px-5 py-2.5 flex items-center gap-1.5 shadow-sticker-sm"
              >
                <Send size={15} />
                {submittingTicket ? "در حال ثبت تیکت..." : "ثبت درخواست خرید و ارسال تیکت"}
              </Button>
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setCheckoutModal(null)}
                className="text-xs font-bold"
              >
                انصراف
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══════════ مودال موفقیت ثبت تیکت ارتقا ═══════════ */}
      <Modal
        open={Boolean(successTicketModal)}
        onClose={() => setSuccessTicketModal(null)}
        title="درخواست ارتقای اشتراک ثبت شد"
      >
        {successTicketModal && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-14 h-14 rounded-3xl bg-teal/15 text-teal flex items-center justify-center border-2 border-teal shadow-sticker-sm">
              <CheckCircle size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-navy dark:text-white">
                تیکت ارتقای اشتراک شما با موفقیت ثبت شد!
              </h3>
              <p className="text-xs text-ink-subtle dark:text-slate-300 max-w-sm">
                درخواست شما برای طرح <strong className="text-teal font-black">{successTicketModal.plan.name}</strong> ({successTicketModal.durationLabel}) به بخش پشتیبانی ارسال شد. پس از بررسی تیم مدیریت، طرح حساب شما فعال می‌گردد.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-3 w-full">
              <Button
                variant="teal"
                size="md"
                onClick={() => {
                  setSuccessTicketModal(null);
                  navigate("/admin/support");
                }}
                className="flex-1 justify-center font-black text-xs shadow-sticker-sm"
              >
                <MessageSquare size={15} />
                مشاهده در تیکت‌های پشتیبانی
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setSuccessTicketModal(null)}
                className="text-xs font-bold"
              >
                بستن
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
