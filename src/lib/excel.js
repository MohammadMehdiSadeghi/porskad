import * as XLSX from "xlsx";
import { faDate } from "./utils";

export function downloadExcel(filename, header, rows, dates = {}) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Responses
  const data = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws["!cols"] = header.map((h) => ({ wch: Math.max(String(h ?? "").length, 15) }));

  XLSX.utils.book_append_sheet(wb, ws, "پاسخ‌ها");

  // Sheet 2: Summary
  const summaryData = [
    ["خلاصه پاسخ‌ها"],
    [""],
    ["تعداد کل پاسخ‌ها", rows.length],
    ["تعداد پاسخ‌های کامل", dates?.completeCount ?? rows.filter((r) => r[2] === "بله").length],
    ["تاریخ اولین پاسخ", rows.length ? (dates.firstSubmittedAt ?? faDate(new Date())) : "—"],
    ["تاریخ آخرین پاسخ", rows.length ? (dates.lastSubmittedAt ?? faDate(new Date())) : "—"],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2["!cols"] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, "خلاصه");

  XLSX.writeFile(wb, filename);
}
