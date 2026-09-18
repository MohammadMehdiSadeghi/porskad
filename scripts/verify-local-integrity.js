import fs from "fs";
import path from "path";
import { QUESTION_TYPES, QUESTION_CATEGORIES, makeQuestion, resolveQuestion } from "../src/lib/questionTypes.js";
import { QUESTION_TYPE_ICONS } from "../src/lib/questionIcons.js";
import { makeCondition, makeConditionGroup, makeJumpAction, GROUP_OPERATORS, JUMP_ACTION_TYPES } from "../src/lib/logic/types.js";

console.log("=== PORSKAD LOCAL SYSTEM & DATA INTEGRITY TEST ===");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✖ FAIL: ${message}`);
  }
}

// 1. Question Types Test
console.log("\n[1] Testing Question Types & Icons Integrity:");
const typeKeys = Object.keys(QUESTION_TYPES);
assert(typeKeys.length >= 16, `Total question types count is ${typeKeys.length}`);

for (const key of typeKeys) {
  const meta = QUESTION_TYPES[key];
  assert(!!meta.label, `Question type '${key}' has a valid label: ${meta.label}`);
  assert(!!meta.category, `Question type '${key}' has category: ${meta.category}`);
  assert(!!QUESTION_TYPE_ICONS[key], `Question type '${key}' has an associated icon in QUESTION_TYPE_ICONS`);
  
  const q = makeQuestion(key, 0);
  assert(q && q.type === key, `makeQuestion('${key}') successfully instantiated question object`);
  
  const resolved = resolveQuestion(q);
  assert(resolved && resolved.type === key, `resolveQuestion for '${key}' properly resolved`);
}

// 2. Logic & Conditions Test
console.log("\n[2] Testing Conditional Logic & Jump Actions:");
const cond = makeCondition();
assert(cond.source === "answer" && cond.operator === "equals", "makeCondition default schema is valid");

const group = makeConditionGroup();
assert(group.group_operator === "AND" && Array.isArray(group.conditions), "makeConditionGroup default schema is valid");

const ja = makeJumpAction();
assert(ja.action_type === "jump_to_question", "makeJumpAction default schema is valid");
assert("AND" in GROUP_OPERATORS && "OR" in GROUP_OPERATORS, "GROUP_OPERATORS includes AND / OR");

// 3. File existence & Route Integrity
console.log("\n[3] Testing Critical Files Existence:");
const criticalFiles = [
  "src/App.jsx",
  "src/main.jsx",
  "src/index.css",
  "src/pages/Admin/Forms/FormBuilder.jsx",
  "src/pages/Admin/Forms/FormsList.jsx",
  "src/pages/Admin/Forms/Responses.jsx",
  "src/pages/Admin/TelegramBot.jsx",
  "src/pages/Admin/SmsPanel.jsx",
  "src/pages/Admin/EmbedHub.jsx",
  "src/pages/Form/index.jsx",
  "src/pages/Embed/index.jsx",
  "src/components/form/FormPreview.jsx",
  "src/components/layout/AdminLayout.jsx",
  "src/context/AuthContext.jsx",
  "api/v1/[...route].js"
];

for (const f of criticalFiles) {
  const p = path.resolve(f);
  assert(fs.existsSync(p), `File exists: ${f}`);
}

console.log("\n==================================================");
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log("==================================================");

process.exit(failed > 0 ? 1 : 0);
