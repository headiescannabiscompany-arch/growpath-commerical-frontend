import React from "react";
import { StyleSheet, Text, View } from "react-native";

import FeedRail from "@/components/feed/FeedRail";
import { FREE_POLICY } from "@/config/freePolicy";
import { useAppTheme } from "@/theme/appTheme";
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
  compact?: boolean;
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
  growInterests,
  compact = false
}: FeedBannerProps) {
  const { palette } = useAppTheme();
  if (!slots || slots <= 0) return null;

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${LABELS[placement]} placement`}
      style={[
        styles.banner,
        {
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.border
        },
        compact ? styles.bannerCompact : null
      ]}
    >
      <Text style={[styles.label, { color: palette.accent }]}>{LABELS[placement]}</Text>
      {plan === "free" && placement === "top" ? (
        <Text style={[styles.upgradeCopy, { color: palette.textMuted }]}>
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
        compact={compact}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 12,
    gap: 10
  },
  bannerCompact: {
    padding: 9,
    gap: 7
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  upgradeCopy: { fontSize: 13, lineHeight: 19 }
});
