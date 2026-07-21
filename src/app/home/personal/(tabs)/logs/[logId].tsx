import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";

import {
  deletePersonalLog,
  getPersonalLog,
  updatePersonalLog,
  type PersonalLog
} from "@/api/logs";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { fmtDate } from "@/features/grows/routeUtils";
import { resolveImageUri } from "@/utils/photoUploads";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import ContextualWorkflowLinks from "@/components/personal/ContextualWorkflowLinks";
import { radius } from "@/theme/theme";

function param(value?: string | string[]) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";
}

function dateOnly(value?: string) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function LogDetailScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { logId: rawLogId } = useLocalSearchParams<{ logId?: string | string[] }>();
  const logId = useMemo(() => param(rawLogId), [rawLogId]);
  const photoTileWidth = useMemo(
    () => Math.max(132, Math.min(180, Math.floor((windowWidth - 56) / 2))),
    [windowWidth]
  );

  const [log, setLog] = useState<PersonalLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, true>>({});
  const [form, setForm] = useState({
    title: "",
    date: "",
    type: "other",
    notes: "",
    tags: ""
  });

  const load = useCallback(async () => {
    if (!logId) {
      setFeedback("Missing journal entry id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback("");
    const row = await getPersonalLog(logId);
    setLog(row);
    setBrokenPhotos({});
    if (row) {
      setForm({
        title: row.title || "",
        date: dateOnly(row.date || row.createdAt),
        type: row.type || "other",
        notes: row.notes || "",
        tags: Array.isArray(row.tags) ? row.tags.join(", ") : ""
      });
    } else {
      setFeedback("Journal entry not found.");
    }
    setLoading(false);
  }, [logId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function save() {
    if (!logId || !form.title.trim() || !form.date.trim()) {
      setFeedback("Title and date are required.");
      return;
    }
    setSaving(true);
    setFeedback("");
    const updated = await updatePersonalLog(logId, {
      title: form.title.trim(),
      date: form.date.trim(),
      type: form.type.trim() || "other",
      notes: form.notes.trim(),
      tags: splitTags(form.tags)
    });
    setSaving(false);
    if (!updated) {
      setFeedback("Unable to save journal entry.");
      return;
    }
    setLog(updated);
    setEditing(false);
    setFeedback("Journal entry saved.");
  }

  async function remove() {
    if (!logId || deleting) return;
    setDeleting(true);
    setFeedback("");
    const ok = await deletePersonalLog(logId);
    setDeleting(false);
    if (!ok) {
      setFeedback("Unable to delete journal entry.");
      return;
    }
    const growId = log?.growId;
    router.replace(
      growId
        ? `/home/personal/grows/${encodeURIComponent(growId)}/journal`
        : "/home/personal/grows"
    );
  }

  if (loading) {
    return (
      <ScreenBoundary
        title="Journal Entry"
        showBack
        backFallbackHref="/home/personal/grows"
      >
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title={log?.title || "Journal Entry"}
      showBack
      preferBackFallback
      backFallbackHref={
        log?.growId
          ? `/home/personal/grows/${encodeURIComponent(log.growId)}/journal`
          : "/home/personal/grows"
      }
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {log?.title || "Journal Entry"}
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_logs_logid"
          longContent
        />
        <Text style={styles.meta}>
          {log?.type || "other"} | {fmtDate(log?.date || log?.createdAt)}
        </Text>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        {!log ? null : editing ? (
          <View style={styles.card}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(title) => setForm((current) => ({ ...current, title }))}
              accessibilityLabel="Edit log title"
            />
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={form.date}
              onChangeText={(date) => setForm((current) => ({ ...current, date }))}
              placeholder="YYYY-MM-DD"
              accessibilityLabel="Edit log date"
            />
            <Text style={styles.label}>Type</Text>
            <TextInput
              style={styles.input}
              value={form.type}
              onChangeText={(type) => setForm((current) => ({ ...current, type }))}
              accessibilityLabel="Edit log type"
            />
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={form.notes}
              onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
              multiline
              accessibilityLabel="Edit log notes"
            />
            <Text style={styles.label}>Tags</Text>
            <TextInput
              style={styles.input}
              value={form.tags}
              onChangeText={(tags) => setForm((current) => ({ ...current, tags }))}
              placeholder="watering, deficiency, follow-up"
              accessibilityLabel="Edit log tags"
            />
            <View style={styles.row}>
              <Pressable
                style={[styles.primaryButton, saving && styles.disabled]}
                disabled={saving}
                onPress={save}
                accessibilityRole="button"
                accessibilityLabel="Save log changes"
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setEditing(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel log editing"
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Entry</Text>
              <Text style={styles.notes}>{log.notes || "No notes recorded."}</Text>
              {log.tags?.length ? (
                <View style={styles.tags}>
                  {log.tags.map((tag) => (
                    <Text key={tag} style={styles.tag}>
                      {tag}
                    </Text>
                  ))}
                </View>
              ) : null}
              {log.rejectedTags?.length ? (
                <View style={styles.tags}>
                  {log.rejectedTags.map((tag) => (
                    <Text key={tag} style={styles.rejectedTag}>
                      Rejected: {tag}
                    </Text>
                  ))}
                </View>
              ) : null}
              {log.photos?.length ? (
                <View style={styles.photoGrid}>
                  {log.photos.map((uri, index) => {
                    const meta = log.photoMetadata?.[index];
                    const photoKey = `${uri}-${index}`;
                    const resolvedUri = resolveImageUri(uri);
                    const broken = brokenPhotos[photoKey];
                    return (
                      <View key={photoKey} style={styles.photoTile}>
                        {broken ? (
                          <View style={[styles.photoFallback, { width: photoTileWidth }]}>
                            <Text style={styles.photoFallbackTitle}>
                              Photo unavailable
                            </Text>
                            <Text style={styles.photoFallbackText} numberOfLines={2}>
                              {uri}
                            </Text>
                          </View>
                        ) : (
                          <Image
                            source={{ uri: resolvedUri }}
                            style={[styles.photoThumb, { width: photoTileWidth }]}
                            resizeMode="cover"
                            accessibilityLabel={`Journal photo ${index + 1}`}
                            onError={() =>
                              setBrokenPhotos((current) => ({
                                ...current,
                                [photoKey]: true
                              }))
                            }
                          />
                        )}
                        <Text style={styles.photoMeta}>
                          {meta?.mimeType || "image"}
                          {meta?.width && meta?.height
                            ? ` | ${meta.width}x${meta.height}`
                            : ""}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <ContextualWorkflowLinks
              title="Log report"
              helper="Export the linked grow timeline with this journal entry kept as the launch source."
              source="grow_log_detail"
              growId={String(log.growId || "")}
              plantId={String(log.plantId || "")}
              logId={logId}
              workflows={["pdf-export"]}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>History Links</Text>
              <Text style={styles.linkMeta}>Grow: {log.growId || "Unlinked"}</Text>
              <Text style={styles.linkMeta}>Plant: {log.plantId || "Whole grow"}</Text>
              <Text style={styles.linkMeta}>
                Diagnosis:{" "}
                {log.diagnosisId ||
                  (log.type === "diagnosis" ? "Saved diagnosis log" : "None")}
              </Text>
              <Text style={styles.linkMeta}>Tool result: {log.toolRunId || "None"}</Text>
            </View>

            {log.aiInsight ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>AI Log Suggestions</Text>
                {log.aiInsight.summary ? (
                  <Text style={styles.notes}>{log.aiInsight.summary}</Text>
                ) : null}
                <Text style={styles.linkMeta}>
                  Source: {log.aiInsight.source || "unknown"}
                </Text>
                {log.aiInsight.missingData?.map((item) => (
                  <Text key={item} style={styles.linkMeta}>
                    Missing context: {item}
                  </Text>
                ))}
                {log.aiInsight.acceptedTags?.length ? (
                  <Text style={styles.linkMeta}>
                    Accepted tags: {log.aiInsight.acceptedTags.join(", ")}
                  </Text>
                ) : null}
                {log.aiInsight.rejectedTags?.length ? (
                  <Text style={styles.linkMeta}>
                    Rejected tags: {log.aiInsight.rejectedTags.join(", ")}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <PersonalFeedPlacement
              placement="middle"
              routeKey="personal_logs_logid"
              longContent
            />

            <View style={styles.row}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => setEditing(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit log entry"
              >
                <Text style={styles.primaryButtonText}>Edit Entry</Text>
              </Pressable>
              <Pressable
                style={[styles.dangerButton, deleting && styles.disabled]}
                disabled={deleting}
                onPress={remove}
                accessibilityRole="button"
                accessibilityLabel="Delete log entry"
              >
                <Text style={styles.dangerButtonText}>
                  {deleting ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_logs_logid"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 40, gap: 10 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  meta: { fontSize: 13, color: "#64748B" },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC",
    gap: 8
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  notes: { color: "#334155", lineHeight: 20 },
  linkMeta: { color: "#475569", lineHeight: 19 },
  label: { color: "#334155", fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10
  },
  notesInput: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10,
    textAlignVertical: "top"
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
    color: "#166534",
    fontWeight: "800",
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: "hidden"
  },
  rejectedTag: {
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    fontWeight: "800",
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: "hidden"
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoTile: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: "#FFFFFF"
  },
  photoThumb: { width: "100%", height: 88, backgroundColor: "#E2E8F0" },
  photoFallback: {
    height: 88,
    backgroundColor: "#FFF7ED",
    padding: 8,
    justifyContent: "center"
  },
  photoFallbackTitle: { color: "#9A3412", fontWeight: "800", fontSize: 12 },
  photoFallbackText: { color: "#9A3412", fontSize: 11, marginTop: 3 },
  photoMeta: { padding: 6, color: "#64748B", fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryButtonText: { color: "#0F172A", fontWeight: "800" },
  dangerButton: {
    borderWidth: 1,
    borderColor: "#B91C1C",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  dangerButtonText: { color: "#B91C1C", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    padding: 9,
    fontWeight: "700"
  }
});
