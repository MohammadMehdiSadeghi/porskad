import { faNum } from "../../lib/utils";

// نوار پیشرفت استیکری — track خاکستری + فیل تک‌رنگ تیل، مثل
// progress bar رکاد (progress-bg: #ededec)
export default function ProgressBar({ value = 0, max = 1, showLabel = false }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 h-3 rounded-full bg-[#ededec] overflow-hidden border border-black/5">
        <div
          className="absolute inset-y-0 right-0 bg-teal rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-extrabold text-teal-text whitespace-nowrap">
          {faNum(value)} از {faNum(max)}
        </span>
      )}
    </div>
  );
}
