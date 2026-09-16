import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let toastId = 0;

const TOAST_STYLES = {
  success: {
    Icon: CheckCircle2,
    border: "border-teal/40 dark:border-teal/50",
    badgeBg: "bg-teal/15 text-teal",
    iconColor: "text-teal",
    glow: "shadow-[0_8px_30px_rgba(0,0,0,0.35),0_0_18px_rgba(45,212,191,0.15)]",
  },
  error: {
    Icon: AlertCircle,
    border: "border-rose-500/40 dark:border-rose-500/50",
    badgeBg: "bg-rose-500/15 text-rose-400",
    iconColor: "text-rose-500",
    glow: "shadow-[0_8px_30px_rgba(0,0,0,0.35),0_0_18px_rgba(244,63,94,0.15)]",
  },
  warning: {
    Icon: AlertTriangle,
    border: "border-amber-400/40 dark:border-amber-400/50",
    badgeBg: "bg-amber-400/15 text-amber-400",
    iconColor: "text-amber-400",
    glow: "shadow-[0_8px_30px_rgba(0,0,0,0.35),0_0_18px_rgba(251,191,36,0.15)]",
  },
  info: {
    Icon: Info,
    border: "border-teal/30 dark:border-teal/40",
    badgeBg: "bg-teal/10 text-teal",
    iconColor: "text-teal",
    glow: "shadow-[0_8px_30px_rgba(0,0,0,0.35),0_0_18px_rgba(45,212,191,0.12)]",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [alertModal, setAlertModal] = useState(null); // { title, message, type, onClose }
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (message, type = "success", duration = 3500) => {
      const id = ++toastId;
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const showAlert = useCallback(({ title = "اعلان سامانه", message, type = "info" }) => {
    setAlertModal({ title, message, type });
  }, []);

  // شنود رویداد سراسری porskad:alert برای رهگیری فراخوانی‌های احتمالی window.alert
  useEffect(() => {
    const handleGlobalAlert = (e) => {
      const msg = e.detail?.message || "";
      if (msg) {
        setAlertModal({
          title: "پیام سامانه",
          message: msg,
          type: "info",
        });
      }
    };
    window.addEventListener("porskad:alert", handleGlobalAlert);
    return () => window.removeEventListener("porskad:alert", handleGlobalAlert);
  }, []);

  return (
    <ToastContext.Provider value={{ push, showAlert }}>
      {children}

      {/* ─── Toast Container ─── */}
      <div
        dir="rtl"
        className="fixed bottom-5 left-5 z-[70] flex flex-col gap-2.5 max-w-[24rem] w-full sm:w-auto pointer-events-none"
      >
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type] ?? TOAST_STYLES.info;
          const IconComp = s.Icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative overflow-hidden bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-xl border-[1.5px] ${s.border} ${s.glow} rounded-2xl px-4 py-3 flex items-center gap-3 animate-[toast-in_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards] transition-all`}
              role="status"
            >
              <div className={`w-8 h-8 rounded-xl ${s.badgeBg} flex items-center justify-center shrink-0`}>
                <IconComp size={16} />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-navy dark:text-slate-100 flex-1 leading-5">
                {t.message}
              </span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-navy dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
                aria-label="بستن"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ─── Custom Global Alert Box (جایگزین پنجره خام alert مرورگر) ─── */}
      {alertModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setAlertModal(null)}
        >
          <div
            className="w-full max-w-md mx-auto rounded-3xl border border-teal/40 bg-[#0B0F19]/95 dark:bg-[#131B2E]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(45,212,191,0.2)] p-6 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* آیکون دایره‌ای با هاله نور */}
            <div className="w-14 h-14 rounded-2xl bg-teal/15 border border-teal/30 text-teal flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(45,212,191,0.3)]">
              {alertModal.type === "error" ? (
                <AlertCircle size={28} className="text-rose-400" />
              ) : alertModal.type === "warning" ? (
                <AlertTriangle size={28} className="text-amber-400" />
              ) : (
                <Info size={28} className="text-teal" />
              )}
            </div>

            {/* عنوان باکس */}
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              {alertModal.title}
            </h3>

            {/* پیام باکس */}
            <p className="text-xs sm:text-sm font-semibold text-slate-300 leading-6 mb-6">
              {alertModal.message}
            </p>

            {/* دکمه تایید و بستن */}
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal to-teal-400 text-[#0B0F19] font-black text-sm shadow-[0_0_15px_rgba(45,212,191,0.4)] hover:shadow-[0_0_22px_rgba(45,212,191,0.6)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(1rem) scale(0.95); } to { opacity: 1; transform: none; } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast باید داخل ToastProvider استفاده شود");
  return ctx;
}
