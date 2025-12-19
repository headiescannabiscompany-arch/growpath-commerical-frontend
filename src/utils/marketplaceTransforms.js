export const extractCourses = (response) => {
  const payload = response?.data ?? response ?? [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.courses)) return payload.courses;
  return [];
};

export const extractHasMore = (response) => {
  const payload = response?.data ?? response ?? {};
  if (Array.isArray(payload)) return payload.length > 0;
  if (Array.isArray(payload.courses)) {
    if (typeof payload.hasMore === "boolean") return payload.hasMore;
    return payload.courses.length > 0;
  }
  return payload.hasMore !== false;
};

if (typeof module !== "undefined") {
  module.exports = { extractCourses, extractHasMore };
}
