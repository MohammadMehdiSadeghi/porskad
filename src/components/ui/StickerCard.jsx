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
    bg: "bg-[#F2FAF9]",
  },
  navy: {
    back: "bg-navy-alt",
    border: "border-navy",
    bg: "bg-[#F4F5FB]",
  },
  magenta: {
    back: "bg-magenta",
    border: "border-magenta",
    bg: "bg-[#FEFAFB]",
  },
  orange: {
    back: "bg-orange-alt",
    border: "border-orange",
    bg: "bg-[#FEF7EC]",
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
  children,
  as: Tag = "div",
  ...rest
}) {
  const t = STICKER_THEMES[theme] ?? STICKER_THEMES.white;
  return (
    <div className={`relative ${rotate} ${className}`}>
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
          "relative z-10",
          radius,
          "[corner-shape:squircle]",
          border,
          t.border,
          t.bg,
        )}
        {...rest}
      >
        {children}
      </Tag>
    </div>
  );
}
