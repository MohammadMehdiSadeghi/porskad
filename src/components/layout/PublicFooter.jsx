export default function PublicFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div aria-hidden="true" className="absolute top-[0.1rem] left-[0.1rem] w-full h-full bg-teal-text rounded-[0_0.5rem_0_0.5rem] [corner-shape:squircle]" />
            <div className="relative w-8 h-8 bg-teal border-2 border-white/20 rounded-[0_0.5rem_0_0.5rem] [corner-shape:squircle] flex items-center justify-center">
              <span className="text-white font-black text-sm">پ</span>
            </div>
          </div>
          <span className="font-black text-lg">پرسکاد</span>
        </div>
        <p className="text-sm text-white/50">
          پلتفرم حرفه‌ای مدیریت فرم و تحلیل داده
        </p>
        <div className="text-xs text-white/35">
          © ۱۴۰۵ پرسکاد — ساخته‌شده با React + Supabase
        </div>
      </div>
    </footer>
  );
}
