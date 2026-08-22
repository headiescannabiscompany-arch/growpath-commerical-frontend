export type BusinessDeskCursorPage<T> = {
  records: T[];
  page: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export async function loadAllBusinessDeskPages<T>(
  loadPage: (cursor?: string) => Promise<BusinessDeskCursorPage<T>>,
  options: {
    maxRecords: number;
    recordKey?: (record: T) => string;
  }
) {
  if (!Number.isSafeInteger(options.maxRecords) || options.maxRecords < 1) {
    throw new Error("Business Desk load-all requires a positive safe record limit.");
  }

  const records: T[] = [];
  const seenCursors = new Set<string>();
  const seenRecords = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    const result = await loadPage(cursor);
    if (!result || !Array.isArray(result.records) || !result.page) {
      throw new Error("The Business Desk page response was invalid.");
    }
    if (records.length + result.records.length > options.maxRecords) {
      throw new Error(
        `The Business Desk contains more than ${options.maxRecords.toLocaleString()} matching records. Narrow the filters before calculating totals or exporting; no partial result was used.`
      );
    }

    for (const record of result.records) {
      const key = options.recordKey?.(record).trim();
      if (key) {
        if (seenRecords.has(key)) {
          throw new Error(
            "Business Desk records changed while all pages were loading. Reload before calculating totals or exporting; no partial result was used."
          );
        }
        seenRecords.add(key);
      }
      records.push(record);
    }

    if (!result.page.hasMore) return records;
    const nextCursor = String(result.page.nextCursor || "").trim();
    if (!nextCursor || result.records.length === 0 || seenCursors.has(nextCursor)) {
      throw new Error(
        "The Business Desk pagination cursor was invalid. No partial result was used."
      );
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
}
