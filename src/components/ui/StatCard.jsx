// ─── StatCard — کارت آماری رُکاد (ROKAD-UI-DESIGN-STANDARDS.md 7.3) ───
import React from "react";
import { toPersianDigits } from "../../lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

const PERSONA_STYLES = {
  ecosystem: {
    iconBg: "bg-ecosystem-light dark:bg-ecosystem-darker/50 text-ecosystem-normal dark:text-ecosystem-light",
    border: "border-primary/30 dark:border-primary/40",
    shadow: "shadow-[2.75px_2.75px_0_#59BBAF] dark:shadow-[2.75px_2.75px_0_#59BBAF]",
    textColor: "text-ecosystem-darker dark:text-white",
  },
  teal: {
    iconBg: "bg-ecosystem-light dark:bg-ecosystem-darker/50 text-ecosystem-normal dark:text-ecosystem-light",
    border: "border-primary/30 dark:border-primary/40",
    shadow: "shadow-[2.75px_2.75px_0_#59BBAF] dark:shadow-[2.75px_2.75px_0_#59BBAF]",
    textColor: "text-ecosystem-darker dark:text-white",
  },
  male: {
    iconBg: "bg-male-light dark:bg-male-darker/60 text-sec dark:text-male-light",
    border: "border-sec/20 dark:border-sec/40",
    shadow: "shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]",
    textColor: "text-sec dark:text-white",
  },
  navy: {
    iconBg: "bg-male-light dark:bg-male-darker/60 text-sec dark:text-male-light",
    border: "border-sec/20 dark:border-sec/40",
    shadow: "shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]",
    textColor: "text-sec dark:text-white",
  },
  female: {
    iconBg: "bg-female-light dark:bg-female-darker/50 text-girl dark:text-female-light",
    border: "border-girl/30 dark:border-girl/40",
    shadow: "shadow-[2.75px_2.75px_0_#E0195B] dark:shadow-[2.75px_2.75px_0_#E0195B]",
    textColor: "text-female-darker dark:text-white",
  },
  magenta: {
    iconBg: "bg-female-light dark:bg-female-darker/50 text-girl dark:text-female-light",
    border: "border-girl/30 dark:border-girl/40",
    shadow: "shadow-[2.75px_2.75px_0_#E0195B] dark:shadow-[2.75px_2.75px_0_#E0195B]",
    textColor: "text-female-darker dark:text-white",
  },
  college: {
    iconBg: "bg-college-light dark:bg-college-darker/50 text-third dark:text-college-light",
    border: "border-third/30 dark:border-third/40",
    shadow: "shadow-[2.75px_2.75px_0_#F8A41D] dark:shadow-[2.75px_2.75px_0_#F8A41D]",
    textColor: "text-college-darker dark:text-white",
  },
  orange: {
    iconBg: "bg-college-light dark:bg-college-darker/50 text-third dark:text-college-light",
    border: "border-third/30 dark:border-third/40",
    shadow: "shadow-[2.75px_2.75px_0_#F8A41D] dark:shadow-[2.75px_2.75px_0_#F8A41D]",
    textColor: "text-college-darker dark:text-white",
  },
  club: {
    iconBg: "bg-club-light dark:bg-club-darker/50 text-club dark:text-club-light",
    border: "border-club/30 dark:border-club/40",
    shadow: "shadow-[2.75px_2.75px_0_#652D90] dark:shadow-[2.75px_2.75px_0_#652D90]",
    textColor: "text-club-darker dark:text-white",
  },
};

export default function StatCard({
  theme = "ecosystem",
  title,
  label, // backward compat for title
  value,
  subtitle,
  caption, // backward compat for subtitle
  icon: Icon,
  trend,
  onClick,
  className = "",
}) {
  const p = PERSONA_STYLES[theme] ?? PERSONA_STYLES.ecosystem;
  const displayTitle = title || label;
  const displaySubtitle = subtitle || caption;
  const displayValue = typeof value === "number" ? toPersianDigits(value) : value;

  return (
    <div
      onClick={onClick}
      className={`relative bg-white dark:bg-[#151C28] rounded-2xl border-[1.5px] ${p.border} ${p.shadow} p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 ${onClick ? "cursor-pointer select-none active:translate-y-0" : ""} ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs sm:text-sm font-bold text-ink-normal/70 dark:text-gray-300">
          {displayTitle}
        </span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${p.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-1">
        <div className={`font-black text-2xl sm:text-3xl leading-tight ${p.textColor}`}>
          {displayValue}
        </div>

        {trend && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              trend.isPositive
                ? "bg-emerald-50 text-accent-green dark:bg-emerald-950/40 dark:text-emerald-400 border border-accent-green/30"
                : "bg-rose-50 text-accent-red dark:bg-rose-950/40 dark:text-rose-400 border border-accent-red/30"
            }`}
          >
            {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{toPersianDigits(trend.value)}</span>
          </span>
        )}
      </div>

      {displaySubtitle && (
        <p className="text-xs text-ink-normal/60 dark:text-gray-400 mt-2 font-medium truncate">
          {displaySubtitle}
        </p>
      )}
    </div>
  );
}

