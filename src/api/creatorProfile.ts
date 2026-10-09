import { apiRequest } from "@/api/apiRequest";

export type CreatorProfileDraft = {
  displayName: string;
  bio: string;
  links: { label: string; url: string }[];
};
export type CreatorProfileSnapshot = CreatorProfileDraft & { publishedAt: string };
export type CreatorPublishedProfile = CreatorProfileSnapshot & { ownerId: string };
export type CreatorProfileState = {
  ownerId: string;
  revision: number;
  draft: CreatorProfileDraft;
  published: CreatorProfileSnapshot | null;
};

const path = "/api/user/creator-profile";
const unavailable = () => new Error("Creator profile response could not be verified.");
const object = (value: unknown): value is Record<string, any> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;

export function isSafeCreatorLink(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    /[\\\s]/.test(value) ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || (code >= 127 && code <= 159);
    })
  )
    return false;
  try {
    const url = new URL(value);
    return (
      /^https:\/\//i.test(value) &&
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function creatorDraftIssue(draft: CreatorProfileDraft): string | null {
  if (!text(draft.displayName, 80)) return "Public name must be 80 characters or fewer.";
  if (!text(draft.bio, 1000)) return "About you must be 1,000 characters or fewer.";
  if (!Array.isArray(draft.links) || draft.links.length > 8)
    return "Use no more than eight links.";
  if (
    draft.links.some(
      (link) =>
        !link.label.trim() || !text(link.label, 80) || !isSafeCreatorLink(link.url)
    )
  )
    return "Give each link a label and a full https:// address without sign-in credentials or spaces.";
  return null;
}

function draftDTO(value: unknown): CreatorProfileDraft {
  if (
    !object(value) ||
    !text(value.displayName, 80) ||
    !text(value.bio, 1000) ||
    !Array.isArray(value.links) ||
    value.links.length > 8 ||
    value.links.some(
      (link) =>
        !object(link) ||
        !text(link.label, 80) ||
        !link.label.trim() ||
        !isSafeCreatorLink(link.url)
    )
  )
    throw unavailable();
  return {
    displayName: value.displayName,
    bio: value.bio,
    links: value.links.map((link) => ({ label: link.label, url: link.url }))
  };
}
function snapshotDTO(value: unknown): CreatorProfileSnapshot {
  const draft = draftDTO(value);
  if (
    !object(value) ||
    !draft.displayName.trim() ||
    typeof value.publishedAt !== "string" ||
    !Number.isFinite(Date.parse(value.publishedAt))
  )
    throw unavailable();
  return { ...draft, publishedAt: value.publishedAt };
}
function stateDTO(value: unknown): CreatorProfileState {
  if (
    !object(value) ||
    !text(value.ownerId, 160) ||
    !value.ownerId ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0
  )
    throw unavailable();
  return {
    ownerId: value.ownerId,
    revision: value.revision,
    draft: draftDTO(value.draft),
    published: value.published === null ? null : snapshotDTO(value.published)
  };
}
export async function getMyCreatorProfile(): Promise<CreatorProfileState> {
  return stateDTO(await apiRequest(path, { cache: "no-store", retries: 0 }));
}
export async function saveCreatorProfile(
  expectedRevision: number,
  draft: CreatorProfileDraft
): Promise<CreatorProfileState> {
  return stateDTO(
    await apiRequest(path, {
      method: "PUT",
      body: { expectedRevision, draft },
      retries: 0
    })
  );
}
export async function publishCreatorProfile(
  expectedRevision: number
): Promise<CreatorProfileState> {
  return stateDTO(
    await apiRequest(`${path}/publish`, {
      method: "POST",
      body: { expectedRevision },
      retries: 0
    })
  );
}
export async function unpublishCreatorProfile(): Promise<CreatorProfileState> {
  return stateDTO(
    await apiRequest(`${path}/unpublish`, { method: "POST", body: {}, retries: 0 })
  );
}
export async function getPublicCreatorProfile(
  ownerId: string
): Promise<CreatorPublishedProfile | null> {
  try {
    const value = await apiRequest<any>(`${path}/${encodeURIComponent(ownerId)}`, {
      auth: false,
      cache: "no-store",
      retries: 0
    });
    if (!object(value) || value.ownerId !== ownerId) throw unavailable();
    return { ownerId, ...snapshotDTO(value) };
  } catch (error: any) {
    if (error?.status === 404) return null;
    throw error;
  }
}
