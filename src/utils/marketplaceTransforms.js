export const extractCourses = (response) => {
  const payload = response?.data ?? response ?? [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.courses)) return payload.courses;
  return [];
};

export const extractHasMore = (response) => {
  const payloadValue = response?.data ?? response ?? {};
  if (Array.isArray(payloadValue)) return payloadValue.length > 0;
  if (Array.isArray(payloadValue.courses)) {
    if (typeof payloadValue.hasMore === "boolean") return payloadValue.hasMore;
    return payloadValue.courses.length > 0;
  }
  return payloadValue.hasMore !== false;
};

if (typeof module !== "undefined") {
  module.exports = { extractCourses, extractHasMore };
}
