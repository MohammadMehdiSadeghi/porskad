// ══════════════════════════════════════════════════════════════
// ScoreResult — نمایش نتیجه آزمون بعد از ارسال
// ══════════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { faNum } from "../../lib/utils";

export default function ScoreResult({ score, total, details, questions }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  // رنگ بر اساس درصد
  let color = "teal";
  let emoji = "🎉";
  let message = "عالیه! نمره عالی گرفتی!";
  if (pct < 50) {
    color = "magenta";
    emoji = "😢";
    message = "نمره پایینه؛ دوباره تلاش کن!";
  } else if (pct < 75) {
    color = "orange";
    emoji = "💪";
    message = "خوبه ولی جای بهبود داره!";
  }

  const colorMap = {
    teal: { bg: "bg-teal/10", border: "border-teal", text: "text-teal-text", bar: "bg-teal" },
    orange: { bg: "bg-orange/10", border: "border-orange", text: "text-orange", bar: "bg-orange" },
    magenta: { bg: "bg-magenta/10", border: "border-magenta", text: "text-magenta-text", bar: "bg-magenta" },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center gap-5 py-6"
    >
      {/* نمره اصلی */}
      <div className={`flex flex-col items-center gap-2 ${c.bg} ${c.border} border-2 rounded-[2rem] px-8 py-6 min-w-[200px]`}>
        <motion.span
          className="text-5xl"
          initial={{ rotate: -10 }}
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          {emoji}
        </motion.span>
        <span className={`text-4xl font-black ${c.text}`}>
          {faNum(score)} از {faNum(total)}
        </span>
        <span className="text-sm font-bold text-ink-subtle">
          {faNum(pct)}٪
        </span>
      </div>

      {/* پیام */}
      <p className="text-base font-bold text-navy text-center">{message}</p>

      {/* نوار پیشرفت */}
      <div className="w-full max-w-xs h-3 bg-ink/10 rounded-full overflow-hidden">
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
          <span className="text-xs font-extrabold text-navy">جزئیات پاسخ‌ها:</span>
          {details.map((d, i) => {
            const q = questions.find((q) => q.id === d.questionId);
            return (
              <div
                key={i}
                className={`flex items-center gap-3 text-sm px-3 py-2 rounded-pill-md border ${
                  d.correct
                    ? "border-teal/40 bg-teal/5"
                    : "border-magenta/40 bg-magenta/5"
                }`}
              >
                <span className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-xs font-black ${
                  d.correct ? "bg-teal text-white" : "bg-magenta text-white"
                }`}>
                  {d.correct ? "✓" : "✕"}
                </span>
                <span className="font-semibold text-ink flex-1 truncate">
                  {q?.title || `سوال ${faNum(i + 1)}`}
                </span>
                <span className={`font-bold text-xs ${d.correct ? "text-teal-text" : "text-magenta-text"}`}>
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
