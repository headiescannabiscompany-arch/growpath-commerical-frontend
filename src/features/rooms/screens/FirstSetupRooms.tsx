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

import { useEntitlements } from "@/entitlements";
import { can, type FacilityRole } from "@/facility/roleGates";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
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
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = createFirstSetupRoomsStyles(palette);
  const { data: existingRooms, isLoading } = useRooms();
  const bulkCreate = useBulkCreateRooms();
  const facilityRole = String(
    entitlements.facilityRole || "VIEWER"
  ).toUpperCase() as FacilityRole;
  const canCreateRooms = can(facilityRole, "ROOMS_CREATE");

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
    if (!canCreateRooms) return;
    if (existingRooms && existingRooms.length > 0) {
      router.replace("/onboarding/start-grow");
    }
  }, [canCreateRooms, existingRooms, router]);

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

  if (entitlements.ready && !canCreateRooms) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Facility setup</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Room setup is read-only
          </Text>
          <Text style={styles.subtitle}>
            Your Facility role can view rooms but cannot create them. Ask an owner,
            manager, or staff member to finish room setup.
          </Text>
        </View>
        <Pressable
          onPress={skip}
          accessibilityRole="button"
          accessibilityLabel="Back to facility rooms"
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Back to facility rooms</Text>
        </Pressable>
      </ScrollView>
    );
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
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Create rooms
        </Text>
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
                placeholderTextColor={palette.textMuted}
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
              <ActivityIndicator color={palette.accentText} />
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

export const createFirstSetupRoomsStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    page: { backgroundColor: palette.page, flex: 1 },
    content: {
      alignSelf: "center",
      maxWidth: 900,
      padding: 20,
      width: "100%"
    },
    centered: {
      alignItems: "center",
      backgroundColor: palette.page,
      flex: 1,
      justifyContent: "center"
    },
    loadingText: { color: palette.textMuted, fontWeight: "700", marginTop: 12 },
    header: { gap: 6, marginBottom: 16 },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" },
    subtitle: {
      color: palette.textSoft,
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 21
    },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
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
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 9,
      paddingVertical: 5
    },
    typeButtonSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    typeButtonText: { color: palette.textSoft, fontSize: 11, fontWeight: "800" },
    typeButtonTextSelected: { color: palette.accentText },
    label: {
      color: palette.textSoft,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontSize: 15,
      paddingHorizontal: 12,
      paddingVertical: 11
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      height: 44,
      justifyContent: "center",
      width: 44
    },
    iconButtonText: { color: palette.danger, fontWeight: "900" },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      flexGrow: 1,
      paddingHorizontal: 14,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexGrow: 1,
      paddingHorizontal: 14,
      paddingVertical: 12
    },
    secondaryButtonText: { color: palette.text, fontWeight: "900" },
    disabledButton: { opacity: 0.55 },
    error: { color: palette.danger, fontWeight: "800" }
  });
