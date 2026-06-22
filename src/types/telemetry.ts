export type TelemetrySourceType =
  | "pulse"
  | "ubibot"
  | "growlink"
  | "upload"
  | "manual";

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
  co2Ppm?: number | null;
  lightLux?: number | null;
  ppfd?: number | null;
  airPressureHpa?: number | null;
  voc?: number | null;
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
  ingested?: number;
  updated: number;
  skipped?: number;
  startIso: string;
  endIso: string;
  lastPointIso?: string;
};

export type UbiBotChannel = {
  id: string;
  name?: string;
  [k: string]: any;
};

export type UbiBotVerifyResult = {
  ok: boolean;
  [k: string]: any;
};

export type UbiBotMqttSettingsResult = {
  host: string;
  port: number;
  username: string;
  password?: string;
  topic: string;
  heartbeatUrl?: string;
  heartbeatIntervalMs?: number;
};

export type UbiBotPullResult = {
  sourceId: string;
  pulled: number;
  ingested?: number;
  updated: number;
  skipped?: number;
  startIso: string;
  endIso: string;
  lastPointIso?: string;
};

export type GrowlinkController = {
  id: string;
  name?: string;
  serialNumber?: string;
  timeZoneId?: string;
  modules?: any[];
  [k: string]: any;
};

export type GrowlinkVerifyResult = {
  ok: boolean;
  expiresIn?: number;
  tokenType?: string;
  [k: string]: any;
};

export type GrowlinkPullResult = {
  sourceId: string;
  pulled: number;
  ingested?: number;
  updated: number;
  skipped?: number;
  startIso?: string;
  endIso?: string;
  lastPointIso?: string;
};
