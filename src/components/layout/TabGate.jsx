import { useNavigate } from "react-router-dom";
import StickerCard from "../ui/StickerCard";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { Wrench, Compass } from "lucide-react";
import {
  useUserTab,
  TAB_STATE_MAINTENANCE,
} from "../../lib/userTabs";

/**
 * گیت تب کاربری: اگر سوپرادمین تب را «غیرفعال» یا «بروزرسانی» کرده باشد،
 * به‌جای محتوای صفحه، باکس اطلاع‌رسانی نمایش داده می‌شود.
 * استفاده: <TabGate tabId="forms"> ...محتوای واقعی... </TabGate>
 */
export default function TabGate({ tabId, children }) {
  const { tab, state, maintenanceMessage, isBlocked } = useUserTab(tabId);
  const navigate = useNavigate();

  if (!isBlocked) return children;

  const maintenance = state === TAB_STATE_MAINTENANCE;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <StickerCard
        theme={maintenance ? "orange" : "magenta"}
        rotate="rotate-[0.4deg]"
        className="w-full max-w-md"
      >
        <div className="p-7 sm:p-8 flex flex-col items-center gap-4 text-center">
          <div
            className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center [corner-shape:squircle] rotate-[-3deg] ${
              maintenance
                ? "bg-orange text-white"
                : "bg-magenta text-white"
            }`}
          >
            {maintenance ? <Wrench size={30} /> : <Compass size={30} />}
          </div>

          <Badge color={maintenance ? "orange" : "magenta"} rotate="rotate-[-1deg]">
            {maintenance ? "🛠️ در حال بروزرسانی" : "⛔ دسترسی موقتاً متوقف است"}
          </Badge>

          <h2 className="text-lg font-black text-navy dark:text-white leading-8">
            بخش «{tab?.label || "این قسمت"}»
          </h2>

          <p className="text-sm font-medium text-ink/70 dark:text-slate-300 leading-7 whitespace-pre-line">
            {maintenance
              ? maintenanceMessage
              : "این بخش فعلاً غیرفعال است. در صورت نیاز با پشتیبانی در ارتباط باشید."}
          </p>

          {!maintenance && (
            <Button
              variant="navy"
              className="w-full justify-center mt-1"
              onClick={() => navigate("/admin/support", { replace: true })}
            >
              ارسال تیکت پشتیبانی
            </Button>
          )}
        </div>
      </StickerCard>
    </div>
  );
}
