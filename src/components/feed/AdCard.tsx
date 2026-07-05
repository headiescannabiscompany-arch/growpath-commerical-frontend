import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, StyleSheet, View } from "react-native";
import AppCard from "@/components/layout/AppCard";
import { recordCommercialAnalyticsEvent } from "@/api/commercialAnalytics";
import { fetchPublicStorefront } from "@/api/storefront";
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
    <AppCard>
      {resolvedImageUrl ? (
        <Image
          source={{ uri: resolvedImageUrl }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={`${title} ad image`}
        />
      ) : null}
      <View style={styles.labelRow}>
        <Text style={styles.label}>Sponsor</Text>
        {strategyLabel ? <Text style={styles.strategy}>{strategyLabel}</Text> : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${cta} for ${title}`}
        onPress={openAd}
      >
        <Text style={styles.link}>
          {cta} {"\u2192"}
        </Text>
      </Pressable>
    </AppCard>
  );
}

const styles = StyleSheet.create({
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
  image: {
    width: "100%",
    aspectRatio: 16 / 7,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#F1F5F9"
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
