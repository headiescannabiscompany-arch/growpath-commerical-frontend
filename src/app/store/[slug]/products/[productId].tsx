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
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { publicGrowInterests } from "@/utils/publicCommerce";
import { sharePublicLink } from "@/utils/publicLinks";
import { radius } from "@/theme/theme";

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function productKey(product: any) {
  return String(product?.id || product?._id || product?.productId || product?.slug || "");
}

function campaignKey(campaign: any) {
  return String(
    campaign?.id ||
      campaign?._id ||
      campaign?.campaignId ||
      campaign?.feedCampaignId ||
      campaign?.feedPostId ||
      ""
  );
}

function campaignHref(campaign: any) {
  const id = campaignKey(campaign);
  return id ? `/feed?campaignId=${encodeURIComponent(id)}` : "/feed";
}

function productCanCheckout(product: any) {
  return Boolean(
    product?.stripePriceId || product?.checkoutEnabled || product?.checkoutUrl
  );
}

function lineKey(line: any) {
  return String(line?.id || line?._id || line?.lineId || line?.slug || "");
}

function money(product: any) {
  const cents = Number(product?.priceCents || 0);
  if (cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const price = Number(product?.price || 0);
  return price > 0 ? `$${price.toFixed(2)}` : "Free";
}

function normalize(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function itemLinksProduct(item: any, id: string) {
  if (!id) return false;
  const linkedIds = [
    item?.linkedProductId,
    item?.relatedProductId,
    item?.productId,
    ...(Array.isArray(item?.linkedProductIds) ? item.linkedProductIds : []),
    ...(Array.isArray(item?.relatedProductIds) ? item.relatedProductIds : [])
  ];
  return linkedIds.some((value) => String(value || "") === id);
}

function formatSpecValue(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const record = value as Record<string, any>;
    if (record.summary) return String(record.summary);
    if (record.explanation) return String(record.explanation);
    return Object.entries(record)
      .filter(([, entry]) => entry !== null && entry !== undefined && entry !== "")
      .map(([key, entry]) => {
        if (Array.isArray(entry)) return `${key}: ${entry.filter(Boolean).join(", ")}`;
        if (entry && typeof entry === "object") return `${key}: ${JSON.stringify(entry)}`;
        return `${key}: ${entry}`;
      })
      .join(", ");
  }
  return String(value || "").trim();
}

function SpecRow({ label, value }: { label: string; value?: unknown }) {
  const display = formatSpecValue(value);
  if (!display) return null;
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{display}</Text>
    </View>
  );
}

function publicProductUrl(slug: string, product: any) {
  const id = productKey(product) || product?.name || "product";
  return `/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(String(id))}`;
}

function forumThreadHref(thread: any) {
  const id = String(thread?.id || thread?._id || thread?.threadId || "");
  return id ? `/forum/post/${encodeURIComponent(id)}` : "/forum";
}

function publicLinks(storefront: any) {
  const links: Array<{ label: string; url: string }> = [];
  if (storefront?.websiteUrl)
    links.push({ label: "Website", url: storefront.websiteUrl });
  if (storefront?.supportEmail) {
    links.push({ label: "Support Email", url: `mailto:${storefront.supportEmail}` });
  }
  const socialLinks = storefront?.socialLinks;
  if (Array.isArray(socialLinks)) {
    socialLinks.forEach((link: any) => {
      if (link?.url)
        links.push({ label: link?.label || link?.platform || "Social", url: link.url });
    });
  } else if (socialLinks && typeof socialLinks === "object") {
    Object.entries(socialLinks).forEach(([label, url]) => {
      if (url) links.push({ label, url: String(url) });
    });
  }
  asArray(storefront?.publicLinks || storefront?.externalLinks).forEach((link: any) => {
    if (link?.url) links.push({ label: link?.label || "Link", url: link.url });
  });
  return links;
}

async function openUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

function trackCommercialClick(payload: Record<string, any>) {
  void recordCommercialAnalyticsEvent(payload).catch(() => {
    // Click tracking should not block public product navigation.
  });
}

