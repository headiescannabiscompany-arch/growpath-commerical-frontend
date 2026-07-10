import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import EducationPostCard from "@/components/feed/EducationPostCard";
import AdCard from "@/components/feed/AdCard";
import {
  listCommercialFeedCampaigns,
  type CommercialFeedCampaign
} from "@/api/commercialFeed";

type FeedRailProps = {
  slots: number;
  mode?: string | null;
  plan?: string | null;
  railMode?: "standard" | "education-only" | "promo-only";
  placement?: "top" | "middle" | "bottom";
};

type AdItem = {
  title: string;
  body: string;
  cta: string;
  href: string;
  storefrontSlug: string;
  createdAt: string;
  engagementCount: number;
  clickCount: number;
  promotionCount: number;
  imageUrl: string;
};

function campaignStorefrontSlug(post: CommercialFeedCampaign) {
  return String(
    post.storefrontSlug ||
      post.linkedStorefrontSlug ||
      post.brandSlug ||
      post.publicSlug ||
      ""
  );
}

function campaignDestination(post: CommercialFeedCampaign) {
  const storefrontSlug = campaignStorefrontSlug(post);
  if (post.linkedProductId) {
    const productId = encodeURIComponent(String(post.linkedProductId));
    if (storefrontSlug) {
      return {
        cta: "View Product",
        href: `/store/${encodeURIComponent(storefrontSlug)}/products/${productId}`
      };
    }
    return { cta: "View Product", href: `/store?q=${productId}` };
  }
  if (post.linkedCourseId) {
    const courseId = encodeURIComponent(String(post.linkedCourseId));
    if (storefrontSlug) {
      return {
        cta: "View Course",
        href: `/store/${encodeURIComponent(storefrontSlug)}/courses/${courseId}`
      };
    }
    return {
      cta: "View Course",
      href: `/courses?courseId=${courseId}`
    };
  }
  if (post.linkedLiveId) {
    return {
      cta: "View Live",
      href: `/live-session?sessionId=${encodeURIComponent(String(post.linkedLiveId))}`
    };
  }
  if (post.linkedProductLineId) {
    const lineId = encodeURIComponent(String(post.linkedProductLineId));
    if (storefrontSlug) {
      return {
        cta: "View Product Line",
        href: `/store/${encodeURIComponent(storefrontSlug)}?line=${lineId}`
      };
    }
    return {
      cta: "View Product Line",
      href: `/store?line=${lineId}`
    };
  }
  if (storefrontSlug) {
    return {
      cta: "Visit Storefront",
      href: `/store/${encodeURIComponent(storefrontSlug)}`
    };
  }
  if (post.linkedForumThreadId) {
    return {
      cta: "Open Forum Q&A",
      href: `/forum/post/${encodeURIComponent(String(post.linkedForumThreadId))}`
    };
  }
  const externalLink = post.externalLinks?.find((link) => String(link?.url || "").trim());
  if (externalLink) {
    return { cta: externalLink.label || "Learn More", href: String(externalLink.url) };
  }
  return { cta: "Learn More", href: "/feed" };
}

function campaignImage(post: CommercialFeedCampaign) {
  return post.bannerImageUrl || post.creativeImageUrl || post.imageUrl || "";
}

function mapCampaignToAd(post: CommercialFeedCampaign): AdItem {
  const destination = campaignDestination(post);
  const owner =
    post.author?.displayName ||
    (post.authorType === "facility" || post.workspaceType === "facility"
      ? "Facility outreach"
      : "Commercial campaign");
  return {
    title: post.title || owner,
    body: post.body || "Promoted outreach from a GrowPath account.",
    cta: destination.cta,
    href: destination.href,
    storefrontSlug: campaignStorefrontSlug(post),
    createdAt: post.createdAt || new Date(0).toISOString(),
    engagementCount: Number((post as any).engagementCount ?? post.likeCount ?? 0),
    clickCount: Number((post as any).clickCount || 0),
    promotionCount: Number((post as any).promotionCount || 0),
    imageUrl: campaignImage(post)
  };
}

