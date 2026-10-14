import { apiRequest } from "./apiRequest";

export type PublicMarketingObservation = {
  title: string;
  href: string;
  publishedAt: string;
};

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};

/** A display projection of the anonymous public DTO, never an owner-record fallback. */
export function selectPublicMarketingObservations(
  response: unknown,
  now = Date.now()
): PublicMarketingObservation[] {
  const payload = record(response);
  const rows = payload.observations ?? record(payload.data).observations;
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  return rows
    .slice(0, 30)
    .flatMap((value): PublicMarketingObservation[] => {
      const row = record(value);
      const study = record(row.study);
      const publication = record(row.publication);
      if (publication.status && publication.status !== "published") return [];
      if (study.visibility && study.visibility !== "public") return [];
      if (study.status === "archived") return [];
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const slug = typeof study.slug === "string" ? study.slug : "";
      const publishedAt = typeof row.publishedAt === "string" ? row.publishedAt : "";
      if (
        !title ||
        title.length > 160 ||
        Array.from(title).some(
          (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        )
      )
        return [];
      // Clearly labeled fixtures belong in the synthetic demo, not this public activity slice.
      if (/\b(qa|synthetic|fixture|demo|test)\b/i.test(title + " " + slug)) return [];
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || slug.length > 160) return [];
      if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(publishedAt)) return [];
      const timestamp = Date.parse(publishedAt);
      if (!Number.isFinite(timestamp) || timestamp > now) return [];
      const key = `${slug}:${publishedAt}:${title}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ title, href: `/field-observations/${slug}`, publishedAt }];
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);
}

export async function getPublicMarketingObservations(signal?: AbortSignal) {
  const response = await apiRequest("/api/personal/field-studies/public", {
    auth: false,
    params: { limit: 3 },
    signal,
    timeoutMs: 8000,
    retries: 0,
    cache: "no-store",
    notifyTransport: false,
    invalidateOn401: false
  });
  const payload = record(response);
  if (!Array.isArray(payload.observations ?? record(payload.data).observations)) {
    throw new Error("Public observations are unavailable.");
  }
  return selectPublicMarketingObservations(response);
}
