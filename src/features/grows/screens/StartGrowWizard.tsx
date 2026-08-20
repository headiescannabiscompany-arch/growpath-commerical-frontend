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
import { findReviewedCropLifecycle } from "@/knowledge/cropLifecycleRegistry";

const LIFE_SPAN_OPTIONS = [
  ["unknown", "Not sure"],
  ["annual", "Annual / one season"],
  ["biennial", "Biennial / two seasons"],
  ["short_lived_perennial", "Short-lived perennial"],
  ["long_lived_perennial", "Long-lived perennial / woody"],
  ["continuous_tropical", "Continuous indoor / tropical"],
  ["finite_cycle", "Finite production cycle / non-plant"],
  ["climate_dependent_perennial", "Tender perennial / climate-dependent"]
] as const;

const PRODUCTION_OPTIONS = [
  ["unknown", "Not sure"],
  ["single_harvest", "One main harvest"],
  ["repeat_harvest", "Repeated picking / flushes"],
  ["seasonal_perennial", "Seasonal harvest each year"],
  ["continuous", "Continuous production"],
  ["non_harvest_observation", "Observation / no harvest"],
  ["cultivar_dependent", "Depends on cultivar / growth habit"]
] as const;

const DORMANCY_OPTIONS = [
  ["unknown", "Not sure"],
  ["none", "No planned dormancy"],
  ["seasonal", "Seasonal dormancy"],
  ["climate_dependent", "Depends on climate / location"]
] as const;

