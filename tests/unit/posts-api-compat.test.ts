const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("legacy posts API compatibility", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockResolvedValue({ ok: true });
  });

  it("routes legacy post list and create calls through Forum/Q&A endpoints", async () => {
    const { createPost, getFeed, getTrending } = require("@/api/posts.js");

    await getFeed(2, { tier1: ["soil"], tags: ["npk"], token: "token-1" });
    await getTrending("token-1");
    await createPost({ title: "Question", body: "Help?" }, "token-1");

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/forum/feed/latest", {
      auth: true,
      params: { page: 2, tier1: "soil", tags: "npk" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/forum/feed/trending", {
      auth: true
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, "/api/forum/create", {
      method: "POST",
      auth: true,
      body: { title: "Question", body: "Help?" }
    });
  });

  it("routes legacy reactions and comments through Forum/Q&A endpoints", async () => {
    const { addComment, getComments, likePost, unlikePost } = require("@/api/posts.js");

    await likePost("thread-1", "token-1");
    await unlikePost("thread-1", "token-1");
    await getComments("thread-1", "token-1");
    await addComment("thread-1", "Check undersides", "token-1");

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/forum/like/thread-1", {
      method: "POST",
      auth: true,
      body: {}
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/forum/unlike/thread-1", {
      method: "POST",
      auth: true,
      body: {}
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, "/api/forum/thread-1/comments", {
      auth: true
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(4, "/api/forum/thread-1/comment", {
      method: "POST",
      auth: true,
      body: { text: "Check undersides" }
    });
  });
});