const EDUCATION_ITEMS = [
  {
    title: "Triple Bag: clones in production",
    body: "Follow how production clones are selected, stabilized, and tracked before release.",
    cta: "Open update",
    href: "/store/triple-bag-genetics"
  },
  {
    title: "Triple Bag: terpene target notes",
    body: "How breeders think about myrcene, limonene, pinene, esters, thiols, and flavor goals.",
    cta: "Open notes",
    href: "/store/triple-bag-genetics"
  },
  {
    title: "Triple Bag: phenotype chemistry",
    body: "A practical look at traits that may shape blank flavor profiles across a line.",
    cta: "Read breakdown",
    href: "/store/triple-bag-genetics"
  }
];

const AD_ITEMS = [
  {
    title: "Living Soil Labs: full-spectrum soil",
    body: "Living soil and nutrient lines for gardeners across every grow interest.",
    cta: "View soil line",
    href: "/store/living-soil-labs",
    storefrontSlug: "living-soil-labs",
    createdAt: "2026-07-05T10:00:00.000Z",
    engagementCount: 81,
    clickCount: 34,
    promotionCount: 8,
    imageUrl:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Living Soil Labs: nutrient program",
    body: "Build a simple feeding plan around biology, mineral balance, and clean inputs.",
    cta: "Explore nutrients",
    href: "/store/living-soil-labs",
    storefrontSlug: "living-soil-labs",
    createdAt: "2026-07-03T09:30:00.000Z",
    engagementCount: 132,
    clickCount: 62,
    promotionCount: 13,
    imageUrl:
      "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Living Soil Labs: starter kits",
    body: "Starter packs for small indoor gardens, raised beds, and production benches.",
    cta: "Shop now",
    href: "/store/living-soil-labs",
    storefrontSlug: "living-soil-labs",
    createdAt: "2026-06-29T14:15:00.000Z",
    engagementCount: 57,
    clickCount: 11,
    promotionCount: 4,
    imageUrl:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Living Soil Labs: terpene-minded inputs",
    body: "Biology-first amendments for growers chasing aroma, vigor, and resilient roots.",
    cta: "Compare kits",
    href: "/store/living-soil-labs",
    storefrontSlug: "living-soil-labs",
    createdAt: "2026-07-04T16:45:00.000Z",
    engagementCount: 74,
    clickCount: 8,
    promotionCount: 2,
    imageUrl:
      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80"
  }
] satisfies AdItem[];

const FACILITY_AD_ITEMS = [
  {
    title: "Living Soil Labs: production soil programs",
    body: "Soil and nutrient planning for commercial benches, mothers, and production rooms.",
    cta: "Visit Storefront",
    href: "/store/living-soil-labs",
    storefrontSlug: "living-soil-labs",
    createdAt: "2026-07-05T12:00:00.000Z",
    engagementCount: 44,
    clickCount: 19,
    promotionCount: 6,
    imageUrl:
      "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Living Soil Labs: bulk amendments",
    body: "Biology-forward inputs and amendment programs for repeatable production cycles.",
    cta: "Open store",
    href: "/store/living-soil-labs",
    storefrontSlug: "living-soil-labs",
    createdAt: "2026-07-01T08:00:00.000Z",
    engagementCount: 67,
    clickCount: 9,
    promotionCount: 3,
    imageUrl:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Living Soil Labs: nutrient line support",
    body: "Commercial nutrient line context for teams standardizing soil and feed decisions.",
    cta: "Compare lines",
    href: "/store/living-soil-labs",
    storefrontSlug: "living-soil-labs",
    createdAt: "2026-07-04T11:00:00.000Z",
    engagementCount: 36,
    clickCount: 5,
    promotionCount: 1,
    imageUrl:
      "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=900&q=80"
  }
] satisfies AdItem[];

