import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const NotificationContext = createContext(null);

// صدای نوتیف آیفون (DataURL کوتاه)
const NOTIF_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoKIe2EcBj+a2teleC4ZJpu/3+TGfCwZCjCl2teleC4ZJpu/3+TGfCwZCjCl2teleC4ZJpu/3+TGfCwZCjCl2teleC4ZJpu/3+TGfCwZ";

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("notif_sound") !== "false";
  });
  const [notifEnabled, setNotifEnabled] = useState(() => {
    return localStorage.getItem("notif_enabled") !== "false";
  });
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef(null);

  // مقداردهی اولیه audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIF_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  // پخش صدا
  const playSound = useCallback(() => {
    if (!soundEnabled || !audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, [soundEnabled]);

  // اضافه کردن نوتیف جدید
  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [
      { id: Date.now(), time: new Date(), read: false, ...notif },
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

  // اشتراک real-time برای پاسخ‌های جدید
  useEffect(() => {
    if (!notifEnabled || !supabase) return;

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses" },
        async (payload) => {
          // گرفتن اطلاعات فرم
          let formTitle = "فرم";
          try {
            const { data } = await supabase
              .from("forms")
              .select("title, slug")
              .eq("id", payload.new.form_id)
              .maybeSingle();
            if (data) formTitle = data.title;
          } catch {}

          addNotification({
            type: "response",
            title: "پاسخ جدید!",
            message: `کاربری فرم «${formTitle}» رو پر کرد`,
            formId: payload.new.form_id,
            formSlug: payload.new.form_id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notifEnabled, addNotification]);

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
