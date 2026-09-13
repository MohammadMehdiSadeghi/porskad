// ─── دکمه‌ی استیکری پرس‌کاد (بر اساس سیستم طراحی و سایه‌های هارد رکاد) ───
import clsx from "./clsx";

const VARIANTS = {
  teal: clsx(
    "bg-teal text-white border-teal-text hover:bg-teal-hover",
    "shadow-[2.75px_2.75px_0_#2e7068] hover:shadow-[3.75px_3.75px_0_#2e7068]",
    "dark:bg-teal dark:text-[#0B0F19] dark:border-teal dark:hover:bg-teal-light",
    "dark:shadow-[2.75px_2.75px_0_#1f413d] dark:hover:shadow-[3.75px_3.75px_0_#1f413d]"
  ),
  navy: clsx(
    "bg-navy text-white border-[#15244a] hover:bg-navy-hover",
    "shadow-[2.75px_2.75px_0_#0b0f1f] hover:shadow-[3.75px_3.75px_0_#0b0f1f]",
    "dark:bg-[#1E293B] dark:text-slate-100 dark:border-slate-500 dark:hover:bg-slate-700",
    "dark:shadow-[2.75px_2.75px_0_#000000] dark:hover:shadow-[3.75px_3.75px_0_#000000]"
  ),
  indigo: clsx(
    "bg-navy text-white border-navy hover:bg-navy-hover",
    "shadow-[2.75px_2.75px_0_#0b0f1f] hover:shadow-[3.75px_3.75px_0_#0b0f1f]",
    "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700",
    "dark:shadow-[2.75px_2.75px_0_#000000] dark:hover:shadow-[3.75px_3.75px_0_#000000]"
  ),
  magenta: clsx(
    "bg-magenta text-white border-magenta-text hover:bg-magenta-text",
    "shadow-[2.75px_2.75px_0_#ce1754] hover:shadow-[3.75px_3.75px_0_#ce1754]",
    "dark:bg-magenta dark:text-white dark:border-pink-400 dark:hover:bg-pink-600",
    "dark:shadow-[2.75px_2.75px_0_#4e0920] dark:hover:shadow-[3.75px_3.75px_0_#4e0920]"
  ),
  red: clsx(
    "bg-magenta text-white border-magenta-text hover:bg-magenta-text",
    "shadow-[2.75px_2.75px_0_#ce1754] hover:shadow-[3.75px_3.75px_0_#ce1754]",
    "dark:bg-magenta dark:text-white dark:border-pink-400 dark:hover:bg-pink-600",
    "dark:shadow-[2.75px_2.75px_0_#4e0920] dark:hover:shadow-[3.75px_3.75px_0_#4e0920]"
  ),
  emerald: clsx(
    "bg-teal text-white border-teal-text hover:bg-teal-hover",
    "shadow-[2.75px_2.75px_0_#2e7068] hover:shadow-[3.75px_3.75px_0_#2e7068]",
    "dark:bg-teal dark:text-[#0B0F19] dark:border-teal dark:hover:bg-teal-light",
    "dark:shadow-[2.75px_2.75px_0_#1f413d] dark:hover:shadow-[3.75px_3.75px_0_#1f413d]"
  ),
  orange: clsx(
    "bg-orange text-white border-[#C57A07] hover:bg-orange-alt",
    "shadow-[2.75px_2.75px_0_#C57A07] hover:shadow-[3.75px_3.75px_0_#C57A07]",
    "dark:bg-orange dark:text-[#0B0F19] dark:border-amber-400 dark:hover:bg-amber-400",
    "dark:shadow-[2.75px_2.75px_0_#57390a] dark:hover:shadow-[3.75px_3.75px_0_#57390a]"
  ),
  white: clsx(
    "bg-white text-ink border-ink hover:bg-bg-neutral",
    "shadow-[2.75px_2.75px_0_#292827] hover:shadow-[3.75px_3.75px_0_#292827]",
    "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700",
    "dark:shadow-[2.75px_2.75px_0_#000000] dark:hover:shadow-[3.75px_3.75px_0_#000000]"
  ),
  neutral: clsx(
    "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200",
    "shadow-[2px_2px_0_#cbd5e1] hover:shadow-[3px_3px_0_#cbd5e1]",
    "dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700",
    "dark:shadow-[2px_2px_0_#000000] dark:hover:shadow-[3px_3px_0_#000000]"
  ),
  danger: clsx(
    "bg-rose-600 text-white border-rose-800 hover:bg-rose-700",
    "shadow-[2.75px_2.75px_0_#4c0519] hover:shadow-[3.75px_3.75px_0_#4c0519]",
    "dark:bg-rose-600 dark:text-white dark:border-rose-400 dark:hover:bg-rose-700",
    "dark:shadow-[2.75px_2.75px_0_#1c0409] dark:hover:shadow-[3.75px_3.75px_0_#1c0409]"
  ),
  outline: clsx(
    "bg-white text-navy border-ink/30 hover:bg-slate-100",
    "shadow-[2px_2px_0_#cbd5e1] hover:shadow-[3px_3px_0_#cbd5e1]",
    "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700",
    "dark:shadow-[2px_2px_0_#000000] dark:hover:shadow-[3px_3px_0_#000000]"
  ),
  secondary: clsx(
    "bg-slate-100 text-navy border-navy hover:bg-navy hover:text-white",
    "shadow-[2.75px_2.75px_0_#202A5A] hover:shadow-[3.75px_3.75px_0_#202A5A]",
    "dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white",
    "dark:shadow-[2.75px_2.75px_0_#000000] dark:hover:shadow-[3.75px_3.75px_0_#000000]"
  ),
  ghost: clsx(
    "bg-slate-100 text-navy border-slate-300 hover:bg-slate-200",
    "shadow-[2px_2px_0_#cbd5e1] hover:shadow-[3px_3px_0_#cbd5e1]",
    "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700",
    "dark:shadow-[2px_2px_0_#000000] dark:hover:shadow-[3px_3px_0_#000000]"
  ),
  glass: clsx(
    "bg-slate-50 text-navy border-slate-300 hover:bg-slate-100",
    "shadow-[2px_2px_0_#cbd5e1] hover:shadow-[3px_3px_0_#cbd5e1]",
    "dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700",
    "dark:shadow-[2px_2px_0_#000000] dark:hover:shadow-[3px_3px_0_#000000]"
  ),
};

const SIZES = {
  sm: "px-3.5 py-1.5 text-xs sm:text-sm gap-1.5",
  md: "px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base gap-2",
  lg: "px-5 sm:px-7 py-2.5 sm:py-3.5 text-base sm:text-lg gap-2.5",
};

export default function Button({
  variant = "teal",
  size = "md",
  rotate = "",
  as: Tag = "button",
  className = "",
  layerClassName = "", // backward compatibility prop (no-op)
  children,
  ...rest
}) {
  const vClass = VARIANTS[variant] ?? VARIANTS.teal;

  return (
    <Tag
      className={clsx(
        "inline-flex items-center justify-center text-center",
        "rounded-pill-md [corner-shape:squircle] border-2",
        "font-extrabold select-none cursor-pointer",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.02]",
        "active:scale-[0.97]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:transform-none disabled:shadow-none",
        vClass,
        SIZES[size],
        rotate,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

