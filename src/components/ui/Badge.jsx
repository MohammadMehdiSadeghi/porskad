import clsx from "./clsx";

const COLORS = {
  teal: "border-teal-text text-teal-text bg-ecosystem-light dark:border-teal/40 dark:text-teal dark:bg-teal/10",
  navy: "border-navy text-navy bg-male-light dark:border-blue-500/40 dark:text-blue-300 dark:bg-blue-950/60",
  indigo: "border-navy text-navy bg-male-light dark:border-blue-500/40 dark:text-blue-300 dark:bg-blue-950/60",
  magenta: "border-magenta-text text-magenta-text bg-female-light dark:border-pink-500/40 dark:text-pink-300 dark:bg-pink-950/60",
  orange: "border-orange text-orange bg-college-light dark:border-amber-500/40 dark:text-amber-300 dark:bg-amber-950/60",
  amber: "border-orange text-orange bg-college-light dark:border-amber-500/40 dark:text-amber-300 dark:bg-amber-950/60",
  gray: "border-ink-light text-ink-subtle bg-bg-neutral dark:border-slate-700 dark:text-slate-300 dark:bg-slate-800/80",
  green: "border-accent-green text-accent-green bg-ecosystem-light dark:border-emerald-500/40 dark:text-emerald-300 dark:bg-emerald-950/60",
  red: "border-accent-red text-accent-red bg-female-light dark:border-rose-500/40 dark:text-rose-300 dark:bg-rose-950/60",
  ecosystem: "border-ecosystem-normal text-ecosystem-dark bg-ecosystem-light dark:border-teal/40 dark:text-teal dark:bg-teal/10",
  male: "border-male-normal text-male-normal bg-male-light dark:border-blue-500/40 dark:text-blue-300 dark:bg-blue-950/60",
  female: "border-female-normal text-female-dark bg-female-light dark:border-pink-500/40 dark:text-pink-300 dark:bg-pink-950/60",
  college: "border-college-normal text-college-dark bg-college-light dark:border-amber-500/40 dark:text-amber-300 dark:bg-amber-950/60",
  club: "border-club-normal text-club-dark bg-club-light dark:border-purple/40 dark:text-purple dark:bg-purple/60",
  purple: "border-purple text-purple bg-purple dark:border-purple/40 dark:text-purple dark:bg-purple/60",
};

export default function Badge({ color = "teal", rotate = "", className = "", children }) {
  return (
    <span
      className={clsx(
        "inline-block bg-white dark:bg-slate-900 border rounded-xl [corner-shape:squircle]",
        "px-2.5 py-0.5 text-[0.8125rem] font-bold whitespace-nowrap shadow-sm",
        COLORS[color] ?? COLORS.teal,
        rotate,
        className,
      )}
    >
      {children}
    </span>
  );
}
