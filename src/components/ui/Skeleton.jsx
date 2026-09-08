import React from "react";

// ─── کامپوننت پایه اسکلتون با افکت شیمر/پالس ───
export default function Skeleton({ className = "", rounded = "rounded-xl", ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/80 ${rounded} ${className}`}
      {...props}
    />
  );
}

// ─── اسکلتون متنی ───
export function TextSkeleton({ className = "h-4 w-full", rounded = "rounded-lg" }) {
  return <Skeleton className={`${className} ${rounded}`} />;
}

// ─── اسکلتون کارت آمار ───
export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-ink/10 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-xs">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg my-1" />
      <Skeleton className="h-3 w-32 rounded-md" />
    </div>
  );
}

// ─── اسکلتون داشبورد (DashboardSkeleton) ───
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* سربرگ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-ink/10 dark:border-slate-800 shadow-xs">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* ردیف آمارها */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* بخش پایینی: جدول پاسخ‌های اخیر و فرم‌ها */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-ink/10 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 bg-bg-neutral/50 dark:bg-slate-800/50 rounded-xl border border-ink/5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* لیست سریع فرم‌ها */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-ink/10 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-bg-neutral/50 dark:bg-slate-800/50 rounded-xl border border-ink/5 dark:border-slate-800 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <div className="flex justify-between items-center pt-1">
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
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
export function FormCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-ink/10 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between h-56 shadow-xs">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="w-7 h-7 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded-md" />
        <Skeleton className="h-3.5 w-full rounded-md" />
        <Skeleton className="h-3.5 w-2/3 rounded-md" />
      </div>

      <div className="pt-4 border-t border-ink/5 dark:border-slate-800 flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-md" />
        <div className="flex gap-1.5">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-8 h-8 rounded-lg" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-4 w-60 rounded-md" />
        </div>
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>

      {/* نوار جستجو و تب‌ها */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-ink/10 dark:border-slate-800">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <Skeleton className="h-9 sm:w-64 rounded-xl" />
      </div>

      {/* شبکه کارت‌های فرم */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <FormCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── اسکلتون پاسخ‌ها و آنالیتیکس (ResponsesSkeleton) ───
export function ResponsesSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* سربرگ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-ink/10 dark:border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-md" />
            <Skeleton className="h-6 w-52 rounded-md" />
          </div>
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-20 rounded-xl" />
        </div>
      </div>

      {/* خلاصه آمار */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-ink/10 dark:border-slate-800 space-y-2">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>

      {/* تب‌ها و فیلتر */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-ink/10 dark:border-slate-800">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-44 rounded-lg" />
      </div>

      {/* جدول داده‌ها */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-ink/10 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-ink/5 dark:border-slate-800 flex justify-between">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
        <div className="divide-y divide-ink/5 dark:divide-slate-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-5 h-5 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-40 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-7 w-14 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون فرم‌ساز (FormBuilderSkeleton) ───
export function FormBuilderSkeleton() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col space-y-4 animate-fade-in" dir="rtl">
      {/* سربرگ بالای فرم‌ساز */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-3.5 rounded-2xl border border-ink/10 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* بدنه سه ستونه / دو ستونه */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* سایدبار سوالات */}
        <div className="col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-ink/10 dark:border-slate-800 p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between mb-1">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 bg-bg-neutral/60 dark:bg-slate-800/60 rounded-xl border border-ink/5 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <Skeleton className="w-4 h-4 rounded-md" />
            </div>
          ))}
          <Skeleton className="h-10 w-full rounded-xl mt-auto" />
        </div>

        {/* ناحیه اصلی ویرایش سوال */}
        <div className="col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-ink/10 dark:border-slate-800 p-6 flex flex-col space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-16 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-3/4 rounded-xl" />
            </div>
          </div>
        </div>

        {/* پنل تنظیمات سمت چپ */}
        <div className="col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-ink/10 dark:border-slate-800 p-4 space-y-4">
          <Skeleton className="h-5 w-28 rounded-md" />
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="w-10 h-5 rounded-full" />
            </div>
            <div className="flex items-center justify-between p-2">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="w-10 h-5 rounded-full" />
            </div>
            <div className="p-2 space-y-2">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون پاسخ‌دهی و نمایش فرم (FormFillSkeleton / EmbedSkeleton) ───
export function FormFillSkeleton() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4" dir="rtl">
      {/* سربرگ لوگو / پیشرفت */}
      <div className="w-full max-w-xl mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* کارت اصلی فرم */}
      <div className="w-full max-w-xl bg-white dark:bg-[#111827] rounded-3xl border-2 border-ink/10 dark:border-slate-700 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-7 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3 rounded-md" />
        </div>

        {/* گزینه‌ها / ورودی‌ها */}
        <div className="space-y-3 pt-2">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>

        {/* دکمه‌های ناوبری */}
        <div className="flex items-center justify-between pt-4">
          <Skeleton className="h-10 w-20 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون جدول عمومی (TableSkeleton) ───
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-ink/10 dark:border-slate-800 p-5 space-y-4 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between pb-2 border-b border-ink/5 dark:border-slate-800">
        <Skeleton className="h-6 w-36 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center justify-between p-3.5 bg-bg-neutral/40 dark:bg-slate-800/40 rounded-xl border border-ink/5 dark:border-slate-800/60">
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
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-2xl border border-ink/10 dark:border-slate-800">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-ink/10 dark:border-slate-800 space-y-4">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-ink/10 dark:border-slate-800 space-y-4 flex flex-col items-center justify-center">
          <Skeleton className="w-36 h-36 rounded-2xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون لاگین و وضعیت ورود (AuthGuardSkeleton) ───
export function AuthGuardSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-neutral dark:bg-[#0B0F19] p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-ink/10 dark:border-slate-800 shadow-xl space-y-4 flex flex-col items-center">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-3.5 w-48 rounded-md" />
      </div>
    </div>
  );
}
