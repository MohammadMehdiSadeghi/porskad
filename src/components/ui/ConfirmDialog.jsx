import { motion, AnimatePresence } from "framer-motion";
import { faNum } from "../../lib/utils";
import { CheckCircle2, AlertTriangle, Send } from "lucide-react";

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  unfilledFields = [],
  totalRequired = 0,
  filledCount = 0,
}) {
  const allFilled = unfilledFields.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
          dir="rtl"
          style={{ isolation: "isolate" }}
        >
          <div className="absolute inset-0 bg-male-normal/40 dark:bg-black/60 backdrop-blur-sm" onClick={onCancel} />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative max-w-md w-full"
            style={{ zIndex: 1 }}
          >
            <div aria-hidden="true" className="absolute top-2 left-2 w-full h-full bg-male-normal dark:bg-black rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]" />

            <div className="relative z-10 bg-white dark:bg-[#111827] border-2 border-male-normal dark:border-slate-700 rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] p-4 sm:p-6">
              <div className="text-center mb-3 sm:mb-4 flex flex-col items-center">
                <motion.div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
                  initial={{ rotate: -8 }}
                  animate={{ rotate: [0, -5, 5, -2, 2, 0] }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  {allFilled ? (
                    <div className="w-12 h-12 rounded-xl bg-teal/15 dark:bg-teal/20 text-teal flex items-center justify-center">
                      <CheckCircle2 size={32} />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-female-light dark:bg-pink-950/40 text-female-normal flex items-center justify-center">
                      <AlertTriangle size={32} />
                    </div>
                  )}
                </motion.div>
                <h2 className="text-sm sm:text-base font-black text-male-normal dark:text-white mb-0.5">
                  {allFilled ? "آماده ارسال هستید؟" : "بعضی فیلدها خالی مانده"}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 leading-6">
                  {allFilled
                    ? "اطلاعات شما آماده ارسال است. از صحت آن‌ها مطمئنید؟"
                    : `از ${faNum(totalRequired)} فیلد اجباری، ${faNum(filledCount)} تا پر شده.`}
                </p>
              </div>

              {unfilledFields.length > 0 && (
                <div className="bg-female-light dark:bg-pink-950/40 border border-female-normal/40 dark:border-pink-800 rounded-lg p-3 mb-3 sm:mb-4">
                  <span className="text-xs sm:text-sm font-extrabold text-female-normal dark:text-pink-300 mb-1.5 block">
                    فیلدهای اجباری خالی:
                  </span>
                  <ul className="flex flex-col gap-1">
                    {unfilledFields.map((f, i) => (
                      <li key={f.id || i} className="flex items-center gap-1.5 text-xs sm:text-sm text-ink dark:text-slate-200">
                        <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-female-normal/15 text-female-normal text-xs font-black">
                          {faNum(i + 1)}
                        </span>
                        <span className="font-semibold">{f.title || f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div aria-hidden="true" className="absolute top-[3px] left-[3px] w-full h-full bg-ink dark:bg-black rounded-pill-md [corner-shape:squircle]" />
                  <button onClick={onCancel} className="relative z-10 w-full bg-white dark:bg-slate-800 border-2 border-ink dark:border-slate-600 text-ink dark:text-slate-200 font-extrabold py-2.5 sm:py-3 rounded-pill-md [corner-shape:squircle] hover:bg-bg-neutral dark:hover:bg-slate-700 transition-colors duration-200 text-sm sm:text-base cursor-pointer">
                    بازگشت و ویرایش
                  </button>
                </div>
                <div className="relative flex-1">
                  <div aria-hidden="true" className="absolute top-[3px] left-[3px] w-full h-full bg-ecosystem-dark rounded-pill-md [corner-shape:squircle]" />
                  <button onClick={onConfirm} className="relative z-10 w-full bg-ecosystem-normal border-2 border-ecosystem-dark text-white font-extrabold py-2.5 sm:py-3 rounded-pill-md [corner-shape:squircle] hover:bg-ecosystem-dark transition-colors duration-200 text-sm sm:text-base cursor-pointer">
                    {allFilled ? "ارسال نهایی" : "ارسال با فیلدهای خالی"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
