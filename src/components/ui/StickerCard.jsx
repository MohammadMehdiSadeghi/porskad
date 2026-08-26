// ─── کارت استیکری — سایه‌ی دولایه‌ی افست + گوشه‌ی برش‌خورده، زبان بصری رکاد ───
import clsx from "./clsx";

const RADIUS = {
  cut: "rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]",
  "cut-inv": "rounded-tr-[1.5rem] rounded-bl-[1.5rem] rounded-tl-none rounded-br-none [corner-shape:squircle]",
  soft: "rounded-[1.25rem] [corner-shape:squircle]",
};

const ACCENT = {
  navy: "bg-navy",
  teal: "bg-teal",
  magenta: "bg-magenta",
  orange: "bg-orange",
  ink: "bg-ink",
};

export default function StickerCard({
  accent = "ink",
  radius = "soft",
  rotate = "",
  className = "",
  children,
  ...rest
}) {
  const shape = RADIUS[radius] ?? RADIUS.soft;
  return (
    <div className={clsx("relative", rotate)} {...rest}>
      <div
        aria-hidden="true"
        className={clsx("absolute top-[0.25rem] left-[0.25rem] w-full h-full", shape, ACCENT[accent] ?? ACCENT.ink)}
      />
      <div
        className={clsx(
          "relative z-10 bg-white border-2",
          accent === "navy" && "border-navy",
          accent === "teal" && "border-teal",
          accent === "magenta" && "border-magenta",
          accent === "orange" && "border-orange",
          accent === "ink" && "border-ink",
          shape,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
