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
  const emptyHeaderIndex = headers.findIndex((header) => !header);
  if (emptyHeaderIndex >= 0) {
    throw new Error(`CSV column ${emptyHeaderIndex + 1} has no header.`);
  }

  const seenHeaders = new Map<string, string>();
  for (const header of headers) {
    // Mapping aliases ignore spaces and punctuation, so treat those visually
    // different spellings as duplicate inputs instead of silently overwriting one.
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "");
    const previous = seenHeaders.get(normalized);
    if (previous) {
      throw new Error(
        `CSV has duplicate or ambiguous headers: "${previous}" and "${header}".`
      );
    }
    seenHeaders.set(normalized, header);
  }

  return table.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${rowIndex + 2} has ${values.length} columns; expected ${headers.length}.`
      );
    }
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""])
    );
  });
}
