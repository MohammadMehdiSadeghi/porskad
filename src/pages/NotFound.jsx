import { Link } from "react-router-dom";
import StickerCard from "../components/ui/StickerCard";
import Button from "../components/ui/Button";
import SEO from "../components/ui/SEO";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen dot-pattern bg-bg-lavender flex items-center justify-center p-4">
      <SEO title="صفحه یافت نشد" description="صفحه مورد نظر شما وجود ندارد." noIndex />
      <div className="w-full max-w-md rotate-[1deg]">
        <StickerCard theme="orange">
          <div className="p-9 flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-orange/15 text-orange flex items-center justify-center -rotate-[4deg] shadow-sm">
              <Compass size={44} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-navy">۴۰۴</h1>
            <p className="font-semibold text-ink-soft leading-8 text-sm sm:text-base">
              صفحه‌ای که دنبالش بودی این‌جا نیست؛ شاید لینک عوض شده یا اشتباه اومده.
            </p>
            <Button as={Link} to="/" variant="navy" className="flex items-center gap-1.5">
              <Home size={16} /> برگشت به خانه
            </Button>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
