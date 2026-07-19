import { apiRequest } from "./apiRequest";

const CAMPAIGNS_BASE = "/api/commercial/campaigns";

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  objective?:
    | "awareness"
    | "reach"
    | "engagement"
    | "conversions"
    | "traffic"
    | "content_plan";
  platform?: "instagram" | "tiktok" | "twitter" | "youtube" | "multi";
  status?: "draft" | "scheduled" | "active" | "paused" | "ended";
  total?: number;
  spent?: number;
  clicks?: number;
  clickCount?: number;
  linkClicks?: number;
  adClicks?: number;
  impressions?: number;
  launchDate?: string;
  reminderPreference?: string;
  recurrenceRule?: string;
  targetUrl?: string;
  externalUrl?: string;
  imageUrl?: string;
  creativeImageUrl?: string;
  bannerImageUrl?: string;
  storefrontSlug?: string;
  linkedStorefrontSlug?: string;
  brandSlug?: string;
  publicSlug?: string;
  linkedProductId?: string;
  linkedProductLineId?: string;
  linkedCourseId?: string;
  linkedTrialId?: string;
  linkedGrowId?: string;
  linkedForumThreadId?: string;
  platformNotes?: string;
  budget?: {
    totalBudget?: number;
    dailyBudget?: number;
    spent?: number;
    remaining?: number;
  };
  metrics?: {
    clickCount?: number;
    [key: string]: any;
  };
  creative?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await apiRequest(CAMPAIGNS_BASE);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.campaigns)) return res.campaigns;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.campaigns)) return res.data.campaigns;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}

export async function createCampaign(data: Partial<Campaign>) {
  return apiRequest(CAMPAIGNS_BASE, { method: "POST", body: data });
}

export async function updateCampaign(campaignId: string, data: Partial<Campaign>) {
  return apiRequest(`${CAMPAIGNS_BASE}/${encodeURIComponent(campaignId)}`, {
    method: "PATCH",
    body: data
  });
}

export async function deleteCampaign(campaignId: string) {
  return apiRequest(`${CAMPAIGNS_BASE}/${encodeURIComponent(campaignId)}`, {
    method: "DELETE"
  });
}

export async function recordCampaignClick(
  campaignId: string,
  data?: { targetUrl?: string; source?: string }
) {
  return apiRequest(`${CAMPAIGNS_BASE}/${encodeURIComponent(campaignId)}/click`, {
    method: "POST",
    body: data || {}
  });
}
