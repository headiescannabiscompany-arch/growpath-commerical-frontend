import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Redirect } from "expo-router";

import { InlineError } from "@/components/InlineError";
import {
  createCommercialFeedPost,
  listCommercialFeedPosts,
  type CommercialFeedPost,
  type CommercialFeedPostType
} from "@/api/commercialFeed";
import { useEntitlements } from "@/entitlements";
import {
  facilitySalesPolicyText,
  hasFacilitySalesLanguage
} from "@/utils/commercialFeedPolicy";
import { resolveImageUri } from "@/utils/photoUploads";

const COMMERCIAL_TYPES: CommercialFeedPostType[] = [
  "update",
  "listing",
  "iso",
  "drop",
  "question",
  "education"
];
const FACILITY_TYPES: CommercialFeedPostType[] = ["education"];
type CampaignKind =
  | "product_ad"
  | "course_ad"
  | "live_ad"
  | "storefront_ad"
  | "facility_outreach"
  | "general_campaign";

const COMMERCIAL_CAMPAIGN_KINDS: CampaignKind[] = [
  "product_ad",
  "course_ad",
  "live_ad",
  "storefront_ad",
  "general_campaign"
];
const FACILITY_CAMPAIGN_KINDS: CampaignKind[] = ["facility_outreach"];

const campaignKindLabels: Record<CampaignKind, string> = {
  product_ad: "Product ad",
  course_ad: "Course ad",
  live_ad: "Live event ad",
  storefront_ad: "Storefront ad",
  facility_outreach: "Facility outreach",
  general_campaign: "General campaign"
};

function backendTypeForCampaignKind(kind: CampaignKind): CommercialFeedPostType {
  if (kind === "product_ad") return "listing";
  if (kind === "course_ad") return "education";
  if (kind === "live_ad") return "drop";
  if (kind === "facility_outreach") return "education";
  return "update";
}

function campaignReadinessWarnings({
  campaignKind,
  linkedProductId,
  linkedCourseId,
  linkedLiveId,
  storefrontSlug,
  linkedForumThreadId,
  externalLinkUrl,
  imageUrl
}: {
  campaignKind: CampaignKind;
  linkedProductId: string;
  linkedCourseId: string;
  linkedLiveId: string;
  storefrontSlug: string;
  linkedForumThreadId: string;
  externalLinkUrl: string;
  imageUrl: string;
}) {
  const warnings: string[] = [];
  const hasDestination =
    linkedProductId.trim() ||
    linkedCourseId.trim() ||
    linkedLiveId.trim() ||
    storefrontSlug.trim() ||
    linkedForumThreadId.trim() ||
    externalLinkUrl.trim();
  if (campaignKind === "product_ad" && !linkedProductId.trim()) {
    warnings.push("Product ad should link to a product.");
  }
  if (campaignKind === "course_ad" && !linkedCourseId.trim()) {
    warnings.push("Course ad should link to a course.");
  }
  if (campaignKind === "live_ad" && !linkedLiveId.trim()) {
    warnings.push("Live event ad should link to a live.");
  }
  if (campaignKind === "storefront_ad" && !storefrontSlug.trim()) {
    warnings.push("Storefront ad should link to a storefront.");
  }
  if (!hasDestination) {
    warnings.push("Add at least one destination before promoting broadly.");
  }
  if (!imageUrl.trim()) {
    warnings.push("Add an image or creative before publishing a polished campaign.");
  }
  return warnings;
}

function authorLabel(post: CommercialFeedPost) {
  return post.author?.displayName || post.author?.email || "GrowPath member";
}

function campaignMeta(post: CommercialFeedPost) {
  const created = post.createdAt ? new Date(post.createdAt).toLocaleString() : "";
  return [authorLabel(post), created, post.location].filter(Boolean).join(" - ");
}