const START_TYPE_OPTIONS = [
  ["seed", "Seed"],
  ["clone", "Clone / cutting"],
  ["transplant", "Transplant"],
  ["existing_plant", "Existing plant"],
  ["culture_spawn", "Culture / spawn / inoculated block"]
] as const;

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
  const [cropCommonName, setCropCommonName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [commonNames, setCommonNames] = useState("");
  const [cultivar, setCultivar] = useState("");
  const [cropProfileId, setCropProfileId] = useState("");
  const [cropProfileLabel, setCropProfileLabel] = useState("");
  const [lifeSpanPath, setLifeSpanPath] = useState("unknown");
  const [productionPattern, setProductionPattern] = useState("unknown");
  const [dormancyPattern, setDormancyPattern] = useState("unknown");
  const [startType, setStartType] = useState("seed");
  const [plantCount, setPlantCount] = useState("1");
  const [establishmentWeeks, setEstablishmentWeeks] = useState("");
  const [expectedDaysToFirstHarvest, setExpectedDaysToFirstHarvest] = useState("");
  const [lifecycleGuidance, setLifecycleGuidance] = useState<string[]>([]);
  const [lifecycleQuestions, setLifecycleQuestions] = useState<string[]>([]);
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

  function matchCropGuidance() {
    const match = findReviewedCropLifecycle({
      commonName: cropCommonName,
      scientificName
    });
    if (!match) {
      setCropProfileId("");
      setCropProfileLabel("");
      setLifecycleGuidance([]);
      setLifecycleQuestions([]);
      setFeedback(
        "No reviewed crop profile matched. Keep unknown lifecycle fields as Not sure and enter only facts you know."
      );
      return;
    }
    setScientificName((current) => current.trim() || match.scientificName);
    setCropProfileId(match.id);
    setCropProfileLabel(`${match.scientificName} (reviewed lifecycle)`);
    setLifeSpanPath(match.lifeSpanPath);
    setProductionPattern(match.productionPattern);
    setDormancyPattern(match.dormancyPattern);
    setLifecycleGuidance(match.guidance);
    setLifecycleQuestions(match.requiredQuestions);
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
        growInterests: { crops: selectedCrops },
        cropCommonName: cropCommonName.trim() || undefined,
        scientificName: scientificName.trim() || undefined,
        commonNames: commonNames
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        cultivar: cultivar.trim() || undefined,
        cropProfileId: cropProfileId || undefined,
        cropIdentity: cropCommonName.trim()
          ? {
              commonName: cropCommonName.trim(),
              scientificName: scientificName.trim() || null,
              commonNames: commonNames
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
              cultivar: cultivar.trim() || null,
              source: "facility_grow_setup",
              userConfirmed: true
            }
          : undefined,
        planning: {
          startType,
          plantCount: Number(plantCount) || 1,
          establishmentWeeks: establishmentWeeks.trim()
            ? Number(establishmentWeeks)
            : undefined,
          expectedDaysToFirstHarvest: expectedDaysToFirstHarvest.trim()
            ? Number(expectedDaysToFirstHarvest)
            : undefined,
          lifeSpanPath,
          productionPattern,
          dormancyPattern,
          roomIds: selectedRooms,
          guidanceSourceIds: cropProfileId ? [cropProfileId] : []
        }
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
          <Text style={styles.label}>Exact crop identity</Text>
          <Text style={styles.helper}>Recommended for crop-aware planning</Text>
        </View>
        <Text style={styles.helper}>
          Record the crop itself separately from its broad category. Reviewed matches can
          suggest a lifecycle, but the owner reviews every suggestion before saving.
        </Text>
        <TextInput
          accessibilityLabel="Crop common name"
          style={styles.input}
          placeholder="Tomato"
          placeholderTextColor={palette.textMuted}
          value={cropCommonName}
          onChangeText={(value) => {
            setCropCommonName(value);
            setCropProfileId("");
            setCropProfileLabel("");
            setFeedback("");
          }}
        />
        <TextInput
          accessibilityLabel="Crop scientific name"
          style={styles.input}
          placeholder="Solanum lycopersicum (optional)"
          placeholderTextColor={palette.textMuted}
          value={scientificName}
          onChangeText={(value) => {
            setScientificName(value);
            setCropProfileId("");
            setCropProfileLabel("");
            setFeedback("");
          }}
        />
        <TextInput
          accessibilityLabel="Other crop names"
          style={styles.input}
          placeholder="Other names, comma separated"
          placeholderTextColor={palette.textMuted}
          value={commonNames}
          onChangeText={setCommonNames}
        />
        <TextInput
          accessibilityLabel="Cultivar"
          style={styles.input}
          placeholder="Cultivar or variety, if known"
          placeholderTextColor={palette.textMuted}
          value={cultivar}
          onChangeText={setCultivar}
        />
        <Pressable
          onPress={matchCropGuidance}
          disabled={!cropCommonName.trim() && !scientificName.trim()}
          accessibilityRole="button"
          accessibilityLabel="Match crop guidance"
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Match reviewed crop guidance</Text>
        </Pressable>
        {cropCommonName.trim() || scientificName.trim() ? (
          <Pressable
            onPress={() => {
              const crop = scientificName.trim() || cropCommonName.trim();
              router.push(
                `/home/facility/ai-ask?prompt=${encodeURIComponent(
                  `Help me set up a Facility grow for ${crop}. Use reviewed crop-specific guidance, explain uncertain inputs, and leave unknown facts for me to confirm.`
                )}` as any
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Ask AI for crop setup help"
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Get crop setup help</Text>
          </Pressable>
        ) : null}
        {cropProfileLabel ? (
          <Text style={styles.profileMatch}>Matched: {cropProfileLabel}</Text>
        ) : null}

        <Text style={styles.label}>Plant lifespan</Text>
        <View style={styles.roomGrid}>
          {LIFE_SPAN_OPTIONS.map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setLifeSpanPath(value)}
              accessibilityRole="button"
              accessibilityLabel={`Plant lifespan ${label}`}
              style={[styles.roomChip, lifeSpanPath === value && styles.roomChipActive]}
            >
              <Text
                style={[
                  styles.roomChipText,
                  lifeSpanPath === value && styles.roomChipTextActive
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Harvest or observation pattern</Text>
        <View style={styles.roomGrid}>
          {PRODUCTION_OPTIONS.map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setProductionPattern(value)}
              accessibilityRole="button"
              accessibilityLabel={`Production pattern ${label}`}
              style={[
                styles.roomChip,
                productionPattern === value && styles.roomChipActive
              ]}
            >
              <Text
                style={[
                  styles.roomChipText,
                  productionPattern === value && styles.roomChipTextActive
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Dormancy</Text>
        <View style={styles.roomGrid}>
          {DORMANCY_OPTIONS.map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setDormancyPattern(value)}
              accessibilityRole="button"
              accessibilityLabel={`Dormancy ${label}`}
              style={[
                styles.roomChip,
                dormancyPattern === value && styles.roomChipActive
              ]}
            >
              <Text
                style={[
                  styles.roomChipText,
                  dormancyPattern === value && styles.roomChipTextActive
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {lifecycleGuidance.length ? (
          <View style={styles.guidanceCard}>
            <Text style={styles.guidanceTitle}>Reviewed planning context</Text>
            {lifecycleGuidance.map((item) => (
              <Text key={item} style={styles.helper}>
                • {item}
              </Text>
            ))}
            {lifecycleQuestions.map((item) => (
              <Text key={item} style={styles.question}>
                Confirm: {item}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.label}>How are you starting?</Text>
        <View style={styles.roomGrid}>
          {START_TYPE_OPTIONS.map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setStartType(value)}
              accessibilityRole="button"
              accessibilityLabel={`Grow start type ${label}`}
              style={[styles.roomChip, startType === value && styles.roomChipActive]}
            >
              <Text
                style={[
                  styles.roomChipText,
                  startType === value && styles.roomChipTextActive
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Plant count</Text>
        <TextInput
          accessibilityLabel="Plant count"
          style={styles.input}
          keyboardType="number-pad"
          value={plantCount}
          onChangeText={setPlantCount}
        />
        <Text style={styles.label}>Establishment weeks</Text>
        <TextInput
          accessibilityLabel="Establishment weeks"
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Leave blank when unknown"
          placeholderTextColor={palette.textMuted}
          value={establishmentWeeks}
          onChangeText={setEstablishmentWeeks}
        />
        <Text style={styles.label}>Expected days to first harvest</Text>
        <TextInput
          accessibilityLabel="Expected days to first harvest"
          style={styles.input}
          keyboardType="number-pad"
          placeholder="Use a sourced or owner-confirmed estimate"
          placeholderTextColor={palette.textMuted}
          value={expectedDaysToFirstHarvest}
          onChangeText={setExpectedDaysToFirstHarvest}
        />
        <Text style={styles.helper}>
          Unknown timing stays blank. These are editable planning anchors, not biological
          guarantees.
        </Text>

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
    profileMatch: { color: palette.accent, fontWeight: "900" },
    guidanceCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    guidanceTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    question: { color: palette.textSoft, fontWeight: "800" },
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
