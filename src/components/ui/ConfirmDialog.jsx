import { motion, AnimatePresence } from "framer-motion";
import { faNum } from "../../lib/utils";

/**
 * باکس تایید قبل از ارسال فرم — طراحی رکاد
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
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 xs:p-6"
          dir="rtl"
          style={{ isolation: "isolate" }}
        >
          {/* پس‌زمینه تیره */}
          <div
            className="absolute inset-0 bg-male-normal/40 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* باکس اصلی — استیکری رکاد */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="relative max-w-lg w-full"
            style={{ position: "relative", zIndex: 1 }}
          >
            {/* لایه سایه پشتی — تکنیک دولایه آفست رکاد */}
            <div
              aria-hidden="true"
              className="absolute top-[0.1875rem] left-[0.1875rem] w-full h-full bg-male-normal rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]"
            />

            {/* لایه کارت جلویی */}
            <div className="relative z-10 bg-white border-[0.1875rem] border-male-normal rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] p-6 sm:p-8">
              {/* هدر */}
              <div className="text-center mb-5 sm:mb-6">
                <motion.span
                  className="text-4xl sm:text-5xl mb-3 block"
                  initial={{ rotate: -10 }}
                  animate={{ rotate: [0, -6, 6, -3, 3, 0] }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                >
                  {allFilled ? "✅" : "⚠️"}
                </motion.span>
                <h2 className="text-lg sm:text-xl font-black text-male-normal mb-1.5">
                  {allFilled
                    ? "آماده ارسال هستید؟"
                    : "بعضی فیلدها خالی مانده"}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-ink-subtle leading-7">
                  {allFilled
                    ? "اطلاعات شما آماده ارسال است. از صحت آن‌ها مطمئنید؟"
                    : `از ${faNum(totalRequired)} فیلد اجباری، ${faNum(filledCount)} تا پر شده.`}
                </p>
              </div>

              {/* لیست فیلدهای خالی */}
              {unfilledFields.length > 0 && (
                <div className="bg-female-light border-[0.140625rem] border-female-normal/40 rounded-xl p-4 mb-5 sm:mb-6">
                  <span className="text-xs font-extrabold text-female-normal mb-2.5 block">
                    فیلدهای اجباری خالی:
                  </span>
                  <ul className="flex flex-col gap-1.5">
                    {unfilledFields.map((f, i) => (
                      <li
                        key={f.id || i}
                        className="flex items-center gap-2.5 text-sm text-ink"
                      >
                        <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-female-normal/15 text-female-normal text-[0.6rem] font-black">
                          {faNum(i + 1)}
                        </span>
                        <span className="font-semibold">{f.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* دکمه‌ها */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* دکمه بازگشت */}
                <div className="relative flex-1">
                  <div
                    aria-hidden="true"
                    className="absolute top-[0.125rem] left-[0.125rem] w-full h-full bg-ink rounded-pill-md [corner-shape:squircle]"
                  />
                  <button
                    onClick={onCancel}
                    className="relative z-10 w-full bg-white border-2 border-ink text-ink font-extrabold py-3 rounded-pill-md [corner-shape:squircle] hover:bg-bg-neutral transition-colors duration-200 text-sm sm:text-base"
                  >
                    بازگشت و ویرایش
                  </button>
                </div>

                {/* دکمه ارسال */}
                <div className="relative flex-1">
                  <div
                    aria-hidden="true"
                    className="absolute top-[0.125rem] left-[0.125rem] w-full h-full bg-ecosystem-dark rounded-pill-md [corner-shape:squircle]"
                  />
                  <button
                    onClick={onConfirm}
                    className="relative z-10 w-full bg-ecosystem-normal border-2 border-ecosystem-dark text-white font-extrabold py-3 rounded-pill-md [corner-shape:squircle] hover:bg-ecosystem-dark transition-colors duration-200 text-sm sm:text-base"
                  >
                    {allFilled ? "ارسال کن ✨" : "ارسال با فیلدهای خالی"}
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
