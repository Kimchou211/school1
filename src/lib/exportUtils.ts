import * as XLSX from 'xlsx';

/**
 * Export generic array of data objects to an Excel (.xlsx) file
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  fileName: string,
  sheetName: string = 'ទិន្នន័យ'
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns slightly
  const colKeys = Object.keys(data[0] || {});
  const colWidths = colKeys.map((k) => ({
    wch: Math.max(k.length * 2, 14),
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Trigger high-fidelity PDF print preview for current screen or target element.
 * Browsers natively render Kantumruy Pro with 100% correct Khmer ligatures and subscripts.
 */
export function triggerPdfPrint(documentTitle: string) {
  const originalTitle = document.title;
  document.title = documentTitle;
  window.print();
  document.title = originalTitle;
}
