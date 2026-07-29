import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type CommercialAnalyticsBreakdownRow = {
  key: string;
  label: string;
  count: number;
  lastEventAt?: string | null;
  eventTypes?: string[];
};

export type CommercialAnalyticsBreakdowns = {
  ads?: CommercialAnalyticsBreakdownRow[];
  products?: CommercialAnalyticsBreakdownRow[];
  storefronts?: CommercialAnalyticsBreakdownRow[];
  links?: CommercialAnalyticsBreakdownRow[];
  sources?: CommercialAnalyticsBreakdownRow[];
  courses?: CommercialAnalyticsBreakdownRow[];
  lives?: CommercialAnalyticsBreakdownRow[];
  orders?: CommercialAnalyticsBreakdownRow[];
  growInterests?: CommercialAnalyticsBreakdownRow[];
};

export type CommercialAnalyticsOverview = {
  adClicks?: number;
  marketingClicks?: number;
  linkClicks?: number;
  productCheckoutClicks?: number;
  externalCheckoutLeads?: number;
  productViews?: number;
  storefrontViews?: number;
  brandProfileViews?: number;
  feedClicks?: number;
  courseStarts?: number;
  forumReplies?: number;
  activeTrials?: number;
  completedTrials?: number;
  feedImpressions?: number;
  feedConversions?: number;
  courseProductClicks?: number;
  liveViews?: number;
  liveWatchClicks?: number;
  liveRsvps?: number;
  orderCount?: number;
  orderRevenueCents?: number;
  orderRevenueByCurrency?: Record<string, number>;
  breakdowns?: CommercialAnalyticsBreakdowns;
};

export type CommercialAnalyticsEvent = {
  eventType: string;
  objectType?: string;
  objectId?: string;
  commercialAccountId?: string;
  storefrontSlug?: string;
  productId?: string;
  targetUrl?: string;
  source?: string;
  metadata?: Record<string, any>;
};

export async function fetchCommercialAnalyticsOverview(): Promise<CommercialAnalyticsOverview> {
  const res = await apiRequest(endpoints.commercial.analyticsOverview);
  return res?.overview ?? res?.analytics ?? res?.data?.overview ?? res?.data ?? res ?? {};
}

export async function recordCommercialAnalyticsEvent(data: CommercialAnalyticsEvent) {
  return apiRequest(endpoints.commercial.analyticsEvents, {
    method: "POST",
    body: data,
    auth: false,
    silent: true
  });
}
