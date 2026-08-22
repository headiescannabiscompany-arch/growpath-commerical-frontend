import React from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { listCropProfiles } from "@/api/cropKnowledge";
import { useAuth } from "@/auth/AuthContext";
import CalendarDateField from "@/components/forms/CalendarDateField";
import GrowInterestPicker from "@/components/GrowInterestPicker";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import ReportBugButton from "@/components/ReportBugButton";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { INTEREST_TIERS } from "@/config/interests";
import { LockedScreen } from "@/entitlements/LockedScreen";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  buildEmptyTierSelection,
  flattenGrowInterests,
  flattenTierSelections,
  groupTagsByTier
} from "@/utils/growInterests";
import { isPersistedImageUri, persistImageUris } from "@/utils/photoUploads";
import { findReviewedCropLifecycle } from "@/knowledge/cropLifecycleRegistry";
import {
  appendWorkspaceGrowPhotos,
  createWorkspaceGrow,
  listWorkspaceGrows,
  type GrowWorkspace
} from "@/features/grows/workspaceData";

type SystemPreset = "soil" | "coco" | "hydro";
type AnchorType = "vegStart" | "flowerDay1";
type LifeSpanPath =
  | "annual"
  | "biennial"
  | "short_lived_perennial"
  | "long_lived_perennial"
  | "continuous_tropical"
  | "finite_cycle"
  | "climate_dependent_perennial"
  | "unknown";
type ProductionPattern =
  | "single_harvest"
  | "repeat_harvest"
  | "seasonal_perennial"
  | "continuous"
  | "non_harvest_observation"
  | "cultivar_dependent"
  | "unknown";
type SelectedPhoto = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

const CANNABIS_ONLY_INTERESTS = new Set([
  "FIM",
  "Mainlining / Manifolding",
  "SCROG",
  "SOG",
  "Lollipopping",
  "Feminization",
  "Terpene Optimization",
  "Bag Appeal",
  "Stealth / Odor Control"
]);

function firstParam(value: string | string[] | undefined) {
  return String(Array.isArray(value) ? value[0] || "" : value || "").trim();
}

