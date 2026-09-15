// ─── دکمه‌ی استاندارد رُکاد (Modern Refined Neo-brutalism) ───
import clsx from "./clsx";

const VARIANTS = {
  // ۱. تم اکوسیستم (Ecosystem / Primary / Teal)
  teal: clsx(
    "bg-primary text-white border-ecosystem-dark hover:bg-ecosystem-normal-hover",
    "shadow-[2.5px_2.5px_0_#1F413D] hover:shadow-[3px_3px_0_#1F413D] active:shadow-[1px_1px_0_#1F413D]",
    "dark:bg-primary dark:text-white dark:border-ecosystem-dark",
    "dark:shadow-[2.5px_2.5px_0_#1F413D] dark:hover:shadow-[3px_3px_0_#1F413D]"
  ),
  primary: clsx(
    "bg-primary text-white border-ecosystem-dark hover:bg-ecosystem-normal-hover",
    "shadow-[2.5px_2.5px_0_#1F413D] hover:shadow-[3px_3px_0_#1F413D] active:shadow-[1px_1px_0_#1F413D]",
    "dark:bg-primary dark:text-white dark:border-ecosystem-dark",
    "dark:shadow-[2.5px_2.5px_0_#1F413D] dark:hover:shadow-[3px_3px_0_#1F413D]"
  ),
  ecosystem: clsx(
    "bg-primary text-white border-ecosystem-dark hover:bg-ecosystem-normal-hover",
    "shadow-[2.5px_2.5px_0_#1F413D] hover:shadow-[3px_3px_0_#1F413D] active:shadow-[1px_1px_0_#1F413D]",
    "dark:bg-primary dark:text-white dark:border-ecosystem-dark",
    "dark:shadow-[2.5px_2.5px_0_#1F413D] dark:hover:shadow-[3px_3px_0_#1F413D]"
  ),

  // ۲. تم پسر / ثانویه (Male / Sec / Navy)
  sec: clsx(
    "bg-sec text-white border-male-dark hover:bg-male-normal-hover",
    "shadow-[2.5px_2.5px_0_#0B0F1F] hover:shadow-[3px_3px_0_#0B0F1F] active:shadow-[1px_1px_0_#0B0F1F]",
    "dark:bg-[#2B3875] dark:text-white dark:border-[#3F50A0]",
    "dark:shadow-[2.5px_2.5px_0_#59BBAF] dark:hover:shadow-[3px_3px_0_#59BBAF]"
  ),
  navy: clsx(
    "bg-sec text-white border-male-dark hover:bg-male-normal-hover",
    "shadow-[2.5px_2.5px_0_#0B0F1F] hover:shadow-[3px_3px_0_#0B0F1F] active:shadow-[1px_1px_0_#0B0F1F]",
    "dark:bg-[#2B3875] dark:text-white dark:border-[#3F50A0]",
    "dark:shadow-[2.5px_2.5px_0_#59BBAF] dark:hover:shadow-[3px_3px_0_#59BBAF]"
  ),
  male: clsx(
    "bg-sec text-white border-male-dark hover:bg-male-normal-hover",
    "shadow-[2.5px_2.5px_0_#0B0F1F] hover:shadow-[3px_3px_0_#0B0F1F] active:shadow-[1px_1px_0_#0B0F1F]",
    "dark:bg-[#2B3875] dark:text-white dark:border-[#3F50A0]",
    "dark:shadow-[2.5px_2.5px_0_#59BBAF] dark:hover:shadow-[3px_3px_0_#59BBAF]"
  ),

  // ۳. تم دختر / هشدار و خطا (Female / Girl / Magenta)
  girl: clsx(
    "bg-girl text-white border-female-dark hover:bg-female-normal-hover",
    "shadow-[2.5px_2.5px_0_#4E0920] hover:shadow-[3px_3px_0_#4E0920] active:shadow-[1px_1px_0_#4E0920]",
    "dark:bg-girl dark:text-white dark:border-female-dark",
    "dark:shadow-[2.5px_2.5px_0_#4E0920] dark:hover:shadow-[3px_3px_0_#4E0920]"
  ),
  magenta: clsx(
    "bg-girl text-white border-female-dark hover:bg-female-normal-hover",
    "shadow-[2.5px_2.5px_0_#4E0920] hover:shadow-[3px_3px_0_#4E0920] active:shadow-[1px_1px_0_#4E0920]",
    "dark:bg-girl dark:text-white dark:border-female-dark",
    "dark:shadow-[2.5px_2.5px_0_#4E0920] dark:hover:shadow-[3px_3px_0_#4E0920]"
  ),
  female: clsx(
    "bg-girl text-white border-female-dark hover:bg-female-normal-hover",
    "shadow-[2.5px_2.5px_0_#4E0920] hover:shadow-[3px_3px_0_#4E0920] active:shadow-[1px_1px_0_#4E0920]",
    "dark:bg-girl dark:text-white dark:border-female-dark",
    "dark:shadow-[2.5px_2.5px_0_#4E0920] dark:hover:shadow-[3px_3px_0_#4E0920]"
  ),
  danger: clsx(
    "bg-girl text-white border-female-dark hover:bg-female-normal-hover",
    "shadow-[2.5px_2.5px_0_#4E0920] hover:shadow-[3px_3px_0_#4E0920] active:shadow-[1px_1px_0_#4E0920]",
    "dark:bg-girl dark:text-white dark:border-female-dark",
    "dark:shadow-[2.5px_2.5px_0_#4E0920] dark:hover:shadow-[3px_3px_0_#4E0920]"
  ),
  red: clsx(
    "bg-girl text-white border-female-dark hover:bg-female-normal-hover",
    "shadow-[2.5px_2.5px_0_#4E0920] hover:shadow-[3px_3px_0_#4E0920] active:shadow-[1px_1px_0_#4E0920]",
    "dark:bg-girl dark:text-white dark:border-female-dark",
    "dark:shadow-[2.5px_2.5px_0_#4E0920] dark:hover:shadow-[3px_3px_0_#4E0920]"
  ),

  // ۴. تم کالج / پیگیری (College / Third / Orange)
  college: clsx(
    "bg-third text-white border-college-dark hover:bg-college-normal-hover",
    "shadow-[2.5px_2.5px_0_#57390A] hover:shadow-[3px_3px_0_#57390A] active:shadow-[1px_1px_0_#57390A]",
    "dark:bg-third dark:text-white dark:border-college-dark",
    "dark:shadow-[2.5px_2.5px_0_#57390A] dark:hover:shadow-[3px_3px_0_#57390A]"
  ),
  third: clsx(
    "bg-third text-white border-college-dark hover:bg-college-normal-hover",
    "shadow-[2.5px_2.5px_0_#57390A] hover:shadow-[3px_3px_0_#57390A] active:shadow-[1px_1px_0_#57390A]",
    "dark:bg-third dark:text-white dark:border-college-dark",
    "dark:shadow-[2.5px_2.5px_0_#57390A] dark:hover:shadow-[3px_3px_0_#57390A]"
  ),
  orange: clsx(
    "bg-third text-white border-college-dark hover:bg-college-normal-hover",
    "shadow-[2.5px_2.5px_0_#57390A] hover:shadow-[3px_3px_0_#57390A] active:shadow-[1px_1px_0_#57390A]",
    "dark:bg-third dark:text-white dark:border-college-dark",
    "dark:shadow-[2.5px_2.5px_0_#57390A] dark:hover:shadow-[3px_3px_0_#57390A]"
  ),

  // ۵. تم کلوپ / بنفش ویژه (Club / Purple)
  club: clsx(
    "bg-club text-white border-club-dark hover:bg-club-normal-hover",
    "shadow-[2.5px_2.5px_0_#231032] hover:shadow-[3px_3px_0_#231032] active:shadow-[1px_1px_0_#231032]",
    "dark:bg-club dark:text-white dark:border-club-dark",
    "dark:shadow-[2.5px_2.5px_0_#231032] dark:hover:shadow-[3px_3px_0_#231032]"
  ),
  purple: clsx(
    "bg-club text-white border-club-dark hover:bg-club-normal-hover",
    "shadow-[2.5px_2.5px_0_#231032] hover:shadow-[3px_3px_0_#231032] active:shadow-[1px_1px_0_#231032]",
    "dark:bg-club dark:text-white dark:border-club-dark",
    "dark:shadow-[2.5px_2.5px_0_#231032] dark:hover:shadow-[3px_3px_0_#231032]"
  ),

  // دکمه ثانویه (Secondary)
  secondary: clsx(
    "bg-ecosystem-light text-sec border-primary hover:bg-primary hover:text-white",
    "shadow-[2px_2px_0_#59BBAF] hover:shadow-[3px_3px_0_#59BBAF] active:shadow-[1px_1px_0_#59BBAF]",
    "dark:bg-[#151C28] dark:text-primary dark:border-primary dark:hover:bg-primary dark:hover:text-[#0B0F17]",
    "dark:shadow-[2px_2px_0_#59BBAF] dark:hover:shadow-[3px_3px_0_#59BBAF]"
  ),

  // دکمه اوت‌لاین (Outline)
  outline: clsx(
    "bg-white text-ink-normal border-[#DFDFDF] hover:bg-[#F8F9FA] hover:border-ink-normal",
    "shadow-[2px_2px_0_#BDBCBC] hover:shadow-[2.5px_2.5px_0_#292827] active:shadow-[1px_1px_0_#292827]",
    "dark:bg-[#161D2A] dark:text-[#F1F5F9] dark:border-[#2D3A50] hover:dark:border-slate-500",
    "dark:shadow-[2px_2px_0_#0F172A] dark:hover:shadow-[2.5px_2.5px_0_#59BBAF]"
  ),

  // سفید / خنثی
  white: clsx(
    "bg-white text-ink-normal border-gray-300 hover:bg-[#F8F9FA]",
    "shadow-[2px_2px_0_#BDBCBC] hover:shadow-[2.5px_2.5px_0_#292827] active:shadow-[1px_1px_0_#292827]",
    "dark:bg-[#161D2A] dark:text-[#F1F5F9] dark:border-[#2D3A50]",
    "dark:shadow-[2px_2px_0_#0F172A] dark:hover:shadow-[2.5px_2.5px_0_#59BBAF]"
  ),
  neutral: clsx(
    "bg-[#FAFAFA] text-ink-normal border-gray-300 hover:bg-[#F0F0F0]",
    "shadow-[2px_2px_0_#BDBCBC] hover:shadow-[2.5px_2.5px_0_#292827] active:shadow-[1px_1px_0_#292827]",
    "dark:bg-[#1C2536] dark:text-[#F1F5F9] dark:border-[#2D3A50]",
    "dark:shadow-[2px_2px_0_#0F172A]"
  ),
  ghost: clsx(
    "bg-transparent text-ink-normal border-transparent hover:bg-gray-100 dark:text-white dark:hover:bg-slate-800",
    "shadow-none hover:shadow-none active:shadow-none"
  ),
  glass: clsx(
    "bg-white/80 dark:bg-[#151C28]/80 backdrop-blur-sm text-sec dark:text-white border-gray-200 dark:border-gray-700",
    "shadow-[2px_2px_0_#BDBCBC] dark:shadow-[2px_2px_0_#0F172A]"
  ),
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3 text-base gap-2.5",
};

export default function Button({
  variant = "teal",
  size = "md",
  rotate = "", // kept for backward compatibility, defaults to clean alignment
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
        "rounded-xl border-[1.5px]",
        "font-bold select-none cursor-pointer",
        "transition-all duration-150 ease-out",
        "hover:-translate-x-[1px] hover:-translate-y-[1px]",
        "active:translate-x-[1.5px] active:translate-y-[1.5px]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:transform-none disabled:shadow-none",
        vClass,
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

