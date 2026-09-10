import { useEffect, useState } from "react";
import {
  Save,
  RotateCcw,
  Eye,
  Wrench,
  ToggleRight,
  ToggleLeft,
  Unlock,
} from "lucide-react";
import StickerCard from "../../components/ui/StickerCard";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabaseClient";
import {
  USER_TABS,
  USER_TABS_SETTINGS_KEY,
  DEFAULT_USER_TABS_CONFIG,
  DEFAULT_MAINTENANCE_MESSAGE,
  TAB_STATE_ON,
  TAB_STATE_MAINTENANCE,
  TAB_STATE_DISABLED,
  loadUserTabsConfigFromDb,
  normalizeUserTabsConfig,
} from "../../lib/userTabs";

// ═══════════════════════════════════════════════════════
// تب «کنترل تب‌های کاربری» در پنل گاد — سه حالت برای هر تب:
// فعال / بروزرسانی (با متن آماده و قابل ویرایش) / غیرفعال
// ذخیره از طریق RPC سوپرادمین update_system_settings
// ═══════════════════════════════════════════════════════

const MODES = [
  {
    id: TAB_STATE_ON,
    label: "فعال",
    icon: Unlock,
    activeCls: "bg-teal border-teal-text text-white",
    idleCls: "bg-ecosystem-light/70 border-teal/20 text-teal-text hover:bg-ecosystem-light",
  },
  {
    id: TAB_STATE_MAINTENANCE,
    label: "بروزرسانی",
    icon: Wrench,
    activeCls: "bg-orange border-[#C57A07] text-white",
    idleCls: "bg-college-light/70 border-orange/25 text-college-dark hover:bg-college-light",
  },
  {
    id: TAB_STATE_DISABLED,
    label: "غیرفعال",
    icon: ToggleLeft,
    activeCls: "bg-magenta border-magenta-text text-white",
    idleCls: "bg-female-light/70 border-magenta/25 text-magenta-text hover:bg-female-light",
  },
];

const THEME_BY_TAB = {
  forms: "white",
  embed: "teal",
  telegram: "navy",
  support: "magenta",
  profile: "orange",
};

