import { Link } from "react-router-dom";

export default function Logo({ to = "/", size = "md", linked = true, className = "" }) {
  const sizes = {
    sm: "text-lg px-2.5 py-1 rounded-[0.6rem]",
    md: "text-2xl px-3.5 py-1.5 rounded-[0.85rem]",
    lg: "text-4xl px-5 py-2 rounded-[1.2rem]",
  };

  const logo = (
    <span
      className={`inline-flex items-baseline gap-1 bg-white dark:bg-[#151C28] border-[1.5px] border-sec/20 dark:border-gray-700 rounded-xl ${sizes[size]} font-black shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF] select-none`}
    >
      <span className="text-sec dark:text-white">پرس</span>
      <span className="text-primary">کاد</span>
    </span>

  );

  if (!linked) {
    return (
      <span
        className={`inline-block rotate-[-2deg] ${className}`}
        aria-label="پرس‌کاد"
      >
        {logo}
      </span>
    );
  }

  return (
    <Link to={to} className={`inline-block rotate-[-2deg] hover:rotate-0 transition-transform duration-200 ${className}`} aria-label="پرس‌کاد — صفحه اصلی">
      {logo}
    </Link>
  );
}
