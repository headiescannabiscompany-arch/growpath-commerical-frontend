export function parseStorefrontCsv(text: string): Record<string, string>[] {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const table: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) table.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim())) table.push(row);
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (table.length < 2)
    throw new Error("CSV needs a header row and at least one product row.");
  const headers = table[0].map((header) => header.trim());
  if (!headers.some(Boolean)) throw new Error("CSV header row is empty.");
  return table
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [
          header || `Column ${index + 1}`,
          values[index] || ""
        ])
      )
    );
}
