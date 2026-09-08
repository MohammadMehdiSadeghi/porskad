// ─── دکمه‌ی استیکری رکاد ───
import clsx from "./clsx";

const VARIANTS = {
  teal: {
    layer: "bg-teal-text",
    btn: "bg-teal border-teal-text text-white hover:bg-teal-text",
  },
  navy: {
    layer: "bg-[#0B0F1F]",
    btn: "bg-navy border-navy text-white hover:bg-navy-hover",
  },
  indigo: {
    layer: "bg-teal",
    btn: "bg-navy border-navy text-white hover:bg-navy-hover",
  },
  magenta: {
    layer: "bg-magenta-text",
    btn: "bg-magenta border-magenta-text text-white hover:bg-magenta-text",
  },
  red: {
    layer: "bg-magenta-text",
    btn: "bg-magenta border-magenta-text text-white hover:bg-magenta-text",
  },
  emerald: {
    layer: "bg-teal-text",
    btn: "bg-teal border-teal-text text-white hover:bg-teal-text",
  },
  orange: {
    layer: "bg-[#C57A07]",
    btn: "bg-orange border-orange text-white hover:bg-orange-alt",
  },
  white: {
    layer: "bg-ink dark:bg-black",
    btn: "bg-white border-ink text-ink hover:bg-bg-neutral dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700",
  },
  neutral: {
    layer: "bg-ink/20 dark:bg-black/50",
    btn: "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700",
  },
  danger: {
    layer: "bg-rose-900",
    btn: "bg-rose-600 border-rose-700 text-white hover:bg-rose-700 dark:bg-rose-600 dark:border-rose-700 dark:hover:bg-rose-700",
  },
  outline: {
    layer: "hidden",
    btn: "bg-transparent border-ink/20 text-navy hover:bg-ink/5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-white/5",
  },
  secondary: {
    layer: "bg-navy dark:bg-black",
    btn: "bg-slate-100 border-navy text-navy hover:bg-navy hover:text-white dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700",
  },
  ghost: {
    layer: "hidden",
    btn: "bg-transparent border-transparent text-navy hover:bg-bg-neutral dark:text-slate-200 dark:hover:bg-white/10",
  },
  glass: {
    layer: "hidden",
    btn: "bg-navy/5 backdrop-blur-sm border-ink/10 text-navy hover:bg-navy/10 dark:bg-white/10 dark:border-white/15 dark:text-slate-100 dark:hover:bg-white/15",
  },
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base gap-2",
  lg: "px-5 sm:px-7 py-2.5 sm:py-3.5 text-base sm:text-lg gap-2.5",
};

export default function Button({
  variant = "teal",
  size = "md",
  rotate = "",
  as: Tag = "button",
  className = "",
  layerClassName = "",
  children,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.teal;
  const isFull = className.includes("w-full");
  return (
    <div className={clsx("relative", isFull ? "flex w-full" : "inline-flex w-fit", rotate)}>
      <div
        aria-hidden="true"
        className={clsx(
          "absolute top-[0.125rem] left-[0.125rem] w-full h-full rounded-pill-md [corner-shape:squircle]",
          layerClassName || v.layer,
        )}
      />
      <Tag
        className={clsx(
          "relative z-10 inline-flex items-center justify-center text-center",
          isFull ? "w-full" : "",
          "rounded-pill-md [corner-shape:squircle] border-2",
          "font-extrabold select-none cursor-pointer",
          "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
          v.btn,
          SIZES[size],
          className,
        )}
        {...rest}
      >
        {children}
      </Tag>
    </div>
  );
}
