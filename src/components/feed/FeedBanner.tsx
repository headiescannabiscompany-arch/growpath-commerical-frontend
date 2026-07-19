import React from "react";
import { StyleSheet, Text, View } from "react-native";

import FeedRail from "@/components/feed/FeedRail";
import { FREE_POLICY } from "@/config/freePolicy";
import { radius } from "@/theme/theme";
import type { FeedBannerPlacement, FeedRailMode } from "@/utils/feedPolicy";

type FeedBannerProps = {
  placement: FeedBannerPlacement;
  slots?: number;
  mode?: string | null;
  plan?: string | null;
  railMode?: FeedRailMode;
  routeKey?: string;
  growInterests?: string[];
};

const LABELS: Record<FeedBannerPlacement, string> = {
  top: "Promoted campaigns",
  middle: "More promoted campaigns",
  bottom: "Recommended campaigns"
};

export default function FeedBanner({
  placement,
  slots = 1,
  mode,
  plan,
  railMode = "standard",
  routeKey,
  growInterests
}: FeedBannerProps) {
  if (!slots || slots <= 0) return null;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${LABELS[placement]} placement`}
      style={styles.banner}
    >
      <Text style={styles.label}>{LABELS[placement]}</Text>
      {plan === "free" && placement === "top" ? (
        <Text style={styles.upgradeCopy}>
          Want to see fewer ads? Paid accounts get at least{" "}
          {FREE_POLICY.paidAdReductionPercentMinimum}% fewer ads.
        </Text>
      ) : null}
      <FeedRail
        slots={slots}
        mode={mode}
        plan={plan}
        railMode={railMode}
        placement={placement}
        routeKey={routeKey}
        growInterests={growInterests}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderColor: "#D9E8D8",
    borderRadius: radius.card,
    backgroundColor: "#F7FBF5",
    padding: 12,
    gap: 10
  },
  label: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  upgradeCopy: { color: "#4B5563", fontSize: 13, lineHeight: 19 }
});
