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
  socialPreviewUrl?: string;
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

export type VideoComment = {
  id: string;
  videoId: string;
  parentCommentId: string | null;
  body: string;
  status: "visible" | "hidden" | "deleted";
  editedAt?: string | null;
  createdAt?: string;
  author: { id: string; displayName: string; avatarUrl: string };
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

type VideoUploadOptions = {
  signal?: AbortSignal;
  clientUploadKey: string;
  onReservation?: (reservation: { assetId: string; uploadStatus?: string }) => void;
};

const VIDEO_PART_UPLOAD_ATTEMPTS = 3;

function retryableVideoPartError(error: any) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || "").toUpperCase();
  if (code.includes("ABORT") || error?.name === "AbortError") return false;
  if (!status) return true;
  return status === 408 || status === 429 || status >= 500;
}

function waitForVideoPartRetry(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new Error("The upload was canceled.");
    error.name = "AbortError";
    return Promise.reject(error);
  }
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      const error = new Error("The upload was canceled.");
      error.name = "AbortError";
      reject(error);
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export function isTerminalVideoMetadataError(error: any) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || "").toUpperCase();
  if (
    code.includes("NETWORK") ||
    code === "TIMEOUT" ||
    code === "ABORTED" ||
    status >= 500
  ) {
    return false;
  }
  return [400, 413, 415, 422].includes(status);
}

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
    ownerId?: string;
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

export async function getVideoQuota(
  workspaceType?: VideoWorkspaceType,
  workspaceId?: string
): Promise<VideoQuota> {
  const result: any = await apiRequest("/api/videos/quota", {
    params: {
      workspaceType: workspaceType || undefined,
      workspaceId: workspaceId || undefined
    }
  });
  return result?.quota;
}

export async function getVideo(id: string): Promise<GrowPathVideo> {
  const result: any = await apiRequest(`/api/videos/${encodeURIComponent(id)}`, {
    invalidateOn401: false
  });
  return result?.video ?? result;
}

export async function listVideoComments(id: string): Promise<VideoComment[]> {
  const result: any = await apiRequest(`/api/videos/${encodeURIComponent(id)}/comments`, {
    invalidateOn401: false
  });
  return Array.isArray(result?.comments) ? result.comments : [];
}

export async function createVideoComment(
  id: string,
  body: string,
  parentCommentId?: string | null
): Promise<VideoComment> {
  const result: any = await apiRequest(`/api/videos/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    body: { body, parentCommentId: parentCommentId || undefined }
  });
  return result.comment;
}

export async function updateVideoComment(id: string, commentId: string, body: string) {
  const result: any = await apiRequest(
    `/api/videos/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`,
    { method: "PATCH", body: { body } }
  );
  return result.comment as VideoComment;
}

export async function deleteVideoComment(id: string, commentId: string, reason = "") {
  return apiRequest(
    `/api/videos/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE", body: reason ? { reason } : undefined }
  );
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
  return String(
    file.fileName || file.name || (file.file as any)?.name || fallback || "video"
  ).slice(-160);
}

function selectedMimeType(file: SelectedVideoFile) {
  const explicit = String(file.mimeType || (file.file as any)?.type || "")
    .trim()
    .toLowerCase();
  if (explicit.startsWith("video/")) return explicit;

  const fileName = selectedFileName(file).toLowerCase();
  if (fileName.endsWith(".mov")) return "video/quicktime";
  if (fileName.endsWith(".m4v")) return "video/x-m4v";
  if (fileName.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

function protectedVideoUploadUrl(value: unknown) {
  const raw = String(value || "").trim();
  try {
    const parsed = new URL(raw);
    const localDevelopmentUrl =
      process.env.NODE_ENV !== "production" &&
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    if (parsed.protocol === "https:" || localDevelopmentUrl) return raw;
  } catch {
    // Use the actionable error below for absent, relative, or malformed signed URLs.
  }

  const error: any = new Error(
    "GrowPath could not prepare a secure video upload URL. Refresh the page, remove the failed video, and select it again."
  );
  error.code = "VIDEO_UPLOAD_URL_INVALID";
  throw error;
}

function unavailableVideoReservation(error: any) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || "").toUpperCase();
  if (status !== 404 && status !== 410 && !code.includes("NOT_FOUND")) return error;

  const unavailable: any = new Error(
    "This video upload is no longer available. Refresh the page, remove the failed video, and select it again."
  );
  unavailable.code = "VIDEO_UPLOAD_RESERVATION_EXPIRED";
  unavailable.status = status || 404;
  return unavailable;
}

export async function abortVideoUpload(
  assetId: string,
  workspace: UploadWorkspace,
  options: { signal?: AbortSignal; timeoutMs?: number; clientUploadKey?: string } = {}
) {
  return apiRequest(`/api/videos/uploads/${encodeURIComponent(assetId)}`, {
    method: "DELETE",
    signal: options.signal,
    timeoutMs: options.timeoutMs ?? 5000,
    body: {
      ...workspace,
      clientUploadKey: options.clientUploadKey || undefined
    }
  });
}

