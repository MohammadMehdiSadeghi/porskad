import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// بارگذاری .env
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

import apiHandler from "../api/admin-system-settings.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
    end() {
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log("=== شروع تست‌های لوکال تنظیمات روش‌های احراز هویت ===");

  // تست ۱: متد GET اندپوینت api/admin-system-settings
  const reqGet = { method: "GET", headers: {} };
  const resGet = createMockRes();
  await apiHandler(reqGet, resGet);

  console.log("تست ۱ - دریافت تنظیمات از اندپوینت سرورلس:");
  console.log("کد وضعیت:", resGet.statusCode);
  console.log("پاسخ:", resGet.data?.success ? "موفقیت‌آمیز" : resGet.data);
  if (resGet.data?.settings) {
    console.log("کلیدهای موجود:", Object.keys(resGet.data.settings));
  }

  // تست ۲: اعتبارسنجی متد POST بدون احراز هویت (باید 401 بدهد)
  const reqPostUnauthorized = { method: "POST", headers: {}, body: { settings: { sms_otp_enabled: true } } };
  const resPostUnauthorized = createMockRes();
  await apiHandler(reqPostUnauthorized, resPostUnauthorized);
  console.log("\nتست ۲ - جلوگیری از تغییر بدون توکن سوپرادمین:");
  console.log("کد وضعیت:", resPostUnauthorized.statusCode);
  console.log("خطا:", resPostUnauthorized.data?.error);

  console.log("\n=== پایان موفقیت‌آمیز تست‌های لوکال ===");
}

runTests().catch(console.error);
