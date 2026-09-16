// ══════════════════════════════════════════════════════════════
// پنل تخصصی مدیریت کدهای تخفیف پرس‌کاد
// امکانات: ایجاد، ویرایش، تولید کد رندوم، تعیین سقف تخفیف، محدودیت نفرات،
// تاریخ انقضا (شمسی)، انطباق با طرح‌های خاص، سوئیچ فعال/غیرفعال،
// نوار پیشرفت مصرف، شبیه‌ساز تست زنده و ذخیره در دیتابیس
// استایل: مطابق با ROKAD-UI-DESIGN-STANDARDS.md پرس‌کاد (سایه‌های هارد، رنگ‌های برند و پالت نیوترال)
// ══════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { useToast } from "../../components/ui/Toast";
import {
  loadDiscountCodes,
  saveDiscountCodes,
  generateRandomCouponCode,
  validateDiscountCode,
} from "../../lib/discounts";
import { getEffectivePlans } from "../../lib/plans";
import {
  faNum,
  faDate,
  faDateLong,
  JALALI_MONTH_NAMES,
  gregorianToJalali,
  isoToJalali,
  jalaliToIso,
} from "../../lib/utils";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import StickerCard from "../../components/ui/StickerCard";
import Skeleton from "../../components/ui/Skeleton";
import {
  Ticket,
  Plus,
  Copy,
  Check,
  Percent,
  Calendar,
  Users,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Edit2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  Flame,
} from "lucide-react";

