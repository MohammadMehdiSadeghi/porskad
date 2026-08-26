// ─── نشان — همون پیل لِیبل کارت‌های استیکری رکاد (بوردر رنگی روی سفید) ───
import clsx from "./clsx";

const COLORS = {
  navy: "bg-white text-navy-alt border-navy-alt",
  indigo: "bg-white text-navy-alt border-navy-alt",
  teal: "bg-white text-teal-text border-teal-text",
  emerald: "bg-white text-teal-text border-teal-text",
  orange: "bg-white text-orange border-orange",
  amber: "bg-white text-orange border-orange",
  red: "bg-white text-magenta-text border-magenta-text",
  gray: "bg-white text-ink/50 border-ink/20",
};

export default function Badge({ color = "navy", className = "", children }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold border-[0.09375rem] rounded-[0.5rem] [corner-shape:squircle]",
        COLORS[color] ?? COLORS.navy,
        className,
      )}
    >
      {children}
    </span>
  );
}
