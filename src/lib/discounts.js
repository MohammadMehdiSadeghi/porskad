// ══════════════════════════════════════════════════════════════
// مدیریت کدهای تخفیف پرس‌کاد (Porskad Discount System)
// ذخیره در دیتابیس (system_settings.discount_codes) + کش محلی localStorage
// پشتیبانی کامل از تخفیف‌های درصدی، مبلغ ثابت، سقف تخفیف، محدودیت نفرات،
// تاریخ انقضا و تفکیک بر اساس طرح‌های اشتراک
// ══════════════════════════════════════════════════════════════

import { supabase } from "./supabaseClient.js";

export const DISCOUNTS_STORAGE_KEY = "porskad_discount_codes_cache";
export const DISCOUNTS_DB_KEY = "discount_codes";

// نمونه کدهای پیش‌فرض سامانه
export const DEFAULT_DISCOUNT_CODES = [
  {
    id: "disc-welcome",
    code: "WELCOME20",
    title: "تخفیف خوش‌آمدگویی",
    type: "percent", // "percent" | "fixed"
    value: 20, // 20%
    maxDiscountToman: 50000, // حداکثر ۵۰ هزار تومان تخفیف
    minPurchaseToman: 0,
    maxUses: 100, // سقف ۱۰۰ نفر
    usedCount: 14,
    expiresAt: null, // دائمی
    applicablePlans: [], // برای همه طرح‌ها
    isActive: true,
    createdAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "disc-pro-special",
    code: "PRO50",
    title: "تخفیف ویژه ارتقا به طرح حرفه‌ای",
    type: "percent",
    value: 50,
    maxDiscountToman: 150000,
    minPurchaseToman: 50000,
    maxUses: 50,
    usedCount: 28,
    expiresAt: "2027-03-20T23:59:59.000Z", // معتبر تا پایان سال ۱۴۰۵ شمسی (۲۹ اسفند)
    applicablePlans: ["pro"],
    isActive: true,
    createdAt: "2026-03-05T00:00:00.000Z",
  },
];

/**
 * دریافت کدهای تخفیف فعال و ذخیره‌شده (ابتدا از کش محلی، سپس از سرور)
 */
export function getCachedDiscountCodes() {
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(DISCOUNTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read discount codes from localStorage:", e);
  }
  return DEFAULT_DISCOUNT_CODES;
}

/**
 * بارگذاری کدهای تخفیف از دیتابیس Supabase
 */
export async function loadDiscountCodes() {
  try {
    // ابتدا از جدول system_settings
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", DISCOUNTS_DB_KEY)
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      saveToLocalCache(data.value);
      return data.value;
    }
  } catch (err) {
    console.warn("Failed to load discount codes from DB, falling back to cache:", err);
  }
  return getCachedDiscountCodes();
}

/**
 * ذخیره در کش محلی و ارسال رویداد جهت سینک تب‌ها
 */
function saveToLocalCache(codes) {
  try {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(DISCOUNTS_STORAGE_KEY, JSON.stringify(codes));
      window.dispatchEvent(new CustomEvent("porskad:discounts_changed", { detail: codes }));
    }
  } catch (e) {
    console.error("Failed to write discount codes to cache:", e);
  }
}

/**
 * ذخیره کدهای تخفیف در دیتابیس و کش محلی
 */
