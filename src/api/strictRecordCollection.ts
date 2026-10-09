type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function failedEnvelope(value: unknown) {
  return (
    isRecord(value) &&
    (value.ok === false || value.success === false || value.error != null)
  );
}

/** Opt-in verification for callers that cannot present unknown data as empty. */
export function strictRecordCollection<T>(
  response: unknown,
  paths: readonly (readonly string[])[],
  label: string,
  options: {
    stringFields?: readonly string[];
    validate?: (row: RecordValue) => boolean;
  } = {}
): T[] {
  const invalid = () => new Error(`${label} could not be verified. Please retry.`);
  if (failedEnvelope(response) || (isRecord(response) && failedEnvelope(response.data)))
    throw invalid();

  let rows: unknown;
  if (Array.isArray(response)) rows = response;
  else if (isRecord(response)) {
    for (const path of paths) {
      let parent: unknown = response;
      for (const key of path.slice(0, -1)) {
        parent = isRecord(parent) ? parent[key] : undefined;
      }
      const key = path[path.length - 1];
      if (isRecord(parent) && Object.prototype.hasOwnProperty.call(parent, key)) {
        // A malformed higher-priority collection is not an empty list and must
        // not be skipped in favor of a lower-priority compatibility alias.
        rows = parent[key];
        break;
      }
    }
  }
  if (!Array.isArray(rows)) throw invalid();

  const ids = new Set<string>();
  for (const row of rows) {
    if (!isRecord(row)) throw invalid();
    const id = row.id ?? row._id;
    const aliases = [row.id, row._id].filter((value) => value != null);
    if (
      typeof id !== "string" ||
      !id.trim() ||
      id !== id.trim() ||
      aliases.some((value) => value !== id) ||
      ids.has(id) ||
      options.stringFields?.some(
        (field) => row[field] != null && typeof row[field] !== "string"
      ) ||
      (options.validate && !options.validate(row))
    )
      throw invalid();
    ids.add(id);
  }
  return rows as T[];
}
