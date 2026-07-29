import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { radius } from "@/theme/theme";
import { useBulkCreateRooms, useRooms } from "../hooks";

const DEFAULT_ROOMS = [
  { name: "Flower Room", roomType: "flower" },
  { name: "Veg Room", roomType: "vegetative" },
  { name: "Mother Room", roomType: "mother" },
  { name: "Greenhouse", roomType: "greenhouse" },
  { name: "Dry/Cure Room", roomType: "drying" }
];

const ROOM_TYPES = ["flower", "vegetative", "mother", "greenhouse", "drying", "other"];

type RoomDraft = { name: string; roomType: string; error: string };
type ProgressState = { current: number; total: number; failed: number[] };

function normalizeRoomNames(rooms: RoomDraft[]) {
  const seen: Record<string, number> = {};
  return rooms.map((room, index) => {
    const base = room.name.trim() || `Room ${index + 1}`;
    const count = seen[base] || 0;
    seen[base] = count + 1;
    return count ? `${base} (${count + 1})` : base;
  });
}

export default function FirstSetupRooms() {
  const router = useRouter();
  const { data: existingRooms, isLoading } = useRooms();
  const bulkCreate = useBulkCreateRooms();

  const [rooms, setRooms] = useState<RoomDraft[]>(
    DEFAULT_ROOMS.map((room) => ({ ...room, error: "" }))
  );
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    total: 0,
    failed: []
  });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (existingRooms && existingRooms.length > 0) {
      router.replace("/onboarding/start-grow");
    }
  }, [existingRooms, router]);

  const canCreate = useMemo(
    () => rooms.some((room) => room.name.trim()) && !creating,
    [creating, rooms]
  );

  function updateRoom(index: number, name: string) {
    setRooms((current) =>
      current.map((room, i) => (i === index ? { ...room, name, error: "" } : room))
    );
    setFeedback("");
  }

  function addRoom() {
    setRooms((current) => [...current, { name: "", roomType: "other", error: "" }]);
    setFeedback("");
  }

  function removeRoom(index: number) {
    if (rooms.length === 1 || creating) return;
    setRooms((current) => current.filter((_, i) => i !== index));
    setFeedback("");
  }

  function validate() {
    const normalized = normalizeRoomNames(rooms);
    let valid = true;
    const next = rooms.map((room, index) => {
      const name = room.name.trim();
      let error = "";
      if (!name) {
        error = "Room name required";
        valid = false;
      }
      return { ...room, name: normalized[index], error };
    });
    setRooms(next);
    return valid;
  }

  async function createRooms() {
    if (!canCreate || !validate()) return;
    setCreating(true);
    setFeedback("");
    setProgress({ current: 0, total: rooms.length, failed: [] });
    try {
      const payload = normalizeRoomNames(rooms).map((name, index) => ({
        name,
        roomType: rooms[index].roomType,
        trackingMode: "batch"
      }));
      const results = await bulkCreate.mutateAsync(payload);
      const failed = results
        .map((result, index) => (!result.success ? index : null))
        .filter((index): index is number => index !== null);
      setProgress({ current: rooms.length, total: rooms.length, failed });
      if (failed.length) {
        setFeedback("Some rooms could not be created. Check names and try again.");
      } else {
        router.replace("/onboarding/start-grow");
      }
    } catch (error: any) {
      setFeedback(error?.message || "Unable to create rooms.");
    } finally {
      setCreating(false);
    }
  }

  function skip() {
    router.replace("/home/facility/rooms");
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Checking rooms...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Facility setup</Text>
        <Text style={styles.title}>Create rooms</Text>
        <Text style={styles.subtitle}>
          Rooms are where plants, equipment, tasks, logs, and batch cycles attach. Start
          with your main work areas; you can edit these later.
        </Text>
      </View>

      <View style={styles.card}>
        {rooms.map((room, index) => (
          <View key={`room-${index}`} style={styles.roomRow}>
            <View style={styles.inputWrap}>
              <Text style={styles.label}>Room {index + 1}</Text>
              <TextInput
                style={styles.input}
                value={room.name}
                onChangeText={(text) => updateRoom(index, text)}
                placeholder={`Room ${index + 1}`}
                placeholderTextColor="#64748b"
                editable={!creating}
                returnKeyType="done"
              />
              <View style={styles.typeRow}>
                {ROOM_TYPES.map((roomType) => (
                  <Pressable
                    key={`${index}-${roomType}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Set room ${index + 1} type to ${roomType}`}
                    onPress={() =>
                      setRooms((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, roomType } : item
                        )
                      )
                    }
                    style={[
                      styles.typeButton,
                      room.roomType === roomType && styles.typeButtonSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        room.roomType === roomType && styles.typeButtonTextSelected
                      ]}
                    >
                      {roomType}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {room.error ? <Text style={styles.error}>{room.error}</Text> : null}
            </View>
            <Pressable
              onPress={() => removeRoom(index)}
              disabled={rooms.length === 1 || creating}
              accessibilityRole="button"
              accessibilityLabel={`Remove room ${index + 1}`}
              style={[
                styles.iconButton,
                (rooms.length === 1 || creating) && styles.disabledButton
              ]}
            >
              <Text style={styles.iconButtonText}>X</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={addRoom}
          disabled={creating}
          accessibilityRole="button"
          accessibilityLabel="Add room"
          style={[styles.secondaryButton, creating && styles.disabledButton]}
        >
          <Text style={styles.secondaryButtonText}>Add room</Text>
        </Pressable>

        {feedback ? <Text style={styles.error}>{feedback}</Text> : null}
        {progress.failed.length > 0 ? (
          <Text style={styles.error}>
            Failed: {progress.failed.map((index) => rooms[index]?.name).join(", ")}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={createRooms}
            disabled={!canCreate}
            accessibilityRole="button"
            accessibilityLabel="Create rooms"
            style={[styles.primaryButton, !canCreate && styles.disabledButton]}
          >
            {creating ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create rooms</Text>
            )}
          </Pressable>
          <Pressable
            onPress={skip}
            disabled={creating}
            accessibilityRole="button"
            accessibilityLabel="Skip room setup"
            style={[styles.secondaryButton, creating && styles.disabledButton]}
          >
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
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
  centered: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center"
  },
  loadingText: { color: "#64748b", fontWeight: "700", marginTop: 12 },
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
  roomRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10
  },
  inputWrap: { flex: 1, gap: 6 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeButton: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  typeButtonSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  typeButtonText: { color: "#475569", fontSize: 11, fontWeight: "800" },
  typeButtonTextSelected: { color: "#ffffff" },
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
  iconButton: {
    alignItems: "center",
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderRadius: radius.card,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  iconButtonText: { color: "#be123c", fontWeight: "900" },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
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
