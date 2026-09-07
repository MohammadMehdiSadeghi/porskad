import StickerCard from "./StickerCard";
import { FolderOpen } from "lucide-react";

export default function EmptyState({ icon, title = "این‌جا خالیه!", subtitle = "", action = null, rotate = "-rotate-[1deg]" }) {
  const IconRender = icon || <FolderOpen size={44} className="text-navy/30" />;
  return (
    <div className={`max-w-md mx-auto ${rotate}`}>
      <StickerCard theme="white">
        <div className="p-8 sm:p-10 flex flex-col items-center text-center gap-3">
          <div className="flex items-center justify-center p-3 rounded-2xl bg-navy/5 text-navy/40">
            {typeof IconRender === "string" ? <span className="text-3xl">{IconRender}</span> : IconRender}
          </div>
          <h3 className="text-lg sm:text-xl font-black text-navy">{title}</h3>
          {subtitle && <p className="text-sm font-semibold text-ink-subtle leading-7">{subtitle}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </StickerCard>
    </div>
  );
}
