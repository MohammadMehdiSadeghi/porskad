import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-mint flex items-center justify-center p-4">
      <div className="relative w-full max-w-md rotate-[0.5deg]">
        <div aria-hidden="true" className="absolute top-2 left-2 w-full h-full bg-navy rounded-[1.5rem] [corner-shape:squircle]" />
        <div className="relative z-10 bg-white border-2 border-navy rounded-[1.5rem] [corner-shape:squircle] p-8 flex flex-col items-center text-center gap-4">
          <span className="text-6xl">🧭</span>
          <h1 className="text-4xl font-black text-navy">۴۰۴</h1>
          <p className="font-medium text-ink/50 leading-7">
            صفحه‌ای که دنبالش بودی این‌جا نیست؛ شاید لینک عوض شده یا اشتباه اومده.
          </p>
          <Button as={Link} to="/admin" variant="teal">
            <Home size={16} />
            برگشت به داشبورد
          </Button>
        </div>
      </div>
    </div>
  );
}
