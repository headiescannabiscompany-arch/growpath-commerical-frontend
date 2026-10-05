// Deliberate allowlist: public content is not automatically marketing content.
// In particular /contact, /feedback, auth, commerce and all account/workspace
// routes can contain user input or identifiers and are not tracked.
export const MARKETING_PATHS = new Set([
  "/",
  "/features",
  "/pricing",
  "/personal-grower",
  "/commercial-cultivation",
  "/facility-management",
  "/nurseries-breeders",
  "/grow-stores",
  "/creators-educators",
  "/about",
  "/updates",
  "/grow-journal-app",
  "/vs/plntrk",
  "/vs/growtrackr",
  "/vs/grow-with-jane"
]);
const ORIGIN = "https://growpathai.com";
const EVENTS = new Set(["$pageview", "$pageleave", "$autocapture", "$rageclick"]);
// Only fixed, reviewed navigation labels, never arbitrary rendered/user text.
const PUBLIC_LABELS = new Set([
  "Create free account",
  "Create a free account",
  "Explore features",
  "Features",
  "Pricing",
  "Store",
  "Courses",
  "Forum",
  "About",
  "Sign in",
  "Contact",
  "Updates",
  "Nurseries & breeders",
  "Grow stores",
  "Compare PLNTRK",
  "Compare Grow with Jane",
  "Compare GrowTrackr",
  "Grow journal app",
  "Privacy",
  "Terms",
  "AI disclaimer",
  "Explore the grow journal",
  "Explore Commercial",
  "Explore Facility"
]);
const SCALARS = new Set([
  "distinct_id",
  "$device_id",
  "$session_id",
  "$window_id",
  "$insert_id",
  "$lib",
  "$lib_version",
  "$browser",
  "$browser_version",
  "$os",
  "$os_version",
  "$device_type",
  "$screen_height",
  "$screen_width",
  "$viewport_height",
  "$viewport_width",
  "$event_type",
  "$is_identified",
  "$pageview_id"
]);
type Event = {
  event: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
};

function publicPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw, ORIGIN);
    if (url.origin !== ORIGIN || url.username || url.password) return null;
    const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
    return MARKETING_PATHS.has(path) ? path : null;
  } catch {
    return null;
  }
}

export function filterMarketingEvent(
  event: Event | null,
  currentUrl: string
): Event | null {
  // Re-check both locations on every event: SPA navigation must not carry a
  // private-route event, query token, form value or stale identity into marketing.
  if (!event || !EVENTS.has(event.event) || !publicPath(currentUrl)) return null;
  const path = publicPath(event.properties.$current_url);
  if (!path || event.properties.$is_identified === true) return null;
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event.properties)) {
    if (SCALARS.has(key) && ["string", "number", "boolean"].includes(typeof value)) {
      properties[key] = value;
    }
  }
  properties.$current_url = ORIGIN + path;
  properties.$pathname = path;
  properties.$host = "growpathai.com";
  if (
    typeof event.properties.$el_text === "string" &&
    PUBLIC_LABELS.has(event.properties.$el_text)
  ) {
    properties.$el_text = event.properties.$el_text;
  }
  // Only HeyCatch's documented single-character channel code is admitted.
  // Arbitrary UTM/referrer/search/fragment values and nested properties are dropped.
  if (
    event.properties.utm_source === "heycatch" &&
    typeof event.properties.utm_campaign === "string" &&
    /^[a-z0-9]$/.test(event.properties.utm_campaign)
  ) {
    properties.utm_source = "heycatch";
    properties.utm_campaign = event.properties.utm_campaign;
  }
  return {
    event: event.event,
    properties,
    ...(typeof event.uuid === "string" ? { uuid: event.uuid } : {}),
    ...(typeof event.timestamp === "string" ? { timestamp: event.timestamp } : {})
  };
}
