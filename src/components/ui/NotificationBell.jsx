import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import { Bell, BellOff, Volume2, VolumeX, Trash2, CheckCheck, X } from "lucide-react";
import { faDateTime } from "../../lib/utils";

export default function NotificationBell() {
  const navigate = useNavigate();
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
        className="relative p-2.5 rounded-xl hover:bg-white/15 active:scale-95 transition-all duration-200 group"
        title="نوتیفیکیشن‌ها"
      >
        {notifEnabled ? (
          <Bell size={18} className="text-white/70 group-hover:text-white transition-colors" />
        ) : (
          <BellOff size={18} className="text-white/40" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] bg-gradient-to-br from-rose-500 to-pink-600 text-white text-[0.55rem] font-black rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* اورلی — blur */}
      <div
        className={`fixed inset-0 z-[9998] backdrop-blur-sm transition-all duration-300 ${
          isOpen ? "bg-black/30 opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* پنل شناور — مدرن شیشه‌ای */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] max-w-[88vw] z-[9999] flex flex-col
          bg-white/95 backdrop-blur-2xl
          shadow-[-8px_0_40px_rgba(0,0,0,0.12)]
          border-l border-white/60
          transition-transform duration-[350ms] cubic-bezier(0.16,1,0.3,1) ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* هدر — گرادیانت مدرن */}
        <div className="relative px-5 py-4 bg-gradient-to-l from-navy via-navy to-slate-800">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-60" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Bell size={16} className="text-teal" />
              </div>
              <div>
                <span className="text-sm font-black text-white block leading-tight">نوتیفیکیشن‌ها</span>
                {unreadCount > 0 && (
                  <span className="text-[0.6rem] text-teal font-semibold">{unreadCount} خوانده نشده</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[0.6rem] px-2 py-1 rounded-md bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all font-bold"
                >
                  همه خوانده شد
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[0.6rem] px-2 py-1 rounded-md bg-white/10 text-white/60 hover:bg-rose-500/20 hover:text-rose-300 transition-all font-bold"
                >
                  پاک کردن
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-all ml-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* تنظیمات — تگل‌های مدرن */}
        <div className="flex items-center gap-5 px-5 py-3 border-b border-ink/5 bg-gradient-to-r from-teal/5 to-transparent">
          <button
            onClick={toggleNotif}
            className="flex items-center gap-2 group"
          >
            <div className={`relative w-9 h-5 rounded-full transition-all duration-200 ${notifEnabled ? "bg-teal" : "bg-ink/15"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${notifEnabled ? "right-0.5" : "right-[18px]"}`} />
            </div>
            <span className="text-[0.7rem] font-bold text-navy">نوتیف</span>
          </button>
          <button
            onClick={toggleSound}
            className="flex items-center gap-2 group"
          >
            <div className={`relative w-9 h-5 rounded-full transition-all duration-200 ${soundEnabled ? "bg-teal" : "bg-ink/15"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${soundEnabled ? "right-0.5" : "right-[18px]"}`} />
            </div>
            <span className="text-[0.7rem] font-bold text-navy">صدا</span>
          </button>
        </div>

        {/* لیست */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-ink/10 scrollbar-track-transparent">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal/10 to-teal/5 flex items-center justify-center">
                <Bell size={24} className="text-teal/30" />
              </div>
              <p className="text-sm font-bold text-ink/25">نوتیفیکیشنی وجود ندارد</p>
              <p className="text-[0.65rem] text-ink/15">وقتی کسی فرم پر کنه، اینجا میاد</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((n, i) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.link) {
                      navigate(n.link);
                      setIsOpen(false);
                    }
                  }}
                  className={`group flex items-start gap-3 mx-2 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    n.read
                      ? "hover:bg-ink/3"
                      : "bg-gradient-to-l from-teal/5 to-transparent hover:from-teal/10"
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                    n.read ? "bg-ink/5" : "bg-gradient-to-br from-teal/15 to-teal/5"
                  }`}>
                    {n.type === "response" ? "📥" : n.type?.startsWith("ticket") ? "🎧" : "🔔"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[0.8rem] font-bold text-navy truncate">{n.title}</p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-gradient-to-br from-teal to-teal/70 shrink-0 shadow-sm shadow-teal/30" />
                      )}
                    </div>
                    <p className="text-xs text-ink/50 truncate mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[0.6rem] text-ink/25 mt-1 font-medium">
                      {faDateTime(n.time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
