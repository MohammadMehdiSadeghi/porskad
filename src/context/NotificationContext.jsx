import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth, isPrimaryGodEmail } from "./AuthContext";

const NotificationContext = createContext(null);

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

if (typeof window !== "undefined") {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener("click", unlockAudio, { once: true, passive: true });
  window.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
  window.addEventListener("keydown", unlockAudio, { once: true, passive: true });
}

// ─── صدای نوتیف مدرن و شفاف با Web Audio API ───
function createNotifSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // نت اول — فاصله سوم بزرگ
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

    // نت سوم — اکتاو بالاتر (پیک)
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
  const { user, profile, isOwner } = useAuth() || {};
  const [notifications, setNotifications] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const syncedUserIdRef = useRef(null);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("notif_sound") !== "false";
    } catch {
      return true;
    }
  });
  const [notifEnabled, setNotifEnabled] = useState(() => {
    try {
      return localStorage.getItem("notif_enabled") !== "false";
    } catch {
      return true;
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  // کلید ذخیره‌سازی محلی مجزا بر اساس هر کاربر
  const storageKey = user?.id ? `porskad_notifications_${user.id}` : null;
  const lastCheckKey = user?.id ? `porskad_last_check_${user.id}` : null;

  // بارگذاری اعلان‌های کاربر در هنگام تغییر یا لاگین
  useEffect(() => {
    if (!storageKey) {
      setNotifications([]);
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        // فالبک به نسخه قبل در صورت وجود
        const legacy = localStorage.getItem("porskad_notifications");
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            setNotifications(parsed);
            localStorage.removeItem("porskad_notifications");
          } catch {
            setNotifications([]);
          }
        } else {
          setNotifications([]);
        }
      }
    } catch {
      setNotifications([]);
    }
  }, [storageKey]);

  // ذخیره اعلان‌ها در localStorage اختصاصی کاربر
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    } catch {}
  }, [notifications, storageKey]);

  // پخش صدا
  const playSound = useCallback(() => {
    if (!soundEnabled || !notifEnabled) return;
    createNotifSound();
  }, [soundEnabled, notifEnabled]);

  // اضافه کردن نوتیف جدید با جلوگیری از ایجاد رکورد تکراری
  const addNotification = useCallback((notif) => {
    if (!notifEnabled) return;
    setNotifications((prev) => {
      const targetId = notif.id || Date.now() + Math.random();
      if (prev.some((n) => String(n.id) === String(targetId))) {
        return prev;
      }
      return [
        {
          id: targetId,
          time: new Date().toISOString(),
          read: false,
          ...notif,
        },
        ...prev,
      ].slice(0, 60); // حداکثر ۶۰ اعلان
    });
    playSound();
  }, [playSound, notifEnabled]);

  // علامت خوانده شدن یک مورد
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === String(id) ? { ...n, read: true } : n))
    );
  }, []);

  // علامت همه به عنوان خوانده شده
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // پاک کردن همه اعلان‌ها
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // تغییر وضعیت صدا
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("notif_sound", String(next));
      } catch {}
      return next;
    });
  }, []);

  // تغییر وضعیت نوتیف
  const toggleNotif = useCallback(() => {
    setNotifEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("notif_enabled", String(next));
      } catch {}
      return next;
    });
  }, []);

  // ─── سیستم بررسی و همگام‌سازی آفلاین (Offline Sync / Catch-up) ───
  // اگر کاربر آفلاین بوده باشد، هنگام ورود اطلاعات را از دیتابیس واکشی می‌کند
  const syncOfflineActivity = useCallback(async () => {
    if (!user || !supabase || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const owner = Boolean(isOwner?.());
      const nowIso = new Date().toISOString();
      const lastCheckStr = lastCheckKey ? localStorage.getItem(lastCheckKey) : null;

      // بررسی از آخرین زمان یا حداکثر ۷ روز قبل
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const defaultThreeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      let sinceTime = defaultThreeDaysAgo;
      if (lastCheckStr) {
        sinceTime = lastCheckStr > sevenDaysAgo ? lastCheckStr : sevenDaysAgo;
      }

      const newOfflineItems = [];

      // ۱. استعلام فرم‌های کاربر
      let formsQuery = supabase.from("forms").select("id, title, slug, manager_id, created_by");
      if (!owner) {
        formsQuery = formsQuery.or(`manager_id.eq.${user.id},created_by.eq.${user.id}`);
      }
      const { data: userForms } = await formsQuery;

      if (userForms && userForms.length > 0) {
        const formMap = new Map(userForms.map((f) => [f.id, f]));
        const formIds = userForms.map((f) => f.id);

        // استعلام پاسخ‌های جدیدی که برای این فرم‌ها در غیاب کاربر ثبت شده‌اند
        const { data: recentResponses } = await supabase
          .from("responses")
          .select("id, form_id, created_at")
          .in("form_id", formIds)
          .gt("created_at", sinceTime)
          .order("created_at", { ascending: false })
          .limit(30);

        if (recentResponses && recentResponses.length > 0) {
          for (const resp of recentResponses) {
            const formInfo = formMap.get(resp.form_id);
            newOfflineItems.push({
              id: `resp_${resp.id}`,
              type: "response",
              title: "پاسخ جدید دریافت شد",
              message: `کاربری فرم «${formInfo?.title || "فرم"}» را تکمیل کرد`,
              formId: resp.form_id,
              formSlug: formInfo?.slug,
              link: `/admin/forms/${resp.form_id}/responses`,
              time: resp.created_at,
              read: false,
            });
          }
        }
      }

      // ۲. استعلام تیکت‌های پشتیبانی
      if (owner) {
        // مدیر ارشد: تیکت‌های جدید کاربران در زمان آفلاین
        const { data: newTickets } = await supabase
          .from("support_tickets")
          .select("id, subject, created_at, user_id, status")
          .neq("user_id", user.id)
          .gt("created_at", sinceTime)
          .order("created_at", { ascending: false })
          .limit(20);

        if (newTickets && newTickets.length > 0) {
          const userIds = [...new Set(newTickets.map((t) => t.user_id).filter(Boolean))];
          let profilesMap = {};
          if (userIds.length > 0) {
            try {
              const { data: userProfiles } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds);
              profilesMap = Object.fromEntries((userProfiles || []).map((p) => [p.id, p]));
            } catch {
              // نادیده گرفتن خطا
            }
          }

          for (const ticket of newTickets) {
            const ticketProfile = profilesMap[ticket.user_id];
            // انزوای حساب گاد از سوپرادمین‌های ثانویه
            if (!isPrimaryGodEmail(user.email) && isPrimaryGodEmail(ticketProfile?.email)) {
              continue;
            }

            const senderName =
              ticketProfile?.full_name || ticketProfile?.email?.split("@")[0] || "کاربر";

            newOfflineItems.push({
              id: `ticket_new_${ticket.id}`,
              type: "ticket_new",
              title: "تیکت پشتیبانی جدید",
              message: `${senderName}: ${ticket.subject || "پیام پشتیبانی"}`,
              link: "/admin/support",
              ticketId: ticket.id,
              time: ticket.created_at,
              read: false,
            });
          }
        }
      } else {
        // کاربر عادی: پاسخ‌های جدید ادمین به تیکت‌های کاربر
        const { data: answeredTickets } = await supabase
          .from("support_tickets")
          .select("id, subject, status, admin_reply, replied_at, updated_at")
          .eq("user_id", user.id)
          .not("admin_reply", "is", null)
          .gt("updated_at", sinceTime)
          .order("updated_at", { ascending: false })
          .limit(20);

        if (answeredTickets && answeredTickets.length > 0) {
          for (const ticket of answeredTickets) {
            newOfflineItems.push({
              id: `ticket_reply_${ticket.id}_${ticket.replied_at || ticket.updated_at}`,
              type: "ticket_reply",
              title: "پاسخ جدید به تیکت",
              message: `پاسخ به تیکت «${ticket.subject || ""}» ثبت شد`,
              link: "/admin/support",
              ticketId: ticket.id,
              time: ticket.replied_at || ticket.updated_at,
              read: false,
            });
          }
        }
      }

      // ۳. ادغام و اضافه کردن موارد جدید بدون تکرار
      if (newOfflineItems.length > 0) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => String(n.id)));
          const toAdd = newOfflineItems.filter((item) => !existingIds.has(String(item.id)));

          if (toAdd.length > 0) {
            playSound();
            const combined = [...toAdd, ...prev]
              .sort((a, b) => new Date(b.time) - new Date(a.time))
              .slice(0, 60);
            return combined;
          }
          return prev;
        });
      }

      // به‌روزرسانی تاریخ آخرین بررسی
      if (lastCheckKey) {
        localStorage.setItem(lastCheckKey, nowIso);
      }
    } catch (err) {
      console.error("Error in syncOfflineActivity:", err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [user?.id, user?.email, isOwner, lastCheckKey, playSound]);

  // اجرای همگام‌سازی آفلاین هنگام بارگذاری و ورود کاربر
  useEffect(() => {
    if (user?.id && profile && syncedUserIdRef.current !== user.id) {
      syncedUserIdRef.current = user.id;
      syncOfflineActivity();
    }
  }, [user?.id, profile, syncOfflineActivity]);

  const addNotificationRef = useRef(addNotification);
  useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);

  // ─── اشتراک بلادرنگ پایدار (Real-time Supabase Channels) ───
  useEffect(() => {
    if (!supabase || !user?.id) return;

    const channelName = `user-notifications-${user.id}`;
    const channel = supabase
      .channel(channelName)
      // ۱. ثبت بلادرنگ پاسخ جدید فرم
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses" },
        async (payload) => {
          const newResp = payload.new;
          if (!newResp) return;

          try {
            // دریافت اطلاعات فرم و بررسی مالکیت
            const { data: formData } = await supabase
              .from("forms")
              .select("id, title, slug, manager_id, created_by")
              .eq("id", newResp.form_id)
              .maybeSingle();

            const owner = Boolean(isOwner?.() || profile?.is_owner);
            const isMyForm =
              (formData &&
                (formData.manager_id === user.id || formData.created_by === user.id)) ||
              (owner && (!formData?.created_by || formData?.created_by === user.id || formData?.manager_id === user.id || owner));

            if (isMyForm) {
              addNotificationRef.current?.({
                id: `resp_${newResp.id}`,
                type: "response",
                title: "ثبت پاسخ جدید",
                message: `کاربری فرم «${formData?.title || "فرم"}» را تکمیل کرد`,
                formId: newResp.form_id,
                formSlug: formData?.slug,
                link: `/admin/forms/${newResp.form_id}/responses`,
                time: newResp.created_at || new Date().toISOString(),
              });
            }
          } catch (err) {
            console.error("Error handling response real-time notification:", err);
          }
        }
      )
      // ۲. تیکت جدید پشتیبانی (ارسال به مدیر)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_tickets" },
        async (payload) => {
          const newTicket = payload.new;
          if (!newTicket) return;

          const owner = Boolean(isOwner?.() || profile?.is_owner);
          const isMyTicket = newTicket.user_id === user.id;

          // فقط برای ادمین در صورت ایجاد تیکت توسط کاربر دیگر
          if (owner && !isMyTicket) {
            let senderName = "کاربر";
            try {
              const { data: prof } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("id", newTicket.user_id)
                .maybeSingle();

              // انزوای اکانت گاد از سوپرادمین‌های ثانویه
              if (!isPrimaryGodEmail(user.email) && isPrimaryGodEmail(prof?.email)) {
                return;
              }

              if (prof) {
                senderName = prof.full_name || prof.email?.split("@")[0] || "کاربر";
              }
            } catch {}

            addNotificationRef.current?.({
              id: `ticket_new_${newTicket.id}`,
              type: "ticket_new",
              title: "تیکت پشتیبانی جدید",
              message: `${senderName}: ${newTicket.subject || "پیام پشتیبانی جدید"}`,
              link: "/admin/support",
              ticketId: newTicket.id,
              time: newTicket.created_at || new Date().toISOString(),
            });
          }
        }
      )
      // ۳. به‌روزرسانی تیکت (پاسخ مدیر، بازگشایی یا بستن تیکت)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets" },
        async (payload) => {
          const updatedTicket = payload.new;
          const oldTicket = payload.old;
          if (!updatedTicket) return;

          const isMyTicket = updatedTicket.user_id === user.id;
          const owner = Boolean(isOwner?.() || profile?.is_owner);

          // رویدادهای کاربر عادی
          if (isMyTicket && !owner) {
            if (updatedTicket.admin_reply && updatedTicket.admin_reply !== oldTicket?.admin_reply) {
              addNotificationRef.current?.({
                id: `ticket_reply_${updatedTicket.id}_${updatedTicket.replied_at || Date.now()}`,
                type: "ticket_reply",
                title: "پاسخ جدید به تیکت",
                message: `پاسخ به تیکت «${updatedTicket.subject || ""}» ثبت شد`,
                link: "/admin/support",
                ticketId: updatedTicket.id,
                time: updatedTicket.replied_at || updatedTicket.updated_at || new Date().toISOString(),
              });
            } else if (updatedTicket.status === "closed" && oldTicket?.status !== "closed") {
              addNotificationRef.current?.({
                id: `ticket_closed_${updatedTicket.id}`,
                type: "ticket_closed",
                title: "تیکت پشتیبانی بسته شد",
                message: `تیکت «${updatedTicket.subject || ""}» توسط پشتیبانی بسته شد`,
                link: "/admin/support",
                ticketId: updatedTicket.id,
                time: updatedTicket.updated_at || new Date().toISOString(),
              });
            }
          }

          // رویدادهای مدیر کل (مانند بازگشایی مجدد توسط کاربر)
          if (owner && !isMyTicket) {
            if (updatedTicket.status === "open" && oldTicket?.status === "closed") {
              addNotificationRef.current?.({
                id: `ticket_reopen_${updatedTicket.id}`,
                type: "ticket_reopen",
                title: "بازگشایی مجدد تیکت",
                message: `تیکت «${updatedTicket.subject || ""}» مجدداً بازگشایی شد`,
                link: "/admin/support",
                ticketId: updatedTicket.id,
                time: updatedTicket.updated_at || new Date().toISOString(),
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isOwner, profile?.is_owner]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    soundEnabled,
    notifEnabled,
    isOpen,
    isSyncing,
    setIsOpen,
    addNotification,
    markAsRead,
    markAllRead,
    clearAll,
    toggleSound,
    toggleNotif,
    syncOfflineActivity,
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
