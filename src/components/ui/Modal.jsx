import { useEffect } from "react";
import StickerCard from "./StickerCard";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full" onClick={(e) => e.stopPropagation()}>
        <StickerCard
          theme="white"
          rotate="-rotate-[0.5deg]"
          className={wide ? "max-w-3xl mx-auto" : "max-w-xl mx-auto"}
        >
          <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-7">
            {title && (
              <div className="flex items-center justify-between gap-4 mb-5">
                <h3 className="text-xl font-black text-navy">{title}</h3>
                <button
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-pill-md border-2 border-ink bg-white text-ink font-black hover:bg-bg-neutral transition-colors"
                  aria-label="بستن"
                >
                  ✕
                </button>
              </div>
            )}
            {children}
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
