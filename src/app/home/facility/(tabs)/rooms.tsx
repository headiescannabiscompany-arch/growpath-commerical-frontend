import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  createBatchCycle,
  createEquipment,
  deleteBatchCycle,
  listBatchCycles,
  listEquipment,
  type BatchCycle,
  type EquipmentItem
} from "@/api/facilityWorkflows";
import { createRoom, deleteRoom, fetchRooms, updateRoom, type Room } from "@/api/rooms";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import FacilityContextualTools from "@/components/facility/FacilityContextualTools";
import { useEntitlements } from "@/entitlements";
import { getFacilityRoomAccess } from "@/features/facility/roomAccess";
import { useApiErrorHandler, type UiErrorState } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

function rowId(row: any) {
  return String(row?._id || row?.id || "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const TRACKING_MODES = ["batch", "individual"] as const;
const ROOM_TYPES = [
  { value: "greenhouse", label: "Greenhouse" },
  { value: "flower", label: "Flower" },
  { value: "veg", label: "Veg" },
  { value: "clone", label: "Clone" },
  { value: "mother", label: "Mother" },
  { value: "dry", label: "Dry" },
  { value: "cure", label: "Cure" },
  { value: "seedling", label: "Seedling" },
  { value: "other", label: "Other" }
] as const;
const CYCLE_STAGES = ["clone", "veg", "flower", "dry", "cure", "complete"] as const;
const CYCLE_STATUSES = ["planned", "active", "paused", "complete"] as const;

function normalizedCycleStatus(cycle: BatchCycle) {
  return String(cycle.status || "active").toLowerCase();
}

function isActiveCycle(cycle: BatchCycle) {
  const status = normalizedCycleStatus(cycle);
  return status !== "complete" && status !== "cancelled";
}

function inferRoomType(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("flower")) return "flower";
  if (lower.includes("veg")) return "veg";
  if (lower.includes("clone")) return "clone";
  if (lower.includes("mother")) return "mother";
  if (lower.includes("dry")) return "dry";
  if (lower.includes("cure")) return "cure";
  if (lower.includes("seed")) return "seedling";
  if (lower.includes("greenhouse")) return "greenhouse";
  return "other";
}

function inferRoomName(raw: string) {
  return raw
    .replace(
      /\b(pulse|trolmaster|hydro\s*[- ]?\s*x\s*pro|hydro\s*[- ]?\s*x|growlink|aroya|sensorpush|ubibot|aranet|meter|zentra|hobolink|hobo|monnit)\b/gi,
      ""
    )
    .replace(/\b(temp|temperature|rh|humidity|co2|vpd|sensor|probe)\b/gi, "")
    .replace(
      /\b(dew|point|ppfd|dli|substrate|soil|media|root|moisture|ec|ph|irrigation|watering|alarm|alert|pump|valve|reservoir|offline|fault)\b/gi,
      ""
    )
    .replace(/\b(high|low)\b/gi, "")
    .replace(/\b(controller|module|device|channel|monitor|light|fan|exhaust)\b/gi, "")
    .replace(/[-_:/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferDeviceMetrics(raw: string) {
  const lower = raw.toLowerCase();
  const hasHigh = /\bhigh\b/.test(lower);
  const hasLow = /\blow\b/.test(lower);
  const hasTemp = /\b(temp|temperature)\b/.test(lower);
  const hasHumidity = /\b(humidity|rh)\b/.test(lower);

  return [
    (lower.includes("temp") || lower.includes("temperature")) && "air_temperature",
    (lower.includes("rh") || lower.includes("humidity")) && "relative_humidity",
    (lower.includes("dew") || lower.includes("dewpoint")) && "dew_point",
    lower.includes("co2") && "co2",
    lower.includes("vpd") && "vpd",
    lower.includes("ppfd") && "ppfd",
    lower.includes("dli") && "dli",
    lower.includes("light") && "light_status",
    (lower.includes("substrate temp") || lower.includes("root temp")) &&
      "substrate_temperature",
    (lower.includes("substrate moisture") ||
      lower.includes("soil moisture") ||
      lower.includes("water content")) &&
      "substrate_moisture",
    (lower.includes("substrate ec") ||
      lower.includes("pore ec") ||
      lower.includes("media ec")) &&
      "substrate_ec",
    (lower.includes("substrate ph") || lower.includes("media ph")) && "substrate_ph",
    (lower.includes("irrigation") || lower.includes("watering")) && "irrigation_event",
    lower.includes("reservoir ph") && "reservoir_ph",
    lower.includes("reservoir ec") && "reservoir_ec",
    lower.includes("reservoir") && hasTemp && "reservoir_temperature",
    lower.includes("pump") && "pump_status",
    lower.includes("valve") && "valve_status",
    hasHigh && hasTemp && "high_temp_alarm",
    hasLow && hasTemp && "low_temp_alarm",
    hasHigh && hasHumidity && "high_humidity_alarm",
    hasLow && hasHumidity && "low_humidity_alarm",
    lower.includes("co2") &&
      (lower.includes("alarm") || lower.includes("alert")) &&
      "co2_alarm",
    lower.includes("leak") && "leak_alarm",
    (lower.includes("alarm") || lower.includes("alert")) && "sensor_alarm",
    lower.includes("fault") && "sensor_fault",
    lower.includes("offline") && "device_offline"
  ].filter(Boolean) as string[];
}

function suggestedAlertRules(metrics: string[], roomType: string) {
  return metrics.flatMap((metric) => {
    if (metric === "high_humidity_alarm") {
      return [
        {
          metric,
          severity: "critical",
          action: "inspect_room",
          suggestedTaskTitle: `Inspect ${roomType || "room"} for high humidity risk`
        }
      ];
    }
    if (metric === "high_temp_alarm" || metric === "low_temp_alarm") {
      return [
        {
          metric,
          severity: "urgent",
          action: "check_environment",
          suggestedTaskTitle: `Check ${roomType || "room"} temperature alarm`
        }
      ];
    }
    if (metric === "device_offline" || metric === "sensor_fault") {
      return [
        {
          metric,
          severity: "warning",
          action: "check_device",
          suggestedTaskTitle: `Check ${roomType || "room"} sensor connection`
        }
      ];
    }
    if (metric === "leak_alarm") {
      return [
        {
          metric,
          severity: "critical",
          action: "inspect_room",
          suggestedTaskTitle: `Inspect ${roomType || "room"} for leak alarm`
        }
      ];
    }
    return [];
  });
}

function suggestedAutomationRules(metrics: string[], roomName: string, roomType: string) {
  const metricSet = new Set(metrics);
  const base = {
    roomName,
    roomType,
    source: "facility_room_import_preview"
  };
  const rules = [];

  if (metricSet.has("air_temperature") && metricSet.has("relative_humidity")) {
    rules.push(
      {
        ...base,
        ruleType: "tool_suggestion",
        toolType: "vpd_dew_point_guard",
        requiredMetrics: ["air_temperature", "relative_humidity"],
        action: "Use imported room readings in VPD and Dew Point Guard."
      },
      {
        ...base,
        ruleType: "alert_suggestion",
        triggerMetric: "relative_humidity",
        action: "Create high-humidity and dew-point-risk room checks after lights out."
      }
    );
  }

  if (metricSet.has("substrate_moisture") || metricSet.has("substrate_ec")) {
    rules.push({
      ...base,
      ruleType: "tool_suggestion",
      toolType: "crop_steering_dryback_review",
      requiredMetrics: ["substrate_moisture", "substrate_ec"].filter((metric) =>
        metricSet.has(metric)
      ),
      action: "Use imported root-zone readings for dryback and crop-steering review."
    });
  }

  if (metricSet.has("irrigation_event")) {
    rules.push({
      ...base,
      ruleType: "task_suggestion",
      triggerMetric: "irrigation_event",
      action: "Create follow-up facility tasks from irrigation events."
    });
  }

  return rules;
}

function buildRoomImportPreview(rawText: string) {
  const rooms = new Map<
    string,
    {
      name: string;
      roomType: string;
      devices: Array<{ name: string; metrics: string[] }>;
      metrics: string[];
    }
  >();

  rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const name = inferRoomName(line) || line;
      const key = name.toLowerCase();
      const existing = rooms.get(key) || {
        name,
        roomType: inferRoomType(name),
        devices: [],
        metrics: []
      };
      const metrics = inferDeviceMetrics(line);
      if (!existing.devices.some((device) => device.name === line)) {
        existing.devices.push({ name: line, metrics });
      }
      existing.metrics = Array.from(new Set([...existing.metrics, ...metrics]));
      rooms.set(key, existing);
    });

  return Array.from(rooms.values());
}

export default function FacilityRoomsTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    roomId?: string;
    importDevices?: string;
    importProvider?: string;
  }>();
  const ent = useEntitlements();
  const { selectedId: facilityId } = useFacility();
  const routeRoomId = String(params.roomId || "");

  const apiErrorMapper = useApiErrorHandler();
  const [error, setError] = useState<UiErrorState | null>(null);
  const clearError = useCallback(() => setError(null), []);
  const handleApiError = useCallback(
    (err: any) => {
      setError(
        apiErrorMapper.toInlineError(err) || {
          title: "Room action failed",
          message:
            err?.message ||
            "Unable to update rooms. Check your facility role and try again.",
          code: err?.code,
          requestId: err?.requestId ?? null
        }
      );
    },
    [apiErrorMapper]
  );

  const [rooms, setRooms] = useState<Room[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [cycles, setCycles] = useState<BatchCycle[]>([]);
  const [activeRoomId, setActiveRoomId] = useState(routeRoomId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] =
    useState<(typeof ROOM_TYPES)[number]["value"]>("greenhouse");
  const [roomTrackingMode, setRoomTrackingMode] =
    useState<(typeof TRACKING_MODES)[number]>("batch");
  const [roomZoneName, setRoomZoneName] = useState("");
  const [roomStage, setRoomStage] = useState("");

  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentType, setEquipmentType] = useState("light");

  const [cycleName, setCycleName] = useState("");
  const [cycleStage, setCycleStage] = useState("flower");
  const [cycleStatus, setCycleStatus] = useState("active");
  const [estimatedPlantCount, setEstimatedPlantCount] = useState("");
  const [importProvider, setImportProvider] = useState("TrolMaster / Pulse");
  const [importDeviceText, setImportDeviceText] = useState("");

  const roomAccess = getFacilityRoomAccess({
    can: ent?.can,
    facilityRole: ent?.facilityRole
  });
  const canEditRooms = roomAccess.canCreateRooms;
  const canManageEquipmentCycles = roomAccess.canManageEquipmentCycles;
  const canDeleteRooms = roomAccess.canDeleteRooms;

  const activeRoom = rooms.find((room) => rowId(room) === activeRoomId) || null;
  const roomEquipment = equipment.filter(
    (item) => !activeRoomId || String(item.roomId || "") === activeRoomId
  );
  const roomCycles = cycles.filter(
    (cycle) => !activeRoomId || String(cycle.roomId || "") === activeRoomId
  );
  const activeCycles = roomCycles.filter(isActiveCycle).length;
  const completedCycles = roomCycles.filter(
    (cycle) => normalizedCycleStatus(cycle) === "complete"
  ).length;
  const estimatedPlants = roomCycles.reduce(
    (sum, cycle) => sum + Number(cycle.estimatedPlantCount || 0),
    0
  );
  const roomImportPreview = useMemo(
    () => buildRoomImportPreview(importDeviceText),
    [importDeviceText]
  );

  useEffect(() => {
    const deviceNames = Array.isArray(params.importDevices)
      ? params.importDevices[0]
      : params.importDevices;
    const provider = Array.isArray(params.importProvider)
      ? params.importProvider[0]
      : params.importProvider;
    if (deviceNames) setImportDeviceText(String(deviceNames));
    if (provider) setImportProvider(String(provider));
  }, [params.importDevices, params.importProvider]);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      try {
        clearError();
        const [roomResult, equipmentResult, cycleResult] = await Promise.allSettled([
          fetchRooms(facilityId),
          listEquipment(facilityId),
          listBatchCycles(facilityId)
        ]);
        if (roomResult.status === "rejected") throw roomResult.reason;
        const roomRows = roomResult.value;
        const equipmentRows =
          equipmentResult.status === "fulfilled" ? equipmentResult.value : [];
        const cycleRows = cycleResult.status === "fulfilled" ? cycleResult.value : [];
        setRooms(roomRows);
        setEquipment(equipmentRows);
        setCycles(cycleRows);
        const nextActive =
          activeRoomId && roomRows.some((room) => rowId(room) === activeRoomId)
            ? activeRoomId
            : routeRoomId && roomRows.some((room) => rowId(room) === routeRoomId)
              ? routeRoomId
              : rowId(roomRows[0]);
        setActiveRoomId(nextActive);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeRoomId, facilityId, routeRoomId, clearError, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  useEffect(() => {
    if (!activeRoom) return;
    setRoomTrackingMode(
      activeRoom.trackingMode === "individual" ? "individual" : "batch"
    );
  }, [activeRoom]);

  useEffect(() => {
    if (!routeRoomId || activeRoomId === routeRoomId) return;
    if (rooms.some((room) => rowId(room) === routeRoomId)) {
      setActiveRoomId(routeRoomId);
    }
  }, [activeRoomId, rooms, routeRoomId]);

  async function addRoom() {
    if (!facilityId || !canEditRooms || !roomName.trim()) return;
    setSaving(true);
    setFeedback("");
    clearError();
    try {
      await createRoom(facilityId, {
        name: roomName.trim(),
        roomType: roomType.trim() || undefined,
        trackingMode: roomTrackingMode,
        zoneName: roomZoneName.trim() || undefined,
        stage: roomStage.trim() || undefined
      });
      setRoomName("");
      setRoomZoneName("");
      setRoomStage("");
      setFeedback("Room created.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function createImportedRooms() {
    if (!facilityId || !canEditRooms || !roomImportPreview.length) return;
    setSaving(true);
    setFeedback("");
    clearError();
    try {
      const existingRoomsByName = new Map(
        rooms.map((room) => [
          String(room.name || "")
            .trim()
            .toLowerCase(),
          room
        ])
      );
      const existingEquipmentKeys = new Set(
        equipment.map((item) =>
          [
            String(item.roomId || ""),
            String(item.name || "")
              .trim()
              .toLowerCase()
          ].join("::")
        )
      );
      let createdRoomCount = 0;
      let createdDeviceCount = 0;

      for (const room of roomImportPreview) {
        const roomKey = room.name.trim().toLowerCase();
        let savedRoom = existingRoomsByName.get(roomKey);
        if (!savedRoom) {
          savedRoom = await createRoom(facilityId, {
            name: room.name,
            roomType: room.roomType,
            trackingMode: "batch"
          });
          existingRoomsByName.set(roomKey, savedRoom);
          createdRoomCount += 1;
        }

        const savedRoomId = rowId(savedRoom);
        if (savedRoomId && canManageEquipmentCycles) {
          for (const device of room.devices) {
            const deviceName = String(device.name || "").trim();
            const equipmentKey = `${savedRoomId}::${deviceName.toLowerCase()}`;
            if (!deviceName || existingEquipmentKeys.has(equipmentKey)) continue;
            await createEquipment(facilityId, {
              name: deviceName,
              type: "sensor",
              roomId: savedRoomId,
              status: "active",
              provider: importProvider.trim() || undefined,
              metrics: device.metrics,
              integrationMapping: {
                source: "facility_room_import_preview",
                provider: importProvider.trim() || undefined,
                permissionLevel: "read-only",
                normalizedMetrics: device.metrics,
                suggestedAlertRules: suggestedAlertRules(device.metrics, room.roomType),
                suggestedAutomationRules: suggestedAutomationRules(
                  device.metrics,
                  room.name,
                  room.roomType
                ),
                sensorStreams: device.metrics.map((metric) => ({
                  providerMetricKey: metric,
                  normalizedMetric: metric,
                  suggestedRoomName: room.name,
                  suggestedDeviceName: deviceName
                })),
                rawDeviceName: deviceName,
                suggestedRoomName: room.name,
                suggestedRoomType: room.roomType
              }
            });
            existingEquipmentKeys.add(equipmentKey);
            createdDeviceCount += 1;
          }
        }
      }
      setFeedback(
        createdRoomCount || createdDeviceCount
          ? `Created ${createdRoomCount} room${createdRoomCount === 1 ? "" : "s"} and ${createdDeviceCount} device${createdDeviceCount === 1 ? "" : "s"} from ${importProvider}.`
          : "All imported rooms and devices already exist."
      );
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function saveTrackingMode(mode: "batch" | "individual") {
    if (!facilityId || !activeRoomId || !canEditRooms) return;
    setSaving(true);
    setFeedback("");
    clearError();
    try {
      await updateRoom(facilityId, activeRoomId, { trackingMode: mode });
      setRoomTrackingMode(mode);
      setFeedback("Tracking mode updated.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function removeRoom() {
    if (!facilityId || !activeRoomId || !canDeleteRooms) return;
    setSaving(true);
    setFeedback("");
    clearError();
    try {
      await deleteRoom(facilityId, activeRoomId);
      setFeedback("Room deleted.");
      setActiveRoomId("");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function addEquipment() {
    if (
      !facilityId ||
      !activeRoomId ||
      !canManageEquipmentCycles ||
      !equipmentName.trim()
    )
      return;
    setSaving(true);
    setFeedback("");
    clearError();
    try {
      await createEquipment(facilityId, {
        name: equipmentName.trim(),
        type: equipmentType.trim() || undefined,
        roomId: activeRoomId,
        status: "active"
      });
      setEquipmentName("");
      setFeedback("Equipment added.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function addCycle() {
    if (!facilityId || !activeRoomId || !canManageEquipmentCycles || !cycleName.trim())
      return;
    setSaving(true);
    setFeedback("");
    clearError();
    try {
      await createBatchCycle(facilityId, {
        name: cycleName.trim(),
        roomId: activeRoomId,
        stage: cycleStage.trim() || undefined,
        status: cycleStatus.trim() || "active",
        estimatedPlantCount: estimatedPlantCount
          ? Number(estimatedPlantCount)
          : undefined,
        startedAt: today()
      });
      setCycleName("");
      setEstimatedPlantCount("");
      setFeedback("Batch cycle created.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function removeCycle(id: string) {
    if (!facilityId || !id || !canManageEquipmentCycles) return;
    setSaving(true);
    setFeedback("");
    clearError();
    try {
      await deleteBatchCycle(facilityId, id);
      setFeedback("Batch cycle deleted.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenBoundary title="Rooms">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Rooms</Text>
            <Text style={styles.muted}>
              {rooms.length} rooms | {equipment.length} equipment | {cycles.length} cycles
            </Text>
          </View>
          {loading ? <ActivityIndicator /> : null}
        </View>

        <FacilityContextualTools
          title="Facility environment tools"
          tools={["ask-ai", "environment", "diagnose", "reports"]}
          source="facility-rooms"
          facilityId={facilityId ?? undefined}
          prompt="Review facility rooms, equipment, and environment readings for risks and next actions."
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Facility rooms</Text>
          <Text style={styles.muted}>
            Open a room to continue through its grows, plants, work, and environment.
          </Text>
          {rooms.length ? (
            rooms.map((room) => {
              const id = rowId(room);
              const linkedEquipment = equipment.filter(
                (item) => String(item.roomId ?? "") === id
              ).length;
              const linkedCycles = cycles.filter(
                (item) => String(item.roomId ?? "") === id
              );
              return (
                <Pressable
                  key={id || room.name}
                  onPress={() => {
                    setActiveRoomId(id);
                    router.push({
                      pathname: "/home/facility/grows",
                      params: { roomId: id, roomName: room.name || "Room" }
                    });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${room.name || "room"}`}
                  style={styles.row}
                >
                  <Text style={styles.rowTitle}>{room.name || "Room"}</Text>
                  <Text style={styles.rowMeta}>
                    {[
                      room.roomType || "room",
                      room.stage || "no active stage",
                      `${linkedCycles.length} grows`,
                      `${linkedEquipment} connected devices`
                    ].join(" | ")}
                  </Text>
                  <Text style={styles.rowMeta}>Open room workspace {">"}</Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.muted}>
              No rooms were returned for this facility. Refresh or verify the selected
              facility and integration mapping.
            </Text>
          )}
        </View>

        {canEditRooms ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Controller Room Import Preview</Text>
            <Text style={styles.muted}>
              Paste detected controller, hub, module, or sensor names from Pulse,
              TrolMaster, Growlink, AROYA, SensorPush, or similar providers. GrowPath
              suggests rooms first so the facility can start from imported structure
              instead of a blank setup.
            </Text>
            <TextInput
              value={importProvider}
              onChangeText={setImportProvider}
              style={styles.input}
              accessibilityLabel="Facility import provider"
              placeholder="Provider, e.g. TrolMaster, Pulse, Growlink"
            />
            <TextInput
              value={importDeviceText}
              onChangeText={setImportDeviceText}
              style={[styles.input, styles.textArea]}
              accessibilityLabel="Facility import device list"
              multiline
              placeholder={"Flower Room 1 Temp/RH\nFlower Room 1 CO2\nVeg Room Temp/RH"}
            />
            {roomImportPreview.length ? (
              <View style={styles.importPreviewList}>
                {roomImportPreview.map((room) => (
                  <View key={room.name} style={styles.importPreviewRow}>
                    <Text style={styles.rowTitle}>{room.name}</Text>
                    <Text style={styles.rowMeta}>
                      {room.roomType} | {room.devices.length} device
                      {room.devices.length === 1 ? "" : "s"}
                    </Text>
                    {room.metrics.length ? (
                      <Text style={styles.rowMeta}>
                        Metrics: {room.metrics.join(", ")}
                      </Text>
                    ) : (
                      <Text style={styles.rowMeta}>Metrics need manual mapping</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable
              onPress={createImportedRooms}
              disabled={saving || !canEditRooms || !roomImportPreview.length}
              accessibilityRole="button"
              accessibilityLabel="Create imported facility rooms"
              style={[
                styles.primaryBtn,
                (saving || !canEditRooms || !roomImportPreview.length) && styles.disabled
              ]}
            >
              <Text style={styles.primaryText}>
                {saving ? "Creating..." : "Create Previewed Rooms"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Room</Text>
          {!canEditRooms ? (
            <Text style={styles.muted}>{roomAccess.hiddenRoomReason}</Text>
          ) : (
            <View style={styles.form}>
              <TextInput
                value={roomName}
                onChangeText={setRoomName}
                style={styles.input}
                accessibilityLabel="New room name"
                placeholder="Room name"
              />
              <TextInput
                value={roomZoneName}
                onChangeText={setRoomZoneName}
                style={styles.input}
                accessibilityLabel="New room zone or area"
                placeholder="Zone or area, optional"
              />
              <View style={styles.pillRow}>
                {ROOM_TYPES.map((type) => (
                  <Pressable
                    key={type.value}
                    onPress={() => setRoomType(type.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set new room type to ${type.label}`}
                    style={[styles.pill, roomType === type.value && styles.pillSelected]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        roomType === type.value && styles.pillTextSelected
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.pillRow}>
                {CYCLE_STAGES.filter((stage) => stage !== "complete").map((stage) => (
                  <Pressable
                    key={stage}
                    onPress={() => setRoomStage(roomStage === stage ? "" : stage)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set new room stage to ${stage}`}
                    style={[styles.pill, roomStage === stage && styles.pillSelected]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        roomStage === stage && styles.pillTextSelected
                      ]}
                    >
                      {stage}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.pillRow}>
                {TRACKING_MODES.map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => setRoomTrackingMode(mode)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set new room tracking mode to ${mode}`}
                    style={[
                      styles.pill,
                      roomTrackingMode === mode && styles.pillSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        roomTrackingMode === mode && styles.pillTextSelected
                      ]}
                    >
                      {mode}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={addRoom}
                disabled={saving || !roomName.trim()}
                accessibilityRole="button"
                accessibilityLabel="Create Room"
                style={[
                  styles.primaryBtn,
                  (saving || !roomName.trim()) && styles.disabled
                ]}
              >
                <Text style={styles.primaryText}>
                  {saving ? "Saving..." : "Create Room"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Room Workspace</Text>
          {rooms.length ? (
            <View style={styles.pillRow}>
              {rooms.map((room) => {
                const id = rowId(room);
                const selected = id === activeRoomId;
                return (
                  <Pressable
                    key={id || room.name}
                    onPress={() => setActiveRoomId(id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select room ${room.name || "Room"}`}
                    style={[styles.pill, selected && styles.pillSelected]}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                      {room.name || "Room"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.muted}>No rooms yet.</Text>
          )}

          {activeRoom ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailTitle}>{activeRoom.name}</Text>
              <Text style={styles.muted}>
                Type: {activeRoom.roomType || "n/a"} | Tracking:{" "}
                {activeRoom.trackingMode || "batch"}
                {activeRoom.zoneName ? ` | Zone: ${activeRoom.zoneName}` : ""}
                {activeRoom.stage ? ` | Stage: ${activeRoom.stage}` : ""}
              </Text>
              <View style={styles.pillRow}>
                {TRACKING_MODES.map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => saveTrackingMode(mode)}
                    disabled={!canEditRooms || saving}
                    accessibilityRole="button"
                    accessibilityLabel={`Set room tracking mode to ${mode}`}
                    style={[
                      styles.pill,
                      (activeRoom.trackingMode || "batch") === mode && styles.pillSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        (activeRoom.trackingMode || "batch") === mode &&
                          styles.pillTextSelected
                      ]}
                    >
                      {mode}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {canDeleteRooms ? (
                <Pressable
                  onPress={removeRoom}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="Delete Room"
                  style={[styles.dangerBtn, saving && styles.disabled]}
                >
                  <Text style={styles.dangerText}>Delete Room</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {activeRoom ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Equipment</Text>
              {canManageEquipmentCycles ? (
                <View style={styles.form}>
                  <TextInput
                    value={equipmentName}
                    onChangeText={setEquipmentName}
                    style={styles.input}
                    accessibilityLabel="Equipment name"
                    placeholder="Equipment name"
                  />
                  <TextInput
                    value={equipmentType}
                    onChangeText={setEquipmentType}
                    style={styles.input}
                    accessibilityLabel="Equipment type"
                    placeholder="Equipment type"
                  />
                  <Pressable
                    onPress={addEquipment}
                    disabled={saving || !equipmentName.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Add Equipment"
                    style={[
                      styles.primaryBtn,
                      (saving || !equipmentName.trim()) && styles.disabled
                    ]}
                  >
                    <Text style={styles.primaryText}>Add Equipment</Text>
                  </Pressable>
                </View>
              ) : null}
              {roomEquipment.length ? (
                roomEquipment.map((item) => (
                  <View key={rowId(item) || item.name} style={styles.row}>
                    <Text style={styles.rowTitle}>{item.name || "Equipment"}</Text>
                    <Text style={styles.rowMeta}>
                      {[
                        item.type || "type n/a",
                        item.status || "status n/a",
                        item.provider && `provider ${item.provider}`,
                        Array.isArray((item as any).metrics) &&
                          (item as any).metrics.length &&
                          `metrics ${(item as any).metrics.join(", ")}`
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No equipment linked to this room.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Batch Cycles</Text>
              <View style={styles.summaryCard}>
                <View>
                  <Text style={styles.summaryValue}>{activeCycles}</Text>
                  <Text style={styles.summaryLabel}>active cycles</Text>
                </View>
                <View>
                  <Text style={styles.summaryValue}>{completedCycles}</Text>
                  <Text style={styles.summaryLabel}>complete cycles</Text>
                </View>
                <View>
                  <Text style={styles.summaryValue}>{estimatedPlants}</Text>
                  <Text style={styles.summaryLabel}>estimated plants</Text>
                </View>
              </View>
              {canManageEquipmentCycles ? (
                <View style={styles.form}>
                  <TextInput
                    value={cycleName}
                    onChangeText={setCycleName}
                    style={styles.input}
                    accessibilityLabel="Batch cycle name"
                    placeholder="Cycle name"
                  />
                  <TextInput
                    value={cycleStage}
                    onChangeText={setCycleStage}
                    style={styles.input}
                    accessibilityLabel="Batch cycle stage"
                    placeholder="Stage"
                  />
                  <View style={styles.pillRow}>
                    {CYCLE_STAGES.map((stage) => (
                      <Pressable
                        key={stage}
                        onPress={() => setCycleStage(stage)}
                        accessibilityRole="button"
                        accessibilityLabel={`Set batch cycle stage to ${stage}`}
                        style={[styles.pill, cycleStage === stage && styles.pillSelected]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            cycleStage === stage && styles.pillTextSelected
                          ]}
                        >
                          {stage}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.pillRow}>
                    {CYCLE_STATUSES.map((status) => (
                      <Pressable
                        key={status}
                        onPress={() => setCycleStatus(status)}
                        accessibilityRole="button"
                        accessibilityLabel={`Set batch cycle status to ${status}`}
                        style={[
                          styles.pill,
                          cycleStatus === status && styles.pillSelected
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            cycleStatus === status && styles.pillTextSelected
                          ]}
                        >
                          {status}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    value={estimatedPlantCount}
                    onChangeText={setEstimatedPlantCount}
                    style={styles.input}
                    accessibilityLabel="Batch cycle estimated plant count"
                    placeholder="Estimated plant count"
                    keyboardType="numeric"
                  />
                  <Pressable
                    onPress={addCycle}
                    disabled={saving || !cycleName.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Create Batch Cycle"
                    style={[
                      styles.primaryBtn,
                      (saving || !cycleName.trim()) && styles.disabled
                    ]}
                  >
                    <Text style={styles.primaryText}>Create Batch Cycle</Text>
                  </Pressable>
                </View>
              ) : null}
              {roomCycles.length ? (
                roomCycles.map((cycle) => {
                  const id = rowId(cycle);
                  return (
                    <View key={id || cycle.name} style={styles.row}>
                      <Text style={styles.rowTitle}>{cycle.name || "Batch cycle"}</Text>
                      <Text style={styles.rowMeta}>
                        {cycle.stage || "stage n/a"} | {cycle.status || "status n/a"} |{" "}
                        {cycle.estimatedPlantCount ?? 0} plants
                      </Text>
                      <View style={styles.statusLine}>
                        <Text
                          style={[
                            styles.statusPill,
                            isActiveCycle(cycle)
                              ? styles.statusActive
                              : styles.statusComplete
                          ]}
                        >
                          {isActiveCycle(cycle)
                            ? "counts as active inventory"
                            : "completion evidence"}
                        </Text>
                        {cycle.startedAt ? (
                          <Text style={styles.rowMeta}>
                            Started {String(cycle.startedAt).slice(0, 10)}
                          </Text>
                        ) : null}
                      </View>
                      {canManageEquipmentCycles && id ? (
                        <Pressable
                          onPress={() => removeCycle(id)}
                          disabled={saving}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete batch cycle ${cycle.name || id}`}
                          style={styles.inlineDanger}
                        >
                          <Text style={styles.dangerText}>Delete</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.muted}>No batch cycles linked to this room.</Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32, gap: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7, lineHeight: 19 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "white",
    gap: 10
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  form: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "white"
  },
  textArea: { minHeight: 118, textAlignVertical: "top" },
  importPreviewList: { gap: 8, marginTop: 2 },
  importPreviewRow: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 10
  },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryText: { color: "white", fontWeight: "800" },
  dangerBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#B91C1C",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  inlineDanger: { alignSelf: "flex-start", marginTop: 8 },
  dangerText: { color: "#B91C1C", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "white"
  },
  pillSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  pillText: { fontWeight: "800", color: "#0F172A" },
  pillTextSelected: { color: "white" },
  detailBlock: { gap: 8, marginTop: 4 },
  detailTitle: { fontSize: 17, fontWeight: "900" },
  row: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
    paddingTop: 10,
    gap: 3
  },
  rowTitle: { fontWeight: "900" },
  rowMeta: { opacity: 0.7 },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#d1fae5",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#ecfdf5",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16
  },
  summaryValue: { color: "#065f46", fontSize: 20, fontWeight: "900" },
  summaryLabel: { color: "#047857", fontSize: 12, fontWeight: "800" },
  statusLine: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  statusPill: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: "900"
  },
  statusActive: { color: "#92400e", backgroundColor: "#fef3c7" },
  statusComplete: { color: "#065f46", backgroundColor: "#d1fae5" },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    padding: 9,
    fontWeight: "700"
  }
});
