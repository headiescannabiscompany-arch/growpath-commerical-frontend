import React, { useCallback, useMemo, useRef, useState } from "react";
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

import { ApiError } from "@/api/apiRequest";
import { type PersonalPlant } from "@/api/plants";
import { createCropProfile, listCropProfiles } from "@/api/cropKnowledge";
import { useAuth } from "@/auth/AuthContext";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, getRowId } from "@/features/grows/routeUtils";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import {
  createWorkspacePlant,
  growWorkspaceBasePath,
  listWorkspacePlants,
  type GrowWorkspace
} from "@/features/grows/workspaceData";

type PlantsRead =
  | { status: "loading" | "failed" }
  | { status: "ready"; plants: PersonalPlant[] };

type SaveReview = "idle" | "unconfirmed" | "checking" | "checked";

function GrowPlantsContent({
  workspace,
  growId,
  routePlantId
}: {
  workspace: GrowWorkspace;
  growId: string;
  routePlantId: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGrowPlantsStyles(palette), [palette]);
  const entitlements = useEntitlements();
  const hasPlantWriteCapability = entitlements.can(CAPABILITY_KEYS.PLANTS_PERSONAL_WRITE);
  const maxPlants = Number(entitlements.limits?.maxPlants ?? 0);
  const [read, setRead] = useState<PlantsRead>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const checkAttempt = useRef<number | null>(null);
  const [saveReview, setSaveReview] = useState<SaveReview>("idle");
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
  const canWritePlants = read.status === "ready" &&
    (workspace === "commercial" || hasPlantWriteCapability || maxPlants > read.plants.length);
  const saveNeedsCheck = saveReview === "unconfirmed" || saveReview === "checking";
  const saveDisabled = !canWritePlants || !name.trim() || creating || saveNeedsCheck;
  const basePath = growWorkspaceBasePath(workspace);

  useFocusEffect(
    useCallback(() => {
      if (!growId) return;
      let current = true;
      const checkingSave = checkAttempt.current === attempt;
      setRead({ status: "loading" });
      void listWorkspacePlants(workspace, growId, { verifyRecords: true }).then(
        (plants) => {
          if (!current) return;
          setRead({ status: "ready", plants });
          if (checkingSave) {
            checkAttempt.current = null;
            setSaveReview("checked");
          }
        },
        () => {
          if (!current) return;
          setRead({ status: "failed" });
          if (checkingSave) {
            checkAttempt.current = null;
            setSaveReview("unconfirmed");
          }
        }
      );
      return () => {
        current = false;
      };
    }, [attempt, growId, workspace])
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
    if (!canWritePlants || !displayName || profileDrafting) return;
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
    if (!growId || saveDisabled || creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    setSaveReview("idle");
    setFeedback("");
    try {
      const created = await createWorkspacePlant(workspace, {
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
      if (typeof created?.id !== "string" || !created.id.trim() || created.growId !== growId) {
        setSaveReview("unconfirmed");
        return;
      }
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
      setRead({ status: "loading" });
      setAttempt((previous) => previous + 1);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : null;
      if (status === 400 || status === 422) {
        setFeedback("Could not save the plant. Check the plant details and try again.");
      } else if (status === 401 || status === 403) {
        setFeedback("Could not save the plant. Check your sign-in and access to this grow.");
      } else if (status === 404) {
        setFeedback("Could not save the plant. Check that the grow and any linked crop profile are available.");
      } else {
        setSaveReview("unconfirmed");
      }
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
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

  function withPlant(path: string, plant: PersonalPlant, recommendedTool?: string) {
    const plantId = getRowId(plant);
    const params = new URLSearchParams();
    params.set("growId", growId);
    if (plantId) params.set("plantId", plantId);
    if (recommendedTool) params.set("recommendedTool", recommendedTool);
    return `${path}?${params.toString()}`;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Plants</Text>
      <Text style={styles.subtitle}>Plants tracked inside this grow.</Text>
      {saveReview !== "idle" ? (
        <View style={styles.form}>
          <Text accessibilityRole="alert" style={styles.readError}>
            {saveReview === "checked"
              ? "Review the plant list before saving again"
              : "Could not confirm the plant was saved"}
          </Text>
          <Text style={styles.help}>
            {saveReview === "checked"
              ? "If the plant is already in this grow, you can close the draft."
              : "Check this grow’s plant list before trying to save again."}
          </Text>
          {saveNeedsCheck ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Check plants"
              disabled={saveReview === "checking"}
              style={[styles.secondaryButton, styles.retry]}
              onPress={() => {
                if (checkAttempt.current !== null) return;
                checkAttempt.current = attempt + 1;
                setSaveReview("checking");
                setRead({ status: "loading" });
                setAttempt(attempt + 1);
              }}
            >
              <Text style={styles.secondaryButtonText}>
                {saveReview === "checking" ? "Checking plants…" : "Check plants"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {!growId ? <Text style={styles.subtitle}>No grow selected.</Text> : null}
      {growId && read.status === "failed" ? (
        <View style={styles.form}>
          <Text accessibilityRole="alert" style={styles.readError}>Could not load plants</Text>
          <Text style={styles.help}>Try again to reload the plants in this grow.</Text>
          {!saveNeedsCheck ? <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, styles.retry]}
            onPress={() => setAttempt((previous) => previous + 1)}
          >
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable> : null}
        </View>
      ) : null}
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_plants"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="plants" />

      {canWritePlants || (showForm && saveReview === "checked") ? (
        <Pressable
          style={styles.primaryButton}
          onPress={() => setShowForm((value) => !value)}
          disabled={creating}
          accessibilityRole="button"
          accessibilityLabel={showForm ? "Cancel adding plant" : "Add plant"}
        >
          <Text style={styles.primaryButtonText}>
            {showForm ? "Cancel" : "+ Add Plant"}
          </Text>
        </Pressable>
      ) : read.status === "ready" ? (
        <View style={styles.form}>
          <Text style={styles.label}>Plant tracking writes are Pro</Text>
          <Text style={styles.help}>
            Free accounts can create one plant in one grow. Upgrade to add more plants,
            crop profiles, and plant-level grow history.
          </Text>
        </View>
      ) : null}

      {showForm && (read.status !== "ready" || canWritePlants || saveReview !== "idle") ? (
        <View style={styles.form}>
          <Text style={styles.label}>Plant name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Plant 1"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
            accessibilityLabel="Plant name"
          />
          <Text style={styles.label}>Cultivar / strain</Text>
          <TextInput
            style={styles.input}
            value={cultivar}
            onChangeText={setCultivar}
            placeholder="Optional"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
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
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
              accessibilityLabel="Plant crop common name"
            />
            <TextInput
              style={styles.gridInput}
              value={scientificName}
              onChangeText={setScientificName}
              placeholder="Scientific name optional"
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
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
                style={[styles.secondaryButton, (!canWritePlants || profileDrafting) && styles.disabled]}
                disabled={!canWritePlants || profileDrafting}
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
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
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
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
              accessibilityLabel="Plant canopy width"
            />
            <TextInput
              style={styles.gridInput}
              value={timingOffsetDays}
              onChangeText={setTimingOffsetDays}
              keyboardType="numeric"
              placeholder="Timing offset days"
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
              accessibilityLabel="Plant timing offset"
            />
            <TextInput
              style={styles.gridInput}
              value={waterDemand}
              onChangeText={setWaterDemand}
              placeholder="Water demand"
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
              accessibilityLabel="Plant water demand"
            />
            <TextInput
              style={styles.gridInput}
              value={phenoLabel}
              onChangeText={setPhenoLabel}
              placeholder="Pheno notes"
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
              accessibilityLabel="Plant pheno label"
            />
          </View>
          <Pressable
            style={[styles.primaryButton, saveDisabled && styles.disabled]}
            disabled={saveDisabled}
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
      {growId && read.status === "loading" ? (
        <ActivityIndicator accessibilityLabel="Loading plants" color={palette.accent} />
      ) : null}
      {read.status === "ready" && (read.plants.length === 0 ? (
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
        read.plants.map((plant, index) => {
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
                <Link
                  href={withPlant(
                    workspace === "commercial"
                      ? `${basePath}/tools/diagnose`
                      : `${basePath}/diagnose`,
                    plant
                  )}
                  asChild
                >
                  <Pressable
                    style={styles.quickAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Diagnose ${plant.name || "plant"}`}
                  >
                    <Text style={styles.quickActionText}>Diagnose</Text>
                  </Pressable>
                </Link>
                <Link
                  href={withPlant(
                    workspace === "commercial"
                      ? `${basePath}/tools`
                      : `${basePath}/tools/watering`,
                    plant,
                    workspace === "commercial" ? "watering" : undefined
                  )}
                  asChild
                >
                  <Pressable
                    style={styles.quickAction}
                    accessibilityRole="button"
                    accessibilityLabel={`Plan watering for ${plant.name || "plant"}`}
                  >
                    <Text style={styles.quickActionText}>Watering</Text>
                  </Pressable>
                </Link>
                <Link
                  href={withPlant(
                    workspace === "commercial"
                      ? `${basePath}/tools`
                      : `${basePath}/tools/timeline-planner`,
                    plant,
                    workspace === "commercial" ? "timeline-planner" : undefined
                  )}
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
      ))}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grows_growid_plants"
        longContent
      />
    </ScrollView>
  );
}

export default function GrowPlantsScreen({
  workspace = "personal"
}: {
  workspace?: GrowWorkspace;
} = {}) {
  const { user } = useAuth();
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = coerceParam(rawGrowId);
  const basePath = growWorkspaceBasePath(workspace);
  return (
    <ScreenBoundary
      title="Grow plants"
      showBack
      backFallbackHref={
        growId ? `${basePath}/grows/${encodeURIComponent(growId)}` : `${basePath}/grows`
      }
    >
      <GrowPlantsContent
        key={JSON.stringify([user?.id, workspace, growId])}
        workspace={workspace}
        growId={growId}
        routePlantId={coerceParam(rawPlantId)}
      />
    </ScreenBoundary>
  );
}

export const createGrowPlantsStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 40, gap: 10 },
    title: { color: palette.text, fontSize: 22, fontWeight: "700" },
    subtitle: { color: palette.textMuted, lineHeight: 19 },
    help: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    form: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted,
      padding: 12,
      gap: 8
    },
    label: { color: palette.text, fontWeight: "700" },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      color: palette.text,
      padding: 10
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
    gridInput: {
      minWidth: 145,
      flexGrow: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      color: palette.text,
      padding: 10
    },
    primaryButton: {
      alignSelf: "flex-start",
      borderRadius: radius.card,
      backgroundColor: palette.accent,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    retry: { minHeight: 44, justifyContent: "center" },
    readError: { color: palette.danger, fontWeight: "800" },
    disabled: { opacity: 0.55 },
    feedback: { color: palette.textMuted, fontWeight: "700" },
    profileMatch: { color: palette.link, fontWeight: "800", alignSelf: "center" },
    empty: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted,
      padding: 14,
      gap: 5
    },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      padding: 12,
      gap: 4
    },
    cardFocused: {
      borderColor: palette.accent,
      borderWidth: 2,
      shadowColor: palette.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 8
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    meta: { color: palette.textMuted, fontSize: 12 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    quickAction: {
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.accentSoft
    },
    quickActionText: { color: palette.link, fontWeight: "800", fontSize: 12 }
  });
