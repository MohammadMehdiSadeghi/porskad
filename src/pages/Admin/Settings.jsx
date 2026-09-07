import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import Button from "../../components/ui/Button";
import StickerCard from "../../components/ui/StickerCard";
import SEO from "../../components/ui/SEO";
import {
  Settings as SettingsIcon,
  Shield,
  Save,
  RotateCcw,
  Sliders,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Layers,
  Inbox,
  UserPlus,
} from "lucide-react";

export default function Settings() {
  const { isOwner } = useAuth();
  const { push } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    site_title: "پرس‌کاد",
    telegram_support_id: "porskad_support",
    default_max_active_forms: 5,
    default_max_monthly_responses: 100,
    registration_enabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_system_settings");
      if (error) throw error;
      if (data) {
        setSettings({
          site_title: data.site_title || "پرس‌کاد",
          telegram_support_id: data.telegram_support_id || "porskad_support",
          default_max_active_forms: data.default_max_active_forms ?? 5,
          default_max_monthly_responses: data.default_max_monthly_responses ?? 100,
          registration_enabled: data.registration_enabled !== false,
        });
      }
    } catch (err) {
      console.error("Failed to load system settings:", err);
      push("خطا در بارگذاری تنظیمات سامانه: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e?.preventDefault?.();
    setSaving(true);
    try {
      const payload = {
        site_title: settings.site_title.trim() || "پرس‌کاد",
        telegram_support_id: settings.telegram_support_id.replace(/^@/, "").trim(),
        default_max_active_forms: Math.max(1, Number(settings.default_max_active_forms) || 5),
        default_max_monthly_responses: Math.max(1, Number(settings.default_max_monthly_responses) || 100),
        registration_enabled: Boolean(settings.registration_enabled),
      };

      const { data, error } = await supabase.rpc("update_system_settings", {
        p_settings: payload,
      });
      if (error) throw error;

      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
      push("تنظیمات و محدودیت‌های سامانه با موفقیت ذخیره و اعمال شد", "success");
    } catch (err) {
      console.error("Failed to update system settings:", err);
      push("خطا در ذخیره تنظیمات: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (!isOwner()) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white border-2 border-navy rounded-2xl max-w-md">
          <Shield size={48} className="text-magenta mx-auto mb-3" />
          <h2 className="text-base sm:text-lg font-black text-navy mb-2">دسترسی غیرمجاز</h2>
          <p className="text-xs text-ink-subtle">
            تنها صاحب اصلی (سوپرادمین) به بخش تنظیمات و محدودیت‌های سامانه دسترسی دارد.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <SEO title="تنظیمات سامانه | پرس‌کاد" description="مدیریت سهمیه‌ها، محدودیت‌ها و تنظیمات عمومی سامانه" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-navy flex items-center gap-2">
            <SettingsIcon className="text-teal" size={26} />
            تنظیمات و محدودیت‌های کل سامانه
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-1">
            پیکربندی هویت سامانه، اتصال پشتیبانی، سهمیه فرم‌های فعال و ظرفیت ورودی ماهانه کاربران
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/managers">
            <Button variant="ghost" size="sm" className="text-xs">
              <Users size={14} className="ml-1" />
              مدیریت کاربران و سهمیه‌ها
            </Button>
          </Link>
          <Button
            variant="teal"
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="text-xs"
          >
            <Save size={14} className="ml-1" />
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ۱. تنظیمات عمومی و برندینگ */}
        <StickerCard title="مشخصات و برندینگ سامانه">
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* نام سامانه */}
              <div>
                <label className="block text-xs font-black text-navy mb-1.5">
                  عنوان و برند سامانه
                </label>
                <input
                  type="text"
                  value={settings.site_title}
                  onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                  placeholder="مثال: پرس‌کاد"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-ink/15 text-sm font-bold text-navy focus:border-teal outline-none transition-colors"
                  required
                />
                <span className="text-[0.7rem] text-ink-subtle mt-1 block">
                  این عنوان در سربرگ صفحات، پیام‌ها و ایمیل‌های ارسالی قرار می‌گیرد.
                </span>
              </div>

              {/* آیدی پشتیبانی تلگرام */}
              <div>
                <label className="block text-xs font-black text-navy mb-1.5">
                  آیدی پشتیبانی تلگرام
                </label>
                <div className="relative">
                  <input
                    type="text"
                    dir="ltr"
                    value={settings.telegram_support_id}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        telegram_support_id: e.target.value.replace(/^@/, ""),
                      })
                    }
                    placeholder="porskad_support"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-ink/15 text-sm font-bold font-mono text-navy focus:border-teal outline-none transition-colors pl-8"
                    required
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle font-mono text-sm">
                    @
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[0.7rem]">
                  <span className="text-ink-subtle">
                    لینک ارتباط کاربران در بخش تیکت‌ها به این آیدی هدایت خواهد شد.
                  </span>
                  {settings.telegram_support_id && (
                    <a
                      href={`https://t.me/${settings.telegram_support_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal font-bold hover:underline inline-flex items-center gap-0.5"
                    >
                      تست لینک <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </StickerCard>

        {/* ۲. سقف‌های پیش‌فرض و محدودیت‌های سهمیه */}
        <StickerCard title="سقف‌ها و سهمیه‌های پیش‌فرض کاربران جدید">
          <div className="p-4 sm:p-6 space-y-5">
            <div className="bg-bg-mint/60 border border-teal/20 rounded-2xl p-3.5 flex items-start gap-3">
              <CheckCircle2 size={18} className="text-teal shrink-0 mt-0.5" />
              <div className="text-xs text-navy leading-relaxed">
                <strong>نحوه اعمال محدودیت‌ها:</strong> این مقادیر به عنوان سهمیه پایه به حساب تمام کاربران تازه ثبت‌نام‌شده اختصاص داده می‌شود. شما همچنین می‌توانید سهمیه هر کاربر را به صورت اختصاصی از بخش{" "}
                <Link to="/admin/managers" className="text-teal font-black underline">
                  «مدیریت کاربران»
                </Link>{" "}
                یا پنل سوپرادمین به صورت دستی افزایش دهید یا تغییر دهید.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* سقف فرم‌های فعال */}
              <div className="bg-white border-2 border-navy/10 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-navy flex items-center gap-1.5">
                      <Layers size={16} className="text-teal" />
                      سقف پیش‌فرض فرم‌های همزمان فعال
                    </span>
                    <span className="text-xs font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-full">
                      پیش‌فرض: ۵ فرم
                    </span>
                  </div>
                  <p className="text-[0.75rem] text-ink-subtle leading-relaxed mb-3">
                    حداکثر تعداد فرم‌هایی که کاربر می‌تواند به طور همزمان در وضعیت «منتشر شده» داشته باشد. تلاش برای انتشار فرم‌های بیشتر به طور خودکار مسدود می‌شود.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-navy/5">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    dir="ltr"
                    value={settings.default_max_active_forms}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_max_active_forms: Number(e.target.value) || 1,
                      })
                    }
                    className="w-28 px-3 py-2 rounded-xl border-2 border-ink/15 text-sm font-black text-navy focus:border-teal outline-none text-center font-mono"
                  />
                  <span className="text-xs font-bold text-navy">فرم فعال</span>
                </div>
              </div>

              {/* سقف ورودی‌های ماهانه */}
              <div className="bg-white border-2 border-navy/10 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-navy flex items-center gap-1.5">
                      <Inbox size={16} className="text-orange" />
                      سقف پیش‌فرض ورودی‌های ماهانه
                    </span>
                    <span className="text-xs font-bold text-orange bg-orange/10 px-2 py-0.5 rounded-full">
                      پیش‌فرض: ۱۰۰ ورودی
                    </span>
                  </div>
                  <p className="text-[0.75rem] text-ink-subtle leading-relaxed mb-3">
                    حجم ورودی‌های دریافتی مجاز در هر چرخه ۳۰ روزه. با ثبت هر پاسخ، شمارنده افزایش می‌یابد و با حذف ورودی توسط کاربر سهمیه باز نمی‌گردد (سوخت قطعی توکن).
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-navy/5">
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    step="10"
                    dir="ltr"
                    value={settings.default_max_monthly_responses}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_max_monthly_responses: Number(e.target.value) || 10,
                      })
                    }
                    className="w-28 px-3 py-2 rounded-xl border-2 border-ink/15 text-sm font-black text-navy focus:border-teal outline-none text-center font-mono"
                  />
                  <span className="text-xs font-bold text-navy">ورودی در هر دوره ۳۰ روزه</span>
                </div>
              </div>
            </div>
          </div>
        </StickerCard>

        {/* ۳. وضعیت ثبت‌نام عمومی */}
        <StickerCard title="دسترسی و ثبت‌نام عمومی">
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border-2 border-navy/10 bg-bg-lavender/40">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    settings.registration_enabled
                      ? "bg-teal/15 text-teal"
                      : "bg-magenta/15 text-magenta"
                  }`}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-navy">
                    ثبت‌نام مستقیم کاربران در سامانه
                  </h4>
                  <p className="text-xs font-semibold text-ink-subtle mt-0.5">
                    {settings.registration_enabled
                      ? "صفحه ثبت‌نام (/register) برای عموم فعال و باز است."
                      : "صفحه ثبت‌نام بسته است و کاربران جدید تنها توسط ادمین در بخش مدیریت کاربران افزوده می‌شوند."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      registration_enabled: !settings.registration_enabled,
                    })
                  }
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.registration_enabled ? "bg-teal" : "bg-ink/20"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      settings.registration_enabled ? "-translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-navy min-w-[50px]">
                  {settings.registration_enabled ? "فعال" : "غیرفعال"}
                </span>
              </div>
            </div>
          </div>
        </StickerCard>

        {/* دکمه ذخیره انتهای صفحه */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="teal"
            size="md"
            disabled={saving || loading}
            className="px-6 py-2.5 font-black text-sm"
          >
            <Save size={16} className="ml-1.5" />
            {saving ? "در حال ذخیره‌سازی..." : "ذخیره تمام تنظیمات سامانه"}
          </Button>
        </div>
      </form>
    </div>
  );
}
