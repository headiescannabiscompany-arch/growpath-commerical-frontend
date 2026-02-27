import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import {
  bulkIngestTelemetryPoints,
  createTelemetrySource,
  getTelemetryPoints,
  listTelemetrySources,
  listPulseDevices,
  pullPulseWindow,
  verifyPulseApiKey
} from "@/api/telemetry";
import type { PulseDevice, TelemetryPoint, TelemetrySource } from "@/types/telemetry";
import {
  cToF,
  computeTelemetryRisk,
  CsvMapping,
  deltaCToF,
  deltaFToC,
  dewPointC,
  fToC,
  mapCsvToPoints,
  parseCsvText
} from "@/features/personal/tools/dewPointGuard/engine";

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
    err?.status ??
    err?.response?.status ??
    err?.details?.status ??
    err?.cause?.status;
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
  testID?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>{props.label}</Text>
      <TextInput
        testID={props.testID}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        keyboardType={props.keyboardType ?? "numeric"}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10
        }}
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
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#111" : "#ddd",
        backgroundColor: active ? "#111" : "transparent",
        marginRight: 8,
        marginBottom: 8
      }}
    >
      <Text style={{ color: active ? "white" : "#111", fontWeight: "700" }}>{label}</Text>
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
const CSV_MAX_ROWS = 5000;

function hasTimezoneInfo(ts: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(ts);
}

