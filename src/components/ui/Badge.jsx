import clsx from "./clsx";

const COLORS = {
  teal: "border-teal-text text-teal-text bg-ecosystem-light",
  navy: "border-navy text-navy bg-male-light",
  indigo: "border-navy text-navy bg-male-light",
  magenta: "border-magenta-text text-magenta-text bg-female-light",
  orange: "border-orange text-orange bg-college-light",
  amber: "border-orange text-orange bg-college-light",
  gray: "border-ink-light text-ink-subtle bg-bg-neutral",
  green: "border-accent-green text-accent-green bg-ecosystem-light",
  red: "border-accent-red text-accent-red bg-female-light",
  ecosystem: "border-ecosystem-normal text-ecosystem-dark bg-ecosystem-light",
  male: "border-male-normal text-male-normal bg-male-light",
  female: "border-female-normal text-female-dark bg-female-light",
  college: "border-college-normal text-college-dark bg-college-light",
  club: "border-club-normal text-club-dark bg-club-light",
  purple: "border-purple-600 text-purple-700 bg-purple-50",
};

export default function Badge({ color = "teal", rotate = "", className = "", children }) {
  return (
    <span
      className={clsx(
        "inline-block bg-white border rounded-xl [corner-shape:squircle]",
        "px-2 py-0.5 text-[0.7rem] font-bold whitespace-nowrap shadow-sm",
        COLORS[color] ?? COLORS.teal,
        rotate,
        className,
      )}
    >
      {children}
    </span>
  );
}
