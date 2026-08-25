export default function Spinner({ label = "در حال بارگذاری...", className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-14 ${className}`}>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-[0.25rem] border-teal/30" />
        <div className="absolute inset-0 rounded-full border-[0.25rem] border-transparent border-t-teal animate-spin" />
      </div>
      <span className="text-sm font-bold text-ink-subtle">{label}</span>
    </div>
  );
}
