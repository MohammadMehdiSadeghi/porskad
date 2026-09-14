import assert from "assert";

console.log("==================================================");
console.log("       PORSKAD AMOOT SMS INTEGRATION AUDIT        ");
console.log("==================================================");

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n--- Suite 1: Phone Normalization & Validation ---");

  // Replicate normalization functions from api/amoot-proxy.js
  function toEnDigits(str = "") {
    return str
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  }

  function normalizeIranPhone(raw) {
    let s = toEnDigits(String(raw || "")).replace(/[^\d+]/g, "");
    if (s.startsWith("+98")) s = "0" + s.slice(3);
    else if (s.startsWith("0098")) s = "0" + s.slice(4);
    else if (s.startsWith("98") && s.length >= 12) s = "0" + s.slice(2);
    else if (s.startsWith("9") && s.length === 10) s = "0" + s;
    return s;
  }

  function isValidIranPhone(raw) {
    const s = normalizeIranPhone(raw);
    return /^09\d{9}$/.test(s);
  }

  it("Normalizes standard 0912 number", () => {
    assert.strictEqual(normalizeIranPhone("09123456789"), "09123456789");
    assert.strictEqual(isValidIranPhone("09123456789"), true);
  });

  it("Normalizes Persian digits ۰۹۱۲۳۴۵۶۷۸۹", () => {
    assert.strictEqual(normalizeIranPhone("۰۹۱۲۳۴۵۶۷۸۹"), "09123456789");
    assert.strictEqual(isValidIranPhone("۰۹۱۲۳۴۵۶۷۸۹"), true);
  });

  it("Normalizes +98 format", () => {
    assert.strictEqual(normalizeIranPhone("+989123456789"), "09123456789");
    assert.strictEqual(isValidIranPhone("+989123456789"), true);
  });

  it("Normalizes 0098 format", () => {
    assert.strictEqual(normalizeIranPhone("00989123456789"), "09123456789");
    assert.strictEqual(isValidIranPhone("00989123456789"), true);
  });

  it("Rejects invalid phone numbers", () => {
    assert.strictEqual(isValidIranPhone("02188888888"), false);
    assert.strictEqual(isValidIranPhone("12345"), false);
    assert.strictEqual(isValidIranPhone(""), false);
  });

  console.log("\n--- Suite 2: SMS Character & Page Calculation ---");

  function calcPages(text) {
    const isPersian = /[\u0600-\u06FF]/.test(text);
    const len = text.length;
    if (isPersian) {
      if (len <= 70) return 1;
      return Math.ceil(len / 67);
    } else {
      if (len <= 160) return 1;
      return Math.ceil(len / 153);
    }
  }

  it("Persian short text <= 70 chars is 1 page", () => {
    assert.strictEqual(calcPages("سلام به پرس‌کاد خوش آمدید."), 1);
  });

  it("Persian text with 80 chars is 2 pages", () => {
    const longText = "سلام این یک پیام تست برای سامانه پیامک آموت در پرس‌کاد است که بیش از ۷۰ کاراکتر دارد.";
    assert.strictEqual(calcPages(longText), 2);
  });

  it("English text with 120 chars is 1 page", () => {
    const enText = "Hello from Porskad platform. Your verification code is 12345. Please do not share it with anyone.";
    assert.strictEqual(calcPages(enText), 1);
  });

  console.log("\n--- Suite 3: Amoot REST API Signature & Response Structure ---");

  // Test Amoot AccountStatus with invalid token produces expected Token_Invalid
  const accountStatusRes = await fetch("https://portal.amootsms.com/rest/AccountStatus", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: "test_dummy_token_123" }).toString(),
  });
  const accountStatusData = await accountStatusRes.json();

  it("AccountStatus returns 200 with Token_NotExists/Token_Invalid for dummy token", () => {
    assert.strictEqual(accountStatusRes.status, 200);
    assert.ok(
      accountStatusData.Status === "Token_NotExists" || accountStatusData.Status === "Token_Invalid",
      `Expected Token_NotExists or Token_Invalid, got ${accountStatusData.Status}`
    );
    assert.strictEqual(typeof accountStatusData.RemaindCredit, "number");
    assert.strictEqual(Array.isArray(accountStatusData.ListLineNumbers), true);
  });

  // Test Amoot SendSimple with empty lineNumber produces expected LineNumber_Empty
  const sendSimpleRes = await fetch("https://portal.amootsms.com/rest/SendSimple", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: "test_dummy_token_123",
      Mobiles: "09123456789",
      SMSMessageText: "test",
    }).toString(),
  });
  const sendSimpleData = await sendSimpleRes.json();

  it("SendSimple returns 200 with LineNumber_Empty when line is omitted", () => {
    assert.strictEqual(sendSimpleRes.status, 200);
    assert.strictEqual(sendSimpleData.Status, "LineNumber_Empty");
    assert.strictEqual(typeof sendSimpleData.CampaignID, "number");
  });

  console.log("\n--- Suite 4: Webhook Handler Verification ---");

  // Verify webhook module exports a handler function
  const webhookModule = await import("../api/webhooks/amoot.js");
  it("Webhook module exports default handler function", () => {
    assert.strictEqual(typeof webhookModule.default, "function");
  });

  const proxyModule = await import("../api/amoot-proxy.js");
  it("Proxy module exports default handler function", () => {
    assert.strictEqual(typeof proxyModule.default, "function");
  });

  await it("Webhook responds with HTTP 200 and OK for Amoot delivery test query", async () => {
    let statusCode = null;
    let sentBody = null;
    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return {
          send: (body) => { sentBody = body; },
          json: (body) => { sentBody = body; },
          end: () => {},
        };
      },
      end: () => {},
    };
    const mockReq = {
      method: "GET",
      query: {
        MessageID: '"MSG-TEST-900001"',
        DeliveryType: '"Delivered"',
        Cost: '"120"',
        RegDateTime: '"2026-09-14 14:24:03"',
        SendDateTime: '"2026-09-14 14:24:10"',
      },
      body: {},
      headers: {
        "x-smscenter-signature": "Jsu5tMockSignatureKey",
      },
    };

    await webhookModule.default(mockReq, mockRes);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(sentBody, "OK");
  });

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
