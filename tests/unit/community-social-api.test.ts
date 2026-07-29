const mockApiRequest = jest.fn();
const mockPersistImageUris = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args)
}));

describe("community social API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPersistImageUris.mockResolvedValue([
      "/uploads/forum-a.jpg",
      "/uploads/forum-b.jpg"
    ]);
    mockApiRequest.mockResolvedValue({
      post: {
        id: "forum-1",
        title: "Show roots",
        body: "Attached photos",
        photos: ["/uploads/forum-a.jpg", "/uploads/forum-b.jpg"]
      }
    });
  });

  it("persists forum photos before creating discussions", async () => {
    const { createForumPost } = require("@/api/communitySocial");

    const result = await createForumPost({
      title: "Show roots",
      body: "Attached photos",
      authorType: "user",
      authorId: "user-1",
      workspaceContext: "personal",
      photos: ["file:///tmp/forum-a.jpg", "/uploads/forum-b.jpg"]
    });

    expect(mockPersistImageUris).toHaveBeenCalledWith([
      "file:///tmp/forum-a.jpg",
      "/uploads/forum-b.jpg"
    ]);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/forum/create", {
      method: "POST",
      invalidateOn401: false,
      body: {
        title: "Show roots",
        body: "Attached photos",
        authorType: "user",
        authorId: "user-1",
        workspaceContext: "personal",
        photos: ["/uploads/forum-a.jpg", "/uploads/forum-b.jpg"]
      }
    });
    expect(result.photos).toEqual(["/uploads/forum-a.jpg", "/uploads/forum-b.jpg"]);
  });

  it("keeps forum authorization failures inside the forum instead of ending the session", async () => {
    const { listForumPosts } = require("@/api/communitySocial");
    mockApiRequest.mockResolvedValueOnce({ posts: [] });

    await listForumPosts();

    expect(mockApiRequest).toHaveBeenCalledWith("/api/forum/feed/latest", {
      method: "GET",
      params: { page: 1, tier1: undefined },
      invalidateOn401: false
    });
  });

  it("sends Tier 1 crops to the server as the forum audience boundary", async () => {
    const { listForumPosts } = require("@/api/communitySocial");
    mockApiRequest.mockResolvedValueOnce({ posts: [] });

    await listForumPosts(2, ["Cannabis", "Vegetables"]);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/forum/feed/latest", {
      method: "GET",
      params: { page: 2, tier1: "Cannabis,Vegetables" },
      invalidateOn401: false
    });
  });

  it("creates a normalized Forum group through the canonical guild endpoint", async () => {
    const { createGuild } = require("@/api/communitySocial");
    mockApiRequest.mockResolvedValueOnce({
      guild: { id: "group-1", name: "Living Soil Builders", isPublic: false }
    });

    const result = await createGuild({
      name: "  Living Soil Builders  ",
      description: "  Compare soil-building methods and evidence.  ",
      topics: [" living soil ", "", " compost "],
      isPublic: false
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/guilds", {
      method: "POST",
      invalidateOn401: false,
      body: {
        name: "Living Soil Builders",
        description: "Compare soil-building methods and evidence.",
        topics: ["living soil", "compost"],
        isPublic: false
      }
    });
    expect(result).toMatchObject({ id: "group-1", isPublic: false });
  });
});
