import React from "react";
import StickerCard from "./StickerCard";

// ════════════── اسکلتون‌های بارگذاری — بازتاب دقیق دیزاین‌سیستم پرس‌کاد
// همه از همان StickerCard دوسطحی (لایه رنگی + بوردر + squircle نامتقارن)
// و همان چیدمان، فاصله‌ها و کلاس‌های واقعی صفحات استفاده می‌کنند.

// ─── بلوک placeholder با شیمر نرم ───
export default function Skeleton({ className = "", rounded = "rounded-lg", ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer relative overflow-hidden bg-ink-light/70 dark:bg-slate-700/40 ${rounded} [corner-shape:squircle] ${className}`}
      {...props}
    />
  );
}

// ─── رنگ تم‌دار ملایم برای آیکون/بج‌ها ───
const tint = {
  teal: "bg-teal/20 dark:bg-teal-500/15",
  navy: "bg-navy/10 dark:bg-sky-400/10",
  orange: "bg-orange/20 dark:bg-orange-500/15",
  magenta: "bg-magenta/15 dark:bg-pink-500/10",
};

const radii = {
  card: "rounded-tl-[1.5rem] rounded-br-[1.5rem] rounded-tr-none rounded-bl-none",
  cardSm: "rounded-tl-[1.25rem] rounded-br-[1.25rem] rounded-tr-none rounded-bl-none",
  stat: "rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-none rounded-bl-none",
};

// ─── اسکلتون متنی ───
export function TextSkeleton({ className = "h-4 w-full", rounded = "rounded-lg" }) {
  return <Skeleton className={className} rounded={rounded} />;
}

// ─── سربرگ صفحه (عنوان + توضیح + دکمه) — مثل هدر واقعی داشبورد/فرم‌ها ───
function PageHeaderSkeleton({ titleW = "w-28", btnW = "w-28" }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <Skeleton className={`${titleW} h-7 sm:h-8`} rounded="rounded-xl" />
        <Skeleton className="h-3.5 w-52 mt-2" rounded="rounded-md" />
      </div>
      <Skeleton className={`${btnW} h-9`} rounded="rounded-pill-md" />
    </div>
  );
}

// ─── اسکلتون کارت آماری — آینه‌ی StatCard واقعی (بج، عدد درشت، کپشن) ───
export function StatCardSkeleton({ theme = "teal" }) {
  return (
    <StickerCard
      theme={theme}
      radius={radii.stat}
      rotate={theme === "teal" || theme === "navy" ? "-rotate-[1deg]" : "rotate-[1deg]"}
    >
      <div className="flex flex-col items-center text-center px-4 pt-3 pb-5 lg:pt-4 lg:pb-6">
        <span className="mb-2 lg:mb-4 inline-block w-20 h-6 rounded-xl [corner-shape:squircle] bg-white dark:bg-slate-900 border border-ink/10 dark:border-slate-700 skeleton-shimmer relative overflow-hidden" />
        <Skeleton className="h-9 lg:h-12 w-24" rounded="rounded-xl" />
        <Skeleton className="h-3 w-16 mt-3" rounded="rounded-md" />
      </div>
    </StickerCard>
  );
}

// ─── ردیف جدول با zebra مثل جدول واقعی داشبورد ───
function TableRowSkeleton({ cols, zebra }) {
  const widths = ["w-32", "w-24", "w-16", "w-14", "w-20"];
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 ${zebra ? "bg-bg-lavender/60 dark:bg-slate-800/50" : ""}`}>
      {Array.from({ length: cols }).map((_, c) => (
        <Skeleton key={c} className={`${widths[c % widths.length]} h-4`} rounded="rounded-md" />
      ))}
    </div>
  );
}

