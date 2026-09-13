# Porskad Design System

> مرجع نهایی توکن‌های بصری پروژه پرس‌کاد. بر اساس سیستم طراحی رکاد‌اسکول.

---

## ۱. اصول طراحی

- **هویت برند:** ۵ تم رنگی (اکوسیستم، پسر، دختر، کالج، کلوپ)
- **گوشه‌های نامتقارن:** الگوی `[corner-shape:squircle]`
- **چرخش ظریف:** المان‌ها با rotate جزئی (۱-۳ درجه)
- **سایه آفست:** امضای بصری برند با آفست ۲.۷۵px
- **RTL:** تمام رابط‌ها فارسی و راست‌به‌چپ

---

## ۲. رنگ‌ها

### ۲.۱ رنگ‌های اصلی

| توکن | مقدار | Tailwind |
|------|-------|----------|
| Primary | `#59BBAF` | `primary` |
| Girl | `#E0195B` | `girl` / `magenta` |
| Third | `#F8A41D` | `third` / `orange` |
| Sec | `#202A5A` | `sec` / `male-normal` |

### ۲.۲ تم اکوسیستم

| سطح | مقدار | Tailwind |
|-----|-------|----------|
| Light | `#EEF8F7` | `ecosystem-light` |
| Normal | `#59BBAF` | `ecosystem-normal` / `primary` |
| Dark | `#438C83` | `ecosystem-dark` |
| Darker | `#1F413D` | `ecosystem-darker` |

### ۲.۳ تم پسر

| سطح | مقدار | Tailwind |
|-----|-------|----------|
| Light | `#E9EAEF` | `male-light` |
| Normal | `#202A5A` | `male-normal` |
| Dark | `#182044` | `male-dark` |
| Darker | `#0B0F1F` | `male-darker` |

### ۲.۴ تم دختر

| سطح | مقدار | Tailwind |
|-----|-------|----------|
| Light | `#FCE8EF` | `female-light` |
| Normal | `#E0195B` | `female-normal` |
| Dark | `#A81344` | `female-dark` |
| Darker | `#4E0920` | `female-darker` |

### ۲.۵ تم کالج

| سطح | مقدار | Tailwind |
|-----|-------|----------|
| Light | `#FEF6E8` | `college-light` |
| Normal | `#F8A41D` | `college-normal` |
| Dark | `#BA7B16` | `college-dark` |
| Darker | `#57390A` | `college-darker` |

### ۲.۶ تم کلوپ

| سطح | مقدار | Tailwind |
|-----|-------|----------|
| Light | `#F0EAF4` | `club-light` |
| Normal | `#652D90` | `club-normal` |
| Dark | `#4C226C` | `club-dark` |
| Darker | `#231032` | `club-darker` |

### ۲.۷ رنگ‌های خنثی

| سطح | مقدار | Tailwind |
|-----|-------|----------|
| Light | `#EAEAE9` | `ink-light` |
| Normal | `#292827` | `ink` |
| Dark | `#1F1E1D` | `ink-dark` |
| Darker | `#0E0E0E` | `ink-darker` |

---

## ۳. تایپوگرافی

**فونت:** IRANSansX / Montserrat  
**وزن عناوین:** 800-950

| توکن | اندازه | ارتفاع خط |
|------|--------|-----------|
| xs | 11px | 16.5px |
| sm | 14px | 21px |
| base | 17px | 25.5px |
| md | 21px | 31.5px |
| lg | 26px | 38.5px |
| xl | 39px | 58.5px |
| 2xl | 49px | 73.5px |
| 3xl | 61px | 91.5px |

---

## ۴. شعاع گوشه

| توکن | مقدار | Tailwind |
|------|-------|----------|
| xs | 5px | `rounded-xs` |
| sm | 8px | `rounded-sm` |
| md | 12px | `rounded-md` |
| lg | 17px | `rounded-lg` |
| xl | 24px | `rounded-xl` |
| 2xl | 34px | `rounded-2xl` |
| pill | 40px | `rounded-pill` |

---

## ۵. سایه‌ها

| توکن | مقدار | Tailwind |
|------|-------|----------|
| ecosystem | `2.75px 2.75px 0 #59BBAF` | `shadow-ecosystem` |
| male | `2.75px 2.75px 0 #202A5A` | `shadow-male` |
| female | `2.75px 2.75px 0 #E0195B` | `shadow-female` |
| college | `2.75px 2.75px 0 #F8A41D` | `shadow-college` |
| club | `2.75px 2.75px 0 #652D90` | `shadow-club` |
| neutral | `2.75px 2.75px 0 #292827` | `shadow-neutral` |

---

## ۶. قوانین استفاده

1. **همیشه از توکن استفاده کنید، نه از هگز سخت**
2. **انتخاب تم:** اکوسیستم = عمومی، پسر/دختر = جنسیتی، کالج = دانشگاهی، کلوپ = انجمن
3. **سایه سخت** فقط برای المان‌های تاکیدی
4. **کنتراست:** `text-normal` روی `bg-white` یا `ink-light`

---

