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
    <div ref={ref}>
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

      {/* اورلی */}
      {isOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/20" onClick={() => setIsOpen(false)} />
      )}

      {/* پنل شناور — از راست viewport */}
      <div
        className={`fixed top-0 right-0 h-full w-[320px] max-w-[85vw] bg-white shadow-2xl z-[9999] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* هدر */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10 bg-navy">
          <span className="text-sm font-bold text-white">نوتیفیکیشن‌ها</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[0.65rem] text-teal hover:underline font-bold">
                همه خوانده شد
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-[0.65rem] text-magenta-text hover:underline font-bold">
                پاک کردن
              </button>
            )}
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* تنظیمات */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-ink/10 bg-bg-mint/30">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={notifEnabled}
              onChange={toggleNotif}
              className="accent-teal w-4 h-4"
            />
            <span className="text-xs font-semibold text-navy">نوتیف</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={toggleSound}
              className="accent-teal w-4 h-4"
            />
            <span className="text-xs font-semibold text-navy">صدا</span>
          </label>
        </div>

        {/* لیست */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-ink/40">
              نوتیفیکیشنی وجود ندارد
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={`flex items-start gap-3 px-4 py-3 border-b border-ink/5 cursor-pointer transition-colors ${
                  n.read ? "bg-white" : "bg-teal/5"
                } hover:bg-bg-neutral`}
              >
                <span className="text-xl mt-0.5">
                  {n.type === "response" ? "📥" : "🔔"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy">{n.title}</p>
                  <p className="text-xs text-ink/60 truncate mt-0.5">{n.message}</p>
                  <p className="text-[0.65rem] text-ink/30 mt-1">
                    {faDateTime(n.time)}
                  </p>
                </div>
                {!n.read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-teal shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
