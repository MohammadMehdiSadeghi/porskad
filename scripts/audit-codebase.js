import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const KNOWN_GLOBALS = new Set([
  "window", "document", "navigator", "console", "localStorage", "sessionStorage",
  "fetch", "AbortSignal", "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame", "location", "history", "alert",
  "confirm", "prompt", "open", "close", "URL", "URLSearchParams", "FormData", "File",
  "Blob", "FileReader", "Headers", "Request", "Response", "Image", "Audio",
  "Math", "Date", "JSON", "Promise", "Array", "Object", "String", "Number", "Boolean",
  "RegExp", "Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError",
  "Set", "Map", "WeakSet", "WeakMap", "Symbol", "BigInt", "ArrayBuffer", "Uint8Array",
  "Int32Array", "Float64Array", "DataView", "Infinity", "NaN", "undefined", "null",
  "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURI", "encodeURIComponent",
  "decodeURI", "decodeURIComponent", "btoa", "atob", "crypto", "process", "require",
  "module", "exports", "__dirname", "__filename", "globalThis", "global", "Intl",
  "CustomEvent", "Event", "MouseEvent", "KeyboardEvent", "React", "Node", "Element",
  "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement",
  "HTMLDivElement", "HTMLAnchorElement", "HTMLCanvasElement", "SVGElement",
  "MutationObserver", "ResizeObserver", "IntersectionObserver", "Performance",
  "performance", "indexedDB", "Worker", "SharedWorker", "ServiceWorker", "structuredClone"
]);

function getFiles(dir, exts = [".js", ".jsx"]) {
  let files = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
      files = files.concat(getFiles(full, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

const targetDirs = [
  path.resolve("src"),
  path.resolve("api")
];

let totalFiles = 0;
let errorsCount = 0;
const report = [];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = getFiles(dir);
  totalFiles += files.length;

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const code = fs.readFileSync(filePath, "utf-8");

    let ast;
    try {
      ast = parser.parse(code, {
        sourceType: "module",
        plugins: [
          "jsx",
          "typescript",
          "classProperties",
          "optionalChaining",
          "nullishCoalescingOperator",
          "topLevelAwait",
          "objectRestSpread"
        ],
        errorRecovery: true
      });
    } catch (parseErr) {
      report.push({
        file: relPath,
        line: parseErr.loc ? parseErr.loc.line : 1,
        column: parseErr.loc ? parseErr.loc.column : 1,
        message: `Parse Error: ${parseErr.message}`
      });
      errorsCount++;
      continue;
    }

    try {
      traverse(ast, {
        Identifier(pathNode) {
          if (!pathNode.isReferencedIdentifier()) return;
          const name = pathNode.node.name;
          if (KNOWN_GLOBALS.has(name)) return;
          if (pathNode.scope.hasBinding(name)) return;

          // Ignore JSX pragmas or special identifiers
          if (name.startsWith("__")) return;

          const loc = pathNode.node.loc?.start || { line: 0, column: 0 };
          report.push({
            file: relPath,
            line: loc.line,
            column: loc.column,
            name,
            message: `'${name}' is not defined`
          });
          errorsCount++;
        }
      });
    } catch (travErr) {
      // traversal error if any
    }
  }
}

console.log("==================================================");
console.log(`CODEBASE AUDIT REPORT (${totalFiles} files scanned)`);
console.log("==================================================");

if (report.length === 0) {
  console.log("✓ ALL CLEAN! No undefined variables or references found!");
} else {
  console.log(`Found ${report.length} potential issue(s):\n`);
  for (const item of report) {
    console.log(`  ✖ [${item.file}:${item.line}:${item.column}] ${item.message}`);
  }
}

console.log("==================================================");
process.exit(errorsCount > 0 ? 1 : 0);