export async function uploadVideoFile(
  file: SelectedVideoFile,
  workspace: UploadWorkspace,
  onProgress: (fraction: number) => void = () => undefined,
  options: VideoUploadOptions
): Promise<CompletedVideoUpload> {
  const clientUploadKey = String(options?.clientUploadKey || "").trim();
  if (!clientUploadKey) throw new Error("A stable video upload key is required.");
  const bytes = await selectedFileBytes(file);
  const mimeType = selectedMimeType(file);
  const supportsMultipart =
    Platform.OS === "web" && Boolean(file.file && typeof file.file.slice === "function");
  let initiated: any;
  try {
    initiated = await apiRequest("/api/videos/uploads/initiate", {
      method: "POST",
      signal: options.signal,
      body: {
        fileName: selectedFileName(file),
        mimeType,
        bytes,
        supportsMultipart,
        clientUploadKey,
        ...workspace
      }
    });
  } catch (error) {
    throw unavailableVideoReservation(error);
  }
  const assetId = String(initiated?.assetId || "");
  if (!assetId) {
    throw new Error("GrowPath did not return a valid protected upload reservation.");
  }
  options.onReservation?.({
    assetId,
    uploadStatus: String(initiated?.uploadStatus || "pending")
  });
  if (initiated?.uploadStatus === "active") {
    onProgress(1);
    return {
      assetId,
      url: String(initiated?.url || ""),
      bytes: Number(initiated?.bytes || bytes),
      mimeType: String(initiated?.mimeType || mimeType)
    };
  }
  if (!initiated?.upload?.strategy) {
    throw new Error("GrowPath did not return a valid protected upload reservation.");
  }
  try {
    let parts: Array<{ partNumber: number; etag: string }> = [];
    if (initiated.upload.strategy === "single") {
      await uploadBinaryToSignedUrl({
        url: protectedVideoUploadUrl(initiated.upload.url),
        uri: file.uri,
        body: file.file,
        mimeType,
        signal: options.signal,
        onProgress
      });
    } else if (initiated.upload.strategy === "multipart") {
      const totalParts = Number(initiated.upload.totalParts || 0);
      const partSizeBytes = Number(initiated.upload.partSizeBytes || 0);
      if (!totalParts || !partSizeBytes || totalParts > 10000) {
        throw new Error("GrowPath returned an invalid multipart upload plan.");
      }
      const canSlice = Boolean(file.file && typeof file.file.slice === "function");
      if (totalParts > 1 && !canSlice) {
        throw new Error("Large multipart uploads are available in the web app.");
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
          const body = canSlice ? file.file!.slice(start, end, mimeType) : undefined;
          const partBytes = body?.size || bytes;
          for (let attempt = 1; attempt <= VIDEO_PART_UPLOAD_ATTEMPTS; attempt += 1) {
            try {
              // Fetch a fresh signed URL for every attempt. A failed or slow phone
              // upload may outlive the previous URL, especially on LTE.
              const signed: any = await apiRequest(
                `/api/videos/uploads/${encodeURIComponent(assetId)}/part-url`,
                {
                  method: "POST",
                  signal: options.signal,
                  body: { ...workspace, clientUploadKey, partNumber }
                }
              );
              const uploaded = await uploadBinaryToSignedUrl({
                url: protectedVideoUploadUrl(signed?.url),
                uri: file.uri,
                body,
                mimeType,
                signal: options.signal,
                onProgress: (fraction) => {
                  loadedByPart[index] = partBytes * fraction;
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
              break;
            } catch (error) {
              loadedByPart[index] = 0;
              onProgress(
                Math.min(
                  1,
                  loadedByPart.reduce((total, loaded) => total + loaded, 0) / bytes
                )
              );
              if (
                attempt >= VIDEO_PART_UPLOAD_ATTEMPTS ||
                !retryableVideoPartError(error)
              ) {
                throw error;
              }
              await waitForVideoPartRetry(400 * 2 ** (attempt - 1), options.signal);
            }
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(3, totalParts) }, () => uploadPart())
      );
    } else {
      throw new Error("GrowPath returned an invalid multipart upload plan.");
    }
    const completed: any = await apiRequest(
      `/api/videos/uploads/${encodeURIComponent(assetId)}/complete`,
      {
        method: "POST",
        signal: options.signal,
        body: { ...workspace, clientUploadKey, parts }
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
    // Network and completion failures are ambiguous: the object may already be active
    // even when the response was lost. Keep the reservation so Retry can safely reuse
    // this client key. Explicit Remove/unmount performs the bounded DELETE cleanup.
    throw unavailableVideoReservation(error);
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
