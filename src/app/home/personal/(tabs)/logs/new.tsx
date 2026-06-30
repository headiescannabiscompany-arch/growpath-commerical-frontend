import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { suggestLogInsights } from "@/api/logInsights";
import { createPersonalLog } from "@/api/logs";
import { listToolRuns } from "@/api/toolRuns";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  normalizeLogInsightSuggestions,
  type LogInsightSuggestions
} from "@/features/personal/logs/normalizeLogInsights";
import { persistImageUris } from "@/utils/photoUploads";

type SelectedPhoto = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

function param(value?: string | string[]) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";
}

export default function NewLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    growId?: string | string[];
    toolRunId?: string | string[];
  }>();
  const growId = param(params.growId);
  const queryToolRunId = param(params.toolRunId);
  const entitlements = useEntitlements();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [logType, setLogType] = useState("other");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [toolRuns, setToolRuns] = useState<any[]>([]);
  const [selectedToolRunId, setSelectedToolRunId] = useState(queryToolRunId);
  const [suggestions, setSuggestions] = useState<LogInsightSuggestions | null>(null);
  const [acceptedTags, setAcceptedTags] = useState<string[]>([]);
  const [rejectedTags, setRejectedTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const logTypes = useMemo(
    () => ["watering", "feed", "training", "environment", "issues", "harvest", "other"],
    []
  );

  useEffect(() => {
    if (!growId) return;
    listToolRuns({ growId })
      .then((rows) => setToolRuns(rows.slice(0, 8)))
      .catch(() => setToolRuns([]));
  }, [growId]);

  const canSave = Boolean(growId && title.trim() && date.trim());

  const pickPhotos = useCallback(async () => {
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
  }, []);

  const analyzeDraft = useCallback(async () => {
    if (!growId || analyzing || !notes.trim()) return;
    setAnalyzing(true);
    setError("");
    try {
      const normalized = normalizeLogInsightSuggestions(
        await suggestLogInsights({
          growId,
          title: title.trim(),
          notes: notes.trim(),
          logType
        })
      );
      setSuggestions(normalized);
      setAcceptedTags([]);
      setRejectedTags([]);
      if (!normalized.tags.length && !normalized.summary) {
        setError("The analysis provider returned no usable log suggestions.");
      }
    } catch (failure: any) {
      setError(failure?.message || "Unable to analyze this draft log.");
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, growId, logType, notes, title]);

  const save = useCallback(async () => {
    if (!canSave) {
      setError("A grow, title, and date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const uploadedPhotos = await persistImageUris(photos.map((photo) => photo.uri));
      const created = await createPersonalLog({
        growId,
        title: title.trim(),
        date: date.trim(),
        notes: notes.trim(),
        type: logType,
        toolRunId: selectedToolRunId || undefined,
        photos: uploadedPhotos,
        photoMetadata: uploadedPhotos.map((url, index) => ({
          url,
          mimeType: photos[index]?.mimeType || null,
          width: photos[index]?.width || null,
          height: photos[index]?.height || null,
          sizeBytes: photos[index]?.sizeBytes || null,
          stage: logType,
          consentForAI: Boolean(suggestions),
          consentForTraining: false
        })),
        tags: acceptedTags,
        rejectedTags,
        aiInsight: suggestions
          ? {
              summary: suggestions.summary,
              missingData: suggestions.missingData,
              suggestedTask: suggestions.suggestedTask,
              source: suggestions.source,
              acceptedTags,
              rejectedTags
            }
          : undefined
      });
      if (!created) throw new Error("Failed to create log.");
      router.replace(`/home/personal/grows/${growId}/journal`);
    } catch (failure: any) {
      setError(failure?.message || "Failed to create log.");
    } finally {
      setSaving(false);
    }
  }, [
    acceptedTags,
    canSave,
    date,
    growId,
    logType,
    notes,
    photos,
    rejectedTags,
    router,
    selectedToolRunId,
    suggestions,
    title
  ]);

  function reviewTag(tag: string, decision: "accept" | "reject") {
    if (decision === "accept") {
      setAcceptedTags((current) =>
        current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
      );
      setRejectedTags((current) => current.filter((item) => item !== tag));
    } else {
      setRejectedTags((current) =>
        current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
      );
      setAcceptedTags((current) => current.filter((item) => item !== tag));
    }
  }

  function invalidateSuggestions() {
    setSuggestions(null);
    setAcceptedTags([]);
    setRejectedTags([]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New Journal Entry</Text>
      <Text style={styles.subtitle}>
        {growId ? `Grow context: ${growId}` : "No grow selected"}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          invalidateSuggestions();
        }}
        placeholder="Day 12 - Defoliation"
        accessibilityLabel="Log title"
      />
      <Text style={styles.label}>Date</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        accessibilityLabel="Log date"
      />
      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {logTypes.map((type) => (
          <Pressable
            key={type}
            onPress={() => {
              setLogType(type);
              invalidateSuggestions();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Log type ${type}`}
            style={[styles.chip, logType === type && styles.chipOn]}
          >
            <Text style={[styles.chipText, logType === type && styles.chipTextOn]}>
              {type}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={styles.notes}
        value={notes}
        onChangeText={(value) => {
          setNotes(value);
          invalidateSuggestions();
        }}
        multiline
        placeholder="What changed today?"
        accessibilityLabel="Log notes"
      />

      <View style={styles.photoHeader}>
        <Text style={styles.label}>Photos</Text>
        <Pressable
          style={styles.secondaryButton}
          onPress={pickPhotos}
          accessibilityRole="button"
          accessibilityLabel="Attach log photos"
        >
          <Text style={styles.secondaryButtonText}>
            {photos.length ? "Add More Photos" : "Attach Photos"}
          </Text>
        </Pressable>
      </View>
      {photos.length ? (
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.photoTile}>
              <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
              <Pressable
                style={styles.removePhoto}
                onPress={() =>
                  setPhotos((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Remove attached photo ${index + 1}`}
              >
                <Text style={styles.removePhotoText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        style={[styles.secondaryButton, (!notes.trim() || analyzing) && styles.disabled]}
        disabled={
          !notes.trim() || analyzing || !entitlements.can(CAPABILITY_KEYS.DIAGNOSE_AI)
        }
        onPress={analyzeDraft}
        accessibilityRole="button"
        accessibilityLabel="Suggest tags and summary"
      >
        <Text style={styles.secondaryButtonText}>
          {analyzing ? "Analyzing..." : "Suggest Tags and Summary"}
        </Text>
      </Pressable>
      {!entitlements.can(CAPABILITY_KEYS.DIAGNOSE_AI) ? (
        <Text style={styles.helper}>AI suggestions are unavailable for this plan.</Text>
      ) : null}

      {suggestions ? (
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Suggestions | {suggestions.source}</Text>
          {suggestions.source === "unverified" ? (
            <Text style={styles.warning}>
              Provider provenance is missing. Review carefully.
            </Text>
          ) : null}
          {suggestions.summary ? (
            <Text style={styles.helper}>{suggestions.summary}</Text>
          ) : null}
          <View style={styles.row}>
            {suggestions.tags.map((tag) => (
              <View key={tag} style={styles.tagReview}>
                <Text style={styles.tagName}>{tag}</Text>
                <Pressable
                  style={[
                    styles.reviewButton,
                    acceptedTags.includes(tag) && styles.accepted
                  ]}
                  onPress={() => reviewTag(tag, "accept")}
                  accessibilityRole="button"
                  accessibilityLabel={`Accept tag ${tag}`}
                >
                  <Text style={styles.reviewText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.reviewButton,
                    rejectedTags.includes(tag) && styles.rejected
                  ]}
                  onPress={() => reviewTag(tag, "reject")}
                  accessibilityRole="button"
                  accessibilityLabel={`Reject tag ${tag}`}
                >
                  <Text style={styles.reviewText}>Reject</Text>
                </Pressable>
              </View>
            ))}
          </View>
          {suggestions.missingData.map((item) => (
            <Text key={item} style={styles.helper}>
              Missing context: {item}
            </Text>
          ))}
        </View>
      ) : null}

      {toolRuns.length ? (
        <>
          <Text style={styles.label}>Attach recent tool result</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => setSelectedToolRunId("")}
              accessibilityRole="button"
              accessibilityLabel="Attach no tool result"
              style={[styles.chip, !selectedToolRunId && styles.chipOn]}
            >
              <Text style={[styles.chipText, !selectedToolRunId && styles.chipTextOn]}>
                none
              </Text>
            </Pressable>
            {toolRuns.map((run, index) => {
              const id = String(run?._id || run?.id || `run-${index}`);
              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedToolRunId(id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Attach tool result ${run?.toolType || run?.toolName || "tool"}`}
                  style={[styles.chip, selectedToolRunId === id && styles.chipOn]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedToolRunId === id && styles.chipTextOn
                    ]}
                  >
                    {run?.toolType || run?.toolName || "tool"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Pressable
        style={[styles.primaryButton, (!canSave || saving) && styles.disabled]}
        disabled={!canSave || saving}
        onPress={save}
        accessibilityRole="button"
        accessibilityLabel="Create log"
      >
        <Text style={styles.primaryButtonText}>
          {saving ? "Saving..." : "Create Log"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 40, gap: 9 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B" },
  label: { color: "#334155", fontWeight: "800", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 9, padding: 10 },
  notes: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 9,
    padding: 10,
    textAlignVertical: "top"
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  photoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap"
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoTile: {
    width: 104,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F8FAFC"
  },
  photoThumb: { width: "100%", height: 82, backgroundColor: "#E2E8F0" },
  removePhoto: { paddingVertical: 6, alignItems: "center" },
  removePhotoText: { color: "#B91C1C", fontSize: 11, fontWeight: "800" },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  chipOn: { backgroundColor: "#166534", borderColor: "#166534" },
  chipText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  chipTextOn: { color: "#FFFFFF" },
  primaryButton: {
    marginTop: 8,
    backgroundColor: "#166534",
    borderRadius: 9,
    padding: 11,
    alignItems: "center"
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  error: {
    color: "#991B1B",
    backgroundColor: "#FEE2E2",
    borderRadius: 9,
    padding: 9,
    fontWeight: "700"
  },
  warning: { color: "#9A3412", backgroundColor: "#FFEDD5", borderRadius: 8, padding: 8 },
  helper: { color: "#64748B", lineHeight: 19 },
  insightCard: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    padding: 11,
    gap: 7
  },
  insightTitle: { color: "#0F172A", fontWeight: "800" },
  tagReview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 9,
    padding: 5,
    backgroundColor: "#FFFFFF"
  },
  tagName: { color: "#334155", fontWeight: "700" },
  reviewButton: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#E2E8F0"
  },
  accepted: { backgroundColor: "#BBF7D0" },
  rejected: { backgroundColor: "#FECACA" },
  reviewText: { color: "#0F172A", fontSize: 11, fontWeight: "800" }
});
