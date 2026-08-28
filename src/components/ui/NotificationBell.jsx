import { useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { Bell, BellOff, Volume2, VolumeX, Trash2, CheckCheck, X } from "lucide-react";
import { faDateTime } from "../../lib/utils";

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    soundEnabled,
    notifEnabled,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllRead,
    clearAll,
    toggleSound,
    toggleNotif,
  } = useNotifications();
  const ref = useRef(null);

  // بستن با کلیک بیرون
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, setIsOpen]);

  return (
    <div className="relative" ref={ref}>
      {/* دکمه زنگ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        title="نوتیفیکیشن‌ها"
      >
        {notifEnabled ? (
          <Bell size={18} className="text-white/70" />
        ) : (
          <BellOff size={18} className="text-white/40" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-magenta text-white text-[0.5rem] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* پنل نوتیفیکیشن */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white border-2 border-ink/10 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* هدر */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-ink/10 bg-bg-neutral">
            <span className="text-xs font-bold text-navy">نوتیفیکیشن‌ها</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[0.6rem] text-teal-text hover:underline font-bold">
                  همه خوانده شد
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-[0.6rem] text-magenta-text hover:underline font-bold">
                  پاک کردن
                </button>
              )}
            </div>
          </div>

          {/* تنظیمات */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-ink/10 bg-bg-mint/30">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifEnabled}
                onChange={toggleNotif}
                className="accent-teal w-3.5 h-3.5"
              />
              <span className="text-[0.65rem] font-semibold text-navy">نوتیف</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={toggleSound}
                className="accent-teal w-3.5 h-3.5"
              />
              <span className="text-[0.65rem] font-semibold text-navy">صدا</span>
            </label>
          </div>

          {/* لیست */}
          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink/40">
                نوتیفیکیشنی وجود ندارد
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 border-b border-ink/5 cursor-pointer transition-colors ${
                    n.read ? "bg-white" : "bg-teal/5"
                  } hover:bg-bg-neutral`}
                >
                  <span className="text-lg mt-0.5">
                    {n.type === "response" ? "📥" : "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-navy">{n.title}</p>
                    <p className="text-[0.65rem] text-ink/60 truncate">{n.message}</p>
                    <p className="text-[0.55rem] text-ink/30 mt-0.5">
                      {faDateTime(n.time)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-teal shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
