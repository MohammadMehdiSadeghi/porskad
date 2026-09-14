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

const { default: apiHandler } = await import("../api/v1/[...route].js");

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    getHeader(k) {
      return this.headers[k];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
    end(data) {
      if (data && typeof data === "string" && !this.data) {
        try {
          this.data = JSON.parse(data);
        } catch {
          this.data = data;
        }
      }
      return this;
    }
  };
  return res;
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("       PORSKAD REST API AUTOMATED AUDIT           ");
  console.log("==================================================\n");

  // 1. Question Types
  console.log("Test 1: GET /api/v1/question-types");
  const res1 = createMockRes();
  await apiHandler({
    method: "GET",
    url: "/api/v1/question-types",
    headers: {},
    query: { route: ["question-types"] }
  }, res1);
  assert(res1.statusCode === 200, "Status code is 200");
  assert(res1.data?.count === 20, "Contains exactly 20 question types");
  assert(Boolean(res1.data?.types?.choice), "Has 'choice' type");
  assert(Boolean(res1.data?.types?.file_upload), "Has 'file_upload' type");
  assert(Boolean(res1.data?.types?.matrix), "Has 'matrix' type");
  assert(Boolean(res1.data?.types?.rating), "Has 'rating' type");

  // 2. Forms List Unauthorized
  console.log("\nTest 2: GET /api/v1/forms (Unauthorized)");
  const res2 = createMockRes();
  await apiHandler({
    method: "GET",
    url: "/api/v1/forms",
    headers: {},
    query: { route: ["forms"] }
  }, res2);
  assert(res2.statusCode === 401, "Protected route returns 401 without Bearer token");

  // 3. Form Detail (Public Form)
  console.log("\nTest 3: GET /api/v1/forms/hermes-event-feedback");
  const res3 = createMockRes();
  await apiHandler({
    method: "GET",
    url: "/api/v1/forms/hermes-event-feedback",
    headers: {},
    query: { route: ["forms", "hermes-event-feedback"] }
  }, res3);
  assert(res3.statusCode === 200, "Status code is 200 for published form");
  assert(Boolean(res3.data?.form?.title), `Form title retrieved: '${res3.data?.form?.title}'`);
  assert(Boolean(res3.data?.form?.slug), `Form slug: '${res3.data?.form?.slug}'`);
  assert(Boolean(res3.data?.form?.public_url), `Public URL generated: '${res3.data?.form?.public_url}'`);
  assert(Array.isArray(res3.data?.questions), "Questions array is returned");
  assert(res3.data?.questions?.length > 0, `Returned ${res3.data?.questions?.length} questions`);
  assert(Array.isArray(res3.data?.logic_rules), "Logic rules array is returned");

  // 4. Questions List
  console.log("\nTest 4: GET /api/v1/forms/hermes-event-feedback/questions");
  const res4 = createMockRes();
  await apiHandler({
    method: "GET",
    url: "/api/v1/forms/hermes-event-feedback/questions",
    headers: {},
    query: { route: ["forms", "hermes-event-feedback", "questions"] }
  }, res4);
  assert(res4.statusCode === 200, "Questions endpoint returns 200");
  assert(res4.data?.count === res3.data?.questions?.length, "Questions count matches form details");

  // 5. Single Question by ID
  const firstQ = res3.data?.questions?.[0];
  console.log(`\nTest 5: GET /api/v1/forms/hermes-event-feedback/questions/${firstQ?.id}`);
  const res5 = createMockRes();
  await apiHandler({
    method: "GET",
    url: `/api/v1/forms/hermes-event-feedback/questions/${firstQ?.id}`,
    headers: {},
    query: { route: ["forms", "hermes-event-feedback", "questions", firstQ?.id] }
  }, res5);
  assert(res5.statusCode === 200, "Single question endpoint returns 200");
  assert(res5.data?.question?.id === firstQ?.id, "Question ID matches requested question");
  assert(Boolean(res5.data?.question?.type), `Question type: '${res5.data?.question?.type}'`);
  assert(res5.data?.question?.placeholder !== undefined, "Question has placeholder field");
  assert(res5.data?.question?.validation !== undefined, "Question has validation field");

  // 6. Form Embed Codes
  console.log("\nTest 6: GET /api/v1/forms/hermes-event-feedback/embed");
  const res6 = createMockRes();
  await apiHandler({
    method: "GET",
    url: "/api/v1/forms/hermes-event-feedback/embed",
    headers: {},
    query: { route: ["forms", "hermes-event-feedback", "embed"] }
  }, res6);
  assert(res6.statusCode === 200, "Embed endpoint returns 200");
  assert(Boolean(res6.data?.iframe_code?.includes("<iframe")), "Generates valid iframe code");
  assert(Boolean(res6.data?.sdk_code?.includes("embed-sdk.js")), "Generates SDK code");
  assert(Boolean(res6.data?.react_code?.includes("export function")), "Generates React component code");

  // 7. Form Stats Protection
  console.log("\nTest 7: GET /api/v1/forms/hermes-event-feedback/stats (Unauthorized)");
  const res7 = createMockRes();
  await apiHandler({
    method: "GET",
    url: "/api/v1/forms/hermes-event-feedback/stats",
    headers: {},
    query: { route: ["forms", "hermes-event-feedback", "stats"] }
  }, res7);
  assert(res7.statusCode === 403, "Stats endpoint correctly restricted with 403 for unauthorized caller");

  // 8. Submit Response
  console.log("\nTest 8: POST /api/v1/forms/hermes-event-feedback/responses (Submit Answer)");
  const res8 = createMockRes();
  await apiHandler({
    method: "POST",
    url: "/api/v1/forms/hermes-event-feedback/responses",
    headers: {},
    query: { route: ["forms", "hermes-event-feedback", "responses"] },
    body: {
      duration_seconds: 35,
      device: "desktop",
      browser: "Node.js Test Suite",
      answers: [
        { question_id: firstQ?.id, value: "تست خودکار جامع" }
      ]
    }
  }, res8);
  assert(res8.statusCode === 201, `Submit response returns 201 Created (Got: ${res8.statusCode})`);
  assert(res8.data?.success === true, "Response success is true");
  assert(Boolean(res8.data?.response_id), `Response ID generated: '${res8.data?.response_id}'`);

  // 10. Security Check: Masking correct_answer for public respondents
  console.log("\nTest 10: Security Check: Public question response must NOT contain correct_answer");
  const publicQuestions = res3.data?.questions || [];
  const hasLeakedAnswer = publicQuestions.some((q) => "correct_answer" in q);
  assert(!hasLeakedAnswer, "correct_answer is properly stripped and never leaked to public respondents");

  // 11. Security Check: PostgREST Injection attempt via form identifier
  console.log("\nTest 11: Security Check: PostgREST Injection attempt in form identifier");
  const res11 = createMockRes();
  await apiHandler({
    method: "GET",
    url: "/api/v1/forms/bad,id.eq.00000000-0000-0000-0000-000000000000",
    headers: {},
    query: { route: ["forms", "bad,id.eq.00000000-0000-0000-0000-000000000000"] }
  }, res11);
  assert(res11.statusCode === 404, "Invalid characters in formIdentifier rejected with 404 and safely sanitized");

  // 12. Security Check: Payload limits on submission
  console.log("\nTest 12: Security Check: Excessive answers array (> 200 items) rejected");
  const res12 = createMockRes();
  const oversizedAnswers = Array.from({ length: 250 }, (_, i) => ({
    question_id: `q-${i}`,
    value: "test"
  }));
  await apiHandler({
    method: "POST",
    url: "/api/v1/forms/hermes-event-feedback/responses",
    headers: {},
    query: { route: ["forms", "hermes-event-feedback", "responses"] },
    body: { answers: oversizedAnswers }
  }, res12);
  assert(res12.statusCode === 400, `Oversized answers array rejected with 400 (Got: ${res12.statusCode})`);
  assert(Boolean(res12.data?.error?.includes("۲۰۰")), "Error message mentions 200 question limit");

  // 13. Security & Architecture: 404 message directs to internal panel docs, not public /docs
  console.log("\nTest 13: 404 message points to internal panel docs");
  const res13 = createMockRes();
  await apiHandler({
    method: "GET",
    url: "/api/v1/non-existent-endpoint",
    headers: {},
    query: { route: ["non-existent-endpoint"] }
  }, res13);
  assert(res13.statusCode === 404, "404 returned for unknown endpoint");
  assert(Boolean(res13.data?.error?.includes("/admin/web-service")), "404 message guides user to panel docs (/admin/web-service)");

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
