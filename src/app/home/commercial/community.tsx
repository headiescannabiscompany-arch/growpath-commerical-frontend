import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  createCommercialFeedPost,
  listCommercialFeedPosts,
  type CommercialFeedPost
} from "@/api/commercialFeed";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

type SupportForm = {
  title: string;
  body: string;
  linkedProductId: string;
  linkedCourseId: string;
  linkedGrowId: string;
  storefrontSlug: string;
  externalLinkUrl: string;
  externalLinkLabel: string;
  tags: string;
};

const EMPTY_FORM: SupportForm = {
  title: "",
  body: "",
  linkedProductId: "",
  linkedCourseId: "",
  linkedGrowId: "",
  storefrontSlug: "",
  externalLinkUrl: "",
  externalLinkLabel: "",
  tags: "support"
};

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialCommunityRoute() {
  const [posts, setPosts] = useState<CommercialFeedPost[]>([]);
  const [form, setForm] = useState<SupportForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  async function loadSupportPosts() {
    setLoading(true);
    setError(null);
    try {
      const res = await listCommercialFeedPosts({
        type: "question",
        q: "support",
        limit: 12
      });
      setPosts(res.items);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupportPosts();
  }, []);

  async function submitSupportPost() {
    if (!form.body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCommercialFeedPost({
        type: "question",
        title: form.title.trim() || "Brand support answer",
        body: form.body.trim(),
        tags: splitTags(form.tags),
        linkedProductId: form.linkedProductId.trim() || undefined,
        linkedCourseId: form.linkedCourseId.trim() || undefined,
        linkedGrowId: form.linkedGrowId.trim() || undefined,
        storefrontSlug: form.storefrontSlug.trim() || undefined,
        externalLinks: form.externalLinkUrl.trim()
          ? [
              {
                label: form.externalLinkLabel.trim() || "Support link",
                url: form.externalLinkUrl.trim()
              }
            ]
          : undefined
      });
      setForm(EMPTY_FORM);
      await loadSupportPosts();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-community"
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.title}>Brand Community</Text>
            <Text style={styles.subtitle}>
              Commercial community should be forum and support activity for a brand, not
              only guild selection.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionLink href="/communities" label="Open Communities" />
            <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
            <ActionLink href="/home/commercial/profile" label="Brand Profile" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Brand forum identity</Text>
        <Text style={styles.body}>
          Commercial accounts should post and reply as the brand, answer product
          questions, link products/courses/grow trials, and track mentions through forum,
          Q&A, and campaign workflows.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{posts.length}</Text>
            <Text style={styles.metricLabel}>Recent support posts</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {posts.filter((post) => post.linkedProductId).length}
            </Text>
            <Text style={styles.metricLabel}>Linked products</Text>
          </View>
        </View>
        {loading ? (
          <Text style={styles.muted}>Loading brand support posts...</Text>
        ) : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Create brand support post</Text>
        <Text style={styles.body}>
          Use this for product help, support answers, grow trial clarifications, and
          course follow-up. It publishes as linked commercial content.
        </Text>
        <TextInput
          value={form.title}
          onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
          accessibilityLabel="Brand support post title"
          placeholder="Support title or question"
          style={styles.input}
        />
        <TextInput
          value={form.body}
          onChangeText={(body) => setForm((prev) => ({ ...prev, body }))}
          accessibilityLabel="Brand support post body"
          multiline
          placeholder="Answer as the business identity"
          style={[styles.input, styles.textArea]}
        />
        <View style={styles.formGrid}>
          <TextInput
            value={form.linkedProductId}
            onChangeText={(linkedProductId) =>
              setForm((prev) => ({ ...prev, linkedProductId }))
            }
            accessibilityLabel="Brand support linked product"
            placeholder="Linked product ID"
            style={styles.input}
          />
          <TextInput
            value={form.linkedCourseId}
            onChangeText={(linkedCourseId) =>
              setForm((prev) => ({ ...prev, linkedCourseId }))
            }
            accessibilityLabel="Brand support linked course"
            placeholder="Linked course ID"
            style={styles.input}
          />
          <TextInput
            value={form.linkedGrowId}
            onChangeText={(linkedGrowId) =>
              setForm((prev) => ({ ...prev, linkedGrowId }))
            }
            accessibilityLabel="Brand support linked evidence run"
            placeholder="Linked evidence run ID"
            style={styles.input}
          />
          <TextInput
            value={form.storefrontSlug}
            onChangeText={(storefrontSlug) =>
              setForm((prev) => ({ ...prev, storefrontSlug }))
            }
            accessibilityLabel="Brand support storefront slug"
            placeholder="Storefront slug"
            style={styles.input}
          />
          <TextInput
            value={form.externalLinkLabel}
            onChangeText={(externalLinkLabel) =>
              setForm((prev) => ({ ...prev, externalLinkLabel }))
            }
            accessibilityLabel="Brand support external link label"
            placeholder="External link label"
            style={styles.input}
          />
          <TextInput
            value={form.externalLinkUrl}
            onChangeText={(externalLinkUrl) =>
              setForm((prev) => ({ ...prev, externalLinkUrl }))
            }
            accessibilityLabel="Brand support external link URL"
            placeholder="https://..."
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            value={form.tags}
            onChangeText={(tags) => setForm((prev) => ({ ...prev, tags }))}
            accessibilityLabel="Brand support tags"
            placeholder="Tags, comma separated"
            style={styles.input}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create brand support post"
          disabled={saving || !form.body.trim()}
          onPress={submitSupportPost}
          style={[
            styles.primaryAction,
            saving || !form.body.trim() ? styles.disabled : null
          ]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Publishing..." : "Create Support Post"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Recent brand support activity</Text>
        {posts.length ? (
          <View style={styles.list}>
            {posts.map((post) => (
              <View key={post.id} style={styles.postRow}>
                <Text style={styles.postTitle}>{post.title || "Brand support post"}</Text>
                <Text style={styles.postBody}>{post.body}</Text>
                {post.linkedProductId ||
                post.linkedCourseId ||
                post.linkedGrowId ||
                post.storefrontSlug ? (
                  <Text style={styles.postMeta}>
                    Links:{" "}
                    {[
                      post.linkedProductId && `product ${post.linkedProductId}`,
                      post.linkedCourseId && `course ${post.linkedCourseId}`,
                      post.linkedGrowId && `grow ${post.linkedGrowId}`,
                      post.storefrontSlug && `store ${post.storefrontSlug}`
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No brand support posts yet.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Support thread workflow</Text>
        <Text style={styles.body}>
          A commercial support answer should be able to point users to the exact product,
          course, public product page, trial result, or storefront involved in the
          question.
        </Text>
        <Text style={styles.bullet}>Start from a product question or brand mention</Text>
        <Text style={styles.bullet}>Answer as the business identity</Text>
        <Text style={styles.bullet}>
          Attach product, course, grow trial, storefront, or external support URL
        </Text>
        <Text style={styles.bullet}>
          Optionally turn strong answers into feed campaigns or course lessons
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/feed" label="Create linked campaign" />
          <ActionLink href="/courses/add-lesson" label="Create course lesson" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Community discovery</Text>
        <Text style={styles.body}>
          Users should find the brand through public profile links, feed campaigns, store
          products, courses, and forum answers. Guild/community selection should support
          discovery, not replace support workflows.
        </Text>
        <Text style={styles.bullet}>Public profile is the stable brand destination</Text>
        <Text style={styles.bullet}>Storefront is the stable product destination</Text>
        <Text style={styles.bullet}>Forum/support threads should link back to both</Text>
        <Text style={styles.bullet}>
          Similar brands and return-to-campaign actions keep users moving
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/store" label="Public Store Directory" />
          <ActionLink href="/home/commercial/storefront" label="Storefront" />
        </View>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between"
  },
  headerText: {
    flex: 1,
    minWidth: 260
  },
  headerActions: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: 440
  },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4
  },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900"
  },
  body: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  metric: {
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 150,
    padding: 9
  },
  metricValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    flexGrow: 1,
    fontSize: 14,
    minWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 8
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.5
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900"
  },
  list: {
    gap: 10,
    marginTop: 12
  },
  postRow: {
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  postTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900"
  },
  postBody: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  postMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6
  },
  bullet: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  muted: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 10
  }
});
