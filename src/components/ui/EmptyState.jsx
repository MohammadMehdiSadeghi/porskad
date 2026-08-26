export default function EmptyState({ icon = "🗂️", title = "این‌جا خالیه!", subtitle = "", action = null }) {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-[1.25rem] [corner-shape:squircle] border-2 border-ink/10 p-8 flex flex-col items-center text-center gap-3">
        <div className="text-4xl">{icon}</div>
        <h3 className="text-lg font-black text-navy">{title}</h3>
        {subtitle && <p className="text-sm font-medium text-ink/50 leading-7">{subtitle}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
