import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "../../components/ui/clsx";
import { faNum, faDuration } from "../../lib/utils";
import { validateAnswer, validateUploadedFile, getFileAcceptString, getAllowedExtensions } from "../../lib/validators";
import { Star, GitFork, Check, ArrowUp, ArrowDown, Upload, FileCheck, CreditCard, ChevronDown, Image, Info, Layers, ExternalLink } from "lucide-react";

function CheckIcon({ className }) {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>);
}
function ClockIcon({ className }) {
  return (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
}
function FlagIcon({ className }) {
  return (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>);
}
function TelegramIcon({ className }) {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/></svg>);
}

const STEP_THEMES = [
  { bg: "bg-white dark:bg-[#131b2e]", border: "border-ink/10 dark:border-slate-700", label: "text-male-normal dark:text-teal", backBg: "bg-ink dark:bg-black" },
  { bg: "bg-ecosystem-light dark:bg-[#0c2322]", border: "border-ecosystem-normal/20 dark:border-teal/30", label: "text-ecosystem-dark dark:text-teal", backBg: "bg-ecosystem-dark dark:bg-teal/10" },
  { bg: "bg-male-light dark:bg-[#11182c]", border: "border-male-normal/10 dark:border-blue-500/30", label: "text-male-normal dark:text-blue-300", backBg: "bg-male-dark dark:bg-slate-950" },
  { bg: "bg-female-light dark:bg-[#250d18]", border: "border-female-normal/10 dark:border-pink-500/30", label: "text-female-dark dark:text-pink-300", backBg: "bg-female-dark dark:bg-pink-950" },
  { bg: "bg-white dark:bg-[#131b2e]", border: "border-ink/10 dark:border-slate-700", label: "text-male-normal dark:text-teal", backBg: "bg-ink dark:bg-black" },
  { bg: "bg-ecosystem-light dark:bg-[#0c2322]", border: "border-ecosystem-normal/20 dark:border-teal/30", label: "text-ecosystem-dark dark:text-teal", backBg: "bg-ecosystem-dark dark:bg-teal/10" },
];
function getStepTheme(i) { return STEP_THEMES[i % STEP_THEMES.length]; }

// ─── ورودی‌های متنی (متن کوتاه، بلند، ایمیل، تلفن، عدد، لینک، تلگرام) ───
function TextInput({ type, value, onChange, error, autoFocus = true, inputRef, onEnter, placeholder: customPlaceholder, question }) {
  const ph = (customPlaceholder && customPlaceholder.trim()) || {
    short_text: "پاسخ خود را بنویسید...",
    long_text: "پاسخ خود را بنویسید...",
    email: "example@email.com",
    phone_ir: "۰۹۱۲۳۴۵۶۷۸۹",
    national_id: "کد ملی ۱۰ رقمی (مثلاً ۰۰۱۲۳۴۵۶۷۸)",
    number: "مثلاً: ۱۲۳",
    link: "https://example.com",
    telegram_id: "username@",
  }[type] || "پاسخ خود را بنویسید...";

  const hasValue = Boolean(value != null && String(value).trim().length > 0);
  const isLtrType = type === "email" || type === "phone_ir" || type === "telegram_id" || type === "link" || type === "national_id";
  const activeDir = hasValue && isLtrType ? "ltr" : "rtl";
  const activeAlign = hasValue && isLtrType ? "text-left" : "text-right";

  const maxLen = type === "short_text" ? 255 : type === "national_id" ? 10 : (question?.validation?.maxLength || question?.max_length || undefined);
  const currentLength = value ? String(value).length : 0;

  const shared = clsx(
    "w-full bg-white dark:bg-slate-800 border-2 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3",
    "font-semibold text-ink dark:text-white text-sm sm:text-base placeholder:text-ink-subtle/60 dark:placeholder:text-slate-500 placeholder:font-medium",
    "placeholder:text-right placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-ecosystem-normal/15 transition-all duration-200",
    error ? "border-female-normal" : "border-ink/15 dark:border-slate-700 focus:border-ecosystem-normal",
  );

  if (type === "long_text") {
    return (
      <div className="flex flex-col gap-1 w-full">
        <textarea
          ref={inputRef}
          dir="rtl"
          value={value ?? ""}
          maxLength={maxLen}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          autoFocus={autoFocus}
          className={clsx(shared, "resize-y min-h-[6rem] leading-8 text-right")}
          placeholder={ph}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
        />
        {maxLen && (
          <div className="flex justify-end text-xs font-bold text-ink-subtle/70 mt-1" dir="ltr">
            {faNum(currentLength)} / {faNum(maxLen)}
          </div>
        )}
      </div>
    );
  }

  if (type === "telegram_id") {
    return (
      <div className="relative">
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <TelegramIcon className="text-ecosystem-dark" />
        </span>
        <input
          ref={inputRef}
          type="text"
          dir={activeDir}
          value={value ?? ""}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          className={clsx(shared, activeAlign, "pr-9")}
          placeholder={ph}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="relative">
        {type === "phone_ir" && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-subtle">
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
              <path d="M12 18h.01"/>
            </svg>
          </span>
        )}
        {type === "link" && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <ExternalLink size={16} className="text-ink-subtle" />
          </span>
        )}
        <input
          ref={inputRef}
          type={type === "email" ? "email" : type === "link" ? "url" : "text"}
          maxLength={maxLen}
          inputMode={type === "number" ? "numeric" : type === "phone_ir" ? "tel" : type === "email" ? "email" : type === "link" ? "url" : "text"}
          dir={activeDir}
          value={value ?? ""}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          className={clsx(shared, activeAlign, (type === "phone_ir" || type === "link") && "pr-9")}
          placeholder={ph}
        />
      </div>
      {type === "short_text" && currentLength > 180 && (
        <div className="flex justify-end text-xs font-bold text-ink-subtle/70 mt-1" dir="ltr">
          {faNum(currentLength)} / {faNum(255)}
        </div>
      )}
    </div>
  );
}

