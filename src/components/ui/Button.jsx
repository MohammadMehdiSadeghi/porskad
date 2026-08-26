// ─── دکمه — زبان بصری رکاد: پیل چهارگوش‌ِ برش‌خورده + سایه‌ی دولایه‌ی افست ───
import clsx from "./clsx";

const SHADOW = {
  navy: "bg-navy-alt",
  teal: "bg-teal-text",
  magenta: "bg-magenta-text",
  orange: "bg-orange-alt",
  white: "bg-ink/20",
};

const VARIANTS = {
  navy: { btn: "bg-navy text-white border-navy hover:brightness-110", shadow: SHADOW.navy },
  teal: { btn: "bg-teal text-white border-teal hover:bg-teal-text", shadow: SHADOW.teal },
  red: { btn: "bg-magenta text-white border-magenta hover:bg-magenta-text", shadow: SHADOW.magenta },
  emerald: { btn: "bg-teal text-white border-teal hover:bg-teal-text", shadow: SHADOW.teal },
  indigo: { btn: "bg-navy text-white border-navy hover:brightness-110", shadow: SHADOW.navy },
  white: { btn: "bg-white text-navy border-navy/15 hover:border-navy/40", shadow: SHADOW.white },
  ghost: { btn: "bg-transparent border-transparent text-ink/60 hover:bg-ink/5 hover:text-ink shadow-none", shadow: null },
};

const SIZES = {
  sm: "px-3.5 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3.5 text-base2 gap-2.5",
};

export default function Button({
  variant = "navy",
  size = "md",
  as: Tag = "button",
  className = "",
  children,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.navy;

  if (variant === "ghost") {
    return (
      <Tag
        className={clsx(
          "inline-flex items-center justify-center",
          "rounded-[0.625rem] font-bold select-none cursor-pointer",
          "transition-all duration-150",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          v.btn,
          SIZES[size],
          className,
        )}
        {...rest}
      >
        {children}
      </Tag>
    );
  }

  return (
    <span className="relative inline-flex group align-middle">
      <span
        aria-hidden="true"
        className={clsx(
          "absolute top-[0.125rem] left-[0.125rem] w-full h-full",
          "rounded-[0.625rem] [corner-shape:squircle]",
          v.shadow,
        )}
      />
      <Tag
        className={clsx(
          "relative inline-flex items-center justify-center",
          "rounded-[0.625rem] [corner-shape:squircle] border-2 font-extrabold select-none cursor-pointer",
          "transition-all duration-150",
          "hover:-translate-y-0.5 active:translate-y-0",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
          v.btn,
          SIZES[size],
          className,
        )}
        {...rest}
      >
        {children}
      </Tag>
    </span>
  );
}
