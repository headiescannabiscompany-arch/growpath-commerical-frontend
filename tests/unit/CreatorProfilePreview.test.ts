import { creatorProfilePreviewUrl } from "@/api/creatorProfile";
import { buildPublicShareTargets } from "@/utils/publicLinks";

jest.mock("@/api/apiRequest", () => ({
  API_URL: "https://api.example.test/api/",
  apiRequest: jest.fn(() => { throw new Error("No requests in preview URL checks"); })
}));

const profile = {
  ownerId: "507f191e810c19729de86201",
  displayName: "Synthetic garden creator",
  bio: "A deliberately published introduction.",
  links: [],
  publishedAt: "2026-10-21T12:00:00.000Z"
};

test("creator preview binds social destinations to the configured API and publication, not the SPA homepage", () => {
  const preview = creatorProfilePreviewUrl(profile);
  expect(preview).toBe(`https://api.example.test/api/user/creator-profile/${profile.ownerId}/share?v=${Date.parse(profile.publishedAt)}`);
  const targets = buildPublicShareTargets(profile.displayName, `/creators/${profile.ownerId}`, { description: profile.bio, socialPreviewUrl: preview });
  const linkedin = targets.find(target => target.key === "linkedin")!;
  expect(new URL(linkedin.href).searchParams.get("url")).toBe(preview);
  for (const target of targets) expect(decodeURIComponent(target.href)).toContain(preview);
});

test("creator preview version changes only when the published timestamp changes", () => {
  const baseline = creatorProfilePreviewUrl(profile);
  expect(creatorProfilePreviewUrl({ ...profile, draft: "private", email: "private" } as any)).toBe(baseline);
  expect(creatorProfilePreviewUrl({ ...profile, publishedAt: "2026-10-21T13:00:00.000Z" })).not.toBe(baseline);
});

test("creator preview cannot inject an owner path/query or editor return marker", () => {
  const url = new URL(creatorProfilePreviewUrl({ ...profile, ownerId: "a/b?from=private#token" }));
  expect(url.pathname).toBe("/api/user/creator-profile/a%2Fb%3Ffrom%3Dprivate%23token/share");
  expect([...url.searchParams.keys()]).toEqual(["v"]);
  expect(url.hash).toBe("");
});

test.each(["", "invalid"])("creator preview refuses invalid publication date %s", publishedAt => {
  expect(() => creatorProfilePreviewUrl({ ...profile, publishedAt })).toThrow();
});
