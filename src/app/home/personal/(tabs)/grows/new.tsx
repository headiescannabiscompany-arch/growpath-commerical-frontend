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
import { apiRequest } from "@/api/apiRequest";
import { appendGrowPhotos, listPersonalGrows } from "@/api/grows";
import { useAuth } from "@/auth/AuthContext";
import GrowInterestPicker from "@/components/GrowInterestPicker";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { INTEREST_TIERS } from "@/config/interests";
import { LockedScreen } from "@/entitlements/LockedScreen";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import {
  buildEmptyTierSelection,
  flattenGrowInterests,
  flattenTierSelections,
  groupTagsByTier
} from "@/utils/growInterests";
import { isPersistedImageUri, persistImageUris } from "@/utils/photoUploads";

const GROWS_CREATE_PATH = "/api/personal/grows";

type SystemPreset = "soil" | "coco" | "hydro";
type AnchorType = "vegStart" | "flowerDay1";
type SelectedPhoto = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

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

export default function NewGrowScreen() {
  const router = useRouter();
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
  }>();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const hasCreateCapability = entitlements.can(CAPABILITY_KEYS.GROWS_PERSONAL_WRITE);
  const maxGrows = Number(entitlements.limits?.maxGrows ?? 0);
  const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const aiSource = firstParam(params.source).toLowerCase() === "ai";
  const requestedPreset = firstParam(params.systemPreset).toLowerCase();
  const initialProfileTags = React.useMemo(
    () => flattenGrowInterests(auth.user?.growInterests || {}),
    [auth.user?.growInterests]
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
  const interestOptionsOverride = React.useMemo(() => {
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
    firstParam(params.vegLengthWeeks) || "4"
  );
  const [expectedFlowerDays, setExpectedFlowerDays] = React.useState(
    firstParam(params.expectedFlowerDays) || "63"
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
  const [targetVpdBand, setTargetVpdBand] = React.useState("");
  const [notes, setNotes] = React.useState(firstParam(params.notes));
  const [photos, setPhotos] = React.useState<SelectedPhoto[]>([]);
  const [photoUrl, setPhotoUrl] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [checkingLimit, setCheckingLimit] = React.useState(true);
  const [existingGrowCount, setExistingGrowCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [createdGrowId, setCreatedGrowId] = React.useState("");

  const isValid = name.trim().length > 0 && anchorDate.trim().length > 0;
  const canCreateGrow =
    hasCreateCapability || (!checkingLimit && maxGrows > existingGrowCount);

  React.useEffect(() => {
    let alive = true;
    async function loadLimit() {
      if (hasCreateCapability) {
        if (alive) {
          setExistingGrowCount(0);
          setCheckingLimit(false);
        }
        return;
      }
      setCheckingLimit(true);
      try {
        const rows = await listPersonalGrows();
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
  }, [hasCreateCapability, maxGrows]);

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
      const created = await apiRequest(GROWS_CREATE_PATH, {
        method: "POST",
        body: {
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
            vegLengthWeeks: Number(vegLengthWeeks) || 0,
            expectedFlowerDays: Number(expectedFlowerDays) || 0,
            createStarterCalendar: true
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
        }
      });

      const createdId = String(
        created?._id || created?.id || created?.grow?._id || created?.grow?.id || ""
      );
      if (createdId && uploadedPhotos.length) {
        await appendGrowPhotos(createdId, uploadedPhotos);
      }

      if (createdId) {
        setCreatedGrowId(createdId);
      } else {
        router.replace(`/home/personal/grows?r=${Date.now()}`);
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
    startType,
    vegLengthWeeks
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
      <>
        <Text style={{ fontWeight: "700" }}>{label}</Text>
        {Platform.OS === "web" ? (
          React.createElement("input", {
            type: "date",
            value,
            onChange: (event: any) => onChangeText(event?.target?.value || ""),
            "aria-label": accessibilityLabel,
            "data-testid": testID,
            style: {
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "#E2E8F0",
              borderRadius: radius.card,
              padding: 10,
              fontSize: 16
            }
          })
        ) : (
          <TextInput
            testID={testID}
            value={value}
            onChangeText={onChangeText}
            placeholder="YYYY-MM-DD"
            accessibilityLabel={accessibilityLabel}
            inputMode="numeric"
            style={{
              borderWidth: 1,
              borderColor: "#E2E8F0",
              borderRadius: radius.card,
              paddingHorizontal: 12,
              paddingVertical: 10
            }}
          />
        )}
      </>
    );
  }

  if (checkingLimit && !hasCreateCapability) {
    return (
      <ScreenBoundary title="New Grow" showBack backFallbackHref="/home/personal/grows">
        <ScrollView
          style={{ flex: 1, backgroundColor: "#FFFFFF" }}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        >
          <Text style={{ fontSize: 22, fontWeight: "700" }}>New Grow</Text>
          <ActivityIndicator />
          <Text style={{ color: "#475569" }}>Checking free grow limit...</Text>
        </ScrollView>
      </ScreenBoundary>
    );
  }

  if (!canCreateGrow) {
    return (
      <ScreenBoundary title="New Grow" showBack backFallbackHref="/home/personal/grows">
        <LockedScreen
          title="Create grows with Pro"
          message="Free accounts can create one grow. Upgrade to create more grows and save unlimited grow history."
          actionLabel="Back to grows"
          onAction={() => router.replace("/home/personal/grows" as any)}
        />
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary title="New Grow" showBack backFallbackHref="/home/personal/grows">
      <ScrollView
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700" }}>New Grow</Text>
        <Text style={{ color: "#475569" }}>
          Set required anchors so logs, tools, and tasks can map to this grow correctly.
        </Text>
        {aiSource ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#86EFAC",
              borderRadius: radius.card,
              padding: 12,
              backgroundColor: "#F0FDF4"
            }}
          >
            <Text style={{ color: "#166534", fontWeight: "800" }}>
              AI-assisted grow draft
            </Text>
            <Text style={{ color: "#166534", marginTop: 4 }}>
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
                "/home/personal/ai?prompt=Help%20me%20build%20a%20new%20grow%20from%20my%20grow%20interests" as any
              )
            }
            style={{
              alignSelf: "flex-start",
              borderWidth: 1,
              borderColor: "#166534",
              borderRadius: radius.card,
              paddingHorizontal: 12,
              paddingVertical: 9,
              backgroundColor: "#F0FDF4"
            }}
          >
            <Text style={{ color: "#166534", fontWeight: "800" }}>
              Build this grow with AI
            </Text>
          </Pressable>
        )}
        <PersonalFeedPlacement placement="top" routeKey="personal_new_grow" longContent />

        {error ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "#FCA5A5",
              borderRadius: radius.card,
              padding: 10,
              backgroundColor: "#FEF2F2"
            }}
          >
            <Text style={{ color: "#7F1D1D", fontWeight: "700" }}>{error}</Text>
          </View>
        ) : null}

        <Text style={{ fontWeight: "700" }}>Grow name</Text>
        <TextInput
          testID="input-grow-name"
          value={name}
          onChangeText={setName}
          placeholder="Blueberry Muffin Run 3"
          accessibilityLabel="Grow name"
          style={{
            borderWidth: 1,
            borderColor: "#E2E8F0",
            borderRadius: radius.card,
            paddingHorizontal: 12,
            paddingVertical: 10
          }}
        />

        <View
          style={{
            borderWidth: 1,
            borderColor: "#BBF7D0",
            borderRadius: radius.card,
            padding: 12,
            gap: 9,
            backgroundColor: "#F0FDF4"
          }}
        >
          <Text style={{ color: "#14532D", fontSize: 16, fontWeight: "900" }}>
            Grow Planner / Auto Calendar
          </Text>
          <Text style={{ color: "#166534" }}>
            These setup answers prefill the shared calendar tool after this grow is saved.
            The calendar tool creates real starter tasks; this form does not duplicate it.
          </Text>
          <Text style={{ fontWeight: "700" }}>How are you starting?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {["seed", "clone", "transplant", "existing plant"].map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`Grow start type ${option}`}
                onPress={() => setStartType(option)}
                style={{
                  borderWidth: 1,
                  borderColor: startType === option ? "#166534" : "#86EFAC",
                  borderRadius: 999,
                  backgroundColor: startType === option ? "#166534" : "#FFFFFF",
                  paddingHorizontal: 10,
                  paddingVertical: 7
                }}
              >
                <Text style={{ color: startType === option ? "#FFFFFF" : "#166534" }}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              ["Plant count", plannedPlantCount, setPlannedPlantCount],
              ["Veg length (weeks)", vegLengthWeeks, setVegLengthWeeks],
              ["Expected flower days", expectedFlowerDays, setExpectedFlowerDays]
            ].map(([label, value, setter]) => (
              <View key={String(label)} style={{ flex: 1, minWidth: 150, gap: 4 }}>
                <Text style={{ fontWeight: "700" }}>{String(label)}</Text>
                <TextInput
                  value={String(value)}
                  onChangeText={setter as (text: string) => void}
                  keyboardType="numeric"
                  accessibilityLabel={String(label)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#86EFAC",
                    borderRadius: radius.card,
                    backgroundColor: "#FFFFFF",
                    paddingHorizontal: 10,
                    paddingVertical: 9
                  }}
                />
              </View>
            ))}
          </View>
          <Text style={{ color: "#166534", fontWeight: "800" }}>
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

        <Text style={{ fontWeight: "700" }}>System preset</Text>
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
                borderColor: systemPreset === preset ? "#166534" : "#CBD5E1",
                backgroundColor: systemPreset === preset ? "#166534" : "#FFFFFF"
              }}
            >
              <Text style={{ color: systemPreset === preset ? "#FFFFFF" : "#0F172A" }}>
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ fontWeight: "700" }}>Anchor type</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              { key: "vegStart", label: "Veg start" },
              { key: "flowerDay1", label: "Flower day 1" }
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
                borderColor: anchorDateType === opt.key ? "#166534" : "#CBD5E1",
                backgroundColor: anchorDateType === opt.key ? "#166534" : "#FFFFFF"
              }}
            >
              <Text style={{ color: anchorDateType === opt.key ? "#FFFFFF" : "#0F172A" }}>
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

        <Text style={{ fontWeight: "700" }}>Timezone</Text>
        <TextInput
          value={timeZone}
          onChangeText={setTimeZone}
          placeholder="America/New_York"
          accessibilityLabel="Timezone"
          style={{
            borderWidth: 1,
            borderColor: "#E2E8F0",
            borderRadius: radius.card,
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
            <Text style={{ fontWeight: "700" }}>Grow photos</Text>
            <Pressable
              onPress={pickPhotos}
              accessibilityRole="button"
              accessibilityLabel="Attach grow photos"
              style={{
                borderWidth: 1,
                borderColor: "#166534",
                borderRadius: radius.card,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: "#F0FDF4"
              }}
            >
              <Text style={{ color: "#166534", fontWeight: "800" }}>
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
                    borderColor: "#E2E8F0",
                    borderRadius: radius.card,
                    overflow: "hidden",
                    backgroundColor: "#F8FAFC"
                  }}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    accessibilityLabel={`Attached grow photo ${index + 1}`}
                    style={{ width: "100%", height: 72, backgroundColor: "#E2E8F0" }}
                  />
                  <Pressable
                    onPress={() =>
                      setPhotos((current) => current.filter((_, i) => i !== index))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove attached grow photo ${index + 1}`}
                    style={{ padding: 6, alignItems: "center" }}
                  >
                    <Text style={{ color: "#991B1B", fontSize: 12, fontWeight: "800" }}>
                      Remove
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: "#64748B" }}>
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
              borderColor: "#E2E8F0",
              borderRadius: radius.card,
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
              borderColor: "#CBD5E1",
              borderRadius: radius.card,
              padding: 10,
              alignSelf: "flex-start",
              opacity: photoUrl.trim() ? 1 : 0.5
            }}
          >
            <Text style={{ fontWeight: "700" }}>Add photo URL</Text>
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
            borderColor: "#E2E8F0",
            borderRadius: radius.card,
            padding: 10
          }}
        >
          <Text style={{ fontWeight: "700" }}>
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
            <DateInput
              label="Cure start date (optional)"
              value={cureStartDate}
              onChangeText={setCureStartDate}
              accessibilityLabel="Cure start date"
            />

            <Text style={{ fontWeight: "700" }}>Pot size (optional)</Text>
            <TextInput
              value={potSize}
              onChangeText={setPotSize}
              placeholder="5 gal"
              accessibilityLabel="Pot size"
              style={{
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: radius.card,
                paddingHorizontal: 12,
                paddingVertical: 10
              }}
            />

            <Text style={{ fontWeight: "700" }}>Pot count (optional)</Text>
            <TextInput
              value={potCount}
              onChangeText={setPotCount}
              placeholder="4"
              keyboardType="numeric"
              accessibilityLabel="Pot count"
              style={{
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: radius.card,
                paddingHorizontal: 12,
                paddingVertical: 10
              }}
            />

            <Text style={{ fontWeight: "700" }}>Cultivar (optional)</Text>
            <TextInput
              value={cultivar}
              onChangeText={setCultivar}
              placeholder="Blue Dream"
              accessibilityLabel="Cultivar"
              style={{
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: radius.card,
                paddingHorizontal: 12,
                paddingVertical: 10
              }}
            />

            <Text style={{ fontWeight: "700" }}>Target VPD band (optional)</Text>
            <TextInput
              value={targetVpdBand}
              onChangeText={setTargetVpdBand}
              placeholder="0.9-1.2 kPa"
              accessibilityLabel="Target VPD band"
              style={{
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: radius.card,
                paddingHorizontal: 12,
                paddingVertical: 10
              }}
            />

            <Text style={{ fontWeight: "700" }}>Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any setup notes"
              multiline
              accessibilityLabel="Grow notes"
              style={{
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: radius.card,
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
            borderColor: "#166534",
            borderRadius: radius.card,
            backgroundColor: "#166534",
            opacity: saving || !isValid ? 0.6 : 1,
            alignSelf: "flex-start"
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Create grow</Text>
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
              backgroundColor: "rgba(15, 23, 42, 0.35)",
              justifyContent: "center",
              padding: 20
            }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: radius.card,
                padding: 18,
                gap: 10
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>
                Grow created: {name.trim()}
              </Text>
              <Text style={{ color: "#475569", lineHeight: 20 }}>
                Choose the next step so this grow immediately has plants, logs, tasks, or
                AI context attached.
              </Text>
              {[
                ["Add Plants", `/home/personal/grows/${createdGrowId}/plants`],
                [
                  "Create First Journal Entry",
                  `/home/personal/logs/new?growId=${encodeURIComponent(createdGrowId)}`
                ],
                [
                  "Create Grow Calendar",
                  `/home/personal/tools/auto-grow-calendar?${new URLSearchParams({
                    growId: createdGrowId,
                    source: "start_grow",
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
                  `/home/personal/diagnose?growId=${encodeURIComponent(createdGrowId)}`
                ],
                ["Open Grow Dashboard", `/home/personal/grows/${createdGrowId}`]
              ].map(([label, path]) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  onPress={() => openCreated(path)}
                  style={{
                    borderWidth: 1,
                    borderColor: "#166534",
                    borderRadius: radius.card,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor:
                      label === "Open Grow Dashboard" ? "#166534" : "#FFFFFF"
                  }}
                >
                  <Text
                    style={{
                      color: label === "Open Grow Dashboard" ? "#FFFFFF" : "#166534",
                      fontWeight: "800"
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ScreenBoundary>
  );
}
