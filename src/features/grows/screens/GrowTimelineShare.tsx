import React, { useCallback, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  type LayoutChangeEvent,
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
  type GrowTimelineTextOverride,
  type GrowTimelinePublicEvent,
  type GrowTimelinePublicCopyInput,
  type GrowTimelinePublicPreview
} from "@/api/growTimelineCopies";
import { createForumPost } from "@/api/communitySocial";
import GrowTimelineFlow from "@/components/grows/GrowTimelineFlow";
import TimelinePreviewWording from "./TimelinePreviewWording";
import PublicShareActions from "@/components/sharing/PublicShareActions";
import { coerceParam, fmtDate, parseDisplayDate } from "@/features/grows/routeUtils";
import { timelineEventPhotos, visualTimelineEvents } from "@/features/grows/timeline";
import {
  getWorkspaceGrow,
  getWorkspaceGrowTimeline,
  type GrowWorkspace
} from "@/features/grows/workspaceData";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { currentPublicUrl, sharePublicLink } from "@/utils/publicLinks";
import { resolveImageUri } from "@/utils/photoUploads";

// Matches the public-copy API limit. The owner can change the selection before publishing.
const MAX_PUBLIC_EVENTS = 250;

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
  const requestedPresentation = useMemo(() => {
    const value = coerceParam(rawPresentation);
    return value === "visual" || value === "list" ? value : null;
  }, [rawPresentation]);
  return (
    <GrowTimelineShareReview
      key={JSON.stringify([workspace, growId, requestedPresentation])}
      {...{ workspace, growId, requestedPresentation }}
    />
  );
}

