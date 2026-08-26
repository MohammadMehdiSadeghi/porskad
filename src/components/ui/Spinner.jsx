import clsx from "clsx";

export default function Spinner({ label = "در حال بارگذاری...", className = "" }) {
  return (
    <div className={clsx("flex flex-col items-center justify-center gap-3 py-14", className)}>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-teal/25" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-teal animate-spin" />
      </div>
      <span className="text-sm font-medium text-ink/50">{label}</span>
    </div>
  );
}
