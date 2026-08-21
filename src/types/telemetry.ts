export type TelemetrySourceType = "pulse" | "ubibot" | "growlink" | "upload" | "manual";

export type TelemetryWorkspaceType = "personal" | "commercial" | "facility";

export type TelemetryWorkspaceScope = {
  workspaceType?: TelemetryWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
  targetType?: "grow" | "productTrial";
  targetRef?: string;
};

export type TelemetryCredentialWorkspaceScope =
  | {
      workspaceType: "personal" | "commercial";
      facilityId?: never;
    }
  | {
      workspaceType: "facility";
      facilityId: string;
    };

export type TelemetrySource = {
  id: string;
  growId: string;
  type: TelemetrySourceType;
  name: string;
  timezone: string;
  isActive: boolean;
  workspaceType?: TelemetryWorkspaceType;
  workspaceId?: string | null;
  facilityId?: string | null;
  roomId?: string | null;
  targetType?: "grow" | "productTrial";
  targetRef?: string | null;
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
  lightValue?: number | null;
  lightUnit?: string | null;
  ppfd?: number | null;
  airPressureHpa?: number | null;
  voc?: number | null;
  substrateMoisturePct?: number | null;
  substrateEcMsCm?: number | null;
  substratePh?: number | null;
  dliMolM2Day?: number | null;
  observations?: TelemetryObservation[];
};

export type TelemetryObservation = {
  providerMetricKey: string;
  canonicalMetric: string | null;
  value: unknown;
  normalizedUnit: string | null;
  rawValue: unknown;
  rawUnit: string | null;
  status: "normalized" | "unmapped";
};

export type CreateTelemetrySourceInput = {
  growId: string;
  type: TelemetrySourceType;
  name: string;
  timezone: string;
  config?: Record<string, any>;
  isActive?: boolean;
  roomId?: string;
} & TelemetryWorkspaceScope;

export type BulkIngestMode = "insert" | "upsert";

export type BulkIngestTelemetryPointsInput = {
  sourceId: string;
  mode?: BulkIngestMode;
  points: Array<{
    ts: string;
    airTempC?: number | null;
    rh?: number | null;
    leafTempC?: number | null;
    canopyTempC?: number | null;
    canopyRh?: number | null;
    vpdKpa?: number | null;
    co2Ppm?: number | null;
    lightLux?: number | null;
    lightValue?: number | null;
    lightUnit?: string | null;
    ppfd?: number | null;
    airPressureHpa?: number | null;
    voc?: number | null;
    observations?: Array<{
      providerMetricKey?: string;
      metric?: string;
      metricName?: string;
      name?: string;
      value: unknown;
      unit?: string | null;
    }>;
  }>;
} & TelemetryWorkspaceScope;

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
} & TelemetryWorkspaceScope;

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
