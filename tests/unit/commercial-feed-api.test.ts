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
        authorType: "commercial",
        workspaceType: "commercial",
        body: "Trial update",
        tags: ["soil"],
        growInterests: ["living soil"],
        linkedProductId: "product-1",
        linkedCourseId: "course-1",
        linkedTrialId: "trial-1",
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
    const { createCommercialFeedCampaign } = require("@/api/commercialFeed");

    const result = await createCommercialFeedCampaign({
      type: "update",
      campaignKind: "product_ad",
      campaignType: "product",
      authorType: "commercial",
      workspaceType: "commercial",
      ownerType: "commercial",
      title: "Veg mix trial",
      body: "Trial update",
      tags: ["soil"],
      growInterests: ["living soil"],
      location: "web",
      linkedProductId: "product-1",
      linkedCourseId: "course-1",
      linkedTrialId: "trial-1",
      linkedGrowId: "grow-1",
      storefrontSlug: "living-soil-labs",
      imageUrl: "file:///tmp/feed-image.jpg",
      startsAt: "2026-07-17T21:00:00Z",
      endsAt: "2026-07-24T21:00:00Z",
      reminderPreference: "24 hours before",
      recurrenceRule: "weekly",
      externalLinks: [{ label: "Buy", url: "https://example.com" }],
      placements: ["feed"],
      cta: { label: "Buy", kind: "open" }
    });

    expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/feed-image.jpg");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/feed", {
      method: "POST",
      body: {
        type: "update",
        campaignKind: "product_ad",
        campaignType: "product",
        authorType: "commercial",
        workspaceType: "commercial",
        ownerType: "commercial",
        title: "Veg mix trial",
        body: "Trial update",
        tags: ["soil"],
        growInterests: ["living soil"],
        location: "web",
        linkedProductId: "product-1",
        linkedCourseId: "course-1",
        linkedTrialId: "trial-1",
        linkedGrowId: "grow-1",
        storefrontSlug: "living-soil-labs",
        imageUrl: "/uploads/feed-image.jpg",
        creativeImageUrl: "/uploads/feed-image.jpg",
        startsAt: "2026-07-17T21:00:00Z",
        endsAt: "2026-07-24T21:00:00Z",
        reminderPreference: "24 hours before",
        recurrenceRule: "weekly",
        externalLinks: [{ label: "Buy", url: "https://example.com" }],
        placements: ["feed"],
        cta: { label: "Buy", kind: "open" }
      }
    });
    expect(result).toMatchObject({
      id: "post-1",
      authorType: "commercial",
      workspaceType: "commercial",
      linkedProductId: "product-1",
      linkedCourseId: "course-1",
      linkedTrialId: "trial-1",
      linkedGrowId: "grow-1",
      storefrontSlug: "living-soil-labs",
      imageUrl: "/uploads/feed-image.jpg"
    });
  });

  it("normalizes campaign and storefront identity aliases when listing campaigns", async () => {
    const { listCommercialFeedCampaigns } = require("@/api/commercialFeed");
    mockApiRequest.mockResolvedValueOnce({
      items: [
        {
          campaignId: "campaign-alias-1",
          type: "listing",
          description: "Product campaign body",
          tags: [123, "soil"],
          growInterests: ["living soil"],
          linkedStorefrontSlug: "living-soil-labs",
          likeCount: 7
        },
        {
          linkedFeedCampaignId: "campaign-alias-2",
          type: "education",
          body: "Course campaign body",
          brandSlug: "soil-school"
        },
        {
          linkedFeedPostId: "campaign-alias-3",
          type: "drop",
          body: "Live campaign body",
          publicSlug: "live-lab"
        }
      ],
      nextCursor: "cursor-2"
    });

    const result = await listCommercialFeedCampaigns({
      type: "all",
      q: "soil",
      limit: 3,
      placement: "tool"
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/feed", {
      invalidateOn401: false,
      params: { q: "soil", limit: 3, placement: "tool" }
    });
    expect(result.nextCursor).toBe("cursor-2");
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "campaign-alias-1",
        body: "Product campaign body",
        tags: ["123", "soil"],
        growInterests: ["living soil"],
        storefrontSlug: "living-soil-labs",
        engagementCount: 7
      }),
      expect.objectContaining({
        id: "campaign-alias-2",
        body: "Course campaign body",
        storefrontSlug: "soil-school",
        tags: [],
        growInterests: []
      }),
      expect.objectContaining({
        id: "campaign-alias-3",
        body: "Live campaign body",
        storefrontSlug: "live-lab"
      })
    ]);
  });
});
