import { Link } from "react-router-dom";
import StickerCard from "../components/ui/StickerCard";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen dot-pattern bg-bg-lavender flex items-center justify-center p-4">
      <div className="w-full max-w-md rotate-[1deg]">
        <StickerCard theme="orange">
          <div className="p-9 flex flex-col items-center text-center gap-4">
            <span className="text-6xl -rotate-[4deg]">🧭</span>
            <h1 className="text-4xl font-black text-navy">۴۰۴</h1>
            <p className="font-semibold text-ink-soft leading-8">
              صفحه‌ای که دنبالش بودی این‌جا نیست؛ شاید لینک عوض شده یا اشتباه اومده.
            </p>
            <Button as={Link} to="/" variant="navy">برگشت به خانه 🏠</Button>
          </div>
        </StickerCard>
      </div>
    </div>
  );
}
