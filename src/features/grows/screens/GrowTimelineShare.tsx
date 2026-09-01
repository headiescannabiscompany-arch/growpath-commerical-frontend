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
  View
} from "react-native";

import {
  getCurrentGrowTimelineCopy,
  previewGrowTimelineCopy,
  publishGrowTimelineCopy,
  withdrawGrowTimelineCopy,
  type GrowTimelinePublicCopy,
  type GrowTimelinePublicCopyInput,
  type GrowTimelinePublicPreview
} from "@/api/growTimelineCopies";
import { createForumPost } from "@/api/communitySocial";
import GrowTimelineFlow from "@/components/grows/GrowTimelineFlow";
import PublicShareActions from "@/components/sharing/PublicShareActions";
import { coerceParam, fmtDate } from "@/features/grows/routeUtils";
import { timelineEventPhotos } from "@/features/grows/timeline";
import {
  getWorkspaceGrow,
  getWorkspaceGrowTimeline,
  type GrowWorkspace
} from "@/features/grows/workspaceData";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { sharePublicLink } from "@/utils/publicLinks";
import { currentPublicUrl } from "@/utils/publicLinks";
import { resolveImageUri } from "@/utils/photoUploads";

export default function GrowTimelineShare({
  workspace = "personal"
}: {
  workspace?: GrowWorkspace;
} = {}) {
  const { growId: rawGrowId, presentation: rawPresentation } = useLocalSearchParams<{
    growId?: string | string[];
    presentation?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [presentation, setPresentation] = useState<"visual" | "list">(
    coerceParam(rawPresentation) === "list" ? "list" : "visual"
  );
  const [current, setCurrent] = useState<GrowTimelinePublicCopy | null>(null);
  const [preview, setPreview] = useState<GrowTimelinePublicPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postingToFeed, setPostingToFeed] = useState(false);
  const [showEntrySelection, setShowEntrySelection] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!growId) {
      setError("Missing grow id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [grow, timeline, copy] = await Promise.all([
        getWorkspaceGrow(workspace, growId),
        getWorkspaceGrowTimeline(workspace, growId),
        getCurrentGrowTimelineCopy(workspace, growId)
      ]);
      setEvents(timeline);
      setSelectedEventIds(new Set(timeline.map((event) => String(event.id))));
      setSelectedPhotoUrls(
        new Set(
          timeline.flatMap((event) => timelineEventPhotos(event as any)).slice(0, 12)
        )
      );
      setTitle(copy?.title || `Grow timeline: ${grow?.name || "My grow"}`);
      setDescription(copy?.description || "");
      setCurrent(copy);
      setPreview(null);
    } catch (caught: any) {
      setError(caught?.message || "The timeline share review could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [growId, workspace]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const availablePhotos = useMemo(
    () =>
      Array.from(
        new Set(
          events
            .filter((event) => selectedEventIds.has(String(event.id)))
            .flatMap((event) => timelineEventPhotos(event as any))
        )
      ).slice(0, 12),
    [events, selectedEventIds]
  );

  const toggleEvent = (event: any) => {
    setPreview(null);
    const id = String(event.id);
    const photos = timelineEventPhotos(event as any);
    setSelectedEventIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
        setSelectedPhotoUrls((photoSelection) => {
          const remainingEventPhotos = new Set(
            events
              .filter((candidate) => next.has(String(candidate.id)))
              .flatMap((candidate) => timelineEventPhotos(candidate as any))
          );
          return new Set(
            [...photoSelection].filter(
              (url) => !photos.includes(url) || remainingEventPhotos.has(url)
            )
          );
        });
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const togglePhoto = (url: string) => {
    setPreview(null);
    setSelectedPhotoUrls((previous) => {
      const next = new Set(previous);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const input = (): GrowTimelinePublicCopyInput => ({
    title: title.trim(),
    description: description.trim(),
    presentation,
    eventIds: [...selectedEventIds],
    photoUrls: [...selectedPhotoUrls].filter((url) => availablePhotos.includes(url))
  });

  const previewFlowEvents = useMemo(() => {
    if (!preview) return [];
    return preview.events.map((event, index) => {
      const source = events.find((candidate) => String(candidate.id) === event.id);
      return {
        id: event.id || `${event.timestamp}-${index}`,
        title: event.title,
        summary: event.summary,
        timestamp: event.timestamp,
        type: event.type,
        highlights: event.tags,
        photos: source
          ? timelineEventPhotos(source as any).filter((url) => selectedPhotoUrls.has(url))
          : []
      };
    });
  }, [events, preview, selectedPhotoUrls]);

  const review = async () => {
    if (!growId || !title.trim() || !selectedEventIds.size) return;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const reviewed = await previewGrowTimelineCopy(workspace, growId, input());
      setPreview(reviewed);
      setFeedback(
        "Review the exact public fields below, then publish when they are right."
      );
    } catch (caught: any) {
      setPreview(null);
      setError(caught?.message || "The public preview could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!growId || !preview) return;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const copy = await publishGrowTimelineCopy(workspace, growId, input());
      setCurrent(copy);
      setPreview(null);
      setFeedback(
        copy
          ? "The reviewed snapshot is live. Future private grow changes will not alter this version."
          : "The public copy was created."
      );
    } catch (caught: any) {
      setError(caught?.message || "The public timeline could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async () => {
    if (!growId) return;
    setSaving(true);
    setError("");
    try {
      await withdrawGrowTimelineCopy(workspace, growId);
      setCurrent(null);
      setFeedback("The public link is withdrawn. Your private grow was not changed.");
    } catch (caught: any) {
      setError(caught?.message || "The public link could not be withdrawn.");
    } finally {
      setSaving(false);
    }
  };

  const publicPath = current?.token ? `/grow-timeline/${current.token}` : "";

  const postToFeed = async () => {
    if (!current || !publicPath) return;
    setPostingToFeed(true);
    setError("");
    try {
      await createForumPost({
        title: current.title,
        body: `${current.cannabisSpecific ? "Cannabis content.\n\n" : ""}Explore the horizontal Visual Grow Story: ${currentPublicUrl(publicPath)}`,
        photos: current.photos?.[0]?.url ? [current.photos[0].url] : [],
        tags: current.cannabisSpecific ? ["cannabis", "grow story"] : ["grow story"],
        workspaceContext: workspace,
        growId
      });
      setFeedback("The Visual Grow Story was posted to the GrowPath feed.");
    } catch (caught: any) {
      setError(
        caught?.message || "The Visual Grow Story could not be posted to the feed."
      );
    } finally {
      setPostingToFeed(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        Review Public Grow Timeline
      </Text>
      <Text style={styles.help}>
        Choose exactly what viewers may see. Publishing creates a frozen safe copy; it
        never exposes private notes, telemetry, account IDs, exact locations, or protected
        photo URLs.
      </Text>

      {loading ? <ActivityIndicator color={palette.accent} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {feedback ? <Text style={styles.success}>{feedback}</Text> : null}

      {current ? (
        <View style={styles.currentCard}>
          <Text style={styles.sectionTitle}>Published version {current.version}</Text>
          <Text style={styles.help}>This link stays active until you withdraw it.</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open published grow timeline"
              style={styles.secondaryButton}
              onPress={() => router.push(publicPath as any)}
            >
              <Text style={styles.secondaryText}>Open Public Copy</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post visual grow story to GrowPath feed"
              style={styles.primaryButton}
              disabled={postingToFeed}
              onPress={() => void postToFeed()}
            >
              <Text style={styles.primaryText}>
                {postingToFeed ? "Posting…" : "Post to GrowPath Feed"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share published grow timeline"
              style={styles.secondaryButton}
              onPress={() =>
                void sharePublicLink(current.title, publicPath, {
                  description: current.description,
                  socialPreviewUrl: current.socialPreviewUrl
                })
              }
            >
              <Text style={styles.secondaryText}>Share / Copy Link</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Withdraw published grow timeline"
              style={styles.dangerButton}
              disabled={saving}
              onPress={() => void withdraw()}
            >
              <Text style={styles.dangerText}>Withdraw Link</Text>
            </Pressable>
          </View>
          <PublicShareActions
            heading="Share Visual Grow Story"
            title={current.title}
            description={current.description}
            path={publicPath}
            socialPreviewUrl={current.socialPreviewUrl}
          />
        </View>
      ) : null}

      {!loading ? (
        <>
          <Text style={styles.label}>Public title</Text>
          <TextInput
            accessibilityLabel="Public timeline title"
            style={styles.input}
            value={title}
            maxLength={160}
            onChangeText={(value) => {
              setTitle(value);
              setPreview(null);
            }}
          />
          <Text style={styles.label}>Public description (optional)</Text>
          <TextInput
            accessibilityLabel="Public timeline description"
            style={[styles.input, styles.multiline]}
            value={description}
            maxLength={1000}
            multiline
            onChangeText={(value) => {
              setDescription(value);
              setPreview(null);
            }}
          />

          <Text style={styles.sectionTitle}>1. Choose the shared story format</Text>
          <Text style={styles.help}>
            This controls what viewers receive. The event rows below only control privacy
            and are not the shared layout.
          </Text>
          <View style={styles.actions} accessibilityLabel="Public timeline layout">
            {(["visual", "list"] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: presentation === option }}
                style={[
                  styles.secondaryButton,
                  presentation === option && styles.selected
                ]}
                onPress={() => {
                  setPresentation(option);
                  setPreview(null);
                }}
              >
                <Text style={styles.secondaryText}>
                  {presentation === option ? "✓ " : ""}
                  {option === "visual"
                    ? "Horizontal Visual Grow Story"
                    : "Vertical Detailed List"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>2. Choose photos to include</Text>
          {availablePhotos.length ? (
            <>
              <Text style={styles.help}>
                {selectedPhotoUrls.size} of {availablePhotos.length} available photos are
                included. Each photo appears at its matching point in the Visual Grow
                Story. Tap a photo only if you want to keep it private.
              </Text>
              <View style={styles.photoGrid}>
                {availablePhotos.map((url) => {
                  const selected = selectedPhotoUrls.has(url);
                  return (
                    <Pressable
                      key={url}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${selected ? "Remove" : "Include"} timeline photo`}
                      style={[styles.photoCard, selected && styles.selected]}
                      onPress={() => togglePhoto(url)}
                    >
                      <Image
                        source={{ uri: resolveImageUri(url) }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                      <Text style={styles.photoLabel}>
                        {selected ? "✓ Included" : "Private"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={styles.help}>
              No photos were found in the currently selected timeline entries.
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review public grow timeline preview"
              accessibilityState={{
                disabled: saving || !title.trim() || !selectedEventIds.size
              }}
              style={styles.primaryButton}
              disabled={saving || !title.trim() || !selectedEventIds.size}
              onPress={() => void review()}
            >
              <Text style={styles.primaryText}>
                {saving ? "Preparing…" : "Preview Visual Grow Story"}
              </Text>
            </Pressable>
          </View>

          {preview ? (
            <View style={styles.currentCard} accessibilityLabel="Public timeline preview">
              <Text style={styles.sectionTitle}>Exact Public Preview</Text>
              <Text style={styles.eventTitle}>{preview.title}</Text>
              {preview.description ? (
                <Text style={styles.eventSummary}>{preview.description}</Text>
              ) : null}
              <Text style={styles.help}>
                {preview.events.length} events · {preview.photoCount} safe public photos
              </Text>
              {preview.cannabisSpecific ? (
                <Text style={styles.restrictedPreview}>
                  This copy will use cannabis/hemp age and visibility controls.
                </Text>
              ) : null}
              {preview.presentation === "visual" ? (
                <GrowTimelineFlow events={previewFlowEvents} />
              ) : (
                preview.events.map((event) => (
                  <View key={event.id} style={styles.event}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventMeta}>{fmtDate(event.timestamp)}</Text>
                    {event.summary ? (
                      <Text style={styles.eventSummary}>{event.summary}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>3. Included timeline entries</Text>
          <Text style={styles.help}>
            {selectedEventIds.size} of {events.length} saved events selected. You can
            preview immediately, or customize the entries used in the story.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${showEntrySelection ? "Hide" : "Customize"} included timeline entries`}
            style={styles.secondaryButton}
            onPress={() => setShowEntrySelection((visible) => !visible)}
          >
            <Text style={styles.secondaryText}>
              {showEntrySelection ? "Hide Entry Selection" : "Customize Included Entries"}
            </Text>
          </Pressable>
          {showEntrySelection
            ? events.map((event) => {
                const selected = selectedEventIds.has(String(event.id));
                return (
                  <Pressable
                    key={String(event.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${selected ? "Remove" : "Include"} ${event.title}`}
                    style={[styles.event, selected && styles.selected]}
                    onPress={() => toggleEvent(event)}
                  >
                    <Text style={styles.eventTitle}>
                      {selected ? "✓ " : "○ "}
                      {event.title}
                    </Text>
                    <Text style={styles.eventMeta}>{fmtDate(event.timestamp)}</Text>
                    {event.summary ? (
                      <Text style={styles.eventSummary}>{event.summary}</Text>
                    ) : null}
                  </Pressable>
                );
              })
            : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel public timeline review"
              style={styles.secondaryButton}
              disabled={saving}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            {preview ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Publish reviewed grow timeline"
                accessibilityState={{ disabled: saving }}
                style={styles.primaryButton}
                disabled={saving}
                onPress={() => void publish()}
              >
                <Text style={styles.primaryText}>
                  {saving
                    ? "Publishing…"
                    : current
                      ? "Publish New Version"
                      : "Publish Copy"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: palette.page },
    content: {
      padding: 20,
      paddingBottom: 48,
      width: "100%",
      maxWidth: 920,
      alignSelf: "center"
    },
    title: { color: palette.text, fontSize: 26, fontWeight: "900" },
    help: { color: palette.textMuted, lineHeight: 20, marginTop: 6 },
    label: { color: palette.text, fontWeight: "800", marginTop: 18, marginBottom: 6 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 46,
      padding: 12
    },
    multiline: { minHeight: 96, textAlignVertical: "top" },
    sectionTitle: { color: palette.text, fontSize: 18, fontWeight: "900", marginTop: 22 },
    event: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 10,
      padding: 12
    },
    selected: { borderColor: palette.accent, borderWidth: 2 },
    eventTitle: { color: palette.text, fontWeight: "800" },
    eventMeta: { color: palette.textMuted, fontSize: 12, marginTop: 3 },
    eventSummary: { color: palette.textSoft, lineHeight: 18, marginTop: 6 },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
    photoCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      overflow: "hidden",
      padding: 4
    },
    photo: { width: 150, height: 110, borderRadius: radius.card },
    photoLabel: {
      color: palette.text,
      fontSize: 12,
      fontWeight: "800",
      padding: 6,
      textAlign: "center"
    },
    currentCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 18,
      padding: 14
    },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
    primaryButton: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryText: { color: palette.link, fontWeight: "800" },
    dangerButton: {
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    dangerText: { color: palette.danger, fontWeight: "800" },
    error: { color: palette.danger, fontWeight: "700", marginTop: 12 },
    success: { color: palette.success, fontWeight: "700", marginTop: 12 },
    restrictedPreview: { color: palette.accent, fontWeight: "800", marginTop: 8 }
  });
