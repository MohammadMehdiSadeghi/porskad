import React from "react";

// ─── کامپوننت پایه اسکلتون با افکت شیمر و پالس هماهنگ با طراحی رکاد ───
export default function Skeleton({ className = "", rounded = "rounded-xl", ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/90 dark:bg-slate-700/60 ${rounded} ${className}`}
      {...props}
    />
  );
}

// ─── اسکلتون متنی ───
export function TextSkeleton({ className = "h-4 w-full", rounded = "rounded-lg" }) {
  return <Skeleton className={`${className} ${rounded}`} />;
}

// ─── اسکلتون کارت استیکری آمار (StatCardSkeleton) ───
export function StatCardSkeleton({ rotate = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border-2 border-ink dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-3 shadow-sticker ${rotate}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-lg bg-teal/20" />
        <Skeleton className="w-10 h-10 rounded-xl bg-male-light dark:bg-male-dark/40" />
      </div>
      <Skeleton className="h-9 w-20 rounded-xl my-1 bg-ink/10 dark:bg-slate-600" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28 rounded-md" />
        <Skeleton className="h-3 w-12 rounded-md bg-teal/20" />
      </div>
    </div>
  );
}

// ─── اسکلتون داشبورد (DashboardSkeleton) ───
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* سربرگ استیکری */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-xl bg-teal/20" />
            <Skeleton className="h-7 w-48 rounded-xl" />
          </div>
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-28 rounded-2xl border-2 border-ink/20" />
          <Skeleton className="h-11 w-36 rounded-2xl bg-teal/30 border-2 border-ink" />
        </div>
      </div>

      {/* ردیف آمارها استیکری */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCardSkeleton rotate="-rotate-[0.5deg]" />
        <StatCardSkeleton rotate="rotate-[0.5deg]" />
        <StatCardSkeleton rotate="-rotate-[0.3deg]" />
        <StatCardSkeleton rotate="rotate-[0.4deg]" />
      </div>

      {/* بخش پایینی: جدول پاسخ‌های اخیر و فرم‌ها */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-ink dark:border-slate-700 shadow-sticker space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink/10 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-lg bg-teal/20" />
              <Skeleton className="h-5 w-40 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-20 rounded-xl bg-male-light dark:bg-slate-800" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 bg-bg-neutral/70 dark:bg-slate-800/60 rounded-2xl border-2 border-ink/10 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl bg-teal/20" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-44 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-7 w-20 rounded-xl border border-ink/20 bg-female-light dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>

        {/* لیست سریع فرم‌ها */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-ink dark:border-slate-700 shadow-sticker space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-ink/10 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-lg bg-teal/20" />
              <Skeleton className="h-5 w-32 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-16 rounded-xl" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3.5 bg-bg-neutral/70 dark:bg-slate-800/60 rounded-2xl border-2 border-ink/10 dark:border-slate-800 space-y-2.5">
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <div className="flex justify-between items-center pt-1 border-t border-ink/5 dark:border-slate-700/50">
                  <Skeleton className="h-3 w-20 rounded-md bg-teal/20" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون کارت فرم (FormCardSkeleton) ───
export function FormCardSkeleton({ rotate = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border-2 border-ink dark:border-slate-700 rounded-3xl p-5 flex flex-col justify-between h-60 shadow-sticker ${rotate}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-24 rounded-full bg-teal/20 border border-ink/10" />
          <Skeleton className="w-8 h-8 rounded-xl bg-female-light dark:bg-slate-800" />
        </div>
        <Skeleton className="h-5 w-4/5 rounded-lg" />
        <Skeleton className="h-3.5 w-full rounded-md" />
        <Skeleton className="h-3.5 w-2/3 rounded-md" />
      </div>

      <div className="pt-3 border-t-2 border-ink/10 dark:border-slate-800 flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-xl border border-ink/20" />
          <Skeleton className="w-8 h-8 rounded-xl border border-ink/20" />
          <Skeleton className="w-8 h-8 rounded-xl bg-teal/30 border border-ink" />
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون لیست فرم‌ها (FormsListSkeleton) ───
export function FormsListSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* سربرگ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-12 w-40 rounded-2xl bg-teal/40 border-2 border-ink shadow-sticker-sm" />
      </div>

      {/* نوار جستجو و تب‌ها */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-2xl bg-teal/20" />
          <Skeleton className="h-10 w-28 rounded-2xl border border-ink/20" />
          <Skeleton className="h-10 w-28 rounded-2xl border border-ink/20" />
        </div>
        <Skeleton className="h-10 sm:w-72 rounded-2xl border border-ink/20" />
      </div>

      {/* شبکه کارت‌های فرم */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormCardSkeleton rotate="-rotate-[0.5deg]" />
        <FormCardSkeleton rotate="rotate-[0.4deg]" />
        <FormCardSkeleton rotate="-rotate-[0.3deg]" />
        <FormCardSkeleton rotate="rotate-[0.6deg]" />
        <FormCardSkeleton rotate="-rotate-[0.4deg]" />
        <FormCardSkeleton rotate="rotate-[0.3deg]" />
      </div>
    </div>
  );
}

// ─── اسکلتون پاسخ‌ها و آنالیتیکس (ResponsesSkeleton) ───
export function ResponsesSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* سربرگ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-xl bg-teal/20" />
            <Skeleton className="h-7 w-60 rounded-xl" />
          </div>
          <Skeleton className="h-4 w-36 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-11 w-28 rounded-2xl border-2 border-ink/20" />
          <Skeleton className="h-11 w-28 rounded-2xl border-2 border-ink/20" />
          <Skeleton className="h-11 w-24 rounded-2xl bg-teal/30 border-2 border-ink shadow-sticker-sm" />
        </div>
      </div>

      {/* خلاصه آمار */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker space-y-2">
            <Skeleton className="h-3.5 w-24 rounded-md bg-teal/20" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        ))}
      </div>

      {/* تب‌ها و فیلتر */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-2xl border-2 border-ink dark:border-slate-700 shadow-sticker">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl bg-teal/20" />
          <Skeleton className="h-9 w-28 rounded-xl border border-ink/20" />
          <Skeleton className="h-9 w-28 rounded-xl border border-ink/20" />
        </div>
        <Skeleton className="h-9 w-48 rounded-xl border border-ink/20" />
      </div>

      {/* جدول داده‌ها */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker overflow-hidden">
        <div className="p-5 border-b-2 border-ink/10 dark:border-slate-800 flex justify-between">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-5 w-40 rounded-lg" />
        </div>
        <div className="divide-y-2 divide-ink/5 dark:divide-slate-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-6 h-6 rounded-lg bg-teal/20" />
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-xl border border-ink/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون صفحه طرح‌ها و ارتقا (PlansSkeleton) ───
export function PlansSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto" dir="rtl">
      {/* سربرگ اصلی طرح‌ها */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-ink dark:border-slate-700 p-6 sm:p-8 shadow-sticker text-center space-y-3">
        <div className="inline-flex">
          <Skeleton className="h-7 w-32 rounded-full bg-teal/30 border border-ink" />
        </div>
        <Skeleton className="h-8 w-72 mx-auto rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full mx-auto rounded-lg" />

        {/* دکمه سوئیچ ماهانه / سالانه */}
        <div className="pt-4 flex justify-center">
          <Skeleton className="h-12 w-64 rounded-full border-2 border-ink/20 bg-bg-neutral/70" />
        </div>
      </div>

      {/* وضعیت فعلی اشتراک کاربر */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-ink dark:border-slate-700 p-6 shadow-sticker flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-right w-full md:w-auto">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-2xl bg-teal/20" />
            <div>
              <Skeleton className="h-5 w-40 rounded-lg" />
              <Skeleton className="h-3.5 w-28 rounded-md mt-1" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto">
          <div className="p-3.5 bg-bg-neutral/70 rounded-2xl border border-ink/10 space-y-1.5">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
          <div className="p-3.5 bg-bg-neutral/70 rounded-2xl border border-ink/10 space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
          <div className="p-3.5 bg-bg-neutral/70 rounded-2xl border border-ink/10 space-y-1.5 col-span-2 sm:col-span-1">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
        </div>
      </div>

      {/* کارت‌های ۴ پلن (رایگان، برنزی، نقره‌ای، طلایی) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { color: "bg-male-light/30", rotate: "-rotate-[0.4deg]" },
          { color: "bg-teal/20", rotate: "rotate-[0.3deg]" },
          { color: "bg-yellow/20", rotate: "-rotate-[0.5deg]" },
          { color: "bg-female-light/30", rotate: "rotate-[0.4deg]" },
        ].map((item, i) => (
          <div
            key={i}
            className={`bg-white dark:bg-slate-900 rounded-3xl border-2 border-ink dark:border-slate-700 p-6 shadow-sticker flex flex-col justify-between space-y-6 ${item.rotate}`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className={`w-10 h-10 rounded-2xl ${item.color}`} />
                <Skeleton className="h-6 w-20 rounded-full border border-ink/20" />
              </div>

              <div className="space-y-1.5">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-3.5 w-44 rounded-md" />
              </div>

              <div className="py-2 border-y-2 border-ink/10 space-y-1">
                <Skeleton className="h-8 w-28 rounded-lg" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>

              {/* لیست ویژگی‌ها */}
              <div className="space-y-2.5 pt-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded-md bg-teal/30 shrink-0" />
                    <Skeleton className="h-3.5 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </div>

            <Skeleton className="h-12 w-full rounded-2xl bg-teal/30 border-2 border-ink shadow-sticker-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── اسکلتون فرم‌ساز (FormBuilderSkeleton) ───
export function FormBuilderSkeleton() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col space-y-4 animate-fade-in" dir="rtl">
      {/* سربرگ بالای فرم‌ساز */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-3.5 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl bg-teal/20" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-20 rounded-2xl border border-ink/20" />
          <Skeleton className="h-10 w-24 rounded-2xl border border-ink/20" />
          <Skeleton className="h-10 w-28 rounded-2xl bg-teal/30 border-2 border-ink shadow-sticker-sm" />
        </div>
      </div>

      {/* بدنه سه ستونه */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* سایدبار سوالات */}
        <div className="col-span-3 bg-white dark:bg-slate-900 rounded-3xl border-2 border-ink dark:border-slate-700 p-4 flex flex-col space-y-3 shadow-sticker">
          <div className="flex items-center justify-between pb-2 border-b border-ink/10">
            <Skeleton className="h-5 w-24 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg bg-teal/20" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 bg-bg-neutral/70 dark:bg-slate-800/60 rounded-2xl border border-ink/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded-md bg-teal/20" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <Skeleton className="w-4 h-4 rounded-md" />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-2xl mt-auto bg-teal/30 border-2 border-ink" />
        </div>

        {/* ناحیه اصلی ویرایش سوال */}
        <div className="col-span-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-ink dark:border-slate-700 p-6 flex flex-col space-y-6 shadow-sticker">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-12 w-full rounded-2xl border border-ink/20" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-20 w-full rounded-2xl border border-ink/20" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <div className="space-y-2.5">
              <Skeleton className="h-11 w-full rounded-2xl border border-ink/10" />
              <Skeleton className="h-11 w-full rounded-2xl border border-ink/10" />
              <Skeleton className="h-11 w-3/4 rounded-2xl border border-ink/10" />
            </div>
          </div>
        </div>

        {/* پنل تنظیمات سمت چپ */}
        <div className="col-span-3 bg-white dark:bg-slate-900 rounded-3xl border-2 border-ink dark:border-slate-700 p-4 space-y-4 shadow-sticker">
          <Skeleton className="h-5 w-28 rounded-lg pb-2 border-b border-ink/10" />
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-xl bg-bg-neutral/50">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="w-10 h-5 rounded-full" />
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-bg-neutral/50">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="w-10 h-5 rounded-full" />
            </div>
            <div className="p-2 space-y-2">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-9 w-full rounded-xl border border-ink/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون پاسخ‌دهی و نمایش فرم (FormFillSkeleton) ───
export function FormFillSkeleton() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4" dir="rtl">
      {/* سربرگ پیشرفت */}
      <div className="w-full max-w-xl mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24 rounded-full bg-teal/20 border border-ink/10" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
        <Skeleton className="h-3 w-full rounded-full border border-ink/20 bg-bg-neutral" />
      </div>

      {/* کارت اصلی فرم با استایل استیکری رکاد */}
      <div className="w-full max-w-xl bg-white dark:bg-[#111827] rounded-3xl border-2 border-ink dark:border-slate-700 p-6 sm:p-8 space-y-6 shadow-sticker -rotate-[0.2deg]">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-28 rounded-full bg-teal/30 border border-ink" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-7 w-3/4 rounded-xl" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>

        {/* گزینه‌ها / ورودی‌ها */}
        <div className="space-y-3 pt-2">
          <Skeleton className="h-12 w-full rounded-2xl border-2 border-ink/10" />
          <Skeleton className="h-12 w-full rounded-2xl border-2 border-ink/10" />
          <Skeleton className="h-12 w-full rounded-2xl border-2 border-ink/10" />
        </div>

        {/* دکمه‌های ناوبری */}
        <div className="flex items-center justify-between pt-4 border-t-2 border-ink/10">
          <Skeleton className="h-11 w-24 rounded-2xl border-2 border-ink/20" />
          <Skeleton className="h-12 w-36 rounded-2xl bg-teal/40 border-2 border-ink shadow-sticker-sm" />
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون جدول عمومی (TableSkeleton) ───
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-ink dark:border-slate-700 p-6 space-y-4 shadow-sticker animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b-2 border-ink/10 dark:border-slate-800">
        <Skeleton className="h-6 w-36 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-2xl border border-ink/20" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center justify-between p-3.5 bg-bg-neutral/60 dark:bg-slate-800/50 rounded-2xl border border-ink/10 dark:border-slate-800">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-4 ${c === 0 ? "w-36" : c === cols - 1 ? "w-16" : "w-24"} rounded-md`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── اسکلتون اشتراک‌گذاری فرم (ShareFormSkeleton) ───
export function ShareFormSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-28 rounded-2xl border border-ink/20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker space-y-4">
          <Skeleton className="h-5 w-32 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-2xl border border-ink/20" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-full rounded-2xl border border-ink/20" />
            <Skeleton className="h-10 w-full rounded-2xl bg-teal/30 border border-ink" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-ink dark:border-slate-700 shadow-sticker space-y-4 flex flex-col items-center justify-center">
          <Skeleton className="w-40 h-40 rounded-3xl border-2 border-ink/20" />
          <Skeleton className="h-10 w-40 rounded-2xl border border-ink/20" />
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون لاگین و وضعیت ورود (AuthGuardSkeleton) ───
export function AuthGuardSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-neutral dark:bg-[#0B0F19] p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 border-ink dark:border-slate-700 shadow-sticker space-y-5 flex flex-col items-center">
        <Skeleton className="w-14 h-14 rounded-2xl bg-teal/30 border-2 border-ink" />
        <Skeleton className="h-6 w-36 rounded-lg" />
        <Skeleton className="h-4 w-48 rounded-md" />
        <Skeleton className="h-10 w-full rounded-2xl border border-ink/20 mt-2" />
      </div>
    </div>
  );
}
