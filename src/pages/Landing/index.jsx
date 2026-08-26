import { Link } from "react-router-dom";
import Container from "../../components/layout/Container";
import PublicNav from "../../components/layout/PublicNav";
import PublicFooter from "../../components/layout/PublicFooter";
import StickerCard from "../../components/ui/StickerCard";
import StatCard from "../../components/ui/StatCard";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { faNum } from "../../lib/utils";
import { QUESTION_TYPES, QUESTION_TYPE_ORDER } from "../../lib/questionTypes";

// کلمه‌به‌کلمه چرخیده — امضای تیترهای رکاد
function RotatedWords({ words, className = "" }) {
  return (
    <span className={`inline-flex flex-wrap justify-center gap-x-[0.35em] gap-y-1 ${className}`}>
      {words.map((w, i) => (
        <span
          key={i}
          className="inline-block"
          style={{ transform: `rotate(${w.rot ?? 0}deg)` }}
        >
          {w.text}
        </span>
      ))}
    </span>
  );
}

// نمونه‌ی ظاهری یک سوال چهارتایی در هیرو — دقیقاً حس صفحه‌ی پر کردن فرم
function HeroFormMock() {
  return (
    <div className="rotate-[2deg] hover:rotate-[0.5deg] transition-transform duration-300">
      <StickerCard theme="white" radius="rounded-tl-[2.25rem] rounded-br-[2.25rem] rounded-tr-none rounded-bl-none">
        <div className="p-5 sm:p-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Badge color="teal" rotate="-rotate-[2deg]">سوال ۲ از ۴</Badge>
            <span className="text-xs font-bold text-ink-subtle">نظرسنجی رضایت مشتری</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-navy leading-9">
            چطور از سرعت پاسخگویی ما راضی بودی؟
          </h3>
          <div className="flex flex-col gap-2.5">
            {["خیلی راضی بودم 🙌", "راضی بودم 🙂", "معمولی بود 😐", " راضی نبودم 😕"].map(
              (opt, i) => {
                const selected = i === 1;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-pill-md border-2 px-4 py-2.5
                      ${selected
                        ? "border-teal bg-teal/10 rotate-[-0.6deg]"
                        : "border-black/15 bg-white"}`}
                  >
                    <span
                      className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full
                        border-2 text-sm font-black
                        ${selected ? "border-teal-text bg-teal text-white" : "border-ink/30 text-ink"}`}
                    >
                      {faNum(i + 1)}
                    </span>
                    <span className="text-sm font-bold text-ink">{opt}</span>
                  </div>
                );
              },
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-bold text-ink-subtle">↩ برگشت</span>
            <span className="text-sm font-extrabold text-teal-text">بعدی ←</span>
          </div>
        </div>
      </StickerCard>
    </div>
  );
}

const FEATURES = [
  {
    icon: "🎯",
    title: "سوال‌ها یکی‌یکی",
    text: "مثل یک گفتگوی ساده؛ هر صفحه یک سوال، با نوار پیشرفت و پشتیبانی Enter برای رفتن به سوال بعد.",
    theme: "teal",
    rotate: "-rotate-[1deg]",
  },
  {
    icon: "👋",
    title: "پیام خوش‌آمد و خروج",
    text: "اولین و آخرین چیزی که مخاطب می‌بیند را خودت تعیین کن؛ شخصی‌سازی کامل متن عنوان و توضیح.",
    theme: "navy",
    rotate: "rotate-[1.2deg]",
  },
  {
    icon: "📱",
    title: "ولیدیشن شماره موبایل ایران",
    text: "۰۹۱۲… ، +۹۸۹۱۲… یا حتی با ارقام فارسی؛ همه خودکار تشخیص و نرمال می‌شوند.",
    theme: "magenta",
    rotate: "rotate-[0.8deg]",
  },
  {
    icon: "⏱️",
    title: "زمان پاسخ هر سوال",
    text: "به‌جز تاریخ و ساعت ثبت، مدت‌زمان answered هر سوال هم ثبت می‌شود تا بدانی کجای فرم سنگین است.",
    theme: "orange",
    rotate: "-rotate-[1.2deg]",
  },
  {
    icon: "📊",
    title: "داشبورد و تحلیل زنده",
    text: "درصد گزینه‌ها، نمودار میله‌ای هر سوال و پاسخ‌های جدید به‌صورت لحظه‌ای (Realtime).",
    theme: "navy",
    rotate: "rotate-[1deg]",
  },
  {
    icon: "📥",
    title: "خروجی CSV اکسل‌پسند",
    text: "با یک کلیک همه‌ی پاسخ‌ها را با UTF-8 BOM خروجی بگیر؛ در اکسل فارسی درست باز می‌شود.",
    theme: "teal",
    rotate: "-rotate-[0.8deg]",
  },
  {
    icon: "💻",
    title: "متادیتای کامل هر پاسخ",
    text: "دستگاه (موبایل/تبلت/دسکتاپ)، مرورگر، سیستم‌عامل و مسیر ورود هرrespondent ذخیره می‌شود.",
    theme: "magenta",
    rotate: "rotate-[1.4deg]",
  },
  {
    icon: "🔒",
    title: "امنیت سطح ردیف (RLS)",
    text: "فرم منتشرنشده هیچ‌کس نمی‌بیند؛ خواندن پاسخ‌ها فقط با لاگین ادمین ممکن است.",
    theme: "orange",
    rotate: "-rotate-[1deg]",
  },
];

