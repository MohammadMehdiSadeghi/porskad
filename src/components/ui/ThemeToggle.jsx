import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ className = "", compact = false }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const options = [
    {
      id: "light",
      label: "روشن",
      icon: Sun,
      activeColor: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 shadow-xs",
    },
    {
      id: "dark",
      label: "تاریک",
      icon: Moon,
      activeColor: "text-teal bg-teal/15 shadow-xs",
    },
    {
      id: "system",
      label: "سیستم",
      icon: Monitor,
      activeColor: "text-navy dark:text-white bg-white dark:bg-slate-800 shadow-xs",
    },
  ];

  if (compact) {
    // Quick cycler button for small viewports
    const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const CurrentIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
    const label = theme === "light" ? "تم روشن" : theme === "dark" ? "تم تاریک" : "تم هماهنگ با سیستم";

    return (
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        className={`p-2 rounded-xl transition-all border border-navy/10 dark:border-white/10 bg-navy/5 dark:bg-white/5 text-navy dark:text-slate-200 hover:bg-navy/10 dark:hover:bg-white/10 active:scale-95 flex items-center justify-center ${className}`}
        title={`${label} (برای تغییر کلیک کنید)`}
        aria-label="تغییر تم"
      >
        <CurrentIcon size={18} className={resolvedTheme === "dark" ? "text-teal" : "text-amber-500"} />
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl bg-navy/5 dark:bg-slate-800/80 border border-navy/10 dark:border-slate-700/60 backdrop-blur-xs transition-colors ${className}`}
      role="group"
      aria-label="انتخاب تم"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              isSelected
                ? `${opt.activeColor} scale-[1.02]`
                : "text-ink/60 dark:text-slate-400 hover:text-navy dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            title={opt.label}
          >
            <Icon size={14} className="shrink-0" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
