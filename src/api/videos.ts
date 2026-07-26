import { apiRequest, uploadBinaryToSignedUrl } from "@/api/apiRequest";
import type { LessonMediaSource } from "@/features/learning/lessonMedia";
import { Platform } from "react-native";

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
  playbackUrl?: string;
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

export type SelectedVideoFile = {
  uri: string;
  file?: Blob;
  fileName?: string | null;
  name?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

export type CompletedVideoUpload = {
  assetId: string;
  url: string;
  bytes: number;
  mimeType: string;
};

type UploadWorkspace = {
  workspaceType: VideoWorkspaceType;
  workspaceId?: string;
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

export async function getVideoPlayback(
  id: string,
  workspaceType?: VideoWorkspaceType,
  workspaceId?: string
) {
  const result: any = await apiRequest(`/api/videos/${encodeURIComponent(id)}/playback`, {
    params: { workspaceType, workspaceId },
    invalidateOn401: false
  });
  return {
    playbackUrl: String(result?.playbackUrl || ""),
    expiresInSeconds: Number(result?.expiresInSeconds || 0)
  };
}

async function selectedFileBytes(file: SelectedVideoFile) {
  const reported = Number(file.fileSize || file.file?.size || 0);
  if (Number.isFinite(reported) && reported > 0) return Math.floor(reported);
  if (Platform.OS !== "web" && file.uri) {
    const FileSystem = await import("expo-file-system/legacy");
    const info = await FileSystem.getInfoAsync(file.uri);
    const size = info.exists ? Number(info.size || 0) : 0;
    if (Number.isFinite(size) && size > 0) return Math.floor(size);
  }
  throw new Error("GrowPath could not read the selected video's file size.");
}

function selectedFileName(file: SelectedVideoFile) {
  const fallback = String(file.uri || "")
    .split(/[\\/]/)
    .pop();
  return String(file.fileName || file.name || fallback || "video").slice(-160);
}

export async function abortVideoUpload(assetId: string, workspace: UploadWorkspace) {
  return apiRequest(`/api/videos/uploads/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
    body: workspace
  });
}

export async function uploadVideoFile(
  file: SelectedVideoFile,
  workspace: UploadWorkspace,
  onProgress: (fraction: number) => void = () => undefined
): Promise<CompletedVideoUpload> {
  const bytes = await selectedFileBytes(file);
  const mimeType = String(file.mimeType || "video/mp4").toLowerCase();
  const supportsMultipart =
    Platform.OS === "web" && Boolean(file.file && typeof file.file.slice === "function");
  const initiated: any = await apiRequest("/api/videos/uploads/initiate", {
    method: "POST",
    body: {
      fileName: selectedFileName(file),
      mimeType,
      bytes,
      supportsMultipart,
      ...workspace
    }
  });
  const assetId = String(initiated?.assetId || "");
  if (!assetId || !initiated?.upload?.strategy) {
    throw new Error("GrowPath did not return a valid protected upload reservation.");
  }
  try {
    let parts: Array<{ partNumber: number; etag: string }> = [];
    if (initiated.upload.strategy === "single") {
      await uploadBinaryToSignedUrl({
        url: String(initiated.upload.url || ""),
        uri: file.uri,
        body: file.file,
        mimeType,
        onProgress
      });
    } else {
      if (!file.file) {
        throw new Error("Large multipart uploads are available in the web app.");
      }
      const totalParts = Number(initiated.upload.totalParts || 0);
      const partSizeBytes = Number(initiated.upload.partSizeBytes || 0);
      if (!totalParts || !partSizeBytes || totalParts > 10000) {
        throw new Error("GrowPath returned an invalid multipart upload plan.");
      }
      parts = new Array(totalParts);
      const loadedByPart = new Array(totalParts).fill(0);
      let nextPartIndex = 0;
      const uploadPart = async () => {
        while (nextPartIndex < totalParts) {
          const index = nextPartIndex;
          nextPartIndex += 1;
          const partNumber = index + 1;
          const start = index * partSizeBytes;
          const end = Math.min(bytes, start + partSizeBytes);
          const body = file.file!.slice(start, end, mimeType);
          const signed: any = await apiRequest(
            `/api/videos/uploads/${encodeURIComponent(assetId)}/part-url`,
            {
              method: "POST",
              body: { ...workspace, partNumber }
            }
          );
          const uploaded = await uploadBinaryToSignedUrl({
            url: String(signed?.url || ""),
            uri: file.uri,
            body,
            mimeType,
            onProgress: (fraction) => {
              loadedByPart[index] = body.size * fraction;
              onProgress(
                Math.min(
                  1,
                  loadedByPart.reduce((total, loaded) => total + loaded, 0) / bytes
                )
              );
            }
          });
          if (!uploaded.etag) {
            throw new Error(
              "Protected storage did not confirm a video part. Check R2 CORS ETag exposure."
            );
          }
          parts[index] = { partNumber, etag: uploaded.etag };
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(3, totalParts) }, () => uploadPart())
      );
    }
    const completed: any = await apiRequest(
      `/api/videos/uploads/${encodeURIComponent(assetId)}/complete`,
      {
        method: "POST",
        body: { ...workspace, parts }
      }
    );
    onProgress(1);
    return {
      assetId,
      url: String(completed?.url || initiated.url || ""),
      bytes: Number(completed?.bytes || bytes),
      mimeType: String(completed?.mimeType || mimeType)
    };
  } catch (error) {
    await abortVideoUpload(assetId, workspace).catch(() => undefined);
    throw error;
  }
}

export async function createVideo(input: VideoInput) {
  const result: any = await apiRequest("/api/videos", {
    method: "POST",
    body: input
  });
  return {
    video: (result?.video ?? result) as GrowPathVideo,
    quota: result?.quota as VideoQuota | undefined,
    storageCleanupWarning: String(result?.storageCleanupWarning || "")
  };
}

export async function updateVideo(id: string, input: Partial<VideoInput>) {
  const result: any = await apiRequest(`/api/videos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input
  });
  return {
    video: (result?.video ?? result) as GrowPathVideo,
    quota: result?.quota as VideoQuota | undefined,
    storageCleanupWarning: String(result?.storageCleanupWarning || "")
  };
}

export async function deleteVideo(
  id: string,
  workspaceType?: VideoWorkspaceType,
  workspaceId?: string
) {
  return apiRequest(`/api/videos/${encodeURIComponent(id)}`, {
    method: "DELETE",
    params: { workspaceType, workspaceId }
  });
}
