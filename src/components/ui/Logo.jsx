import { Link } from "react-router-dom";

export default function Logo({ to = "/", size = "md", className = "" }) {
  const sizes = {
    sm: "text-lg px-2.5 py-1 rounded-[0.6rem]",
    md: "text-2xl px-3.5 py-1.5 rounded-[0.85rem]",
    lg: "text-4xl px-5 py-2 rounded-[1.2rem]",
  };
  return (
    <Link to={to} className={`inline-block rotate-[-2deg] hover:rotate-0 transition-transform duration-200 ${className}`} aria-label="پرسکاد — صفحه اصلی">
      <span
        className={`inline-flex items-baseline gap-1 bg-white border-[0.1875rem] border-ink [corner-shape:squircle] ${sizes[size]} font-black shadow-sm select-none`}
      >
        <span className="text-navy">پرس</span>
        <span className="text-teal-text">کاد</span>
      </span>
    </Link>
  );
}