export async function saveDiscountCodes(codes) {
  const sanitized = Array.isArray(codes) ? codes : [];
  saveToLocalCache(sanitized);

  try {
    // ذخیره در system_settings از طریق RPC مالک
    const { error } = await supabase.rpc("update_system_settings", {
      p_settings: {
        [DISCOUNTS_DB_KEY]: sanitized,
      },
    });
    if (error) {
      console.warn("DB sync warning for discount codes:", error);
      return { ok: true, dbError: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.warn("Discount DB sync threw:", err);
    return { ok: true, dbError: err.message };
  }
}

/**
 * تولید کد تخفیف تصادفی شیک
 */
export function generateRandomCouponCode(prefix = "PORS") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${random}`.toUpperCase();
}

/**
 * اعتبارسنجی کد تخفیف برای یک خرید مشخص
 * @param {string} rawCode - کد وارد شده توسط کاربر
 * @param {string} planId - شناسه طرح انتخابی (pro, enterprise, ...)
 * @param {number} originalPriceRial - قیمت پایه فاکتور به ریال
 * @param {Array} customCodesList - اختیاری: لیست کدها
 * @returns {{ valid: boolean, error?: string, discount?: object }}
 */
export function validateDiscountCode(rawCode, planId, originalPriceRial = 0, customCodesList = null) {
  if (!rawCode || !rawCode.trim()) {
    return { valid: false, error: "لطفاً کد تخفیف را وارد کنید." };
  }

  const normalizedInput = rawCode.trim().toUpperCase();
  const codes = customCodesList || getCachedDiscountCodes();
  const target = codes.find((c) => c.code?.trim()?.toUpperCase() === normalizedInput);

  if (!target) {
    return { valid: false, error: "کد تخفیف وارد شده معتبر نیست یا وجود ندارد." };
  }

  if (!target.isActive) {
    return { valid: false, error: "این کد تخفیف در حال حاضر غیرفعال شده است." };
  }

  // بررسی تاریخ انقضا
  if (target.expiresAt) {
    const expireTime = new Date(target.expiresAt).getTime();
    if (!isNaN(expireTime) && Date.now() > expireTime) {
      return { valid: false, error: "مهلت استفاده از این کد تخفیف به پایان رسیده است." };
    }
  }

  // بررسی سقف تعداد استفاده
  if (target.maxUses && target.maxUses > 0) {
    if ((target.usedCount || 0) >= target.maxUses) {
      return { valid: false, error: "ظرفیت استفاده از این کد تخفیف به پایان رسیده است." };
    }
  }

  // بررسی طرح‌های مجاز
  if (Array.isArray(target.applicablePlans) && target.applicablePlans.length > 0) {
    if (planId && !target.applicablePlans.includes(planId)) {
      return {
        valid: false,
        error: `این کد تخفیف فقط برای طرح‌های خاص (${target.applicablePlans.join("، ")}) قابل استفاده است.`,
      };
    }
  }

  // بررسی حداقل مبلغ خرید
  const originalPriceToman = Math.round((originalPriceRial || 0) / 10);
  if (target.minPurchaseToman && target.minPurchaseToman > 0) {
    if (originalPriceToman < target.minPurchaseToman) {
      return {
        valid: false,
        error: `حداقل مبلغ خرید برای اعمال این کد ${target.minPurchaseToman.toLocaleString("fa-IR")} تومان است.`,
      };
    }
  }

  // محاسبه دقیق تخفیف
  let discountAmountToman = 0;
  if (target.type === "percent") {
    const rawDiscount = (originalPriceToman * Number(target.value || 0)) / 100;
    discountAmountToman = Math.round(rawDiscount);
    if (target.maxDiscountToman && target.maxDiscountToman > 0) {
      discountAmountToman = Math.min(discountAmountToman, target.maxDiscountToman);
    }
  } else {
    // مبلغ ثابت
    discountAmountToman = Math.round(Number(target.value || 0));
  }

  // مبلغ تخفیف نباید از کل قیمت بیشتر شود
  discountAmountToman = Math.min(discountAmountToman, originalPriceToman);
  const discountAmountRial = discountAmountToman * 10;
  const finalPriceRial = Math.max(0, (originalPriceRial || 0) - discountAmountRial);
  const finalPriceToman = Math.round(finalPriceRial / 10);

  return {
    valid: true,
    discount: {
      code: target.code,
      id: target.id,
      title: target.title,
      type: target.type,
      value: target.value,
      discountAmountToman,
      discountAmountRial,
      originalPriceToman,
      originalPriceRial,
      finalPriceToman,
      finalPriceRial,
    },
  };
}

/**
 * افزایش شمارنده استفاده از کد تخفیف پس از ارسال تیکت خرید
 */
export async function incrementDiscountCodeUsage(code) {
  if (!code) return;
  try {
    const codes = await loadDiscountCodes();
    const normalized = code.trim().toUpperCase();
    let updated = false;

    const nextCodes = codes.map((c) => {
      if (c.code?.trim()?.toUpperCase() === normalized) {
        updated = true;
        return {
          ...c,
          usedCount: (c.usedCount || 0) + 1,
        };
      }
      return c;
    });

    if (updated) {
      await saveDiscountCodes(nextCodes);
    }
  } catch (err) {
    console.warn("Could not increment discount usage count:", err);
  }
}