function GrowTimelineShareReview({
  workspace,
  growId,
  requestedPresentation
}: {
  workspace: GrowWorkspace;
  growId: string;
  requestedPresentation: "visual" | "list" | null;
}) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [presentation, setPresentation] = useState<"visual" | "list">(
    requestedPresentation || "visual"
  );
  const [current, setCurrent] = useState<GrowTimelinePublicCopy | null>(null);
  const [preview, setPreview] = useState<GrowTimelinePublicPreview | null>(null);
  const [reviewedInput, setReviewedInput] = useState<GrowTimelinePublicCopyInput | null>(
    null
  );
  const [editingPreview, setEditingPreview] = useState(false);
  const [wording, setWording] = useState<GrowTimelineTextOverride[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const editedPublicWording = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const previewPosition = useRef({
    generation: 0,
    cardTop: null as number | null,
    entryTop: null as number | null,
    pending: false
  });
  const previewGeneration = previewPosition.current.generation;
  const goToLatestPreviewEntry = () => {
    const position = previewPosition.current;
    if (position.cardTop === null || position.entryTop === null) {
      position.pending = true;
      return;
    }
    position.pending = false;
    scroll.current?.scrollTo({
      y: Math.max(0, position.cardTop + position.entryTop - 12),
      animated: false
    });
  };
  const recordPreviewLayout = (
    anchor: "cardTop" | "entryTop",
    event: LayoutChangeEvent
  ) => {
    const position = previewPosition.current;
    if (position.generation !== previewGeneration) return;
    position[anchor] = event.nativeEvent.layout.y;
    if (position.pending) goToLatestPreviewEntry();
  };
  const goToPreviewControls = () => {
    const top = previewPosition.current.cardTop;
    if (top !== null)
      scroll.current?.scrollTo({ y: Math.max(0, top - 8), animated: false });
  };
  const latestPreviewEntryId = useMemo(() => {
    let newestTime = -Infinity;
    let id: string | undefined;
    for (const event of preview?.events || []) {
      const time = parseDisplayDate(event.timestamp)?.getTime() ?? -Infinity;
      if (time >= newestTime) {
        newestTime = time;
        id = event.id;
      }
    }
    return id;
  }, [preview]);
  const savingRef = useRef(false);
  const draftEdited = useRef(false);
  const [missingSelection, setMissingSelection] = useState("");
  const communityRequest = useRef(false);
  const [sharingToCommunity, setSharingToCommunity] = useState(false);
  const [forumReceipt, setForumReceipt] = useState<{
    token: string;
    postId: string;
    held: boolean;
  } | null>(null);
  const [showEntrySelection, setShowEntrySelection] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(
    async (active: () => boolean) => {
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
          getWorkspaceGrowTimeline(workspace, growId, { throwOnError: true }),
          getCurrentGrowTimelineCopy(workspace, growId)
        ]);
        if (!active()) return;
        setEvents(timeline);
        const publishedIds = new Set(copy?.events.map((event) => event.id));
        const initial = copy
          ? timeline
              .filter((event) => publishedIds.has(String(event.id)))
              .slice(0, MAX_PUBLIC_EVENTS)
          : timeline.length > MAX_PUBLIC_EVENTS
            ? [...timeline]
                .sort(
                  (left, right) =>
                    new Date(right.timestamp).getTime() -
                    new Date(left.timestamp).getTime()
                )
                .slice(0, MAX_PUBLIC_EVENTS)
            : timeline;
        const availableIds = new Set(initial.map((event) => String(event.id)));
        setSelectedEventIds(availableIds);
        setWording(
          (copy?.ownerEventTextOverrides || []).filter((item) =>
            availableIds.has(item.eventId)
          )
        );
        editedPublicWording.current = false;
        const available = new Set(
          initial.flatMap((event) => timelineEventPhotos(event as any))
        );
        const photos = copy
          ? (copy.ownerPhotoSources || []).flatMap((aliases) => {
              const match = aliases.find((url) => available.has(url));
              return match ? [match] : [];
            })
          : [...available].slice(0, 12);
        setSelectedPhotoUrls(new Set(photos));
        const missingEvents = copy ? publishedIds.size - initial.length : 0;
        const missingPhotos = copy ? copy.photos.length - photos.length : 0;
        setMissingSelection(
          copy && (missingEvents > 0 || missingPhotos > 0)
            ? `The previous version includes ${[missingEvents > 0 ? `${missingEvents} ${missingEvents === 1 ? "entry" : "entries"}` : "", missingPhotos > 0 ? `${missingPhotos} ${missingPhotos === 1 ? "photo" : "photos"}` : ""].filter(Boolean).join(" and ")} that could not be matched. Check the selection before replacing that version.`
            : ""
        );
        setTitle(copy?.title || `Grow timeline: ${grow?.name || "My grow"}`);
        setDescription(copy?.description || "");
        setPresentation(requestedPresentation || copy?.presentation || "visual");
        setCurrent(copy);
        setPreview(null);
      } catch (caught: any) {
        if (active())
          setError(caught?.message || "The timeline share review could not be loaded.");
      } finally {
        if (active()) setLoading(false);
      }
    },
    [growId, requestedPresentation, workspace]
  );

  useFocusEffect(
    useCallback(() => {
      if (savingRef.current || communityRequest.current || draftEdited.current) return;
      let active = true;
      void load(() => active);
      return () => {
        active = false;
      };
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
      ),
    [events, selectedEventIds]
  );

  const toggleEvent = (event: any) => {
    if (saving) return;
    draftEdited.current = true;
    setPreview(null);
    const id = String(event.id);
    if (selectedEventIds.has(id))
      setWording((previous) => previous.filter((item) => item.eventId !== id));
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
      } else if (next.size < MAX_PUBLIC_EVENTS) {
        next.add(id);
      }
      return next;
    });
  };

  const togglePhoto = (url: string) => {
    if (saving) return;
    draftEdited.current = true;
    setPreview(null);
    setSelectedPhotoUrls((previous) => {
      const next = new Set(previous);
      if (next.has(url)) next.delete(url);
      else if (next.size < 12) next.add(url);
      return next;
    });
  };

  const input = (overrides: GrowTimelineTextOverride[]): GrowTimelinePublicCopyInput => ({
    title: title.trim(),
    description: description.trim(),
    presentation,
    eventIds: [...selectedEventIds],
    ...(overrides.length
      ? {
          eventTextOverrides: overrides.filter((item) =>
            selectedEventIds.has(item.eventId)
          )
        }
      : {}),
    photoUrls: [...selectedPhotoUrls].filter((url) => availablePhotos.includes(url))
  });

  const previewFlowEvents = useMemo(() => {
    if (!preview) return [];
    return visualTimelineEvents(
      preview.events.map((event, index) => {
        const source = events.find((candidate) => String(candidate.id) === event.id);
        return {
          id: event.id || `${event.timestamp}-${index}`,
          sourceId: source?.sourceId,
          sourceModel: source?.sourceModel,
          title: event.title,
          summary: event.summary,
          timestamp: event.timestamp,
          type: event.type,
          highlights: event.tags,
          payload: source?.payload?.linkedLogId
            ? { linkedLogId: source.payload.linkedLogId }
            : undefined,
          photos: source
            ? timelineEventPhotos(source as any).filter((url) =>
                selectedPhotoUrls.has(url)
              )
            : []
        };
      })
    );
  }, [events, preview, selectedPhotoUrls]);

  const review = async (overrides = wording) => {
    if (
      savingRef.current ||
      !growId ||
      !title.trim() ||
      !selectedEventIds.size ||
      missingSelection
    )
      return;
    draftEdited.current = true;
    savingRef.current = true;
    const request = input(overrides);
    setReviewedInput(null);
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const reviewed = await previewGrowTimelineCopy(workspace, growId, request);
      if (!reviewed)
        throw new Error("The preview could not be confirmed. Try previewing again.");
      if (
        (editedPublicWording.current || overrides.length) &&
        !reviewed.previewRevision
      ) {
        throw new Error(
          "This server could not confirm the edited public wording. The draft is still here. Try updating the preview again."
        );
      }
      setEditingPreview(false);
      // Both offsets are relative to their direct parents. Wait for the new review's
      // layout before moving, including after a draft change or a repeated preview.
      previewPosition.current = {
        generation: previewPosition.current.generation + 1,
        cardTop: null,
        entryTop: reviewed.events.length ? null : 0,
        pending: true
      };
      setReviewedInput(
        reviewed.previewRevision
          ? { ...request, previewRevision: reviewed.previewRevision }
          : request
      );
      setPreview(reviewed);
      setFeedback(
        "Review the exact public fields below, then publish when they are right."
      );
    } catch (caught: any) {
      setPreview(null);
      setEditingPreview(true);
      setError(caught?.message || "The public preview could not be created.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const publish = async () => {
    if (savingRef.current || editingEntry || !growId || !preview || !reviewedInput)
      return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const copy = await publishGrowTimelineCopy(workspace, growId, reviewedInput);
      if (!copy?.token) {
        throw new Error(
          "The published link could not be confirmed. Reopen sharing to check your published version before trying again."
        );
      }
      draftEdited.current = false;
      setCurrent(copy);
      setPreview(null);
      setReviewedInput(null);
      setFeedback(
        "Your reviewed timeline is published. Open it or choose where to share it."
      );
      scroll.current?.scrollTo({ y: 0, animated: false });
    } catch (caught: any) {
      if (caught?.code === "TIMELINE_PREVIEW_CHANGED") {
        setEditingPreview(true);
        setPreview(null);
        setReviewedInput(null);
        setError(
          "The timeline changed since this preview. Review it again before publishing."
        );
        return;
      }
      // A lost POST reply may follow a successful write. Check the owner's current copy
      // before offering to retry, because publishing twice would retire the first link.
      const found = await getCurrentGrowTimelineCopy(workspace, growId).catch(() => null);
      if (found?.token && found.token !== current?.token) {
        draftEdited.current = false;
        setCurrent(found);
        setPreview(null);
        setReviewedInput(null);
        setFeedback(
          "A published version was found. Open it to check what viewers receive."
        );
        scroll.current?.scrollTo({ y: 0, animated: false });
      } else {
        setError(caught?.message || "The public timeline could not be confirmed.");
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const withdraw = async () => {
    if (!growId || savingRef.current || communityRequest.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await withdrawGrowTimelineCopy(workspace, growId);
      draftEdited.current = false;
      setMissingSelection("");
      setCurrent(null);
      setFeedback("The public link is withdrawn. Your private grow was not changed.");
    } catch (caught: any) {
      setError(caught?.message || "The public link could not be withdrawn.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const publicPath = current?.token ? `/grow-timeline/${current.token}` : "";
  const selectedStoryLabel =
    presentation === "list" ? "Grow Timeline List" : "Visual Grow Story";
  const currentStoryLabel =
    current?.presentation === "list" ? "Grow Timeline List" : "Visual Grow Story";
  const publishedPointCount = useMemo(
    () =>
      current?.presentation === "list"
        ? current.events.length
        : visualTimelineEvents(current?.events || []).length,
    [current]
  );

  const shareInCommunity = async () => {
    if (
      !current ||
      !publicPath ||
      communityRequest.current ||
      savingRef.current ||
      forumReceipt?.token === current.token
    )
      return;
    communityRequest.current = true;
    setSharingToCommunity(true);
    setError("");
    try {
      const feedImageUrl =
        current.socialPreviewImageUrl || current.photos?.[0]?.url || "";
      const invitation =
        current.presentation === "list"
          ? "Explore the detailed Grow Timeline List"
          : "Explore the horizontal Visual Grow Story";
      const created = await createForumPost({
        title: current.title,
        body: `${current.cannabisSpecific ? "Cannabis content.\n\n" : ""}${invitation}: ${currentPublicUrl(publicPath)}`,
        photos: feedImageUrl ? [feedImageUrl] : [],
        tags: current.cannabisSpecific ? ["cannabis", "grow story"] : ["grow story"],
        authorType: workspace === "commercial" ? "commercial" : "user",
        workspaceContext: workspace,
        visibility: "public"
      });
      const held = Boolean(created?.isHidden || created?.moderationStatus === "held");
      setForumReceipt({
        token: current.token,
        postId: String(created?.id || created?._id || ""),
        held
      });
      setFeedback(
        held
          ? created?.moderationNotice || "Your Forum post was submitted for moderation."
          : `The ${currentStoryLabel} was shared in Forum / Q&A.`
      );
    } catch (caught: any) {
      setError(
        caught?.message || `The ${currentStoryLabel} could not be shared in Forum / Q&A.`
      );
    } finally {
      communityRequest.current = false;
      setSharingToCommunity(false);
    }
  };

  function editPreview() {
    draftEdited.current = true;
    setEditingPreview(true);
    setPreview(null);
    setReviewedInput(null);
    setFeedback("");
    setError("");
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  function editEventWording(event?: GrowTimelinePublicEvent) {
    if (!event) return null;
    return (
      <TimelinePreviewWording
        key={event.id}
        event={event}
        override={wording.find((item) => item.eventId === event.id)}
        disabled={saving || Boolean(editingEntry && editingEntry !== event.id)}
        onEditingChange={(open) =>
          setEditingEntry((active) =>
            open ? event.id : active === event.id ? null : active
          )
        }
        onApply={(next) => {
          const updated = wording.filter((item) => item.eventId !== event.id);
          if (next.title !== undefined || next.summary !== undefined) updated.push(next);
          editedPublicWording.current = true;
          setWording(updated);
          setEditingEntry(null);
          void review(updated);
        }}
      />
    );
  }

  const cannotReview =
    saving || !title.trim() || !selectedEventIds.size || Boolean(missingSelection);

  return (
    <ScrollView ref={scroll} style={styles.page} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        {editingPreview ? "Edit public preview" : "Review Public Grow Timeline"}
      </Text>
      <Text style={styles.help}>
        Preview the entries and photos first. After you publish, you can open the viewer,
        send the link to another app, or post it in Forum / Q&amp;A.
      </Text>

      {loading ? <ActivityIndicator color={palette.accent} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {feedback ? <Text style={styles.success}>{feedback}</Text> : null}

      {preview ? (
        <View
          key={previewGeneration}
          onLayout={(event) => recordPreviewLayout("cardTop", event)}
          style={styles.currentCard}
          accessibilityLabel="Public timeline preview"
        >
          <Text style={styles.sectionTitle}>Exact Public Preview</Text>
          <Text style={styles.eventTitle}>{preview.title}</Text>
          {preview.description ? (
            <Text style={styles.eventSummary}>{preview.description}</Text>
          ) : null}
          <Text style={styles.help}>
            {preview.events.length} included{" "}
            {preview.events.length === 1 ? "event" : "events"} · {preview.photoCount}{" "}
            public {preview.photoCount === 1 ? "photo" : "photos"}
          </Text>
          {preview.cannabisSpecific ? (
            <Text style={styles.restrictedPreview}>
              This copy will use cannabis/hemp age and visibility controls.
            </Text>
          ) : null}
          {current ? (
            <Text style={styles.help}>
              Publishing this version will replace the previous public link.
            </Text>
          ) : null}
          <View style={styles.actions}>
            {preview.presentation === "list" && preview.events.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go to latest preview entry"
                style={styles.secondaryButton}
                onPress={goToLatestPreviewEntry}
              >
                <Text style={styles.secondaryText}>Latest entry</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Publish reviewed grow timeline"
              accessibilityState={{
                disabled: saving || Boolean(editingEntry) || !reviewedInput
              }}
              style={styles.primaryButton}
              disabled={saving || Boolean(editingEntry) || !reviewedInput}
              onPress={() => void publish()}
            >
              <Text style={styles.primaryText}>
                {saving
                  ? "Publishing…"
                  : current
                    ? "Publish New Version"
                    : "Publish timeline"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit public timeline preview"
              style={styles.secondaryButton}
              disabled={saving || Boolean(editingEntry)}
              onPress={editPreview}
            >
              <Text style={styles.secondaryText}>Edit preview</Text>
            </Pressable>
          </View>
          {preview.presentation === "visual" ? (
            <View onLayout={(event) => recordPreviewLayout("entryTop", event)}>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={goToPreviewControls}
              >
                <Text style={styles.secondaryText}>Back to preview controls</Text>
              </Pressable>
              <GrowTimelineFlow
                events={previewFlowEvents}
                renderEntryActions={(id) =>
                  editEventWording(preview.events.find((event) => event.id === id))
                }
              />
            </View>
          ) : (
            preview.events.map((event) => (
              <View
                key={event.id}
                style={styles.event}
                onLayout={
                  event.id === latestPreviewEntryId
                    ? (layout) => recordPreviewLayout("entryTop", layout)
                    : undefined
                }
              >
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{fmtDate(event.timestamp)}</Text>
                {event.summary ? (
                  <Text style={styles.eventSummary}>{event.summary}</Text>
                ) : null}
                {editEventWording(event)}
                {event.id === latestPreviewEntryId ? (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.secondaryButton}
                    onPress={goToPreviewControls}
                  >
                    <Text style={styles.secondaryText}>Back to preview controls</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}

      {!loading && !preview && !editingPreview && current ? (
        <View style={styles.currentCard}>
          <Text style={styles.sectionTitle}>Published version {current.version}</Text>
          <Text style={styles.help}>
            {publishedPointCount} published{" "}
            {current.presentation === "list"
              ? publishedPointCount === 1
                ? "list entry"
                : "list entries"
              : publishedPointCount === 1
                ? "timeline point"
                : "timeline points"}
            {" · "}
            {current.photos.length} {current.photos.length === 1 ? "photo" : "photos"}.{" "}
            Sharing uses this published version, not the selections below. To include more
            entries or photos, preview your selection and publish a new version.
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open published grow timeline"
              style={styles.secondaryButton}
              onPress={() => router.push(publicPath as any)}
            >
              <Text style={styles.secondaryText}>View published timeline</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share published timeline to another app"
              style={styles.primaryButton}
              onPress={async () => {
                setError("");
                try {
                  const result = await sharePublicLink(current.title, publicPath, {
                    description: current.description
                  });
                  if (result.method.includes("clipboard"))
                    setFeedback("Published timeline link copied.");
                } catch (caught: any) {
                  if (caught?.name !== "AbortError")
                    setError(
                      "Sharing could not open. Select and copy the published timeline link below."
                    );
                }
              }}
            >
              <Text style={styles.primaryText}>Share to another app</Text>
            </Pressable>
            {forumReceipt?.token === current.token ? (
              forumReceipt.held ? (
                <Text style={styles.help}>Awaiting Forum moderation</Text>
              ) : (
                <Pressable
                  accessibilityRole="link"
                  style={styles.secondaryButton}
                  onPress={() =>
                    router.push(
                      forumReceipt.postId
                        ? { pathname: "/forum/post", params: { id: forumReceipt.postId } }
                        : "/forum"
                    )
                  }
                >
                  <Text style={styles.secondaryText}>
                    {forumReceipt.postId ? "View your Forum post" : "Open Forum / Q&A"}
                  </Text>
                </Pressable>
              )
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Share ${currentStoryLabel} in Forum / Q&A`}
                style={styles.secondaryButton}
                disabled={sharingToCommunity || saving}
                onPress={() => void shareInCommunity()}
              >
                <Text style={styles.secondaryText}>
                  {sharingToCommunity ? "Sharing…" : "Share in Forum / Q&A"}
                </Text>
              </Pressable>
            )}
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
          <Text
            selectable
            accessibilityLabel="Published timeline link"
            style={styles.help}
          >
            {currentPublicUrl(publicPath)}
          </Text>
          {current.socialPreviewImageUrl ? (
            <>
              <Text style={styles.help}>Published social preview</Text>
              <Image
                accessibilityLabel="Published timeline social preview"
                source={{ uri: current.socialPreviewImageUrl }}
                style={styles.socialPreview}
                resizeMode="contain"
              />
            </>
          ) : null}
          <Text style={styles.help}>
            Publishing a new version or withdrawing this one closes this link.
          </Text>
          <PublicShareActions
            heading={`Share ${currentStoryLabel}`}
            title={current.title}
            description={current.description}
            path={publicPath}
            socialPreviewUrl={current.socialPreviewUrl}
          />
        </View>
      ) : null}

      {!loading && !preview ? (
        <>
          {missingSelection ? (
            <View style={styles.currentCard}>
              <Text accessibilityRole="alert" style={styles.help}>
                {missingSelection}
              </Text>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={() => {
                  draftEdited.current = true;
                  setMissingSelection("");
                }}
              >
                <Text style={styles.secondaryText}>
                  Continue with my available selection
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                editingPreview
                  ? "Update public timeline preview"
                  : "Review public grow timeline preview"
              }
              accessibilityState={{ disabled: cannotReview }}
              style={styles.primaryButton}
              disabled={cannotReview}
              onPress={() => void review()}
            >
              <Text style={styles.primaryText}>
                {saving
                  ? "Preparing…"
                  : editingPreview
                    ? "Update preview"
                    : `Preview ${selectedStoryLabel}`}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.label}>Public title</Text>
          <TextInput
            accessibilityLabel="Public timeline title"
            style={styles.input}
            value={title}
            editable={!saving}
            maxLength={160}
            onChangeText={(value) => {
              draftEdited.current = true;
              setTitle(value);
              setPreview(null);
            }}
          />
          <Text style={styles.label}>Public description (optional)</Text>
          <TextInput
            accessibilityLabel="Public timeline description"
            style={[styles.input, styles.multiline]}
            value={description}
            editable={!saving}
            maxLength={1000}
            multiline
            onChangeText={(value) => {
              draftEdited.current = true;
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
                disabled={saving}
                style={[
                  styles.secondaryButton,
                  presentation === option && styles.selected
                ]}
                onPress={() => {
                  draftEdited.current = true;
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
                included (up to 12). Each photo appears with its matching timeline entry
                in the {selectedStoryLabel}. Uncheck a photo to keep it private or make
                room for another.
              </Text>
              <View style={styles.photoGrid}>
                {availablePhotos.map((url) => {
                  const selected = selectedPhotoUrls.has(url);
                  return (
                    <Pressable
                      key={url}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      disabled={saving || (!selected && selectedPhotoUrls.size >= 12)}
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

          <Text style={styles.sectionTitle}>3. Included timeline entries</Text>
          <Text style={styles.help}>
            {selectedEventIds.size} of {events.length} saved events selected. You can
            preview immediately, or customize the entries used in the story.
            {current
              ? " Your previous public selection is restored where available. Choose additional entries to include them."
              : ""}
            {events.length > MAX_PUBLIC_EVENTS
              ? current
                ? " A public copy can include up to 250 entries."
                : " A public copy can include up to 250 entries. The latest 250 are selected initially."
              : ""}
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
                    disabled={
                      saving || (!selected && selectedEventIds.size >= MAX_PUBLIC_EVENTS)
                    }
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
            {editingPreview ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Update preview after editing selections"
                style={styles.primaryButton}
                disabled={cannotReview}
                onPress={() => void review()}
              >
                <Text style={styles.primaryText}>
                  {saving ? "Preparing…" : "Update preview"}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel public timeline review"
              style={styles.secondaryButton}
              disabled={saving}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
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
    socialPreview: {
      width: "100%",
      aspectRatio: 1200 / 630,
      marginTop: 10,
      borderRadius: radius.card
    },
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
