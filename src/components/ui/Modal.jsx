import { useEffect, useRef } from "react";
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={closable ? handleMouseDown : undefined}
      onMouseUp={closable ? handleMouseUp : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} mx-auto rounded-3xl border-2 border-primary/40 shadow-[4px_4px_0_#202A5A] dark:shadow-[4px_4px_0_#59BBAF] bg-white dark:bg-[#151C28] overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
          {title && (
            <div className="flex items-center justify-between gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base sm:text-lg font-black text-sec dark:text-white">{title}</h3>
              {closable && onClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1C2536] text-ink-normal dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-[#242F42] transition-colors cursor-pointer"
                  aria-label="بستن"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

