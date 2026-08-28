import StickerCard from "./StickerCard";

export default function EmptyState({ icon = "🗂️", title = "این‌جا خالیه!", subtitle = "", action = null, rotate = "-rotate-[1deg]" }) {
  const isComponent = typeof icon !== "string";
  return (
    <div className={`max-w-md mx-auto ${rotate}`}>
      <StickerCard theme="white">
        <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-2">
          <div className={`${isComponent ? "text-navy/30" : "text-4xl rotate-[3deg]"}`}> 
            {isComponent ? icon : icon}
          </div>
          <h3 className="text-base font-extrabold text-navy">{title}</h3>
          {subtitle && <p className="text-sm font-semibold text-ink-subtle leading-6">{subtitle}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </StickerCard>
    </div>
  );
}
