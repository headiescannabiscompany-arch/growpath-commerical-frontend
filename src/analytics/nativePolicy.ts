import {
  MARKETING_PATHS,
  HEYCATCH_PROJECT_KEY,
  HEYCATCH_INGESTION_TOKEN
} from "./marketingPolicy";

// Exact screen names only. Never add dynamic detail routes, journals, auth,
// checkout, feedback, profiles, messages, Admin, Vault, or route parameters.
export const NATIVE_SCREENS = new Set([
  ...MARKETING_PATHS,
  "/discover",
  "/courses",
  "/store",
  "/lives"
]);
// Public project metadata only; never copy device, account or caller properties.
export const NATIVE_PROJECT_METADATA = {
  key: HEYCATCH_PROJECT_KEY,
  sdk_version: "0.8.0",
  sdk_stage: "prod",
  framework: "react-native",
  framework_version: "0",
  agent: "codex",
  api_host: "https://in.heycatch.ai"
};
type NativeEvent = {
  event: string;
  properties?: Record<string, unknown>;
  uuid?: string;
  timestamp?: Date;
};
type SafeEvent = Omit<NativeEvent, "properties"> & {
  properties: Record<string, string | number | boolean | Record<string, string>>;
};
const SAFE_PROPERTIES = new Set([
  "distinct_id",
  "$session_id",
  "$lib",
  "$lib_version",
  "$os_name",
  "$os_version",
  "$app_version",
  "$app_build"
]);
export function filterNativeEvent(
  event: NativeEvent | null,
  currentPath: string,
  consent: boolean
): SafeEvent | null {
  if (
    !consent ||
    !event ||
    !["$screen", "$groupidentify"].includes(event.event) ||
    !NATIVE_SCREENS.has(currentPath)
  )
    return null;
  const source = event.properties || {};
  if (source.$is_identified === true) return null;
  if (event.event === "$screen" && source.$screen_name !== currentPath) return null;
  if (
    event.event === "$groupidentify" &&
    (source.$group_type !== "project" || source.$group_key !== HEYCATCH_PROJECT_KEY)
  )
    return null;
  if (source.token !== undefined && source.token !== HEYCATCH_INGESTION_TOKEN)
    return null;
  const properties: SafeEvent["properties"] = {};
  for (const [key, value] of Object.entries(source)) {
    if (
      SAFE_PROPERTIES.has(key) &&
      (typeof value === "string" || typeof value === "number")
    )
      properties[key] = value;
  }
  if (source.token === HEYCATCH_INGESTION_TOKEN)
    properties.token = HEYCATCH_INGESTION_TOKEN;
  Object.assign(properties, {
    $is_identified: false,
    $process_person_profile: false,
    $groups: { project: HEYCATCH_PROJECT_KEY },
    heycatch_project_key: HEYCATCH_PROJECT_KEY,
    heycatch_sdk_version: "0.8.0",
    heycatch_sdk_stage: "prod",
    heycatch_framework: "react-native",
    heycatch_framework_version: "0",
    heycatch_agent: "codex",
    heycatch_integration: "growpath-screen-only-v1"
  });
  if (event.event === "$screen") properties.$screen_name = currentPath;
  else
    Object.assign(properties, {
      $group_type: "project",
      $group_key: HEYCATCH_PROJECT_KEY,
      $group_set: { ...NATIVE_PROJECT_METADATA }
    });
  return {
    event: event.event,
    properties,
    ...(typeof event.uuid === "string" ? { uuid: event.uuid } : {}),
    ...(event.timestamp instanceof Date ? { timestamp: event.timestamp } : {})
  };
}
