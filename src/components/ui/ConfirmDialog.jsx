import { motion, AnimatePresence } from "framer-motion";
import { faNum } from "../../lib/utils";

/**
 * باکس تایید قبل از ارسال فرم
 */
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
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          dir="rtl"
          style={{ isolation: "isolate" }}
        >
          {/* پس‌زمینه تیره */}
          <div
            className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* باکس اصلی */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative bg-white border-2 border-navy rounded-[2rem] p-6 sm:p-8 max-w-lg w-full shadow-[6px_6px_0_0_rgba(33,41,90,0.15)]"
            style={{ position: "relative", zIndex: 1 }}
          >
            {/* هدر */}
            <div className="text-center mb-5">
              <span className="text-4xl mb-2 block">
                {allFilled ? "✅" : "⚠️"}
              </span>
              <h2 className="text-xl font-black text-navy mb-1">
                {allFilled
                  ? "آماده ارسال هستید؟"
                  : "بعضی فیلدها خالی مانده"}
              </h2>
              <p className="text-sm text-ink-subtle">
                {allFilled
                  ? "اطلاعات شما آماده ارسال است. از صحت آن‌ها مطمئنید؟"
                  : `از ${faNum(totalRequired)} فیلد اجباری، ${faNum(filledCount)} تا پر شده.`}
              </p>
            </div>

            {/* لیست فیلدهای خالی */}
            {unfilledFields.length > 0 && (
              <div className="bg-magenta/5 border-2 border-magenta/30 rounded-xl p-4 mb-5">
                <span className="text-xs font-extrabold text-magenta-text mb-2 block">
                  فیلدهای اجباری خالی:
                </span>
                <ul className="flex flex-col gap-1.5">
                  {unfilledFields.map((f, i) => (
                    <li key={f.id || i} className="flex items-center gap-2 text-sm text-ink">
                      <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-magenta/15 text-magenta-text text-[0.6rem] font-black">
                        {faNum(i + 1)}
                      </span>
                      <span className="font-semibold">{f.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* دکمه‌ها */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 bg-white border-2 border-ink/20 text-ink font-extrabold py-3 rounded-pill-md hover:bg-bg-neutral transition-colors"
              >
                بازگشت و ویرایش
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 bg-teal text-white font-extrabold py-3 rounded-pill-md hover:bg-teal-text transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]"
              >
                {allFilled ? "ارسال کن ✨" : "ارسال با فیلدهای خالی"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
