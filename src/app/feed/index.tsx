import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

const COMMERCIAL_TYPES: CommercialFeedPostType[] = [
  "update",
  "listing",
  "iso",
  "drop",
  "question",
  "education"
];
const FACILITY_TYPES: CommercialFeedPostType[] = ["education"];

function authorLabel(post: CommercialFeedPost) {
  return post.author?.displayName || post.author?.email || "GrowPath member";
}

function postMeta(post: CommercialFeedPost) {
  const created = post.createdAt ? new Date(post.createdAt).toLocaleString() : "";
  return [authorLabel(post), created, post.location].filter(Boolean).join(" - ");
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

  const [items, setItems] = useState<CommercialFeedPost[]>([]);
  const [type, setType] = useState<CommercialFeedPostType>(allowedTypes[0]);
  const [filterType, setFilterType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<any>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!allowedTypes.includes(type)) setType(allowedTypes[0]);
  }, [allowedTypes, type]);

  const canAccess = ent.ready && (isCommercial || isFacility);
  const canCreate = body.trim().length > 0 && !creating;

  const helper = useMemo(
    () =>
      isFacility
        ? "Facility posts are education-only. Share training, SOP, IPM, safety, cultivation, and compliance lessons. Sales listings are blocked."
        : "Share updates, listings, ISO requests, drops, questions, or educational content with the commercial network.",
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

  async function createPost() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    setFeedback("");
    try {
      await createCommercialFeedPost({
        type,
        title: title.trim(),
        body: body.trim(),
        tags: splitTags(tags),
        location: location.trim()
      });
      setTitle("");
      setBody("");
      setTags("");
      setLocation("");
      setFeedback(isFacility ? "Educational post published." : "Feed post published.");
      await load({ refresh: true });
    } catch (e) {
      setError(e);
    } finally {
      setCreating(false);
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
          {isFacility ? "Facility Education Feed" : "Commercial Feed"}
        </Text>
        <Text style={styles.subtitle}>{helper}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create Post</Text>
        <View style={styles.chipRow}>
          {allowedTypes.map((option) => (
            <Pressable
              key={option}
              onPress={() => setType(option)}
              style={[styles.chip, type === option && styles.chipSelected]}
            >
              <Text style={[styles.chipText, type === option && styles.chipTextSelected]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder={isFacility ? "Educational topic" : "Title"}
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
        />
        <TextInput
          value={tags}
          onChangeText={setTags}
          style={styles.input}
          placeholder="Tags, comma separated"
        />
        <TextInput
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          placeholder="Location (optional)"
        />
        <Pressable
          onPress={createPost}
          disabled={!canCreate}
          style={[styles.primaryButton, !canCreate && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>
            {creating
              ? "Publishing..."
              : isFacility
                ? "Publish Education"
                : "Publish Post"}
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
          <Text style={styles.cardTitle}>No posts yet</Text>
          <Text style={styles.muted}>
            Publish the first {isFacility ? "educational" : "commercial"} post.
          </Text>
        </View>
      ) : null}

      {items.map((post) => (
        <View key={post.id} style={styles.post}>
          <View style={styles.postHeader}>
            <Text style={styles.typePill}>{post.type}</Text>
            <Text style={styles.likes}>{Number(post.likeCount || 0)} likes</Text>
          </View>
          <Text style={styles.postTitle}>{post.title || "Feed update"}</Text>
          <Text style={styles.postBody}>{post.body}</Text>
          {post.tags.length ? (
            <Text style={styles.tags}>{post.tags.map((tag) => `#${tag}`).join(" ")}</Text>
          ) : null}
          <Text style={styles.meta}>{postMeta(post)}</Text>
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
  postBody: { color: "#334155", fontWeight: "600", lineHeight: 21 },
  tags: { color: "#2563EB", fontSize: 12, fontWeight: "800" },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "700" }
});
