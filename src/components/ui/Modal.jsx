import { useEffect } from "react";
import StickerCard from "./StickerCard";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, wide = false, closable = true }) {
  useEffect(() => {
    if (!open || !closable) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, closable]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 dark:bg-black/80 backdrop-blur-[2px]"
      onClick={closable ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full" onClick={(e) => e.stopPropagation()}>
        <StickerCard
          theme="white"
          rotate="-rotate-[0.5deg]"
          className={wide ? "max-w-3xl mx-auto" : "max-w-xl mx-auto"}
        >
          <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-5">
            {title && (
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg sm:text-xl font-black text-navy dark:text-white">{title}</h3>
                {closable && onClose && (
                  <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-pill-md border-2 border-ink dark:border-slate-600 bg-white dark:bg-slate-800 text-ink dark:text-white font-black hover:bg-bg-neutral dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    aria-label="بستن"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            {children}
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
