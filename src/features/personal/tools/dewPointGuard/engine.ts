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

export type ParsedCsv = { headers: string[]; rows: string[][] };

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\"") {
      const next = line[i + 1];
      if (inQuotes && next === "\"") {
        cur += "\"";
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
  const text = String(csvText || "").replace(/\r\n/g, "\n").trim();
  const lines = text ? text.split("\n") : [];
  if (!lines.length) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).filter(Boolean).map(parseCsvLine);
  return { headers, rows };
}

export type CsvMapping = {
  tsCol: number;
  tempCol: number;
  rhCol: number;
  tempUnit: "F" | "C";
};

export type TelemetryPointLike = {
  ts: string;
  airTempC: number;
  rh: number;
  dewPointC?: number;
};

export function mapCsvToPoints(parsed: ParsedCsv, mapping: CsvMapping): TelemetryPointLike[] {
  const pts: TelemetryPointLike[] = [];

  for (const row of parsed.rows) {
    const tsRaw = String(row[mapping.tsCol] ?? "").trim();
    const tempRaw = Number(String(row[mapping.tempCol] ?? "").trim());
    const rhRaw = Number(String(row[mapping.rhCol] ?? "").trim());

    if (!tsRaw) continue;
    const t = new Date(tsRaw);
    if (!Number.isFinite(t.getTime())) continue;
    if (!Number.isFinite(tempRaw)) continue;
    if (!Number.isFinite(rhRaw) || rhRaw < 0 || rhRaw > 100) continue;

    const airTempC = mapping.tempUnit === "F" ? fToC(tempRaw) : tempRaw;
    pts.push({ ts: t.toISOString(), airTempC, rh: rhRaw });
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
