export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">پ</span>
          </div>
          <span className="font-black text-lg">پرسکاد</span>
        </div>
        <p className="text-sm text-gray-400">
          پلتفرم حرفه‌ای مدیریت فرم و تحلیل داده
        </p>
        <div className="text-xs text-gray-500">
          © ۱۴۰۵ پرسکاد — ساخته‌شده با React + Supabase
        </div>
      </div>
    </footer>
  );
}
