import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Link } from "expo-router";

import { listCommercialFeedCampaigns } from "@/api/commercialFeed";
import { listForumPosts } from "@/api/communitySocial";
import { listCourses } from "@/api/courses";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  canonicalGrowInterestTag,
  flattenGrowInterests,
  normalizeInterestList
} from "@/utils/growInterests";
import { resolveImageUri } from "@/utils/photoUploads";

type HighlightCard = {
  key: string;
  label: string;
  title: string;
  summary: string;
  href: string;
  meta?: string;
  imageUrl?: string;
};

function cleanText(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

const PUBLIC_TEST_TITLE_PATTERNS = [
  /^qa(?:\s+only)?\b/i,
  /^\[qa\]/i,
  /^e2e\b/i,
  /^test(?:ing)?\s+(?:post|course|campaign|product)\b/i
];

export function isPublicTestContent(row: any) {
  if (row?.isTest === true || row?.qaOnly === true || row?.testOnly === true) {
    return true;
  }

  const title = cleanText(row?.title || row?.name);
  const detail = cleanText(
    row?.summary || row?.description || row?.body || row?.content || row?.text
  );
  return (
    PUBLIC_TEST_TITLE_PATTERNS.some((pattern) => pattern.test(title)) ||
    PUBLIC_TEST_TITLE_PATTERNS.some((pattern) => pattern.test(detail)) ||
    /\bqa[- ]only\b/i.test(detail)
  );
}

function structuredDiscoveryTags(row: any) {
  const growInterests = Array.isArray(row?.growInterests)
    ? row.growInterests
    : flattenGrowInterests(row?.growInterests || {});
  return [
    ...normalizeInterestList(growInterests),
    ...normalizeInterestList(row?.growTags),
    ...normalizeInterestList(row?.tags)
  ];
}

export function isCannabisDiscoveryRecord(row: any) {
  return structuredDiscoveryTags(row).some((value: unknown) => {
    const canonical = canonicalGrowInterestTag(value);
    return canonical === "Cannabis" || /\bhemp\b/i.test(String(value || ""));
  });
}

export function viewerAllowsCannabisDiscovery(user: any) {
  if (String(user?.cannabisVisibility || "").toLowerCase() === "show") return true;
  return flattenGrowInterests(user?.growInterests || {}).some((value: unknown) => {
    const canonical = canonicalGrowInterestTag(value);
    return canonical === "Cannabis" || /\bhemp\b/i.test(String(value || ""));
  });
}

export function isEligibleHomeDiscoveryRecord(row: any, allowCannabis: boolean) {
  if (!row || isPublicTestContent(row)) return false;
  if (row.deletedAt || row.isDeleted || row.hidden || row.isHidden) return false;

  const visibility = String(row.visibility || "")
    .trim()
    .toLowerCase();
  if (["private", "draft", "unlisted", "hidden", "removed"].includes(visibility)) {
    return false;
  }

  const status = String(row.status || "")
    .trim()
    .toLowerCase();
  if (
    [
      "draft",
      "scheduled",
      "paused",
      "ended",
      "cancelled",
      "canceled",
      "archived",
      "deleted",
      "hidden",
      "removed"
    ].includes(status)
  ) {
    return false;
  }

  return allowCannabis || !isCannabisDiscoveryRecord(row);
}

function homePlacementEligible(row: any) {
  const placements = normalizeInterestList(row?.placements).map((value: unknown) =>
    String(value).trim().toLowerCase()
  );
  if (!placements.length || placements.includes("feed")) return true;
  return placements.includes("home_hero") || placements.includes("home_top");
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function selectRotatedRecords<T>(rows: T[], count: number, rotationKey: string) {
  if (!rows.length || count <= 0) return [];
  const start = stableHash(rotationKey) % rows.length;
  const rotated = [...rows.slice(start), ...rows.slice(0, start)];
  return rotated.slice(0, Math.min(count, rotated.length));
}

function clipText(value: unknown, max = 150) {
  const text = cleanText(value);
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function rows(payload: any, keys: string[] = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function entityId(row: any) {
  return String(
    row?.id || row?._id || row?.courseId || row?.campaignId || row?.title || ""
  );
}

const FALLBACK_CARDS: HighlightCard[] = [
  {
    key: "shortcut-storefronts",
    label: "GrowPath shortcut",
    title: "Browse grower storefronts",
    summary:
      "Discover products, courses, and grow education from published GrowPath brands.",
    href: "/feed",
    meta: "Explore"
  },
  {
    key: "shortcut-feed",
    label: "GrowPath shortcut",
    title: "Follow brand updates",
    summary:
      "See current launches, updates, offers, and education from brands you follow.",
    href: "/feed",
    meta: "Feed"
  },
  {
    key: "shortcut-products",
    label: "GrowPath shortcut",
    title: "Explore products and trials",
    summary:
      "Move from a campaign straight into storefronts, products, trials, and live drops.",
    href: "/feed",
    meta: "Discover"
  },
  {
    key: "shortcut-facility-learning",
    label: "GrowPath guide",
    title: "Facility learning and SOPs",
    summary:
      "Training, compliance, IPM, safety, and facility outreach designed for operators.",
    href: "/feed",
    meta: "Learn"
  },
  {
    key: "shortcut-courses",
    label: "GrowPath shortcut",
    title: "Open courses",
    summary: "Published lessons for product education, onboarding, and learning paths.",
    href: "/courses",
    meta: "Learn"
  },
  {
    key: "shortcut-forum",
    label: "GrowPath shortcut",
    title: "Join Forum / Q&A",
    summary:
      "Read a high-signal thread from the community and jump into the conversation.",
    href: "/home/personal/community",
    meta: "Community"
  }
];

export function campaignHref(campaign: any, _facility = false) {
  const id = entityId(campaign);
  if (!id) return "/feed";
  // Personal Home is a public/shared discovery surface. Even a Facility-authored
  // education card must open the shared campaign feed instead of crossing into a
  // role-gated Facility workspace that most Personal users cannot access.
  return "/feed?campaignId=" + encodeURIComponent(id);
}

function campaignImage(campaign: any) {
  return resolveImageUri(
    campaign?.creativeImageUrl || campaign?.bannerImageUrl || campaign?.imageUrl || ""
  );
}

function courseImage(course: any) {
  return resolveImageUri(
    course?.thumbnailUrl || course?.imageUrl || course?.bannerImageUrl || ""
  );
}

function courseHref(course: any) {
  const id = entityId(course);
  return id ? "/courses?courseId=" + encodeURIComponent(id) : "/courses";
}

function forumScore(post: any) {
  const likes = Number(post?.likeCount ?? post?.likes?.length ?? 0);
  const comments = Number(post?.commentCount ?? post?.comments?.length ?? 0);
  return likes * 2 + comments;
}

function forumHref(post: any) {
  const id = entityId(post);
  return id ? "/forum/post?id=" + encodeURIComponent(id) : "/home/personal/community";
}

function forumImage(post: any) {
  const image =
    post?.imageUrl || post?.images?.[0] || post?.photoUrls?.[0] || post?.photos?.[0];
  return resolveImageUri(String(image || ""));
}

export default function PersonalFeaturedFeed({ rotationKey }: { rotationKey?: string }) {
  const { palette } = useAppTheme();
  const auth = useAuth();
  const styles = useMemo(() => createPersonalFeaturedFeedStyles(palette), [palette]);
  const [cards, setCards] = useState<HighlightCard[]>(FALLBACK_CARDS);
  const [loading, setLoading] = useState(true);
  const effectiveRotationKey = rotationKey || new Date().toISOString().slice(0, 10);
  const allowCannabis = viewerAllowsCannabisDiscovery(auth.user);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const [campaignResult, forumResult, courseResult] = await Promise.allSettled([
          listCommercialFeedCampaigns({
            sort: "top",
            limit: 30,
            placement: "home_hero"
          }),
          listForumPosts(1),
          listCourses(1)
        ]);

        const campaigns = (
          campaignResult.status === "fulfilled" ? campaignResult.value.items : []
        ).filter(
          (campaign) =>
            isEligibleHomeDiscoveryRecord(campaign, allowCannabis) &&
            homePlacementEligible(campaign)
        );
        const forumPosts = (
          forumResult.status === "fulfilled" ? forumResult.value : []
        ).filter((post) => isEligibleHomeDiscoveryRecord(post, allowCannabis));
        const courseItems: any[] =
          courseResult.status === "fulfilled"
            ? rows(courseResult.value, ["courses", "results", "items"]).filter(
                (course: any) => isEligibleHomeDiscoveryRecord(course, allowCannabis)
              )
            : [];

        const commercialCampaigns = campaigns.filter(
          (campaign) =>
            ![campaign?.ownerType, campaign?.authorType, campaign?.workspaceType]
              .map((value) => String(value || "").toLowerCase())
              .includes("facility")
        );
        const commercialCards = selectRotatedRecords(
          commercialCampaigns,
          3,
          `commercial:${effectiveRotationKey}`
        ).map((campaign, index) => ({
          key: "commercial-" + (entityId(campaign) || String(index)),
          label: "Commercial ad",
          title: cleanText(
            campaign?.title || campaign?.campaignKind || "Commercial campaign"
          ),
          summary:
            clipText(campaign?.body || "Open this commercial campaign.") ||
            "Open this commercial campaign.",
          href: campaignHref(campaign, false),
          meta: cleanText(campaign?.campaignType || campaign?.type || "Commercial"),
          imageUrl: campaignImage(campaign)
        }));

        const facilityCampaign = selectRotatedRecords(
          campaigns.filter(
            (campaign) =>
              [campaign?.ownerType, campaign?.authorType, campaign?.workspaceType]
                .map((value) => String(value || "").toLowerCase())
                .includes("facility") &&
              String(campaign?.type || "").toLowerCase() === "education"
          ),
          1,
          `facility:${effectiveRotationKey}`
        )[0];

        const topCourse: any = selectRotatedRecords(
          courseItems,
          1,
          `course:${effectiveRotationKey}`
        )[0];
        const popularPost = [...forumPosts].sort(
          (left, right) => forumScore(right) - forumScore(left)
        )[0];

        const nextCards = [...FALLBACK_CARDS];
        commercialCards.slice(0, 3).forEach((card, index) => {
          nextCards[index] = card;
        });
        if (facilityCampaign) {
          nextCards[3] = {
            key: "facility-" + (entityId(facilityCampaign) || "campaign"),
            label: "Facility post",
            title: cleanText(facilityCampaign?.title || "Facility education and SOPs"),
            summary:
              clipText(
                facilityCampaign?.body ||
                  "Training, compliance, IPM, and operator education."
              ) || "Training, compliance, IPM, and operator education.",
            href: campaignHref(facilityCampaign, true),
            meta: cleanText(
              facilityCampaign?.campaignType || facilityCampaign?.type || "Facility"
            ),
            imageUrl: campaignImage(facilityCampaign)
          };
        }
        if (topCourse) {
          nextCards[4] = {
            key: "course-" + entityId(topCourse),
            label: "Course",
            title: cleanText(topCourse?.title || topCourse?.name || "Open courses"),
            summary:
              clipText(
                topCourse?.summary ||
                  topCourse?.description ||
                  "Published lessons for product education, onboarding, and learning paths."
              ) ||
              "Published lessons for product education, onboarding, and learning paths.",
            href: courseHref(topCourse),
            meta: cleanText(topCourse?.category || topCourse?.visibility || "Course"),
            imageUrl: courseImage(topCourse)
          };
        }
        if (popularPost) {
          nextCards[5] = {
            key: "forum-" + entityId(popularPost),
            label: "Forum post",
            title: cleanText(popularPost?.title || "Popular forum discussion"),
            summary:
              clipText(
                popularPost?.body ||
                  popularPost?.content ||
                  popularPost?.text ||
                  "Read a high-signal thread from the community and jump into the conversation."
              ) ||
              "Read a high-signal thread from the community and jump into the conversation.",
            href: forumHref(popularPost),
            meta: String(forumScore(popularPost)) + " engagement",
            imageUrl: forumImage(popularPost)
          };
        }

        if (alive) setCards(nextCards);
      } catch {
        if (alive) setCards(FALLBACK_CARDS);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [allowCannabis, effectiveRotationKey]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Featured feed</Text>
          <Text style={styles.title}>Discover across GrowPath</Text>
          <Text style={styles.subtitle}>
            Explore storefronts, practical facility knowledge, courses, and community
            conversations. Published highlights replace the guided shortcuts as they
            become available.
          </Text>
        </View>
        <Link href="/home/personal/discover" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Open Discover"
            accessibilityHint="Opens the GrowPath discovery page"
            style={styles.moreButton}
          >
            <Text style={styles.moreButtonText}>Open Discover</Text>
          </Pressable>
        </Link>
      </View>

      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading featured feed"
          color={palette.accent}
        />
      ) : null}

      <View style={styles.grid}>
        {cards.map((card) => (
          <Link key={card.key} href={card.href as any} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${card.label}: ${card.title}`}
              accessibilityHint="Opens this featured item"
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              {card.imageUrl ? (
                <Image
                  accessibilityLabel={card.title + " image"}
                  resizeMode="cover"
                  source={{ uri: card.imageUrl }}
                  style={styles.image}
                />
              ) : null}
              <Text style={styles.label}>{card.label}</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {card.title}
              </Text>
              <Text style={styles.cardSummary} numberOfLines={3}>
                {card.summary}
              </Text>
              {card.meta ? <Text style={styles.meta}>{card.meta}</Text> : null}
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

export const createPersonalFeaturedFeedStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    section: {
      gap: 12,
      marginBottom: 10
    },
    headerRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between"
    },
    headerCopy: {
      flex: 1,
      minWidth: 220
    },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 0.2,
      marginBottom: 4,
      textTransform: "uppercase"
    },
    title: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "900",
      lineHeight: 26
    },
    subtitle: {
      color: palette.textMuted,
      lineHeight: 20,
      marginTop: 4,
      maxWidth: 720
    },
    moreButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    moreButtonText: {
      color: palette.link,
      fontWeight: "800"
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    card: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: "31%",
      flexGrow: 1,
      minHeight: 240,
      minWidth: 180,
      padding: 12
    },
    cardPressed: { opacity: 0.85 },
    image: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: 12,
      height: 92,
      marginBottom: 10,
      width: "100%"
    },
    label: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.2,
      textTransform: "uppercase"
    },
    cardTitle: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "900",
      lineHeight: 20,
      marginTop: 4
    },
    cardSummary: {
      color: palette.textMuted,
      lineHeight: 18,
      marginTop: 6
    },
    meta: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 8,
      textTransform: "uppercase"
    }
  });
