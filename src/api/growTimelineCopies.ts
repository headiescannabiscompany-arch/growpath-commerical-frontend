import { apiRequest } from "@/api/apiRequest";
import type { GrowWorkspace } from "@/features/grows/workspaceData";

export type GrowTimelinePublicEvent = {
  type: string;
  title: string;
  summary: string;
  timestamp: string;
  tags: string[];
};

export type GrowTimelinePublicPhoto = {
  url: string;
  label: string;
};

export type GrowTimelinePublicCopy = {
  id: string;
  token: string;
  workspaceType: GrowWorkspace;
  version: number;
  status: "published" | "withdrawn";
  title: string;
  description: string;
  dateRange: { start: string; end: string };
  events: GrowTimelinePublicEvent[];
  photos: GrowTimelinePublicPhoto[];
  cannabisSpecific: boolean;
  publishedAt: string;
  withdrawnAt?: string | null;
};

export type GrowTimelinePublicPreview = {
  title: string;
  description: string;
  dateRange: { start: string; end: string };
  events: GrowTimelinePublicEvent[];
  photoCount: number;
  cannabisSpecific: boolean;
};

export type GrowTimelinePublicCopyInput = {
  title: string;
  description?: string;
  eventIds: string[];
  photoUrls: string[];
  start?: string;
  end?: string;
};

function ownerPath(workspace: GrowWorkspace, growId: string) {
  return `/api/${workspace}/grows/${encodeURIComponent(growId)}/timeline/public-copy`;
}

function copyFromResponse(response: any): GrowTimelinePublicCopy | null {
  return response?.copy ?? response?.data?.copy ?? null;
}

export async function getCurrentGrowTimelineCopy(
  workspace: GrowWorkspace,
  growId: string
) {
  const response = await apiRequest(ownerPath(workspace, growId), {
    method: "GET",
    cache: "no-store"
  });
  return copyFromResponse(response);
}

export async function publishGrowTimelineCopy(
  workspace: GrowWorkspace,
  growId: string,
  input: GrowTimelinePublicCopyInput
) {
  const response = await apiRequest(ownerPath(workspace, growId), {
    method: "POST",
    body: input
  });
  return copyFromResponse(response);
}

export async function previewGrowTimelineCopy(
  workspace: GrowWorkspace,
  growId: string,
  input: GrowTimelinePublicCopyInput
) {
  const response: any = await apiRequest(`${ownerPath(workspace, growId)}/preview`, {
    method: "POST",
    body: input
  });
  return (response?.preview ??
    response?.data?.preview ??
    null) as GrowTimelinePublicPreview | null;
}

export async function withdrawGrowTimelineCopy(workspace: GrowWorkspace, growId: string) {
  const response = await apiRequest(ownerPath(workspace, growId), {
    method: "DELETE",
    body: { reason: "withdrawn_by_owner" }
  });
  return copyFromResponse(response);
}

export async function getPublicGrowTimelineCopy(token: string) {
  const response = await apiRequest(
    `/api/public/grow-timelines/${encodeURIComponent(token)}`,
    { method: "GET", cache: "no-store" }
  );
  return copyFromResponse(response);
}
