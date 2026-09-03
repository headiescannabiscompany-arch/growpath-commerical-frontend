import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import {
  recordCommercialAnalyticsEvent,
  type CommercialAnalyticsEvent
} from "@/api/commercialAnalytics";
import { pollCourseAccessStatus, startCourseCheckout } from "@/api/coursePayments";
import { fetchPublicStorefront } from "@/api/storefront";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import {
  extractPublicCommercialPayload,
  publicGrowInterests,
  publicItemId,
  publicItemSummary,
  publicItemTitle
} from "@/utils/publicCommerce";
import { sharePublicLink } from "@/utils/publicLinks";
import { resolveImageUri } from "@/utils/photoUploads";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  clearPendingBuyerCheckout,
  readPendingBuyerCheckout,
  rememberPendingBuyerCheckout
} from "@/utils/buyerCheckoutRecovery";

function normalize(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeCheckoutResult(value: unknown) {
  const normalized = String(Array.isArray(value) ? value[0] || "" : value || "")
    .trim()
    .toLowerCase();
  if (["cancel", "canceled", "cancelled"].includes(normalized)) return "canceled";
  return normalized === "success" ? "success" : "";
}

function courseKey(course: any) {
  return String(course?.id || course?._id || course?.courseId || course?.slug || "");
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

function money(course: any) {
  const cents = Number(course?.priceCents || 0);
  if (cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const price = Number(course?.price || 0);
  return price > 0 ? `$${price.toFixed(2)}` : "Free";
}

function isPaidCourse(course: any) {
  return (
    course?.access === "paid" ||
    course?.pricingType === "paid" ||
    Number(course?.priceCents || 0) > 0 ||
    Number(course?.price || 0) > 0 ||
    Boolean(course?.stripePriceId)
  );
}

function linkedIds(item: any, keys: string[]) {
  return keys
    .flatMap((key) => {
      const value = item?.[key];
      return Array.isArray(value) ? value : [value];
    })
    .map((value) => String(value || ""))
    .filter(Boolean);
}

function itemLinksCourse(item: any, id: string) {
  if (!id) return false;
  return linkedIds(item, [
    "linkedCourseId",
    "relatedCourseId",
    "courseId",
    "linkedCourseIds",
    "relatedCourseIds"
  ]).includes(id);
}

function itemLinksProduct(item: any, productId: string) {
  if (!productId) return false;
  return linkedIds(item, [
    "linkedProductId",
    "relatedProductId",
    "productId",
    "linkedProductIds",
    "relatedProductIds"
  ]).includes(productId);
}

async function openUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

function trackCommercialClick(payload: CommercialAnalyticsEvent) {
  void recordCommercialAnalyticsEvent(payload).catch(() => {
    // Public storefront navigation should not depend on analytics delivery.
  });
}

export default function PublicStorefrontCourseRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const params = useLocalSearchParams<{
    slug?: string;
    courseId?: string;
    checkout?: string;
    course?: string;
  }>();
  const slug = useMemo(() => String(params.slug || "").trim(), [params.slug]);
  const requestedCourseId = useMemo(
    () => String(params.courseId || params.course || "").trim(),
    [params.course, params.courseId]
  );
  const checkoutResult = useMemo(
    () => normalizeCheckoutResult(params.checkout),
    [params.checkout]
  );

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(checkoutResult === "success");
  const [checkoutState, setCheckoutState] = useState<
    "confirmed" | "pending" | "terminal" | "unknown"
  >(checkoutResult === "success" ? "pending" : "unknown");
  const [storefront, setStorefront] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lives, setLives] = useState<any[]>([]);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const checkoutHandledRef = useRef("");
  const checkoutStartRef = useRef(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const res: any = await fetchPublicStorefront(slug);
      const payload = extractPublicCommercialPayload(res);
      setStorefront(payload.storefront);
      setCourses(payload.courses);
      setProducts(payload.products);
      setLives((payload as any).lives || []);
      setFeedPosts(payload.feedPosts);
      setForumThreads(payload.forumThreads);
    } catch (err: any) {
      setError(err?.message || "Unable to load course.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const course = useMemo(() => {
    const requested = normalize(decodeURIComponent(requestedCourseId));
    return courses.find((item) => {
      const candidates = [
        courseKey(item),
        item?.slug,
        item?.title,
        item?.name,
        String(item?.title || item?.name || "").replace(/\s+/g, "-")
      ];
      return candidates.some((candidate) => normalize(String(candidate)) === requested);
    });
  }, [courses, requestedCourseId]);

  const id = courseKey(course);
  const brandName = storefront?.businessName || storefront?.name || "Brand";
  const relatedProductIds = linkedIds(course, [
    "linkedProductId",
    "relatedProductId",
    "productId",
    "linkedProductIds",
    "relatedProductIds"
  ]);
  const relatedProducts = products
    .filter((product) =>
      relatedProductIds.includes(
        String(product?.id || product?._id || product?.productId || "")
      )
    )
    .slice(0, 3);
  const relatedLives = lives.filter((live) => itemLinksCourse(live, id)).slice(0, 3);
  const relatedCampaigns = feedPosts
    .filter((post) => itemLinksCourse(post, id))
    .slice(0, 3);
  const relatedThreads = forumThreads
    .filter((thread) => itemLinksCourse(thread, id))
    .slice(0, 3);
  const relatedProductCampaigns = feedPosts
    .filter((post) =>
      relatedProductIds.some((productId) => itemLinksProduct(post, productId))
    )
    .slice(0, 2);
  const visibleCampaigns = [
    ...new Map(
      [...relatedCampaigns, ...relatedProductCampaigns].map((campaign) => [
        publicItemId(campaign) || publicItemTitle(campaign, "Campaign"),
        campaign
      ])
    ).values()
  ].slice(0, 4);
  const priceLabel = money(course);
  const paid = isPaidCourse(course);
  const courseHeroImage = resolveImageUri(
    String(course?.bannerUrl || course?.thumbnailUrl || course?.imageUrl || "")
  );

  useEffect(() => {
    if (!slug || !id) return;
    trackCommercialClick({
      eventType: "course_view",
      objectType: "course",
      objectId: id,
      courseId: id,
      storefrontSlug: slug,
      source: "public_storefront_course",
      metadata: { growInterests: publicGrowInterests(course) }
    });
  }, [course, id, slug]);

  const reconcileCourseCheckout = useCallback(
    async (options: { shouldContinue?: () => boolean } = {}) => {
      if (!id) return null;
      setBusy(true);
      setCheckoutPending(true);
      setCheckoutState("pending");
      setFeedback("Checking server-confirmed payment and enrollment status...");
      try {
        const result = await pollCourseAccessStatus(id, {
          shouldContinue: options.shouldContinue
        });
        if (options.shouldContinue && !options.shouldContinue()) return result;
        setCheckoutState(result.state);
        if (result.state === "confirmed") {
          await clearPendingBuyerCheckout("course", id).catch(() => false);
          setCheckoutPending(false);
          setFeedback("Payment and enrollment are confirmed by the server.");
        } else if (result.state === "terminal") {
          await clearPendingBuyerCheckout("course", id).catch(() => false);
          setCheckoutPending(false);
          setFeedback(
            "The server reports that this checkout did not create active access."
          );
        } else {
          setFeedback(
            "Checkout returned, but enrollment is still awaiting server confirmation. Another checkout is disabled while status is pending."
          );
        }
        return result;
      } finally {
        if (!options.shouldContinue || options.shouldContinue()) setBusy(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    void (async () => {
      const stored = await readPendingBuyerCheckout("course").catch(() => null);
      if (!active) return;
      const recoveryKey = `${checkoutResult || "pending"}:${id}`;
      if (checkoutHandledRef.current === recoveryKey) return;
      if (checkoutResult === "canceled") {
        checkoutHandledRef.current = recoveryKey;
        await clearPendingBuyerCheckout("course", id).catch(() => false);
        if (!active) return;
        setCheckoutPending(false);
        setCheckoutState("terminal");
        setFeedback(
          "Checkout was canceled. Course access was not inferred from the return link."
        );
        return;
      }
      if (checkoutResult !== "success" && stored?.itemId !== id) return;
      checkoutHandledRef.current = recoveryKey;
      setCheckoutPending(true);
      setCheckoutState("pending");
      if (checkoutResult === "success" && stored?.itemId !== id) {
        await rememberPendingBuyerCheckout("course", id).catch(() => null);
      }
      if (active) {
        await reconcileCourseCheckout({ shouldContinue: () => active });
      }
    })();
    return () => {
      active = false;
    };
  }, [checkoutResult, id, reconcileCourseCheckout]);

  async function startCheckout() {
    if (!id || checkoutStartRef.current) return;
    if (paid && checkoutState === "confirmed") {
      await openUrl(`/courses?courseId=${encodeURIComponent(id)}`);
      return;
    }
    if (paid && checkoutPending) {
      await reconcileCourseCheckout();
      return;
    }
    checkoutStartRef.current = true;
    setBusy(true);
    setFeedback("");
    trackCommercialClick({
      eventType: paid ? "course_checkout_click" : "course_open_click",
      objectType: "course",
      objectId: id,
      courseId: id,
      storefrontSlug: slug,
      source: "public_storefront_course",
      metadata: { growInterests: publicGrowInterests(course), paid }
    });
    try {
      if (!paid) {
        await openUrl(`/courses?courseId=${encodeURIComponent(id)}`);
        return;
      }
      const checkout: any = await startCourseCheckout(id, {
        returnPath: `/store/${encodeURIComponent(slug)}/courses/${encodeURIComponent(
          requestedCourseId || id
        )}`
      });
      const url =
        checkout?.url ||
        checkout?.checkoutUrl ||
        checkout?.data?.url ||
        checkout?.data?.checkoutUrl;
      if (!url) {
        setFeedback("Checkout unavailable. The backend did not return a checkout URL.");
        Alert.alert("Checkout unavailable", "The backend did not return a checkout URL.");
        return;
      }
      setCheckoutPending(true);
      setCheckoutState("pending");
      await rememberPendingBuyerCheckout(
        "course",
        id,
        `/store/${encodeURIComponent(slug)}/courses/${encodeURIComponent(
          requestedCourseId || id
        )}`
      ).catch(() => null);
      await openUrl(url);
      setFeedback(
        "Checkout opened. Course access remains locked until the server confirms enrollment."
      );
    } catch (err: any) {
      setFeedback(err?.message || "Unable to start course checkout.");
      Alert.alert("Checkout failed", err?.message || "Unable to start course checkout.");
    } finally {
      checkoutStartRef.current = false;
      setBusy(false);
    }
  }

  async function shareCourse() {
    try {
      const result = await sharePublicLink(
        publicItemTitle(course, "GrowPath course"),
        `/store/${slug}/courses/${requestedCourseId}`,
        {
          description: publicItemSummary(course),
          socialPreviewUrl: course?.socialPreviewUrl
        }
      );
      setFeedback(
        result.method === "web-clipboard"
          ? "Course link copied."
          : "Course link ready to share."
      );
    } catch (err: any) {
      setFeedback(err?.message || "Unable to share course.");
    }
  }

  return (
    <AppPage
      routeKey="public-storefront-course"
      backFallbackHref={`/store/${encodeURIComponent(slug)}`}
      header={
        <View>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {publicItemTitle(course, "Course")}
          </Text>
          <Text style={styles.subtitle}>{brandName}</Text>
        </View>
      }
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.meta}>Loading course...</Text>
        </View>
      ) : error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : !course ? (
        <AppCard>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Course not found
          </Text>
          <Text style={styles.meta}>
            This course may be unpublished or no longer available.
          </Text>
        </AppCard>
      ) : (
        <>
          {checkoutResult === "success" ? (
            <AppCard>
              <Text style={styles.successTitle}>
                {checkoutState === "confirmed"
                  ? "Enrollment confirmed"
                  : "Confirming enrollment"}
              </Text>
              <Text style={styles.bodyText}>
                {checkoutState === "confirmed"
                  ? "The server confirmed active enrollment. You can open the course."
                  : "Stripe returned to GrowPath, but the return link does not grant access. GrowPath is checking the payment webhook and enrollment record."}
              </Text>
              <Link
                href={
                  `/home/personal/courses?courseId=${encodeURIComponent(
                    id
                  )}&checkout=success` as any
                }
                asChild
              >
                <Pressable
                  style={styles.primaryButton}
                  accessibilityRole="link"
                  accessibilityLabel="Open course enrollment status"
                >
                  <Text style={styles.primaryButtonText}>
                    {checkoutState === "confirmed" ? "Open Course" : "Open Course Status"}
                  </Text>
                </Pressable>
              </Link>
            </AppCard>
          ) : checkoutResult === "canceled" ? (
            <AppCard>
              <Text style={styles.canceledTitle}>Checkout canceled</Text>
              <Text style={styles.bodyText}>
                Course access was not inferred from this return link. You can review the
                course and try again.
              </Text>
            </AppCard>
          ) : checkoutPending ? (
            <AppCard>
              <Text style={styles.successTitle}>Checkout status pending</Text>
              <Text style={styles.bodyText}>
                GrowPath recovered an earlier checkout for this course and is waiting for
                server-confirmed enrollment before allowing another purchase.
              </Text>
            </AppCard>
          ) : null}
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          <AppCard>
            {courseHeroImage ? (
              <Image
                accessibilityLabel={`${publicItemTitle(course, "Course")} course image`}
                resizeMode="cover"
                source={{ uri: courseHeroImage }}
                style={styles.courseHeroImage}
              />
            ) : null}
            <Text style={styles.cardTitle}>{publicItemTitle(course, "Course")}</Text>
            {publicItemSummary(course) ? (
              <Text style={styles.bodyText}>{publicItemSummary(course)}</Text>
            ) : null}
            {course?.fullDescription ? (
              <Text style={styles.bodyText}>{course.fullDescription}</Text>
            ) : null}
            {publicGrowInterests(course).length ? (
              <Text style={styles.interests}>
                Interests: {publicGrowInterests(course).join(", ")}
              </Text>
            ) : null}
            <Text style={styles.price}>{priceLabel}</Text>
            <View style={styles.badgeRow}>
              {course?.skillLevel ? (
                <Text style={styles.statusPill}>{course.skillLevel}</Text>
              ) : null}
              {course?.category ? (
                <Text style={styles.statusPill}>{course.category}</Text>
              ) : null}
              <Text style={styles.statusPill}>
                {paid ? "Paid course" : "Free course"}
              </Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityLabel={
                  paid && checkoutState === "confirmed"
                    ? "Open enrolled storefront course"
                    : paid
                      ? "Buy storefront course"
                      : "Open storefront course"
                }
                accessibilityState={{ disabled: busy || checkoutPending }}
                style={[
                  styles.primaryButton,
                  (busy || checkoutPending) && styles.disabled
                ]}
                disabled={busy || checkoutPending}
                onPress={startCheckout}
              >
                <Text style={styles.primaryButtonText}>
                  {checkoutPending
                    ? "Confirming Payment..."
                    : busy
                      ? "Opening..."
                      : paid && checkoutState !== "confirmed"
                        ? "Buy Course"
                        : "Open Course"}
                </Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={shareCourse}>
                <Text style={styles.secondaryButtonText}>Share Course</Text>
              </Pressable>
            </View>
          </AppCard>

          <AppCard>
            <Text style={styles.cardTitle}>Course Includes</Text>
            <View style={styles.specGrid}>
              <SpecRow
                label="Modules"
                value={course?.moduleCount || course?.modules?.length}
              />
              <SpecRow
                label="Lessons"
                value={course?.lessonCount || course?.lessons?.length}
              />
              <SpecRow
                label="Documents"
                value={course?.documentCount || course?.documents?.length}
              />
              <SpecRow
                label="Videos"
                value={course?.videoCount || course?.videos?.length}
              />
              <SpecRow label="Related lives" value={relatedLives.length} />
              <SpecRow label="Related products" value={relatedProducts.length} />
            </View>
          </AppCard>

          {relatedProducts.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Related Products</Text>
              {relatedProducts.map((product) => {
                const productId = publicItemId(product);
                return (
                  <View
                    key={productId || publicItemTitle(product, "Product")}
                    style={styles.linkedRow}
                  >
                    <View style={styles.linkedCopy}>
                      <Text style={styles.relatedName}>
                        {publicItemTitle(product, "Product")}
                      </Text>
                      {publicItemSummary(product) ? (
                        <Text style={styles.meta}>{publicItemSummary(product)}</Text>
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
                          productId || "product"
                        )}` as any
                      }
                      asChild
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>View Product</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </AppCard>
          ) : null}

          {relatedLives.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Related Lives</Text>
              {relatedLives.map((live) => {
                const liveId = publicItemId(live);
                return (
                  <View
                    key={liveId || publicItemTitle(live, "Live")}
                    style={styles.linkedRow}
                  >
                    <View style={styles.linkedCopy}>
                      <Text style={styles.relatedName}>
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

          {visibleCampaigns.length ? (
            <AppCard>
              <Text style={styles.cardTitle}>Promoted Course Campaigns</Text>
              <Text style={styles.meta}>
                Campaigns are advertising and outreach. Discussion stays in Forum/Q&A.
              </Text>
              {visibleCampaigns.map((campaign) => (
                <View
                  key={publicItemId(campaign) || publicItemTitle(campaign, "Campaign")}
                  style={styles.linkedRow}
                >
                  <View style={styles.linkedCopy}>
                    <Text style={styles.relatedName}>
                      {publicItemTitle(campaign, "Campaign")}
                    </Text>
                    {publicItemSummary(campaign) ? (
                      <Text style={styles.meta}>{publicItemSummary(campaign)}</Text>
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
              <Text style={styles.cardTitle}>Course Forum / Q&A</Text>
              <Text style={styles.meta}>
                Ask lesson, product, assignment, and replay questions in Forum/Q&A.
              </Text>
              {relatedThreads.map((thread) => {
                const threadId = publicItemId(thread);
                return (
                  <View
                    key={threadId || publicItemTitle(thread, "Discussion")}
                    style={styles.linkedRow}
                  >
                    <View style={styles.linkedCopy}>
                      <Text style={styles.relatedName}>
                        {publicItemTitle(thread, "Discussion")}
                      </Text>
                      {publicItemSummary(thread) ? (
                        <Text style={styles.meta}>{publicItemSummary(thread)}</Text>
                      ) : null}
                    </View>
                    <Link
                      href={
                        threadId
                          ? (`/forum/post?id=${encodeURIComponent(threadId)}` as any)
                          : ("/forum" as any)
                      }
                      asChild
                    >
                      <Pressable style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>Open Q&A</Text>
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </AppCard>
          ) : null}

          <AppCard>
            <Text style={styles.cardTitle}>More Options</Text>
            <View style={styles.actionRow}>
              <Link href={`/brands/${encodeURIComponent(slug)}` as any} asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Legacy Profile</Text>
                </Pressable>
              </Link>
              <Link href="/courses" asChild>
                <Pressable style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Course Directory</Text>
                </Pressable>
              </Link>
            </View>
          </AppCard>
        </>
      )}
    </AppPage>
  );
}

function SpecRow({ label, value }: { label: string; value?: unknown }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  if (value === null || value === undefined || value === "" || value === 0) return null;
  const display = Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value);
  if (!display) return null;
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{display}</Text>
    </View>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    title: { color: palette.text, fontSize: 26, fontWeight: "800" },
    subtitle: { color: palette.textMuted, lineHeight: 20, marginTop: 4 },
    center: { alignItems: "center", gap: 8, justifyContent: "center", minHeight: 180 },
    error: { color: palette.danger, fontWeight: "800" },
    successTitle: { color: palette.success, fontSize: 18, fontWeight: "900" },
    canceledTitle: { color: palette.warning, fontSize: 18, fontWeight: "900" },
    feedback: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      color: palette.textSoft,
      marginBottom: 10,
      padding: 8
    },
    cardTitle: { color: palette.text, fontSize: 18, fontWeight: "800", marginBottom: 8 },
    courseHeroImage: {
      aspectRatio: 16 / 7,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      marginBottom: 14,
      width: "100%"
    },
    bodyText: { color: palette.textSoft, lineHeight: 20, marginBottom: 10 },
    meta: { color: palette.textMuted, lineHeight: 19 },
    interests: { color: palette.link, fontSize: 12, fontWeight: "800" },
    price: { color: palette.success, fontSize: 18, fontWeight: "800", marginTop: 4 },
    badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    statusPill: {
      backgroundColor: palette.accentSoft,
      borderRadius: 999,
      color: palette.link,
      fontSize: 12,
      fontWeight: "800",
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.info,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    disabled: { opacity: 0.6 },
    specGrid: { gap: 8 },
    specRow: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      padding: 10
    },
    specLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    specValue: { color: palette.text, lineHeight: 19 },
    linkedRow: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      marginTop: 10,
      padding: 12
    },
    linkedCopy: { flex: 1, gap: 4 },
    relatedName: { color: palette.text, fontWeight: "800" }
  });
}
