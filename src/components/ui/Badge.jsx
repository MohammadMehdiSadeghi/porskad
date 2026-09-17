import clsx from "./clsx";

const COLORS = {
  teal: "bg-ecosystem-light dark:bg-ecosystem-darker/50 text-ecosystem-darker dark:text-ecosystem-light border-primary/30",
  ecosystem: "bg-ecosystem-light dark:bg-ecosystem-darker/50 text-ecosystem-darker dark:text-ecosystem-light border-primary/30",
  navy: "bg-male-light dark:bg-male-darker/60 text-sec dark:text-male-light border-sec/30",
  male: "bg-male-light dark:bg-male-darker/60 text-sec dark:text-male-light border-sec/30",
  indigo: "bg-male-light dark:bg-male-darker/60 text-sec dark:text-male-light border-sec/30",
  magenta: "bg-female-light dark:bg-female-darker/50 text-girl dark:text-female-light border-girl/30",
  female: "bg-female-light dark:bg-female-darker/50 text-girl dark:text-female-light border-girl/30",
  orange: "bg-college-light dark:bg-college-darker/50 text-college-darker dark:text-college-light border-third/30",
  college: "bg-college-light dark:bg-college-darker/50 text-college-darker dark:text-college-light border-third/30",
  amber: "bg-college-light dark:bg-college-darker/50 text-college-darker dark:text-college-light border-third/30",
  purple: "bg-club-light dark:bg-club-darker/50 text-club-darker dark:text-club-light border-club/30",
  club: "bg-club-light dark:bg-club-darker/50 text-club-darker dark:text-club-light border-club/30",
  gray: "bg-gray-100 dark:bg-slate-800 text-ink-normal/80 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  neutral: "bg-gray-100 dark:bg-slate-800 text-ink-normal/80 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  green: "bg-emerald-50 dark:bg-emerald-950/40 text-accent-green dark:text-emerald-300 border-accent-green/30",
  red: "bg-rose-50 dark:bg-rose-950/40 text-accent-red dark:text-rose-300 border-accent-red/30",
};

export default function Badge({ color = "teal", rotate = "", className = "", rounded = "rounded-md", children }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2.5 py-0.5 font-bold text-xs border whitespace-nowrap transition-colors",
        rounded,
        COLORS[color] ?? COLORS.teal,
        className,
      )}
    >
      {children}
    </span>
  );
}

