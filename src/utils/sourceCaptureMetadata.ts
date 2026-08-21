import type { EvidenceSourceCaptureMetadata } from "@/types/evidence";

type ExifRecord = Record<string, unknown>;

function record(value: unknown): ExifRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ExifRecord)
    : null;
}

function first(records: Array<ExifRecord | null>, keys: string[]) {
  for (const source of records) {
    if (!source) continue;
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return null;
}

function rational(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  const candidate = record(value);
  if (candidate) {
    const numerator = Number(candidate.numerator);
    const denominator = Number(candidate.denominator);
    return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
      ? numerator / denominator
      : null;
  }
  return null;
}

function decimalCoordinate(value: unknown) {
  if (Array.isArray(value)) {
    const degrees = rational(value[0]);
    const minutes = rational(value[1]);
    const seconds = rational(value[2]);
    if (
      degrees === null ||
      minutes === null ||
      seconds === null ||
      minutes < 0 ||
      minutes >= 60 ||
      seconds < 0 ||
      seconds >= 60
    )
      return null;
    const sign = degrees < 0 ? -1 : 1;
    return {
      coordinate: sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600),
      degreeMinuteSecond: true
    };
  }
  const coordinate = rational(value);
  return coordinate === null ? null : { coordinate, degreeMinuteSecond: false };
}

function signedCoordinate(
  value: unknown,
  reference: unknown,
  maximum: number,
  positiveReference: "N" | "E",
  negativeReference: "S" | "W"
) {
  const parsed = decimalCoordinate(value);
  if (parsed === null) return null;
  const ref = String(reference || "")
    .trim()
    .toUpperCase();
  if (ref && ref !== positiveReference && ref !== negativeReference) return null;
  if (parsed.degreeMinuteSecond && !ref && parsed.coordinate >= 0) return null;
  if (ref === positiveReference && parsed.coordinate < 0) return null;
  const signed =
    ref === negativeReference ? -Math.abs(parsed.coordinate) : parsed.coordinate;
  if (!Number.isFinite(signed) || Math.abs(signed) > maximum) return null;
  if (Math.abs(signed) === maximum && parsed.degreeMinuteSecond) {
    const absoluteDegrees = Math.abs(parsed.coordinate);
    if (absoluteDegrees !== maximum) return null;
  }
  return signed;
}

function validUtcParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
) {
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  )
    return null;
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second
    ? parsed.toISOString()
    : null;
}

function timezoneOffset(value: unknown) {
  const match = /^(Z|([+-])(\d{2}):?(\d{2}))$/i.exec(String(value || "").trim());
  if (!match) return "";
  if (match[1].toUpperCase() === "Z") return "Z";
  const hours = Number(match[3]);
  const minutes = Number(match[4]);
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) return "";
  return `${match[2]}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function pairedCaptureDate(records: Array<ExifRecord | null>) {
  const candidates = [
    { dateKey: "DateTimeOriginal", offsetKey: "OffsetTimeOriginal" },
    { dateKey: "DateTimeDigitized", offsetKey: "OffsetTimeDigitized" },
    // ExifTool commonly exposes DateTimeDigitized as CreateDate.
    { dateKey: "CreateDate", offsetKey: "OffsetTimeDigitized" }
  ] as const;
  for (const candidate of candidates) {
    for (const source of records) {
      if (!source) continue;
      const value = source[candidate.dateKey];
      if (value === undefined || value === null || value === "") continue;
      const parsed = normalizeSourceCaptureDateCandidate(
        value,
        source[candidate.offsetKey]
      );
      if (parsed) return parsed;
    }
  }
  return null;
}

export function normalizeSourceCaptureDateCandidate(
  value: unknown,
  sourceOffset?: unknown
) {
  if (!value) return null;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    const capturedAt = value.toISOString();
    return {
      capturedAt,
      capturedLocalDate: capturedAt.slice(0, 10),
      captureDatePrecision: "instant" as const
    };
  }
  const text = String(value).trim();
  const exif = text.match(
    /^(\d{4}):(\d{2}):(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?)?$/
  );
  if (exif) {
    const [, year, month, day, hour = "00", minute = "00", second = "00"] = exif;
    if (
      !validUtcParts(
        Number(year),
        Number(month),
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    ) {
      return null;
    }
    const capturedLocalDate = `${year}-${month}-${day}`;
    const offset = timezoneOffset(sourceOffset);
    if (!offset || !exif[4]) {
      return { capturedLocalDate, captureDatePrecision: "date" as const };
    }
    const capturedAt = new Date(
      `${capturedLocalDate}T${hour}:${minute}:${second}${offset}`
    );
    return Number.isFinite(capturedAt.getTime())
      ? {
          capturedAt: capturedAt.toISOString(),
          capturedLocalDate,
          captureDatePrecision: "instant" as const
        }
      : null;
  }
  const iso = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/
  );
  if (!iso) return null;
  const [, year, month, day, hour = "00", minute = "00", second = "00", rawZone] = iso;
  if (
    !validUtcParts(
      Number(year),
      Number(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  ) {
    return null;
  }
  const capturedLocalDate = `${year}-${month}-${day}`;
  const zone = timezoneOffset(rawZone);
  if (!zone || !iso[4]) {
    return { capturedLocalDate, captureDatePrecision: "date" as const };
  }
  const parsed = new Date(`${capturedLocalDate}T${hour}:${minute}:${second}${zone}`);
  return Number.isFinite(parsed.getTime())
    ? {
        capturedAt: parsed.toISOString(),
        capturedLocalDate,
        captureDatePrecision: "instant" as const
      }
    : null;
}

/** Returns only a real absolute instant. Camera-local dates without timezone stay date-only. */
export function normalizeSourceCaptureDate(value: unknown) {
  return normalizeSourceCaptureDateCandidate(value)?.capturedAt || null;
}

/**
 * Normalizes the ordinary EXIF shapes returned by iOS, Android, and camera files.
 * The result remains private and is only a candidate until the owner confirms it.
 */
export function parsePickerSourceCaptureMetadata(
  value: unknown
): EvidenceSourceCaptureMetadata | undefined {
  const root = record(value);
  if (!root) return undefined;
  const gps = record(root.GPS) || record(root.gps);
  const sources = [root, gps];
  const latitude = signedCoordinate(
    first(sources, ["latitude", "Latitude", "GPSLatitude"]),
    first(sources, ["latitudeRef", "LatitudeRef", "GPSLatitudeRef"]),
    90,
    "N",
    "S"
  );
  const longitude = signedCoordinate(
    first(sources, ["longitude", "Longitude", "GPSLongitude"]),
    first(sources, ["longitudeRef", "LongitudeRef", "GPSLongitudeRef"]),
    180,
    "E",
    "W"
  );
  const captureDate = pairedCaptureDate(sources);
  const hasLocation = latitude !== null && longitude !== null;
  if (!hasLocation && !captureDate) return undefined;
  return {
    ...(hasLocation ? { latitude, longitude } : {}),
    ...(captureDate || {}),
    source: "picker_exif"
  };
}
