type RecordValue = Record<string, any>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function id(value: any): string {
  return typeof value === "string" ? value : text(value?.id ?? value?._id);
}

function name(value: unknown, recordId = ""): string {
  const label = text(value);
  return label && label !== recordId && !/^[a-f\d]{24}$/i.test(label) ? label : "";
}

export function facilityGrowRoomLabel(grow: RecordValue, rooms: RecordValue[]): string {
  const roomId = id(grow.roomId) || id(grow.room);
  const room = rooms.find((row) => id(row) === roomId);
  const label =
    name(room?.name ?? room?.title, roomId) ||
    name(grow.roomName, roomId) ||
    name(grow.room?.name ?? grow.room?.title, roomId);
  return label || (roomId ? "Linked room" : "Not set");
}

export function readableFacilityGrowDate(value: unknown): string {
  if (value == null || value === "") return "Not set";
  if (typeof value !== "string") return "Date unavailable";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  if (!match) return "Date unavailable";
  const [, year, month, day] = match;
  const calendar = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (
    !Number.isFinite(calendar.getTime()) ||
    calendar.getUTCFullYear() !== Number(year) ||
    calendar.getUTCMonth() + 1 !== Number(month) ||
    calendar.getUTCDate() !== Number(day)
  )
    return "Date unavailable";
  const dateOnly = value.length === 10;
  const date = dateOnly ? calendar : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  // A calendar date is not a UTC instant. Keep its chosen day in every timezone.
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : {})
  });
}

export function facilityGrowDateSummary(grow: RecordValue) {
  const start = grow.startedAt || grow.startDate;
  return start
    ? { label: "Started", value: readableFacilityGrowDate(start) }
    : grow.createdAt
      ? { label: "Created", value: readableFacilityGrowDate(grow.createdAt) }
      : { label: "Started", value: "Not set" };
}

export function facilityGrowSubtitle(grow: RecordValue, rooms: RecordValue[]): string {
  const phase = text(grow.phase ?? grow.stage ?? grow.status).replace(/_/g, " ");
  const date = facilityGrowDateSummary(grow);
  return [
    `Room: ${facilityGrowRoomLabel(grow, rooms)}`,
    phase ? `Phase: ${phase.charAt(0).toUpperCase()}${phase.slice(1)}` : "",
    `${date.label}: ${date.value}`
  ]
    .filter(Boolean)
    .join(" · ");
}
