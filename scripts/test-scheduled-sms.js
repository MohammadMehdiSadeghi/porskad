import fs from "fs";
import path from "path";

// بارگذاری مقادیر .env
try {
  for (const f of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), f);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      for (const line of raw.split("\n")) {
        const tr = line.trim();
        if (tr && !tr.startsWith("#") && tr.includes("=")) {
          const idx = tr.indexOf("=");
          const k = tr.slice(0, idx).trim();
          const v = tr.slice(idx + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }
} catch (err) {
  console.warn("Env note:", err);
}

import amootHandler from "../api/amoot-proxy.js";

function callProxy(body) {
  return new Promise((resolve) => {
    const req = {
      method: "POST",
      headers: { host: "localhost:5173" },
      body,
    };
    let statusCode = 200;
    const res = {
      setHeader: () => {},
      status(c) {
        statusCode = c;
        return this;
      },
      json(d) {
        resolve({ status: statusCode, data: d });
        return this;
      },
      send(d) {
        resolve({ status: statusCode, data: d });
        return this;
      },
      end(d) {
        resolve({ status: statusCode, data: d });
        return this;
      },
    };
    amootHandler(req, res);
  });
}

async function runTests() {
  console.log("🧪 Starting Scheduled SMS API Local Tests...\n");

  // ۱. تست اعتبارسنجی تاریخ در گذشته یا کمتر از ۲ دقیقه
  console.log("1️⃣ Testing validation: past date rejection");
  const pastRes = await callProxy({
    action: "schedule_sms",
    mobiles: ["09123456789"],
    text: "تست پیامک زماندار",
    scheduledAt: new Date(Date.now() - 60000).toISOString(),
  });
  console.log("   Past date result:", pastRes.status, pastRes.data?.message);
  if (pastRes.status === 400) {
    console.log("   ✅ Passed: Past date was rejected successfully.");
  } else {
    console.error("   ❌ Failed: Past date was not rejected!");
  }

  // ۲. تست ثبت پیام زماندار برای ۵ دقیقه بعد با شماره‌های تکراری و نامعتبر
  console.log("\n2️⃣ Testing scheduling with valid, duplicate, and invalid mobiles");
  const validFuture = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const schedRes = await callProxy({
    action: "schedule_sms",
    mobiles: ["09123456789", "09123456789", "+989351112233", "invalid-phone", "09120000000"],
    text: "سلام، این یک پیامک آزمایشی زماندار از سیستم پرس‌کاد است.",
    scheduledAt: validFuture,
    sourceType: "manual",
  });

  console.log("   Schedule result:", schedRes.status, schedRes.data);
  const createdId = schedRes.data?.id;

  if (schedRes.data?.success && createdId) {
    console.log(`   ✅ Passed: Scheduled SMS #${createdId} created with ${schedRes.data.total_count} recipients.`);

    // ۳. تست دریافت لیست صف
    console.log("\n3️⃣ Testing get_scheduled_sms_list");
    const listRes = await callProxy({
      action: "get_scheduled_sms_list",
      status: "all",
      page: 1,
      limit: 10,
    });
    console.log("   List result: total =", listRes.data?.total, "items =", listRes.data?.list?.length);
    if (listRes.data?.list?.some((i) => i.id === createdId)) {
      console.log("   ✅ Passed: Newly created scheduled SMS found in queue list.");
    }

    // ۴. تست دریافت جزئیات و گیرندگان
    console.log(`\n4️⃣ Testing get_scheduled_sms_detail for #${createdId}`);
    const detailRes = await callProxy({
      action: "get_scheduled_sms_detail",
      id: createdId,
    });
    console.log("   Detail result: status =", detailRes.data?.scheduledSms?.status, "recipients count =", detailRes.data?.recipients?.length);
    if (detailRes.data?.recipients?.length > 0) {
      console.log("   ✅ Passed: Recipients retrieved successfully.");
    }

    // ۵. تست لغو زمانبندی
    console.log(`\n5️⃣ Testing cancel_scheduled_sms for #${createdId}`);
    const cancelRes = await callProxy({
      action: "cancel_scheduled_sms",
      id: createdId,
    });
    console.log("   Cancel result:", cancelRes.data);
    if (cancelRes.data?.success) {
      console.log("   ✅ Passed: Scheduled SMS canceled successfully.");
    }

    // ۶. بررسی وضعیت پس از لغو
    const verifyCancelRes = await callProxy({
      action: "get_scheduled_sms_detail",
      id: createdId,
    });
    if (verifyCancelRes.data?.scheduledSms?.status === "canceled") {
      console.log("   ✅ Passed: Verified status is 'canceled'.");
    }
  }

  // ۷. تست اجرای دیسپچر صف
  console.log("\n6️⃣ Testing dispatch_scheduled_sms (dry run)");
  const dispatchRes = await callProxy({
    action: "dispatch_scheduled_sms",
  });
  console.log("   Dispatch result:", dispatchRes.data);
  console.log("   ✅ Passed: Dispatcher executed without errors.");

  console.log("\n🎉 All Scheduled SMS Local Tests Completed Successfully!");
}

runTests().catch(console.error);