function commaList(value: string | string[] | undefined) {
  return firstParam(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeTierSelections(...sources: Record<string, string[]>[]) {
  const merged = buildEmptyTierSelection() as Record<string, string[]>;
  for (const source of sources) {
    for (const tier of INTEREST_TIERS) {
      const values = Array.isArray(source?.[tier.id]) ? source[tier.id] : [];
      merged[tier.id] = Array.from(new Set([...(merged[tier.id] || []), ...values]));
    }
  }
  return merged;
}

export default function NewGrowScreen({
  workspace = "personal"
}: {
  workspace?: GrowWorkspace;
} = {}) {
  const router = useRouter();
  const basePath = `/home/${workspace}`;
  const { palette } = useAppTheme();
  const params = useLocalSearchParams<{
    source?: string | string[];
    name?: string | string[];
    cultivar?: string | string[];
    systemPreset?: string | string[];
    anchorDate?: string | string[];
    notes?: string | string[];
    growTags?: string | string[];
    startType?: string | string[];
    plantCount?: string | string[];
    vegLengthWeeks?: string | string[];
    expectedFlowerDays?: string | string[];
    cropCommonName?: string | string[];
    scientificName?: string | string[];
    commonNames?: string | string[];
    cropProfileId?: string | string[];
    sourceToolRunId?: string | string[];
  }>();
  const sourceToolRunId = firstParam(params.sourceToolRunId);
  const returnsToPersonalPlantId = workspace === "personal" && Boolean(sourceToolRunId);
  const backTarget = returnsToPersonalPlantId
    ? `/home/personal/tools/saved-runs?toolRunId=${encodeURIComponent(sourceToolRunId)}`
    : `${basePath}/grows`;
  const preferSourceBack = returnsToPersonalPlantId;
  const auth = useAuth();
  const entitlements = useEntitlements();
  const hasCreateCapability =
    workspace === "commercial" || entitlements.can(CAPABILITY_KEYS.GROWS_PERSONAL_WRITE);
  const maxGrows = Number(entitlements.limits?.maxGrows ?? 0);
  const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const aiSource = firstParam(params.source).toLowerCase() === "ai";
  const requestedPreset = firstParam(params.systemPreset).toLowerCase();
  const initialProfileTags = React.useMemo(
    () => flattenGrowInterests(auth.user?.growInterests || {}),
    [auth.user?.growInterests]
  );
  const profileCannabisContext = React.useMemo(
    () => initialProfileTags.some((tag) => /cannabis|hemp/i.test(tag)),
    [initialProfileTags]
  );
  const initialQueryTags = React.useMemo(
    () => commaList(params.growTags),
    [params.growTags]
  );
  const initialInterestSelections = React.useMemo(
    () =>
      mergeTierSelections(
        groupTagsByTier(initialProfileTags) as Record<string, string[]>,
        groupTagsByTier(initialQueryTags) as Record<string, string[]>
      ),
    [initialProfileTags, initialQueryTags]
  );
  const baseInterestOptionsOverride = React.useMemo(() => {
    const overrides: Record<string, string[]> = {};
    for (const tier of INTEREST_TIERS) {
      const profileValues = Array.isArray(auth.user?.growInterests?.[tier.id])
        ? auth.user.growInterests[tier.id]
        : [];
      const selectedValues = initialInterestSelections[tier.id] || [];
      const allowed = Array.from(new Set([...profileValues, ...selectedValues]));
      if (allowed.length) overrides[tier.id] = allowed;
    }
    return overrides;
  }, [auth.user?.growInterests, initialInterestSelections]);

  const [name, setName] = React.useState(firstParam(params.name));
  const [systemPreset, setSystemPreset] = React.useState<SystemPreset>(
    requestedPreset === "coco" || requestedPreset === "hydro" ? requestedPreset : "soil"
  );
  const [anchorDateType, setAnchorDateType] = React.useState<AnchorType>("vegStart");
  const [anchorDate, setAnchorDate] = React.useState(firstParam(params.anchorDate));
  const [timeZone, setTimeZone] = React.useState(defaultTimeZone);
  const [startType, setStartType] = React.useState(
    firstParam(params.startType) || "seed"
  );
  const [plannedPlantCount, setPlannedPlantCount] = React.useState(
    firstParam(params.plantCount) || "1"
  );
  const [vegLengthWeeks, setVegLengthWeeks] = React.useState(
    firstParam(params.vegLengthWeeks) ||
      (/cannabis|hemp/i.test(firstParam(params.cropCommonName)) ||
      (!firstParam(params.cropCommonName) && profileCannabisContext)
        ? "4"
        : "")
  );
  const [expectedFlowerDays, setExpectedFlowerDays] = React.useState(
    firstParam(params.expectedFlowerDays) ||
      (/cannabis|hemp/i.test(firstParam(params.cropCommonName)) ||
      (!firstParam(params.cropCommonName) && profileCannabisContext)
        ? "63"
        : "")
  );
  const [growInterestSelections, setGrowInterestSelections] = React.useState<
    Record<string, string[]>
  >(initialInterestSelections);

  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [startDate, setStartDate] = React.useState("");
  const [germinationDate, setGerminationDate] = React.useState("");
  const [cloneCutDate, setCloneCutDate] = React.useState("");
  const [transplantDate, setTransplantDate] = React.useState("");
  const [flipDate, setFlipDate] = React.useState("");
  const [flowerDay1Date, setFlowerDay1Date] = React.useState("");
  const [expectedHarvestDate, setExpectedHarvestDate] = React.useState("");
  const [actualHarvestDate, setActualHarvestDate] = React.useState("");
  const [dryStartDate, setDryStartDate] = React.useState("");
  const [cureStartDate, setCureStartDate] = React.useState("");
  const [potSize, setPotSize] = React.useState("");
  const [potCount, setPotCount] = React.useState("");
  const [cultivar, setCultivar] = React.useState(firstParam(params.cultivar));
  const [cropCommonName, setCropCommonName] = React.useState(
    firstParam(params.cropCommonName)
  );
  const [scientificName, setScientificName] = React.useState(
    firstParam(params.scientificName)
  );
  const [commonNames, setCommonNames] = React.useState(
    commaList(params.commonNames).join(", ")
  );
  const [cropProfileId, setCropProfileId] = React.useState(
    firstParam(params.cropProfileId)
  );
  const [cropProfileLabel, setCropProfileLabel] = React.useState("");
  const [profileSearching, setProfileSearching] = React.useState(false);
  const [lifeSpanPath, setLifeSpanPath] = React.useState<LifeSpanPath>("unknown");
  const [productionPattern, setProductionPattern] =
    React.useState<ProductionPattern>("unknown");
  const [dormancyPattern, setDormancyPattern] = React.useState("unknown");
  const [lifecycleGuidance, setLifecycleGuidance] = React.useState<string[]>([]);
  const [lifecycleQuestions, setLifecycleQuestions] = React.useState<string[]>([]);
  const [lifecycleGuidanceSourceIds, setLifecycleGuidanceSourceIds] = React.useState<
    string[]
  >([]);
  const [targetVpdBand, setTargetVpdBand] = React.useState("");
  const [notes, setNotes] = React.useState(firstParam(params.notes));
  const [photos, setPhotos] = React.useState<SelectedPhoto[]>([]);
  const [photoUrl, setPhotoUrl] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [checkingLimit, setCheckingLimit] = React.useState(true);
  const [existingGrowCount, setExistingGrowCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [createdGrowId, setCreatedGrowId] = React.useState("");

  const cropSpecificSetup = Boolean(cropCommonName.trim() || scientificName.trim());
  const explicitCannabisCrop = /cannabis|hemp/i.test(
    `${cropCommonName} ${scientificName}`
  );
  const showCannabisPlanning =
    explicitCannabisCrop || (!cropSpecificSetup && profileCannabisContext);
  const interestOptionsOverride = React.useMemo(() => {
    if (showCannabisPlanning) return baseInterestOptionsOverride;
    const filtered: Record<string, string[]> = {};
    for (const tier of INTEREST_TIERS) {
      const options = baseInterestOptionsOverride[tier.id] ?? tier.options;
      filtered[tier.id] = options.filter(
        (option) => !CANNABIS_ONLY_INTERESTS.has(option)
      );
    }
    return filtered;
  }, [baseInterestOptionsOverride, showCannabisPlanning]);
  const adjustedGenericTimingForCrop = React.useRef(false);

  React.useEffect(() => {
    if (
      adjustedGenericTimingForCrop.current ||
      !cropSpecificSetup ||
      explicitCannabisCrop
    ) {
      return;
    }
    adjustedGenericTimingForCrop.current = true;
    setVegLengthWeeks((current) => (current === "4" ? "" : current));
    setExpectedFlowerDays((current) => (current === "63" ? "" : current));
  }, [cropCommonName, cropSpecificSetup, explicitCannabisCrop]);

  const matchCropProfile = React.useCallback(async () => {
    const query = scientificName.trim() || cropCommonName.trim();
    if (!query || profileSearching) return;
    setProfileSearching(true);
    setError(null);
    try {
      const profiles: any[] = await listCropProfiles({ q: query, limit: 5 });
      const normalizedScientificName = scientificName.trim().toLowerCase();
      const normalizedCommonName = cropCommonName.trim().toLowerCase();
      const exact =
        profiles.find(
          (profile) =>
            (normalizedScientificName &&
              String(profile.scientificName || "").toLowerCase() ===
                normalizedScientificName) ||
            (normalizedCommonName &&
              String(profile.displayName || "").toLowerCase() === normalizedCommonName) ||
            (normalizedCommonName &&
              (Array.isArray(profile.commonNames) ? profile.commonNames : []).some(
                (item: unknown) =>
                  String(item || "").toLowerCase() === normalizedCommonName
              ))
        ) || profiles[0];
      if (!exact?._id && !exact?.id) {
        const reviewedLifecycle = findReviewedCropLifecycle({
          scientificName,
          commonName: cropCommonName
        });
        setCropProfileId("");
        if (reviewedLifecycle) {
          setCropProfileLabel(`${reviewedLifecycle.scientificName} (reviewed lifecycle)`);
          setLifeSpanPath(reviewedLifecycle.lifeSpanPath);
          setProductionPattern(reviewedLifecycle.productionPattern);
          setDormancyPattern(reviewedLifecycle.dormancyPattern);
          setLifecycleGuidance(reviewedLifecycle.guidance);
          setLifecycleQuestions(reviewedLifecycle.requiredQuestions);
          setLifecycleGuidanceSourceIds(reviewedLifecycle.sourceIds);
          setError(null);
        } else {
          setCropProfileLabel("");
          setLifecycleGuidance([]);
          setLifecycleQuestions([]);
          setLifecycleGuidanceSourceIds([]);
          setError(
            "No reviewed crop profile matched. Keep lifecycle fields as Not sure until reviewed crop guidance is available."
          );
        }
        return;
      }
      setCropProfileId(String(exact._id || exact.id));
      setCropProfileLabel(
        `${exact.displayName || cropCommonName || scientificName}${
          exact.curationStatus ? ` (${exact.curationStatus})` : ""
        }`
      );
      if (!cropCommonName.trim() && exact.displayName) {
        setCropCommonName(String(exact.displayName));
      }
      if (!scientificName.trim() && exact.scientificName) {
        setScientificName(String(exact.scientificName));
      }
      if (!commonNames.trim() && Array.isArray(exact.commonNames)) {
        setCommonNames(exact.commonNames.map(String).filter(Boolean).join(", "));
      }
      if (
        [
          "annual",
          "biennial",
          "short_lived_perennial",
          "long_lived_perennial",
          "continuous_tropical"
        ].includes(String(exact.lifeSpanPath || ""))
      ) {
        setLifeSpanPath(exact.lifeSpanPath as LifeSpanPath);
      }
      if (
        [
          "single_harvest",
          "repeat_harvest",
          "seasonal_perennial",
          "continuous",
          "non_harvest_observation"
        ].includes(String(exact.productionPattern || ""))
      ) {
        setProductionPattern(exact.productionPattern as ProductionPattern);
      }
      if (["none", "seasonal", "climate_dependent"].includes(exact.dormancyPattern)) {
        setDormancyPattern(exact.dormancyPattern);
      }
      setLifecycleGuidance(
        Array.isArray(exact.lifecycleGuidance) ? exact.lifecycleGuidance : []
      );
      setLifecycleQuestions(
        Array.isArray(exact.lifecycleQuestions) ? exact.lifecycleQuestions : []
      );
      setLifecycleGuidanceSourceIds(
        Array.isArray(exact.lifecycleGuidanceSourceIds)
          ? exact.lifecycleGuidanceSourceIds
          : []
      );
    } catch {
      setError("Unable to match crop guidance right now. You can still save the grow.");
    } finally {
      setProfileSearching(false);
    }
  }, [commonNames, cropCommonName, profileSearching, scientificName]);

  const isValid = name.trim().length > 0 && anchorDate.trim().length > 0;
  const canCreateGrow =
    hasCreateCapability &&
    !checkingLimit &&
    (maxGrows <= 0 || existingGrowCount < maxGrows);

  React.useEffect(() => {
    let alive = true;
    async function loadLimit() {
      if (!hasCreateCapability) {
        if (alive) {
          setExistingGrowCount(0);
          setCheckingLimit(false);
        }
        return;
      }
      setCheckingLimit(true);
      try {
        const rows = await listWorkspaceGrows(workspace);
        if (alive) setExistingGrowCount(Array.isArray(rows) ? rows.length : 0);
      } catch {
        if (alive) setExistingGrowCount(maxGrows || 0);
      } finally {
        if (alive) setCheckingLimit(false);
      }
    }

    loadLimit();
    return () => {
      alive = false;
    };
  }, [hasCreateCapability, maxGrows, workspace]);

  const pickPhotos = React.useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo-library permission is required to attach images.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.8
    });

    if (picked.canceled) return;

    setPhotos((current) => [
      ...current,
      ...picked.assets
        .filter((asset) => asset.uri)
        .map((asset) => ({
          uri: asset.uri,
          width: asset.width ?? null,
          height: asset.height ?? null,
          mimeType: asset.mimeType ?? null,
          sizeBytes: asset.fileSize ?? null
        }))
    ]);
    setError(null);
  }, []);

  const addPhotoUrl = React.useCallback(() => {
    const uri = photoUrl.trim();
    if (!uri) return;
    if (!isPersistedImageUri(uri)) {
      setError("Paste a saved image URL or /uploads/... path.");
      return;
    }

    setPhotos((current) => [
      ...current,
      { uri, width: null, height: null, mimeType: null, sizeBytes: null }
    ]);
    setPhotoUrl("");
    setError(null);
  }, [photoUrl]);

  const onCreate = React.useCallback(async () => {
    if (!isValid) {
      setError("Name and anchor date are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const uploadedPhotos = await persistImageUris(photos.map((photo) => photo.uri));
      const growTags = flattenTierSelections(growInterestSelections);
      const created = await createWorkspaceGrow(workspace, {
        name: name.trim(),
        growTags,
        growInterests: growInterestSelections,
        cropTypes: growInterestSelections.crops || [],
        environmentTypes: growInterestSelections.environment || [],
        growingMethods: growInterestSelections.methods || [],
        draftSource: aiSource ? "ai_assistant" : "manual",
        planning: {
          startType,
          plantCount: Number(plannedPlantCount) || 1,
          vegLengthWeeks: vegLengthWeeks.trim() ? Number(vegLengthWeeks) : undefined,
          expectedFlowerDays: expectedFlowerDays.trim()
            ? Number(expectedFlowerDays)
            : undefined,
          createStarterCalendar: true,
          lifeSpanPath,
          productionPattern,
          dormancyPattern,
          lifecycleGuidanceSourceIds
        },
        systemPreset,
        anchorDateType,
        anchorDate: anchorDate.trim(),
        timezone: timeZone.trim() || "UTC",
        startDate: startDate.trim() || undefined,
        germinationDate: germinationDate.trim() || undefined,
        cloneCutDate: cloneCutDate.trim() || undefined,
        transplantDate: transplantDate.trim() || undefined,
        flipDate: flipDate.trim() || undefined,
        flowerDay1Date: flowerDay1Date.trim() || undefined,
        expectedHarvestDate: expectedHarvestDate.trim() || undefined,
        actualHarvestDate: actualHarvestDate.trim() || undefined,
        dryStartDate: dryStartDate.trim() || undefined,
        cureStartDate: cureStartDate.trim() || undefined,
        potSize: potSize.trim() || undefined,
        potCount: potCount ? Number(potCount) : undefined,
        cultivar: cultivar.trim() || undefined,
        cropCommonName: cropCommonName.trim() || undefined,
        scientificName: scientificName.trim() || undefined,
        commonNames: commonNames
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        cropProfileId: cropProfileId || undefined,
        cropIdentity: cropCommonName.trim()
          ? {
              commonName: cropCommonName.trim(),
              scientificName: scientificName.trim() || undefined,
              commonNames: commonNames
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              cultivarOrStrain: cultivar.trim() || undefined,
              confidence: "user_confirmed",
              sourceToolRunId: firstParam(params.sourceToolRunId) || null,
              userConfirmed: true
            }
          : undefined,
        targetVpdBand: targetVpdBand.trim() || undefined,
        photos: uploadedPhotos,
        photoMetadata: uploadedPhotos.map((url, index) => ({
          url,
          mimeType: photos[index]?.mimeType || null,
          width: photos[index]?.width || null,
          height: photos[index]?.height || null,
          sizeBytes: photos[index]?.sizeBytes || null,
          source: "grow-create"
        })),
        notes: notes.trim() || undefined
      });

      const createdId = String((created as any)?._id || created?.id || "");
      if (createdId && uploadedPhotos.length) {
        await appendWorkspaceGrowPhotos(workspace, createdId, uploadedPhotos);
      }
      if (createdId) {
        setCreatedGrowId(createdId);
      } else {
        router.replace(`${basePath}/grows?r=${Date.now()}` as any);
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to create grow.");
    } finally {
      setSaving(false);
    }
  }, [
    anchorDate,
    anchorDateType,
    cultivar,
    commonNames,
    cropCommonName,
    cropProfileId,
    actualHarvestDate,
    cloneCutDate,
    cureStartDate,
    dryStartDate,
    expectedHarvestDate,
    flipDate,
    flowerDay1Date,
    germinationDate,
    growInterestSelections,
    isValid,
    name,
    notes,
    photos,
    potCount,
    potSize,
    router,
    startDate,
    systemPreset,
    targetVpdBand,
    transplantDate,
    timeZone,
    aiSource,
    expectedFlowerDays,
    plannedPlantCount,
    lifeSpanPath,
    productionPattern,
    dormancyPattern,
    lifecycleGuidanceSourceIds,
    startType,
    vegLengthWeeks,
    scientificName,
    params.sourceToolRunId,
    basePath,
    workspace
  ]);

  function openCreated(path: string) {
    if (!createdGrowId) return;
    router.replace(path as any);
  }

  function DateInput({
    label,
    value,
    onChangeText,
    accessibilityLabel,
    testID
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    accessibilityLabel: string;
    testID?: string;
  }) {
    return (
      <CalendarDateField
        testID={testID}
        label={label}
        value={value}
        onChange={onChangeText}
        placeholder="Choose date"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  if (checkingLimit && hasCreateCapability) {
    return (
      <ScreenBoundary
        title="New Grow"
        showBack
        backFallbackHref={backTarget}
        preferBackFallback={preferSourceBack}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: palette.page }}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        >
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: "700" }}>
            New Grow
          </Text>
          <ActivityIndicator color={palette.accent} />
          <Text style={{ color: palette.textMuted }}>Checking grow limit...</Text>
        </ScrollView>
      </ScreenBoundary>
    );
  }

  if (!canCreateGrow) {
    return (
      <ScreenBoundary
        title="New Grow"
        showBack
        backFallbackHref={backTarget}
        preferBackFallback={preferSourceBack}
      >
        <LockedScreen
          title={maxGrows === 1 ? "Free grow limit reached" : "Grow limit reached"}
          message={
            maxGrows === 1
              ? "Free includes one active grow. Upgrade to Pro to create up to 10 active grows."
              : `This plan includes up to ${maxGrows} active grows. Upgrade to create more.`
          }
        />
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title="New Grow"
      showBack
      backFallbackHref={backTarget}
      preferBackFallback={preferSourceBack}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: palette.page }}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
      >
        <Text style={{ color: palette.text, fontSize: 22, fontWeight: "700" }}>
          New Grow
        </Text>
        <Text style={{ color: palette.textMuted }}>
          Set required anchors so logs, tools, and tasks can map to this grow correctly.
        </Text>
        {aiSource ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: palette.success,
              borderRadius: radius.card,
              padding: 12,
              backgroundColor: palette.accentSoft
            }}
          >
            <Text style={{ color: palette.accent, fontWeight: "800" }}>
              AI-assisted grow draft
            </Text>
            <Text style={{ color: palette.textMuted, marginTop: 4 }}>
              Review every prefilled field before saving. AI does not create the grow
              until you confirm here.
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask AI to build a grow draft"
            onPress={() =>
              router.push(
                `${workspace === "commercial" ? `${basePath}/tools/ask-ai` : `${basePath}/ai`}?prompt=Help%20me%20build%20a%20new%20grow%20from%20my%20grow%20interests` as any
              )
            }
            style={{
              alignSelf: "flex-start",
              borderWidth: 1,
              borderColor: palette.accent,
              borderRadius: radius.card,
              paddingHorizontal: 12,
              paddingVertical: 9,
              backgroundColor: palette.accentSoft
            }}
          >
            <Text style={{ color: palette.accent, fontWeight: "800" }}>
              Build this grow with AI
            </Text>
          </Pressable>
        )}
        <PersonalFeedPlacement placement="top" routeKey="personal_new_grow" longContent />

        {error ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: palette.danger,
              borderRadius: radius.card,
              padding: 10,
              backgroundColor: palette.surfaceMuted
            }}
          >
            <Text style={{ color: palette.danger, fontWeight: "700" }}>{error}</Text>
          </View>
        ) : null}

        <Text style={{ color: palette.text, fontWeight: "700" }}>Grow name</Text>
        <TextInput
          testID="input-grow-name"
          value={name}
          onChangeText={setName}
          placeholder="Blueberry Muffin Run 3"
          accessibilityLabel="Grow name"
          style={{
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: radius.card,
            backgroundColor: palette.surface,
            color: palette.text,
            paddingHorizontal: 12,
            paddingVertical: 10
          }}
        />

        <View
          style={{
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: radius.card,
            padding: 12,
            gap: 9,
            backgroundColor: palette.surface
          }}
        >
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: "900" }}>
            Crop identity and guidance
          </Text>
          <Text style={{ color: palette.textMuted }}>
            Choose the crop first—tomatoes, herbs, houseplants, and other crops should not
            inherit cannabis-only timing. A confirmed Plant ID can prefill these fields
            automatically.
          </Text>
          <TextInput
            value={cropCommonName}
            onChangeText={(value) => {
              setCropCommonName(value);
              setCropProfileId("");
              setCropProfileLabel("");
            }}
            placeholder="Tomato"
            accessibilityLabel="Crop common name"
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: radius.card,
              backgroundColor: palette.surfaceMuted,
              color: palette.text,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />
          <TextInput
            value={scientificName}
            onChangeText={(value) => {
              setScientificName(value);
              setCropProfileId("");
              setCropProfileLabel("");
            }}
            placeholder="Solanum lycopersicum (optional)"
            accessibilityLabel="Crop scientific name"
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: radius.card,
              backgroundColor: palette.surfaceMuted,
              color: palette.text,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />
          <TextInput
            value={commonNames}
            onChangeText={setCommonNames}
            placeholder="Other names, comma separated"
            accessibilityLabel="Other crop names"
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: radius.card,
              backgroundColor: palette.surfaceMuted,
              color: palette.text,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Match crop profile"
              disabled={!cropSpecificSetup || profileSearching}
              onPress={matchCropProfile}
              style={{
                borderWidth: 1,
                borderColor: palette.accent,
                borderRadius: radius.card,
                paddingHorizontal: 12,
                paddingVertical: 9,
                opacity: !cropSpecificSetup || profileSearching ? 0.5 : 1
              }}
            >
              <Text style={{ color: palette.accent, fontWeight: "800" }}>
                {profileSearching ? "Matching..." : "Match crop guidance"}
              </Text>
            </Pressable>
            {cropSpecificSetup ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ask AI for crop setup help"
                onPress={() => {
                  const crop = scientificName.trim() || cropCommonName.trim();
                  router.push(
                    `${workspace === "commercial" ? `${basePath}/tools/ask-ai` : `${basePath}/ai`}?prompt=${encodeURIComponent(
                      `Help me set up a new grow for ${crop}. Use reviewed crop-specific guidance, explain uncertain inputs, and leave unknown facts for me to confirm.`
                    )}` as any
                  );
                }}
                style={{
                  borderWidth: 1,
                  borderColor: palette.accent,
                  borderRadius: radius.card,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  backgroundColor: palette.accentSoft
                }}
              >
                <Text style={{ color: palette.accent, fontWeight: "800" }}>
                  Get crop setup help
                </Text>
              </Pressable>
            ) : null}
          </View>
          {cropProfileLabel ? (
            <Text style={{ color: palette.success, fontWeight: "800" }}>
              Matched: {cropProfileLabel}. Review all suggested settings before saving.
            </Text>
          ) : null}
          <Text style={{ color: palette.text, fontWeight: "800" }}>
            Plant lifespan path
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              ["unknown", "Not sure"],
              ["annual", "Annual / one season"],
              ["biennial", "Biennial / two seasons"],
              ["short_lived_perennial", "Short-lived perennial"],
              ["long_lived_perennial", "Long-lived perennial / woody"],
              ["continuous_tropical", "Continuous indoor / tropical"],
              ["finite_cycle", "Finite production cycle / non-plant"],
              ["climate_dependent_perennial", "Tender perennial / climate-dependent"]
            ].map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Plant lifespan ${label}`}
                onPress={() => setLifeSpanPath(value as LifeSpanPath)}
                style={{
                  borderWidth: 1,
                  borderColor: lifeSpanPath === value ? palette.accent : palette.border,
                  borderRadius: 999,
                  backgroundColor:
                    lifeSpanPath === value ? palette.accent : palette.surfaceMuted,
                  paddingHorizontal: 10,
                  paddingVertical: 7
                }}
              >
                <Text
                  style={{
                    color: lifeSpanPath === value ? palette.accentText : palette.text
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: palette.text, fontWeight: "800" }}>
            Harvest or observation pattern
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              ["unknown", "Not sure"],
              ["single_harvest", "One main harvest"],
              ["repeat_harvest", "Repeated picking / flushes"],
              ["seasonal_perennial", "Seasonal harvest each year"],
              ["continuous", "Continuous production"],
              ["non_harvest_observation", "Observation / no harvest"],
              ["cultivar_dependent", "Depends on cultivar / growth habit"]
            ].map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Production pattern ${label}`}
                onPress={() => setProductionPattern(value as ProductionPattern)}
                style={{
                  borderWidth: 1,
                  borderColor:
                    productionPattern === value ? palette.accent : palette.border,
                  borderRadius: 999,
                  backgroundColor:
                    productionPattern === value ? palette.accent : palette.surfaceMuted,
                  paddingHorizontal: 10,
                  paddingVertical: 7
                }}
              >
                <Text
                  style={{
                    color: productionPattern === value ? palette.accentText : palette.text
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {lifecycleGuidance.length ? (
            <View style={{ gap: 4 }}>
              <Text style={{ color: palette.text, fontWeight: "900" }}>
                Reviewed crop guidance
              </Text>
              {lifecycleGuidance.map((item) => (
                <Text key={item} style={{ color: palette.textMuted }}>
                  • {item}
                </Text>
              ))}
              {lifecycleQuestions.map((item) => (
                <Text key={item} style={{ color: palette.accent }}>
                  Needed: {item}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={{ color: palette.text, fontWeight: "800" }}>Dormancy</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              ["unknown", "Not sure"],
              ["none", "No planned dormancy"],
              ["seasonal", "Seasonal dormancy"],
              ["climate_dependent", "Depends on climate / location"]
            ].map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Dormancy ${label}`}
                onPress={() => setDormancyPattern(value)}
                style={{
                  borderWidth: 1,
                  borderColor:
                    dormancyPattern === value ? palette.accent : palette.border,
                  borderRadius: 999,
                  backgroundColor:
                    dormancyPattern === value ? palette.accent : palette.surfaceMuted,
                  paddingHorizontal: 10,
                  paddingVertical: 7
                }}
              >
                <Text
                  style={{
                    color: dormancyPattern === value ? palette.accentText : palette.text
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: palette.success,
            borderRadius: radius.card,
            padding: 12,
            gap: 9,
            backgroundColor: palette.accentSoft
          }}
        >
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: "900" }}>
            Grow Planner / Auto Calendar
          </Text>
          <Text style={{ color: palette.textMuted }}>
            These setup answers prefill the shared calendar tool after this grow is saved.
            The calendar tool creates real starter tasks; this form does not duplicate it.
          </Text>
          <Text style={{ color: palette.text, fontWeight: "700" }}>
            How are you starting?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              ["seed", "seed"],
              ["clone", "clone / cutting"],
              ["transplant", "transplant"],
              ["existing plant", "existing plant"],
              ["culture_spawn", "culture / spawn / inoculated block"]
            ].map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Grow start type ${label}`}
                onPress={() => setStartType(value)}
                style={{
                  borderWidth: 1,
                  borderColor: startType === value ? palette.accent : palette.border,
                  borderRadius: 999,
                  backgroundColor: startType === value ? palette.accent : palette.surface,
                  paddingHorizontal: 10,
                  paddingVertical: 7
                }}
              >
                <Text
                  style={{
                    color: startType === value ? palette.accentText : palette.text
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              ["Plant count", plannedPlantCount, setPlannedPlantCount],
              [
                showCannabisPlanning ? "Veg length (weeks)" : "Establishment weeks",
                vegLengthWeeks,
                setVegLengthWeeks
              ],
              [
                showCannabisPlanning
                  ? "Expected flower days"
                  : "Expected days to first harvest",
                expectedFlowerDays,
                setExpectedFlowerDays
              ]
            ].map(([label, value, setter]) => (
              <View key={String(label)} style={{ flex: 1, minWidth: 150, gap: 4 }}>
                <Text style={{ color: palette.text, fontWeight: "700" }}>
                  {String(label)}
                </Text>
                <TextInput
                  value={String(value)}
                  onChangeText={setter as (text: string) => void}
                  keyboardType="numeric"
                  accessibilityLabel={String(label)}
                  style={{
                    borderWidth: 1,
                    borderColor: palette.border,
                    borderRadius: radius.card,
                    backgroundColor: palette.surface,
                    color: palette.text,
                    paddingHorizontal: 10,
                    paddingVertical: 9
                  }}
                />
              </View>
            ))}
          </View>
          <Text style={{ color: palette.accent, fontWeight: "800" }}>
            Next: save the grow, then confirm Create Grow Calendar to generate tasks.
          </Text>
        </View>

        <GrowInterestPicker
          title="What are you growing and how?"
          helperText="This grow starts from your profile interests. These choices drive tools, AI context, courses, and forum discovery."
          value={growInterestSelections}
          onChange={setGrowInterestSelections}
          tierOptionsOverride={interestOptionsOverride}
          enabledTierIds={INTEREST_TIERS.map((tier) => tier.id)}
          collapsible={false}
        />

        <Text style={{ color: palette.text, fontWeight: "700" }}>System preset</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["soil", "coco", "hydro"] as SystemPreset[]).map((preset) => (
            <Pressable
              key={preset}
              onPress={() => setSystemPreset(preset)}
              accessibilityRole="button"
              accessibilityLabel={`System preset ${preset}`}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: systemPreset === preset ? palette.accent : palette.border,
                backgroundColor:
                  systemPreset === preset ? palette.accent : palette.surface
              }}
            >
              <Text
                style={{
                  color: systemPreset === preset ? palette.accentText : palette.text
                }}
              >
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ color: palette.text, fontWeight: "700" }}>Anchor type</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              {
                key: "vegStart",
                label: showCannabisPlanning ? "Veg start" : "Grow / establishment start"
              },
              {
                key: "flowerDay1",
                label: showCannabisPlanning
                  ? "Flower day 1"
                  : "First flowering / fruiting stage"
              }
            ] as { key: AnchorType; label: string }[]
          ).map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setAnchorDateType(opt.key)}
              accessibilityRole="button"
              accessibilityLabel={`Anchor type ${opt.label}`}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: anchorDateType === opt.key ? palette.accent : palette.border,
                backgroundColor:
                  anchorDateType === opt.key ? palette.accent : palette.surface
              }}
            >
              <Text
                style={{
                  color: anchorDateType === opt.key ? palette.accentText : palette.text
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <DateInput
          label="Anchor date"
          value={anchorDate}
          onChangeText={setAnchorDate}
          accessibilityLabel="Anchor date"
          testID="input-grow-anchor-date"
        />

        <Text style={{ color: palette.text, fontWeight: "700" }}>Timezone</Text>
        <TextInput
          value={timeZone}
          onChangeText={setTimeZone}
          placeholder="America/New_York"
          accessibilityLabel="Timezone"
          style={{
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: radius.card,
            backgroundColor: palette.surface,
            color: palette.text,
            paddingHorizontal: 12,
            paddingVertical: 10
          }}
        />

        <View style={{ gap: 8, marginTop: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10
            }}
          >
            <Text style={{ color: palette.text, fontWeight: "700" }}>Grow photos</Text>
            <Pressable
              onPress={pickPhotos}
              accessibilityRole="button"
              accessibilityLabel="Attach grow photos"
              style={{
                borderWidth: 1,
                borderColor: palette.accent,
                borderRadius: radius.card,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: palette.accentSoft
              }}
            >
              <Text style={{ color: palette.accent, fontWeight: "800" }}>
                {photos.length ? "Add More Photos" : "Attach Photos"}
              </Text>
            </Pressable>
          </View>
          {photos.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {photos.map((photo, index) => (
                <View
                  key={`${photo.uri}-${index}`}
                  style={{
                    width: 92,
                    borderWidth: 1,
                    borderColor: palette.border,
                    borderRadius: radius.card,
                    overflow: "hidden",
                    backgroundColor: palette.surfaceMuted
                  }}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    accessibilityLabel={`Attached grow photo ${index + 1}`}
                    style={{
                      width: "100%",
                      height: 72,
                      backgroundColor: palette.surfaceStrong
                    }}
                  />
                  <Pressable
                    onPress={() =>
                      setPhotos((current) => current.filter((_, i) => i !== index))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove attached grow photo ${index + 1}`}
                    style={{ padding: 6, alignItems: "center" }}
                  >
                    <Text
                      style={{ color: palette.danger, fontSize: 12, fontWeight: "800" }}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: palette.textMuted }}>
              Attach setup photos now so the grow starts with visual history.
            </Text>
          )}
          <TextInput
            value={photoUrl}
            onChangeText={setPhotoUrl}
            placeholder="/uploads/grow-photo.jpg or https://..."
            accessibilityLabel="Grow photo URL"
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: radius.card,
              backgroundColor: palette.surface,
              color: palette.text,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />
          <Pressable
            onPress={addPhotoUrl}
            disabled={!photoUrl.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add grow photo URL"
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              borderRadius: radius.card,
              padding: 10,
              alignSelf: "flex-start",
              opacity: photoUrl.trim() ? 1 : 0.5
            }}
          >
            <Text style={{ color: palette.text, fontWeight: "700" }}>Add photo URL</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setShowAdvanced((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={
            showAdvanced ? "Hide advanced fields" : "Show advanced fields"
          }
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: radius.card,
            padding: 10
          }}
        >
          <Text style={{ color: palette.text, fontWeight: "700" }}>
            {showAdvanced ? "Hide advanced fields" : "Show advanced fields"}
          </Text>
        </Pressable>
        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_new_grow"
          longContent
        />

        {showAdvanced ? (
          <View style={{ gap: 10 }}>
            <DateInput
              label="Start date (optional)"
              value={startDate}
              onChangeText={setStartDate}
              accessibilityLabel="Start date"
            />
            <DateInput
              label="Germination date (optional)"
              value={germinationDate}
              onChangeText={setGerminationDate}
              accessibilityLabel="Germination date"
            />
            <DateInput
              label="Clone cut date (optional)"
              value={cloneCutDate}
              onChangeText={setCloneCutDate}
              accessibilityLabel="Clone cut date"
            />
            <DateInput
              label="Transplant date (optional)"
              value={transplantDate}
              onChangeText={setTransplantDate}
              accessibilityLabel="Transplant date"
            />
            {showCannabisPlanning ? (
              <>
                <DateInput
                  label="Flip date (optional)"
                  value={flipDate}
                  onChangeText={setFlipDate}
                  accessibilityLabel="Flip date"
                />
                <DateInput
                  label="Flower day 1 (optional)"
                  value={flowerDay1Date}
                  onChangeText={setFlowerDay1Date}
                  accessibilityLabel="Flower day 1"
                />
              </>
            ) : null}
            <DateInput
              label="Expected harvest date (optional)"
              value={expectedHarvestDate}
              onChangeText={setExpectedHarvestDate}
              accessibilityLabel="Expected harvest date"
            />
            <DateInput
              label="Actual harvest date (optional)"
              value={actualHarvestDate}
              onChangeText={setActualHarvestDate}
              accessibilityLabel="Actual harvest date"
            />
            <DateInput
              label="Dry start date (optional)"
              value={dryStartDate}
              onChangeText={setDryStartDate}
              accessibilityLabel="Dry start date"
            />
            {showCannabisPlanning ? (
              <DateInput
                label="Cure start date (optional)"
                value={cureStartDate}
                onChangeText={setCureStartDate}
                accessibilityLabel="Cure start date"
              />
            ) : null}

            <Text style={{ color: palette.text, fontWeight: "700" }}>
              Pot size (optional)
            </Text>
            <TextInput
              value={potSize}
              onChangeText={setPotSize}
              placeholder="5 gal"
              accessibilityLabel="Pot size"
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: radius.card,
                backgroundColor: palette.surface,
                color: palette.text,
                paddingHorizontal: 12,
                paddingVertical: 10
              }}
            />

            <Text style={{ color: palette.text, fontWeight: "700" }}>
              Pot count (optional)
            </Text>
            <TextInput
              value={potCount}
              onChangeText={setPotCount}
              placeholder="4"
              keyboardType="numeric"
              accessibilityLabel="Pot count"
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: radius.card,
                backgroundColor: palette.surface,
                color: palette.text,
                paddingHorizontal: 12,
                paddingVertical: 10
              }}
            />

            <Text style={{ color: palette.text, fontWeight: "700" }}>
              Cultivar (optional)
            </Text>
            <TextInput
              value={cultivar}
              onChangeText={setCultivar}
              placeholder="Blue Dream"
              accessibilityLabel="Cultivar"
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: radius.card,
                backgroundColor: palette.surface,
                color: palette.text,
                paddingHorizontal: 12,
                paddingVertical: 10
              }}
            />

            <Text style={{ color: palette.text, fontWeight: "700" }}>
              Target VPD band (optional)
            </Text>
            <TextInput
              value={targetVpdBand}
              onChangeText={setTargetVpdBand}
              placeholder="0.9-1.2 kPa"
              accessibilityLabel="Target VPD band"
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: radius.card,
                backgroundColor: palette.surface,
                color: palette.text,
                paddingHorizontal: 12,
                paddingVertical: 10
              }}
            />

            <Text style={{ color: palette.text, fontWeight: "700" }}>
              Notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any setup notes"
              multiline
              accessibilityLabel="Grow notes"
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: radius.card,
                backgroundColor: palette.surface,
                color: palette.text,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minHeight: 80,
                textAlignVertical: "top"
              }}
            />
          </View>
        ) : null}

        <Pressable
          testID="btn-save-grow"
          onPress={onCreate}
          disabled={saving || !isValid}
          accessibilityRole="button"
          accessibilityLabel="Create grow"
          style={{
            marginTop: 16,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: palette.accent,
            borderRadius: radius.card,
            backgroundColor: palette.accent,
            opacity: saving || !isValid ? 0.6 : 1,
            alignSelf: "flex-start"
          }}
        >
          {saving ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={{ color: palette.accentText, fontWeight: "700" }}>
              Create grow
            </Text>
          )}
        </Pressable>
        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_new_grow"
          longContent
        />
        <Modal visible={Boolean(createdGrowId)} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              position: Platform.OS === "web" ? ("fixed" as any) : "relative",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 1000,
              backgroundColor: "rgba(15, 23, 42, 0.35)",
              justifyContent: "center",
              alignItems: "center",
              padding: 20
            }}
          >
            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: radius.card,
                padding: 18,
                gap: 10,
                width: "100%",
                maxWidth: 560,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOpacity: 0.22,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 12 },
                elevation: 12
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "900", color: palette.text }}>
                Grow created: {name.trim()}
              </Text>
              <Text style={{ color: palette.textMuted, lineHeight: 20 }}>
                Choose the next step so this grow immediately has plants, logs, tasks, or
                AI context attached.
              </Text>
              {[
                ["Add Plants", `${basePath}/grows/${createdGrowId}/plants`],
                [
                  "Create First Journal Entry",
                  `${basePath}/logs/new?growId=${encodeURIComponent(createdGrowId)}`
                ],
                [
                  "Create Grow Calendar",
                  `${basePath}/tools/auto-grow-calendar?${new URLSearchParams({
                    growId: createdGrowId,
                    source: "start_grow",
                    cropCommonName: cropCommonName.trim(),
                    scientificName: scientificName.trim(),
                    lifeSpanPath,
                    productionPattern,
                    dormancyPattern,
                    plantCount: plannedPlantCount,
                    startDate: anchorDate,
                    vegLengthWeeks,
                    expectedFlowerDays,
                    growStyle: flattenTierSelections(growInterestSelections).join(", "),
                    medium: systemPreset
                  }).toString()}`
                ],
                [
                  "Run Diagnosis / Ask AI",
                  `${workspace === "commercial" ? `${basePath}/tools/diagnose` : `${basePath}/diagnose`}?growId=${encodeURIComponent(createdGrowId)}`
                ],
                ["Open Grow Dashboard", `${basePath}/grows/${createdGrowId}`]
              ].map(([label, path]) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  onPress={() => openCreated(path)}
                  style={{
                    borderWidth: 1,
                    borderColor: palette.accent,
                    borderRadius: radius.card,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor:
                      label === "Open Grow Dashboard" ? palette.accent : palette.surface
                  }}
                >
                  <Text
                    style={{
                      color:
                        label === "Open Grow Dashboard"
                          ? palette.accentText
                          : palette.accent,
                      fontWeight: "800"
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
              <ReportBugButton location="Grow created next-step popup" />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ScreenBoundary>
  );
}
