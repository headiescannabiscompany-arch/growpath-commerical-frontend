import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { fetchPublicStorefront } from "@/api/storefront";
import { recordCommercialAnalyticsEvent } from "@/api/commercialAnalytics";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import {
  extractPublicCommercialPayload,
  publicGrowInterests,
  publicItemId,
  publicItemSummary,
  publicItemTitle,
  publicLinks
} from "@/utils/publicCommerce";
import { sharePublicLink } from "@/utils/publicLinks";

async function openUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

function trackCommercialClick(payload: Record<string, any>) {
  void recordCommercialAnalyticsEvent(payload).catch(() => {
    // Click tracking should not block public brand navigation.
  });
}

export default function PublicBrandProfileRoute() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = useMemo(() => String(params.slug || "").trim(), [params.slug]);
  const returnFeedHref = "/feed";
  const [loading, setLoading] = useState(true);
  const [storefront, setStorefront] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [trials, setTrials] = useState<any[]>([]);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const res: any = await fetchPublicStorefront(slug);
      const payload = extractPublicCommercialPayload(res);
      setStorefront(payload.storefront);
      setProducts(payload.products);
      setProductLines(payload.productLines);
      setCourses(payload.courses);
      setFeedPosts(payload.feedPosts);
      setTrials(payload.trials);
      setForumThreads(payload.forumThreads);
    } catch (err: any) {
      setError(err?.message || "Unable to load brand profile.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!slug || !storefront) return;
    trackCommercialClick({
      eventType: "brand_profile_view",
      objectType: "storefront",
      objectId: storefront?.id || storefront?._id || slug,
      storefrontSlug: slug,
      source: "public_brand_profile",
      metadata: { growInterests: publicGrowInterests(storefront) }
    });
  }, [slug, storefront]);

  const name = storefront?.businessName || storefront?.name || "Brand profile";
  const description =
    storefront?.bio || storefront?.description || "Public profile and storefront.";
  const links = publicLinks(storefront);

  async function shareProfile() {
    try {
      const result = await sharePublicLink(name, `/brands/${slug}`);
      setFeedback(
        result.method === "web-clipboard"
          ? "Brand profile link copied."
          : "Brand profile link ready to share."
      );
    } catch (err: any) {
      setFeedback(err?.message || "Unable to share brand profile.");
    }
  }

  return (
    <AppPage
      routeKey="brand-public-profile"
      header={
        <View>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle}>{description}</Text>
        </View>
      }
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading profile...</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <AppCard>
            <Text style={styles.cardTitle}>Public Store</Text>
            <Text style={styles.cardText}>
              Browse products, courses, grow-trial updates, and public links from this
              commercial account.
            </Text>
            <Link href={`/store/${encodeURIComponent(slug)}` as any} asChild>
              <Pressable style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Go to Store</Text>
              </Pressable>
            </Link>
            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryButton} onPress={shareProfile}>
                <Text style={styles.secondaryButtonText}>Share Profile</Text>
              </Pressable>
              <Link href={`/store?similarTo=${encodeURIComponent(slug)}` as any} asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>View Similar Brands</Text>
                </Pressable>
              </Link>
              <Link href={returnFeedHref as any} asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Return to Campaigns</Text>
                </Pressable>
              </Link>
            </View>
          </AppCard>
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

          {links.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Public Links</Text>
              <View style={styles.actionRow}>
                {links.map((link) => (
                  <Pressable
                    key={`${link.label}-${link.url}`}
                    style={styles.secondaryButton}
                    onPress={() => {
                      trackCommercialClick({
                        eventType: "brand_public_link_click",
                        objectType: "storefront",
                        storefrontSlug: slug,
                        targetUrl: link.url,
                        source: "public_brand_profile",
                        metadata: { label: link.label }
                      });
                      void openUrl(link.url);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>{link.label}</Text>
                  </Pressable>
                ))}
              </View>
            </AppCard>
          ) : null}

          {productLines.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Product Lines</Text>
              <Text style={styles.cardText}>
                Product families organize the storefront by use case, category, and grow
                interest.
              </Text>
              {productLines.slice(0, 4).map((line) => {
                const id = publicItemId(line);
                return (
                  <View
                    key={id || publicItemTitle(line, "Product line")}
                    style={styles.listRow}
                  >
                    <View style={styles.productCopy}>
                      <Text style={styles.productName}>
                        {publicItemTitle(line, "Product line")}
                      </Text>
                      {publicItemSummary(line) ? (
                        <Text style={styles.meta}>{publicItemSummary(line)}</Text>
                      ) : null}
                      {publicGrowInterests(line).length ? (
                        <Text style={styles.interests}>
                          Interests: {publicGrowInterests(line).join(", ")}
                        </Text>
                      ) : null}
                    </View>
                    <Link
                      href={
                        `/store/${encodeURIComponent(slug)}${
                          id ? `?line=${encodeURIComponent(id)}` : ""
                        }` as any
                      }
                      asChild
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Browse Line</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </AppCard>
          ) : null}

          <AppCard>
            <Text style={styles.cardTitle}>Featured Products</Text>
            {products.length ? (
              products.slice(0, 4).map((product) => {
                const id = String(
                  product?.id || product?._id || product?.productId || ""
                );
                return (
                  <View key={id || product?.name} style={styles.productRow}>
                    <View style={styles.productCopy}>
                      <Text style={styles.productName}>{product?.name || "Product"}</Text>
                      {product?.description ? (
                        <Text style={styles.meta}>{product.description}</Text>
                      ) : null}
                      {publicGrowInterests(product).length ? (
                        <Text style={styles.interests}>
                          Interests: {publicGrowInterests(product).join(", ")}
                        </Text>
                      ) : null}
                    </View>
                    <Link
                      href={
                        `/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(
                          id || product?.slug || product?.name || "product"
                        )}` as any
                      }
                      asChild
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Details</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })
            ) : (
              <Text style={styles.meta}>No published products yet.</Text>
            )}
          </AppCard>

          {courses.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Courses</Text>
              {courses.slice(0, 4).map((course) => {
                const id = publicItemId(course);
                return (
                  <View
                    key={id || publicItemTitle(course, "Course")}
                    style={styles.listRow}
                  >
                    <View style={styles.productCopy}>
                      <Text style={styles.productName}>
                        {publicItemTitle(course, "Course")}
                      </Text>
                      {publicItemSummary(course) ? (
                        <Text style={styles.meta}>{publicItemSummary(course)}</Text>
                      ) : null}
                      {publicGrowInterests(course).length ? (
                        <Text style={styles.interests}>
                          Interests: {publicGrowInterests(course).join(", ")}
                        </Text>
                      ) : null}
                    </View>
                    <Link
                      href={
                        `/courses${id ? `?courseId=${encodeURIComponent(id)}` : ""}` as any
                      }
                      asChild
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Open</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </AppCard>
          ) : null}

          {feedPosts.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Promoted Campaigns</Text>
              <Text style={styles.meta}>
                Feed placements are commercial outreach and advertising. Discussion and
                support stay in Forum/Q&A.
              </Text>
              {feedPosts.slice(0, 3).map((post) => (
                <View
                  key={publicItemId(post) || publicItemTitle(post, "Campaign")}
                  style={styles.listRow}
                >
                  <View style={styles.productCopy}>
                    <Text style={styles.productName}>
                      {publicItemTitle(post, "Campaign")}
                    </Text>
                    {publicItemSummary(post) ? (
                      <Text style={styles.meta}>{publicItemSummary(post)}</Text>
                    ) : null}
                    {publicGrowInterests(post).length ? (
                      <Text style={styles.interests}>
                        Interests: {publicGrowInterests(post).join(", ")}
                      </Text>
                    ) : null}
                  </View>
                  <Link href={returnFeedHref as any} asChild>
                    <Pressable style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Open Campaign</Text>
                    </Pressable>
                  </Link>
                </View>
              ))}
            </AppCard>
          ) : null}

          {trials.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Product Trials</Text>
              {trials.slice(0, 3).map((trial) => (
                <View
                  key={publicItemId(trial) || publicItemTitle(trial, "Trial")}
                  style={styles.listRow}
                >
                  <View style={styles.productCopy}>
                    <Text style={styles.productName}>
                      {publicItemTitle(trial, "Trial")}
                    </Text>
                    {publicItemSummary(trial) ? (
                      <Text style={styles.meta}>{publicItemSummary(trial)}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.statusPill}>{trial?.status || "trial"}</Text>
                </View>
              ))}
            </AppCard>
          ) : null}

          {forumThreads.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Support Discussions</Text>
              {forumThreads.slice(0, 3).map((thread) => {
                const threadId = publicItemId(thread);
                const threadHref = threadId
                  ? `/forum/post/${encodeURIComponent(threadId)}`
                  : "/forum";
                return (
                  <View
                    key={threadId || publicItemTitle(thread, "Discussion")}
                    style={styles.listRow}
                  >
                    <View style={styles.productCopy}>
                      <Text style={styles.productName}>
                        {publicItemTitle(thread, "Discussion")}
                      </Text>
                      {publicItemSummary(thread) ? (
                        <Text style={styles.meta}>{publicItemSummary(thread)}</Text>
                      ) : null}
                    </View>
                    <Link href={threadHref as any} asChild>
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Forum</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </AppCard>
          ) : null}
        </>
      )}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: { color: "#111827", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#64748B", lineHeight: 20, marginTop: 4 },
  center: { alignItems: "center", gap: 8, justifyContent: "center", minHeight: 180 },
  error: { color: "#B91C1C", fontWeight: "800" },
  feedback: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    color: "#334155",
    marginBottom: 10,
    padding: 8
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  meta: { color: "#64748B", lineHeight: 19 },
  interests: { color: "#047857", fontSize: 12, fontWeight: "800" },
  cardTitle: { color: "#111827", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  cardText: { color: "#475569", lineHeight: 20, marginBottom: 14 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
  productRow: {
    alignItems: "center",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-between",
    paddingVertical: 10
  },
  listRow: {
    alignItems: "center",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingVertical: 10
  },
  productCopy: { flex: 1, gap: 4 },
  productName: { color: "#111827", fontWeight: "800" },
  statusPill: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "capitalize"
  }
});
