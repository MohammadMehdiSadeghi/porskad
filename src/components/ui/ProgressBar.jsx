import { faNum } from "../../lib/utils";

export default function ProgressBar({ value = 0, max = 1, showLabel = false }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 h-2 bg-progress-bg rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 right-0 bg-teal rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-bold text-ink/50 whitespace-nowrap">
          {faNum(value)} از {faNum(max)}
        </span>
      )}
    </div>
  );
}
