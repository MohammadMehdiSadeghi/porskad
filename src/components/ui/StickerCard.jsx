// ─── کارت رُکاد (Modern Refined Neo-brutalism) ───
import clsx from "./clsx";

export const STICKER_THEMES = {
  white: {
    card: "bg-white dark:bg-[#151C28] border-gray-200 dark:border-[#242F42] shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]",
  },
  teal: {
    card: "bg-ecosystem-light dark:bg-[#151C28] border-primary/30 dark:border-primary/40 shadow-[2.75px_2.75px_0_#59BBAF] dark:shadow-[2.75px_2.75px_0_#59BBAF]",
  },
  ecosystem: {
    card: "bg-ecosystem-light dark:bg-[#151C28] border-primary/30 dark:border-primary/40 shadow-[2.75px_2.75px_0_#59BBAF] dark:shadow-[2.75px_2.75px_0_#59BBAF]",
  },
  navy: {
    card: "bg-white dark:bg-[#151C28] border-gray-200 dark:border-[#242F42] shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]",
  },
  male: {
    card: "bg-male-light dark:bg-[#151C28] border-sec/20 dark:border-sec/40 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]",
  },
  magenta: {
    card: "bg-female-light dark:bg-[#151C28] border-girl/30 dark:border-girl/40 shadow-[2.75px_2.75px_0_#E0195B] dark:shadow-[2.75px_2.75px_0_#E0195B]",
  },
  female: {
    card: "bg-female-light dark:bg-[#151C28] border-girl/30 dark:border-girl/40 shadow-[2.75px_2.75px_0_#E0195B] dark:shadow-[2.75px_2.75px_0_#E0195B]",
  },
  orange: {
    card: "bg-college-light dark:bg-[#151C28] border-third/30 dark:border-third/40 shadow-[2.75px_2.75px_0_#F8A41D] dark:shadow-[2.75px_2.75px_0_#F8A41D]",
  },
  college: {
    card: "bg-college-light dark:bg-[#151C28] border-third/30 dark:border-third/40 shadow-[2.75px_2.75px_0_#F8A41D] dark:shadow-[2.75px_2.75px_0_#F8A41D]",
  },
  club: {
    card: "bg-club-light dark:bg-[#151C28] border-club/30 dark:border-club/40 shadow-[2.75px_2.75px_0_#652D90] dark:shadow-[2.75px_2.75px_0_#652D90]",
  },
};

export default function StickerCard({
  theme = "white",
  rotate = "",
  offset = "", // backward compat
  radius = "rounded-2xl",
  border = "border-[1.5px]",
  className = "",
  backClassName = "", // backward compat
  innerClassName = "",
  children,
  as: Tag = "div",
  ...rest
}) {
  const t = STICKER_THEMES[theme] ?? STICKER_THEMES.white;
  return (
    <Tag
      className={clsx(
        "relative transition-all duration-200 ease-out",
        "rounded-2xl border-[1.5px]",
        t.card,
        rotate,
        className,
        innerClassName
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

