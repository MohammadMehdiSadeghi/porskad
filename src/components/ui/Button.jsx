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
    layer: "bg-ink",
    btn: "bg-white border-ink text-ink hover:bg-bg-neutral",
  },
  ghost: {
    layer: "hidden",
    btn: "bg-transparent border-transparent text-navy hover:bg-bg-neutral",
  },
  glass: {
    layer: "hidden",
    btn: "bg-navy/5 backdrop-blur-sm border-ink/10 text-navy hover:bg-navy/10",
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
  return (
    <div className={clsx("relative inline-flex w-fit", rotate)}>
      <div
        aria-hidden="true"
        className={clsx(
          "absolute top-[0.125rem] left-[0.125rem] w-full h-full rounded-pill-md [corner-shape:squircle]",
          layerClassName || v.layer,
        )}
      />
      <Tag
        className={clsx(
          "relative z-10 inline-flex items-center justify-center w-full",
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
