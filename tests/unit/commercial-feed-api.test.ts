const mockApiRequest = jest.fn();
const mockPersistImageUri = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args)
}));

describe("commercial feed API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPersistImageUri.mockResolvedValue("/uploads/feed-image.jpg");
    mockApiRequest.mockResolvedValue({
      post: {
        id: "post-1",
        type: "update",
        body: "Trial update",
        tags: ["soil"],
        growInterests: ["living soil"],
        linkedProductId: "product-1",
        linkedCourseId: "course-1",
        linkedGrowId: "grow-1",
        storefrontSlug: "living-soil-labs",
        imageUrl: "/uploads/feed-image.jpg",
        startsAt: "2026-07-17T21:00:00Z",
        endsAt: "2026-07-24T21:00:00Z",
        reminderPreference: "24 hours before",
        recurrenceRule: "weekly",
        externalLinks: [{ label: "Buy", url: "https://example.com" }]
      }
    });
  });

  it("sends commercial object links when creating feed campaigns", async () => {
    const { createCommercialFeedPost } = require("@/api/commercialFeed");

    const result = await createCommercialFeedPost({
      type: "update",
      title: "Veg mix trial",
      body: "Trial update",
      tags: ["soil"],
      growInterests: ["living soil"],
      location: "web",
      linkedProductId: "product-1",
      linkedCourseId: "course-1",
      linkedGrowId: "grow-1",
      storefrontSlug: "living-soil-labs",
      imageUrl: "file:///tmp/feed-image.jpg",
      startsAt: "2026-07-17T21:00:00Z",
      endsAt: "2026-07-24T21:00:00Z",
      reminderPreference: "24 hours before",
      recurrenceRule: "weekly",
      externalLinks: [{ label: "Buy", url: "https://example.com" }]
    });

    expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/feed-image.jpg");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/feed", {
      method: "POST",
      body: {
        type: "update",
        title: "Veg mix trial",
        body: "Trial update",
        tags: ["soil"],
        growInterests: ["living soil"],
        location: "web",
        linkedProductId: "product-1",
        linkedCourseId: "course-1",
        linkedGrowId: "grow-1",
        storefrontSlug: "living-soil-labs",
        imageUrl: "/uploads/feed-image.jpg",
        creativeImageUrl: "/uploads/feed-image.jpg",
        startsAt: "2026-07-17T21:00:00Z",
        endsAt: "2026-07-24T21:00:00Z",
        reminderPreference: "24 hours before",
        recurrenceRule: "weekly",
        externalLinks: [{ label: "Buy", url: "https://example.com" }]
      }
    });
    expect(result).toMatchObject({
      id: "post-1",
      linkedProductId: "product-1",
      linkedCourseId: "course-1",
      linkedGrowId: "grow-1",
      storefrontSlug: "living-soil-labs",
      imageUrl: "/uploads/feed-image.jpg"
    });
  });
});
