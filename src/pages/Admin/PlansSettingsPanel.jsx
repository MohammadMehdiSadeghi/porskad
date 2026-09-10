// ══════════════════════════════════════════════════════════════
// پنل مدیریت اشتراک‌ها — به‌عنوان تب در «تنظیمات سامانه»
// ویرایش کامل طرح‌ها: قیمت‌ها، سهمیه‌ها، امکانات، افزودن/حذف طرح
// ذخیره در system_settings.plans_config → برای کل سامانه sync می‌شود
// استایل: مطابق DESIGN_SYSTEM — کارت‌های استیکری دوسطحی squircle،
// بج/دکمه‌های توکنی، برچسب‌های چرخیده و سایه آفست (بدون هگز سخت)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../components/ui/Toast";
import {
  DEFAULT_PLANS,
  getEffectivePlans,
  savePlansConfig,
  resetPlansConfig,
  loadPlansConfig,
  getPlanIds,
  fetchLivePlanUserCounts,
} from "../../lib/plans";
import { supabase } from "../../lib/supabaseClient";
import { faNum } from "../../lib/utils";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import StickerCard from "../../components/ui/StickerCard";
import {
  Crown,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  Users,
  Database,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Rocket,
  Zap,
  Building2,
  Wallet,
  Inbox,
  Layers,
  ListChecks,
  Info,
} from "lucide-react";

const BADGE_COLORS = [
  { id: "gray", label: "خاکستری" },
  { id: "teal", label: "فیروزه‌ای" },
  { id: "orange", label: "نارنجی" },
  { id: "navy", label: "سرمه‌ای" },
];

// هویت بصری هر طرح پیش‌فرض (تم کارت + بج + آیکون) — فقط توکن دیزاین
const PLAN_IDENTITY = {
  free: {
    theme: "white",
    rotate: "md:rotate-[-0.6deg]",
    icon: Rocket,
    iconWrap: "bg-ecosystem-light text-teal dark:bg-teal/10 dark:text-teal",
    badgeColor: "gray",
  },
  pro: {
    theme: "teal",
    rotate: "md:rotate-[0.5deg]",
    icon: Zap,
    iconWrap: "bg-teal text-white",
    badgeColor: "teal",
  },
  enterprise: {
    theme: "orange",
    rotate: "md:rotate-[-0.5deg]",
    icon: Building2,
    iconWrap: "bg-college-light text-orange dark:bg-orange/60 dark:text-amber-300",
    badgeColor: "orange",
  },
};
const CUSTOM_IDENTITY = {
  theme: "navy",
  rotate: "",
  icon: Crown,
  iconWrap: "bg-male-light text-navy dark:bg-blue-950/60 dark:text-blue-300",
  badgeColor: "navy",
};

const BUILT_IN_PLANS = ["free", "pro", "enterprise"];

function cloneConfig(cfg) {
  return JSON.parse(JSON.stringify(cfg));
}

const inputCls =
  "w-full px-3 py-2 rounded-xl border-2 border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-navy dark:text-slate-100 focus:border-teal outline-none transition-colors";
const labelCls =
  "flex items-center gap-1 text-[11px] font-black text-navy dark:text-slate-200 mb-1";

// ردیف خوانا در بخش «نمای کلی» پایین صفحه
function OverviewRow({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-ink/5 dark:border-slate-700">
      <div className="w-8 h-8 rounded-xl bg-ecosystem-light text-teal dark:bg-teal/10 dark:text-teal flex items-center justify-center shrink-0">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-black text-ink-subtle dark:text-slate-400">{label}</div>
        <div className="text-sm font-black text-navy dark:text-slate-100 truncate">{value}</div>
        {hint && <div className="text-[10px] font-semibold text-ink-subtle dark:text-slate-500">{hint}</div>}
      </div>
    </div>
  );
}

