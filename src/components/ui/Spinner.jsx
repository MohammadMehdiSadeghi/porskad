import clsx from "clsx";

export default function Spinner({ label = "در حال بارگذاری...", className = "" }) {
  return (
    <div className={clsx("flex flex-col items-center justify-center gap-3 py-14", className)}>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-indigo-200" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin" />
      </div>
      <span className="text-sm font-medium text-gray-500">{label}</span>
    </div>
  );
}
