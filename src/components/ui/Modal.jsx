import { useEffect } from "react";
import clsx from "./clsx";

export default function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={clsx(
          "w-full bg-white rounded-[1.5rem] [corner-shape:squircle] border-2 border-ink/10 shadow-xl",
          wide ? "max-w-3xl" : "max-w-xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
          {title && (
            <h3 className="text-lg font-black text-navy">{title}</h3>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[0.5rem] [corner-shape:squircle] text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors"
            aria-label="بستن"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