const PLACEMENT_OFFSET = { top: 0, middle: 1, bottom: 2 };

function rotate<T>(items: T[], offset: number) {
  if (!items.length) return items;
  const start = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function selectAds(ads: AdItem[], count: number, placement: FeedRailProps["placement"]) {
  const placementOffset = PLACEMENT_OFFSET[placement || "top"] || 0;
  const strategies = [
    {
      label: "New",
      rows: [...ads].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    },
    {
      label: "Popular",
      rows: [...ads].sort((a, b) => b.engagementCount - a.engagementCount)
    },
    {
      label: "Recommended",
      rows: [...ads].sort((a, b) => a.clickCount - b.clickCount)
    },
    {
      label: "Fresh",
      rows: [...ads].sort((a, b) => a.promotionCount - b.promotionCount)
    }
  ];
  const selected: Array<AdItem & { strategyLabel: string }> = [];
  const usedTitles = new Set<string>();

  for (let index = 0; index < count; index += 1) {
    const strategy = strategies[(index + placementOffset) % strategies.length];
    const rows = rotate(strategy.rows, index);
    const item = rows.find((row) => !usedTitles.has(row.title)) || rows[0];
    if (item) {
      selected.push({ ...item, strategyLabel: strategy.label });
      if (ads.length >= count) usedTitles.add(item.title);
    }
  }

  return selected;
}

export default function FeedRail({
  slots,
  mode,
  railMode = "standard",
  placement = "top"
}: FeedRailProps) {
  const [campaignAds, setCampaignAds] = useState<AdItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    listCommercialFeedCampaigns({ limit: Math.max(slots * 3, 6), sort: "new" })
      .then((res) => {
        if (cancelled) return;
        const nextAds = res.items.map(mapCampaignToAd).filter((item) => item.title);
        if (nextAds.length) setCampaignAds(nextAds);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [slots]);

  if (!slots || slots <= 0) return null;

  const fallbackAds =
    mode === "facility" || mode === "commercial" ? FACILITY_AD_ITEMS : AD_ITEMS;
  const ads = campaignAds.length ? campaignAds : fallbackAds;
  const adSlotCount =
    railMode === "promo-only"
      ? slots
      : railMode === "education-only"
        ? 0
        : Math.floor(slots / 2);
  const selectedAds = selectAds(ads, adSlotCount || slots, placement);
  let adIndex = 0;

  return (
    <View style={styles.container}>
      {Array.from({ length: slots }).map((_, index) => {
        const isEducation = index % 2 === 0;
        const educationItem = EDUCATION_ITEMS[index % EDUCATION_ITEMS.length];
        const adItem = selectedAds[adIndex % selectedAds.length];

        if (railMode === "education-only") {
          return (
            <EducationPostCard
              key={`education-${index}`}
              title={educationItem.title}
              body={educationItem.body}
              cta={educationItem.cta}
              href={educationItem.href}
            />
          );
        }

        if (railMode === "promo-only") {
          adIndex += 1;
          return (
            <AdCard
              key={`ad-${index}`}
              title={adItem.title}
              body={adItem.body}
              cta={adItem.cta}
              href={adItem.href}
              storefrontSlug={adItem.storefrontSlug}
              imageUrl={adItem.imageUrl}
              strategyLabel={adItem.strategyLabel}
            />
          );
        }

        if (isEducation) {
          return (
            <EducationPostCard
              key={`education-${index}`}
              title={educationItem.title}
              body={educationItem.body}
              cta={educationItem.cta}
              href={educationItem.href}
            />
          );
        }
        adIndex += 1;
        return (
          <AdCard
            key={`ad-${index}`}
            title={adItem.title}
            body={adItem.body}
            cta={adItem.cta}
            href={adItem.href}
            storefrontSlug={adItem.storefrontSlug}
            imageUrl={adItem.imageUrl}
            strategyLabel={adItem.strategyLabel}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12
  }
});
