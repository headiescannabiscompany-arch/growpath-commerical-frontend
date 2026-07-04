const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("commercial feed API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockResolvedValue({
      post: {
        id: "post-1",
        type: "update",
        body: "Trial update",
        tags: ["soil"],
        linkedProductId: "product-1",
        linkedCourseId: "course-1",
        linkedGrowId: "grow-1",
        storefrontSlug: "living-soil-labs",
        externalLinks: [{ label: "Buy", url: "https://example.com" }]
      }
    });
  });

  it("sends commercial object links when creating feed posts", async () => {
    const { createCommercialFeedPost } = require("@/api/commercialFeed");

    const result = await createCommercialFeedPost({
      type: "update",
      title: "Veg mix trial",
      body: "Trial update",
      tags: ["soil"],
      location: "web",
      linkedProductId: "product-1",
      linkedCourseId: "course-1",
      linkedGrowId: "grow-1",
      storefrontSlug: "living-soil-labs",
      externalLinks: [{ label: "Buy", url: "https://example.com" }]
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/posts", {
      method: "POST",
      body: {
        type: "update",
        title: "Veg mix trial",
        body: "Trial update",
        tags: ["soil"],
        location: "web",
        linkedProductId: "product-1",
        linkedCourseId: "course-1",
        linkedGrowId: "grow-1",
        storefrontSlug: "living-soil-labs",
        externalLinks: [{ label: "Buy", url: "https://example.com" }]
      }
    });
    expect(result).toMatchObject({
      id: "post-1",
      linkedProductId: "product-1",
      linkedCourseId: "course-1",
      linkedGrowId: "grow-1",
      storefrontSlug: "living-soil-labs"
    });
  });
});
