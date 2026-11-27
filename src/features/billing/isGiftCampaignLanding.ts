const campaignFields = new Set([
  "utm_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "msclkid",
  "gbraid",
  "wbraid",
  "gad_source"
]);

function isGiftCampaignQuery(entries: Iterable<[string, unknown]>): boolean {
  const seen = new Set<string>();
  for (const [name, value] of entries) {
    if (value === undefined) continue;
    if (seen.has(name) || typeof value !== "string") return false;
    seen.add(name);
    if (name === "gift") {
      if (value !== "1") return false;
    } else if (!campaignFields.has(name) || value.length > 2048) {
      return false;
    }
  }
  return seen.has("gift") && seen.size > 1;
}

// Ad networks append attribution fields to the published gift URL. They select
// no account, plan, payment action or redirect target. This predicate controls
// the offers view only. Auth continuation still uses its own exact route check.
export function isGiftCampaignLanding(
  params: Record<string, string | string[] | undefined>,
  fragment: unknown,
  rawBrowserPath?: unknown
): boolean {
  if (fragment || !isGiftCampaignQuery(Object.entries(params))) return false;
  if (rawBrowserPath === undefined) return true;
  if (
    typeof rawBrowserPath !== "string" ||
    !rawBrowserPath.startsWith("/offers?") ||
    rawBrowserPath.includes("#")
  )
    return false;
  const entries: [string, string][] = [];
  new URLSearchParams(rawBrowserPath.slice("/offers?".length)).forEach((value, key) => {
    entries.push([key, value]);
  });
  return isGiftCampaignQuery(entries);
}
