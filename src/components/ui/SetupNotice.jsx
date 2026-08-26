import StickerCard from "./StickerCard";
import Button from "./Button";

// وقتی کلیدهای Supabase تنظیم نشده‌اند — راهنمای شروع سریع
export default function SetupNotice() {
  return (
    <div className="min-h-screen dot-pattern bg-bg-mint flex items-center justify-center p-4">
      <div className="w-full max-w-2xl -rotate-[0.5deg]">
        <StickerCard theme="white">
          <div className="p-7 sm:p-10 flex flex-col gap-4">
            <div className="text-5xl rotate-[2deg] self-start">🔌</div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy">
              پرس‌یار هنوز به دیتابیس وصل نشده!
            </h1>
            <p className="font-semibold text-ink-soft leading-8">
              برای راه‌اندازی، سه قدم ساده لازم است (جزئیات کامل در فایل
              <span className="font-black text-teal-text"> README.md </span>
              پروژه):
            </p>
            <ol className="list-decimal pr-6 space-y-2 font-semibold text-ink-soft leading-7 text-sm">
              <li>در <span className="font-black">supabase.com</span> یک پروژه بساز و فایل
                <span className="font-black"> supabase/migrations/0001_init.sql </span>
                را در SQL Editor اجرا کن.</li>
              <li>در بخش Authentication یک کاربر ادمین بساز (مثل admin@porsyar.ir).</li>
              <li>فایل <span className="font-black">.env.example</span> را به
                <span className="font-black"> .env </span> تغییر نام بده و Project URL و
                anon key را در آن قرار بده.</li>
            </ol>
            <div className="mt-2">
              <Button variant="navy" onClick={() => window.location.reload()}>
                بعد از تنظیم .env دوباره امتحان کن 🔄
              </Button>
            </div>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
