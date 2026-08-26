import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let toastId = 0;

const TOAST_STYLES = {
  success: { icon: "✅", border: "border-teal-text/30", text: "text-teal-text" },
  error: { icon: "❌", border: "border-magenta-text/30", text: "text-magenta-text" },
  info: { icon: "ℹ️", border: "border-navy/25", text: "text-navy" },
  warning: { icon: "⚠️", border: "border-orange/40", text: "text-orange" },
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
    (message, type = "info", duration = 3500) => {
      const id = ++toastId;
      setToasts((list) => [...list.slice(-4), { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-4 z-[60] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type] ?? TOAST_STYLES.info;
          return (
            <div
              key={t.id}
              className={`relative bg-white border-2 ${s.border} rounded-[0.75rem] [corner-shape:squircle] shadow-md px-4 py-3 flex items-center gap-2.5`}
              role="status"
            >
              <span className="text-base">{s.icon}</span>
              <span className={`text-sm font-bold flex-1 ${s.text}`}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-ink/30 hover:text-ink/60 text-sm font-bold"
                aria-label="بستن"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast باید داخل ToastProvider استفاده شود");
  return ctx;
}