const STEPS = [
  { n: "۱", title: "فرمت رو بساز", text: "در پنل ادمین، سوال‌ها را با ۸ نوع مختلف بچین و پیام خوش‌آمد/خروج را بنویس.", theme: "teal", rotate: "-rotate-[1.5deg]" },
  { n: "۲", title: "لینکت رو بفرست", text: "فرم را منتشر کن و لینک کوتاهش را در واتساپ، تلگرام یا اینستاگرام بفرست.", theme: "navy", rotate: "rotate-[1deg]" },
  { n: "۳", title: "جواب‌ها رو زنده ببین", text: "هر جواب جدیدی که ثبت شود همان لحظه در داشبورد می‌آید؛ با تحلیل و خروجی CSV.", theme: "magenta", rotate: "-rotate-[1deg]" },
];

const FAQS = [
  { q: "پرس‌یار رایگانه؟", a: "بله؛ در v1 روی حساب رایگان Supabase و Vercel اجرا می‌شود و هزینه‌ای ندارد." },
  { q: "دیتا کجا ذخیره می‌شود؟", a: "در پروژه‌ی Supabase خودِ شما؛ هیچ دیتایی از سرور ما رد نمی‌شود چون سروری جز Supabase شما وجود ندارد." },
  { q: "اگه وسط فرم صفحه رفرش بشه چی؟", a: "جواب‌های ثبت‌شده تا آن لحظه به‌صورت پیش‌نویس در همان مرورگر ذخیره می‌شود و بعد از رفرش می‌تواند ادامه دهد." },
  { q: "چند نوع سوال پشتیبانی می‌شه؟", a: "۸ نوع: متن کوتاه، متن بلند، شماره موبایل ایران، چندگزینه‌ای (۲ تا ۶ گزینه)، ایمیل، عدد، ستاره امتیاز و بله/خیر." },
];

function FaqItem({ q, a, defaultOpen = false }) {
  return (
    <details className="group relative" open={defaultOpen}>
      {/* سایه‌ی استیکر دستکار — مثل آکاردئون رکاد */}
      <div className="rounded-[0_1.375rem_0_1.375rem]" />
      <summary
        className="relative z-10 list-none cursor-pointer bg-white border-2 border-ink
          rounded-[0_1.375rem_0_1.375rem] px-5 py-4 flex items-center justify-between gap-3
          font-extrabold text-navy hover:bg-bg-neutral transition-colors"
      >
        <span>{q}</span>
        <span className="text-xl text-teal-text group-open:rotate-45 transition-transform">＋</span>
      </summary>
      <div className="relative z-10 mt-2 bg-bg-mint border-2 border-teal rounded-[0_1.375rem_0_1.375rem] px-5 py-4 text-sm font-semibold text-ink-soft leading-8">
        {a}
      </div>
    </details>
  );
}