export default function UserTabsPanel() {
  const [cfg, setCfg] = useState(DEFAULT_USER_TABS_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_system_settings");
        if (!alive) return;
        if (!error && data) setCfg(normalizeUserTabsConfig(data[USER_TABS_SETTINGS_KEY]));
      } catch {
        /* همان پیش‌فرضها می‌ماند */
      } finally {
        if (alive) {
          setLoaded(true);
          setDirty(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function setTabState(tabId, state) {
    setCfg((c) => ({ ...c, [tabId]: { ...c[tabId], state } }));
    setDirty(true);
  }

  function setTabMessage(tabId, message) {
    setCfg((c) => ({ ...c, [tabId]: { ...c[tabId], message } }));
    setDirty(true);
  }

  function useDefaultMessage(tabId) {
    setTabMessage(tabId, DEFAULT_MAINTENANCE_MESSAGE);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const normalized = normalizeUserTabsConfig(cfg);
      const { error } = await supabase.rpc("update_system_settings", {
        p_settings: { [USER_TABS_SETTINGS_KEY]: normalized },
      });
      if (error) throw error;
      setCfg(normalized);
      await loadUserTabsConfigFromDb();
      setDirty(false);
      toast.push("وضعیت تب‌های کاربری ذخیره و برای همه کاربران اعمال شد.", "success");
    } catch (e) {
      toast.push("خطا در ذخیره تنظیمات: " + (e?.message || e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetAll() {
    setCfg(JSON.parse(JSON.stringify(DEFAULT_USER_TABS_CONFIG)));
    setDirty(true);
    toast.push("پیش‌فرضها بارگذاری شد — برای اعمال، «ذخیره» را بزنید.", "info");
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm animate-pulse">
        در حال بارگذاری تنظیمات تب‌ها…
      </div>
    );
  }

  const blockedCount = USER_TABS.filter(
    (t) => cfg[t.id]?.state && cfg[t.id].state !== TAB_STATE_ON,
  ).length;

  return (
    <div className="space-y-4">
      <StickerCard theme="navy" rotate="rotate-[-0.3deg]">
        <div className="p-5 sm:p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Eye size={19} className="text-teal shrink-0" />
                کنترل تب‌های پنل کاربری
              </h3>
              <p className="text-xs text-white/65 font-medium mt-1 leading-5">
                وضعیت هر تبِ کاربری را تعیین کنید. حالت «بروزرسانی» پیام آماده نمایش می‌دهد؛
                حالت «غیرفعال» تب را از منوی کاربران حذف می‌کند.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {dirty && (
                <span className="inline-flex items-center gap-1 bg-magenta text-white text-xs font-extrabold px-2.5 py-1 rounded-xl [corner-shape:squircle] rotate-[-1deg]">
                  ● تغییر ذخیره‌نشده
                </span>
              )}
              <button
                type="button"
                onClick={handleResetAll}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold transition"
              >
                <RotateCcw size={12} />
                پیش‌فرض همه
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal border border-teal-text text-white text-xs font-black hover:bg-teal-text disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Save size={12} />
                {saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}
              </button>
            </div>
          </div>
          {blockedCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-orange/20 border border-orange/40 px-2.5 py-1 text-xs font-bold text-amber-100">
              <Wrench size={12} />
              {blockedCount} تب برای کاربران محدود شده است.
            </div>
          )}
        </div>
      </StickerCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {USER_TABS.map((tab, i) => {
          const entry = cfg[tab.id] || { state: TAB_STATE_ON, message: "" };
          const st = MODES.find((m) => m.id === entry.state) || MODES[0];
          const theme = THEME_BY_TAB[tab.id] || "white";
          return (
            <StickerCard
              key={tab.id}
              theme={theme}
              rotate={i % 2 ? "rotate-[0.3deg]" : "rotate-[-0.3deg]"}
            >
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-navy dark:text-white">{tab.label}</div>
                    <code className="text-[0.6875rem] text-ink/50 dark:text-slate-400" dir="ltr">
                      {tab.path}
                    </code>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[0.6875rem] font-black [corner-shape:squircle] text-white ${st.id === TAB_STATE_ON ? "bg-teal" : st.id === TAB_STATE_MAINTENANCE ? "bg-orange" : "bg-magenta"}`}
                  >
                    <st.icon size={12} />
                    {st.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {MODES.map((m) => {
                    const on = entry.state === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setTabState(tab.id, m.id)}
                        className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[0.6875rem] font-black transition-all border active:scale-[0.98] [corner-shape:squircle] ${on ? m.activeCls : m.idleCls}`}
                      >
                        <m.icon size={13} />
                        {m.label}
                      </button>
                    );
                  })}
                </div>

                {entry.state === TAB_STATE_MAINTENANCE && (
                  <div className="rounded-xl border-2 border-orange/40 bg-white/80 dark:bg-slate-900/70 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[0.6875rem] font-black text-navy dark:text-white flex items-center gap-1">
                        <ToggleRight size={12} className="text-orange" />
                        متن پیام بروزرسانی (اختیاری)
                      </span>
                      <button
                        type="button"
                        onClick={() => useDefaultMessage(tab.id)}
                        className="text-[0.625rem] font-bold text-orange hover:underline whitespace-nowrap"
                      >
                        استفاده از متن آماده
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={entry.message}
                      onChange={(e) => setTabMessage(tab.id, e.target.value)}
                      placeholder={DEFAULT_MAINTENANCE_MESSAGE}
                      className="w-full bg-white dark:bg-slate-800 border border-navy/15 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-ink dark:text-white focus:border-teal focus:outline-none resize-y font-medium"
                    />
                  </div>
                )}

                <div className="text-[0.625rem] font-bold text-ink/55 dark:text-slate-400">
                  {entry.state === TAB_STATE_DISABLED &&
                    "تب از سایدبار کاربر حذف می‌شود؛ با باز کردن آدرس مستقیم، پیام «غیرفعال» نمایش داده می‌شود."}
                  {entry.state === TAB_STATE_MAINTENANCE &&
                    "تب در منو می‌ماند؛ کاربر با باکس «در حال بروزرسانی» مواجه می‌شود."}
                  {entry.state === TAB_STATE_ON &&
                    "تب برای همه کاربران عادی فعال و بدون محدودیت است."}
                </div>
              </div>
            </StickerCard>
          );
        })}
      </div>

      <p className="text-[0.625rem] font-medium text-ink/50 dark:text-slate-400 leading-5">
        ⚙️ ذخیره از طریق تابع امن update_system_settings انجام می‌شود و پس از ذخیره، کاربر با
        F5 یا جابه‌جایی تب وضعیت جدید را می‌بیند. پنل‌های مدیرتی (سوپرادمین) محدود نمی‌شوند.
      </p>
    </div>
  );
}