// ─── چندگزینه‌ای (Choice) ───
function ChoiceOptions({ options = [], value, onChange, onEnter, displayMode = "buttons", maxSelections = 1 }) {
  const isMulti = maxSelections > 1;
  const selectedArr = isMulti ? (Array.isArray(value) ? value : (value != null ? [value] : [])) : [];
  const atLimit = isMulti && selectedArr.length >= maxSelections;

  function handleMultiToggle(opt) {
    const cur = [...selectedArr];
    const idx = cur.indexOf(opt);
    if (idx >= 0) {
      cur.splice(idx, 1);
    } else if (cur.length < maxSelections) {
      cur.push(opt);
    }
    onChange(cur.length > 0 ? cur : null);
  }

  if (displayMode === "dropdown" && !isMulti) {
    return (
      <select
        value={value || ""}
        onChange={(e) => { const v = e.target.value || null; onChange(v); }}
        className="w-full bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 focus:border-ecosystem-normal focus:ring-2 focus:ring-ecosystem-normal/15 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:px-4 sm:py-3.5 font-bold text-sm sm:text-base text-ink dark:text-white focus:outline-none transition-all duration-200 cursor-pointer text-right"
      >
        <option value="">یک گزینه انتخاب کنید...</option>
        {options.map((opt, i) => (
          <option key={i} value={typeof opt === "object" ? opt.text : opt}>{typeof opt === "object" ? opt.text : opt}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {isMulti && (
        <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">
          حداکثر {faNum(maxSelections)} گزینه انتخاب کنید {selectedArr.length > 0 && `(${faNum(selectedArr.length)} انتخاب شده)`}
        </span>
      )}
      {options.map((item, i) => {
        const opt = typeof item === "object" ? item.text : item;
        const selected = isMulti ? selectedArr.includes(opt) : value === opt;
        const disabled = !selected && isMulti && atLimit;
        return (
          <button key={i} type="button" onClick={() => isMulti ? handleMultiToggle(opt) : onChange(opt)}
            disabled={disabled}
            className={clsx("relative group flex items-center gap-2.5 text-right w-full border-2 rounded-pill-md [corner-shape:squircle] px-3.5 py-2.5 sm:py-3 transition-all duration-200 cursor-pointer hover:-translate-y-px",
              disabled ? "opacity-40 cursor-not-allowed hover:translate-y-0" : "",
              selected
                ? "border-ecosystem-normal bg-ecosystem-light dark:bg-teal/10 rotate-[-0.5deg]"
                : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:border-ecosystem-normal/50 dark:hover:border-teal/50",
            )}>
            {selected && <div aria-hidden="true" className="absolute top-[2px] left-[2px] w-full h-full bg-ecosystem-dark/15 rounded-pill-md [corner-shape:squircle] pointer-events-none" />}
            {isMulti ? (
              <span className={clsx("relative z-10 w-7 h-7 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center rounded-md border-2 font-black text-xs sm:text-sm transition-colors duration-200",
                selected ? "border-ecosystem-normal bg-ecosystem-normal text-white" : "border-ink/15 dark:border-slate-600 text-male-normal dark:text-slate-300 group-hover:border-ecosystem-normal",
              )}>{selected ? <Check size={14} className="stroke-[3]" /> : null}</span>
            ) : (
              <span className={clsx("relative z-10 w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center rounded-full border-2 font-black text-sm sm:text-base transition-colors duration-200",
                selected ? "border-ecosystem-normal bg-ecosystem-normal text-white" : "border-ink/15 dark:border-slate-600 text-male-normal dark:text-slate-300 group-hover:border-ecosystem-normal",
              )}>{faNum(i + 1)}</span>
            )}
            <span className={clsx("relative z-10 font-bold text-sm sm:text-base", selected ? "text-ecosystem-dark dark:text-teal" : "text-ink dark:text-slate-200")}>{opt}</span>
            {selected && <CheckIcon className="mr-auto text-ecosystem-normal shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── چندگزینه‌ای تصویری (Picture Choice) ───
function PictureChoiceOptions({ options = [], value, onChange, maxSelections = 1 }) {
  const isMulti = maxSelections > 1;
  const selectedArr = isMulti ? (Array.isArray(value) ? value : (value != null ? [value] : [])) : [];

  function handleToggle(optText) {
    if (isMulti) {
      const cur = [...selectedArr];
      const idx = cur.indexOf(optText);
      if (idx >= 0) cur.splice(idx, 1);
      else if (cur.length < maxSelections) cur.push(optText);
      onChange(cur.length > 0 ? cur : null);
    } else {
      onChange(optText);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isMulti && (
        <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">
          حداکثر {faNum(maxSelections)} تصویر انتخاب کنید
        </span>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
        {options.map((item, i) => {
          const optText = typeof item === "object" ? item.text || `تصویر ${i + 1}` : String(item);
          const optImage = typeof item === "object" ? item.image : "";
          const selected = isMulti ? selectedArr.includes(optText) : value === optText;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleToggle(optText)}
              className={clsx(
                "group relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-200 cursor-pointer text-right hover:-translate-y-1 shadow-xs",
                selected
                  ? "border-teal bg-teal/10 dark:bg-teal/10 ring-2 ring-teal/30 scale-[1.02]"
                  : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal/50"
              )}
            >
              {/* تصویر */}
              <div className="relative w-full aspect-square bg-navy/5 dark:bg-slate-900/60 overflow-hidden flex items-center justify-center">
                {optImage ? (
                  <img
                    src={optImage}
                    alt={optText}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Image size={36} className="text-ink/30 dark:text-slate-600" />
                )}
                {/* نشانگر وضعیت */}
                <div className={clsx(
                  "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shadow-md transition-all",
                  selected ? "bg-teal text-white scale-110" : "bg-white/80 dark:bg-slate-800/80 text-navy dark:text-white border border-ink/10"
                )}>
                  {selected ? <Check size={13} className="stroke-[3]" /> : faNum(i + 1)}
                </div>
              </div>
              {/* عنوان متن */}
              <div className="p-2 sm:p-2.5 flex items-center justify-between gap-1">
                <span className={clsx("text-xs sm:text-sm font-bold truncate", selected ? "text-teal-text dark:text-teal font-black" : "text-ink dark:text-slate-200")}>
                  {optText}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── لیست کشویی (Dropdown) ───
function DropdownSelect({ options = [], value, onChange, placeholder = "یک گزینه انتخاب کنید..." }) {
  return (
    <div className="relative w-full">
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full appearance-none bg-white dark:bg-slate-800 border-2 border-ink/15 dark:border-slate-700 focus:border-teal focus:ring-4 focus:ring-teal/15 rounded-pill-md px-4 py-3 sm:py-3.5 font-bold text-sm sm:text-base text-ink dark:text-white focus:outline-none transition-all cursor-pointer text-right pr-4 pl-10"
      >
        <option value="">{placeholder}</option>
        {options.map((opt, i) => (
          <option key={i} value={typeof opt === "object" ? opt.text : opt}>
            {typeof opt === "object" ? opt.text : opt}
          </option>
        ))}
      </select>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-subtle dark:text-slate-400">
        <ChevronDown size={18} />
      </div>
    </div>
  );
}

// ─── بله / خیر (Yes/No) ───
function YesNoOptions({ value, onChange }) {
  const opts = [{ label: "بله", theme: "ecosystem" }, { label: "خیر", theme: "female" }];
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      {opts.map((o) => {
        const selected = value === o.label;
        const active = selected
          ? o.theme === "ecosystem" ? "border-ecosystem-normal bg-ecosystem-light dark:bg-teal/10 text-ecosystem-dark dark:text-teal" : "border-female-normal bg-female-light dark:bg-pink-950/50 text-female-dark dark:text-pink-300"
          : "border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-ink dark:text-slate-200";
        return (
          <button key={o.label} type="button" onClick={() => { onChange(o.label); }}
            className={clsx("flex flex-col items-center gap-1.5 border-2 rounded-pill-md [corner-shape:squircle] py-4 sm:py-5 text-base sm:text-lg font-black transition-all duration-200 hover:-translate-y-px cursor-pointer",
              active, selected && "rotate-[-0.5deg]",
            )}>
            <span className="text-xl sm:text-2xl">
              {o.label === "بله"
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>
              }
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── طیفی (مقیاس لیکرت - Likert Scale) ───
function LikertScale({ options = [], value, onChange }) {
  const defaultOpts = ["کاملاً مخالفم", "مخالفم", "نظری ندارم", "موافقم", "کاملاً موافقم"];
  const list = options.length > 0 ? options : defaultOpts;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 w-full">
        {list.map((opt, i) => {
          const optText = typeof opt === "object" ? opt.text : opt;
          const selected = value === optText;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(optText)}
              className={clsx(
                "flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-xl border-2 transition-all cursor-pointer text-center",
                selected
                  ? "border-teal bg-teal text-white font-black shadow-md scale-[1.02] -rotate-[0.5deg]"
                  : "border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 hover:border-teal/50 font-bold"
              )}
            >
              <span className="text-xs sm:text-sm">{optText}</span>
              <span className={clsx("text-[10px] mt-1 font-mono", selected ? "text-white/80" : "text-ink/40 dark:text-slate-400")}>
                ({faNum(i + 1)})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── شاخص وفاداری و امتیازدهی ۰ تا ۱۰ (NPS) ───
function NpsScale({ value, onChange, minLabel = "اصلاً احتمال ندارد", maxLabel = "بسیار زیاد" }) {
  const currentVal = value !== null && value !== undefined ? Number(value) : null;

  return (
    <div className="flex flex-col gap-3 w-full py-1">
      <div className="grid grid-cols-11 gap-1 sm:gap-1.5 w-full" dir="ltr">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
          const selected = currentVal === n;
          // تم رنگی بر اساس امتیاز NPS
          const colorClass = n <= 6
            ? (selected ? "bg-amber-500 border-amber-600 text-white" : "hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30")
            : n <= 8
            ? (selected ? "bg-teal border-teal text-white" : "hover:border-teal/60 hover:bg-teal/5")
            : (selected ? "bg-emerald-600 border-emerald-700 text-white" : "hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30");

          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={clsx(
                "h-10 sm:h-12 flex items-center justify-center rounded-xl border-2 font-black text-sm sm:text-base transition-all cursor-pointer shadow-xs",
                selected
                  ? `${colorClass} scale-110 shadow-md ring-2 ring-teal/30 z-10 font-black`
                  : `border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 text-ink dark:text-slate-200 ${colorClass}`
              )}
            >
              {faNum(n)}
            </button>
          );
        })}
      </div>
      {/* برچسب‌های دو طرف */}
      <div className="flex items-center justify-between text-xs font-extrabold text-ink-subtle dark:text-slate-400 px-1">
        <span>{minLabel} (۰)</span>
        <span>{maxLabel} (۱۰)</span>
      </div>
    </div>
  );
}

// ─── ستاره امتیاز (Rating) ───
function RatingStars({ value, onChange }) {
  const [hover, setHover] = useState(null);
  const current = hover ?? Number(value ?? 0);
  return (
    <div className="flex flex-row-reverse justify-center items-center gap-1.5 sm:gap-2.5 w-full py-2" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => {
        const isFilled = n <= current;
        return (
          <button
            key={n}
            type="button"
            className="p-1 cursor-pointer transition-transform duration-150 hover:scale-115"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}
            aria-label={`${n} ستاره`}
          >
            <Star
              size={28}
              className={isFilled ? "text-amber-400 fill-amber-400 drop-shadow-xs" : "text-ink/20 fill-transparent"}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─── ماتریسی / جدول سوالات (Matrix) ───
function MatrixTable({ question, value = {}, onChange }) {
  const rows = question.validation?.rows || question.rows || ["کیفیت خدمات", "سرعت پاسخگویی", "سهولت استفاده"];
  const columns = question.validation?.columns || question.columns || ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "عالی"];
  const state = (typeof value === "object" && value !== null) ? value : {};

  function handleCell(row, col) {
    onChange({ ...state, [row]: col });
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border-2 border-ink/10 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 sm:p-3">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b-2 border-ink/10 dark:border-slate-700">
            <th className="text-right py-2.5 px-3 font-black text-navy dark:text-white">موضوع / سوال</th>
            {columns.map((c, i) => (
              <th key={i} className="text-center py-2.5 px-2 font-bold text-ink-subtle dark:text-slate-300">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-ink/5 dark:border-slate-700/60 last:border-0 hover:bg-navy/5 dark:hover:bg-slate-700/30">
              <td className="py-3 px-3 font-bold text-ink dark:text-slate-100">{r}</td>
              {columns.map((c, ci) => {
                const isSelected = state[r] === c;
                return (
                  <td key={ci} className="py-3 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleCell(r, c)}
                      className={clsx(
                        "w-5 h-5 sm:w-6 sm:h-6 mx-auto rounded-full border-2 flex items-center justify-center transition-all cursor-pointer",
                        isSelected
                          ? "border-teal bg-teal text-white ring-2 ring-teal/30 scale-110"
                          : "border-ink/20 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-teal/60"
                      )}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── اولویت‌دهی / رتبه‌بندی (Ranking) ───
function RankingList({ options = [], value, onChange }) {
  const defaultList = options.length > 0 ? options : ["گزینه اول", "گزینه دوم", "گزینه سوم"];
  const ranked = (Array.isArray(value) && value.length === defaultList.length) ? value : defaultList;

  function move(idx, dir) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= ranked.length) return;
    const copy = [...ranked];
    const temp = copy[idx];
    copy[idx] = copy[nextIdx];
    copy[nextIdx] = temp;
    onChange(copy);
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <span className="text-xs font-bold text-ink-subtle dark:text-slate-400 mb-1">
        با دکمه‌های بالا و پایین، گزینه‌ها را به ترتیب اولویت و اهمیت بچینید:
      </span>
      {ranked.map((opt, i) => {
        const text = typeof opt === "object" ? opt.text : opt;
        return (
          <div
            key={i}
            className="flex items-center justify-between gap-3 p-3 rounded-xl border-2 border-ink/15 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-navy dark:bg-teal text-white dark:text-navy font-black text-xs flex items-center justify-center">
                {faNum(i + 1)}
              </span>
              <span className="text-sm font-bold text-ink dark:text-slate-100">{text}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="w-7 h-7 rounded-lg border border-ink/20 dark:border-slate-600 bg-navy/5 dark:bg-slate-700 flex items-center justify-center text-ink dark:text-white disabled:opacity-30 cursor-pointer hover:bg-teal hover:text-white transition-colors"
                title="افزایش اولویت"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === ranked.length - 1}
                className="w-7 h-7 rounded-lg border border-ink/20 dark:border-slate-600 bg-navy/5 dark:bg-slate-700 flex items-center justify-center text-ink dark:text-white disabled:opacity-30 cursor-pointer hover:bg-teal hover:text-white transition-colors"
                title="کاهش اولویت"
              >
                <ArrowDown size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── متن توضیحی / بدون پاسخ (Statement) ───
function StatementCard({ question, onAdvance }) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-navy/5 dark:bg-slate-800/80 border-2 border-dashed border-teal/40 dark:border-teal/30 text-center items-center">
      <div className="w-12 h-12 rounded-2xl bg-teal/15 text-teal flex items-center justify-center shadow-xs">
        <Info size={24} />
      </div>
      <p className="text-xs sm:text-sm font-semibold text-ink dark:text-slate-300 leading-7">
        {question.description || "لطفاً توضیحات بالا را مطالعه کرده و برای رفتن به سوال بعدی روی دکمه ادامه کلیک کنید."}
      </p>
      <button
        type="button"
        onClick={onAdvance}
        className="mt-2 bg-teal hover:bg-teal/90 text-white rounded-pill-md px-6 py-2.5 font-black text-sm shadow-md transition-all cursor-pointer"
      >
        متوجه شدم / ادامه ←
      </button>
    </div>
  );
}

// ─── گروه سوال / بخش‌بندی (Group Divider) ───
function GroupDivider({ question, onAdvance }) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-gradient-to-br from-navy/10 via-teal/5 to-navy/5 dark:from-slate-800 dark:to-slate-900 border-2 border-teal/40 text-center items-center">
      <div className="w-12 h-12 rounded-2xl bg-navy dark:bg-teal text-white dark:text-navy flex items-center justify-center shadow-md">
        <Layers size={24} />
      </div>
      <h3 className="text-base sm:text-lg font-black text-navy dark:text-white">{question.title || "بخش جدید"}</h3>
      {question.description && (
        <p className="text-xs sm:text-sm font-medium text-ink-subtle dark:text-slate-300 max-w-md leading-6">
          {question.description}
        </p>
      )}
      <button
        type="button"
        onClick={onAdvance}
        className="mt-2 bg-navy dark:bg-teal text-white dark:text-navy rounded-pill-md px-6 py-2.5 font-black text-sm shadow-md hover:scale-[1.02] transition-all cursor-pointer"
      >
        شروع این بخش ←
      </button>
    </div>
  );
}

// ─── آپلود فایل (File Upload) ───
function FileUploadBox({ question, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const fileInputRef = useRef(null);

  const allowedExts = getAllowedExtensions(question);
  const maxMb = question.validation?.max_file_size_mb || question.max_file_size_mb || 10;
  const acceptStr = getFileAcceptString(question);

  function handleFile(e) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // اعتبارسنجی محدودیت پسوند و حجم
    const check = validateUploadedFile(file, question);
    if (!check.isValid) {
      setFileError(check.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setTimeout(() => {
      onChange({
        name: file.name,
        size: file.size,
        type: file.type,
        ext: file.name.split(".").pop()?.toLowerCase() || "",
        uploadedAt: new Date().toISOString(),
      });
      setUploading(false);
    }, 400);
  }

  function handleRemove() {
    setFileError(null);
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptStr}
        onChange={handleFile}
        className="hidden"
      />

      {value ? (
        <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-teal bg-teal/5 dark:bg-teal/10">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-xl bg-teal/10 dark:bg-teal/40 flex items-center justify-center shrink-0">
              <FileCheck size={22} className="text-teal" />
            </div>
            <div className="truncate text-right">
              <span className="text-xs sm:text-sm font-black text-navy dark:text-white truncate block">
                {typeof value === "object" ? value.name : "فایل بارگذاری شده"}
              </span>
              {typeof value === "object" && value.size && (
                <span className="text-[11px] font-mono text-ink-subtle dark:text-slate-400">
                  {faNum((value.size / (1024 * 1024)).toFixed(2))} MB ({faNum(Math.round(value.size / 1024))} KB)
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-bold text-magenta-text hover:underline cursor-pointer mr-2 shrink-0 bg-magenta/10 hover:bg-magenta/20 px-3 py-1.5 rounded-lg transition-all"
          >
            تغییر فایل
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed border-ink/20 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:border-teal dark:hover:border-teal hover:bg-teal/5 transition-all cursor-pointer group"
        >
          <Upload size={36} className="text-ink/30 dark:text-slate-500 group-hover:text-teal group-hover:scale-110 transition-all mb-2.5" />
          <span className="text-xs sm:text-sm font-black text-navy dark:text-white">
            {uploading ? "در حال پردازش فایل..." : "برای انتخاب یا آپلود فایل کلیک کنید"}
          </span>
          
          {/* راهنمای محدودیت پسوند و حجم */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400 bg-black/5 dark:bg-slate-700/60 px-2.5 py-1 rounded-full">
              حداکثر حجم: {faNum(maxMb)} مگابایت
            </span>
            <span className="text-[11px] font-bold text-ink-subtle dark:text-slate-400 bg-black/5 dark:bg-slate-700/60 px-2.5 py-1 rounded-full">
              {allowedExts.length > 0 ? `پسوندهای مجاز: ${allowedExts.join("، ")}` : "همه فرمت‌ها آزاد است"}
            </span>
          </div>
        </button>
      )}

      {fileError && (
        <div className="flex items-center gap-1.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold animate-fadeIn">
          <Info size={16} className="shrink-0" />
          <span>{fileError}</span>
        </div>
      )}
    </div>
  );
}

// ─── درگاه پرداخت (Payment) ───
function PaymentBox({ question, value, onChange }) {
  const amount = question.validation?.amount || question.amount || 100000;
  const currency = question.validation?.currency || question.currency || "تومان";
  const isPaid = Boolean(value);

  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl border-2 border-orange/40 bg-orange/5 dark:bg-amber-950/20 text-center items-center">
      <CreditCard size={36} className="text-orange" />
      <span className="text-xs font-bold text-ink-subtle dark:text-slate-400">مبلغ قابل پرداخت</span>
      <span className="text-2xl sm:text-3xl font-black text-navy dark:text-white">
        {faNum(amount.toLocaleString("fa-IR"))} <span className="text-sm font-bold text-orange">{currency}</span>
      </span>

      {isPaid ? (
        <div className="flex items-center gap-1.5 text-xs font-bold text-teal bg-teal/10 border border-teal/30 px-3 py-1.5 rounded-full">
          <Check size={14} /> پرداخت با موفقیت شبیه‌سازی شد
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onChange({ paid: true, amount, currency, txId: `mock_${Date.now()}` })}
          className="mt-1 bg-orange hover:bg-orange-alt text-white rounded-pill-md px-6 py-2.5 font-black text-sm shadow-md hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-2"
        >
          <CreditCard size={16} /> پرداخت آنلاین و ادامه
        </button>
      )}
    </div>
  );
}

// ─── کامپوننت اصلی اجرای مرحله به مرحله سوال ───
export default function QuestionStep({ question, index, total, value, timeSpent, onChange, onAdvance }) {
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);
  const valueRef = useRef(value);

  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { setError(null); setTouched(false); }, [question.id]);
  useEffect(() => {
    if (touched && value !== undefined && value !== null && String(value).trim() !== "") {
      setError(validateAnswer(question, value));
    }
  }, [value, question, touched]);

  const handleChange = useCallback((val) => {
    onChange(val); setTouched(true); setError(validateAnswer(question, val));
  }, [question, onChange]);

  const handleNext = useCallback(() => {
    setTouched(true);
    const err = validateAnswer(question, valueRef.current);
    setError(err);
    if (!err) onAdvance();
  }, [question, onAdvance]);

  const theme = getStepTheme(index);

  return (
    <div className="relative">
      <div aria-hidden="true" className={clsx("absolute top-1.5 left-1.5 w-full h-full", theme.backBg, "rounded-tl-[1rem] rounded-br-[1rem] rounded-tr-none rounded-bl-none [corner-shape:squircle]")} />

      <div className={clsx("relative z-10 flex flex-col gap-3.5 sm:gap-4 rounded-tl-[1rem] rounded-br-[1rem] rounded-tr-none rounded-bl-none [corner-shape:squircle] border-2 p-4 sm:p-5 lg:p-6 transition-colors duration-300 overflow-hidden", theme.bg, theme.border)}>
        {/* شماره + برچسب */}
        <div className="flex items-center justify-between gap-2">
          <span className={clsx("text-xs sm:text-sm font-black flex items-center gap-1", theme.label)}>
            <FlagIcon className="opacity-50" /> سوال {faNum(index + 1)} از {faNum(total)}
          </span>
          <div className="flex items-center gap-1 mr-auto">
            {question.conditions && (
              <span className="text-xs font-bold text-male-normal dark:text-blue-300 bg-male-light dark:bg-slate-800 rounded-pill-sm px-2 py-0.5 flex items-center gap-1">
                <GitFork size={12} /> شرطی
              </span>
            )}
            {question.type === "statement" || question.type === "group" ? (
              <span className="text-xs font-bold text-teal bg-teal/10 dark:bg-teal/10 rounded-pill-sm px-2 py-0.5">اطلاعاتی</span>
            ) : question.required ? (
              <span className="text-xs font-bold text-female-normal dark:text-pink-300 bg-female-light dark:bg-pink-950/40 rounded-pill-sm px-2 py-0.5 flex items-center gap-0.5">اجباری</span>
            ) : (
              <span className="text-xs font-bold text-ink-subtle dark:text-slate-400 bg-bg-neutral dark:bg-slate-800 rounded-pill-sm px-2 py-0.5">اختیاری</span>
            )}
          </div>
        </div>

        {/* عنوان */}
        <h2 className="text-[17px] leading-[26px] sm:text-[20px] sm:leading-[30px] font-black text-male-normal dark:text-white">
          {question.title}{question.required && question.type !== "statement" && question.type !== "group" && <span className="text-female-normal mr-0.5">*</span>}
        </h2>
        {question.description && <p className="text-xs sm:text-sm font-semibold text-ink-subtle dark:text-slate-400 leading-6 -mt-1.5">{question.description}</p>}

        {/* فیلد پاسخ بر اساس نوع سوال */}
        {(question.type === "short_text" || question.type === "long_text" || question.type === "email" || question.type === "number" || question.type === "phone_ir" || question.type === "link" || question.type === "telegram_id" || question.type === "national_id") && (
          <TextInput type={question.type} value={value} error={error} onChange={handleChange} onEnter={handleNext} placeholder={question.placeholder} question={question} />
        )}
        {question.type === "choice" && <ChoiceOptions options={question.options} value={value} onChange={handleChange} onEnter={handleNext} displayMode={question.display_mode || "buttons"} maxSelections={question.max_selections ?? 1} />}
        {question.type === "picture_choice" && <PictureChoiceOptions options={question.options} value={value} onChange={handleChange} maxSelections={question.max_selections ?? 1} />}
        {question.type === "dropdown" && <DropdownSelect options={question.options} value={value} onChange={handleChange} placeholder={question.placeholder} />}
        {question.type === "yes_no" && <YesNoOptions value={value} onChange={handleChange} />}
        {question.type === "likert" && <LikertScale options={question.options} value={value} onChange={handleChange} />}
        {question.type === "nps" && <NpsScale value={value} onChange={handleChange} minLabel={question.validation?.min_label || question.min_label} maxLabel={question.validation?.max_label || question.max_label} />}
        {question.type === "rating" && <RatingStars value={value} onChange={(val) => handleChange(val)} />}
        {question.type === "matrix" && <MatrixTable question={question} value={value} onChange={handleChange} />}
        {question.type === "ranking" && <RankingList options={question.options} value={value} onChange={handleChange} />}
        {question.type === "statement" && <StatementCard question={question} onAdvance={handleNext} />}
        {question.type === "group" && <GroupDivider question={question} onAdvance={handleNext} />}
        {question.type === "file_upload" && <FileUploadBox question={question} value={value} onChange={handleChange} />}
        {question.type === "payment" && <PaymentBox question={question} value={value} onChange={handleChange} />}

        {/* ارور */}
        {error && (
          <div className="self-start rotate-[-0.5deg] bg-white border-2 border-female-normal rounded-pill-md [corner-shape:squircle] px-2.5 py-1.5 text-xs sm:text-sm font-bold text-female-normal flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {error}
          </div>
        )}

        {timeSpent > 5 && (
          <span className="text-xs font-medium text-ink-subtle/60 self-start flex items-center gap-1">
            <ClockIcon className="text-ink-subtle/40" /> {faDuration(timeSpent)} روی این سوال
          </span>
        )}
      </div>
    </div>
  );
}