## ۷. Do / Don't

| ✅ Do | ❌ Don't |
|-------|---------|
| `bg-primary` | `bg-[#59BBAF]` |
| `rounded-md` | `rounded-[12px]` |
| `text-ink` | `text-[#292827]` |
| `shadow-ecosystem` | `shadow-[2.75px_2.75px_0_#59BBAF]` |
| `bg-ecosystem-light` | `bg-[#EEF8F7]` |

---

## ۸. حالت تیره (Dark Mode)

سیستم طراحی پرس‌کاد به صورت کامل از حالت تیره (Dark Mode) با مکانیزم کلاس‌محور پشتیبانی می‌کند.

### ۸.۱ مکانیزم فعال‌سازی
- فعال‌سازی از طریق افزودن کلاس `dark` به تگ `<html>` صورت می‌گیرد (`darkMode: "class"`).
- تم انتخاب شده کاربر به طور خودکار در `localStorage` ذخیره شده و با سیستم‌عامل (`prefers-color-scheme`) همگام می‌شود.

### ۸.۲ توکن‌های سطوح و متون تیره

| توکن | مقدار Hex | کلاس Tailwind | کاربرد |
|------|-----------|---------------|--------|
| Canvas | `#0B0F19` | `dark:bg-dark-canvas` / `dark:bg-[#0B0F19]` | پس‌زمینه اصلی کل صفحات و اپلیکیشن |
| Card | `#131B2E` | `dark:bg-dark-card` / `dark:bg-[#131B2E]` | پس‌زمینه کارت‌ها، پنل‌ها، هدر و مودال‌ها |
| Surface | `#1A233A` | `dark:bg-dark-surface` / `dark:bg-[#1A233A]` | سطوح لایه دوم، اینپوت‌ها، ردیف‌های انتخابی |
| Border | `#232F4A` | `dark:border-dark-border` / `dark:border-[#232F4A]` | کادر پیش‌فرض المان‌ها و خطوط جداکننده |
| Border Hover | `#3B4D75` | `dark:border-dark-borderHover` | حالت فوکوس و هاور روی کادرها |
| Muted | `#64748B` | `dark:text-dark-muted` | پلیس‌هولدرها و متون غیرفعال |
| Text | `#F1F5F9` | `dark:text-dark-text` / `dark:text-slate-100` | متن‌های اصلی، پاراگراف‌ها و مقادیر |
| Subtext | `#94A3B8` | `dark:text-dark-subtext` / `dark:text-slate-400` | زیرعنوان‌ها، توضیحات و متادیتا |

### ۸.۳ تم‌های ۵‌گانه برند در حالت تیره

| تم | پس‌زمینه کارت در دارک مود | کادر / بردر در دارک مود | متن شاخص در دارک مود |
|----|--------------------------|------------------------|---------------------|
| **اکوسیستم (عمومی)** | `rgba(45, 212, 191, 0.12)` یا `#0d2322` | `#2DD4BF` یا `dark:border-teal` | `#2DD4BF` (`dark:text-teal`) |
| **پسر (سازمانی)** | `#131B2E` یا `#11182c` | `#3B4D75` یا `dark:border-blue-500` | `#F8FAFC` (`dark:text-slate-100`) |
| **دختر (خلاقانه)** | `rgba(244, 114, 182, 0.12)` یا `#250d18` | `#FB7185` یا `dark:border-pink-500` | `#FB7185` (`dark:text-pink-300`) |
| **کالج (آموزشی)** | `rgba(251, 191, 36, 0.12)` یا `#261705` | `#FBBF24` یا `dark:border-amber-500` | `#FBBF24` (`dark:text-amber-300`) |
| **کلوپ (انجمن)** | `rgba(168, 85, 247, 0.15)` یا `#1e0d29` | `#C084FC` یا `dark:border-purple` | `#C084FC` (`dark:text-purple-300`) |

### ۸.۴ قوانین و الزامات دارک مود

1. **کنتراست بالا:** عناوین با `text-slate-100` یا `#F8FAFC` و متون بدنه با `text-slate-200` یا `#F1F5F9` نمایش داده می‌شوند.
2. **فیلدهای فرم:** اینپوت‌ها، تکست‌اریاها و سلکت‌ها در دارک مود دارای پس‌زمینه `#131B2E`، کادر `#232F4A` و رنگ متن `#F8FAFC` هستند.
3. **حفظ هویت بصری:** استیکرکارت دوسطحی، الگوی Squircle (`[corner-shape:squircle]`) و چرخش‌های ظریف (۱ تا ۳ درجه) در دارک مود نیز با رنگ‌های متناسب تیره و لایه پشتی تیره حفظ می‌شوند.
4. **سایه‌ها در دارک مود:** سایه‌های نرم المان‌های معلق با `box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.6)` جایگزین می‌شوند.

---

## ۹. منابع

- فایل مرجع: `Rokad-design-system.md` (در پروژه rokad-web)
- فایل تم: `tailwind.theme.json`
- تنظیمات Tailwind: `tailwind.config.js`
- CSS سراسری: `src/index.css`

