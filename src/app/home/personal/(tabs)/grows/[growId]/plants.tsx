import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  createPersonalPlant,
  listPersonalPlants,
  type PersonalPlant
} from "@/api/plants";
import { createCropProfile, listCropProfiles } from "@/api/cropKnowledge";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, getRowId } from "@/features/grows/routeUtils";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

function GrowPlantsContent() {
  const entitlements = useEntitlements();
  const hasPlantWriteCapability = entitlements.can(CAPABILITY_KEYS.PLANTS_PERSONAL_WRITE);
  const maxPlants = Number(entitlements.limits?.maxPlants ?? 0);
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const routePlantId = useMemo(() => coerceParam(rawPlantId), [rawPlantId]);
  const [plants, setPlants] = useState<PersonalPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cropCommonName, setCropCommonName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [cultivar, setCultivar] = useState("");
  const [cropProfileId, setCropProfileId] = useState("");
  const [cropProfileLabel, setCropProfileLabel] = useState("");
  const [profileSearching, setProfileSearching] = useState(false);
  const [profileDrafting, setProfileDrafting] = useState(false);
  const [medium, setMedium] = useState("");
  const [canopyWidthCm, setCanopyWidthCm] = useState("");
  const [waterDemand, setWaterDemand] = useState("");
  const [timingOffsetDays, setTimingOffsetDays] = useState("");
  const [phenoLabel, setPhenoLabel] = useState("");
  const [feedback, setFeedback] = useState("");
  const canWritePlants =
    hasPlantWriteCapability || (!loading && maxPlants > plants.length);

  const load = useCallback(async () => {
    if (!growId) {
      setPlants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPlants(await listPersonalPlants({ growId }));
    } catch {
      setPlants([]);
      setFeedback("Unable to load plants.");
    } finally {
      setLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function matchCropProfile() {
    const query = scientificName.trim() || cropCommonName.trim();
    if (!query || profileSearching) return;
    setProfileSearching(true);
    setFeedback("");
    try {
      const profiles: any[] = await listCropProfiles({ q: query, limit: 5 });
      const exact =
        profiles.find(
          (profile) =>
            String(profile.scientificName || "").toLowerCase() ===
              scientificName.trim().toLowerCase() ||
            String(profile.displayName || "").toLowerCase() ===
              cropCommonName.trim().toLowerCase()
        ) || profiles[0];
      if (exact?._id || exact?.id) {
        const id = String(exact._id || exact.id);
        setCropProfileId(id);
        setCropProfileLabel(
          `${exact.displayName || cropCommonName || "Crop profile"}${
            exact.curationStatus ? ` (${exact.curationStatus})` : ""
          }`
        );
        setFeedback(
          "Crop profile linked. Confirm the species before relying on crop-specific defaults."
        );
      } else {
        setCropProfileId("");
        setCropProfileLabel("");
        setFeedback(
          "No crop profile matched yet. The plant can still be saved with species text."
        );
      }
    } catch {
      setFeedback("Unable to search crop profiles.");
    } finally {
      setProfileSearching(false);
    }
  }

  async function createDraftCropProfile() {
    const displayName = cropCommonName.trim() || scientificName.trim();
    if (!displayName || profileDrafting) return;
    setProfileDrafting(true);
    setFeedback("");
    try {
      const created: any = await createCropProfile({
        displayName,
        scientificName: scientificName.trim() || undefined,
        commonNames: cropCommonName.trim() ? [cropCommonName.trim()] : [],
        cropCategory: "unknown",
        curationStatus: "needs_license_review",
        sourceRecords: [
          {
            sourceName: "User-entered crop profile request",
            sourceType: "user_entered",
            commercialUseAllowed: false,
            trainingUseAllowed: false,
            confidence: "low",
            accessedAt: new Date().toISOString(),
            notes:
              "Created from the personal plant form. Requires source and license review before verified crop guidance or model training use."
          }
        ]
      });
      const id = String(created?._id || created?.id || "");
      if (!id) throw new Error("Draft crop profile was not returned.");
      setCropProfileId(id);
      setCropProfileLabel(`${created.displayName || displayName} (needs_license_review)`);
      setFeedback(
        "Draft crop profile created and linked. Treat crop-specific guidance as unverified until source review is complete."
      );
    } catch {
      setFeedback("Unable to create draft crop profile.");
    } finally {
      setProfileDrafting(false);
    }
  }

  async function create() {
    if (!canWritePlants) {
      setFeedback("Free accounts can create one plant. Upgrade to add more plants.");
      return;
    }
    if (!growId || creating || !name.trim()) return;
    setCreating(true);
    setFeedback("");
    const created = await createPersonalPlant({
      growId,
      name: name.trim(),
      cropCommonName: cropCommonName.trim() || undefined,
      scientificName: scientificName.trim() || undefined,
      cropProfileId: cropProfileId || undefined,
      confirmationStatus: cropProfileId ? "user_confirmed" : "needs_confirmation",
      cultivar: cultivar.trim() || undefined,
      strain: cultivar.trim() || undefined,
      medium: medium.trim() || undefined,
      sizeMetrics: canopyWidthCm.trim()
        ? { canopyWidthCm: Number(canopyWidthCm.trim()) }
        : undefined,
      timingAdjustments: timingOffsetDays.trim()
        ? { stageDaysOffset: Number(timingOffsetDays.trim()) }
        : undefined,
      waterUseProfile: waterDemand.trim()
        ? { observedDemand: waterDemand.trim() }
        : undefined,
      phenoLabel: phenoLabel.trim() || undefined,
      stage: "seedling"
    });
    if (created) {
      setName("");
      setCropCommonName("");
      setScientificName("");
      setCultivar("");
      setCropProfileId("");
      setCropProfileLabel("");
      setMedium("");
      setCanopyWidthCm("");
      setWaterDemand("");
      setTimingOffsetDays("");
      setPhenoLabel("");
      setShowForm(false);
      setFeedback("Plant added to this grow.");
      await load();
    } else {
      setFeedback("Unable to create plant.");
    }
    setCreating(false);
  }

  function growthOverlayLine(plant: PersonalPlant) {
    const profile = plant.growthProfile;
    if (!profile) return "";
    const parts = [
      profile.sizeMetrics?.canopyWidthCm
        ? `canopy ${profile.sizeMetrics.canopyWidthCm} cm`
        : "",
      profile.waterUseProfile?.observedDemand
        ? `water ${profile.waterUseProfile.observedDemand}`
        : "",
      profile.timingAdjustments?.stageDaysOffset
        ? `timing ${profile.timingAdjustments.stageDaysOffset}d`
        : "",
      profile.phenoLabel ? `pheno ${profile.phenoLabel}` : ""
    ].filter(Boolean);
    return parts.join(" - ");
  }

  function withPlant(path: string, plant: PersonalPlant) {
    const plantId = getRowId(plant);
    const params = new URLSearchParams();
    params.set("growId", growId);
    if (plantId) params.set("plantId", plantId);
    return `${path}?${params.toString()}`;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Plants</Text>
      <Text style={styles.subtitle}>Plants tracked inside this grow.</Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_plants"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="plants" />

      {canWritePlants ? (
        <Pressable
          style={styles.primaryButton}
          onPress={() => setShowForm((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={showForm ? "Cancel adding plant" : "Add plant"}
        >
          <Text style={styles.primaryButtonText}>
            {showForm ? "Cancel" : "+ Add Plant"}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Plant tracking writes are Pro</Text>
          <Text style={styles.help}>
            Free accounts can create one plant in one grow. Upgrade to add more plants,
            crop profiles, and plant-level grow history.
          </Text>
        </View>
      )}

      {showForm && canWritePlants ? (
        <View style={styles.form}>
          <Text style={styles.label}>Plant name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Plant 1"
            accessibilityLabel="Plant name"
          />
          <Text style={styles.label}>Cultivar / strain</Text>
          <TextInput
            style={styles.input}
            value={cultivar}
            onChangeText={setCultivar}
            placeholder="Optional"
            accessibilityLabel="Cultivar or strain"
          />
          <Text style={styles.label}>Crop species</Text>
          <Text style={styles.help}>
            Species and cultivar are separate. Link a crop profile when you know the plant
            identity.
          </Text>
          <View style={styles.grid}>
            <TextInput
              style={styles.gridInput}
              value={cropCommonName}
              onChangeText={setCropCommonName}
              placeholder="Tomato, olive, blueberry..."
              accessibilityLabel="Plant crop common name"
            />
            <TextInput
              style={styles.gridInput}
              value={scientificName}
              onChangeText={setScientificName}
              placeholder="Scientific name optional"
              accessibilityLabel="Plant scientific name"
            />
          </View>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.secondaryButton,
                (!cropCommonName.trim() && !scientificName.trim()) || profileSearching
                  ? styles.disabled
                  : null
              ]}
              disabled={
                (!cropCommonName.trim() && !scientificName.trim()) || profileSearching
              }
              onPress={matchCropProfile}
              accessibilityRole="button"
              accessibilityLabel="Match crop profile"
            >
              <Text style={styles.secondaryButtonText}>
                {profileSearching ? "Searching..." : "Match Crop Profile"}
              </Text>
            </Pressable>
            {!cropProfileId && (cropCommonName.trim() || scientificName.trim()) ? (
              <Pressable
                style={[styles.secondaryButton, profileDrafting ? styles.disabled : null]}
                disabled={profileDrafting}
                onPress={createDraftCropProfile}
                accessibilityRole="button"
                accessibilityLabel="Create draft crop profile"
              >
                <Text style={styles.secondaryButtonText}>
                  {profileDrafting ? "Creating draft..." : "Create Draft Crop Profile"}
                </Text>
              </Pressable>
            ) : null}
            {cropProfileLabel ? (
              <Text style={styles.profileMatch}>{cropProfileLabel}</Text>
            ) : null}
          </View>
          <Text style={styles.label}>Medium</Text>
          <TextInput
            style={styles.input}
            value={medium}
            onChangeText={setMedium}
            placeholder="Soil, coco, hydro..."
            accessibilityLabel="Plant medium"
          />
          <Text style={styles.label}>Growth overlay</Text>
          <View style={styles.grid}>
            <TextInput
              style={styles.gridInput}
              value={canopyWidthCm}
              onChangeText={setCanopyWidthCm}
              keyboardType="numeric"
              placeholder="Canopy width cm"
              accessibilityLabel="Plant canopy width"
            />
            <TextInput
              style={styles.gridInput}
              value={timingOffsetDays}
              onChangeText={setTimingOffsetDays}
              keyboardType="numeric"
              placeholder="Timing offset days"
              accessibilityLabel="Plant timing offset"
            />
            <TextInput
              style={styles.gridInput}
              value={waterDemand}
              onChangeText={setWaterDemand}
              placeholder="Water demand"
              accessibilityLabel="Plant water demand"
            />
            <TextInput
              style={styles.gridInput}
              value={phenoLabel}
              onChangeText={setPhenoLabel}
              placeholder="Pheno notes"
              accessibilityLabel="Plant pheno label"
            />
          </View>
          <Pressable
            style={[styles.primaryButton, (!name.trim() || creating) && styles.disabled]}
            disabled={!name.trim() || creating}
            onPress={create}
            accessibilityRole="button"
            accessibilityLabel="Add plant to grow"
          >
            <Text style={styles.primaryButtonText}>
              {creating ? "Adding..." : "Add to Grow"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      <PersonalFeedPlacement
        placement="middle"
        routeKey="personal_grows_growid_plants"
        longContent
      />
      {loading ? (
        <ActivityIndicator />
      ) : plants.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.cardTitle}>No plants yet</Text>
          <Text style={styles.subtitle}>
            Add the first plant to start plant-level tracking.
          </Text>
          <PersonalFeedPlacement
            placement="top"
            routeKey="personal_grows_growid_plants"
            longContent
          />
        </View>
      ) : (
        plants.map((plant, index) => {
          const currentPlantId = getRowId(plant);
          const isSelected = Boolean(routePlantId && routePlantId === currentPlantId);
          return (
            <View
              key={currentPlantId || `plant-${index}`}
              accessibilityLabel={
                isSelected ? `Selected plant ${routePlantId}` : undefined
              }
              style={[styles.card, isSelected ? styles.cardFocused : null]}
            >
              <Text style={styles.cardTitle}>{plant.name || "Untitled plant"}</Text>
              <Text style={styles.subtitle}>
                {plant.cultivar || plant.strain || "Unknown cultivar"} -{" "}
                {plant.stage || plant.status || "stage not set"}
              </Text>
              <PersonalFeedPlacement
                placement="top"
                routeKey="personal_grows_growid_plants"
                longContent
              />
              {plant.medium ? (
                <Text style={styles.meta}>Medium: {plant.medium}</Text>
              ) : null}
              {plant.cropCommonName || plant.scientificName ? (
                <Text style={styles.meta}>
                  Species: {plant.cropCommonName || "Unknown common name"}
                  {plant.scientificName ? ` (${plant.scientificName})` : ""}
                </Text>
              ) : null}
              {plant.cropProfileId ? (
                <Text style={styles.meta}>Crop profile linked</Text>
              ) : null}
              {growthOverlayLine(plant) ? (
                <Text style={styles.meta}>
                  Growth overlay: {growthOverlayLine(plant)}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Link href={withPlant("/home/personal/diagnose", plant)} asChild>
                  <Pressable
                    style={styles.quickAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Diagnose ${plant.name || "plant"}`}
                  >
                    <Text style={styles.quickActionText}>Diagnose</Text>
                  </Pressable>
                </Link>
                <Link href={withPlant("/home/personal/tools/vpd", plant)} asChild>
                  <Pressable
                    style={styles.quickAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Run VPD for ${plant.name || "plant"}`}
                  >
                    <Text style={styles.quickActionText}>VPD</Text>
                  </Pressable>
                </Link>
                <Link href={withPlant("/home/personal/tools/watering", plant)} asChild>
                  <Pressable
                    style={styles.quickAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Plan watering for ${plant.name || "plant"}`}
                  >
                    <Text style={styles.quickActionText}>Watering</Text>
                  </Pressable>
                </Link>
                <Link
                  href={withPlant("/home/personal/tools/timeline-planner", plant)}
                  asChild
                >
                  <Pressable
                    style={styles.quickAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Plan timeline for ${plant.name || "plant"}`}
                  >
                    <Text style={styles.quickActionText}>Timeline</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          );
        })
      )}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grows_growid_plants"
        longContent
      />
    </ScrollView>
  );
}

export default function GrowPlantsScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{
    growId?: string | string[];
  }>();
  const growId = coerceParam(rawGrowId);
  return (
    <ScreenBoundary
      title="Grow plants"
      showBack
      backFallbackHref={
        growId
          ? `/home/personal/grows/${encodeURIComponent(growId)}`
          : "/home/personal/grows"
      }
    >
      <GrowPlantsContent />
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 40, gap: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#64748B", lineHeight: 19 },
  help: { color: "#64748B", fontSize: 12, lineHeight: 17 },
  form: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 8
  },
  label: { color: "#334155", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    padding: 10
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  gridInput: {
    minWidth: 145,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    padding: 10
  },
  primaryButton: {
    alignSelf: "flex-start",
    borderRadius: radius.card,
    backgroundColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  feedback: { color: "#334155", fontWeight: "700" },
  profileMatch: { color: "#166534", fontWeight: "800", alignSelf: "center" },
  empty: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 5
  },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 4
  },
  cardFocused: {
    borderColor: "#0F766E",
    borderWidth: 2,
    shadowColor: "#0F766E",
    shadowOpacity: 0.12,
    shadowRadius: 8
  },
  cardTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  meta: { color: "#475569", fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  quickAction: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#F0FDF4"
  },
  quickActionText: { color: "#166534", fontWeight: "800", fontSize: 12 }
});
