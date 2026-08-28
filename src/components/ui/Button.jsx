// ─── دکمه‌ی استیکری رکاد ───
import clsx from "./clsx";

const VARIANTS = {
  teal: {
    layer: "bg-teal-text",
    btn: "bg-teal border-teal-text text-white hover:bg-teal-text",
  },
  navy: {
    layer: "bg-navy",
    btn: "bg-navy border-navy text-white hover:bg-navy-hover",
  },
  indigo: {
    layer: "bg-navy",
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
    layer: "bg-orange",
    btn: "bg-orange border-orange text-white hover:bg-orange-alt",
  },
  white: {
    layer: "bg-ink",
    btn: "bg-white border-ink text-ink hover:bg-bg-neutral",
  },
  ghost: {
    layer: "hidden",
    btn: "bg-transparent border-transparent text-navy hover:bg-bg-neutral",
  },
};

const SIZES = {
  sm: "px-2.5 py-1.5 text-xs gap-1",
  md: "px-4 py-2 text-sm gap-1.5",
  lg: "px-5 py-2.5 text-sm gap-2",
};

export default function Button({
  variant = "teal",
  size = "md",
  rotate = "",
  as: Tag = "button",
  className = "",
  children,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.teal;
  return (
    <div className={clsx("relative inline-flex", rotate)}>
      <div
        aria-hidden="true"
        className={clsx(
          "absolute top-[0.125rem] left-[0.125rem] w-full h-full rounded-pill-md [corner-shape:squircle]",
          v.layer,
        )}
      />
      <Tag
        className={clsx(
          "relative z-10 inline-flex items-center justify-center",
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
