import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import AppCard from "@/components/layout/AppCard";
import { recordCommercialAnalyticsEvent } from "@/api/commercialAnalytics";

type AdCardProps = {
  title: string;
  body: string;
  cta: string;
  href?: string;
  commercialAccountId?: string;
  storefrontSlug?: string;
};

export default function AdCard({
  title,
  body,
  cta,
  href = "/store",
  commercialAccountId,
  storefrontSlug
}: AdCardProps) {
  function recordAdClick() {
    recordCommercialAnalyticsEvent({
      eventType: "ad_click",
      objectType: "feed_ad",
      commercialAccountId,
      storefrontSlug,
      targetUrl: href,
      source: "feed_banner",
      metadata: { title, cta }
    }).catch(() => null);
  }

  function openAd() {
    recordAdClick();
    const location = (globalThis as any)?.window?.location;
    if (location) location.href = href;
  }

  return (
    <AppCard>
      <Text style={styles.label}>Sponsor</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${cta} for ${title}`}
        onPress={openAd}
      >
        <Text style={styles.link}>{cta} {"\u2192"}</Text>
      </Pressable>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
    marginBottom: 6
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
