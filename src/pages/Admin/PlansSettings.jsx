// ══════════════════════════════════════════════════════════════
// پنل مدیریت اشتراک‌ها (فقط سوپرادمین / گاد)
// ویرایش کامل طرح‌ها: قیمت‌ها، سهمیه‌ها، امکانات، افزودن/حذف طرح
// ذخیره در system_settings.plans_config → برای همه کاربران sync می‌شود
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
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
import SEO from "../../components/ui/SEO";
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
  GripVertical,
} from "lucide-react";

const BADGE_COLORS = [
  { id: "gray", label: "خاکستری", cls: "bg-gray-200 text-gray-700 border-gray-400" },
  { id: "teal", label: "فیروزه‌ای", cls: "bg-teal/15 text-teal border-teal/40" },
  { id: "orange", label: "نارنجی", cls: "bg-orange/15 text-orange border-orange/40" },
  { id: "navy", label: "سرمه‌ای", cls: "bg-navy/10 text-navy border-navy/30 dark:bg-white/10 dark:text-white dark:border-white/20" },
];

const BUILT_IN_PLANS = ["free", "pro", "enterprise"];

function cloneConfig(cfg) {
  return JSON.parse(JSON.stringify(cfg));
}

export default function PlansSettings() {
  const { isOwner } = useAuth();
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

  if (!isOwner()) {
    return (
      <div className="p-6 text-center text-ink/60 dark:text-slate-400">
        این بخش فقط برای مدیران کل سامانه در دسترس است.
      </div>
    );
  }

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
    // جابه‌جایی ترتیب نمایش با متادیتای _planOrder
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
          storageMb: 512,
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
      push("اشتراک‌ها ذخیره شد و برای همه کاربران اعمال شد ✅", "success");
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

  const inputCls =
    "w-full rounded-xl border-2 border-ink/15 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-bold text-navy dark:text-white focus:border-teal focus:outline-none transition-colors";
  const labelCls = "block text-[11px] font-black text-ink/60 dark:text-slate-400 mb-1";

  const planIds = cfg._planOrder?.length
    ? cfg._planOrder.filter((k) => cfg[k])
    : getPlanIds(cfg);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <SEO title="مدیریت اشتراک‌ها" />

      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white flex items-center gap-2">
            <Crown size={26} className="text-teal" />
            مدیریت اشتراک‌ها
          </h1>
          <p className="text-sm text-ink/60 dark:text-slate-400 mt-1">
            همهٔ چیزهای طرح‌ها قابل ویرایش است: قیمت، سهمیه، امکانات و خودِ طرح‌ها. ذخیره برای کل سامانه (صفحه تعرفه‌ها و محدودیت‌ها) اعمال می‌شود.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={refreshFromDb} disabled={loadingDb}>
            <RefreshCw size={15} className={loadingDb ? "animate-spin" : ""} />
            <span className="mr-1">بازیابی از سرور</span>
          </Button>
          <Button variant="danger" size="sm" onClick={handleReset}>
            <RotateCcw size={15} />
            <span className="mr-1">بازنشانی پیش‌فرض</span>
          </Button>
          <Button variant="navy" size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus size={15} />
            <span className="mr-1">طرح جدید</span>
          </Button>
          <Button variant="teal" size="sm" onClick={handleSave} disabled={saving || !dirty}>
            <Save size={15} />
            <span className="mr-1">{saving ? "در حال ذخیره…" : dirty ? "ذخیره در سامانه *" : "ذخیره شد ✓"}</span>
          </Button>
        </div>
      </div>

      {/* نوار وضعیت */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-bold text-ink/50 dark:text-slate-500 mb-6">
        <span className="flex items-center gap-1">
          <Database size={12} />
          {dbTime
            ? `آخرین ذخیره سرور: ${new Date(dbTime).toLocaleString("fa-IR")}`
            : "هنوز روی سرور ذخیره نشده (پیش‌فرض‌های کد فعال است)"}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {faNum(userCounts.total)} کاربر در سامانه (بدون مدیران کل)
        </span>
        {dirty && <span className="text-orange">● تغییرات ذخیره‌نشده دارید</span>}
      </div>

      {/* کارت‌های طرح‌ها */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {planIds.map((planKey, orderIdx) => {
          const p = cfg[planKey];
          if (!p) return null;
          const isBuiltIn = BUILT_IN_PLANS.includes(planKey);
          const usersOnPlan = userCounts.counts[planKey] || 0;
          const colorMeta = BADGE_COLORS.find((c) => c.id === p.badgeColor) || BADGE_COLORS[0];

          return (
            <div
              key={planKey}
              className="rounded-[1.5rem] border-2 bg-white/90 dark:bg-slate-800/90 border-ink/10 dark:border-slate-700 shadow-sm p-5 flex flex-col gap-4"
              style={{ borderTopWidth: 6, borderTopColor: planKey === "enterprise" ? "#ff832b" : planKey === "pro" ? "#0f62fe" : p.isCustom ? "#0d9488" : "#8d8d8d" }}
            >
              {/* سربرگ */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${colorMeta.cls}`} dir="ltr">
                      {planKey}
                    </span>
                    {isBuiltIn ? (
                      <span className="text-[10px] font-black text-ink/40">پایه</span>
                    ) : (
                      <span className="text-[10px] font-black text-teal">سفارشی</span>
                    )}
                  </div>
                  <div className="text-lg font-black text-navy dark:text-white mt-1">ویرایش طرح</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => reorderPlan(planKey, -1)}
                    disabled={orderIdx === 0}
                    className="p-1 rounded-lg text-ink/40 hover:text-navy disabled:opacity-20 hover:bg-ink/5"
                    title="بالا بردن ترتیب"
                  >
                    <GripVertical size={16} />
                  </button>
                  {!isBuiltIn && (
                    <button
                      type="button"
                      onClick={() => deletePlan(planKey)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="حذف طرح"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* نام‌ها */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>نام فارسی</label>
                  <input className={inputCls} value={p.name || ""} onChange={(e) => updateMeta(planKey, "name", e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>نام انگلیسی</label>
                  <input className={inputCls} dir="ltr" value={p.nameEn || ""} onChange={(e) => updateMeta(planKey, "nameEn", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>توضیح طرح</label>
                  <textarea className={`${inputCls} min-h-[52px]`} value={p.description || ""} onChange={(e) => updateMeta(planKey, "description", e.target.value)} />
                </div>
              </div>

              {/* قیمت‌ها */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>قیمت ماهانه (تومان)</label>
                  <input className={inputCls} type="number" min="0" step="1000" dir="ltr" value={p.priceMonthly ?? 0} onChange={(e) => updateMeta(planKey, "priceMonthly", Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelCls}>قیمت سالانه (تومان)</label>
                  <input className={inputCls} type="number" min="0" step="5000" dir="ltr" value={p.priceYearly ?? 0} onChange={(e) => updateMeta(planKey, "priceYearly", Number(e.target.value))} />
                </div>
              </div>

              {/* سهمیه‌ها */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>حداکثر فرم فعال</label>
                  <input className={inputCls} type="number" min="1" dir="ltr" value={p.maxForms ?? 5} onChange={(e) => updateMeta(planKey, "maxForms", Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelCls}>پاسخ در ماه</label>
                  <input className={inputCls} type="number" min="10" step="10" dir="ltr" value={p.monthlyResponsesLimit ?? 100} onChange={(e) => updateMeta(planKey, "monthlyResponsesLimit", Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelCls}>فضا (مگابایت)</label>
                  <input className={inputCls} type="number" min="0" dir="ltr" value={p.storageMb ?? 100} onChange={(e) => updateMeta(planKey, "storageMb", Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelCls}>رنگ بج</label>
                  <select className={inputCls} value={p.badgeColor || "gray"} onChange={(e) => updateMeta(planKey, "badgeColor", e.target.value)}>
                    {BADGE_COLORS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* فلگ‌ها */}
              <div className="flex gap-4 text-xs font-bold text-ink/70 dark:text-slate-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={Boolean(p.isPopular)} onChange={(e) => updateMeta(planKey, "isPopular", e.target.checked)} className="accent-teal w-4 h-4" />
                  <Sparkles size={13} className="text-teal" /> پیشنهاد ویژه
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={Boolean(p.isEnterprise)} onChange={(e) => updateMeta(planKey, "isEnterprise", e.target.checked)} className="accent-teal w-4 h-4" />
                  طرح سازمانی (بالاترین)
                </label>
              </div>

              {/* امکانات */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + " mb-0"}>امکانات ({faNum((p.features || []).length)})</label>
                  <button type="button" onClick={() => addFeature(planKey)} className="text-[11px] font-black text-teal hover:underline flex items-center gap-0.5">
                    <Plus size={13} /> افزودن
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pl-1">
                  {(p.features || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 group">
                      <button
                        type="button"
                        onClick={() => toggleFeature(planKey, i)}
                        className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                          f.included
                            ? "bg-teal/15 border-teal text-teal"
                            : "bg-red-50 dark:bg-red-900/10 border-red-300 text-red-400"
                        }`}
                        title={f.included ? "موجود در طرح — کلیک برای حذف از طرح" : "غیرفعال — کلیک برای فعال"}
                      >
                        {f.included ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                      </button>
                      <input
                        className={`flex-1 min-w-0 rounded-lg border border-ink/10 dark:border-slate-600 bg-transparent px-2 py-1 text-[12px] font-medium text-navy dark:text-slate-200 focus:border-teal focus:outline-none ${f.included ? "" : "line-through opacity-60"}`}
                        value={f.text}
                        onChange={(e) => editFeatureText(planKey, i, e.target.value)}
                      />
                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => moveFeature(planKey, i, -1)} disabled={i === 0} className="text-[10px] leading-none px-0.5 text-ink/40 hover:text-navy disabled:opacity-20">▲</button>
                        <button type="button" onClick={() => moveFeature(planKey, i, 1)} disabled={i === (p.features || []).length - 1} className="text-[10px] leading-none px-0.5 text-ink/40 hover:text-navy disabled:opacity-20">▼</button>
                      </div>
                      <button type="button" onClick={() => removeFeature(planKey, i)} className="shrink-0 text-red-400 hover:text-red-600 p-1" title="حذف این مورد">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* وضعیت کاربران + اعمال سهمیه */}
              <div className="mt-auto pt-3 border-t border-dashed border-ink/15 dark:border-slate-700 flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-ink/60 dark:text-slate-400 flex items-center gap-1">
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
          );
        })}
      </div>

      {/* مودال افزودن طرح */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="افزودن طرح جدید">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ink/60 dark:text-slate-400">
            کلید طرح باید انگلیسی باشد (مثل team یا premium) و در آدرس‌ها و دیتابیس (profiles.plan) استفاده می‌شود.
          </p>
          <div>
            <label className={labelCls}>کلید انگلیسی *</label>
            <input className={inputCls} dir="ltr" placeholder="team" value={newPlan.key} onChange={(e) => setNewPlan((s) => ({ ...s, key: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
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