// ─── اسکلتون داشبورد — دقیقاً چیدمان واقعی: هدر، ۴ آمار، جدول آخرین پاسخ‌ها ───
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <PageHeaderSkeleton titleW="w-24" btnW="w-28" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
        <StatCardSkeleton theme="teal" />
        <StatCardSkeleton theme="orange" />
        <StatCardSkeleton theme="navy" />
        <StatCardSkeleton theme="magenta" />
      </div>

      <div>
        <Skeleton className="h-6 w-36 mb-3 sm:mb-4" rounded="rounded-lg" />
        <div className="rotate-[0.3deg]">
          <StickerCard theme="white" radius={radii.cardSm}>
            <div className="px-4 py-3 border-b-2 border-ink/10 dark:border-slate-800 flex items-center gap-6">
              {["w-20", "w-24", "w-16", "w-24", "w-16"].map((w, i) => (
                <Skeleton key={i} className={`${w} h-4`} rounded="rounded-md" />
              ))}
            </div>
            <div className="divide-y divide-ink/5 dark:divide-slate-800">
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={5} zebra={i % 2 === 1} />
              ))}
            </div>
          </StickerCard>
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون کارت فرم — مثل StickerCard سفید واقعی با بج و فوتر ───
function FormCardSkeleton({ flip }) {
  return (
    <StickerCard theme="white" rotate={flip ? "rotate-[0.5deg]" : "-rotate-[0.5deg]"}>
      <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-[9.5rem]">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-5 w-3/5" rounded="rounded-lg" />
          <div className="flex gap-1.5">
            <Skeleton className="h-6 w-14" rounded="rounded-pill" />
            <Skeleton className="h-6 w-12" rounded="rounded-pill" />
          </div>
        </div>
        <Skeleton className="h-3.5 w-4/5" rounded="rounded-md" />
        <Skeleton className="h-3.5 w-1/2" rounded="rounded-md" />
        <div className="mt-auto pt-3 border-t-2 border-ink/10 dark:border-slate-800 flex items-center justify-between">
          <Skeleton className="h-3.5 w-24" rounded="rounded-md" />
          <div className="flex gap-1.5">
            <Skeleton className="w-8 h-8" rounded="rounded-xl" />
            <Skeleton className={`w-8 h-8 ${tint.teal}`} rounded="rounded-xl" />
          </div>
        </div>
      </div>
    </StickerCard>
  );
}

// ─── اسکلتون لیست فرم‌ها — هدر + بنر سهمیه + جستجو/تب + شبکه‌ی کارت‌ها ───
export function FormsListSkeleton() {
  return (
    <div className="flex flex-col gap-5" dir="rtl">
      <PageHeaderSkeleton titleW="w-20" btnW="w-24" />

      {/* بنر سهمیه */}
      <div className="bg-white dark:bg-slate-800/90 border-2 border-teal/30 dark:border-teal-700/40 rounded-2xl [corner-shape:squircle] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 -rotate-[0.2deg]">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10" rounded="rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" rounded="rounded-md" />
            <Skeleton className="h-3 w-56" rounded="rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-28 sm:w-36 h-2" rounded="rounded-full" />
          <Skeleton className="h-8 w-24" rounded="rounded-pill-md" />
        </div>
      </div>

      {/* جستجو + تب‌های فیلتر */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Skeleton className="flex-1 min-w-[200px] h-11" rounded="rounded-pill-md" />
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800/90 border-2 border-ink/15 dark:border-slate-700 rounded-pill-md p-1 w-fit">
          <Skeleton className="h-8 w-16 bg-teal/20 dark:bg-teal-500/15" rounded="rounded-pill-sm" />
          <Skeleton className="h-8 w-14" rounded="rounded-pill-sm" />
          <Skeleton className="h-8 w-14" rounded="rounded-pill-sm" />
        </div>
      </div>

      {/* کارت‌ها */}
      <div className="grid sm:grid-cols-2 gap-3 lg:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <FormCardSkeleton key={i} flip={i % 2 === 1} />
        ))}
      </div>
    </div>
  );
}

// ─── کارت خلاصه کوچک — مثل SummaryCard واقعی صفحه پاسخ‌ها ───
function SummaryMiniSkeleton({ tintKey }) {
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl [corner-shape:squircle] border-2 border-ink/10 dark:border-slate-700 p-3.5">
      <div className="flex items-center gap-2.5">
        <Skeleton className={`w-9 h-9 shrink-0 ${tint[tintKey]}`} rounded="rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" rounded="rounded-md" />
          <Skeleton className="h-4 w-10" rounded="rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون پاسخ‌ها — هدر + ۴ کارت خلاصه + جدول ───
export function ResponsesSkeleton() {
  return (
    <div className="flex flex-col gap-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8" rounded="rounded-xl" />
          <Skeleton className="h-5 w-44" rounded="rounded-lg" />
          <Skeleton className="h-6 w-20" rounded="rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16" rounded="rounded-pill-md" />
          <Skeleton className="h-8 w-16" rounded="rounded-pill-md" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <SummaryMiniSkeleton tintKey="navy" />
        <SummaryMiniSkeleton tintKey="teal" />
        <SummaryMiniSkeleton tintKey="orange" />
        <SummaryMiniSkeleton tintKey="magenta" />
      </div>

      <div className="flex items-center justify-between bg-white dark:bg-slate-800/90 border-2 border-ink/10 dark:border-slate-700 rounded-2xl [corner-shape:squircle] p-2.5">
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-24 bg-teal/20 dark:bg-teal-500/15" rounded="rounded-xl" />
          <Skeleton className="h-8 w-24" rounded="rounded-xl" />
        </div>
        <Skeleton className="h-8 w-36" rounded="rounded-xl" />
      </div>

      <StickerCard theme="white" radius={radii.cardSm}>
        <div className="px-4 py-3 border-b-2 border-ink/10 dark:border-slate-800 flex items-center gap-6">
          {["w-16", "w-28", "w-20", "w-24"].map((w, i) => (
            <Skeleton key={i} className={`${w} h-4`} rounded="rounded-md" />
          ))}
        </div>
        <div className="divide-y divide-ink/5 dark:divide-slate-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={4} zebra={i % 2 === 1} />
          ))}
        </div>
      </StickerCard>
    </div>
  );
}