export default function DiscountCodesPanel() {
  const { push } = useToast();

  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // جستجو و فیلتر
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | expired | capped

  // مودال ایجاد / ویرایش
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);

  // تاریخ جاری شمسی برای پیش‌فرض‌ها
  const currentJalali = useMemo(() => {
    const now = new Date();
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  // فرم کد تخفیف
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    type: "percent", // percent | fixed
    value: 20,
    maxDiscountToman: "",
    minPurchaseToman: "",
    maxUses: "",
    hasExpiry: false,
    jYear: 1405,
    jMonth: 12,
    jDay: 29,
    applicablePlans: [], // خالی = همه طرح‌ها
    isActive: true,
  });

  // تست زنده کد تخفیف (Live Simulator)
  const [testCodeInput, setTestCodeInput] = useState("");
  const [testPlanInput, setTestPlanInput] = useState("pro");
  const [testAmountInput, setTestAmountInput] = useState("40000"); // 40,000 تومان
  const [testResult, setTestResult] = useState(null);

  const availablePlans = useMemo(() => {
    const p = getEffectivePlans();
    return Object.values(p).filter((item) => item.id !== "free" && !String(item.id).startsWith("_"));
  }, []);

  // بارگذاری اولیه
  useEffect(() => {
    async function init() {
      setLoading(true);
      const data = await loadDiscountCodes();
      setCodes(data);
      setLoading(false);
    }
    init();
  }, []);

  // کپی سریع در کلیپ‌بورد
  const handleCopy = (codeStr) => {
    try {
      navigator.clipboard.writeText(codeStr);
      setCopiedCode(codeStr);
      push(`کد «${codeStr}» کپی شد`, "success");
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      push("خطا در کپی به کلیپ‌بورد", "error");
    }
  };

  // باز کردن مودال ایجاد
  const handleOpenCreate = () => {
    setEditingCode(null);
    let nextMonth = currentJalali.jm + 1;
    let nextYear = currentJalali.jy;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setFormData({
      code: generateRandomCouponCode(),
      title: "",
      type: "percent",
      value: 20,
      maxDiscountToman: "",
      minPurchaseToman: "",
      maxUses: "50",
      hasExpiry: false,
      jYear: nextYear,
      jMonth: nextMonth,
      jDay: Math.min(28, currentJalali.jd),
      applicablePlans: [],
      isActive: true,
    });
    setModalOpen(true);
  };

  // باز کردن مودال ویرایش
  const handleOpenEdit = (c) => {
    setEditingCode(c);
    let hasExpiry = false;
    let jYear = currentJalali.jy;
    let jMonth = currentJalali.jm;
    let jDay = currentJalali.jd;

    if (c.expiresAt) {
      const parsedJ = isoToJalali(c.expiresAt);
      if (parsedJ) {
        hasExpiry = true;
        jYear = parsedJ.jy;
        jMonth = parsedJ.jm;
        jDay = parsedJ.jd;
      }
    }

    setFormData({
      code: c.code,
      title: c.title || "",
      type: c.type || "percent",
      value: c.value,
      maxDiscountToman: c.maxDiscountToman ?? "",
      minPurchaseToman: c.minPurchaseToman ?? "",
      maxUses: c.maxUses ?? "",
      hasExpiry,
      jYear,
      jMonth,
      jDay,
      applicablePlans: Array.isArray(c.applicablePlans) ? c.applicablePlans : [],
      isActive: Boolean(c.isActive),
    });
    setModalOpen(true);
  };

  // میانبرهای سریع تاریخ انقضا
  const handlePresetDate = (type) => {
    const now = new Date();
    let target = new Date();
    if (type === "1week") {
      target.setDate(target.getDate() + 7);
      const j = gregorianToJalali(target.getFullYear(), target.getMonth() + 1, target.getDate());
      setFormData((prev) => ({ ...prev, hasExpiry: true, jYear: j.jy, jMonth: j.jm, jDay: j.jd }));
    } else if (type === "1month") {
      target.setMonth(target.getMonth() + 1);
      const j = gregorianToJalali(target.getFullYear(), target.getMonth() + 1, target.getDate());
      setFormData((prev) => ({ ...prev, hasExpiry: true, jYear: j.jy, jMonth: j.jm, jDay: j.jd }));
    } else if (type === "3months") {
      target.setMonth(target.getMonth() + 3);
      const j = gregorianToJalali(target.getFullYear(), target.getMonth() + 1, target.getDate());
      setFormData((prev) => ({ ...prev, hasExpiry: true, jYear: j.jy, jMonth: j.jm, jDay: j.jd }));
    } else if (type === "yearEnd") {
      setFormData((prev) => ({ ...prev, hasExpiry: true, jYear: currentJalali.jy, jMonth: 12, jDay: 29 }));
    }
  };

  // سوئیچ وضعیت فعال/غیرفعال آنی
  const handleToggleActive = async (c) => {
    const nextCodes = codes.map((item) =>
      item.id === c.id ? { ...item, isActive: !item.isActive } : item
    );
    setCodes(nextCodes);
    const res = await saveDiscountCodes(nextCodes);
    if (res.ok) {
      push(`کد ${c.code} ${!c.isActive ? "فعال" : "غیرفعال"} شد`, "info");
    } else {
      push("خطا در ذخیره وضعیت در سرور", "error");
    }
  };

  // حذف کد
  const handleDelete = async (c) => {
    if (!window.confirm(`آیا از حذف کد تخفیف «${c.code}» مطمئن هستید؟`)) return;
    const nextCodes = codes.filter((item) => item.id !== c.id);
    setCodes(nextCodes);
    const res = await saveDiscountCodes(nextCodes);
    if (res.ok) {
      push(`کد ${c.code} با موفقیت حذف شد`, "success");
    } else {
      push("خطا در حذف کد در سرور", "error");
    }
  };

  // ذخیره فرم (ایجاد یا ویرایش)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const cleanCode = formData.code.trim().toUpperCase();
    if (!cleanCode) {
      push("لطفاً عبارت کد تخفیف را وارد کنید", "error");
      return;
    }

    // بررسی عدم تکراری بودن کد
    const duplicate = codes.find(
      (c) => c.code.toUpperCase() === cleanCode && c.id !== editingCode?.id
    );
    if (duplicate) {
      push("این کد تخفیف قبلاً تعریف شده است. لطفاً عبارت دیگری انتخاب کنید.", "error");
      return;
    }

    const expiresAt = formData.hasExpiry
      ? jalaliToIso(Number(formData.jYear), Number(formData.jMonth), Number(formData.jDay), true)
      : null;

    const payload = {
      id: editingCode?.id || `disc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: cleanCode,
      title: formData.title.trim() || `تخفیف ${cleanCode}`,
      type: formData.type,
      value: Math.max(1, Number(formData.value) || 1),
      maxDiscountToman: formData.maxDiscountToman ? Math.max(0, Number(formData.maxDiscountToman)) : null,
      minPurchaseToman: formData.minPurchaseToman ? Math.max(0, Number(formData.minPurchaseToman)) : null,
      maxUses: formData.maxUses ? Math.max(1, Number(formData.maxUses)) : null,
      usedCount: editingCode?.usedCount || 0,
      expiresAt,
      applicablePlans: formData.applicablePlans,
      isActive: Boolean(formData.isActive),
      createdAt: editingCode?.createdAt || new Date().toISOString(),
    };

    setSaving(true);
    let nextCodes = [];
    if (editingCode) {
      nextCodes = codes.map((c) => (c.id === editingCode.id ? payload : c));
    } else {
      nextCodes = [payload, ...codes];
    }

    setCodes(nextCodes);
    const res = await saveDiscountCodes(nextCodes);
    setSaving(false);

    if (res.ok) {
      push(editingCode ? "کد تخفیف با موفقیت ویرایش شد" : "کد تخفیف جدید ایجاد و فعال شد", "success");
      setModalOpen(false);
    } else {
      push("خطا در ذخیره روی سرور: " + res.dbError, "error");
    }
  };

  // تست زنده
  const handleRunSimulator = () => {
    if (!testCodeInput.trim()) {
      push("لطفاً یک کد برای شبیه‌سازی وارد کنید", "error");
      return;
    }
    const amountRial = (Number(testAmountInput) || 0) * 10;
    const result = validateDiscountCode(testCodeInput, testPlanInput, amountRial, codes);
    setTestResult(result);
  };

  // آمار کلی
  const stats = useMemo(() => {
    const total = codes.length;
    const active = codes.filter((c) => {
      const isNotExpired = !c.expiresAt || new Date(c.expiresAt).getTime() > Date.now();
      const hasQuota = !c.maxUses || (c.usedCount || 0) < c.maxUses;
      return c.isActive && isNotExpired && hasQuota;
    }).length;
    const totalUses = codes.reduce((acc, c) => acc + (c.usedCount || 0), 0);
    return { total, active, totalUses };
  }, [codes]);

  // فیلتر کردن لیست
  const filteredCodes = useMemo(() => {
    return codes.filter((c) => {
      // جستجو
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.code.toLowerCase().includes(q) ||
        (c.title && c.title.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // فیلتر وضعیت
      const isExpired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
      const isCapped = c.maxUses && (c.usedCount || 0) >= c.maxUses;

      if (statusFilter === "active") return c.isActive && !isExpired && !isCapped;
      if (statusFilter === "expired") return isExpired;
      if (statusFilter === "capped") return isCapped;
      if (statusFilter === "inactive") return !c.isActive;

      return true;
    });
  }, [codes, search, statusFilter]);

  return (
    <div className="flex flex-col gap-6 font-sans" dir="rtl">
      {/* هدر بخش و توضیحات */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-navy dark:text-white flex items-center gap-2">
            <Ticket size={24} className="text-teal" />
            <span>مدیریت کدهای تخفیف و پروموشن</span>
          </h2>
          <p className="text-sm font-semibold text-ink-subtle dark:text-slate-400 mt-1">
            تعریف کدهای تخفیف تخصصی درصدی یا ثابت، تعیین سقف تخفیف، محدودیت نفرات، تاریخ انقضا و اعمال مستقیم در خرید اشتراک.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="teal" size="sm" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>ایجاد کد تخفیف جدید</span>
          </Button>
        </div>
      </div>

      {/* کارتهای آمار سریع */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StickerCard theme="teal">
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal/15 text-teal flex items-center justify-center shrink-0">
              <Ticket size={24} />
            </div>
            <div>
              <div className="text-xs font-black text-ink-subtle dark:text-slate-400">کدهای فعال و معتبر</div>
              <div className="text-xl sm:text-2xl font-black text-navy dark:text-white mt-1">
                {loading ? "..." : `${faNum(stats.active)} از ${faNum(stats.total)}`}
              </div>
            </div>
          </div>
        </StickerCard>

        <StickerCard theme="orange">
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange/15 text-orange flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div>
              <div className="text-xs font-black text-ink-subtle dark:text-slate-400">مجموع دفعات استفاده‌شده</div>
              <div className="text-xl sm:text-2xl font-black text-navy dark:text-white mt-1">
                {loading ? "..." : `${faNum(stats.totalUses)} بار`}
              </div>
            </div>
          </div>
        </StickerCard>

        <StickerCard theme="white">
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-male-normal/10 text-male-normal dark:text-teal flex items-center justify-center shrink-0">
              <Percent size={24} />
            </div>
            <div>
              <div className="text-xs font-black text-ink-subtle dark:text-slate-400">تخفیف‌های درصدی فعال</div>
              <div className="text-xl sm:text-2xl font-black text-navy dark:text-white mt-1">
                {loading ? "..." : faNum(codes.filter((c) => c.type === "percent" && c.isActive).length)}
              </div>
            </div>
          </div>
        </StickerCard>
      </div>

      {/* نوار جستجو، فیلتر و ابزارها */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-2xl p-3.5 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/40 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی کد تخفیف یا عنوان..."
            className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl text-sm font-bold text-navy dark:text-white focus:outline-none focus:border-teal transition-colors font-sans"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <Filter size={14} className="text-ink/40 dark:text-slate-500 ml-1" />
          {[
            { id: "all", label: "همه" },
            { id: "active", label: "فعال" },
            { id: "expired", label: "منقضی‌شده" },
            { id: "capped", label: "تکمیل‌ظرفیت" },
            { id: "inactive", label: "غیرفعال" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap font-sans ${
                statusFilter === tab.id
                  ? "bg-navy dark:bg-teal text-white dark:text-navy shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-ink dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* لیست کدهای تخفیف */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 border-2 border-ink/10 dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" rounded="rounded-lg" />
                <Skeleton className="h-6 w-16" rounded="rounded-pill" />
              </div>
              <Skeleton className="h-4 w-48" rounded="rounded-md" />
              <div className="pt-2 border-t border-ink/5 dark:border-slate-700/50 flex items-center justify-between">
                <Skeleton className="h-4 w-24" rounded="rounded-md" />
                <Skeleton className="h-8 w-20" rounded="rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/60 border-2 border-dashed border-ink/15 dark:border-slate-700 rounded-2xl p-8 text-center flex flex-col items-center gap-3">
          <Ticket size={36} className="text-ink/30 dark:text-slate-600" />
          <div className="text-sm font-bold text-navy dark:text-white">هیچ کد تخفیفی با این مشخصات یافت نشد</div>
          <Button variant="teal" size="sm" onClick={handleOpenCreate}>
            ایجاد اولین کد تخفیف
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCodes.map((c) => {
            const isExpired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
            const isCapped = c.maxUses && (c.usedCount || 0) >= c.maxUses;
            const isOperational = c.isActive && !isExpired && !isCapped;

            const usagePercent = c.maxUses ? Math.min(100, Math.round(((c.usedCount || 0) / c.maxUses) * 100)) : null;

            return (
              <div
                key={c.id}
                className={`relative bg-white dark:bg-slate-800 border-2 rounded-2xl p-4 sm:p-5 transition-all duration-200 flex flex-col justify-between gap-4 shadow-sm ${
                  isOperational
                    ? "border-ink/15 dark:border-slate-700 hover:border-teal/50"
                    : "border-rose-300 dark:border-rose-900/50 opacity-80"
                }`}
              >
                {/* ردیف بالا: کد + وضعیت + کپی */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans text-base sm:text-lg font-black tracking-wider text-navy dark:text-teal bg-teal/10 dark:bg-teal/20 px-3.5 py-1.5 rounded-xl border border-teal/30 select-all">
                      {c.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(c.code)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-ink-subtle dark:text-slate-400 hover:text-teal p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="کپی کد"
                    >
                      {copiedCode === c.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isExpired ? (
                      <span className="bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 text-xs font-extrabold px-3 py-1 rounded-full">
                        منقضی شده
                      </span>
                    ) : isCapped ? (
                      <span className="bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300 text-xs font-extrabold px-3 py-1 rounded-full">
                        تکمیل ظرفیت
                      </span>
                    ) : c.isActive ? (
                      <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 text-xs font-extrabold px-3 py-1 rounded-full">
                        فعال
                      </span>
                    ) : (
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-extrabold px-3 py-1 rounded-full">
                        غیرفعال
                      </span>
                    )}
                  </div>
                </div>

                {/* عنوان و مشخصات تخفیف */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm font-black text-navy dark:text-white">{c.title || "تخفیف ویژه"}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink-subtle dark:text-slate-400">
                    <span className="text-teal font-black text-sm">
                      {c.type === "percent" ? `${faNum(c.value)}٪ تخفیف` : `${faNum(Number(c.value).toLocaleString("fa-IR"))} تومان تخفیف`}
                    </span>
                    {c.maxDiscountToman && (
                      <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md text-xs font-bold">
                        سقف: {faNum(c.maxDiscountToman.toLocaleString("fa-IR"))} تومان
                      </span>
                    )}
                    {c.minPurchaseToman && (
                      <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md text-xs font-bold">
                        حداقل خرید: {faNum(c.minPurchaseToman.toLocaleString("fa-IR"))} تومان
                      </span>
                    )}
                  </div>
                </div>

                {/* نوار مصرف و تاریخ انقضا */}
                <div className="flex flex-col gap-2 pt-2 border-t border-ink/10 dark:border-slate-700/60">
                  {c.maxUses ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-bold text-ink-subtle dark:text-slate-400">
                        <span>میزان استفاده:</span>
                        <span className="whitespace-nowrap">
                          {faNum(c.usedCount || 0)} از {faNum(c.maxUses)} نفر ({faNum(usagePercent)}٪)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal transition-all duration-300"
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center justify-between">
                      <span>دفعات استفاده شده:</span>
                      <span className="text-navy dark:text-white font-extrabold">{faNum(c.usedCount || 0)} بار (بدون سقف)</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold text-ink-subtle dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      مهلت اعتبار:
                    </span>
                    <span>
                      {c.expiresAt ? (
                        <span className={isExpired ? "text-rose-500 font-black" : "text-navy dark:text-slate-200"}>
                          {faDateLong(c.expiresAt)}
                        </span>
                      ) : (
                        "دائمی (بدون انقضا)"
                      )}
                    </span>
                  </div>

                  {Array.isArray(c.applicablePlans) && c.applicablePlans.length > 0 && (
                    <div className="text-xs font-bold text-ink-subtle dark:text-slate-400 flex items-center gap-1">
                      <span>طرح‌های مجاز:</span>
                      <span className="text-navy dark:text-slate-200 font-extrabold">
                        {c.applicablePlans.map((pid) => availablePlans.find((p) => p.id === pid)?.name || pid).join("، ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* دکمه‌های عملیات */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-ink/10 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(c)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-pill-md transition-colors ${
                        c.isActive
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200"
                      }`}
                    >
                      {c.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTestCodeInput(c.code);
                        setTestPlanInput(c.applicablePlans?.[0] || "pro");
                        handleRunSimulator();
                      }}
                      className="text-xs font-bold text-teal hover:underline px-2 py-1 cursor-pointer"
                    >
                      تست در شبیه‌ساز
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 text-ink-subtle hover:text-navy dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="ویرایش"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* شبیه‌ساز تست زنده کد تخفیف (Live Simulator) */}
      <div className="bg-gradient-to-br from-slate-50 to-teal/5 dark:from-slate-800/80 dark:to-slate-900 border-2 border-teal/30 rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-teal" />
          <h3 className="text-base sm:text-lg font-black text-navy dark:text-white">
            شبیه‌ساز و تستر زنده کدهای تخفیف (Simulator)
          </h3>
        </div>
        <p className="text-xs sm:text-sm font-medium text-ink-subtle dark:text-slate-400">
          برای اطمینان از عملکرد صحیح کدها، شرایط یک خرید فرضی را وارد کرده و نتیجه محاسبات را فوراً بررسی کنید:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-black text-navy dark:text-slate-200 block mb-1.5">کد تخفیف مورد نظر:</label>
            <input
              type="text"
              dir="ltr"
              value={testCodeInput}
              onChange={(e) => setTestCodeInput(e.target.value)}
              placeholder="مثلاً WELCOME20"
              className="w-full bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-black text-center uppercase tracking-wider text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
            />
          </div>

          <div>
            <label className="text-xs font-black text-navy dark:text-slate-200 block mb-1.5">طرح انتخابی:</label>
            <select
              value={testPlanInput}
              onChange={(e) => setTestPlanInput(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
            >
              {availablePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-navy dark:text-slate-200 block mb-1.5">مبلغ آزمایشی (تومان):</label>
            <input
              type="number"
              value={testAmountInput}
              onChange={(e) => setTestAmountInput(e.target.value)}
              placeholder="40000"
              className="w-full bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="navy" size="sm" onClick={handleRunSimulator}>
            <Play size={14} />
            <span>بررسی و محاسبه نتیجه</span>
          </Button>
        </div>

        {/* نتیجه تست */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border-2 flex flex-col gap-2 ${
              testResult.valid
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2 font-black text-sm">
              {testResult.valid ? <CheckCircle2 size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-rose-600" />}
              <span>{testResult.valid ? "کد تخفیف کاملاً معتبر و قابل اعمال است ✅" : "کد تخفیف رد شد ❌"}</span>
            </div>

            {testResult.valid ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold pt-1">
                <div>مبلغ پایه: {faNum(testResult.discount.originalPriceToman.toLocaleString("fa-IR"))} تومان</div>
                <div className="text-emerald-600 dark:text-emerald-300">
                  تخفیف کسر شده: {faNum(testResult.discount.discountAmountToman.toLocaleString("fa-IR"))} تومان
                </div>
                <div className="font-black">
                  مبلغ نهایی قابل پرداخت: {faNum(testResult.discount.finalPriceToman.toLocaleString("fa-IR"))} تومان
                </div>
              </div>
            ) : (
              <div className="text-xs font-bold">{testResult.error}</div>
            )}
          </div>
        )}
      </div>

      {/* مودال ایجاد و ویرایش */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCode ? `ویرایش کد تخفیف ${editingCode.code}` : "تعریف کد تخفیف جدید"}
      >
        <form onSubmit={handleSubmitForm} className="flex flex-col gap-4">
          {/* ردیف ۱: عبارت کد + دکمه تولید رندوم */}
          <div>
            <label className="block text-xs font-black text-navy dark:text-slate-200 mb-1.5">
              عبارت کد تخفیف (انگلیسی / اعداد):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                dir="ltr"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="مثلاً NOWRUZ1405"
                className="flex-1 bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-black text-center uppercase tracking-wider text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFormData({ ...formData, code: generateRandomCouponCode() })}
                title="تولید کد رندوم"
              >
                <Sparkles size={14} />
                <span>کد تصادفی</span>
              </Button>
            </div>
          </div>

          {/* ردیف ۲: عنوان یا یادداشت */}
          <div>
            <label className="block text-xs font-black text-navy dark:text-slate-200 mb-1.5">عنوان / یادداشت مدیریتی:</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="مثلاً تخفیف ۵۰ درصدی نوروز ویژه طرح حرفه‌ای"
              className="w-full bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
            />
          </div>

          {/* ردیف ۳: نوع و مقدار تخفیف */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-navy dark:text-slate-200 mb-1.5">نوع تخفیف:</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
              >
                <option value="percent">درصدی (٪)</option>
                <option value="fixed">مبلغ ثابت (تومان)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-navy dark:text-slate-200 mb-1.5">
                {formData.type === "percent" ? "درصد تخفیف (۱ تا ۱۰۰):" : "مبلغ تخفیف (تومان):"}
              </label>
              <input
                type="number"
                required
                min={1}
                max={formData.type === "percent" ? 100 : undefined}
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
              />
            </div>
          </div>

          {/* ردیف ۴: سقف تخفیف درصدی و حداقل خرید */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-navy dark:text-slate-200 mb-1.5">
                سقف تخفیف (تومان - اختیاری برای درصدی):
              </label>
              <input
                type="number"
                min={0}
                value={formData.maxDiscountToman}
                onChange={(e) => setFormData({ ...formData, maxDiscountToman: e.target.value })}
                placeholder="بدون سقف"
                disabled={formData.type === "fixed"}
                className="w-full bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-navy dark:text-slate-200 mb-1.5">
                حداقل مبلغ خرید (تومان - اختیاری):
              </label>
              <input
                type="number"
                min={0}
                value={formData.minPurchaseToman}
                onChange={(e) => setFormData({ ...formData, minPurchaseToman: e.target.value })}
                placeholder="بدون حداقل (۰)"
                className="w-full bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
              />
            </div>
          </div>

          {/* ردیف ۵: محدودیت تعداد نفرات و تاریخ انقضا */}
          {/* ردیف ۵: محدودیت تعداد نفرات و نوع انقضا */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-extrabold text-navy dark:text-slate-200 block mb-1">
                محدودیت تعداد نفرات / دفعات استفاده:
              </label>
              <input
                type="number"
                min={1}
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                placeholder="نامحدود (سقفی ندارد)"
                className="w-full bg-white dark:bg-slate-900 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-navy dark:text-slate-200 mb-1.5">
                نوع اعتبار زمانی:
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 border-2 border-ink/15 dark:border-slate-700 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, hasExpiry: false })}
                  className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all font-sans ${
                    !formData.hasExpiry
                      ? "bg-white dark:bg-slate-800 text-teal dark:text-teal shadow-sm"
                      : "text-ink-subtle dark:text-slate-400 hover:text-navy dark:hover:text-white"
                  }`}
                >
                  دائمی (بدون انقضا)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, hasExpiry: true })}
                  className={`py-2 px-2.5 rounded-lg text-xs font-black transition-all font-sans ${
                    formData.hasExpiry
                      ? "bg-teal text-white shadow-sm"
                      : "text-ink-subtle dark:text-slate-400 hover:text-navy dark:hover:text-white"
                  }`}
                >
                  دارای تاریخ انقضا
                </button>
              </div>
            </div>
          </div>

          {/* ردیف انتخاب تاریخ انقضای شمسی */}
          {formData.hasExpiry && (
            <div className="p-3.5 bg-teal/5 dark:bg-slate-900/60 border-2 border-teal/30 dark:border-teal/20 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-navy dark:text-teal">
                  <Calendar size={14} className="text-teal" />
                  <span>انتخاب تاریخ انقضا (تقویم شمسی):</span>
                </div>
                {/* میانبرهای سریع */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
                  <span className="text-ink-subtle dark:text-slate-400 text-xs">میانبر:</span>
                  <button
                    type="button"
                    onClick={() => handlePresetDate("1week")}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-ink/10 dark:border-slate-700 text-ink dark:text-slate-200 hover:border-teal hover:text-teal transition-colors text-xs"
                  >
                    ۱ هفته
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDate("1month")}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-ink/10 dark:border-slate-700 text-ink dark:text-slate-200 hover:border-teal hover:text-teal transition-colors text-xs"
                  >
                    ۱ ماه
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDate("3months")}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-ink/10 dark:border-slate-700 text-ink dark:text-slate-200 hover:border-teal hover:text-teal transition-colors text-xs"
                  >
                    ۳ ماه
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDate("yearEnd")}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-ink/10 dark:border-slate-700 text-ink dark:text-slate-200 hover:border-teal hover:text-teal transition-colors text-xs"
                  >
                    پایان سال
                  </button>
                </div>
              </div>

              {/* ۳ دراپ‌داون سال / ماه / روز شمسی */}
              <div className="grid grid-cols-3 gap-2">
                {/* روز */}
                <div>
                  <label className="text-xs font-black text-ink-subtle dark:text-slate-400 block mb-1">روز:</label>
                  <select
                    value={formData.jDay}
                    onChange={(e) => setFormData({ ...formData, jDay: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
                  >
                    {Array.from({ length: formData.jMonth <= 6 ? 31 : formData.jMonth <= 11 ? 30 : 29 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {faNum(d)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ماه */}
                <div>
                  <label className="text-xs font-black text-ink-subtle dark:text-slate-400 block mb-1">ماه:</label>
                  <select
                    value={formData.jMonth}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      const maxD = m <= 6 ? 31 : m <= 11 ? 30 : 29;
                      setFormData({
                        ...formData,
                        jMonth: m,
                        jDay: Math.min(formData.jDay, maxD),
                      });
                    }}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
                  >
                    {JALALI_MONTH_NAMES.map((mName, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {mName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* سال */}
                <div>
                  <label className="text-xs font-black text-ink-subtle dark:text-slate-400 block mb-1">سال:</label>
                  <select
                    value={formData.jYear}
                    onChange={(e) => setFormData({ ...formData, jYear: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-navy dark:text-white focus:border-teal outline-none transition-colors font-sans"
                  >
                    {[1404, 1405, 1406, 1407, 1408, 1409, 1410].map((y) => (
                      <option key={y} value={y}>
                        {faNum(y)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* پیش‌نمایش متنی تاریخ انقضا */}
              <div className="flex items-center justify-between text-xs font-bold bg-white/80 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-teal/20 text-navy dark:text-slate-200">
                <span className="text-teal font-extrabold">پیش‌نمایش اعتبار:</span>
                <span>
                  تا پایان {faNum(formData.jDay)} {JALALI_MONTH_NAMES[formData.jMonth - 1]} {faNum(formData.jYear)} (ساعت ۲۳:۵۹)
                </span>
              </div>
            </div>
          )}

          {/* ردیف ۶: طرح‌های مجاز */}
          <div>
            <label className="text-xs font-extrabold text-navy dark:text-slate-200 block mb-1.5">
              قابل استفاده برای کدام طرح‌ها؟
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, applicablePlans: [] })}
                className={`px-3 py-1.5 rounded-pill-md text-xs font-bold border-2 transition-all ${
                  formData.applicablePlans.length === 0
                    ? "border-teal bg-teal text-white"
                    : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink dark:text-slate-300"
                }`}
              >
                همه طرح‌ها
              </button>

              {availablePlans.map((p) => {
                const checked = formData.applicablePlans.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const next = checked
                        ? formData.applicablePlans.filter((id) => id !== p.id)
                        : [...formData.applicablePlans, p.id];
                      setFormData({ ...formData, applicablePlans: next });
                    }}
                    className={`px-3 py-1.5 rounded-pill-md text-xs font-bold border-2 transition-all ${
                      checked
                        ? "border-navy dark:border-teal bg-navy dark:bg-teal text-white dark:text-navy"
                        : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-900 text-ink dark:text-slate-300"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ردیف ۷: وضعیت فعال بودن */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-teal rounded focus:ring-teal"
            />
            <span className="text-xs sm:text-sm font-extrabold text-navy dark:text-white">
              این کد تخفیف بلافاصله فعال باشد
            </span>
          </label>

          {/* دکمه‌های فرم */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-ink/10 dark:border-slate-700">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="teal" type="submit" disabled={saving}>
              <span>{saving ? "در حال ذخیره..." : editingCode ? "ذخیره تغییرات" : "ایجاد کد تخفیف"}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
