import { Platform } from "react-native";
import { apiRequest, uploadBinaryToSignedUrl } from "./apiRequest";
import { endpoints } from "./endpoints";
import { uriToBlob } from "./uriToBlob";
import {
  discardPreparedNativeEvidenceImage,
  prepareEvidenceImageForUpload,
  prepareNativeEvidenceImageForUpload
} from "../utils/evidenceImageUpload";

// CONTRACT:
// - apiRequest is the only network client
// - Web blob loading uses XHR (no fetch drift)
// - Native uses { uri, name, type } for FormData

function guessMime(filename) {
  const m = (filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] || "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "jpeg" || ext === "jpg") return "image/jpeg";
  return "image/jpeg";
}

function guessCourseMediaMime(filename) {
  const m = (filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] || "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "mp4" || ext === "m4v") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "m4a") return "audio/mp4";
  if (ext === "wav") return "audio/wav";
  return "application/octet-stream";
}

function guessSopDocumentMime(filename) {
  const m = (filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] || "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx")
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "txt") return "text/plain";
  if (ext === "md") return "text/markdown";
  if (ext === "rtf") return "application/rtf";
  if (ext === "png") return "image/png";
  if (ext === "jpeg" || ext === "jpg") return "image/jpeg";
  return "application/octet-stream";
}

function normalizeUploadInput(input, fallbackName) {
  if (typeof input === "string") {
    return {
      uri: input,
      name: String(input).split("/").pop() || fallbackName,
      type: undefined
    };
  }
  return {
    uri: input?.uri,
    name:
      input?.name ||
      input?.fileName ||
      String(input?.uri || "")
        .split("/")
        .pop() ||
      fallbackName,
    type: input?.mimeType || input?.type
  };
}

// Unified upload function: supports web/native, FormData, and Authorization
export async function uploadImage(uri) {
  if (!uri) throw new Error("uploadImage: uri is required");

  const formData = new FormData();
  const filename = String(uri).split("/").pop() || "upload.jpg";
  const type = guessMime(filename);

  if (Platform.OS === "web") {
    const blob = await uriToBlob(uri);
    formData.append("image", blob, filename);
  } else {
    formData.append("image", {
      uri,
      name: filename,
      type
    });
  }

  return apiRequest("/api/uploads/image", {
    method: "POST",
    body: formData
  });
}

export async function uploadCourseMedia(input, options = {}) {
  const file = normalizeUploadInput(input, "lesson-media");
  if (!file.uri) throw new Error("uploadCourseMedia: uri is required");

  const formData = new FormData();
  const type = file.type || guessCourseMediaMime(file.name);
  if (options.purpose) formData.append("purpose", String(options.purpose));
  if (options.workspaceType) {
    formData.append("workspaceType", String(options.workspaceType));
  }
  if (options.workspaceId) {
    formData.append("workspaceId", String(options.workspaceId));
  }

  if (Platform.OS === "web") {
    const blob = await uriToBlob(file.uri);
    formData.append("media", blob, file.name);
  } else {
    formData.append("media", {
      uri: file.uri,
      name: file.name,
      type
    });
  }

  return apiRequest("/api/uploads/course-media", {
    method: "POST",
    body: formData
  });
}

