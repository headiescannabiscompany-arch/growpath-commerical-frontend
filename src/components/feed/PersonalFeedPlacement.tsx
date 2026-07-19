import React from "react";

import FeedBanner from "@/components/feed/FeedBanner";
import { useEntitlements } from "@/entitlements";
import { useOptionalAuth } from "@/auth/AuthContext";
import { flattenGrowInterests } from "@/utils/growInterests";
import { FeedBannerPlacement, getFeedBannerPolicy } from "@/utils/feedPolicy";

type PersonalFeedPlacementProps = {
  placement: FeedBannerPlacement;
  routeKey?: string;
  longContent?: boolean;
};

export default function PersonalFeedPlacement({
  placement,
  routeKey,
  longContent = false
}: PersonalFeedPlacementProps) {
  const entitlements = useEntitlements();
  const auth = useOptionalAuth();
  const plan = entitlements.plan || "free";
  const policy = getFeedBannerPolicy({
    routeKey: routeKey || "personal",
    plan,
    mode: entitlements.mode,
    longContent
  });

  if (!policy[placement]) return null;

  return (
    <FeedBanner
      placement={placement}
      slots={policy.slotsByPlacement[placement]}
      mode={entitlements.mode}
      plan={plan}
      railMode={policy.railMode}
      routeKey={routeKey}
      growInterests={flattenGrowInterests(auth?.user?.growInterests || {})}
    />
  );
}
