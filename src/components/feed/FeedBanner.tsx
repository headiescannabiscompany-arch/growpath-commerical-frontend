import React from "react";
import { StyleSheet, Text, View } from "react-native";

import FeedRail from "@/components/feed/FeedRail";
import type { FeedBannerPlacement, FeedRailMode } from "@/utils/feedPolicy";

type FeedBannerProps = {
  placement: FeedBannerPlacement;
  slots?: number;
  mode?: string | null;
  plan?: string | null;
  railMode?: FeedRailMode;
};

const LABELS: Record<FeedBannerPlacement, string> = {
  top: "GrowPath feed",
  middle: "More from the feed",
  bottom: "From the feed"
};

export default function FeedBanner({
  placement,
  slots = 1,
  mode,
  plan,
  railMode = "standard"
}: FeedBannerProps) {
  if (!slots || slots <= 0) return null;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${LABELS[placement]} placement`}
      style={styles.banner}
    >
      <Text style={styles.label}>{LABELS[placement]}</Text>
      <FeedRail
        slots={slots}
        mode={mode}
        plan={plan}
        railMode={railMode}
        placement={placement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderColor: "#D9E8D8",
    borderRadius: 8,
    backgroundColor: "#F7FBF5",
    padding: 12,
    gap: 10
  },
  label: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  }
});
