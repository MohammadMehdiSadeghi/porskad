import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let toastId = 0;

const TOAST_STYLES = {
  success: { icon: "✓", border: "border-teal-text", title: "text-teal-text" },
  error: { icon: "⚠️", border: "border-magenta-text", title: "text-magenta-text" },
  info: { icon: "💬", border: "border-navy", title: "text-navy" },
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
          return (
            <div
              key={t.id}
              className={`relative bg-white border-2 ${s.border} rounded-pill-md shadow-soft px-4 py-3 flex items-center gap-2.5 animate-[toast-in_0.25s_ease-out]`}
              role="status"
            >
              <span className="text-lg">{s.icon}</span>
              <span className={`text-sm font-bold ${s.title}`}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="mr-auto text-ink/50 hover:text-ink text-xs font-black"
                aria-label="بستن"
              >
                ✕
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