// ─── اسکلتون فرم‌ساز — هدر + سه پنل ───
export function FormBuilderSkeleton() {
  return (
    <div className="flex flex-col gap-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8" rounded="rounded-xl" />
          <Skeleton className="h-5 w-40" rounded="rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20" rounded="rounded-pill-md" />
          <Skeleton className="h-9 w-20" rounded="rounded-pill-md" />
          <Skeleton className="h-9 w-24 bg-teal/25 dark:bg-teal-500/20" rounded="rounded-pill-md" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* لیست سوالات */}
        <StickerCard theme="white" className="col-span-12 lg:col-span-3">
          <div className="p-4 flex flex-col gap-3">
            <Skeleton className="h-5 w-24" rounded="rounded-lg" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 bg-bg-neutral/80 dark:bg-slate-800/60 rounded-xl [corner-shape:squircle] p-2.5">
                <Skeleton className={`w-5 h-5 ${tint.teal}`} rounded="rounded-md" />
                <Skeleton className="h-3.5 flex-1" rounded="rounded-md" />
              </div>
            ))}
            <Skeleton className="h-10 w-full mt-auto bg-teal/25 dark:bg-teal-500/20" rounded="rounded-xl" />
          </div>
        </StickerCard>

        {/* ادیتور */}
        <StickerCard theme="teal" className="col-span-12 lg:col-span-6">
          <div className="p-5 sm:p-6 flex flex-col gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" rounded="rounded-md" />
              <Skeleton className="h-11 w-full" rounded="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" rounded="rounded-md" />
              <Skeleton className="h-24 w-full" rounded="rounded-xl" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-16" rounded="rounded-md" />
              <Skeleton className="h-11 w-full" rounded="rounded-xl" />
              <Skeleton className="h-11 w-full" rounded="rounded-xl" />
              <Skeleton className="h-11 w-3/4" rounded="rounded-xl" />
            </div>
          </div>
        </StickerCard>

        {/* تنظیمات */}
        <StickerCard theme="white" className="col-span-12 lg:col-span-3">
          <div className="p-4 flex flex-col gap-3">
            <Skeleton className="h-5 w-28" rounded="rounded-lg" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between bg-bg-neutral/80 dark:bg-slate-800/60 rounded-xl [corner-shape:squircle] p-2.5">
                <Skeleton className="h-4 w-20" rounded="rounded-md" />
                <Skeleton className="w-10 h-5" rounded="rounded-full" />
              </div>
            ))}
            <Skeleton className="h-11 w-full" rounded="rounded-xl" />
          </div>
        </StickerCard>
      </div>
    </div>
  );
}

