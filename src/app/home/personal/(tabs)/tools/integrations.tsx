import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  createIntegrationAccessRequest,
  createIntegrationConnection,
  listIntegrationConnections,
  listIntegrationProviders,
  testIntegrationConnection,
  type IntegrationConnection,
  type IntegrationProvider
} from "@/api/integrations";
import {
  createTelemetrySource,
  listGrowlinkControllers,
  listTelemetrySources,
  pullGrowlinkCurrentReadings,
  pullGrowlinkHistoricalWindow,
  verifyGrowlinkCredentials
} from "@/api/telemetry";
import type { GrowlinkController, TelemetrySource } from "@/types/telemetry";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";

function message(error: any) {
  return String(error?.message || error?.error?.message || "Request failed");
}

function paramString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function controllerLabel(controller: GrowlinkController) {
  const moduleCount = Array.isArray(controller.modules) ? controller.modules.length : 0;
  const details = [
    controller.serialNumber ? `SN ${controller.serialNumber}` : "",
    controller.timeZoneId || "",
    moduleCount ? `${moduleCount} modules` : ""
  ].filter(Boolean);
  return details.join(" / ");
}

type RoomImportPreview = {
  name: string;
  type: string;
  controllerName: string;
  devices: string[];
  metrics: string[];
  sensorStreams: Array<{
    providerMetricKey: string;
    normalizedMetric: string;
    suggestedRoomName: string;
    suggestedDeviceName: string;
  }>;
};

const metricPatterns: Array<[RegExp, string]> = [
  [/temp|temperature/i, "air_temperature"],
  [/rh|humidity/i, "relative_humidity"],
  [/\bvpd\b/i, "vpd"],
  [/\bco2\b|carbon/i, "co2"],
  [/light|ppfd|par/i, "ppfd"],
  [/moisture|water content|vwc/i, "substrate_moisture"],
  [/\bec\b|conductivity/i, "substrate_ec"],
  [/\bph\b/i, "substrate_ph"],
  [/irrigation|pump|valve/i, "irrigation_event"]
];

