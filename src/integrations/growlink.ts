export type GrowlinkCredentials = {
  userName: string;
  password: string;
};

export type GrowlinkAuthResponse = {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

export type GrowlinkAuthRequest = {
  userName: string;
  password: string;
};

export type GrowlinkUomOptions = {
  temp?: "celsius" | "fahrenheit";
  tds?: "ppm" | "ec";
  light?:
    | "lux"
    | "ppfd"
    | "ppfd_natural_daylight_6500k"
    | "ppfd_halogen_3000k"
    | "ppfd_high_cri_led_6500k"
    | "ppfd_high_cri_led_4000k"
    | "ppfd_high_cri_led_3000k"
    | "ppfd_low_cri_led_6500k"
    | "ppfd_low_cri_led_3500k"
    | "ppfd_hps_2000k"
    | "ppfd_cmh_3000k";
  vpd?: "kpa" | "millibars";
};

export type GrowlinkSensor = {
  id: string;
  name?: string;
  metricName?: string;
  readingSuffix?: string;
  unitOfMeasure?: number;
  dataPointMetric?: number;
  raw: Record<string, unknown>;
};

export type GrowlinkDevice = {
  id: string;
  name?: string;
  deviceType?: number;
  unitOfMeasure?: number;
  dataPointMetric?: number;
  raw: Record<string, unknown>;
};

export type GrowlinkModule = {
  id: string;
  name?: string;
  controllerId?: string;
  sensors: GrowlinkSensor[];
  devices: GrowlinkDevice[];
  raw: Record<string, unknown>;
};

export type GrowlinkController = {
  id: string;
  name?: string;
  serialNumber?: string;
  firmwareVersion?: number;
  timeZoneId?: string;
  modules: GrowlinkModule[];
  raw: Record<string, unknown>;
};

export type GrowlinkReading = {
  controllerId: string;
  entityId: string;
  entityType: "sensor" | "device" | "unknown";
  name?: string;
  metricName?: string;
  ts?: string;
  value: number | string | boolean | null;
  unit?: string;
  raw: Record<string, unknown>;
};

const DEFAULT_AUTH_BASE_URL = "https://api.developer.growlink.com/V1";
const DEFAULT_HARDWARE_BASE_URL = "https://api.developer.growlink.com/hardware/v1";
const DEFAULT_EQUIPMENT_BASE_URL = "https://api.developer.growlink.com/v1/v1";
const DEFAULT_REPORTING_BASE_URL = "https://api.developer.growlink.com/reporting/v1";

const UOM_TEMP = { celsius: 0, fahrenheit: 1 } as const;
const UOM_TDS = { ppm: 3, ec: 6 } as const;
const UOM_LIGHT = {
  lux: 7,
  ppfd: 16,
  ppfd_natural_daylight_6500k: 20,
  ppfd_halogen_3000k: 21,
  ppfd_high_cri_led_6500k: 22,
  ppfd_high_cri_led_4000k: 23,
  ppfd_high_cri_led_3000k: 24,
  ppfd_low_cri_led_6500k: 25,
  ppfd_low_cri_led_3500k: 26,
  ppfd_hps_2000k: 27,
  ppfd_cmh_3000k: 28
} as const;
const UOM_VPD = { kpa: 8, millibars: 9 } as const;

const UNIT_BY_UOM: Record<number, string> = {
  0: "C",
  1: "F",
  3: "ppm",
  6: "EC",
  7: "lux",
  8: "kPa",
  9: "mbar",
  16: "umol/m2/s",
  20: "umol/m2/s",
  21: "umol/m2/s",
  22: "umol/m2/s",
  23: "umol/m2/s",
  24: "umol/m2/s",
  25: "umol/m2/s",
  26: "umol/m2/s",
  27: "umol/m2/s",
  28: "umol/m2/s"
};

function requireNonEmpty(value: unknown, label: string): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function trimBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function idOf(raw: any): string {
  return String(raw?.id ?? raw?._id ?? raw?.guid ?? raw?.controllerId ?? "").trim();
}

function maybeNumber(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function authHeaderValue(auth: Pick<GrowlinkAuthResponse, "accessToken" | "tokenType">) {
  const token = requireNonEmpty(auth.accessToken, "accessToken");
  const tokenType = String(auth.tokenType || "bearer").trim() || "bearer";
  return `${tokenType} ${token}`;
}

export function buildGrowlinkAuthRequest(
  credentials: GrowlinkCredentials
): GrowlinkAuthRequest {
  return {
    userName: requireNonEmpty(credentials.userName, "userName"),
    password: requireNonEmpty(credentials.password, "password")
  };
}

export function buildGrowlinkAuthUrl(baseUrl = DEFAULT_AUTH_BASE_URL): string {
  return `${trimBaseUrl(baseUrl)}/api/auth/token`;
}

export function buildGrowlinkControllersUrl(
  baseUrl = DEFAULT_HARDWARE_BASE_URL
): string {
  return `${trimBaseUrl(baseUrl)}/api/controllers`;
}

export function buildGrowlinkCurrentReadingsUrl(
  controllerId: string,
  baseUrl = DEFAULT_EQUIPMENT_BASE_URL
): string {
  return `${trimBaseUrl(baseUrl)}/api/equipment/interaction/data/device/${encodeURIComponent(
    requireNonEmpty(controllerId, "controllerId")
  )}`;
}

export function buildGrowlinkEntityTypeUrl(
  baseUrl = DEFAULT_REPORTING_BASE_URL
): string {
  return `${trimBaseUrl(baseUrl)}/api/reporting/enum/EntityType`;
}

export function buildGrowlinkReadOnlyHeaders(
  auth: Pick<GrowlinkAuthResponse, "accessToken" | "tokenType">,
  uom: GrowlinkUomOptions = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: authHeaderValue(auth)
  };
  if (uom.temp) headers["UOM-Temp"] = String(UOM_TEMP[uom.temp]);
  if (uom.tds) headers["UOM-TDS"] = String(UOM_TDS[uom.tds]);
  if (uom.light) headers["UOM-Light"] = String(UOM_LIGHT[uom.light]);
  if (uom.vpd) headers["UOM-VPD"] = String(UOM_VPD[uom.vpd]);
  return headers;
}

export function normalizeGrowlinkControllers(response: unknown): GrowlinkController[] {
  const rows = Array.isArray(response) ? response : [];
  return rows.flatMap((controller: any) => {
    const controllerId = idOf(controller);
    if (!controllerId) return [];

    const modules = Array.isArray(controller?.modules) ? controller.modules : [];
    return [
      {
        id: controllerId,
        name: controller?.name ? String(controller.name) : undefined,
        serialNumber: controller?.serialNumber ? String(controller.serialNumber) : undefined,
        firmwareVersion: maybeNumber(controller?.firmwareVersion),
        timeZoneId: controller?.timeZoneId ? String(controller.timeZoneId) : undefined,
        modules: modules.flatMap((module: any) => {
          const moduleId = idOf(module);
          if (!moduleId) return [];
          const sensors = Array.isArray(module?.sensors) ? module.sensors : [];
          const devices = Array.isArray(module?.devices) ? module.devices : [];
          return [
            {
              id: moduleId,
              name: module?.name ? String(module.name) : undefined,
              controllerId: module?.controllerId ? String(module.controllerId) : controllerId,
              sensors: sensors.flatMap((sensor: any) => {
                const sensorId = idOf(sensor);
                if (!sensorId) return [];
                return [
                  {
                    id: sensorId,
                    name: sensor?.name ? String(sensor.name) : undefined,
                    metricName: sensor?.metricName ? String(sensor.metricName) : undefined,
                    readingSuffix: sensor?.readingSuffix
                      ? String(sensor.readingSuffix)
                      : undefined,
                    unitOfMeasure: maybeNumber(sensor?.unitOfMeasure),
                    dataPointMetric: maybeNumber(sensor?.dataPointMetric),
                    raw: sensor
                  }
                ];
              }),
              devices: devices.flatMap((device: any) => {
                const deviceId = idOf(device);
                if (!deviceId) return [];
                return [
                  {
                    id: deviceId,
                    name: device?.name ? String(device.name) : undefined,
                    deviceType: maybeNumber(device?.deviceType),
                    unitOfMeasure: maybeNumber(device?.unitOfMeasure),
                    dataPointMetric: maybeNumber(device?.dataPointMetric),
                    raw: device
                  }
                ];
              }),
              raw: module
            }
          ];
        }),
        raw: controller
      }
    ];
  });
}

function readingValue(raw: any): number | string | boolean | null {
  const candidates = [
    raw?.value,
    raw?.reading,
    raw?.currentValue,
    raw?.convertedValue,
    raw?.state,
    raw?.isOn
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") continue;
    if (typeof candidate === "boolean") return candidate;
    const numeric = Number(candidate);
    return Number.isFinite(numeric) ? numeric : String(candidate);
  }
  return null;
}

function normalizeReadingRow(
  controllerId: string,
  raw: any,
  fallbackType: GrowlinkReading["entityType"]
): GrowlinkReading | null {
  const entityId = idOf(raw) || String(raw?.sensorId ?? raw?.deviceId ?? "");
  if (!entityId) return null;
  const unitOfMeasure = maybeNumber(raw?.unitOfMeasure ?? raw?.convertedUnitOfMeasure);
  return {
    controllerId,
    entityId,
    entityType: raw?.sensorId || fallbackType === "sensor" ? "sensor" : fallbackType,
    name: raw?.name ? String(raw.name) : undefined,
    metricName: raw?.metricName ? String(raw.metricName) : undefined,
    ts: raw?.timestamp || raw?.updateTimestamp || raw?.lastSeenTimestamp
      ? String(raw.timestamp ?? raw.updateTimestamp ?? raw.lastSeenTimestamp)
      : undefined,
    value: readingValue(raw),
    unit:
      raw?.readingSuffix || raw?.unit
        ? String(raw.readingSuffix ?? raw.unit)
        : unitOfMeasure === undefined
          ? undefined
          : UNIT_BY_UOM[unitOfMeasure],
    raw
  };
}

export function normalizeGrowlinkCurrentReadings(
  controllerId: string,
  response: unknown
): GrowlinkReading[] {
  const id = requireNonEmpty(controllerId, "controllerId");
  const body: any = response;
  const readings: GrowlinkReading[] = [];

  const directRows = Array.isArray(body)
    ? body.map((row) => ({ row, type: "unknown" as const }))
    : [
        ...(Array.isArray(body?.sensors)
          ? body.sensors.map((row: any) => ({ row, type: "sensor" as const }))
          : []),
        ...(Array.isArray(body?.devices)
          ? body.devices.map((row: any) => ({ row, type: "device" as const }))
          : []),
        ...(Array.isArray(body?.data)
          ? body.data.map((row: any) => ({ row, type: "unknown" as const }))
          : []),
        ...(Array.isArray(body?.readings)
          ? body.readings.map((row: any) => ({ row, type: "unknown" as const }))
          : [])
      ];

  for (const { row, type } of directRows) {
    const normalized = normalizeReadingRow(id, row, type);
    if (normalized) readings.push(normalized);
  }

  const modules = Array.isArray(body?.modules) ? body.modules : [];
  for (const module of modules) {
    for (const sensor of Array.isArray(module?.sensors) ? module.sensors : []) {
      const normalized = normalizeReadingRow(id, sensor, "sensor");
      if (normalized) readings.push(normalized);
    }
    for (const device of Array.isArray(module?.devices) ? module.devices : []) {
      const normalized = normalizeReadingRow(id, device, "device");
      if (normalized) readings.push(normalized);
    }
  }

  return readings;
}

export const GROWLINK_PROVIDER_CONTRACT = Object.freeze({
  id: "growlink",
  documentationUrl: "https://developer.growlink.com/apis",
  authUrl: buildGrowlinkAuthUrl(),
  controllersUrl: buildGrowlinkControllersUrl(),
  capabilities: [
    "auth_token",
    "controller_discovery",
    "current_device_readings",
    "historical_reporting"
  ],
  readOnly: true,
  excludedControlSurfaces: ["rules", "setpoints", "device_control"],
  implemented: false
});