function normalizeCsvTimestampToIso(tsRaw: string, sourceTimezone: string): string | null {
  const raw = String(tsRaw || "").trim();
  if (!raw) return null;
  // v1 deterministic rule: explicit offset/Z respected; naive timestamps are treated as UTC.
  // Keep this consistent until timezone-aware parsing is introduced.
  void sourceTimezone;
  const normalized = hasTimezoneInfo(raw) ? raw : `${raw}Z`;
  const ms = Date.parse(normalized);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export default function DewPointGuardTool() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const growId = asString(params.growId);

  const [mode, setMode] = useState<"manual" | "source">("manual");
  const [savingAndOpening, setSavingAndOpening] = useState(false);

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

  const [windowMode, setWindowMode] = useState<"lastNight" | "last24h" | "custom">("lastNight");
  const defaults = useMemo(() => defaultWindow(windowMode === "custom" ? "last24h" : windowMode), [windowMode]);
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
  const [activeCsvMapTarget, setActiveCsvMapTarget] = useState<"ts" | "temp" | "rh">("ts");

  const selectedSource = useMemo(
    () => sources.find((s) => s.id === selectedSourceId),
    [sources, selectedSourceId]
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
    if ([tOffF, rhOff, tMinF, rhMax, deltaF].some((n) => !Number.isFinite(n))) return null;

    const dpOffC = dewPointC(fToC(tOffF), rhOff);
    const dpWorstC = dewPointC(fToC(tMinF), rhMax);
    const leafWorstC = fToC(tMinF - deltaF);
    const marginWorstC = leafWorstC - dpWorstC;
    const riskBand: "low" | "medium" | "high" = marginWorstC <= 0 ? "high" : marginWorstC <= 0.5 ? "medium" : "low";

    const recs = riskBand === "low"
      ? [{ code: "MAINTAIN", message: "Current night conditions look safe. Keep monitoring lights-off transitions." }]
      : [
          { code: "LOWER_NIGHT_RH", message: "Lower night RH or increase dehumidification capacity at lights-off." },
          { code: "INCREASE_AIR_MOVEMENT", message: "Increase canopy air movement during lights-off to prevent microclimate saturation." },
          { code: "RAMP_LIGHTS_OFF", message: "Reduce the temperature drop rate at lights-off (stagger HVAC, add gentle heat, or adjust setpoints)." }
        ];

    if (toNum(lateIrrigation) === 1) recs.push({ code: "SHIFT_IRRIGATION_TIMING", message: "Avoid late irrigation near lights-off; it can drive overnight RH spikes." });
    if (toNum(fanOffIncident) === 1) recs.push({ code: "FAN_CONTINUITY", message: "Ensure critical circulation/exhaust stays on during lights-off to prevent spikes." });
    if (toNum(dehuStruggling) === 1) recs.push({ code: "DEHU_CAPACITY", message: "If the dehu runs constantly, you may need more capacity or better placement." });

    return {
      riskBand,
      lightsOffDewPointF: cToF(dpOffC),
      worstCaseDewPointF: cToF(dpWorstC),
      assumedLeafTempF: tMinF - deltaF,
      condensationMarginF: deltaCToF(marginWorstC),
      recommendations: recs
    };
  }, [
    lightsOffTempF, lightsOffRh, nightMinTempF, nightMaxRh, assumedLeafAirDeltaF, lateIrrigation, fanOffIncident, dehuStruggling
  ]);

  const computedSource = useMemo(() => {
    const deltaF = toNum(assumedLeafAirDeltaF);
    const summary = computeTelemetryRisk(telemetryPoints, Number.isFinite(deltaF) ? deltaFToC(deltaF) : 0.5, 0.5);
    if (!summary) return null;
    const recommendations =
      summary.riskBand === "low"
        ? [{ code: "MAINTAIN", message: "Telemetry window looks safe. Keep monitoring lights-off transitions." }]
        : [
            { code: "LOWER_NIGHT_RH", message: "Lower night RH (or add dehumidification capacity) to increase dew point margin." },
            { code: "INCREASE_AIR_MOVEMENT", message: "Increase canopy air movement during lights-off to reduce microclimate saturation." },
            { code: "RAMP_LIGHTS_OFF", message: "Reduce the temperature drop rate at lights-off (gentle ramp, HVAC staging, or heat support)." }
          ];
    return { ...summary, recommendations };
  }, [telemetryPoints, assumedLeafAirDeltaF]);

  async function loadSources() {
    if (!growId) return Alert.alert("Missing growId", "A growId is required to load telemetry sources.");
    setLoadingSources(true);
    try {
      const list = await listTelemetrySources(growId);
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
    if (!growId) return Alert.alert("Missing growId", "A growId is required to create a telemetry source.");
    setCreatingSource(true);
    setIngestStatus("");
    try {
      const created = await createTelemetrySource({
        growId,
        type,
        name: type === "manual" ? "Manual Telemetry" : "Upload Telemetry",
        timezone: "America/New_York",
        config: {}
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

    setVerifyingPulse(true);
    try {
      await verifyPulseApiKey(apiKey);
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
      const devices = await listPulseDevices(apiKey);
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
    if (!growId) return Alert.alert("Missing growId", "A growId is required to create a telemetry source.");
    const apiKey = String(pulseApiKey || "").trim();
    if (!apiKey) return Alert.alert("Missing API key", "Enter your Pulse API key.");
    if (!selectedPulseDeviceId) return Alert.alert("Missing device", "Select a Pulse device first.");

    setCreatingSource(true);
    try {
      const selected = pulseDevices.find((d) => String(d.id) === selectedPulseDeviceId);
      const created = await createTelemetrySource({
        growId,
        type: "pulse",
        name: selected?.name ? `Pulse ${selected.name}` : "Pulse Telemetry",
        timezone: "America/New_York",
        config: { pulse: { apiKey, deviceId: selectedPulseDeviceId } }
      });
      setSources((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setSelectedSourceId(created.id);
      Alert.alert("Pulse source created", `${created.name} (${created.type})`);
    } catch (e: any) {
      const auth = telemetryAuthMessage(e);
      Alert.alert("Failed to create pulse source", auth || formatApiError(e));
    } finally {
      setCreatingSource(false);
    }
  }

  function applyParsedCsv(text: string) {
    const parsed = parseCsvText(text);
    if (!parsed.headers.length || !parsed.rows.length) {
      Alert.alert("CSV parse failed", "Need a header row and at least one data row.");
      return;
    }
    setCsvText(text);
    setCsvHeaders(parsed.headers);
    setCsvRows(parsed.rows);
    setCsvTsHeader(bestHeader(parsed.headers, ["timestamp", "time", "ts", "date"]));
    setCsvTempHeader(bestHeader(parsed.headers, ["tempf", "tempc", "temperature", "temp", "airtemp"]));
    setCsvRhHeader(bestHeader(parsed.headers, ["rh", "humidity", "relative humidity"]));
    setCsvLimitNotice("");
  }

  async function pickCsvFile() {
    setParsingCsv(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel", "*/*"],
        multiple: false,
        copyToCacheDirectory: true
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      const maybeFile = (asset as any).file;
      if (maybeFile && typeof maybeFile.text === "function") {
        const text = await maybeFile.text();
        applyParsedCsv(text);
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
    applyParsedCsv(csvText);
  }

  function addReadingToQueue() {
    const ts = String(readingTs || "").trim();
    const tempF = toNum(readingTempF);
    const rh = toNum(readingRh);
    if (!ts || !Number.isFinite(Date.parse(ts))) return Alert.alert("Invalid timestamp", "Use ISO timestamp.");
    if (!Number.isFinite(tempF)) return Alert.alert("Invalid temperature", "Enter numeric temperature.");
    if (!Number.isFinite(rh) || rh < 0 || rh > 100) return Alert.alert("Invalid RH", "Enter RH between 0 and 100.");
    setPendingReadings((prev) => [...prev, { ts, tempF, rh }].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts)));
    setReadingTempF("");
    setReadingRh("");
  }

  async function fetchWindowPoints() {
    if (!selectedSourceId) return Alert.alert("Select a source", "Choose a telemetry source to fetch points.");
    const window = windowMode === "custom"
      ? { startIso: String(startIsoText || "").trim(), endIso: String(endIsoText || "").trim() }
      : defaultWindow(windowMode);
    setStartIsoText(window.startIso);
    setEndIsoText(window.endIso);
    setFetchingPoints(true);
    try {
      const res = await getTelemetryPoints({ sourceId: selectedSourceId, startIso: window.startIso, endIso: window.endIso, limit: 5000 });
      setTelemetryPoints(res.points || []);
      if (!(res.points || []).length) {
        Alert.alert("No telemetry points found", "Try a larger window or ingest/pull data first.");
      }
    } catch (e: any) {
      const auth = telemetryAuthMessage(e);
      Alert.alert("Failed to fetch points", auth || formatApiError(e));
    } finally {
      setFetchingPoints(false);
    }
  }

  async function pullAndFetchWindowPoints() {
    if (!selectedSourceId) return Alert.alert("Select a source", "Choose a telemetry source first.");
    if (selectedSource?.type !== "pulse") {
      return Alert.alert("Source type", "Pull is only available for Pulse sources.");
    }
    const window = windowMode === "custom"
      ? { startIso: String(startIsoText || "").trim(), endIso: String(endIsoText || "").trim() }
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
    if (!selectedSource) return Alert.alert("Select a source", "Choose or create a telemetry source first.");
    if (selectedSource.type === "pulse") return Alert.alert("Pulse source", "Manual ingest is disabled for Pulse sources.");
    if (!pendingReadings.length) return Alert.alert("No readings queued", "Add one or more readings first.");
    setIngesting(true);
    setIngestStatus("");
    try {
      const res = await bulkIngestTelemetryPoints({
        sourceId: selectedSource.id,
        mode: "upsert",
        points: pendingReadings.map((r) => ({ ts: r.ts, airTempC: fToC(r.tempF), rh: r.rh }))
      });
      setPendingReadings([]);
      setIngestStatus(`Ingested=${res.ingested} Updated=${res.updated} Skipped=${res.skipped}`);
      await fetchWindowPoints();
    } catch (e: any) {
      if (String(e?.code || "") === "SOURCE_NOT_INGESTABLE") {
        Alert.alert("Ingest blocked", "This source type cannot accept manual ingest. Use pull for pulse sources.");
      } else {
        const auth = telemetryAuthMessage(e);
        Alert.alert("Ingest failed", auth || formatApiError(e));
      }
    } finally {
      setIngesting(false);
    }
  }

  async function ingestCsvRows() {
    if (!selectedSource) return Alert.alert("Select a source", "Choose or create a telemetry source first.");
    if (selectedSource.type === "pulse") {
      return Alert.alert("Ingest blocked", "CSV/manual ingest is disabled for Pulse sources.");
    }
    if (!csvRows.length) return Alert.alert("No CSV rows", "Upload or paste CSV first.");
    if (!csvTsHeader || !csvTempHeader || !csvRhHeader) {
      return Alert.alert("Mapping incomplete", "Select timestamp, temperature, and RH headers.");
    }

    setIngesting(true);
    setIngestStatus("");
    try {
      const mapping: CsvMapping = {
        tsCol: headerIndex(csvHeaders, csvTsHeader),
        tempCol: headerIndex(csvHeaders, csvTempHeader),
        rhCol: headerIndex(csvHeaders, csvRhHeader),
        tempUnit: csvTempUnit
      };
      if (mapping.tsCol < 0 || mapping.tempCol < 0 || mapping.rhCol < 0) {
        Alert.alert("Mapping invalid", "Selected CSV columns are not present in headers.");
        return;
      }

      const parsedPoints = mapCsvToPoints({ headers: csvHeaders, rows: csvRows }, mapping)
        .map((p) => ({ ...p, ts: normalizeCsvTimestampToIso(p.ts, selectedSource.timezone) || p.ts }))
        .filter((p) => !!p.ts)
        .map((p, idx) => ({ ts: p.ts, airTempC: p.airTempC, rh: p.rh, _idx: idx }));

      if (!parsedPoints.length) {
        Alert.alert("No valid points", "CSV rows could not be converted using current mapping.");
        return;
      }

      const sorted = [...parsedPoints].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
      const clipped = sorted.length > CSV_MAX_ROWS ? sorted.slice(sorted.length - CSV_MAX_ROWS) : sorted;
      setCsvLimitNotice(
        sorted.length > CSV_MAX_ROWS
          ? `CSV capped to most recent ${CSV_MAX_ROWS} rows (from ${sorted.length}).`
          : ""
      );
      const points = clipped.map((p) => ({ ts: p.ts, airTempC: p.airTempC, rh: p.rh }));

      const res = await bulkIngestTelemetryPoints({
        sourceId: selectedSource.id,
        mode: "upsert",
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
      setIngestStatus(`Ingested=${res.ingested} Updated=${res.updated} Skipped=${res.skipped}`);
      await fetchWindowPoints();
    } catch (e: any) {
      if (String(e?.code || "") === "SOURCE_NOT_INGESTABLE") {
        Alert.alert("Ingest blocked", "This source type cannot accept manual ingest. Use pull for pulse sources.");
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
      const tsIso = normalizeCsvTimestampToIso(tsRaw, selectedSource?.timezone || "America/New_York");
      const tempN = Number(tempRaw);
      const rhN = Number(rhRaw);
      const valid = !!tsIso && Number.isFinite(tempN) && Number.isFinite(rhN) && rhN >= 0 && rhN <= 100;
      out.push({ ts: tsIso || tsRaw, temp: tempRaw, rh: rhRaw, valid });
    }
    return out;
  }, [csvRows, csvHeaders, csvTsHeader, csvTempHeader, csvRhHeader, selectedSource?.timezone]);

  async function onSaveAndOpen() {
    if (savingAndOpening) return;
    setSavingAndOpening(true);
    try {
      const flags = {
        lateIrrigation: toNum(lateIrrigation) === 1,
        fanOffIncident: toNum(fanOffIncident) === 1,
        dehuStruggling: toNum(dehuStruggling) === 1
      };

      if (mode === "manual") {
        const res = await saveToolRunAndOpenJournal({
          router,
          growId,
          toolKey: "dew-point-guard",
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
            : { summary: { riskBand: "low", note: "Insufficient inputs to compute." }, recommendations: [] }
        });
        if (!res?.ok) Alert.alert("Couldnt save tool run", String(res?.error || "Unknown error"));
        return;
      }

      if (!selectedSourceId) return Alert.alert("Select a telemetry source", "Pick a source before saving a source-backed run.");
      const window = windowMode === "custom"
        ? { startIso: String(startIsoText || "").trim(), endIso: String(endIsoText || "").trim() }
        : defaultWindow(windowMode);

      const res = await saveToolRunAndOpenJournal({
        router,
        growId,
        toolKey: "dew-point-guard",
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
                minCondensationMarginF: deltaCToF(computedSource.extremes.minCondensationMarginC),
                timeAtRiskMinutes: computedSource.timeAtRiskMinutes,
                minMarginAtIso: computedSource.minMarginAtIso
              },
              recommendations: computedSource.recommendations
            }
          : { summary: { riskBand: "low", note: "No telemetry points loaded for this window." }, recommendations: [] }
      });
      if (!res?.ok) Alert.alert("Couldnt save tool run", String(res?.error || "Unknown error"));
    } finally {
      setSavingAndOpening(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 6 }}>Dew Point Guard</Text>
      <Text style={{ marginBottom: 16, color: "#444" }}>
        Manual estimate default; telemetry-backed window analysis available (source creation + manual ingest included).
      </Text>

      <Text style={{ fontWeight: "800", marginBottom: 8 }}>Data mode</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
        <Chip testID="dpg-mode-manual" label="Manual" active={mode === "manual"} onPress={() => setMode("manual")} />
        <Chip testID="dpg-mode-source" label="Telemetry Source" active={mode === "source"} onPress={() => setMode("source")} />
      </View>

      {mode === "source" ? (
        <View style={{ marginBottom: 16, padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 12 }}>
          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Telemetry source</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            <Pressable testID="dpg-load-sources" onPress={loadSources} disabled={loadingSources} style={{ opacity: loadingSources ? 0.6 : 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ fontWeight: "800" }}>{loadingSources ? "Loading..." : "Load Sources"}</Text>
            </Pressable>
            <Pressable onPress={() => createSourceInline("manual")} disabled={creatingSource} style={{ opacity: creatingSource ? 0.6 : 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ fontWeight: "800" }}>{creatingSource ? "Creating..." : "Create Manual Source"}</Text>
            </Pressable>
            <Pressable onPress={() => createSourceInline("upload")} disabled={creatingSource} style={{ opacity: creatingSource ? 0.6 : 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ fontWeight: "800" }}>{creatingSource ? "Creating..." : "Create Upload Source"}</Text>
            </Pressable>
            <Pressable onPress={createPulseSourceInline} disabled={creatingSource || !selectedPulseDeviceId || !String(pulseApiKey || "").trim()} style={{ opacity: creatingSource || !selectedPulseDeviceId || !String(pulseApiKey || "").trim() ? 0.6 : 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 }}>
              <Text style={{ fontWeight: "800" }}>{creatingSource ? "Creating..." : "Create Pulse Source"}</Text>
            </Pressable>
          </View>

          <View style={{ marginBottom: 10 }}>
            <Field label="Pulse API key" value={pulseApiKey} onChangeText={setPulseApiKey} keyboardType="default" />
            <Pressable onPress={verifyPulseAndLoadDevices} disabled={verifyingPulse || loadingPulseDevices} style={{ opacity: verifyingPulse || loadingPulseDevices ? 0.6 : 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, alignItems: "center" }}>
              <Text style={{ fontWeight: "800" }}>{verifyingPulse ? "Verifying..." : loadingPulseDevices ? "Loading devices..." : "Verify + Load Pulse Devices"}</Text>
            </Pressable>
            {pulseDevices.length ? pulseDevices.map((d) => (
              <Pressable key={String(d.id)} onPress={() => setSelectedPulseDeviceId(String(d.id))} style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: String(d.id) === selectedPulseDeviceId ? "#111" : "#ddd", marginBottom: 8 }}>
                <Text style={{ fontWeight: "800" }}>{d.name || String(d.id)}</Text>
                <Text style={{ color: "#444" }}>{d.model || "Pulse device"}  {String(d.id)}</Text>
              </Pressable>
            )) : null}
          </View>

          {sources.length ? sources.map((s) => (
            <Pressable testID={`dpg-source-${s.id}`} key={s.id} onPress={() => setSelectedSourceId(s.id)} style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: s.id === selectedSourceId ? "#111" : "#ddd", marginBottom: 8 }}>
              <Text style={{ fontWeight: "800" }}>{s.name || s.id}</Text>
              <Text style={{ color: "#444" }}>{s.type}  {s.timezone}</Text>
            </Pressable>
          )) : <Text style={{ color: "#444", marginBottom: 10 }}>No sources loaded yet. Create one before using telemetry mode.</Text>}

          <View style={{ marginTop: 8, marginBottom: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#eee" }}>
            <Text style={{ fontWeight: "800", marginBottom: 8 }}>CSV upload / paste (ingest)</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
              <Pressable onPress={pickCsvFile} disabled={parsingCsv} style={{ opacity: parsingCsv ? 0.6 : 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 }}>
                <Text style={{ fontWeight: "800" }}>{parsingCsv ? "Loading CSV..." : "Pick CSV File"}</Text>
              </Pressable>
              <Pressable testID="dpg-csv-parse" onPress={parsePastedCsv} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 }}>
                <Text style={{ fontWeight: "800" }}>Parse Pasted CSV</Text>
              </Pressable>
            </View>
            <TextInput
              testID="dpg-csv-paste"
              value={csvText}
              onChangeText={setCsvText}
              placeholder={"timestamp,temp,rh\n2026-02-27T03:00:00.000Z,70.2,58"}
              multiline
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minHeight: 90,
                marginBottom: 8
              }}
            />
            {csvHeaders.length ? (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: "700", marginBottom: 4 }}>Map timestamp column</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {csvHeaders.map((h) => (
                    <Chip key={`ts-${h}`} label={h} active={csvTsHeader === h} onPress={() => setCsvTsHeader(h)} />
                  ))}
                </View>
                <Text style={{ fontWeight: "700", marginBottom: 4 }}>Map temperature column</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {csvHeaders.map((h) => (
                    <Chip key={`temp-${h}`} label={h} active={csvTempHeader === h} onPress={() => setCsvTempHeader(h)} />
                  ))}
                </View>
                <Text style={{ fontWeight: "700", marginBottom: 4 }}>Map RH column</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {csvHeaders.map((h) => (
                    <Chip key={`rh-${h}`} label={h} active={csvRhHeader === h} onPress={() => setCsvRhHeader(h)} />
                  ))}
                </View>
                <Text style={{ fontWeight: "700", marginBottom: 4 }}>Temperature unit</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  <Chip testID="dpg-unit-f" label="F" active={csvTempUnit === "F"} onPress={() => setCsvTempUnit("F")} />
                  <Chip testID="dpg-unit-c" label="C" active={csvTempUnit === "C"} onPress={() => setCsvTempUnit("C")} />
                </View>
                <Text style={{ color: "#444", marginBottom: 8 }}>
                  Parsed rows: <Text testID="dpg-csv-preview-count" style={{ fontWeight: "800" }}>{csvRows.length}</Text>
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
                  <Chip testID="dpg-map-ts" label="Map TS" active={activeCsvMapTarget === "ts"} onPress={() => setActiveCsvMapTarget("ts")} />
                  <Chip testID="dpg-map-temp" label="Map Temp" active={activeCsvMapTarget === "temp"} onPress={() => setActiveCsvMapTarget("temp")} />
                  <Chip testID="dpg-map-rh" label="Map RH" active={activeCsvMapTarget === "rh"} onPress={() => setActiveCsvMapTarget("rh")} />
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
                  {csvHeaders.map((_, idx) => (
                    <Chip
                      key={`map-col-${idx}`}
                      testID={`dpg-col-${idx}`}
                      label={`Col ${idx}`}
                      active={
                        (activeCsvMapTarget === "ts" && headerIndex(csvHeaders, csvTsHeader) === idx) ||
                        (activeCsvMapTarget === "temp" && headerIndex(csvHeaders, csvTempHeader) === idx) ||
                        (activeCsvMapTarget === "rh" && headerIndex(csvHeaders, csvRhHeader) === idx)
                      }
                      onPress={() => applyCsvColumnByIndex(idx)}
                    />
                  ))}
                </View>
                {csvPreviewRows.length ? (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontWeight: "700", marginBottom: 4 }}>Preview (first 5 mapped rows)</Text>
                    {csvPreviewRows.map((r, idx) => (
                      <Text key={`preview-${idx}`} style={{ color: r.valid ? "#444" : "#b00020", marginBottom: 2 }}>
                        {r.ts} | {r.temp}{csvTempUnit} | {r.rh}% {r.valid ? "" : "(invalid)"}
                      </Text>
                    ))}
                  </View>
                ) : null}
                <Pressable testID="dpg-csv-ingest" onPress={ingestCsvRows} disabled={ingesting || !csvRows.length} style={{ opacity: ingesting || !csvRows.length ? 0.6 : 1, backgroundColor: "#111", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                  <Text style={{ color: "white", fontWeight: "800" }}>{ingesting ? "Ingesting..." : "Ingest CSV Rows"}</Text>
                </Pressable>
                {csvLimitNotice ? (
                  <Text style={{ color: "#444", marginTop: 6 }}>{csvLimitNotice}</Text>
                ) : null}
              </View>
            ) : null}

            <Text style={{ fontWeight: "800", marginBottom: 8 }}>Manual readings (ingest)</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
              <Pressable onPress={() => setReadingTs(new Date().toISOString())} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 }}>
                <Text style={{ fontWeight: "800" }}>Now</Text>
              </Pressable>
              <Pressable onPress={addReadingToQueue} style={{ backgroundColor: "#111", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 }}>
                <Text style={{ color: "white", fontWeight: "800" }}>Add reading</Text>
              </Pressable>
            </View>
            <Field label="Timestamp ISO (UTC)" value={readingTs} onChangeText={setReadingTs} keyboardType="default" />
            <Field label="Temperature (F)" value={readingTempF} onChangeText={setReadingTempF} />
            <Field label="RH (%)" value={readingRh} onChangeText={setReadingRh} />
            {pendingReadings.length ? pendingReadings.map((r, idx) => (
              <View key={`${r.ts}-${idx}`} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ color: "#444" }}>{r.ts}  {r.tempF}F  {r.rh}%</Text>
                <Pressable onPress={() => setPendingReadings((prev) => prev.filter((_, i) => i !== idx))} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ fontWeight: "800" }}>Remove</Text>
                </Pressable>
              </View>
            )) : <Text style={{ color: "#444", marginBottom: 10 }}>No queued readings yet.</Text>}
            <Pressable onPress={ingestQueuedReadings} disabled={ingesting || !pendingReadings.length} style={{ opacity: ingesting || !pendingReadings.length ? 0.6 : 1, backgroundColor: "#111", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: "white", fontWeight: "800" }}>{ingesting ? "Ingesting..." : "Ingest queued readings"}</Text>
            </Pressable>
            {ingestStatus ? <Text style={{ marginTop: 8, color: "#444" }}>Ingest result: <Text style={{ fontWeight: "800" }}>{ingestStatus}</Text></Text> : null}
          </View>

          <Text style={{ fontWeight: "800", marginBottom: 8 }}>Window</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
            <Chip label="Last night" active={windowMode === "lastNight"} onPress={() => setWindowMode("lastNight")} />
            <Chip label="Last 24h" active={windowMode === "last24h"} onPress={() => setWindowMode("last24h")} />
            <Chip label="Custom" active={windowMode === "custom"} onPress={() => setWindowMode("custom")} />
          </View>
          {windowMode === "custom" ? (
            <>
              <Field label="Start ISO (UTC)" value={startIsoText} onChangeText={setStartIsoText} keyboardType="default" />
              <Field label="End ISO (UTC)" value={endIsoText} onChangeText={setEndIsoText} keyboardType="default" />
            </>
          ) : (
            <Text style={{ color: "#444", marginBottom: 10 }}>Window preview: {defaultWindow(windowMode).startIso}  {defaultWindow(windowMode).endIso}</Text>
          )}
          <Pressable onPress={fetchWindowPoints} disabled={fetchingPoints || !selectedSourceId} style={{ opacity: fetchingPoints || !selectedSourceId ? 0.6 : 1, backgroundColor: "#111", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginBottom: selectedSource?.type === "pulse" ? 8 : 0 }}>
            <Text style={{ color: "white", fontWeight: "800" }}>{fetchingPoints ? "Fetching..." : "Fetch Telemetry Window"}</Text>
          </Pressable>
          {selectedSource?.type === "pulse" ? (
            <Pressable onPress={pullAndFetchWindowPoints} disabled={fetchingPoints || !selectedSourceId} style={{ opacity: fetchingPoints || !selectedSourceId ? 0.6 : 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: "#111", fontWeight: "800" }}>{fetchingPoints ? "Pulling..." : "Pull + Fetch Window"}</Text>
            </Pressable>
          ) : null}
          <Text style={{ marginTop: 10, color: "#444" }}>Loaded points: <Text style={{ fontWeight: "800" }}>{telemetryPoints.length}</Text></Text>
        </View>
      ) : null}

      <Field label="Assumed leaf cooler than air (F)" value={assumedLeafAirDeltaF} onChangeText={setAssumedLeafAirDeltaF} />
      <View style={{ marginTop: 8, marginBottom: 12, padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 12 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6 }}>Event Flags (0 = no, 1 = yes)</Text>
        <Field label="Late irrigation near lights-off" value={lateIrrigation} onChangeText={setLateIrrigation} />
        <Field label="Fan/exhaust off incident" value={fanOffIncident} onChangeText={setFanOffIncident} />
        <Field label="Dehu struggling / running nonstop" value={dehuStruggling} onChangeText={setDehuStruggling} />
      </View>

      {mode === "manual" ? (
        <>
          <Field label="Lights-off temperature (F)" value={lightsOffTempF} onChangeText={setLightsOffTempF} />
          <Field label="Lights-off RH (%)" value={lightsOffRh} onChangeText={setLightsOffRh} />
          <Field label="Night minimum temperature (F)" value={nightMinTempF} onChangeText={setNightMinTempF} />
          <Field label="Night maximum RH (%)" value={nightMaxRh} onChangeText={setNightMaxRh} />
        </>
      ) : null}

      <View style={{ marginTop: 8, marginBottom: 18, padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 12 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6 }}>Estimated Output</Text>
        {mode === "manual" ? (
          <>
            <Text>Risk band: <Text style={{ fontWeight: "800" }}>{computedManual?.riskBand ?? ""}</Text></Text>
            {computedManual ? (
              <>
                <Text>Lights-off dew point: <Text style={{ fontWeight: "800" }}>{computedManual.lightsOffDewPointF.toFixed(1)}F</Text></Text>
                <Text>Worst-case dew point: <Text style={{ fontWeight: "800" }}>{computedManual.worstCaseDewPointF.toFixed(1)}F</Text></Text>
                <Text>Assumed leaf temp: <Text style={{ fontWeight: "800" }}>{computedManual.assumedLeafTempF.toFixed(1)}F</Text></Text>
                <Text>Condensation margin (worst): <Text style={{ fontWeight: "800" }}>{computedManual.condensationMarginF.toFixed(2)}F</Text></Text>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text>Risk band: <Text style={{ fontWeight: "800" }}>{computedSource?.riskBand ?? ""}</Text></Text>
            {computedSource ? (
              <>
                <Text>Points analyzed: <Text style={{ fontWeight: "800" }}>{computedSource.pointsAnalyzed}</Text></Text>
                <Text>Max dew point: <Text style={{ fontWeight: "800" }}>{cToF(computedSource.extremes.maxDewPointC).toFixed(1)}F</Text></Text>
                <Text>Min air temp: <Text style={{ fontWeight: "800" }}>{cToF(computedSource.extremes.minAirTempC).toFixed(1)}F</Text></Text>
                <Text>Min condensation margin: <Text style={{ fontWeight: "800" }}>{deltaCToF(computedSource.extremes.minCondensationMarginC).toFixed(2)}F</Text></Text>
                <Text>Time at risk: <Text style={{ fontWeight: "800" }}>{computedSource.timeAtRiskMinutes} min</Text></Text>
              </>
            ) : (
              <Text style={{ color: "#444" }}>Fetch telemetry points to compute a source-backed risk summary.</Text>
            )}
          </>
        )}
      </View>

      <Pressable onPress={onSaveAndOpen} disabled={savingAndOpening} style={{ opacity: savingAndOpening ? 0.6 : 1, backgroundColor: "#111", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
        <Text style={{ color: "white", fontWeight: "800" }}>{savingAndOpening ? "Saving..." : "Save and Open Journal"}</Text>
      </Pressable>
    </ScrollView>
  );
}
