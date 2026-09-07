import StickerCard from "./StickerCard";
import Button from "./Button";
import { Plug, RotateCcw } from "lucide-react";

export default function SetupNotice() {
  return (
    <div className="min-h-screen dot-pattern bg-bg-mint flex items-center justify-center p-4">
      <div className="w-full max-w-2xl -rotate-[0.5deg]">
        <StickerCard theme="white">
          <div className="p-7 sm:p-10 flex flex-col gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal/15 text-teal flex items-center justify-center rotate-[2deg] self-start shadow-xs">
              <Plug size={32} />
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-navy">
              پرس‌کاد هنوز به دیتابیس وصل نشده!
            </h1>
            <p className="font-semibold text-ink-soft leading-8">
              برای راه‌اندازی، سه قدم ساده لازم است:
            </p>
            <ol className="list-decimal pr-6 space-y-2 font-semibold text-ink-soft leading-7 text-sm">
              <li>در <span className="font-black">supabase.com</span> یک پروژه بسازید و فایل migration را در SQL Editor اجرا کنید.</li>
              <li>در بخش Authentication یک کاربر ادمین بسازید.</li>
              <li>فایل <span className="font-black">.env.example</span> را به <span className="font-black">.env</span> تغییر نام دهید و کلیدها را قرار دهید.</li>
            </ol>
            <div className="mt-2">
              <Button variant="navy" onClick={() => window.location.reload()} className="flex items-center gap-1.5">
                <RotateCcw size={15} /> بعد از تنظیم .env دوباره امتحان کن
              </Button>
            </div>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
