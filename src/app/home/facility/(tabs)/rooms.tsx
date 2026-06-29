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
import { useRouter } from "expo-router";

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
import { useEntitlements } from "@/entitlements";
import { getFacilityRoomAccess } from "@/features/facility/roomAccess";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";

function rowId(row: any) {
  return String(row?._id || row?.id || "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const TRACKING_MODES = ["batch", "individual"] as const;

export default function FacilityRoomsTab() {
  const router = useRouter();
  const ent = useEntitlements();
  const { selectedId: facilityId } = useFacility();

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [rooms, setRooms] = useState<Room[]>([]);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [cycles, setCycles] = useState<BatchCycle[]>([]);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("flower");
  const [roomTrackingMode, setRoomTrackingMode] =
    useState<(typeof TRACKING_MODES)[number]>("batch");

  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentType, setEquipmentType] = useState("light");

  const [cycleName, setCycleName] = useState("");
  const [cycleStage, setCycleStage] = useState("flower");
  const [estimatedPlantCount, setEstimatedPlantCount] = useState("");

  const roomAccess = getFacilityRoomAccess({
    can: ent?.can,
    facilityRole: ent?.facilityRole
  });
  const canWrite = roomAccess.canManageRooms;
  const canRemove = roomAccess.canDeleteRooms;

  const activeRoom = rooms.find((room) => rowId(room) === activeRoomId) || null;
  const roomEquipment = equipment.filter(
    (item) => !activeRoomId || String(item.roomId || "") === activeRoomId
  );
  const roomCycles = cycles.filter(
    (cycle) => !activeRoomId || String(cycle.roomId || "") === activeRoomId
  );

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
            : rowId(roomRows[0]);
        setActiveRoomId(nextActive);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeRoomId, facilityId, clearError, handleApiError]
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

  async function addRoom() {
    if (!facilityId || !canWrite || !roomName.trim()) return;
    setSaving(true);
    setFeedback("");
    try {
      await createRoom(facilityId, {
        name: roomName.trim(),
        roomType: roomType.trim() || undefined,
        trackingMode: roomTrackingMode
      });
      setRoomName("");
      setFeedback("Room created.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function saveTrackingMode(mode: "batch" | "individual") {
    if (!facilityId || !activeRoomId || !canWrite) return;
    setSaving(true);
    setFeedback("");
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
    if (!facilityId || !activeRoomId || !canRemove) return;
    setSaving(true);
    setFeedback("");
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
    if (!facilityId || !activeRoomId || !canWrite || !equipmentName.trim()) return;
    setSaving(true);
    setFeedback("");
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
    if (!facilityId || !activeRoomId || !canWrite || !cycleName.trim()) return;
    setSaving(true);
    setFeedback("");
    try {
      await createBatchCycle(facilityId, {
        name: cycleName.trim(),
        roomId: activeRoomId,
        stage: cycleStage.trim() || undefined,
        status: "active",
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
    if (!facilityId || !id || !canRemove) return;
    setSaving(true);
    setFeedback("");
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Room</Text>
          {!canWrite ? (
            <Text style={styles.muted}>{roomAccess.hiddenManageReason}</Text>
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
                value={roomType}
                onChangeText={setRoomType}
                style={styles.input}
                accessibilityLabel="New room type"
                placeholder="Room type"
              />
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
              </Text>
              <View style={styles.pillRow}>
                {TRACKING_MODES.map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => saveTrackingMode(mode)}
                    disabled={!canWrite || saving}
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
              {canRemove ? (
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
              {canWrite ? (
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
                      {item.type || "type n/a"} | {item.status || "status n/a"}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No equipment linked to this room.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Batch Cycles</Text>
              {canWrite ? (
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
                      {canRemove && id ? (
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
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    gap: 10
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  form: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white"
  },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryText: { color: "white", fontWeight: "800" },
  dangerBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#B91C1C",
    borderRadius: 10,
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
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 9,
    padding: 9,
    fontWeight: "700"
  }
});
