export function fToC(f: number) {
  return (f - 32) * (5 / 9);
}

export function cToF(c: number) {
  return c * (9 / 5) + 32;
}

export function deltaFToC(deltaF: number) {
  return deltaF * (5 / 9);
}

export function deltaCToF(deltaC: number) {
  return deltaC * (9 / 5);
}

export function dewPointC(tempC: number, rhPct: number) {
  const rh = Math.max(1, Math.min(100, rhPct));
  const a = 17.62;
  const b = 243.12;
  const gamma = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  return (b * gamma) / (a - gamma);
}

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
  metadata?: Record<string, string>;
  provider?: "ac_infinity" | "generic";
  headerRowIndex?: number;
  warnings?: string[];
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseCsvText(csvText: string): ParsedCsv {
  const text = String(csvText || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u202f]/g, " ")
    .trim();
  const lines = text ? text.split("\n") : [];
  if (!lines.length) return { headers: [], rows: [] };

  const parsedLines = lines.map(parseCsvLine);
  const telemetryHeaderIndex = parsedLines.findIndex((row) => {
    const normalized = row.map((cell) =>
      String(cell || "")
        .trim()
        .toLowerCase()
    );
    const hasTime = normalized.some((cell) => cell === "time" || cell === "timestamp");
    const hasEnvironment = normalized.some(
      (cell) => cell.includes("temperature") || cell.includes("humidity")
    );
    return hasTime && hasEnvironment;
  });
  const headerRowIndex = telemetryHeaderIndex >= 0 ? telemetryHeaderIndex : 0;
  const headers = parsedLines[headerRowIndex];
  const rows = parsedLines
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => String(cell || "").trim()));
  const metadata = Object.fromEntries(
    parsedLines
      .slice(0, headerRowIndex)
      .map((row) => [String(row[0] || "").trim(), String(row[1] || "").trim()])
      .filter(([key]) => Boolean(key))
  );
  const provider =
    headerRowIndex > 0 &&
    headers.some((header) =>
      /^inside (?:temperature|relative humidity|vpd)$/i.test(header)
    )
      ? "ac_infinity"
      : "generic";
  const warnings: string[] = [];
  if (
    provider === "ac_infinity" &&
    /24\s*hrs?/i.test(metadata["Sample Frequency"] || "")
  ) {
    warnings.push(
      "This export contains one sample per day. Use a shorter AC Infinity sample frequency to analyze lights-off spikes and equipment response."
    );
  }

  return { headers, rows, metadata, provider, headerRowIndex, warnings };
}

export function suggestedTelemetryMapping(parsed: ParsedCsv): CsvMapping | null {
  const normalized = parsed.headers.map((header) => header.trim().toLowerCase());
  const find = (preferred: string[], fallback: RegExp) => {
    for (const value of preferred) {
      const exact = normalized.indexOf(value);
      if (exact >= 0) return exact;
    }
    return normalized.findIndex((value) => fallback.test(value));
  };
  const tsCol = find(["time", "timestamp"], /(?:^|\s)(?:time|timestamp)(?:$|\s)/);
  const tempCol = find(
    ["inside temperature", "air temperature", "temperature", "tempf", "tempc"],
    /temperature|(?:^|\s)temp(?:$|\s)/
  );
  const rhCol = find(
    ["inside relative humidity", "relative humidity", "humidity", "rh"],
    /humidity|(?:^|\s)rh(?:$|\s)/
  );
  if ([tsCol, tempCol, rhCol].some((index) => index < 0)) return null;
  const units = String(parsed.metadata?.["Temperature Units"] || "").toUpperCase();
  const optionalExact = (...values: string[]) => {
    for (const value of values) {
      const index = normalized.indexOf(value);
      if (index >= 0) return index;
    }
    return undefined;
  };
  const lightCol = optionalExact("light (sensor 1)", "light", "lux");
  return {
    tsCol,
    tempCol,
    rhCol,
    tempUnit: units.includes("C") ? "C" : "F",
    vpdCol: optionalExact("inside vpd", "vpd"),
    co2Col: optionalExact("co₂ (sensor 1)", "co2 (sensor 1)", "co₂", "co2"),
    lightCol,
    lightKind:
      lightCol == null
        ? undefined
        : normalized[lightCol].includes("lux")
          ? "lux"
          : "manufacturer_reported"
  };
}

function timezoneWallParts(date: Date, timeZone: string) {
  const entries = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(entries.map((part) => [part.type, part.value]));
}

export function normalizeTelemetryTimestamp(
  value: string,
  timeZone = "UTC"
): string | null {
  const raw = String(value || "")
    .replace(/[\u00a0\u202f]/g, " ")
    .trim();
  if (!raw) return null;
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const explicit = Date.parse(raw);
    return Number.isFinite(explicit) ? new Date(explicit).toISOString() : null;
  }

  const match = raw.match(
    /^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i
  );
  if (!match) return null;
  const yearFirst = match[1].length === 4;
  const year = Number(yearFirst ? match[1] : match[3]);
  const month = Number(yearFirst ? match[2] : match[1]);
  const day = Number(yearFirst ? match[3] : match[2]);
  let hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);
  const meridiem = String(match[7] || "").toUpperCase();
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (
    year < 1900 ||
    year > 2200 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const desiredWallMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let guessMs = desiredWallMs;
  try {
    for (let i = 0; i < 3; i += 1) {
      const parts = timezoneWallParts(new Date(guessMs), timeZone);
      const representedWallMs = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
      );
      guessMs += desiredWallMs - representedWallMs;
    }
  } catch {
    return null;
  }
  return new Date(guessMs).toISOString();
}

