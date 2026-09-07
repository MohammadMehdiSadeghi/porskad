export default function PublicFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="w-full max-w-[75rem] mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <div className="rotate-[-2deg]">
          <span className="inline-flex items-baseline gap-1 bg-white border-[0.1875rem] border-ink [corner-shape:squircle] rounded-[0.85rem] px-3.5 py-1.5 text-2xl font-black shadow-sm">
            <span className="text-navy">پرس</span>
            <span className="text-teal-text">کاد</span>
          </span>
        </div>
        <p className="text-sm font-semibold text-white/70 text-center leading-7 max-w-md">
          سامانه هوشمند ساخت انواع فرم، آزمون و نظرسنجی آنلاین — راهکاری مدرن برای جمع‌آوری و تحلیل هوشمند داده‌ها.
        </p>
        <div className="text-xs font-medium text-white/50">
          © ۱۴۰۵ پرس‌کاد — نسخه ۲.۰
        </div>
      </div>
    </footer>
  );
}
