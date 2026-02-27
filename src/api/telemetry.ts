import { apiRequest } from "./apiRequest";
import type {
  BulkIngestTelemetryPointsInput,
  BulkIngestTelemetryPointsResult,
  CreateTelemetrySourceInput,
  PulseDevice,
  PulsePullResult,
  PulseVerifyResult,
  TelemetryPoint,
  TelemetryPointsQuery,
  TelemetryPointsWindowResult,
  TelemetrySource
} from "@/types/telemetry";

export const TELEMETRY_ROUTES = {
  SOURCES: "/api/telemetry/sources",
  POINTS_BULK: "/api/telemetry/points:bulk",
  POINTS: "/api/telemetry/points",
  PULSE_VERIFY: "/api/telemetry/pulse/verify",
  PULSE_DEVICES: "/api/telemetry/pulse/devices",
  PULSE_PULL: "/api/telemetry/pulse/pull"
} as const;

function normId(x: any): string {
  const id = x?.id ?? x?._id ?? "";
  return id ? String(id) : "";
}

function qs(params: Record<string, any>) {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

function unwrapData(res: any): any {
  if (res && typeof res === "object" && "ok" in res && res.ok === false) {
    const msg = res?.error?.message ?? res?.error ?? "Request failed";
    const err: any = new Error(String(msg));
    err.code = res?.error?.code;
    err.details = res?.error?.details;
    throw err;
  }
  if (res && typeof res === "object" && "data" in res) return (res as any).data;
  return res;
}

function unwrapList(res: any): any[] {
  const data = unwrapData(res);
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.tools && Array.isArray(data.tools)) return data.tools;
  if (data?.data?.items && Array.isArray(data.data.items)) return data.data.items;
  if (data?.data?.tools && Array.isArray(data.data.tools)) return data.data.tools;
  if (data?.sources && Array.isArray(data.sources)) return data.sources;
  if (data?.devices && Array.isArray(data.devices)) return data.devices;
  return [];
}

function unwrapCreated(res: any): any {
  const data = unwrapData(res);
  if (data?.created) return data.created;
  if (data?.tool) return data.tool;
  if (data?.source) return data.source;
  if (data?.data?.created) return data.data.created;
  if (data?.data?.tool) return data.data.tool;
  if (data?.data?.source) return data.data.source;
  return data;
}

function normalizeSource(raw: any): TelemetrySource {
  const id = normId(raw);
  const growId = String(raw?.growId ?? raw?.growID ?? "");
  const type = String(raw?.type ?? "");
  const name = String(raw?.name ?? "");
  const timezone = String(raw?.timezone ?? "America/New_York");
  const isActive = raw?.isActive === false ? false : true;

  const config = { ...(raw?.config ?? {}) };
  if (config?.pulse?.apiKey) {
    config.pulse = { ...config.pulse };
    delete config.pulse.apiKey;
  }

  return {
    id,
    growId,
    type: type as any,
    name,
    timezone,
    isActive,
    config,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
    deletedAt: raw?.deletedAt ?? null
  };
}

function normalizePoint(raw: any): TelemetryPoint {
  const id = raw?.id ?? raw?._id;
  const sourceId = String(raw?.sourceId ?? raw?.sourceID ?? "");
  return {
    id: id ? String(id) : undefined,
    sourceId,
    ts: String(raw?.ts ?? raw?.timestamp ?? raw?.time ?? ""),
    airTempC: Number(raw?.airTempC ?? raw?.tempC ?? raw?.airTemp ?? raw?.temp),
    rh: Number(raw?.rh ?? raw?.humidity ?? raw?.RH),
    leafTempC: raw?.leafTempC ?? null,
    canopyTempC: raw?.canopyTempC ?? null,
    canopyRh: raw?.canopyRh ?? null,
    dewPointC: raw?.dewPointC,
    vpdKpa: raw?.vpdKpa ?? null
  };
}

export async function listTelemetrySources(growId: string): Promise<TelemetrySource[]> {
  const path = `${TELEMETRY_ROUTES.SOURCES}${qs({ growId })}`;
  const res = await apiRequest(path, { method: "GET" });
  const list = unwrapList(res);
  return list.map(normalizeSource);
}

export async function createTelemetrySource(
  input: CreateTelemetrySourceInput
): Promise<TelemetrySource> {
  const body = {
    growId: input.growId,
    type: input.type,
    name: input.name,
    timezone: input.timezone,
    isActive: input.isActive !== false,
    config: input.config ?? {}
  };

  const res = await apiRequest(TELEMETRY_ROUTES.SOURCES, { method: "POST", body });
  const created = unwrapCreated(res);
  return normalizeSource(created);
}

export async function bulkIngestTelemetryPoints(
  input: BulkIngestTelemetryPointsInput
): Promise<BulkIngestTelemetryPointsResult> {
  const body = {
    sourceId: input.sourceId,
    mode: input.mode ?? "upsert",
    points: input.points
  };

  const res = await apiRequest(TELEMETRY_ROUTES.POINTS_BULK, { method: "POST", body });
  const data = unwrapData(res);

  return {
    ingested: Number(data?.ingested ?? data?.data?.ingested ?? 0),
    updated: Number(data?.updated ?? data?.data?.updated ?? 0),
    skipped: Number(data?.skipped ?? data?.data?.skipped ?? 0)
  };
}

export async function getTelemetryPoints(
  query: TelemetryPointsQuery
): Promise<TelemetryPointsWindowResult> {
  const path =
    `${TELEMETRY_ROUTES.POINTS}` +
    qs({
      sourceId: query.sourceId,
      startIso: query.startIso,
      endIso: query.endIso,
      limit: query.limit ?? 5000
    });

  const res = await apiRequest(path, { method: "GET" });
  const data = unwrapData(res);

  const pointsRaw = data?.points ?? data?.items ?? data?.data?.points ?? data?.data?.items ?? [];
  const points = Array.isArray(pointsRaw) ? pointsRaw.map(normalizePoint) : [];

  return {
    sourceId: String(data?.sourceId ?? query.sourceId),
    startIso: String(data?.startIso ?? query.startIso),
    endIso: String(data?.endIso ?? query.endIso),
    points
  };
}

export async function verifyPulseApiKey(apiKey: string): Promise<PulseVerifyResult> {
  const res = await apiRequest(TELEMETRY_ROUTES.PULSE_VERIFY, {
    method: "POST",
    body: { apiKey }
  });
  const data = unwrapData(res);
  return { ok: true, ...(data ?? {}) };
}

export async function listPulseDevices(apiKey: string): Promise<PulseDevice[]> {
  const path = `${TELEMETRY_ROUTES.PULSE_DEVICES}${qs({ apiKey })}`;
  const res = await apiRequest(path, { method: "GET" });
  const list = unwrapList(res);
  return list.map((d: any) => ({ id: normId(d) || String(d?.deviceId ?? ""), ...d }));
}

export async function pullPulseWindow(
  sourceId: string,
  startIso: string,
  endIso: string
): Promise<PulsePullResult> {
  const res = await apiRequest(TELEMETRY_ROUTES.PULSE_PULL, {
    method: "POST",
    body: { sourceId, startIso, endIso }
  });
  const data = unwrapData(res);

  return {
    sourceId: String(data?.sourceId ?? sourceId),
    pulled: Number(data?.pulled ?? 0),
    updated: Number(data?.updated ?? 0),
    startIso: String(data?.startIso ?? startIso),
    endIso: String(data?.endIso ?? endIso),
    lastPointIso: data?.lastPointIso ? String(data.lastPointIso) : undefined
  };
}
