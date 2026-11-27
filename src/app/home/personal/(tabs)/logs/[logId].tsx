import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
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
import { useAppTheme } from "@/theme/appTheme";
import JournalEntryEditor from "@/features/grows/screens/JournalEntryEditor";
import { createLogDetailStyles } from "@/features/grows/screens/logDetailStyles";
export { createLogDetailStyles };

function param(value?: string | string[]) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";
}

export default function LogDetailScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createLogDetailStyles(palette), [palette]);
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
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, true>>({});
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
    if (!row) {
      setFeedback("Journal entry not found.");
    }
    setLoading(false);
  }, [logId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

  function shareToForum() {
    if (!log) return;
    const body = [
      log.notes || "",
      `Journal date: ${fmtDate(log.date || log.createdAt)}`,
      Array.isArray(log.tags) && log.tags.length ? `Tags: ${log.tags.join(", ")}` : ""
    ]
      .filter(Boolean)
      .join("\n\n");
    const query = [
      `title=${encodeURIComponent(log.title || "Grow journal update")}`,
      `body=${encodeURIComponent(body)}`,
      log.growId ? `growId=${encodeURIComponent(String(log.growId))}` : "",
      log.plantId ? `plantId=${encodeURIComponent(String(log.plantId))}` : "",
      "purpose=journal-entry"
    ]
      .filter(Boolean)
      .join("&");
    router.push(`/forum/new-post?${query}` as any);
  }

  if (loading) {
    return (
      <ScreenBoundary
        title="Journal Entry"
        showBack
        backFallbackHref="/home/personal/grows"
      >
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} />
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
          <JournalEntryEditor
            key={logId}
            log={log}
            saveLog={(patch) => updatePersonalLog(logId, patch)}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setLog(updated);
              setBrokenPhotos({});
              setEditing(false);
              setFeedback("Journal entry saved.");
            }}
          />
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
              <Text style={styles.cardTitle}>Share this journal entry</Text>
              <Text style={styles.cardText}>
                Review the prefilled discussion before publishing. Private grow records
                and unselected photos stay private.
              </Text>
              <Pressable
                onPress={shareToForum}
                accessibilityRole="button"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Share in Forum / Q&amp;A</Text>
              </Pressable>
            </View>

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
                onPress={() => {
                  setFeedback("");
                  setEditing(true);
                }}
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
