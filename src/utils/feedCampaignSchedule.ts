import { zonedLocalDateTimeToIsoStrict } from "@/features/businessDesk/zonedDateTime";

export function getFeedCampaignTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** Convert only this form's wall-clock values, not API instants or date-only tasks. */
export function resolveFeedCampaignSchedule(
  start: string,
  end: string,
  timeZone: string
) {
  const warnings: string[] = [];
  function instant(value: string, label: string): string | undefined {
    if (!value.trim()) return undefined;
    if (!timeZone) {
      warnings.push(
        `${label}: The device timezone is unavailable. Check your device timezone settings and choose the time again.`
      );
      return undefined;
    }
    try {
      return zonedLocalDateTimeToIsoStrict(value, timeZone) || undefined;
    } catch (error) {
      warnings.push(
        `${label}: ${error instanceof Error ? error.message : "Choose a valid local date and time."}`
      );
      return undefined;
    }
  }
  const startsAt = instant(start, "Campaign start");
  const endsAt = instant(end, "Campaign end");
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    warnings.push("Campaign end must be after its start.");
  }
  return { startsAt, endsAt, warnings };
}
