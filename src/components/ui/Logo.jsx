import { Link } from "react-router-dom";

export default function Logo({ to = "/", size = "md", linked = true, className = "" }) {
  const sizes = {
    sm: "text-lg px-2.5 py-1 rounded-[0.6rem]",
    md: "text-2xl px-3.5 py-1.5 rounded-[0.85rem]",
    lg: "text-4xl px-5 py-2 rounded-[1.2rem]",
  };

  const logo = (
    <span
      className={`inline-flex items-baseline gap-1 bg-white border-[0.1875rem] border-ink [corner-shape:squircle] ${sizes[size]} font-black shadow-sm select-none`}
    >
      <span className="text-navy">پرس</span>
      <span className="text-teal-text">کاد</span>
    </span>
  );

  if (!linked) {
    return (
      <span
        className={`inline-block rotate-[-2deg] ${className}`}
        aria-label="پرسکاد"
      >
        {logo}
      </span>
    );
  }

  return (
    <Link to={to} className={`inline-block rotate-[-2deg] hover:rotate-0 transition-transform duration-200 ${className}`} aria-label="پرسکاد — صفحه اصلی">
      {logo}
    </Link>
  );
}
