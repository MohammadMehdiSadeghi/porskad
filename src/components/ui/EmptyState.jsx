import StickerCard from "./StickerCard";
import { FolderOpen } from "lucide-react";

export default function EmptyState({ icon, title = "این‌جا خالیه!", subtitle = "", action = null, rotate = "-rotate-[1deg]", titleClassName = "" }) {
  const IconRender = icon || <FolderOpen size={44} className="text-navy/30" />;
  return (
    <div className={`max-w-md mx-auto ${rotate}`}>
      <StickerCard theme="white">
        <div className="p-7 sm:p-9 flex flex-col items-center text-center gap-2.5">
          <div className="flex items-center justify-center p-3 rounded-2xl bg-navy/5 text-navy/40">
            {typeof IconRender === "string" ? <span className="text-3xl">{IconRender}</span> : IconRender}
          </div>
          <h3 className={`font-black text-navy text-base sm:text-lg ${titleClassName}`}>{title}</h3>
          {subtitle && <p className="text-xs sm:text-sm font-semibold text-ink-subtle leading-6">{subtitle}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </StickerCard>
    </div>
  );
}
