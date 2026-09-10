import { useEffect, useRef } from "react";
import StickerCard from "./StickerCard";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, wide = false, closable = true }) {
  // برای تشخیص «کلیک واقعی روی پس‌زمینه»: موس‌داون و موس‌آپ هر دو باید روی خود بک‌دراپ شروع/تمام شده باشند
  const downOnBackdropRef = useRef(false);

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

  const handleMouseDown = (e) => {
    downOnBackdropRef.current = e.target === e.currentTarget;
  };

  const handleMouseUp = (e) => {
    const upOnBackdrop = e.target === e.currentTarget;
    if (closable && downOnBackdropRef.current && upOnBackdrop) {
      downOnBackdropRef.current = false;
      onClose?.();
    } else {
      downOnBackdropRef.current = false;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 dark:bg-black/80 backdrop-blur-[2px]"
      onMouseDown={closable ? handleMouseDown : undefined}
      onMouseUp={closable ? handleMouseUp : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} mx-auto`}>
        <StickerCard
          theme="white"
          rotate="-rotate-[0.5deg]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
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
