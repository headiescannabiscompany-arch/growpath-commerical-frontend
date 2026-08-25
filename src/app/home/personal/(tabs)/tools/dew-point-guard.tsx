import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  type TextProps
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateTask,
  saveToolRunAndOpenJournal
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import {
  bulkIngestTelemetryPoints,
  createTelemetrySource,
  getTelemetryPoints,
  listTelemetrySources,
  listPulseDevices,
  pullPulseWindow,
  verifyPulseApiKey
} from "@/api/telemetry";
import type {
  PulseDevice,
  TelemetryCredentialWorkspaceScope,
  TelemetryPoint,
  TelemetrySource
} from "@/types/telemetry";
import CalendarDateField from "@/components/forms/CalendarDateField";
import {
  cToF,
  computeTelemetryRisk,
  CsvMapping,
  deltaCToF,
  deltaFToC,
  dewPointC,
  fToC,
  mapCsvToPoints,
  normalizeTelemetryTimestamp,
  parseCsvText,
  suggestedTelemetryMapping
} from "@/features/personal/tools/dewPointGuard/engine";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

function Text({ style, ...props }: TextProps) {
  const { palette } = useAppTheme();
  return <NativeText {...props} style={[{ color: palette.text }, style]} />;
}

function asString(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function toNum(v: string) {
  const n = Number(String(v || "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function formatApiError(err: any): string {
  const code = String(err?.code || "").trim();
  const msg = String(err?.message || "Request failed").trim();
  return code ? `${code}: ${msg}` : msg;
}

function telemetryAuthMessage(err: any): string | null {
  const status =
    err?.status ?? err?.response?.status ?? err?.details?.status ?? err?.cause?.status;
  if (status === 401) return "You are not signed in. Please log in again.";
  if (status === 403) return "You do not have access to this grow's telemetry.";
  return null;
}

function defaultWindow(mode: "lastNight" | "last24h") {
  const now = new Date();
  if (mode === "last24h") {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { startIso: start.toISOString(), endIso: now.toISOString() };
  }

  const start = new Date(now);
  start.setHours(20, 0, 0, 0);
  start.setDate(start.getDate() - 1);

  const today8 = new Date(now);
  today8.setHours(8, 0, 0, 0);
  if (now.getTime() < today8.getTime()) {
    return { startIso: start.toISOString(), endIso: now.toISOString() };
  }

  const end = new Date(now);
  end.setHours(8, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  secureTextEntry?: boolean;
  testID?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createDewPointGuardStyles(palette), [palette]);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        accessibilityLabel={props.label}
        autoCapitalize={props.secureTextEntry ? "none" : undefined}
        autoComplete={props.secureTextEntry ? "off" : undefined}
        autoCorrect={props.secureTextEntry ? false : undefined}
        importantForAutofill={props.secureTextEntry ? "noExcludeDescendants" : undefined}
        secureTextEntry={props.secureTextEntry}
        testID={props.testID}
        textContentType={props.secureTextEntry ? "none" : undefined}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={palette.textMuted}
        selectionColor={palette.accent}
        keyboardType={props.keyboardType ?? "numeric"}
        style={styles.input}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  testID
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createDewPointGuardStyles(palette), [palette]);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function bestHeader(headers: string[], candidates: string[]): string {
  const norm = headers.map((h) => ({ raw: h, n: h.toLowerCase() }));
  for (const c of candidates) {
    const hit = norm.find((h) => h.n === c || h.n.includes(c));
    if (hit) return hit.raw;
  }
  return headers[0] ?? "";
}

function headerIndex(headers: string[], key: string): number {
  return headers.findIndex((h) => h === key);
}

type PendingReading = { ts: string; tempF: number; rh: number };
type HistoryWorkspace = "personal" | "commercial" | "facility";
type CsvFileIdentity = {
  source: "document_picker" | "pasted";
  name: string;
  size: number;
  mimeType: string;
  lastModified: number | null;
  uriScheme: string | null;
};
const CSV_MAX_ROWS = 5000;
const CSV_MAX_FILE_BYTES = 25 * 1024 * 1024;
const PULSE_IMPORTED_METRICS = [
  "air_temperature",
  "relative_humidity",
  "dew_point",
  "vpd"
];

function normalizeCsvTimestampToIso(
  tsRaw: string,
  sourceTimezone: string
): string | null {
  return normalizeTelemetryTimestamp(tsRaw, sourceTimezone);
}

export function isValidTelemetryTimezone(value: string) {
  const timezone = String(value || "").trim();
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function normalizedProvider(value: unknown) {
  return String(value || "generic")
    .trim()
    .toLowerCase();
}

export function telemetrySourceMatchesImportReview(
  source: TelemetrySource | undefined,
  review: {
    provider: string;
    growId: string;
    workspaceType: HistoryWorkspace;
    facilityId?: string;
    roomId?: string;
    roomName: string;
    timezone: string;
  }
) {
  if (!source || source.type !== "upload") return false;
  if (String(source.growId || "") !== review.growId) return false;
  if (
    normalizedProvider(source.config?.provider) !== normalizedProvider(review.provider)
  ) {
    return false;
  }
  if (String(source.timezone || "") !== review.timezone) return false;
  const sourceReview = source.config?.importReview || source.config?.roomMapping || {};
  if (String(sourceReview.roomId || "") !== String(review.roomId || "")) return false;
  if (String(sourceReview.roomName || "").trim() !== review.roomName.trim()) return false;
  const sourceWorkspace = String(
    source.workspaceType || source.config?.workspaceType || "personal"
  );
  if (sourceWorkspace !== review.workspaceType) return false;
  if (
    review.workspaceType === "facility" &&
    String(source.facilityId || source.config?.facilityId || "") !==
      String(review.facilityId || "")
  ) {
    return false;
  }
  return true;
}

function dewPointInspectionTaskMetadata(riskBand: string) {
  const highRisk = riskBand === "high";
  return {
    allDay: !highRisk,
    calendarType: "dew_point_guard_followup",
    sourceStage: highRisk
      ? "dew_point_condensation_inspection"
      : "dew_point_window_review",
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: highRisk ? -60 : -12 * 60 }]
    }
  };
}

export default function DewPointGuardTool({
  historyImportMode = false,
  workspaceType = "personal",
  facilityId = "",
  growLabel = "Selected grow",
  initialRoomId = "",
  initialRoomName = ""
}: {
  historyImportMode?: boolean;
  workspaceType?: HistoryWorkspace;
  facilityId?: string;
  growLabel?: string;
  initialRoomId?: string;
  initialRoomName?: string;
} = {}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createDewPointGuardStyles(palette), [palette]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const growId = asString(params.growId);
  const plantContext = useToolPlantContext(
    growId,
    asString(params.plantId) || "",
    !historyImportMode,
    workspaceType === "commercial" ? "commercial" : "personal"
  );

  const [mode, setMode] = useState<"manual" | "source">(
    historyImportMode ? "source" : "manual"
  );
  const [savingAndOpening, setSavingAndOpening] = useState(false);
  const [creatingInspectionTask, setCreatingInspectionTask] = useState(false);
  const [resultFeedback, setResultFeedback] = useState("");

  const [lightsOffTempF, setLightsOffTempF] = useState("75");
  const [lightsOffRh, setLightsOffRh] = useState("55");
  const [nightMinTempF, setNightMinTempF] = useState("68");
  const [nightMaxRh, setNightMaxRh] = useState("62");
  const [assumedLeafAirDeltaF, setAssumedLeafAirDeltaF] = useState("1.0");

  const [lateIrrigation, setLateIrrigation] = useState("0");
  const [fanOffIncident, setFanOffIncident] = useState("0");
  const [dehuStruggling, setDehuStruggling] = useState("0");

  const [sources, setSources] = useState<TelemetrySource[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [pulseApiKey, setPulseApiKey] = useState("");
  const [verifyingPulse, setVerifyingPulse] = useState(false);
  const [loadingPulseDevices, setLoadingPulseDevices] = useState(false);
  const [pulseDevices, setPulseDevices] = useState<PulseDevice[]>([]);
  const [selectedPulseDeviceId, setSelectedPulseDeviceId] = useState("");
  const pulseCredentialScope = useMemo<TelemetryCredentialWorkspaceScope>(
    () =>
      workspaceType === "facility"
        ? { workspaceType, facilityId: facilityId.trim() }
        : { workspaceType },
    [facilityId, workspaceType]
  );

  const [windowMode, setWindowMode] = useState<"lastNight" | "last24h" | "custom">(
    "lastNight"
  );
  const defaults = useMemo(
    () => defaultWindow(windowMode === "custom" ? "last24h" : windowMode),
    [windowMode]
  );
  const [startIsoText, setStartIsoText] = useState(defaults.startIso);
  const [endIsoText, setEndIsoText] = useState(defaults.endIso);
  const [fetchingPoints, setFetchingPoints] = useState(false);
  const [telemetryPoints, setTelemetryPoints] = useState<TelemetryPoint[]>([]);

  const [readingTs, setReadingTs] = useState(new Date().toISOString());
  const [readingTempF, setReadingTempF] = useState("");
  const [readingRh, setReadingRh] = useState("");
  const [pendingReadings, setPendingReadings] = useState<PendingReading[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvTsHeader, setCsvTsHeader] = useState("");
  const [csvTempHeader, setCsvTempHeader] = useState("");
  const [csvRhHeader, setCsvRhHeader] = useState("");
  const [csvTempUnit, setCsvTempUnit] = useState<"F" | "C">("F");
  const [parsingCsv, setParsingCsv] = useState(false);
  const [csvLimitNotice, setCsvLimitNotice] = useState("");
  const [csvImportSummary, setCsvImportSummary] = useState("");
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [csvDetectedExtras, setCsvDetectedExtras] = useState<
    Pick<CsvMapping, "vpdCol" | "co2Col" | "lightCol" | "lightKind">
  >({});
  const [csvSourceConfig, setCsvSourceConfig] = useState<Record<string, any>>({});
  const [csvFileIdentity, setCsvFileIdentity] = useState<CsvFileIdentity | null>(null);
  const [csvRoomId] = useState(initialRoomId);
  const [csvRoomName, setCsvRoomName] = useState(initialRoomName);
  const [confirmedCsvReviewSignature, setConfirmedCsvReviewSignature] = useState("");
  const [sourceTimezone, setSourceTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"
  );
  const [activeCsvMapTarget, setActiveCsvMapTarget] = useState<"ts" | "temp" | "rh">(
    "ts"
  );

  const selectedSource = useMemo(
    () => sources.find((s) => s.id === selectedSourceId),
    [sources, selectedSourceId]
  );
  const workspaceScope = useMemo(
    () => ({
      workspaceType,
      ...(workspaceType === "facility" && facilityId ? { facilityId } : {}),
      targetType: "grow" as const
    }),
    [facilityId, workspaceType]
  );
  const csvProvider = normalizedProvider(csvSourceConfig.provider);
  const csvReview = useMemo(
    () => ({
      provider: csvProvider,
      growId: String(growId || ""),
      workspaceType,
      facilityId: workspaceType === "facility" ? facilityId : undefined,
      roomId: csvRoomId || undefined,
      roomName: csvRoomName.trim(),
      timezone: sourceTimezone.trim()
    }),
    [
      csvProvider,
      csvRoomId,
      csvRoomName,
      facilityId,
      growId,
      sourceTimezone,
      workspaceType
    ]
  );
  const csvReviewSignature = useMemo(
    () =>
      JSON.stringify({
        ...csvReview,
        file: csvFileIdentity,
        columns: csvHeaders,
        timestampColumn: csvTsHeader,
        temperatureColumn: csvTempHeader,
        humidityColumn: csvRhHeader,
        temperatureUnit: csvTempUnit
      }),
    [
      csvFileIdentity,
      csvHeaders,
      csvRhHeader,
      csvReview,
      csvTempHeader,
      csvTempUnit,
      csvTsHeader
    ]
  );
  const csvReviewComplete =
    Boolean(
      growId &&
      csvRows.length &&
      csvFileIdentity &&
      csvRoomName.trim() &&
      isValidTelemetryTimezone(sourceTimezone)
    ) && confirmedCsvReviewSignature === csvReviewSignature;
  const selectedSourceMatchesCsv = telemetrySourceMatchesImportReview(
    selectedSource,
    csvReview
  );
  const csvMappingStorageKey = selectedSourceId
    ? `dew_point_guard_csv_mapping:${selectedSourceId}`
    : "";

  function applyCsvColumnByIndex(idx: number) {
    const h = csvHeaders[idx];
    if (h == null) return;
    if (activeCsvMapTarget === "ts") setCsvTsHeader(h);
    if (activeCsvMapTarget === "temp") setCsvTempHeader(h);
    if (activeCsvMapTarget === "rh") setCsvRhHeader(h);
  }

  useEffect(() => {
    let alive = true;
    async function loadSavedMapping() {
      if (!csvMappingStorageKey) return;
      try {
        const raw = await AsyncStorage.getItem(csvMappingStorageKey);
        if (!alive || !raw) return;
        const saved = JSON.parse(raw);
        if (saved?.tsCol != null) setCsvTsHeader(String(saved.tsCol));
        if (saved?.tempCol != null) setCsvTempHeader(String(saved.tempCol));
        if (saved?.rhCol != null) setCsvRhHeader(String(saved.rhCol));
        if (saved?.unit === "F" || saved?.unit === "C") setCsvTempUnit(saved.unit);
      } catch {
        // ignore mapping cache failures
      }
    }
    loadSavedMapping();
    return () => {
      alive = false;
    };
  }, [csvMappingStorageKey]);

  const computedManual = useMemo(() => {
    const tOffF = toNum(lightsOffTempF);
    const rhOff = toNum(lightsOffRh);
    const tMinF = toNum(nightMinTempF);
    const rhMax = toNum(nightMaxRh);
    const deltaF = toNum(assumedLeafAirDeltaF);
    if ([tOffF, rhOff, tMinF, rhMax, deltaF].some((n) => !Number.isFinite(n)))
      return null;

    const dpOffC = dewPointC(fToC(tOffF), rhOff);
    const dpWorstC = dewPointC(fToC(tMinF), rhMax);
    const leafWorstC = fToC(tMinF - deltaF);
    const marginWorstC = leafWorstC - dpWorstC;
    const riskBand: "low" | "medium" | "high" =
      marginWorstC <= 0 ? "high" : marginWorstC <= 0.5 ? "medium" : "low";

    const recs =
      riskBand === "low"
        ? [
            {
              code: "MAINTAIN",
              message:
                "Current night conditions look safe. Keep monitoring lights-off transitions."
            }
          ]
        : [
            {
              code: "LOWER_NIGHT_RH",
              message:
                "Lower night RH or increase dehumidification capacity at lights-off."
            },
            {
              code: "INCREASE_AIR_MOVEMENT",
              message:
                "Increase canopy air movement during lights-off to prevent microclimate saturation."
            },
            {
              code: "RAMP_LIGHTS_OFF",
              message:
                "Reduce the temperature drop rate at lights-off (stagger HVAC, add gentle heat, or adjust setpoints)."
            }
          ];

    if (toNum(lateIrrigation) === 1)
      recs.push({
        code: "SHIFT_IRRIGATION_TIMING",
        message:
          "Avoid late irrigation near lights-off; it can drive overnight RH spikes."
      });
    if (toNum(fanOffIncident) === 1)
      recs.push({
        code: "FAN_CONTINUITY",
        message:
          "Ensure critical circulation/exhaust stays on during lights-off to prevent spikes."
      });
    if (toNum(dehuStruggling) === 1)
      recs.push({
        code: "DEHU_CAPACITY",
        message:
          "If the dehu runs constantly, you may need more capacity or better placement."
      });

    return {
      riskBand,
      lightsOffDewPointF: cToF(dpOffC),
      worstCaseDewPointF: cToF(dpWorstC),
      assumedLeafTempF: tMinF - deltaF,
      condensationMarginF: deltaCToF(marginWorstC),
      recommendations: recs
    };
  }, [
    lightsOffTempF,
    lightsOffRh,
    nightMinTempF,
    nightMaxRh,
    assumedLeafAirDeltaF,
    lateIrrigation,
    fanOffIncident,
    dehuStruggling
  ]);

  const computedSource = useMemo(() => {
    const deltaF = toNum(assumedLeafAirDeltaF);
    const summary = computeTelemetryRisk(
      telemetryPoints,
      Number.isFinite(deltaF) ? deltaFToC(deltaF) : 0.5,
      0.5
    );
    if (!summary) return null;
    const recommendations =
      summary.riskBand === "low"
        ? [
            {
              code: "MAINTAIN",
              message:
                "Telemetry window looks safe. Keep monitoring lights-off transitions."
            }
          ]
        : [
            {
              code: "LOWER_NIGHT_RH",
              message:
                "Lower night RH (or add dehumidification capacity) to increase dew point margin."
            },
            {
              code: "INCREASE_AIR_MOVEMENT",
              message:
                "Increase canopy air movement during lights-off to reduce microclimate saturation."
            },
            {
              code: "RAMP_LIGHTS_OFF",
              message:
                "Reduce the temperature drop rate at lights-off (gentle ramp, HVAC staging, or heat support)."
            }
          ];
    return { ...summary, recommendations };
  }, [telemetryPoints, assumedLeafAirDeltaF]);

  async function loadSources() {
    if (!growId)
      return Alert.alert(
        "Missing growId",
        "A growId is required to load telemetry sources."
      );
    setLoadingSources(true);
    try {
      const list = await listTelemetrySources(growId, workspaceScope);
      setSources(list);
      if (!selectedSourceId && list.length) setSelectedSourceId(list[0].id);
    } catch (e: any) {
      const auth = telemetryAuthMessage(e);
      Alert.alert("Failed to load sources", auth || formatApiError(e));
    } finally {
      setLoadingSources(false);
    }
  }

  async function createSourceInline(type: "manual" | "upload") {
    if (!growId)
      return Alert.alert(
        "Missing growId",
        "A growId is required to create a telemetry source."
      );
    if (type === "upload" && !csvRows.length) {
      return Alert.alert(
        "Choose the history file first",
        "Pick or paste a controller CSV before creating its reviewed source."
      );
    }
    if (type === "upload" && !csvReviewComplete) {
      return Alert.alert(
        "Review required",
        "Confirm the provider, grow, room, timezone, and file before creating this history source."
      );
    }
    setCreatingSource(true);
    setIngestStatus("");
    try {
      const created = await createTelemetrySource({
        growId,
        type,
        name:
          type === "manual"
            ? "Manual Telemetry"
            : csvSourceConfig.provider === "ac_infinity"
              ? "AC Infinity CSV History"
              : "Upload Telemetry",
        timezone: sourceTimezone,
        workspaceType,
        ...(workspaceType === "facility" && facilityId ? { facilityId } : {}),
        targetType: "grow",
        roomId: type === "upload" ? csvRoomId || undefined : undefined,
        config:
          type === "upload"
            ? {
                ...csvSourceConfig,
                workspaceType,
                ...(workspaceType === "facility" && facilityId ? { facilityId } : {}),
                sourceFileIdentity: csvFileIdentity,
                roomMapping: {
                  roomId: csvRoomId || null,
                  roomName: csvRoomName.trim()
                },
                importReview: {
                  provider: csvProvider,
                  growId,
                  growLabel,
                  workspaceType,
                  facilityId: workspaceType === "facility" ? facilityId || null : null,
                  roomId: csvRoomId || null,
                  roomName: csvRoomName.trim(),
                  timezone: sourceTimezone.trim(),
                  sourceFileIdentity: csvFileIdentity,
                  reviewedAt: new Date().toISOString()
                }
              }
            : {}
      });
      setSources((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setSelectedSourceId(created.id);
      Alert.alert("Source created", `${created.name} (${created.type})`);
    } catch (e: any) {
      const auth = telemetryAuthMessage(e);
      Alert.alert("Failed to create source", auth || formatApiError(e));
    } finally {
      setCreatingSource(false);
    }
  }

  async function verifyPulseAndLoadDevices() {
    const apiKey = String(pulseApiKey || "").trim();
    if (!apiKey) return Alert.alert("Missing API key", "Enter your Pulse API key.");
    if (workspaceType === "facility" && !facilityId.trim()) {
      return Alert.alert(
        "Facility required",
        "Select the Facility that owns this Pulse connection."
      );
    }

    setVerifyingPulse(true);
    try {
      await verifyPulseApiKey({ ...pulseCredentialScope, apiKey });
      Alert.alert("Pulse verified", "API key verified successfully.");
    } catch (e: any) {
      const auth = telemetryAuthMessage(e);
      Alert.alert("Pulse verify failed", auth || formatApiError(e));
      return;
    } finally {
      setVerifyingPulse(false);
    }

    setLoadingPulseDevices(true);
    try {
      const devices = await listPulseDevices({ ...pulseCredentialScope, apiKey });
      setPulseDevices(devices);
      if (!selectedPulseDeviceId && devices.length) {
        setSelectedPulseDeviceId(String(devices[0].id || ""));
      }
      if (!devices.length) {
        Alert.alert("No devices", "No Pulse devices returned for this API key.");
      }
    } catch (e: any) {
      const auth = telemetryAuthMessage(e);
      Alert.alert("Load devices failed", auth || formatApiError(e));
    } finally {
      setLoadingPulseDevices(false);
    }
  }

  async function createPulseSourceInline() {
    if (!growId)
      return Alert.alert(
        "Missing growId",
        "A growId is required to create a telemetry source."
      );
    const apiKey = String(pulseApiKey || "").trim();
    if (!apiKey) return Alert.alert("Missing API key", "Enter your Pulse API key.");
    if (!selectedPulseDeviceId)
      return Alert.alert("Missing device", "Select a Pulse device first.");

    setCreatingSource(true);
    try {
      const selected = pulseDevices.find((d) => String(d.id) === selectedPulseDeviceId);
      const selectedName = selected?.name || "Pulse device";
      const created = await createTelemetrySource({
        growId,
        type: "pulse",
        name: selected?.name ? `Pulse ${selected.name}` : "Pulse Telemetry",
        timezone: "America/New_York",
        workspaceType,
        ...(workspaceType === "facility" && facilityId ? { facilityId } : {}),
        targetType: "grow",
        config: {
          pulse: {
            apiKey,
            deviceId: selectedPulseDeviceId,
            accountStructure: {
              provider: "pulse",
              permissionLevel: "read-only",
              detectedRooms: 1,
              detectedDevices: 1,
              detectedStreams: PULSE_IMPORTED_METRICS.length,
              rooms: [
                {
                  name: selectedName,
                  type: "environment",
                  devices: [selectedName],
                  metrics: PULSE_IMPORTED_METRICS,
                  permissionLevel: "read-only",
                  provider: "pulse"
                }
              ]
            }
          }
        }
      });
      setSources((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setSelectedSourceId(created.id);
      setPulseApiKey("");
      Alert.alert("Pulse source created", `${created.name} (${created.type})`);
    } catch (e: any) {
      const auth = telemetryAuthMessage(e);
      Alert.alert("Failed to create pulse source", auth || formatApiError(e));
    } finally {
      setCreatingSource(false);
    }
  }

  function applyParsedCsv(text: string, fileIdentity: CsvFileIdentity) {
    const parsed = parseCsvText(text);
    if (!parsed.headers.length || !parsed.rows.length) {
      Alert.alert("CSV parse failed", "Need a header row and at least one data row.");
      return;
    }
    setConfirmedCsvReviewSignature("");
    setCsvFileIdentity(fileIdentity);
    setCsvText(text);
    setCsvHeaders(parsed.headers);
    setCsvRows(parsed.rows);
    const suggested = suggestedTelemetryMapping(parsed);
    setCsvTsHeader(
      suggested
        ? parsed.headers[suggested.tsCol]
        : bestHeader(parsed.headers, ["timestamp", "time", "ts", "date"])
    );
    setCsvTempHeader(
      suggested
        ? parsed.headers[suggested.tempCol]
        : bestHeader(parsed.headers, ["tempf", "tempc", "temperature", "temp", "airtemp"])
    );
    setCsvRhHeader(
      suggested
        ? parsed.headers[suggested.rhCol]
        : bestHeader(parsed.headers, ["rh", "humidity", "relative humidity"])
    );
    if (suggested) setCsvTempUnit(suggested.tempUnit);
    setCsvDetectedExtras(
      suggested
        ? {
            vpdCol: suggested.vpdCol,
            co2Col: suggested.co2Col,
            lightCol: suggested.lightCol,
            lightKind: suggested.lightKind
          }
        : {}
    );
    setCsvImportSummary(
      parsed.provider === "ac_infinity"
        ? `AC Infinity export detected · ${parsed.rows.length} nonblank data rows · ${parsed.metadata?.["Start Time"] || "unknown start"} to ${parsed.metadata?.["End Time"] || "unknown end"}`
        : `Generic telemetry CSV · ${parsed.rows.length} nonblank data rows`
    );
    setCsvWarnings(parsed.warnings || []);
    setCsvSourceConfig({
      provider: parsed.provider || "generic",
      importMode: "csv",
      sourceFormat: parsed.provider === "ac_infinity" ? "controller_csv" : "generic_csv",
      headerRowIndex: parsed.headerRowIndex || 0,
      columns: parsed.headers,
      historyWindow: {
        start: parsed.metadata?.["Start Time"] || null,
        end: parsed.metadata?.["End Time"] || null,
        sampleFrequency: parsed.metadata?.["Sample Frequency"] || null
      },
      temperatureUnit: parsed.metadata?.["Temperature Units"] || null
    });
    setCsvLimitNotice("");
  }

  async function pickCsvFile() {
    setParsingCsv(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/comma-separated-values",
          "application/vnd.ms-excel",
          "*/*"
        ],
        multiple: false,
        copyToCacheDirectory: true
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      const pickedSize = Number(asset.size || 0);
      if (Number.isFinite(pickedSize) && pickedSize > CSV_MAX_FILE_BYTES) {
        Alert.alert(
          "History file is too large",
          "Choose a CSV no larger than 25 MB. Export a shorter date range if needed."
        );
        return;
      }

      const uri = String(asset.uri || "");
      const identity: CsvFileIdentity = {
        source: "document_picker",
        name: String(asset.name || "Controller history.csv").slice(0, 200),
        size: Number.isFinite(Number(asset.size)) ? Number(asset.size) : 0,
        mimeType: String(asset.mimeType || "text/csv").slice(0, 120),
        lastModified: Number.isFinite(Number((asset as any).lastModified))
          ? Number((asset as any).lastModified)
          : null,
        uriScheme: uri.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase() || null
      };

      const maybeFile = (asset as any).file;
      if (maybeFile && typeof maybeFile.text === "function") {
        const text = await maybeFile.text();
        applyParsedCsv(text, {
          ...identity,
          size: identity.size || String(text).length
        });
        return;
      }

      if (uri) {
        const text = await FileSystem.readAsStringAsync(uri);
        applyParsedCsv(text, {
          ...identity,
          size: identity.size || String(text).length
        });
        return;
      }

      Alert.alert(
        "Cannot read file directly",
        "This runtime cannot read picked file text. Paste CSV below and use Parse Pasted CSV."
      );
    } catch (e: any) {
      Alert.alert("CSV pick failed", formatApiError(e));
    } finally {
      setParsingCsv(false);
    }
  }

  function parsePastedCsv() {
    if (csvText.length > CSV_MAX_FILE_BYTES) {
      Alert.alert(
        "Pasted history is too large",
        "Paste no more than 25 MB of CSV text, or choose a shorter export."
      );
      return;
    }
    applyParsedCsv(csvText, {
      source: "pasted",
      name: "Pasted controller history.csv",
      size: csvText.length,
      mimeType: "text/csv",
      lastModified: null,
      uriScheme: null
    });
  }

  function confirmCsvImportReview() {
    if (!growId) {
      Alert.alert(
        "Grow required",
        "Choose the destination grow before importing history."
      );
      return;
    }
    if (!csvRows.length || !csvFileIdentity) {
      Alert.alert("History file required", "Pick or paste and parse a CSV first.");
      return;
    }
    if (!csvRoomName.trim()) {
      Alert.alert(
        "Room or space required",
        "Name the room, tent, greenhouse, bed, or outdoor area represented by this file."
      );
      return;
    }
    if (!isValidTelemetryTimezone(sourceTimezone)) {
      Alert.alert(
        "Timezone not recognized",
        "Enter an IANA timezone such as America/New_York before importing."
      );
      return;
    }
    if (!csvTsHeader || !csvTempHeader || !csvRhHeader) {
      Alert.alert(
        "Column mapping incomplete",
        "Review the timestamp, temperature, and humidity columns first."
      );
      return;
    }
    setConfirmedCsvReviewSignature(csvReviewSignature);
  }

  function addReadingToQueue() {
    const ts = String(readingTs || "").trim();
    const tempF = toNum(readingTempF);
    const rh = toNum(readingRh);
    if (!ts || !Number.isFinite(Date.parse(ts)))
      return Alert.alert("Invalid timestamp", "Use ISO timestamp.");
    if (!Number.isFinite(tempF))
      return Alert.alert("Invalid temperature", "Enter numeric temperature.");
    if (!Number.isFinite(rh) || rh < 0 || rh > 100)
      return Alert.alert("Invalid RH", "Enter RH between 0 and 100.");
    setPendingReadings((prev) =>
      [...prev, { ts, tempF, rh }].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
    );
    setReadingTempF("");
    setReadingRh("");
  }

  async function fetchWindowPoints() {
    if (!selectedSourceId)
      return Alert.alert("Select a source", "Choose a telemetry source to fetch points.");
    const window =
      windowMode === "custom"
        ? {
            startIso: String(startIsoText || "").trim(),
            endIso: String(endIsoText || "").trim()
          }
        : defaultWindow(windowMode);
    setStartIsoText(window.startIso);
    setEndIsoText(window.endIso);
    setFetchingPoints(true);
    try {
      const res = await getTelemetryPoints({
        sourceId: selectedSourceId,
        startIso: window.startIso,
        endIso: window.endIso,
        limit: 5000,
        ...workspaceScope
      });
      setTelemetryPoints(res.points || []);
      if (!(res.points || []).length) {
        Alert.alert(
          "No telemetry points found",
          "Try a larger window or ingest/pull data first."
        );
      }
    } catch (e: any) {
      const auth = telemetryAuthMessage(e);
      Alert.alert("Failed to fetch points", auth || formatApiError(e));
    } finally {
      setFetchingPoints(false);
    }
  }

  async function pullAndFetchWindowPoints() {
    if (!selectedSourceId)
      return Alert.alert("Select a source", "Choose a telemetry source first.");
    if (selectedSource?.type !== "pulse") {
      return Alert.alert("Source type", "Pull is only available for Pulse sources.");
    }
    const window =
      windowMode === "custom"
        ? {
            startIso: String(startIsoText || "").trim(),
            endIso: String(endIsoText || "").trim()
          }
        : defaultWindow(windowMode);

    setFetchingPoints(true);
    try {
      await pullPulseWindow(selectedSourceId, window.startIso, window.endIso);
    } catch (e: any) {
      if (String(e?.code || "") === "SOURCE_NOT_PULSE") {
        Alert.alert("Pull blocked", "Selected source is not a pulse source.");
      } else {
        const auth = telemetryAuthMessage(e);
        Alert.alert("Pulse pull failed", auth || formatApiError(e));
      }
      setFetchingPoints(false);
      return;
    }
    setFetchingPoints(false);
    await fetchWindowPoints();
  }

  async function ingestQueuedReadings() {
    if (!selectedSource)
      return Alert.alert("Select a source", "Choose or create a telemetry source first.");
    if (selectedSource.type === "pulse")
      return Alert.alert("Pulse source", "Manual ingest is disabled for Pulse sources.");
    if (!pendingReadings.length)
      return Alert.alert("No readings queued", "Add one or more readings first.");
    setIngesting(true);
    setIngestStatus("");
    try {
      const res = await bulkIngestTelemetryPoints({
        sourceId: selectedSource.id,
        mode: "upsert",
        ...workspaceScope,
        points: pendingReadings.map((r) => ({
          ts: r.ts,
          airTempC: fToC(r.tempF),
          rh: r.rh
        }))
      });
      setPendingReadings([]);
      setIngestStatus(
        `Ingested=${res.ingested} Updated=${res.updated} Skipped=${res.skipped}`
      );
      await fetchWindowPoints();
    } catch (e: any) {
      if (String(e?.code || "") === "SOURCE_NOT_INGESTABLE") {
        Alert.alert(
          "Ingest blocked",
          "This source type cannot accept manual ingest. Use pull for pulse sources."
        );
      } else {
        const auth = telemetryAuthMessage(e);
        Alert.alert("Ingest failed", auth || formatApiError(e));
      }
    } finally {
      setIngesting(false);
    }
  }

  async function ingestCsvRows() {
    if (!selectedSource)
      return Alert.alert("Select a source", "Choose or create a telemetry source first.");
    if (selectedSource.type === "pulse") {
      return Alert.alert(
        "Ingest blocked",
        "CSV/manual ingest is disabled for Pulse sources."
      );
    }
    if (!csvRows.length) return Alert.alert("No CSV rows", "Upload or paste CSV first.");
    if (!csvReviewComplete) {
      return Alert.alert(
        "Review required",
        "Confirm the provider, grow, room, timezone, file, and column mapping before importing."
      );
    }
    if (!selectedSourceMatchesCsv) {
      return Alert.alert(
        "Source does not match this file",
        `Create or select a reviewed ${csvProvider === "ac_infinity" ? "AC Infinity" : csvProvider} upload source for this grow, room, workspace, and timezone. The file was not imported.`
      );
    }
    if (!csvTsHeader || !csvTempHeader || !csvRhHeader) {
      return Alert.alert(
        "Mapping incomplete",
        "Select timestamp, temperature, and RH headers."
      );
    }

    setIngesting(true);
    setIngestStatus("");
    try {
      const mapping: CsvMapping = {
        tsCol: headerIndex(csvHeaders, csvTsHeader),
        tempCol: headerIndex(csvHeaders, csvTempHeader),
        rhCol: headerIndex(csvHeaders, csvRhHeader),
        tempUnit: csvTempUnit,
        ...csvDetectedExtras
      };
      if (mapping.tsCol < 0 || mapping.tempCol < 0 || mapping.rhCol < 0) {
        Alert.alert(
          "Mapping invalid",
          "Selected CSV columns are not present in headers."
        );
        return;
      }

      const parsedPoints = mapCsvToPoints(
        { headers: csvHeaders, rows: csvRows },
        mapping,
        {
          normalizeTimestamp: (tsRaw) => normalizeCsvTimestampToIso(tsRaw, sourceTimezone)
        }
      )
        .filter((p) => !!p.ts)
        .map((p, idx) => ({ ...p, _idx: idx }));

      if (!parsedPoints.length) {
        Alert.alert(
          "No valid points",
          "CSV rows could not be converted using current mapping."
        );
        return;
      }

      const sorted = [...parsedPoints].sort(
        (a, b) => Date.parse(a.ts) - Date.parse(b.ts)
      );
      const clipped =
        sorted.length > CSV_MAX_ROWS
          ? sorted.slice(sorted.length - CSV_MAX_ROWS)
          : sorted;
      setCsvLimitNotice(
        sorted.length > CSV_MAX_ROWS
          ? `CSV capped to most recent ${CSV_MAX_ROWS} rows (from ${sorted.length}).`
          : ""
      );
      const points = clipped.map((point) => ({
        ts: point.ts,
        airTempC: point.airTempC,
        rh: point.rh,
        vpdKpa: point.vpdKpa,
        co2Ppm: point.co2Ppm,
        lightLux: point.lightLux,
        lightValue: point.lightValue,
        lightUnit: point.lightUnit
      }));

      const res = await bulkIngestTelemetryPoints({
        sourceId: selectedSource.id,
        mode: "upsert",
        ...workspaceScope,
        points
      });
      if (csvMappingStorageKey) {
        await AsyncStorage.setItem(
          csvMappingStorageKey,
          JSON.stringify({
            tsCol: csvTsHeader,
            tempCol: csvTempHeader,
            rhCol: csvRhHeader,
            unit: csvTempUnit
          })
        );
      }
      setIngestStatus(
        `Ingested=${res.ingested} Updated=${res.updated} Skipped=${res.skipped}`
      );
      await fetchWindowPoints();
    } catch (e: any) {
      if (String(e?.code || "") === "SOURCE_NOT_INGESTABLE") {
        Alert.alert(
          "Ingest blocked",
          "This source type cannot accept manual ingest. Use pull for pulse sources."
        );
      } else {
        const auth = telemetryAuthMessage(e);
        Alert.alert("CSV ingest failed", auth || formatApiError(e));
      }
    } finally {
      setIngesting(false);
    }
  }
  const csvPreviewRows = useMemo(() => {
    if (!csvRows.length || !csvTsHeader || !csvTempHeader || !csvRhHeader) return [];
    const tsIdx = headerIndex(csvHeaders, csvTsHeader);
    const tempIdx = headerIndex(csvHeaders, csvTempHeader);
    const rhIdx = headerIndex(csvHeaders, csvRhHeader);
    if (tsIdx < 0 || tempIdx < 0 || rhIdx < 0) return [];
    const out: Array<{ ts: string; temp: string; rh: string; valid: boolean }> = [];
    for (let i = 0; i < csvRows.length && out.length < 5; i++) {
      const row = csvRows[i];
      const tsRaw = String(row[tsIdx] ?? "").trim();
      const tempRaw = String(row[tempIdx] ?? "").trim();
      const rhRaw = String(row[rhIdx] ?? "").trim();
      const tsIso = normalizeCsvTimestampToIso(
        tsRaw,
        sourceTimezone || "America/New_York"
      );
      const tempN = Number(tempRaw);
      const rhN = Number(rhRaw);
      const valid =
        !!tsIso &&
        Number.isFinite(tempN) &&
        Number.isFinite(rhN) &&
        rhN >= 0 &&
        rhN <= 100;
      out.push({ ts: tsIso || tsRaw, temp: tempRaw, rh: rhRaw, valid });
    }
    return out;
  }, [csvRows, csvHeaders, csvTsHeader, csvTempHeader, csvRhHeader, sourceTimezone]);

  function dewPointFlags() {
    return {
      lateIrrigation: toNum(lateIrrigation) === 1,
      fanOffIncident: toNum(fanOffIncident) === 1,
      dehuStruggling: toNum(dehuStruggling) === 1
    };
  }

  function dewPointToolRunPayload() {
    const flags = dewPointFlags();
    if (mode === "manual") {
      return {
        input: {
          mode: "manual_estimate",
          lightsOff: { tempF: toNum(lightsOffTempF), rh: toNum(lightsOffRh) },
          night: { minTempF: toNum(nightMinTempF), maxRh: toNum(nightMaxRh) },
          assumedLeafAirDeltaF: toNum(assumedLeafAirDeltaF),
          flags
        },
        output: computedManual
          ? {
              summary: {
                riskBand: computedManual.riskBand,
                lightsOffDewPointF: computedManual.lightsOffDewPointF,
                worstCaseDewPointF: computedManual.worstCaseDewPointF,
                assumedLeafTempF: computedManual.assumedLeafTempF,
                condensationMarginF: computedManual.condensationMarginF,
                note: "Manual estimate (worst-case). Switch to Telemetry Source mode for true spike detection."
              },
              recommendations: computedManual.recommendations
            }
          : {
              summary: { riskBand: "low", note: "Insufficient inputs to compute." },
              recommendations: []
            }
      };
    }

    const window =
      windowMode === "custom"
        ? {
            startIso: String(startIsoText || "").trim(),
            endIso: String(endIsoText || "").trim()
          }
        : defaultWindow(windowMode);

    return {
      input: {
        mode: "source_window",
        sourceId: selectedSourceId,
        sourceType: selectedSource?.type ?? "unknown",
        window: { mode: windowMode, ...window },
        assumedLeafAirDeltaF: toNum(assumedLeafAirDeltaF),
        flags
      },
      output: computedSource
        ? {
            summary: {
              riskBand: computedSource.riskBand,
              pointsAnalyzed: computedSource.pointsAnalyzed,
              minAirTempF: cToF(computedSource.extremes.minAirTempC),
              maxRh: computedSource.extremes.maxRh,
              maxDewPointF: cToF(computedSource.extremes.maxDewPointC),
              minCondensationMarginF: deltaCToF(
                computedSource.extremes.minCondensationMarginC
              ),
              timeAtRiskMinutes: computedSource.timeAtRiskMinutes,
              minMarginAtIso: computedSource.minMarginAtIso
            },
            recommendations: computedSource.recommendations
          }
        : {
            summary: {
              riskBand: "low",
              note: "No telemetry points loaded for this window."
            },
            recommendations: []
          }
    };
  }

  async function onSaveAndOpen() {
    if (savingAndOpening) return;
    setSavingAndOpening(true);
    setResultFeedback("");
    try {
      if (mode === "manual") {
        const payload = dewPointToolRunPayload();
        const res = await saveToolRunAndOpenJournal({
          router,
          workspaceType,
          facilityId: workspaceType === "facility" ? facilityId : undefined,
          growId,
          ...plantContext.toolRunContext,
          toolKey: "dew-point-guard",
          input: payload.input,
          output: payload.output
        });
        if (!res?.ok)
          Alert.alert("Couldnt save tool run", String(res?.error || "Unknown error"));
        return;
      }

      if (!selectedSourceId)
        return Alert.alert(
          "Select a telemetry source",
          "Pick a source before saving a source-backed run."
        );

      const payload = dewPointToolRunPayload();
      const res = await saveToolRunAndOpenJournal({
        router,
        workspaceType,
        facilityId: workspaceType === "facility" ? facilityId : undefined,
        growId,
        ...plantContext.toolRunContext,
        toolKey: "dew-point-guard",
        input: payload.input,
        output: payload.output
      });
      if (!res?.ok)
        Alert.alert("Couldnt save tool run", String(res?.error || "Unknown error"));
    } finally {
      setSavingAndOpening(false);
    }
  }

  async function onCreateInspectionTask() {
    if (creatingInspectionTask) return;
    if (mode === "source" && !selectedSourceId) {
      Alert.alert(
        "Select a telemetry source",
        "Pick a source before creating a source-backed inspection task."
      );
      return;
    }
    setCreatingInspectionTask(true);
    setResultFeedback("");
    try {
      const payload = dewPointToolRunPayload();
      const summary = payload.output.summary || {};
      const riskBand = String(summary.riskBand || "unknown");
      const highRisk = riskBand === "high";
      const result = await saveToolRunAndCreateTask({
        workspaceType,
        facilityId: workspaceType === "facility" ? facilityId : undefined,
        growId,
        ...plantContext.toolRunContext,
        toolKey: "dew-point-guard",
        input: payload.input,
        output: payload.output,
        title: highRisk
          ? "Inspect canopy for condensation risk"
          : "Review dew point risk window",
        description: [
          `Dew Point Guard risk: ${riskBand}.`,
          summary.condensationMarginF != null
            ? `Manual condensation margin: ${Number(summary.condensationMarginF).toFixed(2)}F.`
            : "",
          summary.minCondensationMarginF != null
            ? `Minimum telemetry margin: ${Number(summary.minCondensationMarginF).toFixed(2)}F.`
            : "",
          summary.timeAtRiskMinutes != null
            ? `Time at risk: ${summary.timeAtRiskMinutes} minutes.`
            : "",
          "Inspect dense canopy areas, confirm sensor placement, and adjust RH/air movement gradually."
        ]
          .filter(Boolean)
          .join("\n"),
        priority: highRisk ? "high" : "medium",
        dueDate: new Date(
          Date.now() + (highRisk ? 2 : 24) * 60 * 60 * 1000
        ).toISOString(),
        ...dewPointInspectionTaskMetadata(riskBand)
      });
      if (!result.ok) throw new Error(result.error);
      setResultFeedback("Created dew point inspection task.");
    } catch (error: any) {
      setResultFeedback(error?.message || "Unable to create inspection task.");
    } finally {
      setCreatingInspectionTask(false);
    }
  }

  const activePayload = dewPointToolRunPayload();
  const activeOutput = activePayload.output as any;
  const activeSummary = activeOutput.summary || {};
  const activeRecommendations = Array.isArray(activeOutput.recommendations)
    ? activeOutput.recommendations
        .map((item: any) => String(item?.message || item).trim())
        .filter(Boolean)
    : [];
  const activeRiskBand = String(activeSummary.riskBand || "not calculated");
  const activeMetrics =
    mode === "manual"
      ? [
          {
            key: "risk",
            label: "Risk band",
            value: activeRiskBand.toUpperCase()
          },
          {
            key: "dew-point",
            label: "Worst dew point",
            value:
              activeSummary.worstCaseDewPointF != null
                ? `${Number(activeSummary.worstCaseDewPointF).toFixed(1)}F`
                : "-"
          },
          {
            key: "margin",
            label: "Condensation margin",
            value:
              activeSummary.condensationMarginF != null
                ? `${Number(activeSummary.condensationMarginF).toFixed(2)}F`
                : "-"
          }
        ]
      : [
          {
            key: "risk",
            label: "Risk band",
            value: activeRiskBand.toUpperCase()
          },
          {
            key: "points",
            label: "Points analyzed",
            value: String(activeSummary.pointsAnalyzed ?? telemetryPoints.length)
          },
          {
            key: "margin",
            label: "Minimum margin",
            value:
              activeSummary.minCondensationMarginF != null
                ? `${Number(activeSummary.minCondensationMarginF).toFixed(2)}F`
                : "-"
          },
          {
            key: "time-at-risk",
            label: "Time at risk",
            value:
              activeSummary.timeAtRiskMinutes != null
                ? `${activeSummary.timeAtRiskMinutes} min`
                : "-"
          }
        ];
  const resultNeedsSource = mode === "source" && !selectedSourceId;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {!historyImportMode ? (
        <PersonalFeedPlacement
          placement="top"
          routeKey={`${workspaceType}_tools_dew_point_guard`}
          longContent
        />
      ) : null}
      <Text style={styles.title}>
        {historyImportMode ? "Import controller and grow history" : "Dew Point Guard"}
      </Text>
      <Text style={styles.subtitle}>
        {historyImportMode
          ? "Preview and map an exported controller CSV, then save duplicate-safe environment readings to this grow. Manufacturer passwords are never required."
          : "Manual estimate default; telemetry-backed window analysis available (source creation + manual ingest included)."}
      </Text>
      {!historyImportMode ? (
        <ToolPlantContextPicker
          plants={plantContext.plants}
          plantId={plantContext.plantId}
          selectedPlant={plantContext.selectedPlant}
          onSelect={plantContext.setPlantId}
        />
      ) : null}

      {!historyImportMode ? (
        <>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Data mode</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            <Chip
              testID="dpg-mode-manual"
              label="Manual"
              active={mode === "manual"}
              onPress={() => setMode("manual")}
            />
            <Chip
              testID="dpg-mode-source"
              label="Telemetry Source"
              active={mode === "source"}
              onPress={() => setMode("source")}
            />
          </View>
        </>
      ) : null}

      {mode === "source" ? (
        <View
          style={[
            styles.panel,
            {
              marginBottom: 16,
              padding: 12
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Telemetry source</Text>
          <Text style={[styles.mutedText, { marginBottom: 5 }]}>Grow timezone</Text>
          <TextInput
            testID="dpg-source-timezone"
            value={sourceTimezone}
            onChangeText={setSourceTimezone}
            autoCapitalize="none"
            placeholder="America/New_York"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
            style={[styles.input, { marginBottom: 10 }]}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            <Pressable
              testID="dpg-load-sources"
              onPress={loadSources}
              disabled={loadingSources}
              style={[
                styles.secondaryButton,
                {
                  opacity: loadingSources ? 0.6 : 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  marginBottom: 8
                }
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {loadingSources ? "Loading..." : "Load Sources"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => createSourceInline("manual")}
              disabled={creatingSource}
              style={[
                styles.secondaryButton,
                {
                  opacity: creatingSource ? 0.6 : 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  marginBottom: 8
                }
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {creatingSource ? "Creating..." : "Create Manual Source"}
              </Text>
            </Pressable>
            <Pressable
              testID="dpg-create-pulse-source"
              onPress={createPulseSourceInline}
              disabled={
                creatingSource ||
                !selectedPulseDeviceId ||
                !String(pulseApiKey || "").trim()
              }
              style={[
                styles.secondaryButton,
                {
                  opacity:
                    creatingSource ||
                    !selectedPulseDeviceId ||
                    !String(pulseApiKey || "").trim()
                      ? 0.6
                      : 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginBottom: 8
                }
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {creatingSource ? "Creating..." : "Create Pulse Source"}
              </Text>
            </Pressable>
          </View>

          <View style={{ marginBottom: 10 }}>
            <Field
              label="Pulse API key"
              value={pulseApiKey}
              onChangeText={setPulseApiKey}
              keyboardType="default"
              secureTextEntry
              testID="dpg-pulse-api-key"
            />
            <Pressable
              testID="dpg-pulse-verify-devices"
              onPress={verifyPulseAndLoadDevices}
              disabled={verifyingPulse || loadingPulseDevices}
              style={[
                styles.secondaryButton,
                {
                  opacity: verifyingPulse || loadingPulseDevices ? 0.6 : 1,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  marginBottom: 8,
                  alignItems: "center"
                }
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {verifyingPulse
                  ? "Verifying..."
                  : loadingPulseDevices
                    ? "Loading devices..."
                    : "Verify + Load Pulse Devices"}
              </Text>
            </Pressable>
            {pulseDevices.length
              ? pulseDevices.map((d) => (
                  <Pressable
                    testID={`dpg-pulse-device-${String(d.id)}`}
                    key={String(d.id)}
                    onPress={() => setSelectedPulseDeviceId(String(d.id))}
                    style={[
                      styles.selectCard,
                      String(d.id) === selectedPulseDeviceId && styles.selectCardActive,
                      { padding: 10, marginBottom: 8 }
                    ]}
                  >
                    <Text style={styles.sectionTitle}>{d.name || String(d.id)}</Text>
                    <Text style={styles.mutedText}>
                      {d.model || "Pulse device"} {String(d.id)}
                    </Text>
                  </Pressable>
                ))
              : null}
          </View>

          {sources.length ? (
            sources.map((s) => (
              <Pressable
                testID={`dpg-source-${s.id}`}
                key={s.id}
                onPress={() => setSelectedSourceId(s.id)}
                style={[
                  styles.selectCard,
                  s.id === selectedSourceId && styles.selectCardActive,
                  { padding: 10, marginBottom: 8 }
                ]}
              >
                <Text style={styles.sectionTitle}>{s.name || s.id}</Text>
                <Text style={styles.mutedText}>
                  {s.type} {s.timezone}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={[styles.mutedText, { marginBottom: 10 }]}>
              No sources loaded yet. Create one before using telemetry mode.
            </Text>
          )}

          <View
            style={[
              styles.separator,
              {
                marginTop: 8,
                marginBottom: 10,
                paddingTop: 8,
                borderTopWidth: 1
              }
            ]}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
              CSV upload / paste (ingest)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
              <Pressable
                testID="dpg-pick-csv"
                onPress={pickCsvFile}
                disabled={parsingCsv}
                style={[
                  styles.secondaryButton,
                  {
                    opacity: parsingCsv ? 0.6 : 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    marginRight: 8,
                    marginBottom: 8
                  }
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {parsingCsv ? "Loading CSV..." : "Pick CSV File"}
                </Text>
              </Pressable>
              <Pressable
                testID="dpg-csv-parse"
                onPress={parsePastedCsv}
                style={[
                  styles.secondaryButton,
                  { paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 }
                ]}
              >
                <Text style={styles.secondaryButtonText}>Parse Pasted CSV</Text>
              </Pressable>
            </View>
            <TextInput
              testID="dpg-csv-paste"
              value={csvText}
              onChangeText={setCsvText}
              placeholder={"timestamp,temp,rh\n2026-02-27T03:00:00.000Z,70.2,58"}
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
              multiline
              style={[styles.input, styles.multilineInput]}
            />
            {csvHeaders.length ? (
              <View style={{ marginBottom: 10 }}>
                {csvImportSummary ? (
                  <Text
                    testID="dpg-csv-import-summary"
                    style={[styles.successText, { fontWeight: "800", marginBottom: 6 }]}
                  >
                    {csvImportSummary}
                  </Text>
                ) : null}
                {csvWarnings.map((warning) => (
                  <Text
                    key={warning}
                    testID="dpg-csv-warning"
                    style={[styles.warningText, { lineHeight: 19, marginBottom: 6 }]}
                  >
                    {warning}
                  </Text>
                ))}
                <Text style={{ fontWeight: "700", marginBottom: 4 }}>
                  Map timestamp column
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {csvHeaders.map((h) => (
                    <Chip
                      key={`ts-${h}`}
                      label={h}
                      active={csvTsHeader === h}
                      onPress={() => setCsvTsHeader(h)}
                    />
                  ))}
                </View>
                <Text style={{ fontWeight: "700", marginBottom: 4 }}>
                  Map temperature column
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {csvHeaders.map((h) => (
                    <Chip
                      key={`temp-${h}`}
                      label={h}
                      active={csvTempHeader === h}
                      onPress={() => setCsvTempHeader(h)}
                    />
                  ))}
                </View>
                <Text style={{ fontWeight: "700", marginBottom: 4 }}>Map RH column</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {csvHeaders.map((h) => (
                    <Chip
                      key={`rh-${h}`}
                      label={h}
                      active={csvRhHeader === h}
                      onPress={() => setCsvRhHeader(h)}
                    />
                  ))}
                </View>
                <Text style={{ fontWeight: "700", marginBottom: 4 }}>
                  Temperature unit
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  <Chip
                    testID="dpg-unit-f"
                    label="F"
                    active={csvTempUnit === "F"}
                    onPress={() => setCsvTempUnit("F")}
                  />
                  <Chip
                    testID="dpg-unit-c"
                    label="C"
                    active={csvTempUnit === "C"}
                    onPress={() => setCsvTempUnit("C")}
                  />
                </View>
                <Text style={[styles.mutedText, { marginBottom: 8 }]}>
                  Parsed rows:{" "}
                  <Text testID="dpg-csv-preview-count" style={{ fontWeight: "800" }}>
                    {csvRows.length}
                  </Text>
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
                  <Chip
                    testID="dpg-map-ts"
                    label="Map TS"
                    active={activeCsvMapTarget === "ts"}
                    onPress={() => setActiveCsvMapTarget("ts")}
                  />
                  <Chip
                    testID="dpg-map-temp"
                    label="Map Temp"
                    active={activeCsvMapTarget === "temp"}
                    onPress={() => setActiveCsvMapTarget("temp")}
                  />
                  <Chip
                    testID="dpg-map-rh"
                    label="Map RH"
                    active={activeCsvMapTarget === "rh"}
                    onPress={() => setActiveCsvMapTarget("rh")}
                  />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
                  {csvHeaders.map((_, idx) => (
                    <Chip
                      key={`map-col-${idx}`}
                      testID={`dpg-col-${idx}`}
                      label={`Col ${idx}`}
                      active={
                        (activeCsvMapTarget === "ts" &&
                          headerIndex(csvHeaders, csvTsHeader) === idx) ||
                        (activeCsvMapTarget === "temp" &&
                          headerIndex(csvHeaders, csvTempHeader) === idx) ||
                        (activeCsvMapTarget === "rh" &&
                          headerIndex(csvHeaders, csvRhHeader) === idx)
                      }
                      onPress={() => applyCsvColumnByIndex(idx)}
                    />
                  ))}
                </View>
                {csvPreviewRows.length ? (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontWeight: "700", marginBottom: 4 }}>
                      Preview (first 5 mapped rows)
                    </Text>
                    {csvPreviewRows.map((r, idx) => (
                      <Text
                        key={`preview-${idx}`}
                        style={[
                          r.valid ? styles.mutedText : styles.errorText,
                          { marginBottom: 2 }
                        ]}
                      >
                        {r.ts} | {r.temp}
                        {csvTempUnit} | {r.rh}% {r.valid ? "" : "(invalid)"}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <View style={[styles.panel, { gap: 8, marginBottom: 10, padding: 10 }]}>
                  <Text style={styles.sectionTitle}>Review import destination</Text>
                  <Text testID="dpg-csv-review-provider" style={styles.mutedText}>
                    Provider:{" "}
                    {csvProvider === "ac_infinity" ? "AC Infinity" : "Generic CSV"}
                  </Text>
                  <Text testID="dpg-csv-review-workspace" style={styles.mutedText}>
                    Workspace: {workspaceType === "facility" ? "Facility" : workspaceType}
                  </Text>
                  <Text testID="dpg-csv-review-grow" style={styles.mutedText}>
                    Grow: {growLabel}
                  </Text>
                  <Text style={styles.mutedText}>Room or grow space</Text>
                  <TextInput
                    testID="dpg-csv-room-name"
                    accessibilityLabel="Room or grow space for imported history"
                    value={csvRoomName}
                    onChangeText={setCsvRoomName}
                    placeholder="Flower room, tent, greenhouse, bed, or outdoor area"
                    placeholderTextColor={palette.textMuted}
                    selectionColor={palette.accent}
                    style={styles.input}
                  />
                  <Text testID="dpg-csv-review-timezone" style={styles.mutedText}>
                    Timezone: {sourceTimezone || "Not selected"}
                  </Text>
                  <Text testID="dpg-csv-review-file" style={styles.mutedText}>
                    File: {csvFileIdentity?.name || "Not selected"} ·{" "}
                    {csvFileIdentity?.size || 0} bytes
                  </Text>
                  <Text style={styles.mutedText}>
                    Re-importing the same source timestamps uses duplicate-safe updates;
                    it does not create a second reading for the same source and time.
                  </Text>
                  <Pressable
                    testID="dpg-confirm-csv-review"
                    accessibilityRole="button"
                    accessibilityLabel="Confirm controller history import review"
                    onPress={confirmCsvImportReview}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Confirm provider, grow, room, timezone, file, and columns
                    </Text>
                  </Pressable>
                  {csvReviewComplete ? (
                    <Text testID="dpg-csv-review-confirmed" style={styles.successText}>
                      Import destination and provenance confirmed.
                    </Text>
                  ) : null}
                </View>
                {!selectedSourceMatchesCsv ? (
                  <>
                    {selectedSourceId ? (
                      <Text testID="dpg-csv-source-mismatch" style={styles.warningText}>
                        The selected source does not match this provider, grow, room,
                        workspace, or timezone. This file cannot be added to that source.
                      </Text>
                    ) : null}
                    <Pressable
                      testID="dpg-create-source-from-csv"
                      accessibilityRole="button"
                      accessibilityLabel="Create a reviewed source from this controller history"
                      disabled={creatingSource || !csvReviewComplete}
                      onPress={() => void createSourceInline("upload")}
                      style={[
                        styles.primaryButton,
                        {
                          alignItems: "center",
                          marginBottom: 10,
                          opacity: creatingSource || !csvReviewComplete ? 0.6 : 1,
                          paddingVertical: 11
                        }
                      ]}
                    >
                      <Text style={[styles.primaryButtonText, { fontWeight: "900" }]}>
                        {creatingSource
                          ? "Creating history source..."
                          : "Create reviewed source from this export"}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
                <Pressable
                  testID="dpg-csv-ingest"
                  onPress={ingestCsvRows}
                  disabled={
                    ingesting ||
                    !csvRows.length ||
                    !csvReviewComplete ||
                    !selectedSourceMatchesCsv
                  }
                  style={[
                    styles.primaryButton,
                    {
                      opacity:
                        ingesting ||
                        !csvRows.length ||
                        !csvReviewComplete ||
                        !selectedSourceMatchesCsv
                          ? 0.6
                          : 1,
                      paddingVertical: 12,
                      alignItems: "center"
                    }
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {ingesting ? "Importing..." : "Import reviewed CSV rows"}
                  </Text>
                </Pressable>
                {csvLimitNotice ? (
                  <Text style={[styles.mutedText, { marginTop: 6 }]}>
                    {csvLimitNotice}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
              Manual readings (ingest)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
              <Pressable
                onPress={() => setReadingTs(new Date().toISOString())}
                style={[
                  styles.secondaryButton,
                  {
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    marginRight: 8,
                    marginBottom: 8
                  }
                ]}
              >
                <Text style={styles.secondaryButtonText}>Now</Text>
              </Pressable>
              <Pressable
                onPress={addReadingToQueue}
                style={[
                  styles.primaryButton,
                  {
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    marginBottom: 8
                  }
                ]}
              >
                <Text style={styles.primaryButtonText}>Add reading</Text>
              </Pressable>
            </View>
            <CalendarDateField
              accessibilityLabel="Telemetry reading timestamp"
              label="Reading date and time"
              mode="datetime"
              value={readingTs}
              onChange={setReadingTs}
              optional={false}
            />
            <Field
              label="Temperature (F)"
              value={readingTempF}
              onChangeText={setReadingTempF}
            />
            <Field label="RH (%)" value={readingRh} onChangeText={setReadingRh} />
            {pendingReadings.length ? (
              pendingReadings.map((r, idx) => (
                <View
                  key={`${r.ts}-${idx}`}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6
                  }}
                >
                  <Text style={styles.mutedText}>
                    {r.ts} {r.tempF}F {r.rh}%
                  </Text>
                  <Pressable
                    onPress={() =>
                      setPendingReadings((prev) => prev.filter((_, i) => i !== idx))
                    }
                    style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Text style={styles.secondaryButtonText}>Remove</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={[styles.mutedText, { marginBottom: 10 }]}>
                No queued readings yet.
              </Text>
            )}
            <Pressable
              onPress={ingestQueuedReadings}
              disabled={ingesting || !pendingReadings.length}
              style={[
                styles.primaryButton,
                {
                  opacity: ingesting || !pendingReadings.length ? 0.6 : 1,
                  paddingVertical: 12,
                  alignItems: "center"
                }
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {ingesting ? "Ingesting..." : "Ingest queued readings"}
              </Text>
            </Pressable>
            {ingestStatus ? (
              <Text style={[styles.successText, { marginTop: 8 }]}>
                Ingest result: <Text style={{ fontWeight: "800" }}>{ingestStatus}</Text>
              </Text>
            ) : null}
          </View>

          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Window</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
            <Chip
              label="Last night"
              active={windowMode === "lastNight"}
              onPress={() => setWindowMode("lastNight")}
            />
            <Chip
              label="Last 24h"
              active={windowMode === "last24h"}
              onPress={() => setWindowMode("last24h")}
            />
            <Chip
              label="Custom"
              active={windowMode === "custom"}
              onPress={() => setWindowMode("custom")}
            />
          </View>
          {windowMode === "custom" ? (
            <>
              <CalendarDateField
                accessibilityLabel="Telemetry window start"
                label="Window start"
                mode="datetime"
                value={startIsoText}
                onChange={setStartIsoText}
                optional={false}
              />
              <CalendarDateField
                accessibilityLabel="Telemetry window end"
                label="Window end"
                mode="datetime"
                value={endIsoText}
                onChange={setEndIsoText}
                optional={false}
              />
            </>
          ) : (
            <Text style={[styles.mutedText, { marginBottom: 10 }]}>
              Window preview: {defaultWindow(windowMode).startIso}{" "}
              {defaultWindow(windowMode).endIso}
            </Text>
          )}
          <Pressable
            onPress={fetchWindowPoints}
            disabled={fetchingPoints || !selectedSourceId}
            style={[
              styles.primaryButton,
              {
                opacity: fetchingPoints || !selectedSourceId ? 0.6 : 1,
                paddingVertical: 12,
                alignItems: "center",
                marginBottom: selectedSource?.type === "pulse" ? 8 : 0
              }
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {fetchingPoints ? "Fetching..." : "Fetch Telemetry Window"}
            </Text>
          </Pressable>
          {selectedSource?.type === "pulse" ? (
            <Pressable
              onPress={pullAndFetchWindowPoints}
              disabled={fetchingPoints || !selectedSourceId}
              style={[
                styles.secondaryButton,
                {
                  opacity: fetchingPoints || !selectedSourceId ? 0.6 : 1,
                  paddingVertical: 12,
                  alignItems: "center"
                }
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {fetchingPoints ? "Pulling..." : "Pull + Fetch Window"}
              </Text>
            </Pressable>
          ) : null}
          <Text style={[styles.mutedText, { marginTop: 10 }]}>
            Loaded points:{" "}
            <Text style={{ fontWeight: "800" }}>{telemetryPoints.length}</Text>
          </Text>
        </View>
      ) : null}

      <Field
        label="Assumed leaf cooler than air (F)"
        value={assumedLeafAirDeltaF}
        onChangeText={setAssumedLeafAirDeltaF}
      />
      <View
        style={[
          styles.panel,
          {
            marginTop: 8,
            marginBottom: 12,
            padding: 12
          }
        ]}
      >
        <Text style={[styles.sectionTitle, { fontWeight: "700", marginBottom: 6 }]}>
          Event Flags (0 = no, 1 = yes)
        </Text>
        <Field
          label="Late irrigation near lights-off"
          value={lateIrrigation}
          onChangeText={setLateIrrigation}
        />
        <Field
          label="Fan/exhaust off incident"
          value={fanOffIncident}
          onChangeText={setFanOffIncident}
        />
        <Field
          label="Dehu struggling / running nonstop"
          value={dehuStruggling}
          onChangeText={setDehuStruggling}
        />
      </View>

      {mode === "manual" ? (
        <>
          <Field
            label="Lights-off temperature (F)"
            value={lightsOffTempF}
            onChangeText={setLightsOffTempF}
          />
          <Field
            label="Lights-off RH (%)"
            value={lightsOffRh}
            onChangeText={setLightsOffRh}
          />
          <Field
            label="Night minimum temperature (F)"
            value={nightMinTempF}
            onChangeText={setNightMinTempF}
          />
          <Field
            label="Night maximum RH (%)"
            value={nightMaxRh}
            onChangeText={setNightMaxRh}
          />
        </>
      ) : null}

      <View
        style={[
          styles.summaryPanel,
          {
            marginTop: 8,
            marginBottom: 18,
            padding: 12
          }
        ]}
      >
        <Text style={[styles.sectionTitle, { fontWeight: "700", marginBottom: 6 }]}>
          Estimated Output
        </Text>
        {mode === "manual" ? (
          <>
            <Text>
              Risk band:{" "}
              <Text style={{ fontWeight: "800" }}>{computedManual?.riskBand ?? ""}</Text>
            </Text>
            {computedManual ? (
              <>
                <Text>
                  Lights-off dew point:{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {computedManual.lightsOffDewPointF.toFixed(1)}F
                  </Text>
                </Text>
                <Text>
                  Worst-case dew point:{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {computedManual.worstCaseDewPointF.toFixed(1)}F
                  </Text>
                </Text>
                <Text>
                  Assumed leaf temp:{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {computedManual.assumedLeafTempF.toFixed(1)}F
                  </Text>
                </Text>
                <Text>
                  Condensation margin (worst):{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {computedManual.condensationMarginF.toFixed(2)}F
                  </Text>
                </Text>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text>
              Risk band:{" "}
              <Text style={{ fontWeight: "800" }}>{computedSource?.riskBand ?? ""}</Text>
            </Text>
            {computedSource ? (
              <>
                <Text>
                  Points analyzed:{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {computedSource.pointsAnalyzed}
                  </Text>
                </Text>
                <Text>
                  Max dew point:{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {cToF(computedSource.extremes.maxDewPointC).toFixed(1)}F
                  </Text>
                </Text>
                <Text>
                  Min air temp:{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {cToF(computedSource.extremes.minAirTempC).toFixed(1)}F
                  </Text>
                </Text>
                <Text>
                  Min condensation margin:{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {deltaCToF(computedSource.extremes.minCondensationMarginC).toFixed(2)}
                    F
                  </Text>
                </Text>
                <Text>
                  Time at risk:{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {computedSource.timeAtRiskMinutes} min
                  </Text>
                </Text>
              </>
            ) : (
              <Text style={styles.mutedText}>
                Fetch telemetry points to compute a source-backed risk summary.
              </Text>
            )}
          </>
        )}
      </View>

      <PersonalFeedPlacement
        placement="middle"
        routeKey={`${workspaceType}_tools_dew_point_guard`}
        longContent
      />

      <ToolResultSurface
        title="Dew Point Guard result"
        status={activeRiskBand.toUpperCase()}
        summary={
          mode === "manual"
            ? "Manual estimate of overnight dew point and leaf-surface condensation margin."
            : "Telemetry-window analysis of dew point margin and time at condensation risk."
        }
        metrics={activeMetrics}
        inputs={activePayload.input}
        outputs={activePayload.output}
        notices={
          activeRiskBand === "high"
            ? [
                {
                  key: "high-risk",
                  severity: "high",
                  message: "Current inputs indicate high condensation risk.",
                  remediation:
                    "Inspect dense canopy areas, confirm leaf temperature assumptions, and improve RH control or airflow gradually."
                }
              ]
            : activeRiskBand === "medium"
              ? [
                  {
                    key: "medium-risk",
                    severity: "medium",
                    message: "Current inputs indicate a narrow dew point safety margin.",
                    remediation:
                      "Recheck during lights-off and avoid late irrigation or fan shutdowns."
                  }
                ]
              : []
        }
        recommendations={activeRecommendations}
        formulas={[
          "Dew point is calculated from air temperature and relative humidity.",
          "Condensation risk increases when estimated leaf temperature approaches or drops below dew point."
        ]}
        uncertainty={
          mode === "manual"
            ? "Manual mode depends on estimated worst-case night values and assumed leaf-air temperature delta."
            : "Telemetry mode depends on source mapping, sensor placement, timezone handling, and reading density."
        }
        confidence={mode === "manual" ? "manual-estimate" : "telemetry-window"}
        assumptions={[
          "This is a condensation-risk screen, not a mold diagnosis.",
          "Use multiple canopy positions and sensor checks before changing controls."
        ]}
        actions={[
          {
            key: "save-journal",
            label: "Save and Open Journal",
            pendingLabel: "Saving...",
            disabled: savingAndOpening || resultNeedsSource,
            onPress: onSaveAndOpen
          },
          {
            key: "create-task",
            label: "Create Inspection Task",
            variant: "secondary",
            pendingLabel: "Creating...",
            disabled: creatingInspectionTask || resultNeedsSource,
            onPress: onCreateInspectionTask
          }
        ]}
        feedback={resultFeedback}
        contextMessage={
          !growId
            ? "Select a grow to save this result or create inspection tasks."
            : resultNeedsSource
              ? "Select a telemetry source before saving source-backed results."
              : undefined
        }
      />

      <PersonalFeedPlacement
        placement="bottom"
        routeKey={`${workspaceType}_tools_dew_point_guard`}
        longContent
      />
    </ScrollView>
  );
}

export const createDewPointGuardStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.page },
    content: { padding: 16, paddingBottom: 28 },
    title: { color: palette.text, fontSize: 22, fontWeight: "800", marginBottom: 6 },
    subtitle: { color: palette.textMuted, marginBottom: 16, lineHeight: 20 },
    field: { marginBottom: 12 },
    fieldLabel: {
      color: palette.text,
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 6
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surface,
      color: palette.text
    },
    multilineInput: { minHeight: 90, marginBottom: 8 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      marginRight: 8,
      marginBottom: 8
    },
    chipActive: {
      borderColor: palette.accent,
      backgroundColor: palette.accent
    },
    chipText: { color: palette.text, fontWeight: "700" },
    chipTextActive: { color: palette.accentText },
    panel: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
    sectionTitle: { color: palette.text, fontWeight: "800" },
    mutedText: { color: palette.textMuted },
    successText: { color: palette.success },
    warningText: { color: palette.warning },
    errorText: { color: palette.danger },
    separator: { borderTopColor: palette.border },
    secondaryButton: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    primaryButton: {
      borderRadius: radius.card,
      backgroundColor: palette.accent
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "800" },
    selectCard: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface
    },
    selectCardActive: {
      borderColor: palette.accent,
      backgroundColor: palette.accentSoft
    },
    summaryPanel: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    }
  });
