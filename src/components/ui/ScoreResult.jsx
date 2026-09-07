import { motion } from "framer-motion";
import { faNum } from "../../lib/utils";
import { Trophy, Award, AlertCircle, Check, X } from "lucide-react";

export default function ScoreResult({ score, total, details = [], questions = [] }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  let color = "ecosystem";
  let IconComponent = Trophy;
  let message = "عالیه! نمره عالی گرفتی!";
  if (pct < 50) {
    color = "female";
    IconComponent = AlertCircle;
    message = "نمره پایینه؛ دوباره تلاش کن!";
  } else if (pct < 75) {
    color = "college";
    IconComponent = Award;
    message = "خوبه ولی جای بهبود داره!";
  }

  const colorMap = {
    ecosystem: { bg: "bg-ecosystem-light", border: "border-ecosystem-normal", text: "text-ecosystem-dark", bar: "bg-ecosystem-normal", backBg: "bg-ecosystem-dark", iconColor: "text-ecosystem-normal" },
    college: { bg: "bg-college-light", border: "border-college-normal", text: "text-college-dark", bar: "bg-college-normal", backBg: "bg-college-dark", iconColor: "text-college-normal" },
    female: { bg: "bg-female-light", border: "border-female-normal", text: "text-female-dark", bar: "bg-female-normal", backBg: "bg-female-dark", iconColor: "text-female-normal" },
  };
  const c = colorMap[color];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex flex-col items-center gap-3 sm:gap-4 py-4 sm:py-5 w-full">
      <div className="relative">
        <div aria-hidden="true" className={`absolute top-1.5 left-1.5 w-full h-full ${c.backBg} rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]`} />
        <div className={`relative z-10 ${c.bg} ${c.border} border-2 rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] px-5 sm:px-7 py-4 sm:py-5 min-w-[160px] flex flex-col items-center gap-1.5`}>
          <motion.div initial={{ rotate: -8 }} animate={{ rotate: [0, -8, 8, -4, 4, 0] }} transition={{ duration: 0.7, delay: 0.2 }}>
            <IconComponent size={36} className={c.iconColor} />
          </motion.div>
          <span className={`text-2xl sm:text-3xl font-black ${c.text}`}>{faNum(score)} از {faNum(total)}</span>
          <span className="text-xs sm:text-sm font-bold text-ink-subtle">{faNum(pct)}٪</span>
        </div>
      </div>

      <p className="text-sm sm:text-base font-bold text-male-normal text-center">{message}</p>

      <div className="w-full max-w-[200px] h-2 bg-ink/10 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.4 }} className={`h-full ${c.bar} rounded-full`} />
      </div>

      {details.length > 0 && (
        <div className="w-full max-w-sm flex flex-col gap-1.5 mt-1">
          <span className="text-xs sm:text-sm font-extrabold text-male-normal">جزئیات پاسخ‌ها:</span>
          {details.map((d, i) => {
            const q = questions.find((q) => q.id === d.questionId);
            return (
              <div key={i} className={`flex items-center gap-2 text-xs sm:text-sm px-2.5 py-1.5 rounded-pill-md border ${d.correct ? "border-ecosystem-normal/40 bg-ecosystem-light/60" : "border-female-normal/40 bg-female-light/60"}`}>
                <span className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-full text-[0.6rem] sm:text-xs font-black ${d.correct ? "bg-ecosystem-normal text-white" : "bg-female-normal text-white"}`}>
                  {d.correct ? <Check size={12} className="stroke-[3]" /> : <X size={12} className="stroke-[3]" />}
                </span>
                <span className="font-semibold text-ink flex-1 truncate">{q?.title || `سوال ${faNum(i + 1)}`}</span>
                <span className={`font-bold text-xs sm:text-sm ${d.correct ? "text-ecosystem-dark" : "text-female-normal"}`}>
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
