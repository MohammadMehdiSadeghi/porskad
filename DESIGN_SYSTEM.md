# Porskad Design System

> مرجع نهایی توکن‌های بصری پروژه پرسکاد. بر اساس سیستم طراحی رکاد‌اسکول.

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
| xs | 10px | 15px |
| sm | 13px | 19.5px |
| base | 16px | 24px |
| md | 20px | 30px |
| lg | 25px | 37.5px |
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

## ۸. منابع

- فایل مرجع: `Rokad-design-system.md` (در پروژه rokad-web)
- فایل تم: `tailwind.theme.json`
- تنظیمات Tailwind: `tailwind.config.js`
- CSS سراسری: `src/index.css`