function campaignImage(post: CommercialFeedPost) {
  return resolveImageUri(
    post.imageUrl || post.creativeImageUrl || post.bannerImageUrl || ""
  );
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function CommercialFeedRoute() {
  const ent = useEntitlements();
  const isFacility = ent.mode === "facility";
  const isCommercial = ent.mode === "commercial";
  const allowedTypes = isFacility ? FACILITY_TYPES : COMMERCIAL_TYPES;
  const allowedCampaignKinds = isFacility
    ? FACILITY_CAMPAIGN_KINDS
    : COMMERCIAL_CAMPAIGN_KINDS;

  const [items, setItems] = useState<CommercialFeedPost[]>([]);
  const [type, setType] = useState<CommercialFeedPostType>(allowedTypes[0]);
  const [campaignKind, setCampaignKind] = useState<CampaignKind>(allowedCampaignKinds[0]);
  const [filterType, setFilterType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [linkedProductId, setLinkedProductId] = useState("");
  const [linkedCourseId, setLinkedCourseId] = useState("");
  const [linkedLiveId, setLinkedLiveId] = useState("");
  const [linkedGrowId, setLinkedGrowId] = useState("");
  const [linkedForumThreadId, setLinkedForumThreadId] = useState("");
  const [storefrontSlug, setStorefrontSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [externalLinkUrl, setExternalLinkUrl] = useState("");
  const [externalLinkLabel, setExternalLinkLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<any>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!allowedTypes.includes(type)) setType(allowedTypes[0]);
  }, [allowedTypes, type]);

  useEffect(() => {
    if (!allowedCampaignKinds.includes(campaignKind)) {
      setCampaignKind(allowedCampaignKinds[0]);
    }
    setType(backendTypeForCampaignKind(campaignKind));
  }, [allowedCampaignKinds, campaignKind]);

  const canAccess = ent.ready && (isCommercial || isFacility);
  const canCreate = body.trim().length > 0 && !creating;
  const readinessWarnings = campaignReadinessWarnings({
    campaignKind,
    linkedProductId,
    linkedCourseId,
    linkedLiveId,
    storefrontSlug,
    linkedForumThreadId,
    externalLinkUrl,
    imageUrl
  });

  const helper = useMemo(
    () =>
      isFacility
        ? "Facility feed campaigns are outreach placements. Share training, SOP, IPM, safety, cultivation, compliance, and professional education. Direct sales listings are blocked for facility accounts."
        : "Create outreach campaigns that promote products, courses, lives, storefronts, offers, and brand updates. Use Forum/Q&A for discussion.",
    [isFacility]
  );

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!canAccess) return;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await listCommercialFeedPosts({
          type: filterType,
          q: q.trim(),
          limit: 30
        });
        setItems(res.items);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canAccess, filterType, q]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function createCampaign() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    setFeedback("");
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const cleanTags = splitTags(tags);
    const cleanLocation = location.trim();
    const cleanExternalUrl = externalLinkUrl.trim();
    const cleanExternalLabel = externalLinkLabel.trim();
    if (isFacility && hasFacilitySalesLanguage([cleanTitle, cleanBody, ...cleanTags])) {
      setCreating(false);
      setFeedback(facilitySalesPolicyText());
      return;
    }
    try {
      await createCommercialFeedPost({
        type: isFacility ? "education" : backendTypeForCampaignKind(campaignKind),
        title: cleanTitle,
        body: cleanBody,
        tags: cleanTags,
        location: cleanLocation,
        linkedProductId: linkedProductId.trim() || undefined,
        linkedCourseId: linkedCourseId.trim() || undefined,
        linkedLiveId: linkedLiveId.trim() || undefined,
        linkedGrowId: linkedGrowId.trim() || undefined,
        linkedForumThreadId: linkedForumThreadId.trim() || undefined,
        storefrontSlug: storefrontSlug.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        externalLinks: cleanExternalUrl
          ? [{ label: cleanExternalLabel || "External link", url: cleanExternalUrl }]
          : undefined
      });
      setTitle("");
      setBody("");
      setTags("");
      setLocation("");
      setLinkedProductId("");
      setLinkedCourseId("");
      setLinkedLiveId("");
      setLinkedGrowId("");
      setLinkedForumThreadId("");
      setStorefrontSlug("");
      setImageUrl("");
      setExternalLinkUrl("");
      setExternalLinkLabel("");
      setFeedback(
        isFacility ? "Facility outreach campaign published." : "Feed campaign published."
      );
      await load({ refresh: true });
    } catch (e) {
      setError(e);
    } finally {
      setCreating(false);
    }
  }

  async function pickCampaignImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback("Photo-library permission is required to attach an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85
    });
    if (result.canceled) return;
    const uri = result.assets.find((asset) => asset.uri)?.uri;
    if (uri) {
      setImageUrl(uri);
      setFeedback("");
    }
  }

  if (!ent.ready) return null;
  if (!canAccess) return <Redirect href="/home/personal" />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load({ refresh: true })}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {isFacility ? "Facility Outreach" : "Feed / Campaigns"}
        </Text>
        <Text style={styles.subtitle}>{helper}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create Campaign</Text>
        <Text style={styles.linkBoxText}>
          Feed is advertising and outreach. Link the campaign to a product, course, live,
          storefront, or support Q&A thread. Keep threaded conversation in Forum/Q&A.
        </Text>
        <View style={styles.chipRow}>
          {allowedCampaignKinds.map((option) => (
            <Pressable
              key={option}
              onPress={() => setCampaignKind(option)}
              accessibilityLabel={`Select ${campaignKindLabels[option]} campaign type`}
              style={[styles.chip, campaignKind === option && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  campaignKind === option && styles.chipTextSelected
                ]}
              >
                {campaignKindLabels[option]}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder={isFacility ? "Educational topic" : "Title"}
          accessibilityLabel="Feed campaign title"
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          style={[styles.input, styles.bodyInput]}
          placeholder={
            isFacility
              ? "Teach something useful: SOP notes, scouting lesson, compliance tip..."
              : "What do you want to share?"
          }
          multiline
          accessibilityLabel="Feed campaign body"
        />
        <TextInput
          value={tags}
          onChangeText={setTags}
          style={styles.input}
          placeholder="Tags, comma separated"
          accessibilityLabel="Feed campaign tags"
        />
        <TextInput
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          placeholder="Location (optional)"
          accessibilityLabel="Feed campaign location"
        />
        {!isFacility ? (
          <View style={styles.linkBox}>
            <Text style={styles.linkBoxTitle}>Optional commercial links</Text>
            <Text style={styles.linkBoxText}>
              Attach product, course, live, grow/trial, storefront, external purchase
              context, or a Forum/Q&A thread so users can move from the ad into the right
              public surface.
            </Text>
            <TextInput
              value={linkedProductId}
              onChangeText={setLinkedProductId}
              style={styles.input}
              placeholder="Linked product ID or slug"
              autoCapitalize="none"
              accessibilityLabel="Linked product"
            />
            <TextInput
              value={linkedCourseId}
              onChangeText={setLinkedCourseId}
              style={styles.input}
              placeholder="Linked course ID or slug"
              autoCapitalize="none"
              accessibilityLabel="Linked course"
            />
            <TextInput
              value={linkedLiveId}
              onChangeText={setLinkedLiveId}
              style={styles.input}
              placeholder="Linked live ID or slug"
              autoCapitalize="none"
              accessibilityLabel="Linked live"
            />
            <TextInput
              value={linkedGrowId}
              onChangeText={setLinkedGrowId}
              style={styles.input}
              placeholder="Linked grow or trial ID"
              autoCapitalize="none"
              accessibilityLabel="Linked grow or trial"
            />
            <TextInput
              value={linkedForumThreadId}
              onChangeText={setLinkedForumThreadId}
              style={styles.input}
              placeholder="Linked Forum/Q&A thread ID"
              autoCapitalize="none"
              accessibilityLabel="Linked forum thread"
            />
            <TextInput
              value={storefrontSlug}
              onChangeText={setStorefrontSlug}
              style={styles.input}
              placeholder="Storefront slug"
              autoCapitalize="none"
              accessibilityLabel="Linked storefront slug"
            />
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              style={styles.input}
              placeholder="Campaign image URL or uploaded creative"
              autoCapitalize="none"
              accessibilityLabel="Commercial feed campaign image URL"
            />
            <View style={styles.imageTools}>
              <Pressable
                onPress={pickCampaignImage}
                accessibilityRole="button"
                accessibilityLabel="Upload commercial feed campaign image"
                style={styles.secondaryButton}
                disabled={creating}
              >
                <Text style={styles.secondaryButtonText}>Upload image</Text>
              </Pressable>
              {imageUrl ? (
                <Pressable
                  onPress={() => setImageUrl("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear commercial feed campaign image"
                  style={styles.secondaryButton}
                  disabled={creating}
                >
                  <Text style={styles.secondaryButtonText}>Clear image</Text>
                </Pressable>
              ) : null}
            </View>
            {imageUrl ? (
              <Image
                source={{ uri: resolveImageUri(imageUrl) }}
                style={styles.postImagePreview}
                resizeMode="cover"
                accessibilityLabel="Commercial feed campaign image preview"
              />
            ) : null}
            {readinessWarnings.length ? (
              <View style={styles.warningBox}>
                {readinessWarnings.map((warning) => (
                  <Text key={warning} style={styles.warningText}>
                    {warning}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.readyText}>Campaign has destination and creative.</Text>
            )}
            <View style={styles.twoColumn}>
              <TextInput
                value={externalLinkLabel}
                onChangeText={setExternalLinkLabel}
                style={[styles.input, styles.columnInput]}
                placeholder="External link label"
                accessibilityLabel="External link label"
              />
              <TextInput
                value={externalLinkUrl}
                onChangeText={setExternalLinkUrl}
                style={[styles.input, styles.columnInput]}
                placeholder="https://..."
                autoCapitalize="none"
                accessibilityLabel="External link URL"
              />
            </View>
          </View>
        ) : null}
        <Pressable
          onPress={createCampaign}
          disabled={!canCreate}
          accessibilityLabel={
            isFacility ? "Publish facility outreach" : "Publish feed campaign"
          }
          style={[styles.primaryButton, !canCreate && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>
            {creating
              ? "Publishing..."
              : isFacility
                ? "Publish Outreach"
                : "Publish Campaign"}
          </Text>
        </Pressable>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </View>

      {error ? <InlineError error={error} /> : null}

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Filter</Text>
        <View style={styles.chipRow}>
          {["all", ...COMMERCIAL_TYPES].map((option) => (
            <Pressable
              key={option}
              onPress={() => setFilterType(option)}
              accessibilityLabel={`Filter feed by ${option}`}
              style={[styles.chip, filterType === option && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  filterType === option && styles.chipTextSelected
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={q}
          onChangeText={setQ}
          style={styles.input}
          placeholder="Search feed"
          autoCapitalize="none"
          accessibilityLabel="Search feed"
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading feed...</Text>
        </View>
      ) : null}

      {!loading && items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No campaigns yet</Text>
          <Text style={styles.muted}>
            Publish the first {isFacility ? "facility outreach" : "feed campaign"}.
          </Text>
        </View>
      ) : null}

      {items.map((post) => (
        <View key={post.id} style={styles.post}>
          <View style={styles.postHeader}>
            <Text style={styles.typePill}>{post.type}</Text>
            <Text style={styles.likes}>{Number(post.likeCount || 0)} likes</Text>
          </View>
          <Text style={styles.postTitle}>{post.title || "Feed campaign"}</Text>
          {campaignImage(post) ? (
            <Image
              source={{ uri: campaignImage(post) }}
              style={styles.feedImage}
              resizeMode="cover"
              accessibilityLabel={`${post.title || "Feed campaign"} image`}
            />
          ) : null}
          <Text style={styles.postBody}>{post.body}</Text>
          {post.tags.length ? (
            <Text style={styles.tags}>{post.tags.map((tag) => `#${tag}`).join(" ")}</Text>
          ) : null}
          {post.linkedProductId ||
          post.linkedCourseId ||
          post.linkedLiveId ||
          post.linkedGrowId ||
          post.linkedForumThreadId ||
          post.storefrontSlug ||
          post.externalLinks?.length ? (
            <View style={styles.linkMetaRow}>
              {post.linkedProductId ? (
                <Text style={styles.linkMeta}>Product: {post.linkedProductId}</Text>
              ) : null}
              {post.linkedCourseId ? (
                <Text style={styles.linkMeta}>Course: {post.linkedCourseId}</Text>
              ) : null}
              {post.linkedLiveId ? (
                <Text style={styles.linkMeta}>Live: {post.linkedLiveId}</Text>
              ) : null}
              {post.linkedGrowId ? (
                <Text style={styles.linkMeta}>Grow/trial: {post.linkedGrowId}</Text>
              ) : null}
              {post.linkedForumThreadId ? (
                <Text style={styles.linkMeta}>Forum/Q&A: {post.linkedForumThreadId}</Text>
              ) : null}
              {post.storefrontSlug ? (
                <Text style={styles.linkMeta}>Store: {post.storefrontSlug}</Text>
              ) : null}
              {post.externalLinks?.map((link) => (
                <Text key={`${link.label}-${link.url}`} style={styles.linkMeta}>
                  {link.label}: {link.url}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={styles.meta}>{campaignMeta(post)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    gap: 12,
    padding: 16,
    paddingBottom: 32
  },
  header: { gap: 5 },
  title: { color: "#0F172A", fontSize: 25, fontWeight: "900" },
  subtitle: { color: "#475569", fontWeight: "700", lineHeight: 21, maxWidth: 860 },
  card: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  cardTitle: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  input: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  bodyInput: { minHeight: 110, textAlignVertical: "top" },
  linkBox: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  linkBoxTitle: { color: "#0F172A", fontWeight: "900" },
  linkBoxText: { color: "#64748B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  imageTools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryButtonText: { color: "#0F172A", fontWeight: "800" },
  postImagePreview: {
    width: "100%",
    maxWidth: 520,
    aspectRatio: 16 / 7,
    borderRadius: 8,
    backgroundColor: "#E2E8F0"
  },
  warningBox: { gap: 4 },
  warningText: { color: "#92400E", fontSize: 12, fontWeight: "800" },
  readyText: { color: "#166534", fontSize: 12, fontWeight: "900" },
  twoColumn: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  columnInput: { flex: 1, minWidth: 180 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  chipSelected: { backgroundColor: "#0F766E", borderColor: "#0F766E" },
  chipText: { color: "#0F172A", fontWeight: "800", textTransform: "capitalize" },
  chipTextSelected: { color: "white" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingVertical: 12
  },
  primaryButtonText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  feedback: { color: "#166534", fontWeight: "800" },
  filters: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 12
  },
  filterLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  loading: { alignItems: "center", gap: 8, paddingVertical: 20 },
  muted: { color: "#64748B", fontWeight: "700", lineHeight: 20 },
  post: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 14
  },
  postHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  typePill: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  likes: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  postTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  feedImage: {
    width: "100%",
    maxWidth: 640,
    aspectRatio: 16 / 7,
    borderRadius: 8,
    backgroundColor: "#E2E8F0"
  },
  postBody: { color: "#334155", fontWeight: "600", lineHeight: 21 },
  tags: { color: "#2563EB", fontSize: 12, fontWeight: "800" },
  linkMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  linkMeta: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    color: "#3730A3",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "700" }
});
