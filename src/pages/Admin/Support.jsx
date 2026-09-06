import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../components/ui/Toast";
import StickerCard from "../../components/ui/StickerCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import SEO from "../../components/ui/SEO";
import { faDateTime, faRelative } from "../../lib/utils";
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
} from "lucide-react";

export default function Support() {
  const { user, profile, isOwner } = useAuth();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all' | 'open' | 'answered'

  // کاربر: تیکت جدید
  const [newTicketModal, setNewTicketModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ادمین: پاسخ به تیکت
  const [replyTicket, setReplyTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("support_tickets")
        .select("*, profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false });

      // کاربر عادی فقط تیکت‌های خودش را می‌بیند
      if (!isOwner()) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error("loadTickets error:", err);
      // اگر جدول هنوز ساخته نشده باشد بی‌صدا رد شو
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

  // ثبت پاسخ توسط ادمین
  async function handleSendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !replyTicket) return;

    setReplying(true);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          admin_reply: replyText.trim(),
          status: "answered",
          replied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", replyTicket.id);

      if (error) throw error;

      push("پاسخ تیکت با موفقیت ثبت شد.", "success");
      setReplyTicket(null);
      setReplyText("");
      loadTickets();
    } catch (err) {
      console.error(err);
      push("خطا در ثبت پاسخ: " + err.message, "error");
    } finally {
      setReplying(false);
    }
  }

  // فیلتر تیکت‌ها
  const filteredTickets = tickets.filter((t) => {
    if (filter === "open") return t.status === "open";
    if (filter === "answered") return t.status === "answered";
    return true;
  });

  const openCount = tickets.filter((t) => t.status === "open").length;

  if (loading) return <Spinner label="در حال بارگذاری تیکت‌های پشتیبانی..." />;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <SEO
        title="پشتیبانی و تیکت‌ها"
        description="ارتباط با پشتیبانی و ارسال تیکت"
        url="/admin/support"
        noIndex
      />

      {/* هدر صفحه */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-navy">
            {isOwner() ? "مرکز پشتیبانی و پیام‌های کاربران" : "پشتیبانی و ارتباط با ما"}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-ink-subtle mt-1">
            {isOwner()
              ? `${tickets.length} پیام دریافت شده (${openCount} در انتظار پاسخ)`
              : "سوالی دارید یا به سهمیه و امکانات بیشتری نیاز دارید؟ پیام بفرستید."}
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
                href="https://t.me/porskad_support"
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
                  <h3 className="font-black text-navy text-sm sm:text-base">افزایش سهمیه و پلن</h3>
                  <p className="text-xs font-semibold text-ink-subtle mt-0.5">سفارشی‌سازی سقف فرم‌ها و قابلیت‌ها</p>
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

      {/* تب‌های فیلتر برای ادمین */}
      {isOwner() && tickets.length > 0 && (
        <div className="flex items-center gap-1 bg-white border-2 border-ink/15 rounded-pill-md p-1 w-fit">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs font-bold rounded-pill-sm transition-colors ${
              filter === "all" ? "bg-navy text-white" : "text-ink-subtle hover:text-ink"
            }`}
          >
            همه ({tickets.length})
          </button>
          <button
            onClick={() => setFilter("open")}
            className={`px-3 py-1 text-xs font-bold rounded-pill-sm transition-colors ${
              filter === "open" ? "bg-orange text-white" : "text-ink-subtle hover:text-ink"
            }`}
          >
            در انتظار پاسخ ({openCount})
          </button>
          <button
            onClick={() => setFilter("answered")}
            className={`px-3 py-1 text-xs font-bold rounded-pill-sm transition-colors ${
              filter === "answered" ? "bg-teal text-white" : "text-ink-subtle hover:text-ink"
            }`}
          >
            پاسخ داده شده ({tickets.length - openCount})
          </button>
        </div>
      )}

      {/* لیست تیکت‌ها */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={48} />}
          title={isOwner() ? "هیچ تیکت پشتیبانی وجود ندارد" : "هنوز پیامی ارسال نکرده‌اید"}
          subtitle={
            isOwner()
              ? "پیام‌ها و سوالات کاربران در این بخش نمایش داده می‌شوند."
              : "اگر سوال یا مشکلی دارید، با دکمه زیر پیام بفرستید."
          }
          action={
            !isOwner() && (
              <Button variant="teal" size="sm" onClick={() => setNewTicketModal(true)}>
                + ارسال تیکت جدید
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredTickets.map((t, idx) => (
            <div key={t.id} className={idx % 2 ? "rotate-[0.3deg]" : "-rotate-[0.3deg]"}>
              <StickerCard theme={t.status === "open" ? "orange" : "white"}>
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink/10 pb-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-navy text-base">{t.subject}</h3>
                        <Badge color={t.status === "open" ? "orange" : "green"}>
                          {t.status === "open" ? "در انتظار پاسخ" : "پاسخ داده شد"}
                        </Badge>
                      </div>
                      {isOwner() && t.profiles && (
                        <span className="text-xs font-semibold text-ink-subtle">
                          ارسال شده توسط: {t.profiles.full_name || t.profiles.email} ({t.profiles.email})
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-ink-subtle" title={faDateTime(t.created_at)}>
                      {faRelative(t.created_at)}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-ink leading-7 whitespace-pre-wrap">
                    {t.message}
                  </p>

                  {/* پاسخ ادمین */}
                  {t.admin_reply && (
                    <div className="mt-2 p-4 rounded-xl bg-ecosystem-light/80 border-2 border-teal/40 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-teal-text flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> پاسخ پشتیبانی پرس‌کاد
                        </span>
                        {t.replied_at && (
                          <span className="text-[0.65rem] font-medium text-ink-subtle">
                            {faRelative(t.replied_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-navy leading-7 whitespace-pre-wrap">
                        {t.admin_reply}
                      </p>
                    </div>
                  )}

                  {/* دکمه پاسخ برای ادمین */}
                  {isOwner() && (
                    <div className="flex justify-end pt-2 border-t border-ink/10">
                      <Button
                        variant="teal"
                        size="sm"
                        onClick={() => {
                          setReplyTicket(t);
                          setReplyText(t.admin_reply || "");
                        }}
                      >
                        {t.admin_reply ? "ویرایش پاسخ" : "پاسخ به تیکت ✍️"}
                      </Button>
                    </div>
                  )}
                </div>
              </StickerCard>
            </div>
          ))}
        </div>
      )}

      {/* مودال ساخت تیکت جدید توسط کاربر */}
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
              {submitting ? "در حال ارسال..." : "ارسال پیام 🚀"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* مودال پاسخ ادمین */}
      <Modal
        open={!!replyTicket}
        onClose={() => setReplyTicket(null)}
        title={`پاسخ به تیکت: ${replyTicket?.subject || ""}`}
      >
        <form onSubmit={handleSendReply} className="flex flex-col gap-4">
          <div className="bg-bg-lavender/50 p-3 rounded-lg text-xs font-semibold text-ink leading-5 max-h-32 overflow-y-auto">
            <span className="font-black block text-navy mb-1">پیام کاربر:</span>
            {replyTicket?.message}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-extrabold text-navy">متن پاسخ شما</span>
            <textarea
              rows={4}
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="پاسخ خود را برای کاربر بنویسید..."
              className="w-full bg-white border-2 border-ink/20 focus:border-teal rounded-pill-md px-3.5 py-2.5 text-sm font-semibold text-ink focus:outline-none resize-y"
            />
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
              {replying ? "در حال ثبت..." : "ارسال پاسخ ✅"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
