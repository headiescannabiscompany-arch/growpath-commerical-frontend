import { Linking, Platform } from "react-native";
import { API_URL, apiRequest, uploadBinaryToSignedUrl } from "./apiRequest";
import { endpoints } from "./endpoints";
import { uriToBlob } from "./uriToBlob";
import {
  MARKETPLACE_FILE_MAX_BYTES,
  MARKETPLACE_FILE_MIMES
} from "../utils/marketplaceDownload";
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
  if (ext === "jpeg" || ext === "jpg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
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

export async function uploadMarketplaceFile(input, options = {}) {
  const file = normalizeUploadInput(input, "offer-file");
  const extension = String(file.name).split(".").pop().toLowerCase();
  const types = {
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav"
  };
  const type = types[extension];
  if (!file.uri || !MARKETPLACE_FILE_MIMES.includes(type)) {
    throw new Error(
      "Choose a PDF, UTF-8 TXT/CSV, JPG, PNG, WebP, MP3, M4A, or WAV file (maximum 10 MB)."
    );
  }
  if (Number(input?.size || 0) > MARKETPLACE_FILE_MAX_BYTES)
    throw new Error("Offer files must be 10 MB or smaller.");
  const data = new FormData();
  if (Platform.OS === "web") {
    const blob = input?.file instanceof Blob ? input.file : await uriToBlob(file.uri);
    if (blob.size > MARKETPLACE_FILE_MAX_BYTES)
      throw new Error("Offer files must be 10 MB or smaller.");
    data.append("media", blob, file.name);
  } else {
    data.append("media", { uri: file.uri, name: file.name, type });
  }
  if (options.signal?.aborted) throw new Error("Offer upload canceled.");
  const response = await apiRequest("/api/uploads/marketplace-file", {
    method: "POST",
    body: data,
    auth: true,
    signal: options.signal
  });
  const asset = response?.data || response;
  if (
    asset?.deliveryType !== "protected_asset" ||
    !/^[a-f0-9]{24}$/i.test(String(asset?.assetId || ""))
  ) {
    throw new Error("The protected file upload could not be verified. Please retry.");
  }
  return {
    assetId: asset.assetId,
    filename: asset.filename,
    mimeType: asset.mimeType,
    bytes: asset.bytes,
    deliveryType: "protected_asset"
  };
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
    params: {
      workspaceType: options.workspaceType,
      workspaceId: options.workspaceId
    },
    body: formData
  });
}

export async function deleteCourseMediaAsset(assetId) {
  const id = String(assetId || "").trim();
  if (!id) return null;
  return apiRequest(`/api/course-media/${encodeURIComponent(id)}/abandon`, {
    method: "DELETE"
  });
}

function protectedCourseMediaPath(value) {
  const raw = String(value || "").trim();
  if (!raw || !API_URL) return "";
  try {
    const apiOrigin = new URL(API_URL).origin;
    const parsed = new URL(raw, `${apiOrigin}/`);
    if (parsed.origin !== apiOrigin) return "";
    if (
      !/^\/api\/(?:uploads\/)?course-media\/[0-9a-f]{24}\/file$/i.test(parsed.pathname)
    ) {
      return "";
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "";
  }
}

/**
 * Exchanges an authenticated/anonymous course entitlement check for a five-minute
 * resource URL, then opens that URL without exposing the account bearer token.
 */
export async function getCourseMediaAccessUrl(url) {
  const protectedPath = protectedCourseMediaPath(url);
  if (!protectedPath) return String(url || "");
  const accessPath = protectedPath.replace(/\/file(?:\?.*)?$/, "/access");
  const result = await apiRequest(accessPath, { invalidateOn401: false });
  const accessUrl = String(result?.url || "");
  if (!accessUrl) throw new Error("Course media access could not be verified.");
  return new URL(accessUrl, `${API_URL}/`).href;
}

export async function openCourseMedia(url, _options = {}) {
  return Linking.openURL(await getCourseMediaAccessUrl(url));
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
