import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  Text,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { recordCommercialAnalyticsEvent } from "@/api/commercialAnalytics";
import { fetchPublicStorefront } from "@/api/storefront";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

type AdCardProps = {
  title: string;
  body: string;
  cta: string;
  href?: string;
  commercialAccountId?: string;
  storefrontSlug?: string;
  imageUrl?: string | null;
  strategyLabel?: string;
};

export default function AdCard({
  title,
  body,
  cta,
  href = "/store",
  commercialAccountId,
  storefrontSlug,
  imageUrl,
  strategyLabel
}: AdCardProps) {
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const { width } = useWindowDimensions();
  const compactMedia = width >= 760;
  const resolvedImageUrl = resolveImageUri(profileImageUrl || imageUrl);

  useEffect(() => {
    let active = true;
    if (!storefrontSlug) return;
    fetchPublicStorefront(storefrontSlug)
      .then((response: any) => {
        if (!active) return;
        const storefront =
          response?.storefront ??
          response?.data?.storefront ??
          response?.data ??
          response;
        const nextImage = String(
          storefront?.bannerUrl ||
            storefront?.logoUrl ||
            storefront?.imageUrl ||
            storefront?.profileImageUrl ||
            ""
        ).trim();
        setProfileImageUrl(nextImage);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [storefrontSlug]);

  function recordAdClick() {
    recordCommercialAnalyticsEvent({
      eventType: "ad_click",
      objectType: "feed_ad",
      commercialAccountId,
      storefrontSlug,
      targetUrl: href,
      source: "feed_banner",
      metadata: { title, cta, strategyLabel, hasImage: Boolean(resolvedImageUrl) }
    }).catch(() => null);
  }

  function openAd() {
    recordAdClick();
    const location = (globalThis as any)?.window?.location;
    if (location) location.href = href;
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${cta} for ${title}`}
      onPress={openAd}
      style={[styles.card, compactMedia && resolvedImageUrl ? styles.cardDesktop : null]}
    >
      {resolvedImageUrl ? (
        <View style={[styles.mediaFrame, compactMedia ? styles.mediaDesktop : null]}>
          <Image
            source={{ uri: resolvedImageUrl }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={`${title} ad image`}
          />
        </View>
      ) : null}
      <View style={styles.copy}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Promoted campaign</Text>
          {strategyLabel ? <Text style={styles.strategy}>{strategyLabel}</Text> : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.link}>
          {cta} {"\u2192"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18
  },
  cardDesktop: {
    alignItems: "center",
    flexDirection: "row"
  },
  copy: {
    flex: 1,
    minWidth: 0
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C"
  },
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6
  },
  strategy: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700"
  },
  mediaFrame: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.card,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#F1F5F9"
  },
  mediaDesktop: {
    width: 168,
    aspectRatio: 4 / 3,
    marginBottom: 0
  },
  image: {
    width: "100%",
    height: "100%"
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6
  },
  body: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 10
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EA580C"
  }
});
