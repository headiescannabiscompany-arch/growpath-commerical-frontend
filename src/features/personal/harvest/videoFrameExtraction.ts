import { Platform } from "react-native";

export type VideoFrameCandidate = {
  uri: string;
  fileName: string;
  mimeType: "image/jpeg";
  width: number;
  height: number;
  timeSeconds: number;
};

type ExtractVideoFramesInput = {
  uri: string;
  durationSeconds: number;
  maxFrames?: number;
};

function frameTimes(durationSeconds: number, maxFrames: number) {
  const duration = Math.max(0, Number(durationSeconds) || 0);
  const frameCount = Math.max(1, Math.min(8, Math.floor(maxFrames)));
  if (!duration) return [];
  return Array.from({ length: frameCount }, (_, index) => {
    const fraction = (index + 1) / (frameCount + 1);
    return Math.max(0.1, Math.min(duration - 0.1, duration * fraction));
  });
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  successEvent: "loadedmetadata" | "seeked"
) {
  return new Promise<void>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener(successEvent, onSuccess);
      video.removeEventListener("error", onError);
    };
    const onSuccess = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("The selected video could not be decoded."));
    };
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out while reading the selected video."));
    }, 15_000);
    video.addEventListener(successEvent, onSuccess, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function canvasJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("A video frame could not be converted to an image.")),
      "image/jpeg",
      0.95
    );
  });
}

async function extractWebFrames(
  uri: string,
  times: number[]
): Promise<VideoFrameCandidate[]> {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Video frame extraction is unavailable in this browser.");
  }
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.playsInline = true;
  const metadataReady = waitForVideoEvent(video, "loadedmetadata");
  video.src = uri;
  await metadataReady;

  const sourceWidth = Math.max(1, video.videoWidth || 1);
  const sourceHeight = Math.max(1, video.videoHeight || 1);
  const scale = Math.min(1, 2048 / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot read video frames.");

  const frames: VideoFrameCandidate[] = [];
  try {
    for (const [index, timeSeconds] of times.entries()) {
      const frameReady = waitForVideoEvent(video, "seeked");
      video.currentTime = timeSeconds;
      await frameReady;
      context.drawImage(video, 0, 0, width, height);
      const blob = await canvasJpeg(canvas);
      frames.push({
        uri: URL.createObjectURL(blob),
        fileName: `harvest-video-frame-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        width,
        height,
        timeSeconds
      });
    }
  } catch (error) {
    for (const frame of frames) URL.revokeObjectURL(frame.uri);
    throw error;
  } finally {
    video.removeAttribute("src");
    video.load();
  }
  return frames;
}

async function extractNativeFrames(
  uri: string,
  times: number[]
): Promise<VideoFrameCandidate[]> {
  // SDK 54 returns durable local JPEG files here. Keep this adapter isolated so it can
  // move to expo-video generateThumbnailsAsync during the SDK 56 upgrade.
  const VideoThumbnails = await import("expo-video-thumbnails");
  const frames: VideoFrameCandidate[] = [];
  for (const [index, timeSeconds] of times.entries()) {
    const frame = await VideoThumbnails.getThumbnailAsync(uri, {
      time: Math.round(timeSeconds * 1000),
      quality: 1
    });
    frames.push({
      uri: frame.uri,
      fileName: `harvest-video-frame-${index + 1}.jpg`,
      mimeType: "image/jpeg",
      width: frame.width,
      height: frame.height,
      timeSeconds
    });
  }
  return frames;
}

export async function extractVideoFrameCandidates({
  uri,
  durationSeconds,
  maxFrames = 6
}: ExtractVideoFramesInput): Promise<VideoFrameCandidate[]> {
  const times = frameTimes(durationSeconds, maxFrames);
  if (!uri || !times.length) {
    throw new Error("The selected video has no readable duration.");
  }
  return Platform.OS === "web"
    ? extractWebFrames(uri, times)
    : extractNativeFrames(uri, times);
}

export const videoFrameExtractionInternals = { frameTimes };
