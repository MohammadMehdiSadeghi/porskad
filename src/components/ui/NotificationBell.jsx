import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import { Bell, BellOff, Volume2, VolumeX, Trash2, CheckCheck, X, Inbox, MessageSquare, Headphones, Lock, Unlock } from "lucide-react";
import { faDateTime } from "../../lib/utils";

/**
 * سوییچ روشن / خاموش پایدار با استایل‌های تضمین‌شده و انیمیشن روان
 */
function ToggleSwitch({ checked, onChange, label, activeIcon: ActiveIcon, inactiveIcon: InactiveIcon }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
        checked
          ? "bg-teal/10 border-teal/30 hover:bg-teal/15 shadow-2xs"
          : "bg-ink/5 border-ink/10 hover:bg-ink/10"
      }`}
      title={checked ? `کلیک برای خاموش کردن ${label}` : `کلیک برای روشن کردن ${label}`}
    >
      <div className="flex items-center gap-1.5 min-w-0 pointer-events-none">
        {checked ? (
          <ActiveIcon size={14} className="text-teal shrink-0" />
        ) : (
          <InactiveIcon size={14} className="text-ink/40 shrink-0" />
        )}
        <span className="text-xs font-black text-navy truncate">{label}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 pointer-events-none">
        <span
          className={`text-[0.65rem] font-extrabold px-1.5 py-0.5 rounded-md transition-colors ${
            checked ? "bg-teal text-white" : "bg-ink/15 text-ink/60"
          }`}
        >
          {checked ? "روشن" : "خاموش"}
        </span>

        <div
          style={{
            width: "34px",
            height: "18px",
            borderRadius: "9999px",
            backgroundColor: checked ? "#0D9488" : "#D1D5DB",
            position: "relative",
            transition: "background-color 200ms ease",
            display: "inline-flex",
            alignItems: "center",
            padding: "2px",
            direction: "ltr",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "9999px",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
              transform: checked ? "translateX(16px)" : "translateX(0px)",
              transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>
    </button>
  );
}

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

  // بستن با کلیک بیرون یا کلید Escape
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

    // قفل اسکرول بدنه صفحه هنگام باز بودن کشو
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
      {/* دکمه زنگوله در هدر صفحه */}
      <button
        ref={bellBtnRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-navy/5 hover:bg-navy/10 text-navy border border-navy/10 active:scale-95 transition-all duration-200 group flex items-center justify-center cursor-pointer"
        title="اعلان‌ها و رویدادها"
        aria-label="اعلان‌ها"
      >
        {notifEnabled ? (
          <Bell size={16} className="text-navy/80 group-hover:text-navy transition-colors" />
        ) : (
          <BellOff size={16} className="text-navy/40" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-gradient-to-br from-rose-500 to-pink-600 text-white text-[0.58rem] font-black rounded-full flex items-center justify-center shadow-md shadow-rose-500/30 animate-pulse px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* پرتال در document.body برای تضمین ۱۰۰٪ ارتفاع فول بدون وابستگی به هیچ کانتینر والد */}
      {typeof document !== "undefined" &&
        createPortal(
          <>
            {/* اورلی تمام صفحه */}
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "rgba(0, 0, 0, 0.45)",
                backdropFilter: "blur(3px)",
                WebkitBackdropFilter: "blur(3px)",
                zIndex: 99998,
                transition: "opacity 300ms ease",
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? "auto" : "none",
              }}
              onClick={() => setIsOpen(false)}
            />

            {/* دراور کشویی نوتیفیکیشن با ریسپانسیو و اسکرول استاندارد */}
            <aside
              ref={panelRef}
              dir="rtl"
              className="fixed inset-y-0 right-0 h-full h-screen w-full sm:w-[390px] max-w-full sm:max-w-[90vw] flex flex-col bg-white shadow-2xl border-l border-black/10 z-[99999] overflow-hidden"
              style={{
                position: "fixed",
                top: 0,
                bottom: 0,
                right: 0,
                height: "100dvh",
                minHeight: "100%",
                maxHeight: "100dvh",
                width: "min(390px, 100vw)",
                maxWidth: "100vw",
                zIndex: 99999,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#FFFFFF",
                boxShadow: "-8px 0 35px rgba(0,0,0,0.2)",
                borderLeft: "1px solid rgba(0,0,0,0.1)",
                transform: isOpen ? "translateX(0)" : "translateX(100%)",
                transition: "transform 300ms cubic-bezier(0.16, 1, 0.3, 1), visibility 300ms",
                pointerEvents: isOpen ? "auto" : "none",
                visibility: isOpen ? "visible" : "hidden",
                overflow: "hidden",
              }}
            >
              {/* هدر پنل اعلان‌ها */}
              <div className="relative px-4 sm:px-5 py-3.5 sm:py-4 bg-gradient-to-l from-navy via-navy to-slate-800 shrink-0">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-60 pointer-events-none" />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal/20 text-teal flex items-center justify-center border border-teal/30 shrink-0">
                      <Bell size={15} />
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

              {/* نوار سوییچ‌های روشن/خاموش اعلان و صدا */}
              <div className="p-3 border-b border-ink/10 bg-slate-50 shrink-0 select-none">
                <div className="text-[0.68rem] font-bold text-ink/60 mb-2">تنظیمات دریافت اعلان:</div>
                <div className="flex items-center gap-2">
                  <ToggleSwitch
                    checked={notifEnabled}
                    onChange={toggleNotif}
                    label="اعلان‌ها"
                    activeIcon={Bell}
                    inactiveIcon={BellOff}
                  />
                  <ToggleSwitch
                    checked={soundEnabled}
                    onChange={toggleSound}
                    label="صدای زنگ"
                    activeIcon={Volume2}
                    inactiveIcon={VolumeX}
                  />
                </div>
              </div>

              {/* لیست اعلان‌ها با ارتفاع پویا و اسکرول مستقل */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "0.625rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-3 my-auto">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal/10 to-teal/5 border border-teal/10 flex items-center justify-center">
                      <Bell size={24} className="text-teal/40" />
                    </div>
                    <p className="text-sm font-black text-navy/70">اعلانی وجود ندارد</p>
                    <p className="text-xs text-ink/50 leading-relaxed max-w-xs">
                      به محض اینکه پاسخی برای فرم‌های شما ثبت شود یا پیام پشتیبانی دریافت کنید، اینجا نمایش داده خواهد شد.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    let badgeLabel = "رویداد";
                    let badgeClass = "bg-ink/5 text-ink/60";
                    let IconComponent = Bell;
                    let iconColorClass = "text-navy/70";

                    if (n.type === "response") {
                      badgeLabel = "ثبت فرم";
                      badgeClass = "bg-teal/15 text-teal border border-teal/20";
                      IconComponent = Inbox;
                      iconColorClass = "text-teal";
                    } else if (n.type === "ticket_new") {
                      badgeLabel = "تیکت جدید";
                      badgeClass = "bg-sky-500/15 text-sky-700 border border-sky-500/20";
                      IconComponent = MessageSquare;
                      iconColorClass = "text-sky-600";
                    } else if (n.type === "ticket_reply") {
                      badgeLabel = "پاسخ پشتیبانی";
                      badgeClass = "bg-emerald-500/15 text-emerald-700 border border-emerald-500/20";
                      IconComponent = Headphones;
                      iconColorClass = "text-emerald-600";
                    } else if (n.type === "ticket_closed") {
                      badgeLabel = "تیکت بسته شد";
                      badgeClass = "bg-amber-500/15 text-amber-700 border border-amber-500/20";
                      IconComponent = Lock;
                      iconColorClass = "text-amber-600";
                    } else if (n.type === "ticket_reopen") {
                      badgeLabel = "بازگشایی تیکت";
                      badgeClass = "bg-purple-500/15 text-purple-700 border border-purple-500/20";
                      IconComponent = Unlock;
                      iconColorClass = "text-purple-600";
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
                          className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-2xs ${
                            n.read ? "bg-ink/5" : "bg-gradient-to-br from-teal/20 to-teal/10 border border-teal/20"
                          }`}
                        >
                          <IconComponent size={16} className={iconColorClass} />
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
          </>,
          document.body
        )}
    </>
  );
}