export async function uploadEvidenceMedia(input) {
  const file = normalizeUploadInput(input, "evidence-media");
  if (!file.uri) throw new Error("uploadEvidenceMedia: uri is required");

  const type = file.type || guessCourseMediaMime(file.name);
  const imageFileName = /\.(?:jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "");
  const isImage =
    input?.assetType === "photo" || type.startsWith("image/") || imageFileName
      ? true
      : false;
  if (!isImage) {
    throw new Error(
      "Evidence videos must use GrowPath's protected video upload workflow."
    );
  }
  let prepared = null;
  let preparedNative = null;

  if (Platform.OS === "web") {
    const blob =
      input?.file ||
      (await uriToBlob(file.uri, {
        signal: input?.signal,
        timeoutMs: 30000
      }));
    prepared = await prepareEvidenceImageForUpload(blob, file.name, {
      signal: input?.signal
    });
  } else {
    preparedNative = await prepareNativeEvidenceImageForUpload(
      {
        uri: file.uri,
        fileName: file.name,
        mimeType: type,
        fileSizeBytes: input?.fileSizeBytes,
        width: input?.width,
        height: input?.height
      },
      { signal: input?.signal }
    );
  }

  try {
    if (isImage) {
      const clientUploadKey = String(input?.clientUploadKey || "").trim();
      if (!clientUploadKey) {
        throw new Error("A stable evidence upload key is required.");
      }
      let uploadBytes = Number(
        prepared?.uploadBytes ||
          preparedNative?.uploadBytes ||
          input?.fileSizeBytes ||
          input?.file?.size ||
          0
      );
      if (!uploadBytes && Platform.OS !== "web") {
        const FileSystem = await import("expo-file-system/legacy");
        const info = await FileSystem.getInfoAsync(file.uri);
        uploadBytes = info.exists ? Number(info.size || 0) : 0;
      }
      if (!uploadBytes) {
        throw new Error("GrowPath could not read the selected photo's file size.");
      }
      const uploadMimeType = String(
        prepared?.mimeType ||
          preparedNative?.mimeType ||
          (type.startsWith("image/") ? type : guessMime(file.name))
      ).toLowerCase();
      const uploadFileName = String(
        prepared?.fileName || preparedNative?.fileName || file.name || "evidence-photo"
      );
      const workspaceType = input?.workspaceType || "personal";
      const workspace = {
        clientUploadKey,
        workspaceType,
        workspaceId: input?.workspaceId || undefined,
        facilityId: input?.facilityId || undefined
      };
      const initiated = await apiRequest("/api/evidence-assets/uploads/initiate", {
        method: "POST",
        signal: input?.signal,
        timeoutMs: 45000,
        body: {
          ...workspace,
          fileName: uploadFileName,
          mimeType: uploadMimeType,
          bytes: uploadBytes
        }
      });
      input?.onReservation?.({
        assetId: initiated?.assetId,
        url: initiated?.url,
        uploadStatus: initiated?.uploadStatus
      });
      let completed = initiated;
      if (initiated?.uploadStatus !== "active") {
        if (!initiated?.assetId || !initiated?.upload?.strategy) {
          throw new Error("GrowPath did not return a valid protected photo upload.");
        }
        const uploadStrategy = String(initiated.upload.strategy);
        let signedUploadUrl = "";
        if (uploadStrategy === "multipart") {
          const totalParts = Number(initiated.upload.totalParts || 0);
          const partSizeBytes = Number(initiated.upload.partSizeBytes || 0);
          const uploadParts = Array.isArray(initiated.upload.parts)
            ? initiated.upload.parts
            : [];
          const part = uploadParts.find(
            (candidate) => Number(candidate?.partNumber) === 1
          );
          if (
            totalParts !== 1 ||
            partSizeBytes !== uploadBytes ||
            uploadParts.length !== 1 ||
            !part?.url
          ) {
            throw new Error("GrowPath returned an invalid protected photo upload plan.");
          }
          signedUploadUrl = String(part.url);
        } else if (uploadStrategy === "single" && initiated.upload.url) {
          // Compatibility for an older in-flight reservation. New protected photo
          // reservations always use one-part multipart so completion consumes the URL.
          signedUploadUrl = String(initiated.upload.url);
        } else {
          throw new Error("GrowPath did not return a valid protected photo upload.");
        }
        const uploaded = await uploadBinaryToSignedUrl({
          url: signedUploadUrl,
          uri: Platform.OS === "web" ? undefined : preparedNative?.uri || file.uri,
          body: prepared?.blob || input?.file,
          mimeType: uploadMimeType,
          signal: input?.signal,
          onProgress: input?.onProgress
        });
        const parts = [];
        if (uploadStrategy === "multipart") {
          const etag = String(uploaded?.etag || "").trim();
          if (!etag) {
            throw new Error(
              "Protected storage did not confirm the photo upload. Check R2 CORS ETag exposure."
            );
          }
          parts.push({ partNumber: 1, etag });
        }
        completed = await apiRequest(
          `/api/evidence-assets/uploads/${encodeURIComponent(initiated.assetId)}/complete`,
          {
            method: "POST",
            signal: input?.signal,
            timeoutMs: 45000,
            body: { ...workspace, parts }
          }
        );
      }
      return {
        ...completed,
        assetId: completed?.assetId || initiated?.assetId,
        url: completed?.url || initiated?.url,
        mimeType: completed?.mimeType || uploadMimeType,
        fileName: uploadFileName,
        bytes: completed?.bytes || uploadBytes,
        originalBytes:
          prepared?.originalBytes ||
          preparedNative?.originalBytes ||
          input?.fileSizeBytes,
        optimized: Boolean(prepared?.optimized || preparedNative?.optimized)
      };
    }

    throw new Error("Unsupported evidence upload.");
  } finally {
    if (Platform.OS !== "web" && preparedNative?.optimized && preparedNative?.uri) {
      await discardPreparedNativeEvidenceImage(preparedNative.uri);
    }
  }
}

export async function abortEvidenceUpload(assetId, workspace = {}) {
  if (!assetId) return null;
  return apiRequest(
    `/api/evidence-assets/uploads/${encodeURIComponent(assetId)}/object`,
    {
      method: "DELETE",
      timeoutMs: 45000,
      params: {
        workspaceType: workspace.workspaceType,
        workspaceId: workspace.workspaceId,
        facilityId: workspace.facilityId
      }
    }
  );
}

export async function getEvidenceUploadPlayback(assetId, workspace = {}) {
  if (!assetId) return { playbackUrl: "", expiresInSeconds: 0 };
  const response = await apiRequest(
    `/api/evidence-assets/uploads/${encodeURIComponent(assetId)}/playback`,
    {
      timeoutMs: 45000,
      params: {
        workspaceType: workspace.workspaceType,
        workspaceId: workspace.workspaceId,
        facilityId: workspace.facilityId
      }
    }
  );
  return {
    playbackUrl: String(response?.playbackUrl || ""),
    expiresInSeconds: Number(response?.expiresInSeconds || 0)
  };
}

export async function uploadSopDocument(facilityId, input) {
  if (!facilityId) throw new Error("uploadSopDocument: facilityId is required");
  const file = normalizeUploadInput(input, "sop-document");
  if (!file.uri) throw new Error("uploadSopDocument: uri is required");

  const formData = new FormData();
  const type = file.type || guessSopDocumentMime(file.name);

  if (Platform.OS === "web") {
    const blob = await uriToBlob(file.uri);
    formData.append("document", blob, file.name);
  } else {
    formData.append("document", {
      uri: file.uri,
      name: file.name,
      type
    });
  }

  const response = await apiRequest(endpoints.sopDocuments(facilityId), {
    method: "POST",
    body: formData
  });
  return response?.asset || response;
}
