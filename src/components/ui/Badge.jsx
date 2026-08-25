import clsx from "./clsx";

const COLORS = {
  teal: "border-teal-text text-teal-text bg-[#F2FAF9]",
  navy: "border-navy text-navy bg-[#F4F5FB]",
  magenta: "border-magenta-text text-magenta-text bg-[#FEFAFB]",
  orange: "border-orange text-orange bg-[#FEF7EC]",
  gray: "border-[#bdbdbd] text-[#777] bg-bg-neutral",
  green: "border-[#2e9e6b] text-[#20794f] bg-[#effaf4]",
};

// بج استیکری سفید با بوردر رنگی — مثل بج‌های StatCard رکاد
export default function Badge({ color = "teal", rotate = "", className = "", children }) {
  return (
    <span
      className={clsx(
        "inline-block bg-white border rounded-xl [corner-shape:squircle]",
        "px-2.5 py-0.5 text-[0.8125rem] font-bold whitespace-nowrap shadow-sm",
        COLORS[color] ?? COLORS.teal,
        rotate,
        className,
      )}
    >
      {children}
    </span>
  );
}
