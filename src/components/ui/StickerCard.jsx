// ─── کارت استیکری دوسطحی — امضای دیزاین رکاد ───
import clsx from "./clsx";

export const STICKER_THEMES = {
  white: {
    back: "bg-ink dark:bg-black/90",
    border: "border-ink dark:border-slate-700",
    bg: "bg-white dark:bg-slate-900",
  },
  teal: {
    back: "bg-teal-alt dark:bg-teal/10",
    border: "border-teal dark:border-teal",
    bg: "bg-ecosystem-light dark:bg-[#0d2322]",
  },
  navy: {
    back: "bg-navy-alt dark:bg-slate-950",
    border: "border-navy dark:border-blue-500",
    bg: "bg-male-light dark:bg-[#11182c]",
  },
  magenta: {
    back: "bg-magenta dark:bg-pink-950",
    border: "border-magenta dark:border-pink-500",
    bg: "bg-female-light dark:bg-[#250d18]",
  },
  orange: {
    back: "bg-orange-alt dark:bg-amber-950",
    border: "border-orange dark:border-amber-500",
    bg: "bg-college-light dark:bg-[#261705]",
  },
  ecosystem: {
    back: "bg-ecosystem-dark dark:bg-teal/10",
    border: "border-ecosystem-normal dark:border-teal",
    bg: "bg-ecosystem-light dark:bg-[#0d2322]",
  },
  male: {
    back: "bg-male-dark dark:bg-slate-950",
    border: "border-male-normal dark:border-blue-500",
    bg: "bg-male-light dark:bg-[#11182c]",
  },
  female: {
    back: "bg-female-dark dark:bg-pink-950",
    border: "border-female-normal dark:border-pink-500",
    bg: "bg-female-light dark:bg-[#250d18]",
  },
  college: {
    back: "bg-college-dark dark:bg-amber-950",
    border: "border-college-normal dark:border-amber-500",
    bg: "bg-college-light dark:bg-[#261705]",
  },
  club: {
    back: "bg-club-dark dark:bg-purple",
    border: "border-club-normal dark:border-purple",
    bg: "bg-club-light dark:bg-[#1e0d29]",
  },
};

export default function StickerCard({
  theme = "white",
  rotate = "",
  offset = "top-[0.3rem] left-[0.3rem]",
  radius = "rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none",
  border = "border-[0.1875rem]",
  className = "",
  backClassName = "",
  innerClassName = "",
  children,
  as: Tag = "div",
  ...rest
}) {
  const t = STICKER_THEMES[theme] ?? STICKER_THEMES.white;
  return (
    <div className={clsx("relative", rotate, className)}>
      <div
        aria-hidden="true"
        className={clsx(
          "absolute w-full h-full",
          offset,
          radius,
          "[corner-shape:squircle]",
          t.back,
          backClassName,
        )}
      />
      <Tag
        className={clsx(
          "relative z-10 h-full",
          radius,
          "[corner-shape:squircle]",
          border,
          t.border,
          t.bg,
          innerClassName,
        )}
        {...rest}
      >
        {children}
      </Tag>
    </div>
  );
}
