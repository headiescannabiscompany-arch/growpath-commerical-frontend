import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  abortVideoUpload,
  createVideo,
  deleteVideo,
  GrowPathVideo,
  listVideoLibrary,
  searchVideos,
  uploadVideoFile,
  updateVideo,
  VideoLibraryResponse,
  VideoVisibility,
  VideoWorkspaceType
} from "@/api/videos";
import { useAuth } from "@/auth/AuthContext";
import { InlineError } from "@/components/InlineError";
import LessonMediaSourceEditor from "@/components/learning/LessonMediaSourceEditor";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import VideoCard from "@/components/videos/VideoCard";
import { useEntitlements } from "@/entitlements";
import {
  emptyLessonMediaDraft,
  lessonMediaDraftFromLesson,
  prepareLessonMediaSubmission
} from "@/features/learning/lessonMedia";
import { formatBytes, videoStorageFallback } from "@/features/videos/videoPresentation";
import { radius } from "@/theme/theme";

const VISIBILITY_OPTIONS: Array<{ value: VideoVisibility; label: string }> = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers only" },
  { value: "unlisted", label: "Unlisted link" },
  { value: "private", label: "Private" },
  { value: "course_only", label: "Course only" },
  { value: "facility_internal", label: "Facility internal" }
];

const SORT_OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "popular", label: "Most viewed" }
] as const;

function splitList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function initialTab(value: unknown) {
  return String(Array.isArray(value) ? value[0] : value || "") === "library"
    ? "library"
    : "discover";
}

function visibilityOptions(workspaceType: VideoWorkspaceType) {
  return VISIBILITY_OPTIONS.filter((option) =>
    workspaceType === "facility" ? true : option.value !== "facility_internal"
  );
}

function durationSeconds(asset: any) {
  const duration = Math.max(0, Number(asset?.duration || 0));
  return duration > 1000 ? duration / 1000 : duration;
}

