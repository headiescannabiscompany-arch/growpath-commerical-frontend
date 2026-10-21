import {
  fetchPublicStorefront,
  fetchPublicStorefrontCourse,
  fetchStorefront,
  searchPublicStorefronts
} from "@/api/storefront";
import {
  isDispensaryDiscoveryAvailable,
  isPublicStorefrontAvailable,
  DISPENSARY_DISCOVERY_UNAVAILABLE
} from "@/utils/dispensaryAvailability";

const mockApiRequest = jest.fn();
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("owner-paused dispensary discovery", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("stays OFF without relying on an account, URL or environment toggle", () => {
    expect(isDispensaryDiscoveryAvailable()).toBe(false);
  });

  it.each([
    { storefrontType: "dispensary" },
    { businessType: " DISPENSARY " },
    { type: "dispensary" },
    { isDispensary: true },
    { storefrontType: "general", businessType: "dispensary" }
  ])("withholds explicitly identified dispensary %j", (record) => {
    expect(isPublicStorefrontAvailable(record)).toBe(false);
  });

  it("does not infer a dispensary from a gardening business name or crop interest", () => {
    expect(
      isPublicStorefrontAvailable({ name: "Cannabis education", isCannabis: true })
    ).toBe(true);
    expect(isPublicStorefrontAvailable({ storefrontType: "general" })).toBe(true);
  });

  it.each(["dispensary", " DISPENSARY "])(
    "blocks direct %s search without transport",
    async (type) => {
      await expect(
        searchPublicStorefronts({ storefrontType: type as any })
      ).rejects.toMatchObject({
        code: "DISPENSARY_DISCOVERY_UNAVAILABLE"
      });
      expect(mockApiRequest).not.toHaveBeenCalled();
    }
  );

  it.each([false, true])(
    "rejects paused storefront data from an older API, nested=%s",
    async (nested) => {
      const result = {
        storefront: { slug: "synthetic", storefrontType: "dispensary" },
        products: []
      };
      mockApiRequest.mockResolvedValue(nested ? { data: result } : result);
      await expect(fetchPublicStorefront("synthetic")).rejects.toThrow(
        DISPENSARY_DISCOVERY_UNAVAILABLE
      );
    }
  );

  it("converts the server pause code to readable feedback without retrying", async () => {
    mockApiRequest.mockRejectedValue({ code: "DISPENSARY_DISCOVERY_UNAVAILABLE" });
    await expect(fetchPublicStorefront("synthetic")).rejects.toMatchObject({
      message: DISPENSARY_DISCOVERY_UNAVAILABLE,
      code: "DISPENSARY_DISCOVERY_UNAVAILABLE"
    });
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });

  it("preserves ordinary store payloads and owner/standalone course reads", async () => {
    const result = {
      storefront: { slug: "garden", storefrontType: "general" },
      products: [{ id: "kept" }]
    };
    mockApiRequest.mockResolvedValue(result);
    await expect(fetchPublicStorefront("garden")).resolves.toBe(result);
    await fetchStorefront();
    await fetchPublicStorefrontCourse("synthetic", "64f000000000000000000403");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/storefront");
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/commercial/storefront/public/synthetic/courses/64f000000000000000000403",
      expect.objectContaining({ auth: false, notifyTokenBalance: false })
    );
  });
});
