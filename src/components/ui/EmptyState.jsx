import StickerCard from "./StickerCard";

// حالت خالی — کارت استیکری با ایموجی بزرگ و CTA اختیاری
export default function EmptyState({ icon = "🗂️", title = "این‌جا خالیه!", subtitle = "", action = null, rotate = "-rotate-[1deg]" }) {
  return (
    <div className={`max-w-md mx-auto ${rotate}`}>
      <StickerCard theme="white">
        <div className="p-8 sm:p-10 flex flex-col items-center text-center gap-3">
          <div className="text-5xl rotate-[3deg]">{icon}</div>
          <h3 className="text-xl font-black text-navy">{title}</h3>
          {subtitle && <p className="text-sm font-semibold text-ink-subtle leading-7">{subtitle}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </StickerCard>
    </div>
  );
}
