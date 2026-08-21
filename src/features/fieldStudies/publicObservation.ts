import type { FieldObservation } from "@/api/fieldStudies";

/**
 * Public Nature surfaces may render only the contributor-authored publication note.
 * The observation's private working notes are never a public fallback.
 */
export function publicObservationNotes(
  observation: Pick<FieldObservation, "publication">
) {
  return String(observation.publication?.publicNotes || "").trim();
}

function boundedCoordinate(value: unknown, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && Math.abs(coordinate) <= maximum
    ? coordinate
    : null;
}

/** Missing public coordinates stay missing; null/empty values must never become (0, 0). */
export function publicObservationCoordinates(
  observation: Pick<FieldObservation, "location">
) {
  const latitude = boundedCoordinate(observation.location?.latitude, 90);
  const longitude = boundedCoordinate(observation.location?.longitude, 180);
  return latitude === null || longitude === null ? null : { latitude, longitude };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;

function calendarParts(value: unknown) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(String(value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return { day, month, year };
}

/** Public observation dates preserve the contributor's calendar day; publish time is not a fallback. */
export function publicObservationDateLabel(
  observation: Pick<FieldObservation, "observationDate">
) {
  const parts = calendarParts(observation.observationDate);
  return parts
    ? `Observed ${MONTH_NAMES[parts.month - 1]} ${parts.day}, ${parts.year}`
    : "Observation date unavailable";
}
