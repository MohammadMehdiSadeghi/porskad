import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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

  const bellBtnRef = useRef(null);
  const panelRef = useRef(null);

  // بستن با کلیک بیرون یا دکمه Escape
  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (e) => {
      if (bellBtnRef.current && bellBtnRef.current.contains(e.target)) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);

    // قفل اسکرول بدنه صفحه هنگام باز بودن دراور
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, setIsOpen]);

  return (
    <>
      {/* دکمه زنگوله در هدر بالا */}
      <button
        ref={bellBtnRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 sm:p-2.5 rounded-xl bg-navy/5 hover:bg-navy/10 text-navy border border-navy/10 active:scale-95 transition-all duration-200 group flex items-center justify-center cursor-pointer"
        title="اعلان‌ها و رویدادها"
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

      {/* پرتال در document.body برای تضمین ارتفاع ۱۰۰٪ کامل صفحه و عدم گیر افتادن در بلور هدر */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99998] transition-opacity duration-300 ${
              isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* اورلی پس‌زمینه با مات‌کننده ملایم */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
              onClick={() => setIsOpen(false)}
            />

            {/* دراور کشویی نوتیفیکیشن‌ها با ارتفاع ۱۰۰٪ کامل واقعی */}
            <aside
              ref={panelRef}
              dir="rtl"
              className={`fixed top-0 bottom-0 right-0 h-screen h-[100dvh] w-[400px] max-w-[92vw] flex flex-col
                bg-white shadow-2xl border-l border-ink/10 z-[99999]
                transition-transform duration-300 ease-out ${
                  isOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
              {/* هدر پنل اعلان‌ها */}
              <div className="relative px-5 py-4 bg-gradient-to-l from-navy via-navy to-slate-800 shrink-0">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-60 pointer-events-none" />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal/20 text-teal flex items-center justify-center border border-teal/30 shrink-0">
                      <Bell size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-black text-white block leading-tight truncate">اعلان‌ها و رویدادها</span>
                      <span className="text-[0.62rem] text-teal font-semibold block truncate">
                        {unreadCount > 0 ? `${unreadCount} اعلان جدید و خوانده‌نشده` : "تمامی اعلان‌ها خوانده شده‌اند"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-[0.65rem] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all font-bold flex items-center gap-1 cursor-pointer"
                        title="علامت‌گذاری همه به عنوان خوانده شده"
                      >
                        <CheckCheck size={12} />
                        <span>خواندن همه</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-[0.65rem] px-2 py-1 rounded-lg bg-white/10 text-white/70 hover:bg-rose-500/20 hover:text-rose-300 transition-all font-bold flex items-center gap-1 cursor-pointer"
                        title="پاک‌سازی تمامی اعلان‌ها"
                      >
                        <Trash2 size={12} />
                        <span>پاک‌سازی</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all cursor-pointer mr-0.5"
                      title="بستن"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* تنظیمات دریافت: سوییچ‌های روشن/خاموش پایدار و خوش‌دست */}
              <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-ink/10 bg-slate-50 shrink-0 select-none gap-2">
                <div className="text-xs font-black text-navy/70">تنظیمات دریافت:</div>
                <div className="flex items-center gap-3.5">
                  {/* سوییچ اعلان */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifEnabled}
                    onClick={toggleNotif}
                    className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer group"
                    title={notifEnabled ? "کلیک برای خاموش کردن دریافت اعلان" : "کلیک برای روشن کردن دریافت اعلان"}
                  >
                    <div
                      dir="ltr"
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                        notifEnabled ? "bg-teal" : "bg-ink/25"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                          notifEnabled ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                    <span className="flex items-center gap-1 text-[0.72rem] font-bold text-navy">
                      {notifEnabled ? <Bell size={12} className="text-teal" /> : <BellOff size={12} className="text-ink/40" />}
                      <span>اعلان: <strong className={notifEnabled ? "text-teal-text font-black" : "text-ink/40 font-bold"}>{notifEnabled ? "روشن" : "خاموش"}</strong></span>
                    </span>
                  </button>

                  {/* سوییچ صدا */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={soundEnabled}
                    onClick={toggleSound}
                    className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer group"
                    title={soundEnabled ? "کلیک برای خاموش کردن صدای اعلان" : "کلیک برای روشن کردن صدای اعلان"}
                  >
                    <div
                      dir="ltr"
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                        soundEnabled ? "bg-teal" : "bg-ink/25"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                          soundEnabled ? "translate-x-4.5" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                    <span className="flex items-center gap-1 text-[0.72rem] font-bold text-navy">
                      {soundEnabled ? <Volume2 size={12} className="text-teal" /> : <VolumeX size={12} className="text-ink/40" />}
                      <span>صدا: <strong className={soundEnabled ? "text-teal-text font-black" : "text-ink/40 font-bold"}>{soundEnabled ? "روشن" : "خاموش"}</strong></span>
                    </span>
                  </button>
                </div>
              </div>

              {/* لیست نوتیفیکیشن‌ها با اسکرول کامل مستقل */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-ink/10 scrollbar-track-transparent">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 px-4 text-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal/10 to-teal/5 border border-teal/10 flex items-center justify-center">
                      <Bell size={28} className="text-teal/40" />
                    </div>
                    <p className="text-sm font-black text-navy/70">اعلانی وجود ندارد</p>
                    <p className="text-xs text-ink/50 leading-relaxed max-w-xs">
                      به محض اینکه پاسخی برای فرم‌های شما ثبت شود یا پیام پشتیبانی دریافت کنید، به صورت زنده اینجا نمایش داده خواهد شد.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
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
                        className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                          n.read
                            ? "bg-white border-black/5 hover:bg-slate-50 opacity-75 hover:opacity-100"
                            : "bg-gradient-to-l from-teal/10 via-white to-white border-teal/25 shadow-xs hover:from-teal/15"
                        }`}
                      >
                        <div
                          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-2xs ${
                            n.read ? "bg-ink/5" : "bg-gradient-to-br from-teal/20 to-teal/10 border border-teal/20"
                          }`}
                        >
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
                  })
                )}
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
