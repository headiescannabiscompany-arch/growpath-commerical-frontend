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

import CalendarDateField from "@/components/forms/CalendarDateField";
import { useEntitlements } from "@/entitlements";
import { can, type FacilityRole } from "@/facility/roleGates";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { useRooms } from "../../rooms/hooks";
import { useCreateGrow } from "../hooks";
import { getTier1Options } from "@/utils/growInterests";

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
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = createStartGrowStyles(palette);
  const { roomId: requestedRoomId, roomName: requestedRoomName } = useLocalSearchParams<{
    roomId?: string;
    roomName?: string;
  }>();
  const [name, setName] = useState("Batch Cycle 1");
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const { data: rooms, isLoading } = useRooms();
  const createGrow = useCreateGrow();
  const router = useRouter();
  const selectionInitialized = useRef(false);
  const facilityRole = String(
    entitlements.facilityRole || "VIEWER"
  ).toUpperCase() as FacilityRole;
  const canCreateGrow = can(facilityRole, "GROWS_CREATE");

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
    selectedCrops.length > 0 &&
    selectedRooms.length > 0 &&
    !createGrow.isPending;

  function toggleRoom(id: string) {
    setSelectedRooms((current) =>
      current.includes(id) ? current.filter((room) => room !== id) : [...current, id]
    );
    setFeedback("");
  }

  function toggleCrop(crop: string) {
    setSelectedCrops((current) =>
      current.includes(crop)
        ? current.filter((value) => value !== crop)
        : [...current, crop]
    );
    setFeedback("");
  }

  async function startGrow() {
    if (!canStart) {
      setFeedback("Name, start date, crop type, and at least one room are required.");
      return;
    }
    setFeedback("");
    try {
      const grow = await createGrow.mutateAsync({
        name: name.trim(),
        startDate: startDate.trim(),
        rooms: selectedRooms,
        roomIds: selectedRooms,
        cropTypes: selectedCrops,
        growInterests: { crops: selectedCrops }
      });
      router.replace({
        pathname: "/onboarding/assign-plants",
        params: { growId: grow.id }
      });
    } catch (error: any) {
      setFeedback(error?.message || "Unable to start grow.");
    }
  }

  function returnToOrigin() {
    const browserLocation = (globalThis as any).location;
    if (browserLocation && typeof browserLocation.assign === "function") {
      browserLocation.assign(returnToGrows);
      return;
    }

    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(returnToGrows as any);
  }

  if (entitlements.ready && !canCreateGrow) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Batch cycle</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Grow setup is read-only
          </Text>
          <Text style={styles.subtitle}>
            Your Facility role can view grows but cannot create a production cycle. Ask an
            owner or manager to start the grow.
          </Text>
        </View>
        <Pressable
          onPress={returnToOrigin}
          accessibilityRole="button"
          accessibilityLabel="Back to facility grows"
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Back to facility grows</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{requestedRoom ? "Room grow" : "Batch cycle"}</Text>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Start a grow
        </Text>
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
          placeholderTextColor={palette.textMuted}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setFeedback("");
          }}
        />

        <CalendarDateField
          accessibilityLabel="Grow start date"
          label="Start date"
          placeholder="Choose grow start date"
          value={startDate}
          onChange={(value) => {
            setStartDate(value);
            setFeedback("");
          }}
          optional={false}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Crop type</Text>
          <Text style={styles.helper}>
            {selectedCrops.length} crop{selectedCrops.length === 1 ? "" : "s"} selected
          </Text>
        </View>
        <Text style={styles.helper}>
          This controls crop-specific Facility tools. Select Cannabis for Harvest
          Readiness.
        </Text>
        <View style={styles.roomGrid}>
          {getTier1Options().map((crop) => {
            const active = selectedCrops.includes(crop);
            return (
              <Pressable
                key={crop}
                onPress={() => toggleCrop(crop)}
                accessibilityRole="button"
                accessibilityLabel={`${active ? "Remove" : "Select"} crop ${crop}`}
                style={[styles.roomChip, active && styles.roomChipActive]}
              >
                <Text style={[styles.roomChipText, active && styles.roomChipTextActive]}>
                  {crop}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Rooms</Text>
          <Text style={styles.helper}>
            {selectedRooms.length} room{selectedRooms.length === 1 ? "" : "s"} selected
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={palette.accent} />
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
              <ActivityIndicator color={palette.accentText} />
            ) : (
              <Text style={styles.primaryButtonText}>Start grow</Text>
            )}
          </Pressable>
          <Pressable
            onPress={returnToOrigin}
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

export const createStartGrowStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    page: { backgroundColor: palette.page, flex: 1 },
    content: {
      alignSelf: "center",
      maxWidth: 900,
      padding: 20,
      width: "100%"
    },
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
    sectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    helper: { color: palette.textMuted, fontWeight: "700" },
    loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
    roomGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    roomChip: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    roomChipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    roomChipText: { color: palette.textSoft, fontWeight: "900" },
    roomChipTextActive: { color: palette.accentText },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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
