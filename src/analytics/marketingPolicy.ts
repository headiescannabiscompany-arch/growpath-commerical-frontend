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
export const HEYCATCH_PROJECT_KEY = "hck_pk_Vu7gSIhkxVCmtc6M8S_lkn4S_EQjzMOE";
// Public ingestion key shipped by @heycatch/sdk 0.8.0, NOT a GrowPath login
// token or server secret. The SDK drops events when beforeSend removes it.
// The installed-SDK contract test must be reviewed when upgrading the package.
export const HEYCATCH_INGESTION_TOKEN =
  "phc_oiDt6uXiBiEA2aT43SMzMAFE9D4gMVkRP3BtvYRsmHqe";
const EVENTS = new Set([
  "$pageview",
  "$pageleave",
  "$autocapture",
  "$rageclick",
  "$groupidentify"
]);
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
  if (event.event === "$groupidentify") {
    // SDK init registers the public PROJECT, not a person. Preserve that part
    // of the installation protocol without admitting customer/account groups.
    if (
      event.properties.$group_type !== "project" ||
      event.properties.$group_key !== HEYCATCH_PROJECT_KEY
    )
      return null;
    properties.$group_type = "project";
    properties.$group_key = HEYCATCH_PROJECT_KEY;
    // Never forward arbitrary group properties, identities or origin values.
    properties.$group_set = {
      key: HEYCATCH_PROJECT_KEY,
      sdk_version: "0.8.0",
      sdk_stage: "prod",
      framework: "react",
      framework_version: "19",
      agent: "codex",
      origin: ORIGIN,
      api_host: "https://in.heycatch.ai"
    };
  }
  // Admit only the reviewed public SDK routing token, never arbitrary tokens.
  if (event.properties.token === HEYCATCH_INGESTION_TOKEN) {
    properties.token = HEYCATCH_INGESTION_TOKEN;
  } else if (event.properties.token !== undefined) {
    return null;
  }
  // Retain project attribution without forwarding arbitrary groups/identities.
  const groups = event.properties.$groups;
  if (
    groups &&
    typeof groups === "object" &&
    "project" in groups &&
    groups.project === HEYCATCH_PROJECT_KEY
  ) {
    properties.$groups = { project: HEYCATCH_PROJECT_KEY };
  }
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