export default function PublicProductRoute() {
  const params = useLocalSearchParams<{ slug?: string; productId?: string }>();
  const slug = useMemo(() => String(params.slug || "").trim(), [params.slug]);
  const requestedProductId = useMemo(
    () => String(params.productId || "").trim(),
    [params.productId]
  );
  const returnFeedHref = "/feed";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [storefront, setStorefront] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productLines, setProductLines] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [lives, setLives] = useState<any[]>([]);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const res: any = await fetchPublicStorefront(slug);
      const data = res?.data || {};
      setStorefront(res?.storefront || data?.storefront || null);
      setProducts(asArray(res?.products || data?.products));
      setProductLines(asArray(res?.productLines || data?.productLines));
      setCourses(
        asArray(
          res?.courses || data?.courses || res?.featuredCourses || data?.featuredCourses
        )
      );
      setLives(
        asArray(
          res?.lives ||
            data?.lives ||
            res?.liveEvents ||
            data?.liveEvents ||
            res?.featuredLives ||
            data?.featuredLives
        )
      );
      setFeedPosts(
        asArray(
          res?.feedPosts ||
            data?.feedPosts ||
            res?.posts ||
            data?.posts ||
            res?.updates ||
            data?.updates
        )
      );
      setForumThreads(
        asArray(
          res?.forumThreads ||
            data?.forumThreads ||
            res?.threads ||
            data?.threads ||
            res?.supportThreads ||
            data?.supportThreads
        )
      );
    } catch (err: any) {
      setError(err?.message || "Unable to load product.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const product = useMemo(() => {
    const requested = normalize(decodeURIComponent(requestedProductId));
    return products.find((item) => {
      const candidates = [
        productKey(item),
        item?.slug,
        item?.sku,
        item?.name,
        String(item?.name || "").replace(/\s+/g, "-")
      ];
      return candidates.some((candidate) => normalize(String(candidate)) === requested);
    });
  }, [products, requestedProductId]);

  const relatedProducts = products
    .filter((item) => productKey(item) !== productKey(product))
    .slice(0, 3);
  const productId = productKey(product);
  const productLineIds = [
    product?.productLineId,
    product?.linkedProductLineId,
    ...(Array.isArray(product?.productLineIds) ? product.productLineIds : []),
    ...(Array.isArray(product?.linkedProductLineIds) ? product.linkedProductLineIds : [])
  ]
    .map((id) => String(id || ""))
    .filter(Boolean);
  const productLine = productLines.find((line) => productLineIds.includes(lineKey(line)));
  const relatedCourses = courses
    .filter((course) => itemLinksProduct(course, productId))
    .slice(0, 3);
  const relatedLives = lives
    .filter((live) => itemLinksProduct(live, productId))
    .slice(0, 3);
  const relatedCampaigns = feedPosts
    .filter((post) => itemLinksProduct(post, productId))
    .slice(0, 3);
  const relatedThreads = forumThreads
    .filter((thread) => itemLinksProduct(thread, productId))
    .slice(0, 3);

  useEffect(() => {
    const id = productKey(product);
    if (!slug || !id) return;
    trackCommercialClick({
      eventType: "product_view",
      objectType: "product",
      objectId: id,
      productId: id,
      storefrontSlug: slug,
      source: "public_product",
      metadata: { growInterests: publicGrowInterests(product) }
    });
  }, [product, slug]);

  async function buy() {
    const id = productKey(product);
    if (!id) return;
    setBusy(true);
    setFeedback("");
    trackCommercialClick({
      eventType: "product_checkout_click",
      objectType: "product",
      objectId: id,
      productId: id,
      storefrontSlug: slug,
      source: "public_product",
      metadata: { growInterests: publicGrowInterests(product) }
    });
    try {
      const checkout: any = await checkoutProduct(id, {
        returnPath: publicProductUrl(slug, product)
      });
      const url = checkout?.url || checkout?.checkoutUrl || checkout?.data?.url;
      if (!url) {
        setFeedback("Checkout unavailable. The backend did not return a checkout URL.");
        Alert.alert("Checkout unavailable", "The backend did not return a checkout URL.");
        return;
      }
      await openUrl(url);
      setFeedback("Checkout started.");
    } catch (err: any) {
      setFeedback(err?.message || "Unable to start checkout.");
      Alert.alert("Checkout failed", err?.message || "Unable to start checkout.");
    } finally {
      setBusy(false);
    }
  }

  async function shareProduct() {
    try {
      const result = await sharePublicLink(
        product?.name || "GrowPathAI product",
        `/store/${slug}/products/${requestedProductId}`
      );
      setFeedback(
        result.method === "web-clipboard"
          ? "Product link copied."
          : "Product link ready to share."
      );
    } catch (err: any) {
      setFeedback(err?.message || "Unable to share product.");
    }
  }

  const externalUrl =
    product?.externalPurchaseUrl || product?.purchaseUrl || product?.url || product?.link;
  const canCheckout = productCanCheckout(product);
  const brandName = storefront?.businessName || storefront?.name || "Brand";
  const links = publicLinks(storefront);
  const specs = product?.specs || {};

  return (
    <AppPage
      routeKey="public-product"
      backFallbackHref={`/store/${encodeURIComponent(slug)}`}
      header={
        <View>
          <Text style={styles.title}>{product?.name || "Product"}</Text>
          <Text style={styles.subtitle}>{brandName}</Text>
        </View>
      }
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading product...</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !product ? (
        <AppCard>
          <Text style={styles.cardTitle}>Product not found</Text>
          <Text style={styles.meta}>
            This product may be unpublished or no longer available.
          </Text>
          <Link href={`/store/${encodeURIComponent(slug)}` as any} asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Back to Store</Text>
            </Pressable>
          </Link>
        </AppCard>
      ) : (
        <>
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          <AppCard>
            <Text style={styles.cardTitle}>{product.name || "Product"}</Text>
            {product.description ? (
              <Text style={styles.bodyText}>{product.description}</Text>
            ) : null}
            {product.shortDescription ? (
              <Text style={styles.bodyText}>{product.shortDescription}</Text>
            ) : null}
            {publicGrowInterests(product).length ? (
              <Text style={styles.interests}>
                Interests: {publicGrowInterests(product).join(", ")}
              </Text>
            ) : null}
            <Text style={styles.price}>{money(product)}</Text>

            <View style={styles.actionRow}>
              {canCheckout ? (
                <Pressable
                  accessibilityLabel={`Buy ${product?.name || "product"}`}
                  style={[styles.primaryButton, busy && styles.disabled]}
                  disabled={busy}
                  onPress={buy}
                >
                  <Text style={styles.primaryButtonText}>
                    {busy ? "Opening..." : "Buy"}
                  </Text>
                </Pressable>
              ) : null}
              {externalUrl ? (
                <Pressable
                  accessibilityLabel={`Open external product ${product?.name || "product"}`}
                  style={styles.secondaryButton}
                  onPress={() => {
                    trackCommercialClick({
                      eventType: "product_external_link_click",
                      objectType: "product",
                      objectId: productKey(product),
                      productId: productKey(product),
                      storefrontSlug: slug,
                      targetUrl: String(externalUrl),
                      source: "public_product"
                    });
                    void openUrl(String(externalUrl));
                  }}
                >
                  <Text style={styles.secondaryButtonText}>External Link</Text>
                </Pressable>
              ) : null}
              {!canCheckout && !externalUrl ? (
                <Text style={styles.meta}>
                  Checkout is not available for this product.
                </Text>
              ) : null}
              <Pressable style={styles.secondaryButton} onPress={shareProduct}>
                <Text style={styles.secondaryButtonText}>Share Product</Text>
              </Pressable>
            </View>
          </AppCard>

          <AppCard>
            <Text style={styles.cardTitle}>Product Context</Text>
            <Text style={styles.meta}>
              Use this page for product photos, use instructions, related courses,
              promotional campaigns, product trial evidence runs, formula notes, and
              Forum/Q&A support links as the public product record grows.
            </Text>
            {product?.usageInstructions ? (
              <Text style={styles.bodyText}>{product.usageInstructions}</Text>
            ) : null}
            {product?.warnings ? (
              <Text style={styles.warning}>{product.warnings}</Text>
            ) : null}
            {productLine ? (
              <View style={styles.linePanel}>
                <Text style={styles.specLabel}>Product Line</Text>
                <Text style={styles.relatedName}>
                  {productLine?.name || productLine?.title || "Product Line"}
                </Text>
                {productLine?.publicSummary || productLine?.description ? (
                  <Text style={styles.meta}>
                    {productLine.publicSummary || productLine.description}
                  </Text>
                ) : null}
                {publicGrowInterests(productLine).length ? (
                  <Text style={styles.interests}>
                    Interests: {publicGrowInterests(productLine).join(", ")}
                  </Text>
                ) : null}
                <Link
                  href={
                    `/store/${encodeURIComponent(slug)}?line=${encodeURIComponent(
                      lineKey(productLine)
                    )}` as any
                  }
                  asChild
                >
                  <Pressable style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Browse Line</Text>
                  </Pressable>
                </Link>
              </View>
            ) : null}
          </AppCard>

          <AppCard>
            <Text style={styles.cardTitle}>Label / Use Information</Text>
            <View style={styles.specGrid}>
              <SpecRow label="Source tool" value={specs.sourceTool || specs.source} />
              <SpecRow
                label="Size / weight"
                value={product?.unitSize || specs.unitSize}
              />
              <SpecRow label="N-P-K" value={product?.npk || specs.npk} />
              <SpecRow
                label="Guaranteed analysis"
                value={product?.guaranteedAnalysis || specs.guaranteedAnalysis}
              />
              <SpecRow
                label="Guaranteed analysis estimate"
                value={specs.guaranteedAnalysisEstimate}
              />
              <SpecRow label="Elemental estimate" value={specs.elementalEstimate} />
              <SpecRow
                label="Ingredients"
                value={product?.ingredients || specs.ingredients}
              />
              <SpecRow
                label="Directions"
                value={product?.directions || specs.directions}
              />
              <SpecRow
                label="Application rate"
                value={product?.applicationRate || specs.applicationRate}
              />
              <SpecRow
                label="Release timing"
                value={specs.releaseCurve || specs.releaseTimeline}
              />
              <SpecRow label="Warnings" value={specs.warnings} />
            </View>
          </AppCard>

          {relatedCourses.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Related Courses</Text>
              {relatedCourses.map((course) => (
                <View key={course?.id || course?.title} style={styles.linkedRow}>
                  <View style={styles.linkedCopy}>
                    <Text style={styles.relatedName}>
                      {course?.title || course?.name || "Course"}
                    </Text>
                    {course?.summary || course?.description ? (
                      <Text style={styles.meta}>
                        {course.summary || course.description}
                      </Text>
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
                        String(
                          course?.id ||
                            course?._id ||
                            course?.courseId ||
                            course?.slug ||
                            "course"
                        )
                      )}` as any
                    }
                    asChild
                  >
                    <Pressable style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Open Course</Text>
                    </Pressable>
                  </Link>
                </View>
              ))}
            </AppCard>
          ) : null}

          {relatedLives.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Product Lives</Text>
              <Text style={styles.meta}>
                Product demos, launch sessions, Q&A lives, and replays connect through the
                public Live Session surface.
              </Text>
              {relatedLives.map((live) => {
                const liveId = String(live?.id || live?._id || live?.liveId || "");
                return (
                  <View key={liveId || live?.title || "live"} style={styles.linkedRow}>
                    <View style={styles.linkedCopy}>
                      <Text style={styles.relatedName}>
                        {live?.title || live?.name || "Live"}
                      </Text>
                      {live?.summary || live?.description ? (
                        <Text style={styles.meta}>
                          {live.summary || live.description}
                        </Text>
                      ) : null}
                      {live?.scheduledStart ? (
                        <Text style={styles.meta}>
                          Starts: {String(live.scheduledStart)}
                        </Text>
                      ) : null}
                    </View>
                    <Link
                      href={
                        `/live-session?sessionId=${encodeURIComponent(liveId)}` as any
                      }
                      asChild
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Open Live</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </AppCard>
          ) : null}

          {relatedCampaigns.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Promoted Product Campaigns</Text>
              <Text style={styles.meta}>
                Campaigns are advertising and outreach for this product. Product support
                and discussion stay in Forum/Q&A.
              </Text>
              {relatedCampaigns.map((campaign) => (
                <View key={campaign?.id || campaign?.title} style={styles.linkedRow}>
                  <View style={styles.linkedCopy}>
                    <Text style={styles.relatedName}>
                      {campaign?.title || campaign?.headline || "Campaign"}
                    </Text>
                    {campaign?.summary || campaign?.body ? (
                      <Text style={styles.meta}>{campaign.summary || campaign.body}</Text>
                    ) : null}
                    {publicGrowInterests(campaign).length ? (
                      <Text style={styles.interests}>
                        Interests: {publicGrowInterests(campaign).join(", ")}
                      </Text>
                    ) : null}
                  </View>
                  <Link href={campaignHref(campaign) as any} asChild>
                    <Pressable style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Open Campaign</Text>
                    </Pressable>
                  </Link>
                </View>
              ))}
            </AppCard>
          ) : null}

          {relatedThreads.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Product Forum / Q&A</Text>
              <Text style={styles.meta}>
                Ask usage, application-rate, batch, and product-support questions in the
                linked Forum/Q&A thread.
              </Text>
              {relatedThreads.map((thread) => (
                <View
                  key={thread?.id || thread?._id || thread?.threadId || thread?.title}
                  style={styles.linkedRow}
                >
                  <View style={styles.linkedCopy}>
                    <Text style={styles.relatedName}>
                      {thread?.title || thread?.headline || "Discussion"}
                    </Text>
                    {thread?.summary || thread?.body ? (
                      <Text style={styles.meta}>{thread.summary || thread.body}</Text>
                    ) : null}
                  </View>
                  <Link href={forumThreadHref(thread) as any} asChild>
                    <Pressable style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Open Q&A</Text>
                    </Pressable>
                  </Link>
                </View>
              ))}
            </AppCard>
          ) : null}

          <AppCard>
            <Text style={styles.cardTitle}>More Options</Text>
            <View style={styles.actionRow}>
              <Link href={`/store/${encodeURIComponent(slug)}` as any} asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Back to Store</Text>
                </Pressable>
              </Link>
              <Link href={`/brands/${encodeURIComponent(slug)}` as any} asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Legacy Profile</Text>
                </Pressable>
              </Link>
              <Link href={`/store?similarTo=${encodeURIComponent(slug)}` as any} asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Similar Brands</Text>
                </Pressable>
              </Link>
              <Link href={returnFeedHref as any} asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Return to Campaigns</Text>
                </Pressable>
              </Link>
            </View>
          </AppCard>

          {links.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Brand Links</Text>
              <View style={styles.actionRow}>
                {links.map((link) => (
                  <Pressable
                    key={`${link.label}-${link.url}`}
                    style={styles.secondaryButton}
                    onPress={() => {
                      trackCommercialClick({
                        eventType: "product_brand_link_click",
                        objectType: "storefront",
                        objectId: productKey(product),
                        productId: productKey(product),
                        storefrontSlug: slug,
                        targetUrl: link.url,
                        source: "public_product",
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

          {relatedProducts.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>More From {brandName}</Text>
              {relatedProducts.map((item) => (
                <Link
                  key={productKey(item) || item?.name}
                  href={publicProductUrl(slug, item) as any}
                  asChild
                >
                  <Pressable style={styles.relatedRow}>
                    <Text style={styles.relatedName}>{item?.name || "Product"}</Text>
                    {publicGrowInterests(item).length ? (
                      <Text style={styles.interests}>
                        Interests: {publicGrowInterests(item).join(", ")}
                      </Text>
                    ) : null}
                    <Text style={styles.meta}>{money(item)}</Text>
                  </Pressable>
                </Link>
              ))}
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
    borderRadius: radius.card,
    color: "#334155",
    marginBottom: 10,
    padding: 8
  },
  cardTitle: { color: "#111827", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  bodyText: { color: "#475569", lineHeight: 20, marginBottom: 10 },
  meta: { color: "#64748B", lineHeight: 19 },
  interests: { color: "#047857", fontSize: 12, fontWeight: "800" },
  price: { color: "#166534", fontSize: 18, fontWeight: "800", marginTop: 4 },
  warning: { color: "#92400E", fontWeight: "700", lineHeight: 20 },
  specGrid: { gap: 8 },
  specRow: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 10
  },
  specLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  specValue: { color: "#0F172A", fontWeight: "700", lineHeight: 20, marginTop: 4 },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryButtonText: { color: "#166534", fontWeight: "800" },
  disabled: { opacity: 0.6 },
  relatedRow: {
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    gap: 4,
    paddingVertical: 10
  },
  linkedRow: {
    alignItems: "center",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingVertical: 10
  },
  linkedCopy: { flex: 1, gap: 4 },
  linePanel: {
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    marginTop: 10,
    padding: 10
  },
  relatedName: { color: "#111827", fontWeight: "800" }
});
