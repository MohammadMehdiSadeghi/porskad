// ══════════════════════════════════════════════════════════════
// ScoreResult — نمایش نتیجه آزمون — طراحی رکاد
// ══════════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { faNum } from "../../lib/utils";

export default function ScoreResult({ score, total, details, questions }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  let color = "ecosystem";
  let emoji = "🎉";
  let message = "عالیه! نمره عالی گرفتی!";
  if (pct < 50) {
    color = "female";
    emoji = "😢";
    message = "نمره پایینه؛ دوباره تلاش کن!";
  } else if (pct < 75) {
    color = "college";
    emoji = "💪";
    message = "خوبه ولی جای بهبود داره!";
  }

  const colorMap = {
    ecosystem: {
      bg: "bg-ecosystem-light",
      border: "border-ecosystem-normal",
      text: "text-ecosystem-dark",
      bar: "bg-ecosystem-normal",
      backBg: "bg-ecosystem-dark",
    },
    college: {
      bg: "bg-college-light",
      border: "border-college-normal",
      text: "text-college-dark",
      bar: "bg-college-normal",
      backBg: "bg-college-dark",
    },
    female: {
      bg: "bg-female-light",
      border: "border-female-normal",
      text: "text-female-dark",
      bar: "bg-female-normal",
      backBg: "bg-female-dark",
    },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center gap-5 py-6 w-full"
    >
      {/* نمره اصلی — کارت استیکری */}
      <div className="relative">
        <div
          aria-hidden="true"
          className={`absolute top-[0.1875rem] left-[0.1875rem] w-full h-full ${c.backBg} rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]`}
        />
        <div
          className={`relative z-10 ${c.bg} ${c.border} border-[0.1875rem] rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] px-6 sm:px-8 py-5 sm:py-6 min-w-[200px] flex flex-col items-center gap-2`}
        >
          <motion.span
            className="text-4xl sm:text-5xl"
            initial={{ rotate: -10 }}
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {emoji}
          </motion.span>
          <span
            className={`text-3xl sm:text-4xl font-black ${c.text}`}
          >
            {faNum(score)} از {faNum(total)}
          </span>
          <span className="text-xs sm:text-sm font-bold text-ink-subtle">
            {faNum(pct)}٪
          </span>
        </div>
      </div>

      {/* پیام */}
      <p className="text-sm sm:text-base font-bold text-male-normal text-center">
        {message}
      </p>

      {/* نوار پیشرفت */}
      <div className="w-full max-w-xs h-2.5 sm:h-3 bg-ink/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          className={`h-full ${c.bar} rounded-full`}
        />
      </div>

      {/* جزئیات سوالات */}
      {details.length > 0 && (
        <div className="w-full max-w-md flex flex-col gap-2 mt-2">
          <span className="text-xs font-extrabold text-male-normal">
            جزئیات پاسخ‌ها:
          </span>
          {details.map((d, i) => {
            const q = questions.find((q) => q.id === d.questionId);
            return (
              <div
                key={i}
                className={`flex items-center gap-3 text-xs sm:text-sm px-3 py-2 rounded-pill-md border ${
                  d.correct
                    ? "border-ecosystem-normal/40 bg-ecosystem-light/60"
                    : "border-female-normal/40 bg-female-light/60"
                }`}
              >
                <span
                  className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-full text-[0.6rem] sm:text-xs font-black ${
                    d.correct
                      ? "bg-ecosystem-normal text-white"
                      : "bg-female-normal text-white"
                  }`}
                >
                  {d.correct ? "✓" : "✕"}
                </span>
                <span className="font-semibold text-ink flex-1 truncate">
                  {q?.title || `سوال ${faNum(i + 1)}`}
                </span>
                <span
                  className={`font-bold text-xs ${
                    d.correct ? "text-ecosystem-dark" : "text-female-normal"
                  }`}
                >
                  {d.correct ? `+${faNum(d.points)}` : `۰ از ${faNum(d.points)}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
