export type FeedRailMode = "standard" | "education-only" | "promo-only";

export type FeedPolicy = {
  slots: number;
  includeForumHighlights: boolean;
  railMode: FeedRailMode;
  cadence: "always" | "everyOther";
};

type FeedPolicyInput = {
  routeKey?: string;
  routeName?: string;
  plan?: string | null;
  mode?: string | null;
};

function shouldIncludeEveryOther(routeKey: string) {
  let hash = 0;
  for (let i = 0; i < routeKey.length; i += 1) {
    hash = (hash * 31 + routeKey.charCodeAt(i)) % 1000;
  }
  return hash % 2 === 0;
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
      includeForumHighlights: mode !== "facility",
      railMode: mode === "facility" ? "education-only" : "standard",
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
