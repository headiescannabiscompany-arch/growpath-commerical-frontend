export const PROTECTED_FRAME_EXTRACTION_MAX_SOURCE_BYTES = 512 * 1024 * 1024;

export function protectedVideoSourceSizeError(
  fileSizeBytes: unknown,
  maxBytes = PROTECTED_FRAME_EXTRACTION_MAX_SOURCE_BYTES
) {
  const bytes = Number(fileSizeBytes);
  const maximum = Number(maxBytes);
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0 ||
    !Number.isFinite(maximum) ||
    maximum <= 0 ||
    bytes <= maximum
  ) {
    return "";
  }

  const maximumMiB = Math.floor(maximum / (1024 * 1024));
  return `This private video is too large for protected frame extraction. Choose or export a video no larger than ${maximumMiB} MB, then select it again.`;
}
