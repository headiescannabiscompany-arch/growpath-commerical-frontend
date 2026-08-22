import { normalizeIanaTimeZone } from "@/api/businessDesk";

type WallDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type ZonedDateTimeErrorCode =
  | "INVALID_TIME_ZONE"
  | "INVALID_LOCAL_DATE_TIME"
  | "NONEXISTENT_LOCAL_DATE_TIME"
  | "AMBIGUOUS_LOCAL_DATE_TIME";

export class ZonedDateTimeError extends Error {
  readonly code: ZonedDateTimeErrorCode;

  constructor(code: ZonedDateTimeErrorCode, message: string) {
    super(message);
    this.name = "ZonedDateTimeError";
    this.code = code;
  }
}

function formatterFor(timeZone: string) {
  const normalized = normalizeIanaTimeZone(timeZone);
  if (!normalized) {
    throw new ZonedDateTimeError("INVALID_TIME_ZONE", "Enter a valid IANA time zone.");
  }
  const cached = FORMATTERS.get(normalized);
  if (cached) return { formatter: cached, timeZone: normalized };
  const formatter = new Intl.DateTimeFormat("en-GB-u-ca-iso8601-hc-h23", {
    timeZone: normalized,
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  FORMATTERS.set(normalized, formatter);
  return { formatter, timeZone: normalized };
}

function formattedParts(instantMs: number, timeZone: string): WallDateTimeParts {
  const { formatter } = formatterFor(timeZone);
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of formatter.formatToParts(new Date(instantMs))) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  const parsed = {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute)
  };
  if (Object.values(parsed).some((value) => !Number.isInteger(value))) {
    throw new ZonedDateTimeError(
      "INVALID_LOCAL_DATE_TIME",
      "This device could not resolve the selected time zone."
    );
  }
  return parsed;
}

function partsUtcMs(parts: WallDateTimeParts) {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(parts.hour, parts.minute, 0, 0);
  return date.getTime();
}

function sameParts(first: WallDateTimeParts, second: WallDateTimeParts) {
  return (
    first.year === second.year &&
    first.month === second.month &&
    first.day === second.day &&
    first.hour === second.hour &&
    first.minute === second.minute
  );
}

function parseWallDateTime(value: string): WallDateTimeParts {
  const raw = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw);
  if (!match) {
    throw new ZonedDateTimeError(
      "INVALID_LOCAL_DATE_TIME",
      "Choose a valid local date and time."
    );
  }
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5])
  };
  const roundTrip = formattedUtcParts(partsUtcMs(parts));
  if (!sameParts(parts, roundTrip)) {
    throw new ZonedDateTimeError(
      "INVALID_LOCAL_DATE_TIME",
      "Choose a valid local date and time."
    );
  }
  return parts;
}

function formattedUtcParts(instantMs: number): WallDateTimeParts {
  const date = new Date(instantMs);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes()
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function wallString(parts: WallDateTimeParts) {
  return `${String(parts.year).padStart(4, "0")}-${pad(parts.month)}-${pad(
    parts.day
  )}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function possibleInstants(parts: WallDateTimeParts, timeZone: string) {
  const wallAsUtcMs = partsUtcMs(parts);
  const sampleDeltas = [
    -370 * DAY_MS,
    -30 * DAY_MS,
    -7 * DAY_MS,
    -3 * DAY_MS,
    -DAY_MS,
    -12 * HOUR_MS,
    0,
    12 * HOUR_MS,
    DAY_MS,
    3 * DAY_MS,
    7 * DAY_MS,
    30 * DAY_MS,
    370 * DAY_MS
  ];
  const offsets = new Set<number>();
  for (const delta of sampleDeltas) {
    const sampleMs = wallAsUtcMs + delta;
    offsets.add(partsUtcMs(formattedParts(sampleMs, timeZone)) - sampleMs);
  }
  const matches = new Set<number>();
  for (const offset of offsets) {
    const candidateMs = wallAsUtcMs - offset;
    if (sameParts(formattedParts(candidateMs, timeZone), parts)) {
      matches.add(candidateMs);
    }
  }
  return [...matches].sort((first, second) => first - second);
}

function exactHintForWall(
  exactIsoHint: string | null | undefined,
  parts: WallDateTimeParts,
  timeZone: string
) {
  if (!exactIsoHint) return null;
  const hint = new Date(exactIsoHint);
  if (!Number.isFinite(hint.getTime())) return null;
  return sameParts(formattedParts(hint.getTime(), timeZone), parts)
    ? hint.toISOString()
    : null;
}

export function zonedLocalDateTimeToIsoStrict(
  value: string | null | undefined,
  timeZone: string,
  exactIsoHint?: string | null
) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = formatterFor(timeZone).timeZone;
  const parts = parseWallDateTime(raw);
  const matches = possibleInstants(parts, normalized);
  const exactHint = exactHintForWall(exactIsoHint, parts, normalized);
  if (exactHint) return exactHint;
  if (matches.length === 1) return new Date(matches[0]).toISOString();
  if (matches.length > 1) {
    throw new ZonedDateTimeError(
      "AMBIGUOUS_LOCAL_DATE_TIME",
      `${wallString(parts)} occurs twice in ${normalized} because of a clock change. Choose a different time so GrowPathAI does not guess which instant you mean.`
    );
  }
  throw new ZonedDateTimeError(
    "NONEXISTENT_LOCAL_DATE_TIME",
    `${wallString(parts)} does not exist in ${normalized} because of a clock change. Choose a valid time.`
  );
}

export function isoInstantToZonedLocalDateTime(
  value: string | null | undefined,
  timeZone: string
) {
  if (!value) return "";
  const normalized = formatterFor(timeZone).timeZone;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return wallString(formattedParts(date.getTime(), normalized));
}