// ─── اسکلتون پاسخ‌دهی عمومی — مثل صفحه /f واقعی: بار پیشرفته + کارت ───
export function FormFillSkeleton() {
  return (
    <div
      className="min-h-dvh dot-pattern bg-ecosystem-light dark:bg-[#0B0F19] flex flex-col"
      dir="rtl"
    >
      <div className="w-full max-w-[75rem] mx-auto flex items-center gap-2 px-3 sm:px-4 py-2">
        <Skeleton className="w-9 h-9" rounded="rounded-xl" />
        <Skeleton className="h-4 flex-1 max-w-[12rem]" rounded="rounded-md" />
      </div>
      <div className="w-full max-w-lg mx-auto px-3 pb-1">
        <Skeleton className="h-3 w-full" rounded="rounded-full" />
      </div>
      <div className="flex-1 flex items-start sm:items-center justify-center px-3 sm:px-4 py-3 sm:py-5">
        <div className="w-full max-w-2xl -rotate-[0.5deg]">
          <StickerCard theme="white" radius={radii.cardSm}>
            <div className="p-6 sm:p-8 flex flex-col gap-5">
              <Skeleton className="h-8 w-32 self-center" rounded="rounded-xl" />
              <div className="space-y-2.5">
                <Skeleton className="h-5 w-3/4" rounded="rounded-lg" />
                <Skeleton className="h-4 w-full" rounded="rounded-md" />
                <Skeleton className="h-4 w-2/3" rounded="rounded-md" />
              </div>
              <div className="space-y-3 pt-1">
                <Skeleton className="h-12 w-full" rounded="rounded-xl" />
                <Skeleton className="h-12 w-full" rounded="rounded-xl" />
                <Skeleton className="h-12 w-full" rounded="rounded-xl" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t-2 border-ink/10 dark:border-slate-800">
                <Skeleton className="h-10 w-24" rounded="rounded-pill-md" />
                <Skeleton className="h-11 w-36 bg-teal/25 dark:bg-teal-500/20" rounded="rounded-pill-md" />
              </div>
            </div>
          </StickerCard>
        </div>
      </div>
    </div>
  );
}

// ─── اسکلتون جدول عمومی ───
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="flex flex-col gap-4" dir="rtl">
      <PageHeaderSkeleton titleW="w-32" btnW="w-24" />
      <StickerCard theme="white" radius={radii.cardSm}>
        <div className="px-4 py-3 border-b-2 border-ink/10 dark:border-slate-800 flex items-center gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" rounded="rounded-md" />
          ))}
        </div>
        <div className="divide-y divide-ink/5 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, r) => (
            <TableRowSkeleton key={r} cols={cols} zebra={r % 2 === 1} />
          ))}
        </div>
      </StickerCard>
    </div>
  );
}

// ─── اسکلتون صفحه اشتراک‌گذاری ───
export function ShareFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8" rounded="rounded-xl" />
          <Skeleton className="h-6 w-44" rounded="rounded-lg" />
        </div>
        <Skeleton className="h-8 w-28" rounded="rounded-pill-md" />
      </div>

      <div className="bg-bg-mint dark:bg-slate-800/90 border border-teal/20 dark:border-teal/30 rounded-xl [corner-shape:squircle] px-4 py-3 flex items-center gap-3">
        <Skeleton className={`w-6 h-6 ${tint.teal}`} rounded="rounded-lg" />
        <Skeleton className="h-4 flex-1 max-w-xs" rounded="rounded-md" />
        <Skeleton className="h-8 w-20 ms-auto" rounded="rounded-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <StickerCard key={i} theme="white" radius={radii.card}>
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              <Skeleton className="h-5 w-32" rounded="rounded-lg" />
              <Skeleton className="h-11 w-full" rounded="rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" rounded="rounded-xl" />
                <Skeleton className={`h-10 w-24 ${tint.teal}`} rounded="rounded-xl" />
              </div>
              <Skeleton className="h-28 w-full" rounded="rounded-xl" />
            </div>
          </StickerCard>
        ))}
        <StickerCard theme="white" radius={radii.card}>
          <div className="p-5 sm:p-6 flex flex-col items-center justify-center gap-4 min-h-[14rem]">
            <Skeleton className="w-40 h-40" rounded="rounded-xl" />
            <Skeleton className="h-9 w-32" rounded="rounded-pill-md" />
          </div>
        </StickerCard>
      </div>
    </div>
  );
}

// ─── اسکلتون گارد ورود — کارت مجنتای کوچک روی پترن نقطه‌ای ───
export function AuthGuardSkeleton() {
  return (
    <div className="min-h-dvh dot-pattern bg-male-light dark:bg-[#0B0F19] flex items-center justify-center p-3" dir="rtl">
      <div className="w-full max-w-sm -rotate-[0.5deg]">
        <StickerCard theme="magenta">
          <div className="p-8 flex flex-col items-center gap-5">
            <Skeleton className="w-14 h-14 bg-magenta/15 dark:bg-pink-500/15" rounded="rounded-2xl" />
            <Skeleton className="h-5 w-36" rounded="rounded-lg" />
            <Skeleton className="h-3.5 w-48" rounded="rounded-md" />
            <Skeleton className="h-11 w-full" rounded="rounded-xl" />
            <Skeleton className="h-11 w-full bg-magenta/15 dark:bg-pink-500/15" rounded="rounded-xl" />
          </div>
        </StickerCard>
      </div>
    </div>
  );
}