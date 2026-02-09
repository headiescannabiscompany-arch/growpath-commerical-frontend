// Deterministic CSV export utility
// Usage: exportToCsv(filename, rows, columns)
// - filename: string (no extension)
// - rows: array of objects
// - columns: array of { key: string, label: string }

export function exportToCsv(
  filename: string,
  rows: any[],
  columns: { key: string; label: string }[]
) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) return;
  const csvRows = [];
  // Header
  csvRows.push(columns.map((col) => '"' + col.label.replace(/"/g, '""') + '"').join(","));
  // Data
  for (const row of rows) {
    csvRows.push(
      columns
        .map((col) => {
          let val = row[col.key];
          if (val === undefined || val === null) val = "";
          if (typeof val === "string") val = val.replace(/"/g, '""');
          return '"' + String(val) + '"';
        })
        .join(",")
    );
  }
  const csvContent = csvRows.join("\r\n");
  // Download (web only)
  if (typeof window !== "undefined" && window.document) {
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".csv";
    a.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }
  // Native: TODO (share, save, etc.)
}
