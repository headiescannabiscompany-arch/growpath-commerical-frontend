import { API_URL } from "@/api/apiRequest";
import { config } from "@/config/config";
import { Platform } from "react-native";

const WEB = "https://growpath-web-staging.onrender.com";
const API = "https://growpath-api-staging.onrender.com";
const controlsPath = "/live-backstage";
const programPath = "/live-backstage-program";

export type StagingBackstageSurface = "controls" | "program";

function stagingLocation() {
  if (Platform.OS !== "web" || process.env.EXPO_PUBLIC_WEB_EXPORT_TARGET !== "staging" ||
      API_URL !== API || typeof window === "undefined" || window.location.origin !== WEB) return null;
  return window.location;
}

export function isCleanStagingProgramPath(pathname: string) {
  return pathname === programPath && stagingLocation()?.pathname === programPath;
}

export function readStagingBackstageDraftHostId() {
  const location = stagingLocation();
  if (!location || config.sentryDsn || location.pathname !== controlsPath ||
      location.search !== "?setup=draft" || location.hash) return null;
  const hostId = process.env.EXPO_PUBLIC_BACKSTAGE_DRAFT_HOST_ID;
  return typeof hostId === "string" && /^[a-f0-9]{24}$/.test(hostId) ? hostId : null;
}

export function readStagingBackstageLiveId(surface: StagingBackstageSurface) {
  const location = stagingLocation();
  // Generic app monitoring does not yet scrub this private signaling traffic.
  if (!location || config.sentryDsn || location.hash ||
      location.pathname !== (surface === "program" ? programPath : controlsPath)) return null;
  const query = new URLSearchParams(location.search);
  const ids = query.getAll("liveId");
  let hasExtraParameter = false;
  query.forEach((_value, key) => { if (key !== "liveId") hasExtraParameter = true; });
  if (ids.length !== 1 || hasExtraParameter || !/^[a-f0-9]{24}$/.test(ids[0])) return null;
  return ids[0];
}
