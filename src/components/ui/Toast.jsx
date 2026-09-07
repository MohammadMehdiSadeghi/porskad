import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let toastId = 0;

const TOAST_STYLES = {
  success: { Icon: CheckCircle2, border: "border-teal-text", title: "text-teal-text", iconColor: "text-teal" },
  error: { Icon: AlertCircle, border: "border-magenta-text", title: "text-magenta-text", iconColor: "text-magenta" },
  info: { Icon: Info, border: "border-navy", title: "text-navy", iconColor: "text-navy" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
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

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-4 z-[60] flex flex-col gap-2 max-w-[22rem]">
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type] ?? TOAST_STYLES.info;
          const IconComp = s.Icon;
          return (
            <div
              key={t.id}
              className={`relative bg-white border-2 ${s.border} rounded-pill-md shadow-soft px-4 py-3 flex items-center gap-2.5 animate-[toast-in_0.25s_ease-out]`}
              role="status"
            >
              <IconComp size={18} className={`${s.iconColor} shrink-0`} />
              <span className={`text-sm font-bold ${s.title}`}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="mr-auto text-ink/40 hover:text-ink transition-colors p-0.5 rounded cursor-pointer"
                aria-label="بستن"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(0.75rem); } to { opacity: 1; transform: none; } }`}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast باید داخل ToastProvider استفاده شود");
  return ctx;
}
