export default function PublicFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="w-full max-w-[75rem] mx-auto px-4 py-10 flex flex-col items-center gap-6">
        <div>
          <span className="inline-flex items-baseline gap-1 bg-white dark:bg-[#151C28] border-[1.5px] border-primary/40 rounded-xl px-3.5 py-1.5 text-2xl font-black shadow-[2.5px_2.5px_0_#59BBAF]">
            <span className="text-sec dark:text-white">پرس</span>
            <span className="text-primary">کاد</span>
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
