import { apiRequest } from "./apiRequest";

export type Campaign = {
  id: string;
  name: string;
  status?: "draft" | "active" | "paused" | "ended";
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchCampaigns(): Promise<Campaign[]> {
  return apiRequest(`/commercial/campaigns`);
}

export async function createCampaign(data: Partial<Campaign>) {
  return apiRequest(`/commercial/campaigns`, { method: "POST", body: data });
}

export async function updateCampaign(campaignId: string, data: Partial<Campaign>) {
  return apiRequest(`/commercial/campaigns/${campaignId}`, {
    method: "PATCH",
    body: data
  });
}

export async function deleteCampaign(campaignId: string) {
  return apiRequest(`/commercial/campaigns/${campaignId}`, { method: "DELETE" });
}
