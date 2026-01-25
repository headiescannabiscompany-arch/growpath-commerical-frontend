import { api } from "./client";

export type Campaign = {
  id: string;
  name: string;
  status?: "draft" | "active" | "paused" | "ended";
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchCampaigns(): Promise<Campaign[]> {
  return api.get(`/commercial/campaigns`);
}

export async function createCampaign(data: Partial<Campaign>) {
  return api.post(`/commercial/campaigns`, data);
}

export async function updateCampaign(campaignId: string, data: Partial<Campaign>) {
  return api.patch(`/commercial/campaigns/${campaignId}`, data);
}

export async function deleteCampaign(campaignId: string) {
  return api.del(`/commercial/campaigns/${campaignId}`);
}
