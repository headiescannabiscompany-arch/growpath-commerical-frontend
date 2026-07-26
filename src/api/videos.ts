import { apiRequest } from "@/api/apiRequest";
import type { LessonMediaSource } from "@/features/learning/lessonMedia";

export type VideoWorkspaceType = "personal" | "commercial" | "facility";
export type VideoVisibility =
  | "public"
  | "followers"
  | "unlisted"
  | "private"
  | "course_only"
  | "facility_internal";
export type VideoStatus = "draft" | "published" | "archived";

export type GrowPathVideo = {
  id: string;
  title: string;
  description: string;
  status: VideoStatus;
  visibility: VideoVisibility;
  workspaceType: VideoWorkspaceType;
  workspaceId?: string;
  owner: {
    id: string;
    displayName: string;
    workspaceType: VideoWorkspaceType;
  };
  uploaderUserId?: string;
  mediaSource: LessonMediaSource;
  thumbnailUrl: string;
  durationSeconds: number;
  storageBytes?: number;
  mimeType?: string;
  tags: string[];
  growInterests: string[];
  cannabisSpecific: boolean;
  transcriptText?: string;
  captionsText?: string;
  metrics?: { viewCount?: number; engagementCount?: number };
  storageDeletionStatus?: string;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type VideoQuota = {
  plan: string;
  limitBytes: number;
  usedBytes: number;
  remainingBytes: number;
  externalSourcesConsumeStorage: boolean;
  growPathUploadsConsumeStorage: boolean;
};

export type VideoPermissions = {
  canUpload: boolean;
  canPublish: boolean;
  canManage: boolean;
};

export type VideoLibraryResponse = {
  videos: GrowPathVideo[];
  quota: VideoQuota;
  permissions: VideoPermissions;
};

export type VideoInput = {
  title: string;
  description?: string;
  status?: VideoStatus;
  visibility?: VideoVisibility;
  workspaceType?: VideoWorkspaceType;
  workspaceId?: string;
  mediaSource: LessonMediaSource;
  thumbnailUrl?: string;
  durationSeconds?: number;
  storageBytes?: number;
  mimeType?: string;
  tags?: string[];
  growInterests?: string[];
  cannabisSpecific?: boolean;
  transcriptText?: string;
  captionsText?: string;
};

function videoRows(value: any): GrowPathVideo[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.videos)) return value.videos;
  if (Array.isArray(value?.data?.videos)) return value.data.videos;
  return [];
}

export async function searchVideos(
  params: {
    q?: string;
    sort?: "new" | "popular";
    limit?: number;
    followingOnly?: boolean;
  } = {}
): Promise<GrowPathVideo[]> {
  const result = await apiRequest("/api/videos/discover", {
    params,
    invalidateOn401: false
  });
  return videoRows(result);
}

export async function listVideoLibrary(
  workspaceType?: VideoWorkspaceType,
  workspaceId?: string
): Promise<VideoLibraryResponse> {
  const result: any = await apiRequest("/api/videos", {
    params: {
      workspaceType: workspaceType || undefined,
      workspaceId: workspaceId || undefined
    }
  });
  return {
    videos: videoRows(result),
    quota: result?.quota,
    permissions: result?.permissions || {
      canUpload: false,
      canPublish: false,
      canManage: false
    }
  };
}

export async function getVideo(id: string): Promise<GrowPathVideo> {
  const result: any = await apiRequest(`/api/videos/${encodeURIComponent(id)}`, {
    invalidateOn401: false
  });
  return result?.video ?? result;
}

export async function createVideo(input: VideoInput) {
  const result: any = await apiRequest("/api/videos", {
    method: "POST",
    body: input
  });
  return {
    video: (result?.video ?? result) as GrowPathVideo,
    quota: result?.quota as VideoQuota | undefined
  };
}

export async function updateVideo(id: string, input: Partial<VideoInput>) {
  const result: any = await apiRequest(`/api/videos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input
  });
  return {
    video: (result?.video ?? result) as GrowPathVideo,
    quota: result?.quota as VideoQuota | undefined
  };
}

export async function deleteVideo(id: string) {
  return apiRequest(`/api/videos/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
