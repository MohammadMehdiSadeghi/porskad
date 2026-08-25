import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let toastId = 0;

const TOAST_STYLES = {
  success: { icon: "✅", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  error: { icon: "❌", bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  info: { icon: "ℹ️", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  warning: { icon: "⚠️", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
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
              className={`relative bg-white border ${s.border} rounded-lg shadow-md px-4 py-3 flex items-center gap-2.5`}
              role="status"
            >
              <span className="text-base">{s.icon}</span>
              <span className={`text-sm font-medium flex-1 ${s.text}`}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
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