export default function Landing() {
  return (
    <div className="bg-white">
      <PublicNav />

      {/* ─── هیرو ─── */}
      <section className="relative overflow-hidden bg-bg-mint">
        <div
          className="absolute inset-0 opacity-60 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: "url(/assets/Hero/Hero-Pattern.png)" }}
        />
        <Container className="relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center py-16 lg:py-24 px-4">
            <div className="flex flex-col items-center lg:items-start gap-6 text-center lg:text-right">
              <Badge color="magenta" rotate="rotate-[2deg]">✨ ۱۰۰٪ فارسی و راست‌به‌چپ</Badge>
              <h1 className="text-[2.5rem] leading-[1.15] sm:text-5xl2 font-black text-navy">
                <RotatedWords
                  words={[
                    { text: "نظرسنجی", rot: -1.5 },
                    { text: "بساز،", rot: 1 },
                    { text: "جواب", rot: -1 },
                    { text: "بگیر!", rot: 2 },
                  ]}
                />
              </h1>
              <p className="max-w-md text-lg font-semibold text-ink-soft leading-9">
                پرس‌یار فرم‌ها رو تبدیل می‌کنه به یه گفتگوی ساده‌ی قدم‌به‌قدم؛
                مخاطبت سوال‌ها رو یکی‌یکی جواب می‌ده و تو جواب‌ها رو زنده توی داشبورد می‌بینی.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button as={Link} to="/admin" variant="teal" size="lg" rotate="-rotate-[1.5deg]">
                  شروع کن — ورود به پنل 🚀
                </Button>
                <Button
                  as="a"
                  href="#how"
                  variant="white"
                  size="lg"
                  rotate="rotate-[1deg]"
                >
                  چطور کار می‌کنه؟
                </Button>
              </div>
            </div>
            <HeroFormMock />
          </div>
        </Container>
      </section>

      {/* ─── آمار ─── */}
      <section className="py-12 lg:py-16 bg-white">
        <Container>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7 px-4">
            <StatCard theme="teal" label="ساخت فرم" value="۲ دقیقه" caption="بدون کدنویسی" />
            <StatCard theme="orange" label="نوع سوال" value={faNum(8)} caption="از موبایل تا ستاره" />
            <StatCard theme="navy" label="تحلیل" value="زنده" caption="Realtime" />
            <StatCard theme="magenta" label="هزینه" value="۰ تومان" caption="روی Supabase رایگان" />
          </div>
        </Container>
      </section>

      {/* ─── انواع سوال ─── */}
      <section className="py-14 lg:py-20 bg-bg-lavender dot-pattern">
        <Container className="px-4">
          <h2 className="text-center text-3xl2 sm:text-4xl2 font-black text-navy mb-3">
            <RotatedWords
              words={[
                { text: "۸", rot: 2 },
                { text: "نوع", rot: -1 },
                { text: "سوال،", rot: 1.5 },
                { text: "هرچی", rot: -1.5 },
                { text: "لازم", rot: 1 },
                { text: "داری", rot: -2 },
              ]}
            />
          </h2>
          <p className="text-center font-semibold text-ink-subtle mb-10">
            سوال‌هایت را مثل قطعات لگو کنار هم بچین
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {QUESTION_TYPE_ORDER.map((key, i) => {
              const t = QUESTION_TYPES[key];
              const rots = ["-rotate-[1deg]", "rotate-[1.5deg]", "rotate-[1deg]", "-rotate-[1.5deg]"];
              return (
                <div key={key} className={rots[i % 4]}>
                  <StickerCard theme={t.color}>
                    <div className="p-4 sm:p-5 flex flex-col items-center text-center gap-1.5 min-h-[7rem] justify-center">
                      <span className="text-3xl">{t.icon}</span>
                      <span className="text-sm font-extrabold text-ink">{t.label}</span>
                    </div>
                  </StickerCard>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ─── امکانات ─── */}
      <section id="features" className="py-14 lg:py-20 bg-white">
        <Container className="px-4">
          <h2 className="text-center text-3xl2 sm:text-4xl2 font-black text-navy mb-3">
            <RotatedWords
              words={[
                { text: "همه‌چیز", rot: -1.5 },
                { text: "یه", rot: 1 },
                { text: "پرس‌لاین", rot: -1 },
                { text: "واقعی", rot: 2 },
                { text: "می‌خواد", rot: -2 },
              ]}
            />
          </h2>
          <p className="text-center font-semibold text-ink-subtle mb-10">
            و کمی بیشتر — چیزهایی که خودمان موقع نظرسنجی لازم داشتیم
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className={f.rotate}>
                <StickerCard theme={f.theme}>
                  <div className="p-5 flex flex-col gap-3 h-full">
                    <span className="text-3xl rotate-[3deg] self-start">{f.icon}</span>
                    <h3 className="text-lg font-black text-navy">{f.title}</h3>
                    <p className="text-sm font-semibold text-ink-subtle leading-7">{f.text}</p>
                  </div>
                </StickerCard>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── چطور کار می‌کند ─── */}
      <section id="how" className="py-14 lg:py-20 bg-bg-blush">
        <Container className="px-4">
          <h2 className="text-center text-3xl2 sm:text-4xl2 font-black text-navy mb-10">
            <RotatedWords
              words={[
                { text: "سه", rot: 2 },
                { text: "قدم", rot: -1.5 },
                { text: "تا", rot: 1 },
                { text: "اولین", rot: -1 },
                { text: "جواب", rot: 1.5 },
              ]}
            />
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className={s.rotate}>
                <StickerCard theme={s.theme}>
                  <div className="p-6 flex flex-col items-center text-center gap-3">
                    <span className="w-14 h-14 flex items-center justify-center bg-white border-2 border-ink rounded-full text-2xl font-black rotate-[4deg]">
                      {s.n}
                    </span>
                    <h3 className="text-xl font-black text-navy">{s.title}</h3>
                    <p className="text-sm font-semibold text-ink-subtle leading-7">{s.text}</p>
                  </div>
                </StickerCard>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── سوال‌های پرتکرار ─── */}
      <section id="faq" className="py-14 lg:py-20 bg-teal-light">
        <Container className="px-4">
          <h2 className="text-center text-3xl2 sm:text-4xl2 font-black text-navy mb-10">
            <RotatedWords
              words={[
                { text: "سوال", rot: -1.5 },
                { text: "پرتکرار", rot: 1.5 },
                { text: "هست؟", rot: -1 },
              ]}
            />
          </h2>
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            {FAQS.map((f, i) => (
              <div key={f.q} className={i % 2 ? "rotate-[0.4deg]" : "-rotate-[0.4deg]"}>
                <FaqItem q={f.q} a={f.a} defaultOpen={i === 0} />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── CTA پایانی ─── */}
      <section className="py-14 lg:py-20 bg-white">
        <Container className="px-4">
          <div className="rotate-[-0.6deg]">
            <StickerCard
              theme="navy"
              radius="rounded-tl-[2.5rem] rounded-br-[2.5rem] rounded-tr-none rounded-bl-none"
              className="max-w-3xl mx-auto"
            >
              <div className="p-8 sm:p-12 flex flex-col items-center text-center gap-5 bg-navy rounded-tl-[2.3rem] rounded-br-[2.3rem]">
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  <RotatedWords
                    words={[
                      { text: "اولین", rot: -2 },
                      { text: "نظرسنجیت", rot: 1.5 },
                      { text: "رو", rot: -1 },
                      { text: "همین", rot: 1 },
                      { text: "الان", rot: -1.5 },
                      { text: "بساز", rot: 2 },
                    ]}
                  />
                </h2>
                <p className="text-white/70 font-semibold max-w-md leading-8">
                  دو دقیقه وقت بگذار؛ یک فرم چهارسوالوله بساز و لینکش را بفرست. بقیه‌اش با ما.
                </p>
                <Button as={Link} to="/admin" variant="teal" size="lg" rotate="rotate-[1.5deg]">
                  ورود به پنل ادمین
                </Button>
              </div>
            </StickerCard>
          </div>
        </Container>
      </section>

      <PublicFooter />
    </div>
  );
}
