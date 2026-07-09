import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { checkoutProduct } from "@/api/products";
import { fetchPublicStorefront } from "@/api/storefront";
import { recordCommercialAnalyticsEvent } from "@/api/commercialAnalytics";
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
import { radius } from "@/theme/theme";

function money(product: any) {
  const cents = Number(product?.priceCents || 0);
  if (cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const price = Number(product?.price || 0);
  return price > 0 ? `$${price.toFixed(2)}` : "Free";
}

function productId(product: any) {
  return String(product?.id || product?._id || product?.productId || "");
}

function productCanCheckout(product: any) {
  return Boolean(
    product?.stripePriceId || product?.checkoutEnabled || product?.checkoutUrl
  );
}

function productExternalUrl(product: any) {
  return (
    product?.externalPurchaseUrl || product?.purchaseUrl || product?.url || product?.link
  );
}

async function openCheckoutUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

function trackCommercialClick(payload: Record<string, any>) {
  void recordCommercialAnalyticsEvent(payload).catch(() => {
    // Click tracking should never block public storefront navigation.
  });
}

function campaignHref(campaign: any) {
  const id = publicItemId(campaign);
  return id ? `/feed?campaignId=${encodeURIComponent(id)}` : "/feed";
}

export default function PublicStorefrontRoute() {
  const params = useLocalSearchParams<{ slug?: string; line?: string }>();
  const slug = useMemo(() => String(params.slug || "").trim(), [params.slug]);
  const selectedLineId = useMemo(() => String(params.line || "").trim(), [params.line]);
  const returnFeedHref = "/feed";
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [storefront, setStorefront] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lives, setLives] = useState<any[]>([]);
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
      setLives((payload as any).lives || []);
      setFeedPosts(payload.feedPosts);
      setTrials(payload.trials);
      setForumThreads(payload.forumThreads);
    } catch (err: any) {
      setError(err?.message || "Unable to load storefront.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!slug || !storefront) return;
    trackCommercialClick({
      eventType: "storefront_view",
      objectType: "storefront",
      objectId: storefront?.id || storefront?._id || slug,
      storefrontSlug: slug,
      source: "public_storefront",
      metadata: { growInterests: publicGrowInterests(storefront) }
    });
  }, [slug, storefront]);

  async function buy(product: any) {
    const id = productId(product);
    if (!id) return;
    setBusyId(id);
    setFeedback("");
    trackCommercialClick({
      eventType: "product_checkout_click",
      objectType: "product",
      objectId: id,
      productId: id,
      storefrontSlug: slug,
      source: "public_storefront",
      metadata: { growInterests: publicGrowInterests(product) }
    });
    try {
      const checkout: any = await checkoutProduct(id, {
        returnPath: `/store/${encodeURIComponent(slug)}`
      });
      const url = checkout?.url || checkout?.checkoutUrl || checkout?.data?.url;
      if (!url) {
        setFeedback("Checkout unavailable. The backend did not return a checkout URL.");
        Alert.alert("Checkout unavailable", "The backend did not return a checkout URL.");
        return;
      }
      await openCheckoutUrl(url);
      setFeedback("Checkout started.");
    } catch (err: any) {
      setFeedback(err?.message || "Unable to start checkout.");
      Alert.alert("Checkout failed", err?.message || "Unable to start checkout.");
    } finally {
      setBusyId("");
    }
  }

  async function openExternalProduct(product: any) {
    const id = productId(product);
    const url = productExternalUrl(product);
    if (!url) return;
    trackCommercialClick({
      eventType: "product_external_link_click",
      objectType: "product",
      objectId: id,
      productId: id,
      storefrontSlug: slug,
      targetUrl: String(url),
      source: "public_storefront",
      metadata: { growInterests: publicGrowInterests(product) }
    });
    await openCheckoutUrl(String(url));
  }

  async function shareStorefront() {
    try {
      const result = await sharePublicLink(
        storefront?.name || "GrowPathAI storefront",
        `/store/${slug}`
      );
      setFeedback(
        result.method === "web-clipboard"
          ? "Store link copied."
          : "Store link ready to share."
      );
    } catch (err: any) {
      setFeedback(err?.message || "Unable to share store link.");
    }
  }

  const links = publicLinks(storefront);
  const visibleProducts = useMemo(() => {
    if (!selectedLineId) return products;
    return products.filter((product) => {
      const lineIds = [
        product?.productLineId,
        product?.linkedProductLineId,
        ...(Array.isArray(product?.linkedProductLineIds)
          ? product.linkedProductLineIds
          : [])
      ]
        .filter(Boolean)
        .map((value) => String(value));
      return lineIds.includes(selectedLineId);
    });
  }, [products, selectedLineId]);

  return (
    <AppPage
      routeKey="store-public"
      header={
        <View>
          <Text style={styles.title}>{storefront?.name || "Storefront"}</Text>
          <Text style={styles.subtitle}>
            {storefront?.description || "Published products"}
          </Text>
        </View>
      }
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading storefront...</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <View style={styles.profilePanel}>
            <Text style={styles.profileTitle}>Storefront profile</Text>
            <Text style={styles.meta}>
              This storefront is the public brand home base for products, courses,
              lives, campaigns, and Q&A. The legacy profile view remains available for
              extra public links.
            </Text>
            <Link href={`/brands/${encodeURIComponent(slug)}` as any} asChild>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Open Legacy Profile</Text>
              </Pressable>
            </Link>
            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryButton} onPress={shareStorefront}>
                <Text style={styles.secondaryButtonText}>Share Store</Text>
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
          </View>
          {links.length ? (
            <View style={styles.profilePanel}>
              <Text style={styles.profileTitle}>Public Links</Text>
              <View style={styles.actionRow}>
                {links.map((link) => (
                  <Pressable
                    key={`${link.label}-${link.url}`}
                    style={styles.secondaryButton}
                    onPress={() => {
                      trackCommercialClick({
                        eventType: "storefront_public_link_click",
                        objectType: "storefront",
                        storefrontSlug: slug,
                        targetUrl: link.url,
                        source: "public_storefront",
                        metadata: { label: link.label }
                      });
                      void openCheckoutUrl(link.url);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>{link.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          {selectedLineId ? (
            <View style={styles.profilePanel}>
              <Text style={styles.profileTitle}>Filtered Product Line</Text>
              <Text style={styles.meta}>
                Showing products linked to {selectedLineId}.
              </Text>
              <Link href={`/store/${encodeURIComponent(slug)}` as any} asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>View All Products</Text>
                </Pressable>
              </Link>
            </View>
          ) : null}
          {productLines.length ? (
            <View style={styles.profilePanel}>
              <Text style={styles.profileTitle}>Product Lines</Text>
              <Text style={styles.meta}>
                Browse product families by use case, release timing, and grow interest.
              </Text>
              {productLines.slice(0, 4).map((line) => {
                const id = publicItemId(line);
                return (
                  <View
                    key={id || publicItemTitle(line, "Product line")}
                    style={styles.linkRow}
                  >
                    <View style={styles.productBody}>
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
            </View>
          ) : null}
          {visibleProducts.length ? (
            visibleProducts.map((product) => {
              const id = productId(product);
              const canCheckout = productCanCheckout(product);
              const externalUrl = productExternalUrl(product);
              return (
                <View key={id || product?.name} style={styles.product}>
                  <View style={styles.productBody}>
                    <Text style={styles.productName}>{product?.name || "Product"}</Text>
                    {product?.description ? (
                      <Text style={styles.meta}>{product.description}</Text>
                    ) : null}
                    {publicGrowInterests(product).length ? (
                      <Text style={styles.interests}>
                        Interests: {publicGrowInterests(product).join(", ")}
                      </Text>
                    ) : null}
                    <Text style={styles.price}>{money(product)}</Text>
                  </View>
                  <View style={styles.productActions}>
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
                    {canCheckout ? (
                      <Pressable
                        accessibilityLabel={`Buy ${product?.name || "product"}`}
                        style={[styles.button, busyId === id && styles.disabled]}
                        disabled={busyId === id}
                        onPress={() => buy(product)}
                      >
                        <Text style={styles.buttonText}>
                          {busyId === id ? "Opening..." : "Buy"}
                        </Text>
                      </Pressable>
                    ) : externalUrl ? (
                      <Pressable
                        accessibilityLabel={`Open external product ${product?.name || "product"}`}
                        style={styles.secondaryButton}
                        onPress={() => {
                          void openExternalProduct(product);
                        }}
                      >
                        <Text style={styles.secondaryButtonText}>External Link</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.meta}>
              {selectedLineId
                ? "No published products for this product line."
                : "No published products."}
            </Text>
          )}

          {courses.length ? (
            <View style={styles.profilePanel}>
              <Text style={styles.profileTitle}>Courses</Text>
              {courses.slice(0, 3).map((course) => {
                const id = publicItemId(course);
                return (
                  <View
                    key={id || publicItemTitle(course, "Course")}
                    style={styles.linkRow}
                  >
                    <View style={styles.productBody}>
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
                        `/store/${encodeURIComponent(slug)}/courses/${encodeURIComponent(
                          id || publicItemTitle(course, "course")
                        )}` as any
                      }
                      asChild
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Open Course</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </View>
          ) : null}

          {lives.length ? (
            <View style={styles.profilePanel}>
              <Text style={styles.profileTitle}>Upcoming Lives</Text>
              <Text style={styles.meta}>
                RSVP, watch, or open replays from the public live-session surface.
              </Text>
              {lives.slice(0, 3).map((live) => {
                const id = publicItemId(live);
                return (
                  <View key={id || publicItemTitle(live, "Live")} style={styles.linkRow}>
                    <View style={styles.productBody}>
                      <Text style={styles.productName}>
                        {publicItemTitle(live, "Live")}
                      </Text>
                      {publicItemSummary(live) ? (
                        <Text style={styles.meta}>{publicItemSummary(live)}</Text>
                      ) : null}
                      {live?.scheduledStart ? (
                        <Text style={styles.meta}>
                          Starts: {String(live.scheduledStart)}
                        </Text>
                      ) : null}
                      {publicGrowInterests(live).length ? (
                        <Text style={styles.interests}>
                          Interests: {publicGrowInterests(live).join(", ")}
                        </Text>
                      ) : null}
                    </View>
                    <Link
                      href={`/live-session?sessionId=${encodeURIComponent(id)}` as any}
                      asChild
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Open Live</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </View>
          ) : null}

          {feedPosts.length ? (
            <View style={styles.profilePanel}>
              <Text style={styles.profileTitle}>Promoted Campaigns</Text>
              <Text style={styles.meta}>
                Storefront campaigns are advertising and outreach. Open the linked
                Forum/Q&A when you want discussion or product support.
              </Text>
              {feedPosts.slice(0, 3).map((post) => (
                <View
                  key={publicItemId(post) || publicItemTitle(post, "Campaign")}
                  style={styles.linkRow}
                >
                  <View style={styles.productBody}>
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
                  <Link href={campaignHref(post) as any} asChild>
                    <Pressable style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Open Campaign</Text>
                    </Pressable>
                  </Link>
                </View>
              ))}
            </View>
          ) : null}

          {trials.length ? (
            <View style={styles.profilePanel}>
              <Text style={styles.profileTitle}>Product Trial Proof</Text>
              {trials.slice(0, 3).map((trial) => (
                <View
                  key={publicItemId(trial) || publicItemTitle(trial, "Trial")}
                  style={styles.linkRow}
                >
                  <View style={styles.productBody}>
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
            </View>
          ) : null}

          {forumThreads.length ? (
            <View style={styles.profilePanel}>
              <Text style={styles.profileTitle}>Forum / Q&A</Text>
              <Text style={styles.meta}>
                Discussion, support, and product questions live in Forum/Q&A instead of
                inside feed campaign placements.
              </Text>
              {forumThreads.slice(0, 3).map((thread) => {
                const threadId = publicItemId(thread);
                const threadHref = threadId
                  ? `/forum/post/${encodeURIComponent(threadId)}`
                  : "/forum";
                return (
                  <View
                    key={threadId || publicItemTitle(thread, "Discussion")}
                    style={styles.linkRow}
                  >
                    <View style={styles.productBody}>
                      <Text style={styles.productName}>
                        {publicItemTitle(thread, "Discussion")}
                      </Text>
                      {publicItemSummary(thread) ? (
                        <Text style={styles.meta}>{publicItemSummary(thread)}</Text>
                      ) : null}
                    </View>
                    <Link href={threadHref as any} asChild>
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Open Q&A</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      )}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: { color: "#111827", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#64748B", marginTop: 4 },
  center: { alignItems: "center", gap: 8, justifyContent: "center", minHeight: 180 },
  error: { color: "#B91C1C", fontWeight: "700" },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  feedback: {
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    color: "#334155",
    marginBottom: 10,
    padding: 8
  },
  meta: { color: "#64748B" },
  interests: { color: "#047857", fontSize: 12, fontWeight: "800" },
  product: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 12
  },
  productBody: { flex: 1, gap: 4 },
  productActions: {
    alignItems: "flex-end",
    gap: 8
  },
  linkRow: {
    alignItems: "center",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingVertical: 10
  },
  productName: { color: "#111827", fontSize: 16, fontWeight: "800" },
  price: { color: "#166534", fontWeight: "800" },
  profilePanel: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
    padding: 12
  },
  profileTitle: { color: "#111827", fontSize: 16, fontWeight: "800" },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
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
  },
  button: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" }
});
