import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth, isPrimaryGodEmail } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import SEO from "../../components/ui/SEO";
import { faDateTime, faRelative, faNum } from "../../lib/utils";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  HelpCircle,
  Headphones,
  Bot,
  ExternalLink,
  MessageCircle,
  Lock,
  Unlock,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Search,
  Phone,
  User as UserIcon,
  X,
  Layers,
  Trash2,
  Crown,
  AlertTriangle,
  Edit3,
} from "lucide-react";

export default function Support() {
  const [searchParams] = useSearchParams();
  const { user, profile, isOwner } = useAuth();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [telegramSupportId, setTelegramSupportId] = useState("porskad_support");

  useEffect(() => {
    async function loadTelegramSupport() {
      try {
        const { data } = await supabase.rpc("get_system_settings");
        if (data?.telegram_support_id) {
          setTelegramSupportId(data.telegram_support_id.replace(/^@/, ""));
        }
      } catch (e) {
        console.error("Failed to load telegram support id:", e);
      }
    }
    loadTelegramSupport();
  }, []);

  // فیلترها
  // ادمین: 'all' | 'open' | 'answered' | 'closed' | 'archived'
  // کاربر: 'active' | 'archived'
  const [adminFilter, setAdminFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");

  // آکاردئون کاربران برای ادمین (کدام کاربرها باز هستند)
  const [expandedUsers, setExpandedUsers] = useState({});

  // تایید حذف تیکت
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // بازگشایی تیکت توسط کاربر
  const [reopenModalTicket, setReopenModalTicket] = useState(null);
  const [reopenMessage, setReopenMessage] = useState("");
  const [reopening, setReopening] = useState(false);

  // کاربر: ساخت تیکت جدید
  const [newTicketModal, setNewTicketModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ادمین: پاسخ به تیکت
  const [replyTicket, setReplyTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [closeOnReply, setCloseOnReply] = useState(false);
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    const subjParam = searchParams.get("subject");
    const msgParam = searchParams.get("message");
    if (subjParam) {
      setSubject(subjParam);
      if (msgParam) setMessage(msgParam);
      setNewTicketModal(true);
    }
  }, [searchParams]);

  // توابع کمکی بررسی آرشیو با فالبک localStorage
  const isArchivedByAdmin = useCallback((t) => {
    if (t.archived_by_admin !== undefined && t.archived_by_admin !== null) {
      return Boolean(t.archived_by_admin);
    }
    return localStorage.getItem(`admin_archived_${t.id}`) === "true";
  }, []);

  const isArchivedByUser = useCallback((t) => {
    if (t.archived_by_user !== undefined && t.archived_by_user !== null) {
      return Boolean(t.archived_by_user);
    }
    return localStorage.getItem(`user_archived_${t.id}`) === "true";
  }, []);

  // بارگذاری تیکت‌ها از دیتابیس
  const loadTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      // کاربر عادی فقط تیکت‌های خودش را می‌بیند
      if (!isOwner()) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) {
        setTickets([]);
        return;
      }

      let ticketsData = data || [];
      if (isOwner() && ticketsData.length > 0) {
        const userIds = [...new Set(ticketsData.map((t) => t.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          try {
            const { data: userProfiles } = await supabase
              .from("profiles")
              .select("id, full_name, email, phone, is_owner")
              .in("id", userIds);
            const map = Object.fromEntries((userProfiles || []).map((p) => [p.id, p]));
            ticketsData = ticketsData.map((t) => ({ ...t, profiles: map[t.user_id] }));

            // استتار: سوپرادمین ثانویه نباید تیکت‌های اکانت اصلی superadmin@gmailc.com را ببیند
            const callerIsGod = isPrimaryGodEmail(user?.email);
            if (!callerIsGod) {
              ticketsData = ticketsData.filter((t) => !isPrimaryGodEmail(t.profiles?.email));
            }
          } catch {
            // نادیده گرفتن خطا
          }
        }
      }

      setTickets(ticketsData);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [user, isOwner]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // ارسال تیکت جدید توسط کاربر
  async function handleCreateTicket(e) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      push("لطفاً موضوع و متن پیام را تکمیل کنید.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        status: "open",
        archived_by_user: false,
        archived_by_admin: false,
      });

      if (error) throw error;

      push("تیکت شما ارسال شد. به زودی پاسخ داده می‌شود.", "success");
      setSubject("");
      setMessage("");
      setNewTicketModal(false);
      loadTickets();
    } catch (err) {
      console.error(err);
      push("ارسال تیکت با خطا مواجه شد: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ثبت پاسخ توسط مدیر
  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !replyTicket) return;

    setReplying(true);
    const newStatus = closeOnReply ? "closed" : "answered";
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          admin_reply: replyText.trim(),
          status: newStatus,
          replied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", replyTicket.id);

      if (error) throw error;

      push(closeOnReply ? "پاسخ ثبت و تیکت بسته شد." : "پاسخ تیکت با موفقیت ثبت شد.", "success");
      setReplyTicket(null);
      setReplyText("");
      setCloseOnReply(false);
      loadTickets();
    } catch (err) {
      console.error(err);
      push("خطا در ثبت پاسخ: " + err.message, "error");
    } finally {
      setReplying(false);
    }
  }

  // بستن یا بازگشایی تیکت توسط مدیر
  async function handleToggleStatus(ticket) {
    const nextStatus = ticket.status === "closed" ? "open" : "closed";
    // به‌روزرسانی سریع در استیت
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: nextStatus } : t))
    );

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      if (error) throw error;
      push(nextStatus === "closed" ? "تیکت بسته شد" : "تیکت مجدداً بازگشایی شد", "success");
    } catch (err) {
      console.error("Status update error:", err);
      push("خطا در تغییر وضعیت تیکت: " + err.message, "error");
      loadTickets();
    }
  }

  // تغییر وضعیت آرشیو توسط مدیر
  async function handleToggleAdminArchive(ticket) {
    const isCurrentlyArchived = isArchivedByAdmin(ticket);
    const nextArchived = !isCurrentlyArchived;

    // به‌روزرسانی سریع در استیت و حافظه مرورگر
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, archived_by_admin: nextArchived } : t))
    );
    try {
      localStorage.setItem(`admin_archived_${ticket.id}`, String(nextArchived));
    } catch {}

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          archived_by_admin: nextArchived,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      if (error) console.warn("Supabase archive error, local used:", error);
      push(nextArchived ? "تیکت به آرشیو منتقل شد" : "تیکت از آرشیو خارج شد", "success");
    } catch {
      push(nextArchived ? "تیکت به آرشیو منتقل شد" : "تیکت از آرشیو خارج شد", "success");
    }
  }

  // تغییر وضعیت آرشیو توسط کاربر عادی
  async function handleToggleUserArchive(ticket) {
    const isCurrentlyArchived = isArchivedByUser(ticket);
    const nextArchived = !isCurrentlyArchived;

    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, archived_by_user: nextArchived } : t))
    );
    try {
      localStorage.setItem(`user_archived_${ticket.id}`, String(nextArchived));
    } catch {}

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          archived_by_user: nextArchived,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);

      if (error) console.warn("Supabase user archive error, local used:", error);
      push(nextArchived ? "تیکت به آرشیو شما منتقل شد" : "تیکت از آرشیو شما خارج شد", "success");
    } catch {
      push(nextArchived ? "تیکت به آرشیو شما منتقل شد" : "تیکت از آرشیو شما خارج شد", "success");
    }
  }

  // حذف تیکت
  async function handleDeleteTicket() {
    if (!deletingTicket) return;
    const target = deletingTicket;
    setDeleting(true);

    // به‌روزرسانی سریع در استیت
    setTickets((prev) => prev.filter((t) => t.id !== target.id));
    setDeletingTicket(null);

    try {
      const { error } = await supabase
        .from("support_tickets")
        .delete()
        .eq("id", target.id);

      if (error) throw error;
      push("تیکت با موفقیت حذف شد", "success");
    } catch (err) {
      console.error("Delete ticket error:", err);
      push("خطا در حذف تیکت: " + err.message, "error");
      loadTickets();
    } finally {
      setDeleting(false);
    }
  }

  // بازگشایی تیکت بسته شده توسط کاربر به همراه پیام جدید
  async function handleUserReopenTicket(e) {
    e.preventDefault();
    if (!reopenModalTicket) return;

    const followUp = reopenMessage.trim();
    const updatedMessage = followUp
      ? `${reopenModalTicket.message}\n\n─── پیام تکمیلی کاربر (${new Date().toLocaleDateString("fa-IR")}) ───\n${followUp}`
      : reopenModalTicket.message;

    setReopening(true);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          message: updatedMessage,
          status: "open",
          updated_at: new Date().toISOString(),
        })
        .eq("id", reopenModalTicket.id);

      if (error) throw error;

      push("تیکت شما مجدداً بازگشایی شد و به صف پاسخگویی رفت", "success");
      setReopenModalTicket(null);
      setReopenMessage("");
      loadTickets();
    } catch (err) {
      console.error("Reopen ticket error:", err);
      push("خطا در بازگشایی تیکت: " + err.message, "error");
    } finally {
      setReopening(false);
    }
  }

  // عملکردهای باز/بسته کردن همه گروه‌های کاربر در پنل مدیر
  function toggleUserExpand(userId) {
    setExpandedUsers((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  function expandAllGroups(groups) {
    const all = {};
    groups.forEach((g) => {
      all[g.userId] = true;
    });
    setExpandedUsers(all);
  }

  function collapseAllGroups() {
    setExpandedUsers({});
  }

  // ─── محاسبات گروه‌بندی بر اساس کاربر برای مدیر ───
  const userGroups = useMemo(() => {
    if (!isOwner()) return [];

    const map = {};
    const q = searchQuery.trim().toLowerCase();

    for (const t of tickets) {
      const isArchived = isArchivedByAdmin(t);

      // فیلتر تب فعال مدیر
      if (adminFilter === "archived" && !isArchived) continue;
      if (adminFilter !== "archived" && isArchived) continue;
      if (adminFilter === "open" && t.status !== "open") continue;
      if (adminFilter === "answered" && t.status !== "answered") continue;
      if (adminFilter === "closed" && t.status !== "closed") continue;

      // فیلتر جستجو در متن، نام، ایمیل و شماره
      if (q) {
        const prof = t.profiles || {};
        const matchUser =
          (prof.full_name || "").toLowerCase().includes(q) ||
          (prof.email || "").toLowerCase().includes(q) ||
          (prof.phone || "").toLowerCase().includes(q);
        const matchContent =
          (t.subject || "").toLowerCase().includes(q) ||
          (t.message || "").toLowerCase().includes(q) ||
          (t.admin_reply || "").toLowerCase().includes(q);
        if (!matchUser && !matchContent) continue;
      }

      const uid = t.user_id || "unknown";
      if (!map[uid]) {
        map[uid] = {
          userId: uid,
          profile: t.profiles || { full_name: "کاربر بدون نام", email: "—", phone: null },
          tickets: [],
          openCount: 0,
          answeredCount: 0,
          closedCount: 0,
          archivedCount: 0,
          latestDate: t.created_at,
        };
      }

      map[uid].tickets.push(t);
      if (isArchived) map[uid].archivedCount++;
      else if (t.status === "open") map[uid].openCount++;
      else if (t.status === "answered") map[uid].answeredCount++;
      else if (t.status === "closed") map[uid].closedCount++;

      if (new Date(t.created_at) > new Date(map[uid].latestDate)) {
        map[uid].latestDate = t.created_at;
      }
    }

    // مرتب‌سازی: اول کاربرانی که تیکت در انتظار پاسخ دارند، سپس بر اساس جدیدترین فعالیت
    return Object.values(map).sort((a, b) => {
      if (a.openCount > 0 && b.openCount === 0) return -1;
      if (b.openCount > 0 && a.openCount === 0) return 1;
      return new Date(b.latestDate) - new Date(a.latestDate);
    });
  }, [tickets, isOwner, adminFilter, searchQuery, isArchivedByAdmin]);

  // ─── محاسبات تیکت‌های کاربر عادی ───
  const userFilteredTickets = useMemo(() => {
    if (isOwner()) return [];
    return tickets.filter((t) => {
      const isArchived = isArchivedByUser(t);
      if (userFilter === "archived") return isArchived;
      return !isArchived;
    });
  }, [tickets, isOwner, userFilter, isArchivedByUser]);

  // شمارنده‌های کلی
  const adminCounts = useMemo(() => {
    const unarchived = tickets.filter((t) => !isArchivedByAdmin(t));
    return {
      all: unarchived.length,
      open: unarchived.filter((t) => t.status === "open").length,
      answered: unarchived.filter((t) => t.status === "answered").length,
      closed: unarchived.filter((t) => t.status === "closed").length,
      archived: tickets.filter((t) => isArchivedByAdmin(t)).length,
    };
  }, [tickets, isArchivedByAdmin]);

  const userCounts = useMemo(() => {
    return {
      active: tickets.filter((t) => !isArchivedByUser(t)).length,
      archived: tickets.filter((t) => isArchivedByUser(t)).length,
    };
  }, [tickets, isArchivedByUser]);

  if (loading) return <Spinner label="در حال بارگذاری تیکت‌های پشتیبانی..." />;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <SEO
        title="پشتیبانی و تیکت‌ها"
        description="مرکز ارتباط و تیکت‌های پشتیبانی"
        url="/admin/support"
        noIndex
      />

      {/* هدر صفحه */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy flex items-center gap-2">
            <span>{isOwner() ? "مرکز تیکت‌های پشتیبانی و کاربران" : "پشتیبانی و ارتباط با ما"}</span>
            {isOwner() && adminCounts.open > 0 && (
              <span className="w-3 h-3 rounded-full bg-orange animate-ping" title="تیکت در انتظار پاسخ" />
            )}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-1">
            {isOwner()
              ? `نمایش بر اساس کاربر • ${faNum(adminCounts.all)} پیام فعال (${faNum(adminCounts.open)} در انتظار پاسخ)`
              : "سوالی دارید یا به سهمیه و امکانات بیشتری نیاز دارید؟ تیکت بفرستید."}
          </p>
        </div>

        {!isOwner() && (
          <Button
            variant="teal"
            size="sm"
            onClick={() => setNewTicketModal(true)}
            rotate="-rotate-[1deg]"
          >
            + ارسال تیکت جدید
          </Button>
        )}
      </div>

      {/* بخش راه‌های ارتباطی سریع برای کاربران عادی */}
      {!isOwner() && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 -rotate-[0.3deg]">
          <StickerCard theme="teal">
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-teal text-white flex items-center justify-center">
                  <Bot size={20} />
                </span>
                <div>
                  <h3 className="font-black text-navy text-sm sm:text-base">ارتباط در تلگرام</h3>
                  <p className="text-xs font-semibold text-ink-subtle mt-0.5">پاسخ‌دهی سریع در ساعات کاری</p>
                </div>
              </div>
              <a
                href={`https://t.me/${telegramSupportId || "porskad_support"}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-white border-2 border-teal rounded-pill-sm px-3 py-1.5 text-xs font-bold text-teal-text hover:bg-teal hover:text-white transition-all"
              >
                ارسال پیام <ExternalLink size={12} />
              </a>
            </div>
          </StickerCard>

          <StickerCard theme="orange">
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-orange text-white flex items-center justify-center">
                  <Headphones size={20} />
                </span>
                <div>
                  <h3 className="font-black text-navy text-sm sm:text-base">افزایش سهمیه فرم‌ها</h3>
                  <p className="text-xs font-semibold text-ink-subtle mt-0.5">سفارشی‌سازی سقف فرم‌ها و پاسخ‌ها</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubject("درخواست افزایش سهمیه فرم‌ها");
                  setMessage("سلام، تمایل دارم سقف تعداد فرم‌ها یا پاسخ‌های حسابم افزایش پیدا کند.");
                  setNewTicketModal(true);
                }}
                className="bg-white border-2 border-orange rounded-pill-sm px-3 py-1.5 text-xs font-bold text-orange hover:bg-orange hover:text-white transition-all cursor-pointer"
              >
                ثبت درخواست
              </button>
            </div>
          </StickerCard>
        </div>
      )}

      {/* ─── بخش فیلترها و جستجو برای مدیر ─── */}
      {isOwner() && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* تب‌های فیلتر */}
          <div className="flex items-center gap-1 bg-white border-2 border-ink/15 rounded-pill-md p-1 shadow-sm overflow-x-auto scrollbar-none max-w-full">
            <button
              onClick={() => setAdminFilter("all")}
              className={`px-3 py-1 text-xs font-bold rounded-pill-sm transition-colors ${
                adminFilter === "all" ? "bg-navy text-white" : "text-ink-subtle hover:text-ink"
              }`}
            >
              همه فعال‌ها ({faNum(adminCounts.all)})
            </button>
            <button
              onClick={() => setAdminFilter("open")}
              className={`px-3 py-1 text-xs font-bold rounded-pill-sm transition-colors ${
                adminFilter === "open" ? "bg-orange text-white" : "text-ink-subtle hover:text-ink"
              }`}
            >
              در انتظار پاسخ ({faNum(adminCounts.open)})
            </button>
            <button
              onClick={() => setAdminFilter("answered")}
              className={`px-3 py-1 text-xs font-bold rounded-pill-sm transition-colors ${
                adminFilter === "answered" ? "bg-teal text-white" : "text-ink-subtle hover:text-ink"
              }`}
            >
              پاسخ داده شده ({faNum(adminCounts.answered)})
            </button>
            <button
              onClick={() => setAdminFilter("closed")}
              className={`px-3 py-1 text-xs font-bold rounded-pill-sm transition-colors ${
                adminFilter === "closed" ? "bg-slate-700 text-white" : "text-ink-subtle hover:text-ink"
              }`}
            >
              بسته شده ({faNum(adminCounts.closed)})
            </button>
            <button
              onClick={() => setAdminFilter("archived")}
              className={`px-3 py-1 text-xs font-bold rounded-pill-sm transition-colors flex items-center gap-1 ${
                adminFilter === "archived" ? "bg-purple-700 text-white" : "text-ink-subtle hover:text-ink"
              }`}
            >
              <Archive size={12} />
              آرشیو ({faNum(adminCounts.archived)})
            </button>
          </div>

          {/* فیلد جستجو و کنترل باز/بسته کردن همه */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در کاربر یا پیام..."
                className="w-full bg-white border-2 border-ink/20 focus:border-teal rounded-pill-md pl-8 pr-8 py-1.5 text-xs font-semibold text-ink focus:outline-none transition-all"
              />
              <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {userGroups.length > 0 && (
              <div className="flex items-center gap-1 bg-white border-2 border-ink/15 rounded-pill-md p-0.5">
                <button
                  onClick={() => expandAllGroups(userGroups)}
                  className="px-2 py-1 text-[0.7rem] font-bold text-ink-subtle hover:text-navy rounded-pill-sm hover:bg-bg-neutral transition-colors"
                  title="باز کردن تیکت‌های تمام کاربران"
                >
                  باز کردن همه
                </button>
                <span className="text-ink/20">|</span>
                <button
                  onClick={collapseAllGroups}
                  className="px-2 py-1 text-[0.7rem] font-bold text-ink-subtle hover:text-navy rounded-pill-sm hover:bg-bg-neutral transition-colors"
                  title="بستن همه"
                >
                  بستن همه
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── تب‌های فیلتر برای کاربر عادی (فعال / آرشیو) ─── */}
      {!isOwner() && tickets.length > 0 && (
        <div className="flex items-center gap-1 bg-white border-2 border-ink/15 rounded-pill-md p-1 w-fit shadow-sm">
          <button
            onClick={() => setUserFilter("active")}
            className={`px-3.5 py-1 text-xs font-bold rounded-pill-sm transition-colors ${
              userFilter === "active" ? "bg-navy text-white" : "text-ink-subtle hover:text-ink"
            }`}
          >
            تیکت‌های من ({faNum(userCounts.active)})
          </button>
          <button
            onClick={() => setUserFilter("archived")}
            className={`px-3.5 py-1 text-xs font-bold rounded-pill-sm transition-colors flex items-center gap-1 ${
              userFilter === "archived" ? "bg-purple-700 text-white" : "text-ink-subtle hover:text-ink"
            }`}
          >
            <Archive size={12} />
            آرشیو شده‌ها ({faNum(userCounts.archived)})
          </button>
        </div>
      )}

      {/* ─── نمایش برای ادمین: گروه‌بندی بر اساس کاربران ─── */}
      {isOwner() ? (
        userGroups.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={48} />}
            title="هیچ تیکتی با این فیلتر یافت نشد"
            subtitle={
              searchQuery
                ? "عبارت جستجوی دیگری را امتحان کنید یا فیلتر را تغییر دهید."
                : adminFilter === "archived"
                ? "هیچ تیکتی در آرشیو مدیر قرار ندارد."
                : "پیام‌ها و سوالات کاربران در این بخش به تفکیک کاربر نمایش داده می‌شوند."
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {userGroups.map((group) => {
              const isExpanded = Boolean(expandedUsers[group.userId]);
              const initialLetter = (group.profile?.full_name || group.profile?.email || "ک")[0].toUpperCase();

              return (
                <div
                  key={group.userId}
                  className={`bg-white border-2 transition-all duration-200 rounded-2xl p-4 sm:p-5 shadow-sm ${
                    group.openCount > 0
                      ? "border-orange/60 hover:border-orange bg-orange/5"
                      : "border-ink/15 hover:border-teal"
                  }`}
                >
                  {/* نوار بالایی کاربر — کلیک جهت باز و بسته شدن */}
                  <div
                    onClick={() => toggleUserExpand(group.userId)}
                    className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* آواتار کاربر */}
                      <div
                        className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${
                          group.openCount > 0
                            ? "bg-orange text-white ring-2 ring-orange/30 animate-pulse"
                            : "bg-navy text-white"
                        }`}
                      >
                        {initialLetter}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-navy text-sm sm:text-base truncate">
                            {group.profile.full_name || "کاربر بدون نام"}
                          </span>
                          {group.profile.is_owner && (
                            <span className="text-xs font-bold bg-amber-100 text-amber-800 rounded-pill-sm px-2 py-0.5 shrink-0 flex items-center gap-1">
                              <Crown size={11} />
                              <span>مدیر کل</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-subtle mt-0.5">
                          <span dir="ltr" className="truncate">{group.profile.email}</span>
                          {group.profile.phone && (
                            <span className="text-teal font-mono font-bold flex items-center gap-1" dir="ltr">
                              <Phone size={11} /> {group.profile.phone}
                            </span>
                          )}
                          <span className="text-xs text-ink/40">• آخرین فعالیت: {faRelative(group.latestDate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* بج‌ها و دکمه باز/بستن */}
                    <div className="flex items-center gap-2 shrink-0">
                      {group.openCount > 0 && (
                        <Badge color="orange" className="animate-pulse">
                          {faNum(group.openCount)} در انتظار پاسخ
                        </Badge>
                      )}
                      {group.answeredCount > 0 && (
                        <Badge color="teal">
                          {faNum(group.answeredCount)} پاسخ داده شده
                        </Badge>
                      )}
                      {group.closedCount > 0 && (
                        <Badge color="gray">
                          {faNum(group.closedCount)} بسته
                        </Badge>
                      )}
                      {group.archivedCount > 0 && (
                        <Badge color="purple">
                          {faNum(group.archivedCount)} آرشیو
                        </Badge>
                      )}
                      <Badge color="navy">
                        {faNum(group.tickets.length)} تیکت
                      </Badge>

                      <span
                        className={`w-8 h-8 rounded-xl bg-ink/5 hover:bg-ink/10 flex items-center justify-center text-navy transition-transform duration-200 ${
                          isExpanded ? "rotate-180 bg-teal/15 text-teal" : ""
                        }`}
                        aria-label="باز و بستن تیکت‌ها"
                      >
                        <ChevronDown size={18} />
                      </span>
                    </div>
                  </div>

                  {/* ─── تیکت‌های این کاربر (با کلیک باز می‌شود) ─── */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-ink/10 flex flex-col gap-4">
                      {group.tickets.map((t) => {
                        const isClosed = t.status === "closed";
                        const isArchived = isArchivedByAdmin(t);

                        return (
                          <div
                            key={t.id}
                            className={`rounded-xl p-4 sm:p-5 border-2 transition-all duration-200 ${
                              isArchived
                                ? "bg-purple-50/40 border-purple-200"
                                : isClosed
                                ? "bg-slate-50 border-slate-200 opacity-90"
                                : t.status === "open"
                                ? "bg-amber-50/50 border-amber-300"
                                : "bg-white border-ink/15"
                            }`}
                          >
                            <div className="flex flex-col gap-3">
                              {/* سربرگ تیکت */}
                              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink/10 pb-3">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-black text-navy text-base">{t.subject}</h4>
                                    <Badge
                                      color={
                                        isClosed
                                          ? "gray"
                                          : t.status === "open"
                                          ? "orange"
                                          : "green"
                                      }
                                    >
                                      {isClosed
                                        ? "بسته شده"
                                        : t.status === "open"
                                        ? "در انتظار پاسخ"
                                        : "پاسخ داده شد"}
                                    </Badge>
                                    {isArchived && (
                                      <Badge color="purple">آرشیو شده</Badge>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs font-semibold text-ink-subtle" title={faDateTime(t.created_at)}>
                                  {faRelative(t.created_at)}
                                </span>
                              </div>

                              {/* متن پیام کاربر */}
                              <p className="text-sm font-semibold text-ink leading-7 whitespace-pre-wrap">
                                {t.message}
                              </p>

                              {/* پاسخ مدیر در صورت وجود */}
                              {t.admin_reply && (
                                <div className="mt-2 p-4 rounded-xl bg-ecosystem-light/80 border-2 border-teal/40 flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-teal-text flex items-center gap-1.5">
                                      <CheckCircle2 size={14} /> پاسخ پشتیبانی پرس‌کاد
                                    </span>
                                    {t.replied_at && (
                                      <span className="text-xs font-medium text-ink-subtle">
                                        {faRelative(t.replied_at)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-semibold text-navy leading-7 whitespace-pre-wrap">
                                    {t.admin_reply}
                                  </p>
                                </div>
                              )}

                              {/* نوار ابزار اقدامات برای مدیر */}
                              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-ink/10 mt-1">
                                {/* بستن / بازگشایی تیکت */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(t)}
                                  className={`text-xs ${
                                    isClosed
                                      ? "text-teal hover:bg-teal/10"
                                      : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  {isClosed ? (
                                    <>
                                      <Unlock size={14} className="ml-1" /> بازگشایی تیکت
                                    </>
                                  ) : (
                                    <>
                                      <Lock size={14} className="ml-1" /> بستن تیکت
                                    </>
                                  )}
                                </Button>

                                {/* آرشیو / خروج از آرشیو */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleAdminArchive(t)}
                                  className="text-xs text-purple-700 hover:bg-purple-100/60"
                                >
                                  {isArchived ? (
                                    <>
                                      <ArchiveRestore size={14} className="ml-1" /> خروج از آرشیو
                                    </>
                                  ) : (
                                    <>
                                      <Archive size={14} className="ml-1" /> آرشیو تیکت
                                    </>
                                  )}
                                </Button>

                                {/* حذف تیکت برای مدیر */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingTicket(t)}
                                  className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                >
                                  <Trash2 size={14} className="ml-1" /> حذف تیکت
                                </Button>

                                {/* پاسخ یا ویرایش پاسخ */}
                                <Button
                                  variant="teal"
                                  size="sm"
                                  onClick={() => {
                                    setReplyTicket(t);
                                    setReplyText(t.admin_reply || "");
                                    setCloseOnReply(isClosed);
                                  }}
                                >
                                  <Edit3 size={13} className="ml-1" />
                                  {t.admin_reply ? "ویرایش پاسخ" : "پاسخ به تیکت"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ─── نمایش برای کاربر عادی ─── */
        userFilteredTickets.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={48} />}
            title={userFilter === "archived" ? "هیچ تیکت آرشیو شده‌ای ندارید" : "هنوز پیامی ارسال نکرده‌اید"}
            subtitle={
              userFilter === "archived"
                ? "تیکت‌هایی که آرشیو می‌کنید در این زبانه نگهداری می‌شوند."
                : "اگر سوال، پیشنهاد یا مشکلی دارید، با دکمه زیر پیام بفرستید."
            }
            action={
              userFilter !== "archived" && (
                <Button variant="teal" size="sm" onClick={() => setNewTicketModal(true)}>
                  + ارسال تیکت جدید
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {userFilteredTickets.map((t, idx) => {
              const isClosed = t.status === "closed";
              const isArchived = isArchivedByUser(t);

              return (
                <div key={t.id} className={idx % 2 ? "rotate-[0.3deg]" : "-rotate-[0.3deg]"}>
                  <StickerCard
                    theme={
                      isArchived
                        ? "white"
                        : isClosed
                        ? "white"
                        : t.status === "open"
                        ? "orange"
                        : "white"
                    }
                  >
                    <div className="p-5 flex flex-col gap-3">
                      {/* سربرگ تیکت کاربر */}
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink/10 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-navy text-base">{t.subject}</h3>
                          <Badge
                            color={
                              isClosed
                                ? "gray"
                                : t.status === "open"
                                ? "orange"
                                : "green"
                            }
                          >
                            {isClosed
                              ? "بسته شده"
                              : t.status === "open"
                              ? "در انتظار پاسخ"
                              : "پاسخ داده شد"}
                          </Badge>
                          {isArchived && <Badge color="purple">آرشیو شده</Badge>}
                        </div>
                        <span className="text-xs font-semibold text-ink-subtle" title={faDateTime(t.created_at)}>
                          {faRelative(t.created_at)}
                        </span>
                      </div>

                      {/* متن پیام */}
                      <p className="text-sm font-semibold text-ink leading-7 whitespace-pre-wrap">
                        {t.message}
                      </p>

                      {/* پاسخ پشتیبانی */}
                      {t.admin_reply && (
                        <div className="mt-2 p-4 rounded-xl bg-ecosystem-light/80 border-2 border-teal/40 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-teal-text flex items-center gap-1.5">
                              <CheckCircle2 size={14} /> پاسخ پشتیبانی پرس‌کاد
                            </span>
                            {t.replied_at && (
                              <span className="text-xs font-medium text-ink-subtle">
                                {faRelative(t.replied_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-navy leading-7 whitespace-pre-wrap">
                            {t.admin_reply}
                          </p>
                        </div>
                      )}

                      {/* بخش وضعیت بسته شده با امکان بازگشایی و ادامه گفتگو توسط کاربر */}
                      {isClosed && (
                        <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <Lock size={15} className="shrink-0 text-slate-500" />
                            <span>این تیکت بسته شده است. در صورت نیاز به ادامه، می‌توانید همین تیکت را مجدداً بازگشایی کنید.</span>
                          </div>
                          <Button
                            variant="teal"
                            size="sm"
                            onClick={() => {
                              setReopenModalTicket(t);
                              setReopenMessage("");
                            }}
                            className="text-xs shrink-0"
                          >
                            <Unlock size={13} className="ml-1" /> بازگشایی و ادامه گفتگو
                          </Button>
                        </div>
                      )}

                      {/* دکمه‌های آرشیو و حذف برای کاربر */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingTicket(t)}
                          className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 size={13} className="ml-1" /> حذف
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleUserArchive(t)}
                          className="text-xs text-purple-700 hover:bg-purple-50"
                        >
                          {isArchived ? (
                            <>
                              <ArchiveRestore size={13} className="ml-1" /> خروج از آرشیو
                            </>
                          ) : (
                            <>
                              <Archive size={13} className="ml-1" /> انتقال به آرشیو
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </StickerCard>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ─── مودال ساخت تیکت جدید توسط کاربر ─── */}
      <Modal
        open={newTicketModal}
        onClose={() => setNewTicketModal(false)}
        title="ارسال پیام به پشتیبانی"
      >
        <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-extrabold text-navy">موضوع تیکت</span>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثلاً: سوال در مورد خروجی اکسل یا افزایش سهمیه"
              className="w-full bg-white border-2 border-ink/20 focus:border-teal rounded-pill-md px-3.5 py-2 text-sm font-semibold text-ink focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-extrabold text-navy">متن پیام</span>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="توضیحات خود را کامل بنویسید..."
              className="w-full bg-white border-2 border-ink/20 focus:border-teal rounded-pill-md px-3.5 py-2.5 text-sm font-semibold text-ink focus:outline-none resize-y"
            />
          </label>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNewTicketModal(false)}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              disabled={submitting}
            >
              <Send size={13} className="ml-1" />
              {submitting ? "در حال ارسال..." : "ارسال پیام"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── مودال پاسخ مدیر با امکان بستن تیکت ─── */}
      <Modal
        open={!!replyTicket}
        onClose={() => setReplyTicket(null)}
        title={`پاسخ به تیکت: ${replyTicket?.subject || ""}`}
      >
        <form onSubmit={handleSendReply} className="flex flex-col gap-4">
          <div className="bg-bg-lavender/50 p-3 rounded-lg text-xs font-semibold text-ink leading-5 max-h-36 overflow-y-auto border border-ink/10">
            <span className="font-black block text-navy mb-1">
              پیام کاربر ({replyTicket?.profiles?.full_name || replyTicket?.profiles?.email || "کاربر"}):
            </span>
            {replyTicket?.message}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-extrabold text-navy">متن پاسخ شما</span>
            <textarea
              rows={5}
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="پاسخ خود را برای کاربر بنویسید..."
              className="w-full bg-white border-2 border-ink/20 focus:border-teal rounded-pill-md px-3.5 py-2.5 text-sm font-semibold text-ink focus:outline-none resize-y"
            />
          </label>

          {/* گزینه بستن همزمان تیکت */}
          <label className="flex items-center gap-2 text-xs font-bold text-navy cursor-pointer select-none bg-slate-50 p-2.5 rounded-xl border border-ink/10">
            <input
              type="checkbox"
              checked={closeOnReply}
              onChange={(e) => setCloseOnReply(e.target.checked)}
              className="w-4 h-4 rounded text-teal focus:ring-teal cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Lock size={13} className="text-slate-600" /> ارسال پاسخ و بستن تیکت (Close Ticket)
            </span>
          </label>

          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReplyTicket(null)}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              disabled={replying}
            >
              <CheckCircle2 size={13} className="ml-1" />
              {replying ? "در حال ثبت..." : "ارسال پاسخ"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── مودال تایید حذف تیکت ─── */}
      <Modal
        open={!!deletingTicket}
        onClose={() => setDeletingTicket(null)}
        title="حذف تیکت پشتیبانی"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-ink leading-relaxed">
            آیا از حذف کامل تیکت <strong>«{deletingTicket?.subject}»</strong> اطمینان دارید؟
          </p>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 leading-relaxed flex items-center gap-1.5">
            <AlertTriangle size={15} className="shrink-0 text-rose-600" />
            <span>این عملیات غیرقابل بازگشت است و تمامی پیام‌ها و پاسخ‌های این تیکت به طور کامل پاک خواهند شد.</span>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-ink/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingTicket(null)}
              disabled={deleting}
            >
              انصراف
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteTicket}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? "در حال حذف..." : "بله، حذف شود"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── مودال بازگشایی تیکت توسط کاربر ─── */}
      <Modal
        open={!!reopenModalTicket}
        onClose={() => setReopenModalTicket(null)}
        title={`بازگشایی و ادامه تیکت: ${reopenModalTicket?.subject || ""}`}
      >
        <form onSubmit={handleUserReopenTicket} className="flex flex-col gap-4">
          <div className="p-3 rounded-xl bg-teal/5 border border-teal/20 text-xs font-semibold text-ink leading-relaxed">
            با ارسال پیام تکمیلی، وضعیت این تیکت مجدداً به <strong>«در انتظار پاسخ»</strong> تغییر یافته و در پنل مدیریت اعلان ارسال می‌شود.
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-extrabold text-navy">پیام یا توضیح جدید شما</span>
            <textarea
              rows={4}
              required
              value={reopenMessage}
              onChange={(e) => setReopenMessage(e.target.value)}
              placeholder="نکته، سوال یا توضیحات تکمیلی خود را بنویسید..."
              className="w-full bg-white border-2 border-ink/20 focus:border-teal rounded-pill-md px-3.5 py-2.5 text-sm font-semibold text-ink focus:outline-none resize-y"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-ink/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReopenModalTicket(null)}
              disabled={reopening}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              disabled={reopening}
            >
              <Send size={13} className="ml-1" />
              {reopening ? "در حال بازگشایی..." : "بازگشایی و ارسال پیام"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
