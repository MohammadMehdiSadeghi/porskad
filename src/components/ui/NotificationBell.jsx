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
    <div ref={ref} className="relative">
      {/* دکمه زنگوله در هدر بالا */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 sm:p-2.5 rounded-xl bg-navy/5 hover:bg-navy/10 text-navy border border-navy/10 active:scale-95 transition-all duration-200 group flex items-center justify-center"
        title="نوتیفیکیشن‌ها و اعلان‌ها"
        aria-label="اعلان‌ها"
      >
        {notifEnabled ? (
          <Bell size={19} className="text-navy/70 group-hover:text-navy transition-colors" />
        ) : (
          <BellOff size={19} className="text-navy/40" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] bg-gradient-to-br from-rose-500 to-pink-600 text-white text-[0.6rem] font-black rounded-full flex items-center justify-center shadow-md shadow-rose-500/30 animate-pulse px-1">
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

      {/* پنل شناور نوتیفیکیشن‌ها */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] max-w-[90vw] z-[9999] flex flex-col
          bg-white/95 backdrop-blur-2xl
          shadow-[-8px_0_40px_rgba(0,0,0,0.14)]
          border-l border-white/60
          transition-transform duration-[350ms] cubic-bezier(0.16,1,0.3,1) ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* هدر پنل اعلان‌ها */}
        <div className="relative px-5 py-4 bg-gradient-to-l from-navy via-navy to-slate-800 shrink-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-60" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal/20 text-teal flex items-center justify-center border border-teal/30">
                <Bell size={16} />
              </div>
              <div>
                <span className="text-sm font-black text-white block leading-tight">اعلان‌ها و رویدادها</span>
                <span className="text-[0.62rem] text-teal font-semibold">
                  {unreadCount > 0 ? `${unreadCount} اعلان خوانده‌نشده` : "تمامی اعلان‌ها خوانده شده‌اند"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[0.62rem] px-2.5 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all font-bold"
                  title="علامت‌گذاری همه به عنوان خوانده شده"
                >
                  همه خوانده شد
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[0.62rem] px-2 py-1 rounded-lg bg-white/10 text-white/70 hover:bg-rose-500/20 hover:text-rose-300 transition-all font-bold"
                  title="پاک‌سازی تمامی اعلان‌ها"
                >
                  پاک‌سازی
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all ml-1"
                title="بستن"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* تنظیمات اعلان و صدا */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-ink/5 bg-gradient-to-r from-teal/5 via-slate-50 to-transparent shrink-0">
          <div className="text-[0.7rem] font-bold text-ink/60">تنظیمات دریافت:</div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleNotif}
              className="flex items-center gap-1.5 group"
              title="روشن یا خاموش کردن دریافت اعلان"
            >
              <div className={`relative w-8 h-4.5 rounded-full transition-all duration-200 ${notifEnabled ? "bg-teal" : "bg-ink/20"}`}>
                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200 ${notifEnabled ? "right-0.5" : "right-[16px]"}`} />
              </div>
              <span className="text-[0.68rem] font-bold text-navy">اعلان</span>
            </button>
            <button
              onClick={toggleSound}
              className="flex items-center gap-1.5 group"
              title="روشن یا خاموش کردن صدای اعلان"
            >
              <div className={`relative w-8 h-4.5 rounded-full transition-all duration-200 ${soundEnabled ? "bg-teal" : "bg-ink/20"}`}>
                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200 ${soundEnabled ? "right-0.5" : "right-[16px]"}`} />
              </div>
              <span className="text-[0.68rem] font-bold text-navy">صدا</span>
            </button>
          </div>
        </div>

        {/* لیست نوتیفیکیشن‌ها */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-ink/10 scrollbar-track-transparent">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal/10 to-teal/5 border border-teal/10 flex items-center justify-center">
                <Bell size={28} className="text-teal/40" />
              </div>
              <p className="text-sm font-black text-navy/70">اعلانی وجود ندارد</p>
              <p className="text-xs text-ink/40 leading-relaxed max-w-xs">
                به محض اینکه پاسخی برای فرم‌های شما ثبت شود یا پیام پشتیبانی دریافت کنید، اینجا و به صورت زنده نمایش داده خواهد شد.
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-1">
              {notifications.map((n, i) => {
                let badgeLabel = "رویداد";
                let badgeClass = "bg-ink/5 text-ink/60";
                let icon = "🔔";

                if (n.type === "response") {
                  badgeLabel = "ثبت فرم";
                  badgeClass = "bg-teal/15 text-teal border border-teal/20";
                  icon = "📥";
                } else if (n.type === "ticket_new") {
                  badgeLabel = "تیکت جدید";
                  badgeClass = "bg-sky-500/15 text-sky-700 border border-sky-500/20";
                  icon = "💬";
                } else if (n.type === "ticket_reply") {
                  badgeLabel = "پاسخ پشتیبانی";
                  badgeClass = "bg-emerald-500/15 text-emerald-700 border border-emerald-500/20";
                  icon = "🎧";
                } else if (n.type === "ticket_closed") {
                  badgeLabel = "تیکت بسته شد";
                  badgeClass = "bg-amber-500/15 text-amber-700 border border-amber-500/20";
                  icon = "🔒";
                } else if (n.type === "ticket_reopen") {
                  badgeLabel = "بازگشایی تیکت";
                  badgeClass = "bg-purple-500/15 text-purple-700 border border-purple-500/20";
                  icon = "🔓";
                }

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      if (n.link) {
                        navigate(n.link);
                        setIsOpen(false);
                      }
                    }}
                    className={`group flex items-start gap-3 mx-2.5 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                      n.read
                        ? "bg-white/40 border-black/5 hover:bg-ink/5 opacity-80 hover:opacity-100"
                        : "bg-gradient-to-l from-teal/10 via-white to-white border-teal/20 shadow-xs hover:from-teal/15"
                    }`}
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-2xs ${
                      n.read ? "bg-ink/5" : "bg-gradient-to-br from-teal/20 to-teal/10 border border-teal/20"
                    }`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-0.5">
                        <span className="text-[0.78rem] font-black text-navy truncate">{n.title}</span>
                        <span className={`text-[0.58rem] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${badgeClass}`}>
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-ink/70 line-clamp-2 leading-relaxed">{n.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[0.62rem] text-ink/40 font-medium" dir="ltr">
                          {faDateTime(n.time)}
                        </span>
                        {!n.read && (
                          <span className="inline-flex items-center gap-1 text-[0.6rem] text-teal font-extrabold">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-ping" />
                            جدید
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
