import clsx from "./clsx";

const COLORS = {
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function Badge({ color = "indigo", className = "", children }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold border rounded-full",
        COLORS[color] ?? COLORS.indigo,
        className,
      )}
    >
      {children}
    </span>
  );
}
