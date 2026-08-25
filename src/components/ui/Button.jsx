// ─── دکمه‌ی استیکری رکاد ───
// الگوی دکمه در رکاد: لایه‌ی سایه‌ی توپر با آفست کوچک + چرخش
// خفیف که با hover صاف (rotate-0) و کمی بالا می‌رود.
import clsx from "./clsx";

const VARIANTS = {
  teal: {
    layer: "bg-teal-text",
    btn: "bg-teal border-teal-text text-white hover:bg-teal-text",
  },
  navy: {
    layer: "bg-navy",
    btn: "bg-navy border-navy text-white hover:bg-[#15244a]",
  },
  magenta: {
    layer: "bg-magenta-text",
    btn: "bg-magenta border-magenta-text text-white hover:bg-magenta-text",
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
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-5 py-2.5 text-base gap-2",
  lg: "px-7 py-3.5 text-lg gap-2.5",
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
      {/* لایه‌ی سایه */}
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
