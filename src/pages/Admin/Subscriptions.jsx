import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  X,
  Crown,
  Sparkles,
  Building2,
  Ticket,
  ShieldCheck,
  Tag,
  Percent,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { getEffectivePlans, getPlanIds, getPlan } from "../../lib/plans";
import {
  buildSubscriptionActivationMessage,
  SUBSCRIPTION_DURATIONS as DURATIONS,
} from "../../lib/ticketCategories";
import {
  validateDiscountCode,
  incrementDiscountCodeUsage,
} from "../../lib/discounts";
import { faNum } from "../../lib/utils";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import SEO from "../../components/ui/SEO";
import { SubscriptionsSkeleton } from "../../components/ui/Skeleton";

// ════════════════════════════════════════════════════════
// صفحه «اشتراک‌ها» — کاربر طرح فعلی‌اش را می‌بیند و برای
// خرید/ارتقا دکمه «خرید اشتراک» را می‌زند → مودال انتخاب
// دوره + فیلد کد تخفیف → هدایت به /admin/support با متن آماده
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

const fmtToman = (rial) => `${faNum(Math.round((rial || 0) / 10))} تومان`;

export default function Subscriptions() {
  const { profile, isOwner } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const plans = useMemo(() => getEffectivePlans(), []);
  const planIds = useMemo(() => getPlanIds(plans), [plans]);
  const currentPlan = getPlan(profile?.plan);

  const [buyPlan, setBuyPlan] = useState(null); // plan object of open modal
  const [duration, setDuration] = useState(DURATIONS[0]);

  // کد تخفیف در مودال خرید
  const [couponInput, setCouponInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [couponError, setCouponError] = useState(null);

  // محاسبه مبلغ پایه دوره انتخابی
  const calculateOriginalPriceRial = (plan, dur) => {
    if (!plan || !dur) return 0;
    return dur.days === 365 ? plan.priceYearly : plan.priceMonthly * Math.round(dur.days / 30);
  };

  // اعمال یا اعتبارسنجی مجدد کد تخفیف
  const handleApplyCoupon = (codeToTest = couponInput, dur = duration) => {
    if (!codeToTest || !codeToTest.trim()) {
      setCouponError("لطفاً کد تخفیف را وارد کنید.");
      setAppliedDiscount(null);
      return;
    }

    const priceRial = calculateOriginalPriceRial(buyPlan, dur);
    const result = validateDiscountCode(codeToTest, buyPlan?.id, priceRial);

    if (result.valid) {
      setAppliedDiscount(result.discount);
      setCouponError(null);
      push(`کد تخفیف ${result.discount.code} با موفقیت اعمال شد`, "success");
    } else {
      setCouponError(result.error || "کد تخفیف معتبر نیست.");
      setAppliedDiscount(null);
    }
  };

  // حذف کد تخفیف
  const handleRemoveCoupon = () => {
    setAppliedDiscount(null);
    setCouponInput("");
    setCouponError(null);
  };

  // تغییر دوره و بررسی مجدد تخفیف اعمال‌شده
  const handleSelectDuration = (d) => {
    setDuration(d);
    if (appliedDiscount) {
      handleApplyCoupon(appliedDiscount.code, d);
    }
  };

  // باز کردن مودال خرید با ریست فرم تخفیف
  const handleOpenBuyModal = (plan) => {
    setBuyPlan(plan);
    setDuration(DURATIONS[0]);
    setCouponInput("");
    setAppliedDiscount(null);
    setCouponError(null);
  };

  // «ثبت درخواست و ارسال تیکت» → رفتن به صفحه تیکت‌ها با متن آماده
  function goToTicketWithRequest() {
    if (!buyPlan) return;

    // در صورت وجود کد تخفیف، شمارنده استفاده افزایش می‌یابد
    if (appliedDiscount?.code) {
      incrementDiscountCodeUsage(appliedDiscount.code);
    }

    const { subject, message } = buildSubscriptionActivationMessage(
      buyPlan,
      duration,
      appliedDiscount
    );

    setBuyPlan(null);
    setAppliedDiscount(null);
    setCouponInput("");

    navigate(
      `/admin/support?category=subscription&subject=${encodeURIComponent(subject)}&message=${encodeURIComponent(message)}`
    );
  }

  if (!profile) {
    return <SubscriptionsSkeleton />;
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
          <div className="flex items-center gap-2 bg-white dark:bg-[#151C28] border-[1.5px] border-ecosystem-normal/30 rounded-2xl px-4 py-2.5 shadow-hard-sm dark:shadow-dark-hard">
            <ShieldCheck size={18} className="text-ecosystem-normal" />
            <div className="text-xs font-bold text-sec dark:text-slate-200">
              طرح فعلی:{" "}
              <span className="text-ecosystem-normal font-black">
                {isOwner() ? "مدیریت کل (نامحدود)" : currentPlan.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* کارت طرح‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {planIds.map((pid) => {
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
              className="h-full"
            >
              <div className="p-5 sm:p-6 flex flex-col gap-4 h-full">
                {/* بج‌های بالا */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-sec dark:text-slate-100" />
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-black text-sec dark:text-white leading-6">{plan.name}</div>
                      <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{plan.nameEn}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {plan.isPopular && <Badge color="teal">⭐ محبوب‌ترین</Badge>}
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
                      variant="teal"
                      className="w-full justify-center"
                      onClick={() => handleOpenBuyModal(plan)}
                    >
                      <Crown size={15} />
                      <span>خرید اشتراک — {plan.name}</span>
                    </Button>
                  )}
                </div>
              </div>
            </StickerCard>
          );
        })}
      </div>

      <div className="text-[11px] font-medium text-ink/45 dark:text-slate-500 leading-6 px-1">
        💡 با زدن «خرید اشتراک» و انتخاب دوره، شما به صفحهٔ تیکت‌ها می‌روید؛ متن درخواست همراه با کد تخفیف اعمال‌شده آماده پر شده است و فقط کافی
        است «ارسال پیام» را بزنید. پشتیبانی راهنمای پرداخت را برایتان می‌فرستد و پس از واریز، اشتراک‌تان فعال می‌شود.
      </div>

      {/* مودال انتخاب دوره و اعمال کد تخفیف */}
      <Modal open={Boolean(buyPlan)} onClose={() => setBuyPlan(null)} title={buyPlan ? `خرید اشتراک — طرح ${buyPlan.name}` : ""}>
        {buyPlan && (() => {
          const originalPriceRial = calculateOriginalPriceRial(buyPlan, duration);
          const originalPriceToman = Math.round(originalPriceRial / 10);
          const discountAmountRial = appliedDiscount?.discountAmountRial || 0;
          const discountAmountToman = Math.round(discountAmountRial / 10);
          const finalPriceRial = Math.max(0, originalPriceRial - discountAmountRial);
          const finalPriceToman = Math.round(finalPriceRial / 10);

          return (
            <div className="flex flex-col gap-4">
              <div className="text-sm font-bold text-ink dark:text-slate-200 leading-7">
                دورهٔ اشتراک مورد نظر را انتخاب کنید:
              </div>

              {/* انتخاب دوره */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DURATIONS.map((d) => {
                  const dPriceRial = d.days === 365 ? buyPlan.priceYearly : buyPlan.priceMonthly * Math.round(d.days / 30);
                  const active = duration.days === d.days;
                  return (
                    <button
                      key={d.days}
                      type="button"
                      onClick={() => handleSelectDuration(d)}
                      className={`text-right rounded-xl border-[1.5px] p-3.5 transition-all cursor-pointer ${
                        active
                          ? "border-ecosystem-normal bg-ecosystem-light dark:bg-ecosystem-darker/40 shadow-hard-sm"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1C2536] hover:border-ecosystem-normal/50"
                      }`}
                    >
                      <div className="text-sm font-black text-sec dark:text-white">{d.label}</div>
                      <div className={`text-xs font-bold mt-1 ${active ? "text-ecosystem-darker dark:text-ecosystem-light" : "text-gray-500 dark:text-gray-400"}`}>
                        {(dPriceRial || 0) === 0 ? "رایگان" : fmtToman(dPriceRial)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* بخش کد تخفیف */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border-2 border-dashed border-ink/15 dark:border-slate-700 rounded-2xl flex flex-col gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-navy dark:text-slate-200">
                  <Tag size={14} className="text-teal" />
                  <span>کد تخفیف دارید؟</span>
                </div>

                {!appliedDiscount ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyCoupon(couponInput);
                        }
                      }}
                      placeholder="مثلاً NOWRUZ1405"
                      className="flex-1 bg-white dark:bg-slate-800 border-2 border-ink/20 dark:border-slate-700 rounded-pill-md px-3 py-2 text-xs sm:text-sm font-mono font-black uppercase focus:border-teal focus:outline-none"
                    />
                    <Button
                      type="button"
                      variant="teal"
                      size="sm"
                      onClick={() => handleApplyCoupon(couponInput)}
                    >
                      اعمال کد
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>
                        کد <span className="font-mono font-black">{appliedDiscount.code}</span> اعمال شد{" "}
                        <span className="whitespace-nowrap font-bold">({faNum(discountAmountToman.toLocaleString("fa-IR"))} تومان تخفیف)</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-rose-600 dark:text-rose-400 hover:underline text-[11px] font-black cursor-pointer mr-auto shrink-0"
                    >
                      حذف کد
                    </button>
                  </div>
                )}

                {couponError && (
                  <div className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{couponError}</span>
                  </div>
                )}
              </div>

              {/* خلاصه صورت‌حساب */}
              <div className="p-3 bg-white dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-2xl flex flex-col gap-1.5 text-xs font-bold">
                <div className="flex items-center justify-between text-ink-subtle dark:text-slate-400">
                  <span>مبلغ پایه ({duration.label}):</span>
                  <span className={appliedDiscount ? "line-through" : ""}>
                    {faNum(originalPriceToman.toLocaleString("fa-IR"))} تومان
                  </span>
                </div>

                {appliedDiscount && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>میزان تخفیف ({appliedDiscount.code}):</span>
                    <span>- {faNum(discountAmountToman.toLocaleString("fa-IR"))} تومان</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1.5 border-t border-ink/10 dark:border-slate-700 text-sm font-black text-navy dark:text-white">
                  <span>مبلغ نهایی فاکتور:</span>
                  <span className="text-teal dark:text-teal-light text-base sm:text-lg">
                    {finalPriceToman === 0 ? "رایگان" : `${faNum(finalPriceToman.toLocaleString("fa-IR"))} تومان`}
                  </span>
                </div>
              </div>

              {/* دکمه‌های ادامه و انصراف */}
              <div className="flex items-center gap-2 pt-1">
                <Button variant="teal" className="flex-1 justify-center" onClick={goToTicketWithRequest}>
                  <Ticket size={15} />
                  <span>ادامه — رفتن به تیکت و ارسال درخواست</span>
                </Button>
                <Button variant="ghost" onClick={() => setBuyPlan(null)}>
                  انصراف
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
