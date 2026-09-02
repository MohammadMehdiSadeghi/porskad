import * as XLSX from "xlsx";

export function downloadExcel(filename, header, rows, dates = {}) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Responses
  const data = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws["!cols"] = header.map((h) => ({ wch: Math.max(h.length, 15) }));

  XLSX.utils.book_append_sheet(wb, ws, "پاسخ‌ها");

  // Sheet 2: Summary
  const summaryData = [
    ["خلاصه پاسخ‌ها"],
    [""],
    ["تعداد کل پاسخ‌ها", rows.length],
    ["تعداد پاسخ‌های کامل", rows.filter((r) => r[2] === "بله").length],
    ["تاریخ اولین پاسخ", rows.length ? (dates.firstSubmittedAt ?? new Date().toLocaleDateString("fa-IR")) : "—"],
    ["تاریخ آخرین پاسخ", rows.length ? (dates.lastSubmittedAt ?? new Date().toLocaleDateString("fa-IR")) : "—"],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2["!cols"] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, "خلاصه");

  XLSX.writeFile(wb, filename);
}
