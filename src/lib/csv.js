// خروجی CSV سازگار با اکسل فارسی (UTF-8 با BOM)
// ضد CSV/Formula Injection: سلول‌های خطرناک با ' ایمن می‌شوند
function isNumericLike(s) {
  return /^-?\d+([.,]\d+)?$/.test(s);
}

function csvCell(v) {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !isNumericLike(s)) s = `'${s}`;
  if (/[",\n\r;]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(rows) {
  if (!rows.length) return "";
  const header = rows[0].map((h) => csvCell(h)).join(",");
  const body = rows.slice(1).map((r) => r.map(csvCell).join(",")).join("\r\n");
  return `\uFEFF${header}\r\n${body}`;
}

export function downloadCsv(filename, rows) {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
