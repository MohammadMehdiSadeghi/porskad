import { useState, useEffect, useMemo } from "react";
import * as jalaali from "jalaali-js";
import { faNum, toPersianDigits, PERSIAN_MONTH_NAMES, PERSIAN_WEEKDAY_NAMES } from "../../lib/utils";
import { Calendar, Clock, ChevronRight, ChevronLeft, AlertTriangle, Sparkles, Check } from "lucide-react";

/**
 * تبدیل تاریخ و ساعت شمسی به Date میلادی استاندارد
 */
export function jalaliToDate(jy, jm, jd, hour = 0, minute = 0) {
  const g = jalaali.toGregorian(jy, jm, jd);
  // توجه: ایجاد تاریخ با احتساب منطقه زمانی محلی ایران
  return new Date(g.gy, g.gm - 1, g.gd, hour, minute, 0, 0);
}

/**
 * تبدیل Date میلادی به شیء شمسی
 */
export function dateToJalali(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return {
    jy: j.jy,
    jm: j.jm,
    jd: j.jd,
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

export default function JalaliDateTimePicker({
  value,
  onChange,
  minMinutesAhead = 2,
  className = "",
  disabled = false,
}) {
  // حداقل زمان مجاز (به صورت پیش‌فرض ۲ دقیقه بعد از الان)
  const getMinAllowedDate = () => new Date(Date.now() + minMinutesAhead * 60 * 1000);

  // وضعیت جاری بر اساس مقدار ورودی یا ۵ دقیقه بعد
  const initialDate = useMemo(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // پیش‌فرض: ۱۰ دقیقه بعد، گرد شده به مضرب ۵ دقیقه
    const d = new Date(Date.now() + 10 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return d;
  }, [value]);

  const initialJalali = useMemo(() => dateToJalali(initialDate), [initialDate]);

  const [viewYear, setViewYear] = useState(initialJalali.jy);
  const [viewMonth, setViewMonth] = useState(initialJalali.jm);
  const [selectedYear, setSelectedYear] = useState(initialJalali.jy);
  const [selectedMonth, setSelectedMonth] = useState(initialJalali.jm);
  const [selectedDay, setSelectedDay] = useState(initialJalali.jd);
  const [selectedHour, setSelectedHour] = useState(String(initialJalali.hour).padStart(2, "0"));
  const [selectedMinute, setSelectedMinute] = useState(String(initialJalali.minute).padStart(2, "0"));

  // همگام‌سازی در صورت تغییر value از بیرون
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const j = dateToJalali(d);
        setSelectedYear(j.jy);
        setSelectedMonth(j.jm);
        setSelectedDay(j.jd);
        setViewYear(j.jy);
        setViewMonth(j.jm);
        setSelectedHour(String(j.hour).padStart(2, "0"));
        setSelectedMinute(String(j.minute).padStart(2, "0"));
      }
    }
  }, [value]);

  // محاسبه تعداد روزهای ماه جاری شمسی
  const daysInMonth = useMemo(() => {
    return jalaali.jalaaliMonthLength(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // روز اول ماه (برای شروع از شنبه = ۰ در تقویم ایران)
  const firstDayWeekday = useMemo(() => {
    const g = jalaali.toGregorian(viewYear, viewMonth, 1);
    const gDate = new Date(g.gy, g.gm - 1, g.gd);
    // روزهای جاوااسکریپت: یکشنبه ۰، دوشنبه ۱، ... شنبه ۶
    // در تقویم ایران: شنبه ۰، یکشنبه ۱، ... جمعه ۶
    const jsDay = gDate.getDay();
    return (jsDay + 1) % 7;
  }, [viewYear, viewMonth]);

  // تاریخ انتخاب‌شده فعلی به صورت Date میلادی
  const currentSelectedDate = useMemo(() => {
    return jalaliToDate(
      selectedYear,
      selectedMonth,
      selectedDay,
      parseInt(selectedHour, 10) || 0,
      parseInt(selectedMinute, 10) || 0
    );
  }, [selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute]);

  const isValidTime = useMemo(() => {
    const minAllowed = getMinAllowedDate();
    return currentSelectedDate.getTime() >= minAllowed.getTime() - 1000;
  }, [currentSelectedDate]);

  // بروزرسانی والد
  const triggerChange = (y, m, d, h, min) => {
    const dateObj = jalaliToDate(y, m, d, parseInt(h, 10) || 0, parseInt(min, 10) || 0);
    if (onChange) {
      onChange(dateObj.toISOString(), dateObj);
    }
  };

  const handleSelectDay = (day) => {
    setSelectedYear(viewYear);
    setSelectedMonth(viewMonth);
    setSelectedDay(day);
    triggerChange(viewYear, viewMonth, day, selectedHour, selectedMinute);
  };

  const handleHourChange = (newHour) => {
    setSelectedHour(newHour);
    triggerChange(selectedYear, selectedMonth, selectedDay, newHour, selectedMinute);
  };

  const handleMinuteChange = (newMin) => {
    setSelectedMinute(newMin);
    triggerChange(selectedYear, selectedMonth, selectedDay, selectedHour, newMin);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // دکمه‌های انتخاب سریع
  const handleQuickSelect = (offsetHours, specificHour = null) => {
    const target = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
    if (specificHour !== null) {
      target.setHours(specificHour, 0, 0, 0);
    }
    const j = dateToJalali(target);
    setSelectedYear(j.jy);
    setSelectedMonth(j.jm);
    setSelectedDay(j.jd);
    setViewYear(j.jy);
    setViewMonth(j.jm);
    const hStr = String(j.hour).padStart(2, "0");
    const mStr = String(j.minute).padStart(2, "0");
    setSelectedHour(hStr);
    setSelectedMinute(mStr);
    triggerChange(j.jy, j.jm, j.jd, hStr, mStr);
  };

  // محاسبه متن زمان نسبی (مثلاً: ۳ ساعت بعد)
  const relativeTimeLabel = useMemo(() => {
    const diffMs = currentSelectedDate.getTime() - Date.now();
    if (diffMs <= 0) return "زمان گذشته است!";
    const diffMins = Math.round(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;

    if (diffDays > 0) {
      return `${faNum(diffDays)} روز و ${faNum(remHours)} ساعت دیگر`;
    }
    if (diffHours > 0) {
      return `${faNum(diffHours)} ساعت و ${faNum(remMins)} دقیقه دیگر`;
    }
    return `${faNum(diffMins)} دقیقه دیگر`;
  }, [currentSelectedDate]);

  const todayJalali = useMemo(() => dateToJalali(new Date()), []);

  return (
    <div className={`flex flex-col gap-3.5 bg-white dark:bg-[#131B2E] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors ${className}`}>
      {/* سربرگ انتخاب‌گر تاریخ و زمان */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-teal" />
          <span className="text-xs sm:text-sm font-black text-navy dark:text-white">
            تعیین تاریخ و ساعت ارسال (شمسی — تهران)
          </span>
        </div>

        {/* پیش‌نمایش برچسب زمان انتخابی */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
              isValidTime
                ? "bg-teal/15 text-teal border border-teal/30 font-mono"
                : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900 font-mono"
            }`}
          >
            <Clock size={13} />
            <span>
              {faNum(selectedYear)}/{faNum(String(selectedMonth).padStart(2, "0"))}/{faNum(String(selectedDay).padStart(2, "0"))} — {faNum(selectedHour)}:{faNum(selectedMinute)}
            </span>
          </span>
        </div>
      </div>

      {/* دکمه‌های میانبر زمانبندی سریع */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400 ml-1">انتخاب سریع:</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleQuickSelect(1)}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1C2536] hover:bg-teal/15 hover:text-teal text-ink dark:text-slate-200 border border-gray-200 dark:border-[#242F42] transition-colors cursor-pointer"
        >
          ۱ ساعت بعد
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleQuickSelect(3)}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1C2536] hover:bg-teal/15 hover:text-teal text-ink dark:text-slate-200 border border-gray-200 dark:border-[#242F42] transition-colors cursor-pointer"
        >
          ۳ ساعت بعد
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleQuickSelect(24, 9)}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1C2536] hover:bg-teal/15 hover:text-teal text-ink dark:text-slate-200 border border-gray-200 dark:border-[#242F42] transition-colors cursor-pointer"
        >
          فردا ساعت ۰۹:۰۰
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleQuickSelect(24, 18)}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1C2536] hover:bg-teal/15 hover:text-teal text-ink dark:text-slate-200 border border-gray-200 dark:border-[#242F42] transition-colors cursor-pointer"
        >
          فردا ساعت ۱۸:۰۰
        </button>
      </div>

      {/* بدنه تقویم و ساعت */}
      <div className="grid md:grid-cols-12 gap-4">
        {/* بخش تقویم شمسی (8 ستون) */}
        <div className="md:col-span-8 flex flex-col gap-3 bg-[#FAFAFA] dark:bg-[#161F33] p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-[#242F42]">
          {/* ناوبری ماه و سال */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={disabled}
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#1C2536] text-ink-subtle hover:text-navy dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-[#242F42] transition-all cursor-pointer"
              title="ماه قبل"
            >
              <ChevronRight size={18} />
            </button>

            <div className="text-sm font-black text-navy dark:text-white flex items-center gap-1.5">
              <span>{PERSIAN_MONTH_NAMES[viewMonth - 1]}</span>
              <span className="font-mono text-teal">{faNum(viewYear)}</span>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#1C2536] text-ink-subtle hover:text-navy dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-[#242F42] transition-all cursor-pointer"
              title="ماه بعد"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* روزهای هفته */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-ink-subtle dark:text-slate-400 py-1 border-b border-gray-200/80 dark:border-[#242F42]/80">
            <span>ش</span>
            <span>ی</span>
            <span>د</span>
            <span>س</span>
            <span>چ</span>
            <span>پ</span>
            <span className="text-rose-500">ج</span>
          </div>

          {/* جدول روزهای ماه */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* خانه‌های خالی قبل از شروع ماه */}
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* روزهای ماه */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected =
                selectedYear === viewYear &&
                selectedMonth === viewMonth &&
                selectedDay === dayNum;

              const isToday =
                todayJalali.jy === viewYear &&
                todayJalali.jm === viewMonth &&
                todayJalali.jd === dayNum;

              // آیا این روز در گذشته است؟
              const gCheck = jalaali.toGregorian(viewYear, viewMonth, dayNum);
              const dayDate = new Date(gCheck.gy, gCheck.gm - 1, gCheck.gd, 23, 59, 59);
              const isPastDay = dayDate.getTime() < new Date().setHours(0, 0, 0, 0);

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  disabled={disabled || isPastDay}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center font-mono select-none cursor-pointer ${
                    isPastDay
                      ? "text-gray-300 dark:text-slate-600 opacity-40 cursor-not-allowed"
                      : isSelected
                      ? "bg-teal text-navy font-black shadow-md scale-105"
                      : isToday
                      ? "bg-teal/15 text-teal border border-teal/40 font-black hover:bg-teal/25"
                      : "text-ink dark:text-slate-200 hover:bg-white dark:hover:bg-[#1F2B42]"
                  }`}
                >
                  {faNum(dayNum)}
                </button>
              );
            })}
          </div>
        </div>

        {/* بخش انتخاب ساعت و دقیقه (4 ستون) */}
        <div className="md:col-span-4 flex flex-col justify-between gap-3 bg-[#FAFAFA] dark:bg-[#161F33] p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-[#242F42]">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-navy dark:text-white flex items-center gap-1.5">
              <Clock size={15} className="text-teal" />
              ساعت و دقیقه ارسال:
            </span>

            <div className="flex items-center justify-center gap-2 pt-2" dir="ltr">
              {/* دقیقه */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-ink-subtle dark:text-slate-400">دقیقه</span>
                <select
                  value={selectedMinute}
                  disabled={disabled}
                  onChange={(e) => handleMinuteChange(e.target.value)}
                  className="bg-white dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-xl px-3 py-2 text-base font-mono font-black text-navy dark:text-white text-center focus:border-teal focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 60 }).map((_, i) => {
                    const str = String(i).padStart(2, "0");
                    return (
                      <option key={`min-${i}`} value={str}>
                        {faNum(str)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <span className="text-xl font-black text-teal pb-4">:</span>

              {/* ساعت */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-ink-subtle dark:text-slate-400">ساعت</span>
                <select
                  value={selectedHour}
                  disabled={disabled}
                  onChange={(e) => handleHourChange(e.target.value)}
                  className="bg-white dark:bg-[#1C2536] border-[1.5px] border-gray-200 dark:border-[#242F42] rounded-xl px-3 py-2 text-base font-mono font-black text-navy dark:text-white text-center focus:border-teal focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const str = String(i).padStart(2, "0");
                    return (
                      <option key={`hr-${i}`} value={str}>
                        {faNum(str)}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* خلاصه و برآورد زمان */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-200/80 dark:border-[#242F42]/80">
            <div className="flex items-center justify-between text-[11px] font-semibold text-ink-subtle dark:text-slate-400">
              <span>فاصله تا ارسال:</span>
              <strong className={`font-bold ${isValidTime ? "text-teal" : "text-rose-500"}`}>
                {relativeTimeLabel}
              </strong>
            </div>

            {!isValidTime && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                <AlertTriangle size={12} className="shrink-0" />
                <span>حداقل ۲ دقیقه بعد از زمان کنونی انتخاب شود.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