export type CsvMapping = {
  tsCol: number;
  tempCol: number;
  rhCol: number;
  tempUnit: "F" | "C";
  vpdCol?: number;
  co2Col?: number;
  lightCol?: number;
  lightKind?: "lux" | "manufacturer_reported";
};

export type TelemetryPointLike = {
  ts: string;
  airTempC: number;
  rh: number;
  dewPointC?: number;
  vpdKpa?: number | null;
  co2Ppm?: number | null;
  lightLux?: number | null;
  lightValue?: number | null;
  lightUnit?: string | null;
};

export type MapCsvToPointsOptions = {
  normalizeTimestamp?: (tsRaw: string) => string | null;
};

export function mapCsvToPoints(
  parsed: ParsedCsv,
  mapping: CsvMapping,
  options?: MapCsvToPointsOptions
): TelemetryPointLike[] {
  const pts: TelemetryPointLike[] = [];

  for (const row of parsed.rows) {
    const tsRaw = String(row[mapping.tsCol] ?? "").trim();
    const tempRaw = Number(String(row[mapping.tempCol] ?? "").trim());
    const rhRaw = Number(String(row[mapping.rhCol] ?? "").trim());
    const optionalValue = (index: number | undefined) => {
      if (index == null || index < 0) return null;
      const raw = String(row[index] ?? "").trim();
      if (!raw) return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    };
    const normalizedTs = options?.normalizeTimestamp
      ? options.normalizeTimestamp(tsRaw)
      : tsRaw;

    if (!normalizedTs) continue;
    const t = new Date(normalizedTs);
    if (!Number.isFinite(t.getTime())) continue;
    if (!Number.isFinite(tempRaw)) continue;
    if (!Number.isFinite(rhRaw) || rhRaw < 0 || rhRaw > 100) continue;

    const airTempC = mapping.tempUnit === "F" ? fToC(tempRaw) : tempRaw;
    pts.push({
      ts: t.toISOString(),
      airTempC,
      rh: rhRaw,
      vpdKpa: optionalValue(mapping.vpdCol),
      co2Ppm: optionalValue(mapping.co2Col),
      lightLux: mapping.lightKind === "lux" ? optionalValue(mapping.lightCol) : null,
      lightValue:
        mapping.lightKind === "manufacturer_reported"
          ? optionalValue(mapping.lightCol)
          : null,
      lightUnit:
        mapping.lightKind === "manufacturer_reported" ? "manufacturer_reported" : null
    });
  }

  pts.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  return pts;
}

export function computeTelemetryRisk(
  points: TelemetryPointLike[],
  assumedLeafAirDeltaC: number,
  marginCThreshold: number
) {
  const cleaned = (points || [])
    .map((p) => ({
      tsMs: Date.parse(String(p.ts)),
      airTempC: Number(p.airTempC),
      rh: Number(p.rh),
      dewPointC: Number.isFinite(Number(p.dewPointC))
        ? Number(p.dewPointC)
        : dewPointC(Number(p.airTempC), Number(p.rh))
    }))
    .filter(
      (p) =>
        Number.isFinite(p.tsMs) &&
        Number.isFinite(p.airTempC) &&
        Number.isFinite(p.rh) &&
        Number.isFinite(p.dewPointC)
    )
    .sort((a, b) => a.tsMs - b.tsMs);

  if (!cleaned.length) return null;

  let minAirTempC = cleaned[0].airTempC;
  let maxRh = cleaned[0].rh;
  let maxDewPointC = cleaned[0].dewPointC;
  let minMarginC = Infinity;
  let minMarginAtIso = "";
  let timeAtRiskMinutes = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const p = cleaned[i];
    minAirTempC = Math.min(minAirTempC, p.airTempC);
    maxRh = Math.max(maxRh, p.rh);
    maxDewPointC = Math.max(maxDewPointC, p.dewPointC);

    const leafTempC = p.airTempC - assumedLeafAirDeltaC;
    const marginC = leafTempC - p.dewPointC;
    if (marginC < minMarginC) {
      minMarginC = marginC;
      minMarginAtIso = new Date(p.tsMs).toISOString();
    }

    if (i < cleaned.length - 1) {
      const next = cleaned[i + 1];
      const dtMin = Math.max(0, Math.min(120, (next.tsMs - p.tsMs) / 60000));
      if (marginC <= marginCThreshold) timeAtRiskMinutes += dtMin;
    }
  }

  let riskBand: "low" | "medium" | "high" = "low";
  if (minMarginC <= 0) riskBand = "high";
  else if (minMarginC <= marginCThreshold) riskBand = "medium";

  return {
    riskBand,
    pointsAnalyzed: cleaned.length,
    extremes: {
      minAirTempC,
      maxRh,
      maxDewPointC,
      minCondensationMarginC: minMarginC
    },
    timeAtRiskMinutes: Math.round(timeAtRiskMinutes),
    minMarginAtIso
  };
}
