import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center text-center gap-4">
        <span className="text-6xl">🧭</span>
        <h1 className="text-4xl font-black text-gray-900">۴۰۴</h1>
        <p className="font-medium text-gray-500 leading-7">
          صفحه‌ای که دنبالش بودی این‌جا نیست؛ شاید لینک عوض شده یا اشتباه اومده.
        </p>
        <Button as={Link} to="/admin" variant="indigo">
          <Home size={16} />
          برگشت به داشبورد
        </Button>
      </div>
    </div>
  );
}
