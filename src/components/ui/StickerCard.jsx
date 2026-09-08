// ─── کارت استیکری دوسطحی — امضای دیزاین رکاد ───
import clsx from "./clsx";

export const STICKER_THEMES = {
  white: {
    back: "bg-ink",
    border: "border-ink",
    bg: "bg-white",
  },
  teal: {
    back: "bg-teal-alt",
    border: "border-teal",
    bg: "bg-ecosystem-light",
  },
  navy: {
    back: "bg-navy-alt",
    border: "border-navy",
    bg: "bg-male-light",
  },
  magenta: {
    back: "bg-magenta",
    border: "border-magenta",
    bg: "bg-female-light",
  },
  orange: {
    back: "bg-orange-alt",
    border: "border-orange",
    bg: "bg-college-light",
  },
  ecosystem: {
    back: "bg-ecosystem-dark",
    border: "border-ecosystem-normal",
    bg: "bg-ecosystem-light",
  },
  male: {
    back: "bg-male-dark",
    border: "border-male-normal",
    bg: "bg-male-light",
  },
  female: {
    back: "bg-female-dark",
    border: "border-female-normal",
    bg: "bg-female-light",
  },
  college: {
    back: "bg-college-dark",
    border: "border-college-normal",
    bg: "bg-college-light",
  },
  club: {
    back: "bg-club-dark",
    border: "border-club-normal",
    bg: "bg-club-light",
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
