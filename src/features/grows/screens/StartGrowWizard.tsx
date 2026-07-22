import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { radius } from "@/theme/theme";
import { useRooms } from "../../rooms/hooks";
import { useCreateGrow } from "../hooks";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function roomId(room: any) {
  return String(room?.id || room?._id || room?.roomId || "");
}

export function facilityRoomGrowsHref(id: string, name: string) {
  const params = new URLSearchParams({ roomId: id, roomName: name });
  return `/home/facility/grows?${params.toString()}`;
}

export default function StartGrowWizard() {
  const { roomId: requestedRoomId, roomName: requestedRoomName } = useLocalSearchParams<{
    roomId?: string;
    roomName?: string;
  }>();
  const [name, setName] = useState("Batch Cycle 1");
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const { data: rooms, isLoading } = useRooms();
  const createGrow = useCreateGrow();
  const router = useRouter();
  const selectionInitialized = useRef(false);

  const validRooms = useMemo(
    () => (rooms || []).filter((room: any) => roomId(room)),
    [rooms]
  );
  const requestedRoom = useMemo(
    () => validRooms.find((room: any) => roomId(room) === String(requestedRoomId || "")),
    [requestedRoomId, validRooms]
  );
  const requestedRoomLabel = String(
    requestedRoom?.name || requestedRoomName || "this room"
  );

  useEffect(() => {
    if (!validRooms.length || selectionInitialized.current) return;
    selectionInitialized.current = true;
    setSelectedRooms(
      requestedRoomId
        ? requestedRoom
          ? [roomId(requestedRoom)]
          : []
        : validRooms.map(roomId).filter(Boolean)
    );
  }, [requestedRoom, requestedRoomId, validRooms]);

  const returnToGrows = requestedRoom
    ? facilityRoomGrowsHref(roomId(requestedRoom), requestedRoomLabel)
    : "/home/facility/grows";
  const canStart =
    name.trim().length > 1 &&
    startDate.trim().length >= 8 &&
    selectedRooms.length > 0 &&
    !createGrow.isPending;

  function toggleRoom(id: string) {
    setSelectedRooms((current) =>
      current.includes(id) ? current.filter((room) => room !== id) : [...current, id]
    );
    setFeedback("");
  }

  async function startGrow() {
    if (!canStart) {
      setFeedback("Name, start date, and at least one room are required.");
      return;
    }
    setFeedback("");
    try {
      const grow = await createGrow.mutateAsync({
        name: name.trim(),
        startDate: startDate.trim(),
        rooms: selectedRooms,
        roomIds: selectedRooms
      });
      router.replace({
        pathname: "/onboarding/assign-plants",
        params: { growId: grow.id }
      });
    } catch (error: any) {
      setFeedback(error?.message || "Unable to start grow.");
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{requestedRoom ? "Room grow" : "Batch cycle"}</Text>
        <Text style={styles.title}>Start a grow</Text>
        <Text style={styles.subtitle}>
          {requestedRoom
            ? `Create a production cycle in ${requestedRoomLabel}. Plants, tasks, logs, and AI context will attach to this grow.`
            : "Create the production cycle that rooms, plants, tasks, logs, and AI context will attach to."}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Grow or batch name</Text>
        <TextInput
          accessibilityLabel="Grow or batch name"
          style={styles.input}
          placeholder="Batch Cycle 1"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setFeedback("");
          }}
        />

        <Text style={styles.label}>Start date</Text>
        <TextInput
          accessibilityLabel="Grow start date"
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#64748b"
          value={startDate}
          onChangeText={(value) => {
            setStartDate(value);
            setFeedback("");
          }}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Rooms</Text>
          <Text style={styles.helper}>{selectedRooms.length} selected</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.helper}>Loading rooms...</Text>
          </View>
        ) : null}

        {!isLoading && !validRooms.length ? (
          <Text style={styles.error}>
            Create at least one room before starting a grow.
          </Text>
        ) : null}

        {!isLoading && validRooms.length && requestedRoomId && !requestedRoom ? (
          <Text style={styles.error}>
            The requested room is no longer available. Select one or more current rooms to
            continue.
          </Text>
        ) : null}

        <View style={styles.roomGrid}>
          {validRooms.map((room: any) => {
            const id = roomId(room);
            const active = selectedRooms.includes(id);
            const label = String(room.name || id);
            return (
              <Pressable
                key={id}
                onPress={() => toggleRoom(id)}
                accessibilityRole="button"
                accessibilityLabel={`${active ? "Remove" : "Select"} room ${label}`}
                style={[styles.roomChip, active && styles.roomChipActive]}
              >
                <Text style={[styles.roomChipText, active && styles.roomChipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {feedback ? <Text style={styles.error}>{feedback}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            onPress={startGrow}
            disabled={!canStart}
            accessibilityRole="button"
            accessibilityLabel="Start grow"
            accessibilityState={{ disabled: !canStart }}
            style={[styles.primaryButton, !canStart && styles.disabledButton]}
          >
            {createGrow.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Start grow</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.replace(returnToGrows as any)}
            disabled={createGrow.isPending}
            accessibilityRole="button"
            accessibilityLabel={
              requestedRoom ? "Back to room grows" : "Back to facility grows"
            }
            accessibilityState={{ disabled: createGrow.isPending }}
            style={[
              styles.secondaryButton,
              createGrow.isPending && styles.disabledButton
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {requestedRoom ? "Back to room grows" : "Back to facility grows"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#f8fafc", flex: 1 },
  content: {
    alignSelf: "center",
    maxWidth: 900,
    padding: 20,
    width: "100%"
  },
  header: { gap: 6, marginBottom: 16 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: { color: "#111827", fontSize: 30, fontWeight: "900" },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#d7ddd2",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  label: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#111827",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  helper: { color: "#64748b", fontWeight: "700" },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  roomGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roomChip: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  roomChipActive: { backgroundColor: "#166534", borderColor: "#166534" },
  roomChipText: { color: "#334155", fontWeight: "900" },
  roomChipTextActive: { color: "#ffffff" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  secondaryButtonText: { color: "#111827", fontWeight: "900" },
  disabledButton: { opacity: 0.55 },
  error: { color: "#b91c1c", fontWeight: "800" }
});