function cleanRoomName(value: string) {
  const clean = value
    .replace(
      /\b(pulse|trolmaster|hydro\s*[- ]?\s*x\s*pro|hydro\s*[- ]?\s*x|growlink|aroya|sensorpush|ubibot|aranet|meter|zentra|hobolink|hobo|monnit)\b/gi,
      ""
    )
    .replace(/\b(temp|temperature|rh|humidity|vpd|co2|light|ppfd|par)\b/gi, "")
    .replace(/\b(sensor|probe|module|controller|device|channel|monitor)\b/gi, "")
    .replace(/\s*[-_/]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean || value.trim() || "Imported Room";
}

function inferRoomType(name: string) {
  if (/clone|prop|root/i.test(name)) return "clone";
  if (/veg|vegetative/i.test(name)) return "veg";
  if (/flower|bloom/i.test(name)) return "flower";
  if (/dry|cure/i.test(name)) return "dry/cure";
  if (/mother/i.test(name)) return "mother";
  return "room";
}

function valueText(value: any) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function moduleName(module: any) {
  return (
    valueText(module?.roomName) ||
    valueText(module?.zoneName) ||
    valueText(module?.name) ||
    valueText(module?.label) ||
    valueText(module?.displayName) ||
    valueText(module?.deviceName) ||
    valueText(module?.id)
  );
}

function inferMetrics(module: any, fallbackName: string) {
  const metricSource = [
    fallbackName,
    valueText(module?.type),
    valueText(module?.metric),
    ...(Array.isArray(module?.metrics) ? module.metrics.map(valueText) : []),
    ...(Array.isArray(module?.sensors) ? module.sensors.map(valueText) : []),
    ...(Array.isArray(module?.channels) ? module.channels.map(valueText) : [])
  ]
    .filter(Boolean)
    .join(" ");
  const metrics = metricPatterns
    .filter(([pattern]) => pattern.test(metricSource))
    .map(([, metric]) => metric);
  return Array.from(new Set(metrics));
}

function buildGrowlinkImportPreview(
  controllers: GrowlinkController[]
): RoomImportPreview[] {
  const rooms = new Map<string, RoomImportPreview>();

  controllers.forEach((controller) => {
    const controllerName = controller.name || controller.id || "Growlink controller";
    const modules = Array.isArray(controller.modules) ? controller.modules : [];
    const rows = modules.length ? modules : [{ name: controllerName, id: controller.id }];

    rows.forEach((module) => {
      const rawName = moduleName(module) || controllerName;
      const roomName = cleanRoomName(
        valueText(module?.roomName) || valueText(module?.zoneName) || rawName
      );
      const existing =
        rooms.get(roomName) ||
        ({
          name: roomName,
          type: inferRoomType(roomName),
          controllerName,
          devices: [],
          metrics: [],
          sensorStreams: []
        } satisfies RoomImportPreview);

      const moduleMetrics = inferMetrics(module, rawName);
      existing.devices = Array.from(new Set([...existing.devices, rawName]));
      existing.metrics = Array.from(new Set([...existing.metrics, ...moduleMetrics]));
      const nextStreams = moduleMetrics.map((metric) => ({
        providerMetricKey: metric,
        normalizedMetric: metric,
        suggestedRoomName: roomName,
        suggestedDeviceName: rawName
      }));
      existing.sensorStreams = Array.from(
        new Map(
          [...existing.sensorStreams, ...nextStreams].map((stream) => [
            `${stream.suggestedDeviceName}:${stream.normalizedMetric}`,
            stream
          ])
        ).values()
      );
      rooms.set(roomName, existing);
    });
  });

  return Array.from(rooms.values());
}

function defaultHistoryWindow() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

function isValidHistoryWindow(startIso: string, endIso: string) {
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
}

export default function DataIntegrationsScreen() {
  const params = useLocalSearchParams<{ growId?: string }>();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [selected, setSelected] = useState<IntegrationProvider | null>(null);
  const [secret, setSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [requestDraft, setRequestDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [growId, setGrowId] = useState(() => paramString(params.growId));
  const [growlinkUserName, setGrowlinkUserName] = useState("");
  const [growlinkPassword, setGrowlinkPassword] = useState("");
  const [growlinkControllers, setGrowlinkControllers] = useState<GrowlinkController[]>(
    []
  );
  const [selectedGrowlinkControllerId, setSelectedGrowlinkControllerId] = useState("");
  const [growlinkSourceName, setGrowlinkSourceName] = useState("Growlink Telemetry");
  const [growlinkSources, setGrowlinkSources] = useState<TelemetrySource[]>([]);
  const [growlinkStatus, setGrowlinkStatus] = useState("");
  const [growlinkBusy, setGrowlinkBusy] = useState(false);
  const [loadingGrowlinkSources, setLoadingGrowlinkSources] = useState(false);
  const [growlinkHistoryStartIso, setGrowlinkHistoryStartIso] = useState(
    () => defaultHistoryWindow().startIso
  );
  const [growlinkHistoryEndIso, setGrowlinkHistoryEndIso] = useState(
    () => defaultHistoryWindow().endIso
  );

  const byProvider = useMemo(
    () => new Map(connections.map((connection) => [connection.provider, connection])),
    [connections]
  );

  const selectedGrowlinkController = useMemo(
    () =>
      growlinkControllers.find(
        (controller) => controller.id === selectedGrowlinkControllerId
      ),
    [growlinkControllers, selectedGrowlinkControllerId]
  );
  const growlinkImportPreview = useMemo(
    () => buildGrowlinkImportPreview(growlinkControllers),
    [growlinkControllers]
  );
  const growlinkPreviewTotals = useMemo(
    () => ({
      rooms: growlinkImportPreview.length,
      devices: growlinkImportPreview.reduce(
        (total, room) => total + room.devices.length,
        0
      ),
      streams: growlinkImportPreview.reduce(
        (total, room) => total + room.metrics.length,
        0
      )
    }),
    [growlinkImportPreview]
  );

  const loadGrowlinkSources = useCallback(
    async (nextGrowId = growId.trim(), showError = true) => {
      if (!nextGrowId) return;
      setLoadingGrowlinkSources(true);
      try {
        const sources = await listTelemetrySources(nextGrowId);
        setGrowlinkSources(sources.filter((source) => source.type === "growlink"));
      } catch (error) {
        if (showError) Alert.alert("Growlink sources unavailable", message(error));
      } finally {
        setLoadingGrowlinkSources(false);
      }
    },
    [growId]
  );

  async function load() {
    setLoading(true);
    try {
      const [providerRows, connectionRows] = await Promise.all([
        listIntegrationProviders(),
        listIntegrationConnections()
      ]);
      setProviders(providerRows);
      setConnections(connectionRows);
    } catch (error) {
      Alert.alert("Integrations unavailable", message(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const nextGrowId = paramString(params.growId);
    if (nextGrowId && nextGrowId !== growId) setGrowId(nextGrowId);
  }, [growId, params.growId]);

  useEffect(() => {
    if (growId.trim()) void loadGrowlinkSources(growId.trim(), false);
  }, [growId, loadGrowlinkSources]);

  async function saveConnection() {
    if (!selected) return;
    if (selected.contractStatus === "implemented" && !secret.trim()) {
      return Alert.alert("Credential required", "Enter the provider API key or token.");
    }
    setBusy(true);
    try {
      const connection = await createIntegrationConnection({
        provider: selected.id,
        label: selected.name,
        credentials: secret.trim() ? { apiKey: secret.trim() } : undefined,
        config: baseUrl.trim() ? { baseUrl: baseUrl.trim() } : undefined
      });
      setConnections((rows) => [
        connection,
        ...rows.filter((row) => row.id !== connection.id)
      ]);
      setSecret("");
      Alert.alert("Connection saved", "Credentials were encrypted and stored.");
    } catch (error) {
      Alert.alert("Save failed", message(error));
    } finally {
      setBusy(false);
    }
  }

  async function testConnection(connection: IntegrationConnection) {
    setBusy(true);
    try {
      const updated = await testIntegrationConnection(connection.id);
      setConnections((rows) =>
        rows.map((row) => (row.id === updated.id ? updated : row))
      );
      Alert.alert("Connected", `${connection.label} credentials were accepted.`);
    } catch (error) {
      Alert.alert("Connection test failed", message(error));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function prepareAccessRequest(provider: IntegrationProvider) {
    setBusy(true);
    try {
      const request = await createIntegrationAccessRequest(provider.id);
      setSelected(provider);
      setRequestDraft(`${request.subject}\n\n${request.body}`);
      if (request.requestUrl) await Linking.openURL(request.requestUrl);
    } catch (error) {
      Alert.alert("Request preparation failed", message(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifyGrowlinkAndLoadControllers() {
    const userName = growlinkUserName.trim();
    const password = growlinkPassword.trim();
    if (!userName || !password) {
      return Alert.alert(
        "Growlink credentials required",
        "Enter the customer's Growlink email and password."
      );
    }

    setGrowlinkBusy(true);
    setGrowlinkStatus("");
    try {
      await verifyGrowlinkCredentials({ userName, password });
      const controllers = await listGrowlinkControllers({ userName, password });
      setGrowlinkControllers(controllers);
      const firstControllerId = controllers[0]?.id || "";
      setSelectedGrowlinkControllerId((current) => current || firstControllerId);
      if (!controllers.length) {
        setGrowlinkStatus(
          "Growlink account verified. No controllers were returned, so a telemetry source cannot be created until hardware is attached or API access includes a controller."
        );
      } else {
        setGrowlinkStatus(
          `Growlink account verified. ${controllers.length} controller${controllers.length === 1 ? "" : "s"} available.`
        );
      }
    } catch (error) {
      setGrowlinkStatus("");
      Alert.alert("Growlink verify failed", message(error));
    } finally {
      setGrowlinkBusy(false);
    }
  }

  async function createGrowlinkSource() {
    const nextGrowId = growId.trim();
    const userName = growlinkUserName.trim();
    const password = growlinkPassword.trim();
    const controllerId = selectedGrowlinkControllerId.trim();
    if (!nextGrowId) return Alert.alert("Grow ID required", "Enter the grow ID.");
    if (!userName || !password) {
      return Alert.alert(
        "Growlink credentials required",
        "Enter the customer's Growlink email and password."
      );
    }
    if (!controllerId) {
      return Alert.alert(
        "Controller required",
        "Verify Growlink and select a controller first."
      );
    }

    setGrowlinkBusy(true);
    try {
      const importPreview = growlinkImportPreview.map((room) => ({
        ...room,
        permissionLevel: "read-only",
        provider: "growlink"
      }));
      const suggestedGrowSpaces = importPreview.map((room) => ({
        name: room.name,
        type: room.type,
        source: "growlink_account_structure",
        provider: "growlink",
        permissionLevel: "read-only",
        devices: room.devices,
        normalizedMetrics: room.metrics,
        sensorStreams: room.sensorStreams
      }));
      const created = await createTelemetrySource({
        growId: nextGrowId,
        type: "growlink",
        name: growlinkSourceName.trim() || "Growlink Telemetry",
        timezone: selectedGrowlinkController?.timeZoneId || "America/New_York",
        config: {
          growlink: {
            userName,
            password,
            controllerId,
            accountStructure: {
              provider: "growlink",
              permissionLevel: "read-only",
              detectedRooms: growlinkPreviewTotals.rooms,
              detectedDevices: growlinkPreviewTotals.devices,
              detectedStreams: growlinkPreviewTotals.streams,
              suggestedGrowSpaces,
              rooms: importPreview
            }
          }
        }
      });
      setGrowlinkSources((rows) => [
        created,
        ...rows.filter((source) => source.id !== created.id)
      ]);
      setGrowlinkPassword("");
      Alert.alert(
        "Growlink source created",
        "Credentials were encrypted. GrowPath will only read telemetry data."
      );
      setGrowlinkStatus("Growlink source created. Current readings can be pulled now.");
    } catch (error) {
      Alert.alert("Create Growlink source failed", message(error));
    } finally {
      setGrowlinkBusy(false);
    }
  }

  async function pullGrowlinkNow(source: TelemetrySource) {
    setGrowlinkBusy(true);
    try {
      const result = await pullGrowlinkCurrentReadings(source.id);
      Alert.alert("Growlink pull complete", `Pulled ${result.pulled} current readings.`);
    } catch (error) {
      Alert.alert("Growlink pull failed", message(error));
    } finally {
      setGrowlinkBusy(false);
    }
  }

  async function pullGrowlinkHistory(source: TelemetrySource) {
    const startIso = growlinkHistoryStartIso.trim();
    const endIso = growlinkHistoryEndIso.trim();
    if (!isValidHistoryWindow(startIso, endIso)) {
      return Alert.alert(
        "Invalid history window",
        "Enter valid start and end ISO timestamps, with end after start."
      );
    }

    setGrowlinkBusy(true);
    try {
      const result = await pullGrowlinkHistoricalWindow(source.id, startIso, endIso);
      const saved =
        Number(result.ingested === undefined ? 0 : result.ingested) +
        Number(result.updated || 0);
      Alert.alert(
        "Growlink history pull complete",
        `Pulled ${result.pulled} readings. Saved ${saved} telemetry points.`
      );
    } catch (error) {
      Alert.alert("Growlink history pull failed", message(error));
    } finally {
      setGrowlinkBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Data Integrations</Text>
      <Text style={styles.subtitle}>
        Connect grow sensors, controllers, irrigation, and environmental data. Imported
        account structure can suggest tents, rooms, devices, and streams before any data
        is saved.
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_tools_integrations"
        longContent
      />

      <View style={styles.growlinkPanel}>
        <View style={styles.row}>
          <View style={styles.titleBlock}>
            <Text style={styles.sectionTitle}>Growlink read-only telemetry</Text>
            <Text style={styles.meta}>
              Imports controllers, sensors, devices, and current readings. No setpoint,
              rule, or equipment control actions are exposed.
            </Text>
          </View>
          <Text style={styles.readOnlyBadge}>READ ONLY</Text>
        </View>
        <TextInput
          style={styles.input}
          value={growId}
          onChangeText={setGrowId}
          placeholder="Grow ID"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={growlinkSourceName}
          onChangeText={setGrowlinkSourceName}
          placeholder="Source name"
        />
        <TextInput
          style={styles.input}
          value={growlinkUserName}
          onChangeText={setGrowlinkUserName}
          placeholder="Growlink email"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          value={growlinkPassword}
          onChangeText={setGrowlinkPassword}
          placeholder="Growlink password"
          secureTextEntry
          autoCapitalize="none"
        />
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, growlinkBusy ? styles.disabledButton : null]}
            onPress={verifyGrowlinkAndLoadControllers}
            disabled={growlinkBusy}
          >
            <Text style={styles.buttonText}>
              {growlinkBusy ? "Working..." : "Verify + preview controllers"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, growlinkBusy ? styles.disabledButton : null]}
            onPress={createGrowlinkSource}
            disabled={growlinkBusy}
          >
            <Text style={styles.primaryText}>Create read-only source</Text>
          </Pressable>
        </View>

        {growlinkStatus ? <Text style={styles.notice}>{growlinkStatus}</Text> : null}

        {growlinkControllers.length ? (
          <View style={styles.controllerList}>
            {growlinkControllers.map((controller) => {
              const selectedController = controller.id === selectedGrowlinkControllerId;
              return (
                <Pressable
                  key={controller.id}
                  style={[
                    styles.controllerOption,
                    selectedController ? styles.controllerSelected : null
                  ]}
                  onPress={() => setSelectedGrowlinkControllerId(controller.id)}
                >
                  <Text style={styles.controllerName}>
                    {controller.name || "Unnamed controller"}
                  </Text>
                  <Text style={styles.meta}>{controllerLabel(controller)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {growlinkImportPreview.length ? (
          <View style={styles.importPreview}>
            <Text style={styles.sourceListTitle}>Room import preview</Text>
            <Text style={styles.meta}>
              Review this mapping before saving. GrowPath can use it to suggest personal
              grow spaces now and facility rooms/devices/streams during onboarding.
              Read-only data sync stays separate from write/control actions.
            </Text>
            <Text style={styles.meta}>
              Permission: read-only / Detected rooms: {growlinkPreviewTotals.rooms} /
              Detected devices: {growlinkPreviewTotals.devices} / Detected streams:{" "}
              {growlinkPreviewTotals.streams || "manual mapping needed"}
            </Text>
            {growlinkImportPreview.map((room) => (
              <View
                key={`${room.controllerName}-${room.name}`}
                style={styles.previewRoom}
              >
                <Text style={styles.previewTitle}>Suggested room: {room.name}</Text>
                <Text style={styles.meta}>
                  Type: {room.type} / Controller: {room.controllerName}
                </Text>
                <Text style={styles.meta}>Devices: {room.devices.join(", ")}</Text>
                <Text style={styles.meta}>
                  Streams:{" "}
                  {room.metrics.length
                    ? room.metrics.join(", ")
                    : "manual mapping needed"}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {growlinkSources.length || loadingGrowlinkSources ? (
          <View style={styles.sourceList}>
            <View style={styles.row}>
              <Text style={styles.sourceListTitle}>Existing Growlink sources</Text>
              {loadingGrowlinkSources ? <ActivityIndicator size="small" /> : null}
            </View>
            <View style={styles.historyWindow}>
              <TextInput
                style={[styles.input, styles.historyInput]}
                value={growlinkHistoryStartIso}
                onChangeText={setGrowlinkHistoryStartIso}
                placeholder="History start ISO"
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, styles.historyInput]}
                value={growlinkHistoryEndIso}
                onChangeText={setGrowlinkHistoryEndIso}
                placeholder="History end ISO"
                autoCapitalize="none"
              />
            </View>
            {growlinkSources.map((source) => (
              <View key={source.id} style={styles.sourceRow}>
                <View style={styles.titleBlock}>
                  <Text style={styles.sourceName}>{source.name}</Text>
                  <Text style={styles.meta}>
                    {source.config?.growlink?.controllerId || "Controller configured"}
                  </Text>
                </View>
                <Pressable
                  style={[styles.button, growlinkBusy ? styles.disabledButton : null]}
                  onPress={() => pullGrowlinkNow(source)}
                  disabled={growlinkBusy}
                >
                  <Text style={styles.buttonText}>Pull now</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, growlinkBusy ? styles.disabledButton : null]}
                  onPress={() => pullGrowlinkHistory(source)}
                  disabled={growlinkBusy}
                >
                  <Text style={styles.buttonText}>Pull history</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <PersonalFeedPlacement
        placement="middle"
        routeKey="personal_tools_integrations"
        longContent
      />

      {providers.map((provider) => {
        const connection = byProvider.get(provider.id);
        return (
          <Pressable
            key={provider.id}
            style={styles.provider}
            onPress={() => {
              setSelected(provider);
              setRequestDraft("");
            }}
          >
            <View style={styles.row}>
              <Text style={styles.providerName}>{provider.name}</Text>
              <Text style={styles.status}>
                {connection?.status || provider.contractStatus}
              </Text>
            </View>
            <Text style={styles.meta}>{provider.capabilities.join(" / ")}</Text>
            <View style={styles.actions}>
              {connection && provider.contractStatus === "implemented" ? (
                <Pressable
                  style={styles.button}
                  onPress={() => testConnection(connection)}
                  disabled={busy}
                >
                  <Text style={styles.buttonText}>Test</Text>
                </Pressable>
              ) : null}
              {provider.contractStatus !== "implemented" ? (
                <Pressable
                  style={styles.button}
                  onPress={() => prepareAccessRequest(provider)}
                  disabled={busy}
                >
                  <Text style={styles.buttonText}>Request access</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        );
      })}

      {selected ? (
        <View style={styles.editor}>
          <Text style={styles.editorTitle}>{selected.name}</Text>
          <TextInput
            style={styles.input}
            value={secret}
            onChangeText={setSecret}
            placeholder="API key or access token"
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="Base URL or local host (optional)"
            autoCapitalize="none"
          />
          <Pressable
            style={styles.primaryButton}
            onPress={saveConnection}
            disabled={busy}
          >
            <Text style={styles.primaryText}>
              {busy ? "Working..." : "Save encrypted connection"}
            </Text>
          </Pressable>
          {requestDraft ? (
            <Text selectable style={styles.requestDraft}>
              {requestDraft}
            </Text>
          ) : null}
        </View>
      ) : null}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_tools_integrations"
        longContent
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 16, paddingBottom: 40, backgroundColor: "#FFFFFF" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#475569", marginBottom: 16 },
  provider: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  providerName: { flex: 1, fontSize: 16, fontWeight: "700" },
  status: { color: "#166534", fontSize: 12, textTransform: "uppercase" },
  meta: { color: "#64748B", marginTop: 6 },
  titleBlock: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  growlinkPanel: {
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#F8FAFC"
  },
  readOnlyBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    color: "#166534",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  button: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  buttonText: { fontWeight: "700" },
  disabledButton: { opacity: 0.6 },
  notice: {
    backgroundColor: "#ECFDF5",
    borderColor: "#BBF7D0",
    borderRadius: 6,
    borderWidth: 1,
    color: "#166534",
    marginTop: 12,
    padding: 10
  },
  controllerList: { gap: 8, marginTop: 12 },
  controllerOption: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#FFFFFF"
  },
  controllerSelected: { borderColor: "#166534", backgroundColor: "#F0FDF4" },
  controllerName: { fontWeight: "700" },
  sourceList: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 14,
    paddingTop: 12
  },
  sourceListTitle: { fontWeight: "700" },
  importPreview: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
    padding: 10
  },
  previewRoom: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DBEAFE",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  previewTitle: { color: "#0F172A", fontWeight: "900" },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 10
  },
  historyWindow: { flexDirection: "row", gap: 8, marginTop: 10 },
  historyInput: { flex: 1, marginBottom: 0 },
  sourceName: { fontWeight: "700" },
  editor: { borderTopWidth: 1, borderTopColor: "#E2E8F0", marginTop: 12, paddingTop: 16 },
  editorTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10
  },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: 6,
    padding: 12,
    alignItems: "center"
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700" },
  requestDraft: {
    backgroundColor: "#F8FAFC",
    color: "#334155",
    padding: 12,
    marginTop: 12
  }
});
