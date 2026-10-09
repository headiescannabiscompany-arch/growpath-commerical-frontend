import {
  creatorDraftIssue,
  getMyCreatorProfile,
  getPublicCreatorProfile,
  isSafeCreatorLink,
  publishCreatorProfile,
  saveCreatorProfile,
  unpublishCreatorProfile
} from "@/api/creatorProfile";

const mockApiRequest = jest.fn();
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

const draft = {
  displayName: "Synthetic creator",
  bio: "A deliberately chosen public description.",
  links: [{ label: "Website", url: "https://example.com/creator" }]
};
const published = { ...draft, publishedAt: "2026-10-09T02:00:00.000Z" };
const state = { ownerId: "owner-1", revision: 4, draft, published: null };

describe("creator profile client contract", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("reads only the authenticated self endpoint without retries or cached private drafts", async () => {
    mockApiRequest.mockResolvedValue({ ...state, email: "private@example.invalid" });
    await expect(getMyCreatorProfile()).resolves.toEqual(state);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/user/creator-profile", {
      cache: "no-store",
      retries: 0
    });
  });

  it("saves a private draft with its revision, never a Commercial request or owner identifier", async () => {
    mockApiRequest.mockResolvedValue(state);
    await saveCreatorProfile(3, draft);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/user/creator-profile", {
      method: "PUT",
      body: { expectedRevision: 3, draft },
      retries: 0
    });
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });

  it("publishes only the reviewed stored revision, not a new draft or account identity", async () => {
    mockApiRequest.mockResolvedValue({ ...state, revision: 5, published });
    await publishCreatorProfile(4);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/user/creator-profile/publish", {
      method: "POST",
      body: { expectedRevision: 4 },
      retries: 0
    });
  });

  it("allows withdrawal without a possibly stale publish revision", async () => {
    mockApiRequest.mockResolvedValue(state);
    await unpublishCreatorProfile();
    expect(mockApiRequest).toHaveBeenCalledWith("/api/user/creator-profile/unpublish", {
      method: "POST",
      body: {},
      retries: 0
    });
  });

  it("reads an anonymous published-only DTO, encodes its identity and strips private extras", async () => {
    const ownerId = "owner/one";
    mockApiRequest.mockResolvedValue({
      ownerId,
      ...published,
      email: "private@example.invalid",
      draft: { bio: "secret" },
      links: [{ ...draft.links[0], token: "never-consume" }]
    });
    await expect(getPublicCreatorProfile(ownerId)).resolves.toEqual({
      ownerId,
      ...published
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/user/creator-profile/owner%2Fone", {
      auth: false,
      cache: "no-store",
      retries: 0
    });
  });

  it("treats only a real 404 as unpublished or unavailable", async () => {
    mockApiRequest.mockRejectedValue({ status: 404 });
    await expect(getPublicCreatorProfile("owner-1")).resolves.toBeNull();
  });

  it.each([401, 403, 429, 500, 503, undefined])(
    "does not hide a %s read failure as unpublished",
    async (status) => {
      const error = Object.assign(new Error("Read failed"), { status });
      mockApiRequest.mockRejectedValue(error);
      await expect(getPublicCreatorProfile("owner-1")).rejects.toBe(error);
    }
  );

  it.each([
    null,
    { ...published, ownerId: "someone-else" },
    { ...published, ownerId: "owner-1", displayName: " " },
    { ...published, ownerId: "owner-1", publishedAt: "not-a-date" },
    {
      ...published,
      ownerId: "owner-1",
      links: [{ label: "Bad", url: "javascript:alert(1)" }]
    },
    {
      ...published,
      ownerId: "owner-1",
      links: [{ label: "Bad", url: "https://secret:password@example.com" }]
    }
  ])("rejects an unverifiable published response %#", async (value) => {
    mockApiRequest.mockResolvedValue(value);
    await expect(getPublicCreatorProfile("owner-1")).rejects.toThrow(
      "could not be verified"
    );
  });

  it.each([
    null,
    { ...state, revision: -1 },
    { ...state, revision: 1.5 },
    { ...state, ownerId: "" },
    { ...state, draft: { ...draft, links: Array(9).fill(draft.links[0]) } },
    { ...state, draft: { ...draft, bio: "x".repeat(1001) } },
    { ...state, published: undefined }
  ])("rejects an unverifiable owner response %#", async (value) => {
    mockApiRequest.mockResolvedValue(value);
    await expect(getMyCreatorProfile()).rejects.toThrow("could not be verified");
  });

  it("retains save conflicts for explicit user recovery and never retries the write", async () => {
    const conflict = Object.assign(new Error("Conflict"), { status: 409 });
    mockApiRequest.mockRejectedValue(conflict);
    await expect(saveCreatorProfile(3, draft)).rejects.toBe(conflict);
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });
});

describe("creator profile draft limits", () => {
  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "//example.com",
    "data:text/plain,bad",
    "https://name:password@example.com",
    "https://name@example.com",
    "https://example.com/a b",
    "https://example.com\n/secret",
    "https://example.com\\@other.example",
    "https://",
    " https://example.com",
    "https://example.com/" + "x".repeat(2048)
  ])("blocks unsafe link %s", (url) => expect(isSafeCreatorLink(url)).toBe(false));

  it("accepts ordinary HTTPS links and blank private names without borrowing account identity", () => {
    expect(isSafeCreatorLink("https://example.com/creator?tab=videos#intro")).toBe(true);
    expect(creatorDraftIssue({ displayName: "", bio: "", links: [] })).toBeNull();
    expect(
      creatorDraftIssue({ ...draft, links: Array(8).fill(draft.links[0]) })
    ).toBeNull();
  });

  it.each([
    { ...draft, displayName: "n".repeat(81) },
    { ...draft, bio: "b".repeat(1001) },
    { ...draft, links: Array(9).fill(draft.links[0]) },
    { ...draft, links: [{ label: " ", url: "https://example.com" }] },
    { ...draft, links: [{ label: "n".repeat(81), url: "https://example.com" }] },
    { ...draft, links: [{ label: "Website", url: "javascript:alert(1)" }] }
  ])("rejects invalid bounded draft %#", (value) => {
    expect(creatorDraftIssue(value)).toEqual(expect.any(String));
  });
});
