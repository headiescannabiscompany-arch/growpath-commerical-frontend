export type TelemetrySourceType = "pulse" | "upload" | "manual";

export type TelemetrySource = {
  id: string;
  growId: string;
  type: TelemetrySourceType;
  name: string;
  timezone: string;
  isActive: boolean;
  config: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type TelemetryPoint = {
  id?: string;
  sourceId: string;
  ts: string;
  airTempC: number;
  rh: number;
  leafTempC?: number | null;
  canopyTempC?: number | null;
  canopyRh?: number | null;
  dewPointC?: number;
  vpdKpa?: number | null;
};

export type CreateTelemetrySourceInput = {
  growId: string;
  type: TelemetrySourceType;
  name: string;
  timezone: string;
  config?: Record<string, any>;
  isActive?: boolean;
};

export type BulkIngestMode = "insert" | "upsert";

export type BulkIngestTelemetryPointsInput = {
  sourceId: string;
  mode?: BulkIngestMode;
  points: Array<{
    ts: string;
    airTempC: number;
    rh: number;
    leafTempC?: number | null;
    canopyTempC?: number | null;
    canopyRh?: number | null;
  }>;
};

export type BulkIngestTelemetryPointsResult = {
  ingested: number;
  updated: number;
  skipped: number;
};

export type TelemetryPointsQuery = {
  sourceId: string;
  startIso: string;
  endIso: string;
  limit?: number;
};

export type TelemetryPointsWindowResult = {
  sourceId: string;
  startIso: string;
  endIso: string;
  points: TelemetryPoint[];
};

export type PulseDevice = {
  id: string;
  name?: string;
  model?: string;
  [k: string]: any;
};

export type PulseVerifyResult = {
  ok: boolean;
  [k: string]: any;
};

export type PulsePullResult = {
  sourceId: string;
  pulled: number;
  updated: number;
  startIso: string;
  endIso: string;
  lastPointIso?: string;
};