export default function VideosRoute() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const workspaceType = entitlements.mode as VideoWorkspaceType;
  const [tab, setTab] = useState<"discover" | "library">(() => initialTab(params.tab));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"new" | "popular">("new");
  const [followingOnly, setFollowingOnly] = useState(false);
  const [discoverVideos, setDiscoverVideos] = useState<GrowPathVideo[]>([]);
  const [library, setLibrary] = useState<VideoLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<GrowPathVideo | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [growInterests, setGrowInterests] = useState("");
  const [visibility, setVisibility] = useState<VideoVisibility>("public");
  const [cannabisSpecific, setCannabisSpecific] = useState(false);
  const [mediaDraft, setMediaDraft] = useState(() => emptyLessonMediaDraft());
  const [videoFile, setVideoFile] = useState<any>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const loadDiscover = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDiscoverVideos(
        await searchVideos({
          q: query.trim() || undefined,
          sort,
          limit: 30,
          followingOnly: followingOnly || undefined
        })
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [followingOnly, query, sort]);

  const loadLibrary = useCallback(async () => {
    if (!auth.isAuthed) {
      setLibrary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setLibrary(
        await listVideoLibrary(
          workspaceType,
          workspaceType === "facility" ? entitlements.facilityId || undefined : undefined
        )
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [auth.isAuthed, entitlements.facilityId, workspaceType]);

  useEffect(() => {
    if (tab === "library") void loadLibrary();
    else void loadDiscover();
  }, [loadDiscover, loadLibrary, tab]);

  const quota = useMemo(() => {
    const fallback = videoStorageFallback(entitlements.plan);
    return (
      library?.quota || {
        plan: entitlements.plan || "free",
        limitBytes: fallback,
        usedBytes: 0,
        remainingBytes: fallback,
        externalSourcesConsumeStorage: false,
        growPathUploadsConsumeStorage: true
      }
    );
  }, [entitlements.plan, library?.quota]);

  const canUpload =
    auth.isAuthed &&
    (library?.permissions?.canUpload ??
      entitlements.can("VIDEOS_UPLOAD") ??
      workspaceType !== "facility");
  const canPublish =
    library?.permissions?.canPublish ??
    entitlements.can("VIDEOS_PUBLISH") ??
    workspaceType !== "facility";
  const canManage =
    library?.permissions?.canManage ??
    entitlements.can("VIDEOS_MANAGE") ??
    workspaceType !== "facility";

  function resetForm() {
    setEditingId("");
    setTitle("");
    setDescription("");
    setTags("");
    setGrowInterests("");
    setVisibility("public");
    setCannabisSpecific(false);
    setMediaDraft(emptyLessonMediaDraft());
    setVideoFile(null);
    setUploadProgress(null);
  }

  async function pickVideo() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(new Error("Photo-library permission is required to upload a video."));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const size = Number(asset.fileSize || 0);
    if (size && size > quota.remainingBytes) {
      setError(
        new Error(
          `This file is ${formatBytes(size)}, but only ${formatBytes(quota.remainingBytes)} remains in this workspace.`
        )
      );
      return;
    }
    setVideoFile(asset);
    setMediaDraft((current) => ({
      ...current,
      sourceType: "growpath_upload",
      originalUrl: "",
      availabilityStatus: "unchecked",
      lastCheckedAt: "",
      allowEmbed: false
    }));
  }

  function editVideo(video: GrowPathVideo) {
    setEditingId(video.id);
    setTitle(video.title);
    setDescription(video.description || "");
    setTags((video.tags || []).join(", "));
    setGrowInterests((video.growInterests || []).join(", "));
    setVisibility(video.visibility);
    setCannabisSpecific(video.cannabisSpecific);
    setMediaDraft(lessonMediaDraftFromLesson(video));
    setVideoFile(null);
    setMessage(`Editing ${video.title}.`);
  }

  async function saveDraft() {
    if (!canUpload || !title.trim()) return;
    setSaving(true);
    setError(null);
    setMessage("");
    setUploadProgress(videoFile ? 0 : null);
    let uploadedAssetId = "";
    const uploadWorkspace = {
      workspaceType,
      workspaceId:
        workspaceType === "facility" ? entitlements.facilityId || undefined : undefined
    };
    try {
      const preview = videoFile
        ? null
        : prepareLessonMediaSubmission(mediaDraft, mediaDraft.originalUrl);
      if (preview?.errors.length) throw new Error(preview.errors.join(" "));
      const uploaded = videoFile
        ? await uploadVideoFile(videoFile, uploadWorkspace, (fraction) =>
            setUploadProgress(Math.round(fraction * 100))
          )
        : null;
      uploadedAssetId = uploaded?.assetId || "";
      const prepared = uploaded
        ? prepareLessonMediaSubmission(
            {
              ...mediaDraft,
              sourceType: "growpath_upload",
              availabilityStatus: "available",
              lastCheckedAt: new Date().toISOString(),
              allowEmbed: false
            },
            uploaded.url
          )
        : preview;
      if (!prepared?.mediaSource) throw new Error("Choose a video upload or video URL.");
      const input = {
        title: title.trim(),
        description: description.trim(),
        status: "draft" as const,
        visibility,
        workspaceType,
        workspaceId:
          workspaceType === "facility" ? entitlements.facilityId || undefined : undefined,
        mediaSource: prepared.mediaSource,
        thumbnailUrl: prepared.mediaSource.thumbnailUrl,
        durationSeconds: durationSeconds(videoFile),
        storageBytes: Number(videoFile?.fileSize || 0),
        mimeType: String(videoFile?.mimeType || ""),
        tags: splitList(tags),
        growInterests: splitList(growInterests),
        cannabisSpecific
      };
      const saved = editingId
        ? await updateVideo(editingId, input)
        : await createVideo(input);
      uploadedAssetId = "";
      setMessage(
        saved.storageCleanupWarning ||
          (editingId
            ? "Video changes saved as a draft."
            : "Video added to this workspace library as a draft.")
      );
      resetForm();
      await loadLibrary();
    } catch (err) {
      if (uploadedAssetId) {
        await abortVideoUpload(uploadedAssetId, uploadWorkspace).catch(() => undefined);
      }
      setError(err);
    } finally {
      setUploadProgress(null);
      setSaving(false);
    }
  }

  async function togglePublished(video: GrowPathVideo) {
    setSaving(true);
    setError(null);
    setMessage("");
    try {
      const nextStatus = video.status === "published" ? "draft" : "published";
      await updateVideo(video.id, { status: nextStatus });
      setMessage(
        nextStatus === "published"
          ? `${video.title} is now available under its selected visibility.`
          : `${video.title} is no longer published.`
      );
      await loadLibrary();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!confirmDelete) return;
    setSaving(true);
    setError(null);
    setMessage("");
    try {
      const result: any = await deleteVideo(
        confirmDelete.id,
        workspaceType,
        entitlements.facilityId || undefined
      );
      setMessage(
        result?.storageDeletionStatus === "pending"
          ? "The video was removed from the library. GrowPath storage release is pending."
          : "The video was removed from the library."
      );
      setConfirmDelete(null);
      await loadLibrary();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="videos"
      header={
        <View>
          <Text accessibilityRole="header" style={styles.pageTitle}>
            Videos
          </Text>
          <Text style={styles.subtitle}>
            Upload once, reuse videos in courses, and publish them for public or follower
            discovery.
          </Text>
        </View>
      }
    >
      <AppCard>
        <View accessibilityRole="tablist" style={styles.tabs}>
          {[
            { value: "discover", label: "Discover Videos" },
            { value: "library", label: "My / Workspace Library" }
          ].map((option) => {
            const selected = option.value === tab;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => {
                  setTab(option.value as "discover" | "library");
                  router.setParams({ tab: option.value });
                }}
                style={[styles.tab, selected && styles.tabSelected]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      {tab === "discover" ? (
        <>
          <AppCard>
            <Text style={styles.cardTitle}>Search published videos</Text>
            <TextInput
              accessibilityLabel="Search videos"
              onChangeText={setQuery}
              onSubmitEditing={() => void loadDiscover()}
              placeholder="Search titles, descriptions, tags, transcripts, or accounts"
              returnKeyType="search"
              style={styles.input}
              value={query}
            />
            <View accessibilityRole="radiogroup" style={styles.choiceRow}>
              {[
                { value: false, label: "All accessible videos" },
                { value: true, label: "People I follow" }
              ].map((option) => (
                <Pressable
                  key={String(option.value)}
                  accessibilityLabel={option.label}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: followingOnly === option.value,
                    disabled: option.value && !auth.isAuthed
                  }}
                  disabled={option.value && !auth.isAuthed}
                  onPress={() => setFollowingOnly(option.value)}
                  style={[
                    styles.choice,
                    followingOnly === option.value && styles.choiceSelected,
                    option.value && !auth.isAuthed && styles.disabled
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      followingOnly === option.value && styles.choiceTextSelected
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View accessibilityRole="radiogroup" style={styles.choiceRow}>
              {SORT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityLabel={`Sort videos by ${option.label}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sort === option.value }}
                  onPress={() => setSort(option.value)}
                  style={[styles.choice, sort === option.value && styles.choiceSelected]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      sort === option.value && styles.choiceTextSelected
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadDiscover()}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>Search Videos</Text>
            </Pressable>
          </AppCard>
          {loading ? <ActivityIndicator accessibilityLabel="Loading videos" /> : null}
          <InlineError error={error} />
          {!loading && !discoverVideos.length ? (
            <AppCard>
              <Text style={styles.empty}>No accessible videos match this search.</Text>
            </AppCard>
          ) : null}
          <View style={styles.grid}>
            {discoverVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </View>
        </>
      ) : !auth.isAuthed ? (
        <AppCard>
          <Text style={styles.cardTitle}>Sign in to manage a video library</Text>
          <Text style={styles.help}>
            Public video discovery remains available without signing in. Uploading and
            workspace storage require an account.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/login" as any)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Sign In</Text>
          </Pressable>
        </AppCard>
      ) : (
        <>
          <AppCard>
            <Text style={styles.cardTitle}>
              {workspaceType === "facility"
                ? "Facility video storage"
                : workspaceType === "commercial"
                  ? "Commercial video storage"
                  : "Personal video storage"}
            </Text>
            <Text style={styles.quota}>
              {formatBytes(quota.usedBytes)} used of {formatBytes(quota.limitBytes)}
            </Text>
            <View style={styles.meter}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${Math.min(
                      100,
                      quota.limitBytes ? (quota.usedBytes / quota.limitBytes) * 100 : 0
                    )}%`
                  }
                ]}
              />
            </View>
            <Text style={styles.help}>
              GrowPath uploads use this allowance. YouTube, Vimeo, Rumble, and other
              external links do not.
            </Text>
            {workspaceType === "facility" && !canUpload ? (
              <Text style={styles.warning}>
                Your Facility role can watch and follow videos but cannot upload to the
                shared Facility library.
              </Text>
            ) : null}
          </AppCard>

          {canUpload ? (
            <AppCard>
              <Text style={styles.cardTitle}>
                {editingId ? "Edit video draft" : "Add a video"}
              </Text>
              <TextInput
                accessibilityLabel="Video title"
                onChangeText={setTitle}
                placeholder="Video title"
                style={styles.input}
                value={title}
              />
              <TextInput
                accessibilityLabel="Video description"
                multiline
                onChangeText={setDescription}
                placeholder="Explain what viewers will learn or see"
                style={[styles.input, styles.textArea]}
                value={description}
              />
              <LessonMediaSourceEditor
                value={mediaDraft}
                onChange={setMediaDraft}
                disabled={saving}
                onPickUpload={pickVideo}
                pendingUploadName={videoFile?.fileName || videoFile?.name || ""}
                onRemove={() => {
                  setVideoFile(null);
                  setMediaDraft(emptyLessonMediaDraft());
                }}
              />
              {uploadProgress !== null ? (
                <View
                  accessibilityLabel={`Uploading video ${uploadProgress} percent`}
                  accessibilityLiveRegion="polite"
                  style={styles.uploadProgress}
                >
                  <ActivityIndicator accessibilityLabel="Uploading video" />
                  <View style={styles.uploadProgressCopy}>
                    <Text style={styles.fieldLabel}>Uploading video</Text>
                    <Text style={styles.help}>
                      {uploadProgress}% complete. Keep this page open until GrowPath
                      verifies the file.
                    </Text>
                  </View>
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>Who can watch?</Text>
              <View accessibilityRole="radiogroup" style={styles.choiceRow}>
                {visibilityOptions(workspaceType).map((option) => (
                  <Pressable
                    key={option.value}
                    accessibilityLabel={`Video visibility: ${option.label}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: visibility === option.value }}
                    onPress={() => setVisibility(option.value)}
                    style={[
                      styles.choice,
                      visibility === option.value && styles.choiceSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        visibility === option.value && styles.choiceTextSelected
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Video tags"
                onChangeText={setTags}
                placeholder="Tags, comma separated"
                style={styles.input}
                value={tags}
              />
              <TextInput
                accessibilityLabel="Video grow interests"
                onChangeText={setGrowInterests}
                placeholder="Grow interests, comma separated"
                style={styles.input}
                value={growInterests}
              />
              <Pressable
                accessibilityLabel="Mark video as cannabis or hemp specific"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: cannabisSpecific }}
                onPress={() => setCannabisSpecific((current) => !current)}
                style={[styles.checkbox, cannabisSpecific && styles.checkboxSelected]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    cannabisSpecific && styles.choiceTextSelected
                  ]}
                >
                  Cannabis or hemp-specific content
                </Text>
              </Pressable>
              <Text style={styles.help}>
                Cannabis/hemp-specific videos appear only to eligible audiences and do not
                unlock unrelated cannabis tools.
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving || !title.trim()}
                  onPress={() => void saveDraft()}
                  style={[
                    styles.primaryButton,
                    (saving || !title.trim()) && styles.disabled
                  ]}
                >
                  <Text style={styles.primaryText}>
                    {saving ? "Saving…" : editingId ? "Save Draft Changes" : "Add Draft"}
                  </Text>
                </Pressable>
                {editingId ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving}
                    onPress={resetForm}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Cancel Edit</Text>
                  </Pressable>
                ) : null}
              </View>
            </AppCard>
          ) : null}

          {message ? <Text style={styles.success}>{message}</Text> : null}
          <InlineError error={error} />
          {confirmDelete ? (
            <AppCard>
              <Text style={styles.cardTitle}>Remove {confirmDelete.title}?</Text>
              <Text style={styles.warning}>
                This removes the library record. If the video is attached to a course,
                GrowPath will block removal until you detach it. Uploaded file cleanup may
                remain pending until storage confirms deletion.
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityLabel={`Confirm removal of ${confirmDelete.title}`}
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => void confirmRemove()}
                  style={styles.dangerButton}
                >
                  <Text style={styles.dangerText}>Confirm Remove</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => setConfirmDelete(null)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>Keep Video</Text>
                </Pressable>
              </View>
            </AppCard>
          ) : null}
          {loading ? (
            <ActivityIndicator accessibilityLabel="Loading video library" />
          ) : null}
          {!loading && !library?.videos.length ? (
            <AppCard>
              <Text style={styles.empty}>This workspace has no videos yet.</Text>
            </AppCard>
          ) : null}
          <View style={styles.grid}>
            {(library?.videos || []).map((video) => {
              const currentUserId = String(auth.user?.id || auth.user?._id || "");
              const canEditOwnStaffDraft =
                !canManage &&
                canUpload &&
                !canPublish &&
                video.status === "draft" &&
                video.uploaderUserId === currentUserId;
              const canEdit = canManage || canEditOwnStaffDraft;
              return (
                <VideoCard
                  key={video.id}
                  video={video}
                  busy={saving}
                  ownerControls={canEdit || canPublish || canManage}
                  onEdit={canEdit ? editVideo : undefined}
                  onTogglePublished={canPublish ? togglePublished : undefined}
                  onDelete={
                    canManage || canEditOwnStaffDraft ? setConfirmDelete : undefined
                  }
                />
              );
            })}
          </View>
        </>
      )}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  pageTitle: { color: "#0F172A", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#64748B", lineHeight: 20, marginTop: 4 },
  cardTitle: { color: "#0F172A", fontSize: 19, fontWeight: "800", marginBottom: 8 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  tabSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  tabText: { color: "#334155", fontWeight: "800" },
  tabTextSelected: { color: "#FFFFFF" },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  choice: {
    borderColor: "#94A3B8",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  choiceSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  choiceText: { color: "#334155", fontSize: 13, fontWeight: "800" },
  choiceTextSelected: { color: "#FFFFFF" },
  checkbox: {
    alignSelf: "flex-start",
    borderColor: "#94A3B8",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  checkboxSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  fieldLabel: { color: "#0F172A", fontWeight: "800", marginBottom: 8 },
  uploadProgress: {
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    padding: 11
  },
  uploadProgressCopy: { flex: 1 },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    borderColor: "#94A3B8",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryText: { color: "#334155", fontWeight: "800" },
  dangerButton: {
    borderColor: "#DC2626",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  dangerText: { color: "#B91C1C", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  help: { color: "#64748B", fontSize: 12, lineHeight: 18 },
  warning: { color: "#92400E", lineHeight: 19 },
  success: { color: "#166534", fontWeight: "800" },
  empty: { color: "#64748B", paddingVertical: 8 },
  grid: { gap: 14 },
  quota: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  meter: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    height: 10,
    marginBottom: 8,
    marginTop: 8,
    overflow: "hidden"
  },
  meterFill: { backgroundColor: "#16A34A", height: "100%" }
});
