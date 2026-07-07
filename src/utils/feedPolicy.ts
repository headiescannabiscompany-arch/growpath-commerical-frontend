export type FeedRailMode = "standard" | "education-only" | "promo-only";

export type FeedPolicy = {
  slots: number;
  includeForumHighlights: boolean;
  railMode: FeedRailMode;
  cadence: "always" | "everyOther";
};

export type FeedBannerPlacement = "top" | "middle" | "bottom";

export type FeedBannerPolicy = {
  top: boolean;
  middle: boolean;
  bottom: boolean;
  slotsByPlacement: Record<FeedBannerPlacement, number>;
  railMode: FeedRailMode;
};

type FeedPolicyInput = {
  routeKey?: string;
  routeName?: string;
  plan?: string | null;
  mode?: string | null;
  longContent?: boolean;
};

function shouldIncludeEveryOther(routeKey: string) {
  let hash = 0;
  for (let i = 0; i < routeKey.length; i += 1) {
    hash = (hash * 31 + routeKey.charCodeAt(i)) % 1000;
  }
  return hash % 2 === 0;
}

function emptyBannerPolicy(railMode: FeedRailMode): FeedBannerPolicy {
  return {
    top: false,
    middle: false,
    bottom: false,
    slotsByPlacement: {
      top: 0,
      middle: 0,
      bottom: 0
    },
    railMode
  };
}

export function getFeedPolicy({
  routeKey,
  routeName,
  plan,
  mode
}: FeedPolicyInput): FeedPolicy {
  const normalizedPlan = plan || "free";
  const isFree = normalizedPlan === "free";
  const key = routeKey || routeName || "shared";
  const isHome = key === "home";
  const isFacilityHome = key === "home_facility";
  const isFacilityOps = key === "facility_ops";

  if (isHome) {
    return {
      slots: 2,
      includeForumHighlights: false,
      railMode: "promo-only",
      cadence: "always"
    };
  }

  if (isFacilityHome) {
    return {
      slots: 1,
      includeForumHighlights: false,
      railMode: "education-only",
      cadence: "always"
    };
  }

  if (isFacilityOps) {
    return {
      slots: 1,
      includeForumHighlights: false,
      railMode: "education-only",
      cadence: "always"
    };
  }

  if (isFree) {
    return {
      slots: 0,
      includeForumHighlights: false,
      railMode: "standard",
      cadence: "always"
    };
  }

  const cadence = "everyOther" as const;
  const allowSlot = shouldIncludeEveryOther(key);

  return {
    slots: allowSlot ? 1 : 0,
    includeForumHighlights: false,
    railMode: mode === "facility" ? "education-only" : "standard",
    cadence
  };
}

export function getFeedBannerPolicy({
  routeKey,
  routeName,
  plan,
  mode,
  longContent = false
}: FeedPolicyInput): FeedBannerPolicy {
  const normalizedPlan = plan || "free";
  const isFree = normalizedPlan === "free";
  const key = routeKey || routeName || "shared";
  const isHome = key === "home";
  const railMode = "promo-only";

  if (isHome) {
    return {
      top: true,
      middle: true,
      bottom: true,
      slotsByPlacement: {
        top: 1,
        middle: 1,
        bottom: 1
      },
      railMode: "promo-only"
    };
  }

  if (isFree) {
    return {
      top: true,
      middle: longContent,
      bottom: true,
      slotsByPlacement: {
        top: 1,
        middle: longContent ? 1 : 0,
        bottom: 1
      },
      railMode
    };
  }

  return {
    top: true,
    middle: false,
    bottom: false,
    slotsByPlacement: {
      top: 1,
      middle: 0,
      bottom: 0
    },
    railMode
  };
}
