import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

// ─── صدای نوتیف مدرن با Web Audio API ───
function createNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // نت اول — فاصله سوم بزرگ (чарming)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1100, now + 0.08);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // نت دوم — اکتاو بالاتر (درخشش)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now + 0.1); // E6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.22);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);

    // نت سوم — اکتاو بالاتر (пік)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(1760, now + 0.2); // A6
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.setValueAtTime(0.2, now + 0.2);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    osc3.connect(gain3).connect(ctx.destination);
    osc3.start(now + 0.2);
    osc3.stop(now + 0.55);

    // رزونانس ملایم
    const osc4 = ctx.createOscillator();
    const gain4 = ctx.createGain();
    osc4.type = "sine";
    osc4.frequency.setValueAtTime(440, now + 0.15); // A4
    gain4.gain.setValueAtTime(0, now);
    gain4.gain.setValueAtTime(0.08, now + 0.15);
    gain4.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc4.connect(gain4).connect(ctx.destination);
    osc4.start(now + 0.15);
    osc4.stop(now + 0.6);
  } catch {}
}

function NotificationProvider({ children }) {
  const { user, isOwner } = useAuth() || {};
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("porskad_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("notif_sound") !== "false";
  });
  const [notifEnabled, setNotifEnabled] = useState(() => {
    return localStorage.getItem("notif_enabled") !== "false";
  });
  const [isOpen, setIsOpen] = useState(false);

  // ذخیره اعلان‌ها در localStorage
  useEffect(() => {
    try {
      localStorage.setItem("porskad_notifications", JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // پخش صدا
  const playSound = useCallback(() => {
    if (!soundEnabled) return;
    createNotifSound();
  }, [soundEnabled]);

  // اضافه کردن نوتیف جدید
  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [
      { id: Date.now() + Math.random(), time: new Date().toISOString(), read: false, ...notif },
      ...prev,
    ].slice(0, 50)); // حداکثر ۵۰ نوتیف
    playSound();
  }, [playSound]);

  // علامت خوانده شدن
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // علامت همه خوانده شدن
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // پاک کردن همه
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // تغییر وضعیت صدا
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      localStorage.setItem("notif_sound", String(!prev));
      return !prev;
    });
  }, []);

  // تغییر وضعیت نوتیف
  const toggleNotif = useCallback(() => {
    setNotifEnabled((prev) => {
      localStorage.setItem("notif_enabled", String(!prev));
      return !prev;
    });
  }, []);

  // اشتراک real-time برای پاسخ‌های فرم و تیکت‌های پشتیبانی
  useEffect(() => {
    if (!notifEnabled || !supabase) return;

    const channel = supabase
      .channel("app-global-notifications")
      // ۱. پاسخ جدید فرم
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses" },
        async (payload) => {
          let formTitle = "فرم";
          let formSlug = null;
          try {
            const { data } = await supabase
              .from("forms")
              .select("title, slug")
              .eq("id", payload.new.form_id)
              .maybeSingle();
            if (data) {
              formTitle = data.title;
              formSlug = data.slug;
            }
          } catch {}

          addNotification({
            type: "response",
            title: "پاسخ جدید دریافت شد!",
            message: `کاربری فرم «${formTitle}» را تکمیل کرد`,
            formId: payload.new.form_id,
            formSlug,
            link: "/admin/forms",
          });
        }
      )
      // ۲. تیکت جدید پشتیبانی (ارسال به مدیر)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_tickets" },
        async (payload) => {
          const newTicket = payload.new;
          if (!newTicket) return;

          const owner = isOwner?.();
          const isMyTicket = newTicket.user_id === user?.id;

          // اگر مدیر است و تیکت مال خودش نیست
          if (owner && !isMyTicket) {
            let senderName = "کاربر";
            try {
              const { data: prof } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", newTicket.user_id)
                .maybeSingle();
              if (prof) {
                senderName = prof.full_name || prof.email?.split("@")[0] || "کاربر";
              }
            } catch {}

            addNotification({
              type: "ticket_new",
              title: "تیکت پشتیبانی جدید 💬",
              message: `${senderName}: ${newTicket.subject || "پیام پشتیبانی جدید"}`,
              link: "/admin/support",
              ticketId: newTicket.id,
            });
          }
        }
      )
      // ۳. به‌روزرسانی تیکت (پاسخ مدیر یا بستن تیکت)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets" },
        async (payload) => {
          const updatedTicket = payload.new;
          const oldTicket = payload.old;
          if (!updatedTicket) return;

          const isMyTicket = updatedTicket.user_id === user?.id;
          const owner = isOwner?.();

          // اعلان برای کاربر عادی
          if (isMyTicket && !owner) {
            if (updatedTicket.admin_reply && updatedTicket.admin_reply !== oldTicket?.admin_reply) {
              addNotification({
                type: "ticket_reply",
                title: "پاسخ جدید به تیکت 🎧",
                message: `پاسخ به تیکت «${updatedTicket.subject || ""}» ثبت شد`,
                link: "/admin/support",
                ticketId: updatedTicket.id,
              });
            } else if (updatedTicket.status === "closed" && oldTicket?.status !== "closed") {
              addNotification({
                type: "ticket_closed",
                title: "تیکت پشتیبانی بسته شد 🔒",
                message: `تیکت «${updatedTicket.subject || ""}» توسط پشتیبانی بسته شد`,
                link: "/admin/support",
                ticketId: updatedTicket.id,
              });
            }
          }

          // اعلان برای مدیر اگر تیکت مجدداً باز شد
          if (owner && !isMyTicket) {
            if (updatedTicket.status === "open" && oldTicket?.status === "closed") {
              addNotification({
                type: "ticket_reopen",
                title: "بازگشایی تیکت 🔓",
                message: `تیکت «${updatedTicket.subject || ""}» مجدداً بازگشایی شد`,
                link: "/admin/support",
                ticketId: updatedTicket.id,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notifEnabled, addNotification, user, isOwner]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    soundEnabled,
    notifEnabled,
    isOpen,
    setIsOpen,
    addNotification,
    markAsRead,
    markAllRead,
    clearAll,
    toggleSound,
    toggleNotif,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}

export { NotificationProvider, useNotifications };
