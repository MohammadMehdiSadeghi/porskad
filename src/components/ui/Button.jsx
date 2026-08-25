// ─── دکمه‌ی جدید برای طراحی مدرن ───
import clsx from "./clsx";

const VARIANTS = {
  indigo: {
    btn: "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:border-gray-300",
  },
  red: {
    btn: "bg-red-600 border-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:border-gray-300",
  },
  emerald: {
    btn: "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:border-gray-300",
  },
  white: {
    btn: "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400",
  },
  ghost: {
    btn: "bg-transparent border-transparent text-gray-600 hover:bg-gray-100 disabled:bg-transparent disabled:text-gray-300",
  },
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-base gap-2.5",
};

export default function Button({
  variant = "indigo",
  size = "md",
  as: Tag = "button",
  className = "",
  children,
  ...rest
}) {
  const v = VARIANTS[variant] ?? VARIANTS.indigo;
  return (
    <Tag
      className={clsx(
        "inline-flex items-center justify-center",
        "rounded-lg border-2 font-bold select-none cursor-pointer",
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
  );
}
