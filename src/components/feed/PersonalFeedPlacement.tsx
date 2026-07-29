import React from "react";

import FeedBanner from "@/components/feed/FeedBanner";
import { useEntitlements } from "@/entitlements";
import * as AuthContext from "@/auth/AuthContext";
import { flattenGrowInterests } from "@/utils/growInterests";
import { FeedBannerPlacement, getFeedBannerPolicy } from "@/utils/feedPolicy";

type PersonalFeedPlacementProps = {
  placement: FeedBannerPlacement;
  routeKey?: string;
  longContent?: boolean;
  compact?: boolean;
};

const useFeedAuth = AuthContext.useOptionalAuth || AuthContext.useAuth;

export default function PersonalFeedPlacement({
  placement,
  routeKey,
  longContent = false,
  compact = false
}: PersonalFeedPlacementProps) {
  const entitlements = useEntitlements();
  const auth = useFeedAuth();
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
      compact={compact}
    />
  );
}