export default function PlansSettingsPanel() {
  const { push } = useToast();

  const [cfg, setCfg] = useState(() => cloneConfig(getEffectivePlans()));
  const [saving, setSaving] = useState(false);
  const [loadingDb, setLoadingDb] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [dbTime, setDbTime] = useState(null);
  const [userCounts, setUserCounts] = useState({ counts: {}, owners: 0, total: 0 });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({ key: "", name: "", nameEn: "", priceMonthly: 0, priceYearly: 0, maxForms: 10, monthlyResponsesLimit: 1000 });
  const [applyingPlan, setApplyingPlan] = useState(null);

  // بارگذاری کانفیگ مشترک از دیتابیس (منبع حقیقت)
  const refreshFromDb = useCallback(async () => {
    setLoadingDb(true);
    try {
      const { data } = await supabase
        .from("system_settings")
        .select("value, updated_at")
        .eq("key", "plans_config")
        .maybeSingle();
      if (data?.value) {
        setCfg(cloneConfig(data.value));
        setDbTime(data.updated_at);
        setDirty(false);
      } else {
        const loaded = await loadPlansConfig();
        setCfg(cloneConfig(loaded));
        setDbTime(null);
      }
    } catch (e) {
      console.warn("Plans DB load failed, using local cache:", e);
      setCfg(cloneConfig(getEffectivePlans()));
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    refreshFromDb();
    fetchLivePlanUserCounts().then((r) => r.ok && setUserCounts(r));
  }, [refreshFromDb]);

  // ─── ویرایش‌ها ───
  function markDirty() {
    setDirty(true);
  }

  function updateMeta(planKey, field, value) {
    setCfg((prev) => ({ ...prev, [planKey]: { ...prev[planKey], [field]: value } }));
    markDirty();
  }

  function toggleFeature(planKey, index) {
    setCfg((prev) => {
      const plan = prev[planKey];
      const features = [...(plan.features || [])];
      features[index] = { ...features[index], included: !features[index].included };
      return { ...prev, [planKey]: { ...plan, features } };
    });
    markDirty();
  }

  function editFeatureText(planKey, index, text) {
    setCfg((prev) => {
      const plan = prev[planKey];
      const features = [...(plan.features || [])];
      features[index] = { ...features[index], text };
      return { ...prev, [planKey]: { ...plan, features } };
    });
    markDirty();
  }

  function addFeature(planKey) {
    setCfg((prev) => {
      const plan = prev[planKey];
      return {
        ...prev,
        [planKey]: { ...plan, features: [...(plan.features || []), { text: "امکان جدید", included: true }] },
      };
    });
    markDirty();
  }

  function removeFeature(planKey, index) {
    setCfg((prev) => {
      const plan = prev[planKey];
      const features = (plan.features || []).filter((_, i) => i !== index);
      return { ...prev, [planKey]: { ...plan, features } };
    });
    markDirty();
  }

  function moveFeature(planKey, index, dir) {
    setCfg((prev) => {
      const plan = prev[planKey];
      const features = [...(plan.features || [])];
      const target = index + dir;
      if (target < 0 || target >= features.length) return prev;
      [features[index], features[target]] = [features[target], features[index]];
      return { ...prev, [planKey]: { ...plan, features } };
    });
    markDirty();
  }

  function reorderPlan(planKey, dir) {
    setCfg((prev) => {
      const ids = getPlanIds(prev);
      const i = ids.indexOf(planKey);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return prev;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      return { ...prev, _planOrder: ids };
    });
    markDirty();
  }

  function deletePlan(planKey) {
    if (BUILT_IN_PLANS.includes(planKey)) return;
    if (!confirm(`طرح «${cfg[planKey]?.name || planKey}» حذف شود؟`)) return;
    setCfg((prev) => {
      const next = { ...prev };
      delete next[planKey];
      if (next._planOrder) next._planOrder = next._planOrder.filter((k) => k !== planKey);
      return next;
    });
    markDirty();
    push(`طرح «${planKey}» حذف شد — برای ثبت نهایی «ذخیره در سامانه» را بزنید.`, "info");
  }

  function handleAddPlan() {
    const key = newPlan.key.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!key) return push("کلید انگلیسی طرح را وارد کنید (مثل team).", "error");
    if (cfg[key]) return push("این کلید قبلاً استفاده شده است.", "error");
    setCfg((prev) => {
      const ids = getPlanIds(prev);
      return {
        ...prev,
        [key]: {
          id: key,
          name: newPlan.name.trim() || key,
          nameEn: newPlan.nameEn.trim() || key,
          badgeColor: "navy",
          description: "",
          priceMonthly: Number(newPlan.priceMonthly) || 0,
          priceYearly: Number(newPlan.priceYearly) || 0,
          maxForms: Number(newPlan.maxForms) || 10,
          monthlyResponsesLimit: Number(newPlan.monthlyResponsesLimit) || 1000,
          isCustom: true,
          features: [
            { text: "همه امکانات طرح حرفه‌ای", included: true },
            { text: `${faNum(newPlan.maxForms)} فرم فعال همزمان`, included: true },
            { text: `${faNum(newPlan.monthlyResponsesLimit)} پاسخ در ماه`, included: true },
          ],
        },
        _planOrder: [...ids, key],
      };
    });
    setAddModalOpen(false);
    setNewPlan({ key: "", name: "", nameEn: "", priceMonthly: 0, priceYearly: 0, maxForms: 10, monthlyResponsesLimit: 1000 });
    markDirty();
    push("طرح جدید اضافه شد — مقادیرش را ویرایش و سپس ذخیره کنید.", "success");
  }

  // ─── ذخیره / بازنشانی ───
  async function handleSave() {
    setSaving(true);
    const res = await savePlansConfig(cfg);
    setSaving(false);
    if (res.ok && !res.dbError) {
      setDirty(false);
      setDbTime(new Date().toISOString());
      push("اشتراک‌ها ذخیره شد و برای کل سامانه اعمال شد ✅", "success");
    } else if (res.ok) {
      setDirty(false);
      push(`محلی ذخیره شد، ولی نوشتن در دیتابیس خطا داد: ${res.dbError}`, "warning");
    } else {
      push("خطا در ذخیره: " + res.error, "error");
    }
  }

  async function handleReset() {
    if (!confirm("همه طرح‌ها به مقادیر پیش‌فرض کارخانه برگردند؟ (از دیتابیس هم پاک می‌شود)")) return;
    await resetPlansConfig();
    setCfg(cloneConfig(DEFAULT_PLANS));
    setDbTime(null);
    setDirty(false);
    push("طرح‌ها به پیش‌فرض بازنشانی شد.", "info");
  }

  // اعمال سهمیه این طرح روی کاربرهای همان طرح
  async function handleApplyQuotas(planKey) {
    const plan = cfg[planKey];
    if (!plan) return;
    const count = userCounts.counts[planKey] || 0;
    if (!confirm(`${faNum(count)} کاربر روی طرح «${plan.name}» — سهمیه فرم (${faNum(plan.maxForms)}) و پاسخ ماهانه (${faNum(plan.monthlyResponsesLimit)}) روی همه اعمال شود؟`)) return;
    setApplyingPlan(planKey);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ max_forms: plan.maxForms, max_responses_per_month: plan.monthlyResponsesLimit })
        .eq("plan", planKey)
        .neq("is_owner", true)
        .select("id");
      if (error) throw error;
      push(`${faNum(data?.length || 0)} کاربر با سهمیه جدید به‌روزرسانی شد ✅`, "success");
    } catch (e) {
      push("خطا در اعمال سهمیه: " + e.message, "error");
    } finally {
      setApplyingPlan(null);
    }
  }

  const planIds = cfg._planOrder?.length
    ? cfg._planOrder.filter((k) => cfg[k])
    : getPlanIds(cfg);

  return (
    <div className="space-y-6">
      {/* ─── Hero: نوار معرفی + اکشن‌ها ─── */}
      <StickerCard theme="navy" rotate="rotate-[-0.3deg]">
        <div className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-[1.25rem] bg-teal text-white flex items-center justify-center shadow-male rotate-[-3deg] [corner-shape:squircle]">
                <Crown size={22} />
              </div>
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-orange text-white flex items-center justify-center shadow-sm rotate-[8deg]">
                <Sparkles size={11} />
              </span>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-navy dark:text-slate-100">
                اشتراک‌ها و تعرفه‌ها
              </h3>
              <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400 mt-1 leading-relaxed max-w-xl">
                قیمت، سهمیه و امکانات هر طرح همین‌جا ویرایش می‌شود و با ذخیره، برای{" "}
                <strong className="text-teal dark:text-teal">کل سامانه</strong> اعمال می‌گردد.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ink-subtle dark:text-slate-500">
                  <Database size={11} />
                  {loadingDb
                    ? "در حال بازیابی از سرور…"
                    : dbTime
                    ? `آخرین ذخیره سرور: ${new Date(dbTime).toLocaleString("fa-IR")}`
                    : "هنوز روی سرور ذخیره نشده (پیش‌فرض‌های کد فعال است)"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ink-subtle dark:text-slate-500">
                  <Users size={11} />
                  {faNum(userCounts.total)} کاربر در سامانه (بدون مدیران کل)
                </span>
                {dirty && (
                  <Badge color="magenta" rotate="rotate-[-2deg]" className="!text-[10px] !px-2">
                    ● تغییر ذخیره‌نشده
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={refreshFromDb} disabled={loadingDb} className="text-xs">
              <RefreshCw size={14} className={loadingDb ? "animate-spin" : ""} />
              <span className="mr-1">بازیابی از سرور</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
              <RotateCcw size={14} />
              <span className="mr-1">بازنشانی پیش‌فرض</span>
            </Button>
            <Button variant="navy" size="sm" onClick={() => setAddModalOpen(true)} className="text-xs">
              <Plus size={14} />
              <span className="mr-1">طرح جدید</span>
            </Button>
            <Button variant="teal" size="sm" onClick={handleSave} disabled={saving || !dirty} className="text-xs">
              <Save size={14} />
              <span className="mr-1">{saving ? "در حال ذخیره…" : dirty ? "ذخیره در سامانه *" : "ذخیره شد ✓"}</span>
            </Button>
          </div>
        </div>
      </StickerCard>

      {/* ─── راهنمای کوتاه ─── */}
      <div className="rounded-2xl border-2 border-navy/10 dark:border-slate-700 bg-bg-lavender/40 dark:bg-slate-800/80 p-3.5 flex items-start gap-3">
        <Info size={16} className="text-teal dark:text-teal shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold text-navy dark:text-slate-300 leading-relaxed">
          تیک سبز کنار هر امکان یعنی در طرح{" "}
          <strong>وجود دارد</strong>؛ ضربدر یعنی در این طرح{" "}
          <strong>قفل است</strong>. سهمیه‌ها (فرم فعال و پاسخ ماهانه) کفِ محدودیت‌ها هستند و
          می‌توانید آن‌ها را دستی روی کاربران همان طرح هم «اعمال» کنید.
        </p>
      </div>

      {/* ─── کارت‌های ویرایش طرح‌ها ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-7 items-start">
        {planIds.map((planKey, orderIdx) => {
          const p = cfg[planKey];
          if (!p) return null;
          const isBuiltIn = BUILT_IN_PLANS.includes(planKey);
          const usersOnPlan = userCounts.counts[planKey] || 0;
          const idn = PLAN_IDENTITY[planKey] || CUSTOM_IDENTITY;
          const Icon = idn.icon;

          return (
            <StickerCard key={planKey} theme={idn.theme} rotate={idn.rotate} className="w-full">
              <div className="p-4 sm:p-5 flex flex-col gap-4">
                {/* سربرگ */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-[1.15rem] flex items-center justify-center shrink-0 rotate-[-3deg] [corner-shape:squircle] ${idn.iconWrap}`}>
                      <Icon size={19} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-navy dark:text-slate-100 truncate">
                        {p.name || planKey}
                        {p.isPopular && <Sparkles size={12} className="inline mr-1 text-teal dark:text-teal" />}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge color={p.badgeColor || idn.badgeColor} className="!text-[9px] !px-2 !py-0">
                          {p.isPopular ? "پیشنهاد ویژه" : isBuiltIn ? "پیش‌فرض" : "سفارشی"}
                        </Badge>
                        <span className="text-[9px] font-mono font-bold text-ink-subtle dark:text-slate-500" dir="ltr">
                          {planKey}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => reorderPlan(planKey, -1)}
                      disabled={orderIdx === 0}
                      className="p-1 rounded-lg text-ink/40 hover:text-navy dark:hover:text-white disabled:opacity-20 hover:bg-ink/5 dark:hover:bg-white/10"
                      title="بالا بردن ترتیب نمایش"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorderPlan(planKey, 1)}
                      disabled={orderIdx === planIds.length - 1}
                      className="p-1 rounded-lg text-ink/40 hover:text-navy dark:hover:text-white disabled:opacity-20 hover:bg-ink/5 dark:hover:bg-white/10"
                      title="پایین بردن ترتیب نمایش"
                    >
                      <ArrowDown size={14} />
                    </button>
                    {!isBuiltIn && (
                      <button
                        type="button"
                        onClick={() => deletePlan(planKey)}
                        className="p-1.5 rounded-lg text-magenta dark:text-pink-400 hover:bg-magenta/10"
                        title="حذف طرح"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* شناسه و توضیح */}
                <div className="rounded-2xl border border-ink/5 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 p-3 flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelCls}>نام فارسی</label>
                      <input className={inputCls} value={p.name || ""} onChange={(e) => updateMeta(planKey, "name", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>نام انگلیسی</label>
                      <input className={inputCls} dir="ltr" value={p.nameEn || ""} onChange={(e) => updateMeta(planKey, "nameEn", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>توضیح طرح</label>
                    <textarea className={`${inputCls} min-h-[52px]`} value={p.description || ""} onChange={(e) => updateMeta(planKey, "description", e.target.value)} />
                  </div>
                </div>

                {/* قیمت‌ها */}
                <div>
                  <div className={`${labelCls} mb-1.5`}>
                    <Wallet size={12} className="text-orange" />
                    قیمت‌ها (تومان)
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-ink-subtle dark:text-slate-400 mb-0.5">ماهانه</label>
                      <input className={`${inputCls} font-mono text-center`} type="number" min="0" step="1000" dir="ltr" value={p.priceMonthly ?? 0} onChange={(e) => updateMeta(planKey, "priceMonthly", Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-subtle dark:text-slate-400 mb-0.5">سالانه</label>
                      <input className={`${inputCls} font-mono text-center`} type="number" min="0" step="5000" dir="ltr" value={p.priceYearly ?? 0} onChange={(e) => updateMeta(planKey, "priceYearly", Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                {/* سهمیه‌ها */}
                <div>
                  <div className={`${labelCls} mb-1.5`}>
                    <Layers size={12} className="text-teal" />
                    سهمیه‌ها
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-ink-subtle dark:text-slate-400 mb-0.5">
                        <Inbox size={9} className="inline ml-0.5" /> پاسخ در ماه
                      </label>
                      <input className={`${inputCls} font-mono text-center`} type="number" min="10" step="10" dir="ltr" value={p.monthlyResponsesLimit ?? 100} onChange={(e) => updateMeta(planKey, "monthlyResponsesLimit", Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-subtle dark:text-slate-400 mb-0.5">
                        <Layers size={9} className="inline ml-0.5" /> فرم فعال
                      </label>
                      <input className={`${inputCls} font-mono text-center`} type="number" min="1" dir="ltr" value={p.maxForms ?? 5} onChange={(e) => updateMeta(planKey, "maxForms", Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-ink-subtle dark:text-slate-400 mb-0.5">رنگ بج</label>
                      <select className={inputCls} value={p.badgeColor || "gray"} onChange={(e) => updateMeta(planKey, "badgeColor", e.target.value)}>
                        {BADGE_COLORS.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* فلگ‌ها */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-navy dark:text-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={Boolean(p.isPopular)} onChange={(e) => updateMeta(planKey, "isPopular", e.target.checked)} className="accent-teal w-4 h-4" />
                    <Sparkles size={13} className="text-teal dark:text-teal" /> پیشنهاد ویژه
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={Boolean(p.isEnterprise)} onChange={(e) => updateMeta(planKey, "isEnterprise", e.target.checked)} className="accent-teal w-4 h-4" />
                    بالاترین طرح
                  </label>
                </div>

                {/* امکانات */}
                <div className="rounded-2xl border border-ink/5 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className={`${labelCls} mb-0`}>
                      <ListChecks size={12} className="text-magenta" />
                      امکانات ({faNum((p.features || []).length)})
                    </label>
                    <button type="button" onClick={() => addFeature(planKey)} className="text-[11px] font-black text-teal dark:text-teal hover:underline flex items-center gap-0.5">
                      <Plus size={13} /> افزودن
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pl-1">
                    {(p.features || []).map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 group">
                        <button
                          type="button"
                          onClick={() => toggleFeature(planKey, i)}
                          className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors [corner-shape:squircle] ${
                            f.included
                              ? "bg-teal/15 border-teal text-teal"
                              : "bg-magenta/10 border-magenta/50 text-magenta dark:text-pink-400"
                          }`}
                          title={f.included ? "موجود در طرح — کلیک برای حذف از طرح" : "غیرفعال — کلیک برای فعال"}
                        >
                          {f.included ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                        </button>
                        <input
                          className={`flex-1 min-w-0 rounded-lg border border-ink/10 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 px-2 py-1 text-[12px] font-bold text-navy dark:text-slate-200 focus:border-teal focus:outline-none ${f.included ? "" : "line-through opacity-60"}`}
                          value={f.text}
                          onChange={(e) => editFeatureText(planKey, i, e.target.value)}
                        />
                        <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => moveFeature(planKey, i, -1)} disabled={i === 0} className="text-[9px] leading-none px-0.5 text-ink/40 hover:text-navy disabled:opacity-20">▲</button>
                          <button type="button" onClick={() => moveFeature(planKey, i, 1)} disabled={i === (p.features || []).length - 1} className="text-[9px] leading-none px-0.5 text-ink/40 hover:text-navy disabled:opacity-20">▼</button>
                        </div>
                        <button type="button" onClick={() => removeFeature(planKey, i)} className="shrink-0 text-magenta/60 hover:text-magenta dark:hover:text-pink-400 p-1" title="حذف این مورد">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* وضعیت کاربران + اعمال سهمیه */}
                <div className="mt-auto pt-3 border-t-2 border-dashed border-navy/10 dark:border-slate-700 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-ink-subtle dark:text-slate-400 flex items-center gap-1">
                    <Users size={13} />
                    {faNum(usersOnPlan)} کاربر روی این طرح
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleApplyQuotas(planKey)}
                    disabled={applyingPlan === planKey || usersOnPlan === 0}
                    className="!text-[11px] !px-2.5 !py-1"
                  >
                    {applyingPlan === planKey ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                    <span className="mr-1">اعمال سهمیه</span>
                  </Button>
                </div>
              </div>
            </StickerCard>
          );
        })}
      </div>

      {/* ─── نمای کلی طرح‌ها (خلاصهٔ فشرده، بدون صفحهٔ جدا) ─── */}
      <StickerCard theme="white" rotate="rotate-[0.2deg]">
        <div className="p-4 sm:p-5">
          <h4 className="text-sm font-black text-navy dark:text-slate-100 flex items-center gap-2 mb-3">
            <ListChecks size={16} className="text-teal" />
            نمای کلی طرح‌ها
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {planIds.map((planKey) => {
              const p = cfg[planKey];
              if (!p) return null;
              const included = (p.features || []).filter((f) => f.included).length;
              return (
                <div key={planKey} className="rounded-2xl border-2 border-navy/10 dark:border-slate-700 bg-bg-lavender/40 dark:bg-slate-800/80 p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-black text-navy dark:text-slate-100">{p.name}</span>
                    <Badge color={p.badgeColor || "gray"} className="!text-[9px] !px-2 !py-0">
                      {faNum(userCounts.counts[planKey] || 0)} کاربر
                    </Badge>
                  </div>
                  <div className="text-[11px] font-bold text-ink-subtle dark:text-slate-400 leading-relaxed">
                    {Number(p.priceMonthly) === 0 ? "رایگان" : `${faNum(Number(p.priceMonthly).toLocaleString("en-US"))} تومان/ماه`}
                    {" · "}
                    {faNum(p.maxForms)} فرم فعال
                    {" · "}
                    {faNum(p.monthlyResponsesLimit)} پاسخ/ماه
                    {" · "}
                    {faNum(included)} امکان فعال
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </StickerCard>

      {/* مودال افزودن طرح */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="افزودن طرح جدید">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-ink-subtle dark:text-slate-400">
            کلید طرح باید انگلیسی باشد (مثل team یا premium) و در آدرس‌ها و دیتابیس (profiles.plan) استفاده می‌شود.
          </p>
          <div>
            <label className={labelCls}>کلید انگلیسی *</label>
            <input className={inputCls} dir="ltr" placeholder="team" value={newPlan.key} onChange={(e) => setNewPlan((s) => ({ ...s, key: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls}>نام فارسی</label>
              <input className={inputCls} placeholder="تیمی" value={newPlan.name} onChange={(e) => setNewPlan((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>نام انگلیسی</label>
              <input className={inputCls} dir="ltr" placeholder="Team" value={newPlan.nameEn} onChange={(e) => setNewPlan((s) => ({ ...s, nameEn: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>قیمت ماهانه</label>
              <input className={inputCls} type="number" dir="ltr" value={newPlan.priceMonthly} onChange={(e) => setNewPlan((s) => ({ ...s, priceMonthly: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>قیمت سالانه</label>
              <input className={inputCls} type="number" dir="ltr" value={newPlan.priceYearly} onChange={(e) => setNewPlan((s) => ({ ...s, priceYearly: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>فرم فعال</label>
              <input className={inputCls} type="number" dir="ltr" value={newPlan.maxForms} onChange={(e) => setNewPlan((s) => ({ ...s, maxForms: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>پاسخ ماهانه</label>
              <input className={inputCls} type="number" dir="ltr" value={newPlan.monthlyResponsesLimit} onChange={(e) => setNewPlan((s) => ({ ...s, monthlyResponsesLimit: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)}>انصراف</Button>
            <Button variant="teal" size="sm" onClick={handleAddPlan}>
              <Plus size={14} />
              <span className="mr-1">افزودن طرح</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
