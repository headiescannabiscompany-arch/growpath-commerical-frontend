const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("vendor analytics and metrics API wrappers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("loads current-vendor analytics and orders from backend envelopes", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        data: {
          analytics: {
            totalRevenue: 1250,
            orderCount: 3,
            salesByMonth: [{ label: "2026-01", value: 1250 }]
          }
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          orders: [
            {
              id: "order-1",
              productName: "Bloom Kit",
              total: 125
            }
          ]
        }
      });

    const { getVendorAnalytics, getVendorOrders } = require("@/api/vendorAnalytics");

    await expect(getVendorAnalytics("me")).resolves.toEqual({
      success: true,
      data: {
        analytics: {
          totalRevenue: 1250,
          orderCount: 3,
          salesByMonth: [{ label: "2026-01", value: 1250 }]
        }
      }
    });
    await expect(getVendorOrders("me")).resolves.toEqual({
      success: true,
      data: {
        orders: [
          {
            id: "order-1",
            productName: "Bloom Kit",
            total: 125
          }
        ]
      }
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/vendors/me/analytics");
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/vendors/me/orders");
  });

  it("loads seeded vendor metrics, soil mixes, and equipment", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        data: {
          metrics: {
            avgSoilPH: 6.2,
            avgNutrientEC: 1.7,
            yieldByMonth: [{ label: "2026-01", value: 2.5 }]
          }
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          soilMixes: [{ id: "mix-1", name: "Flower Mix", notes: "Bloom feed" }]
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          equipment: [{ id: "eq-1", name: "Pulse Sensor Hub", type: "sensor" }]
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          soilMix: { id: "mix-2", name: "Starter Mix", notes: "" }
        }
      });

    const {
      createVendorSoilMix,
      getVendorMetrics,
      listVendorEquipment,
      listVendorSoilMixes
    } = require("@/api/vendorMetrics");

    await expect(getVendorMetrics("me")).resolves.toMatchObject({
      success: true,
      data: {
        metrics: {
          avgSoilPH: 6.2,
          avgNutrientEC: 1.7,
          yieldByMonth: [{ label: "2026-01", value: 2.5 }]
        }
      }
    });
    await expect(listVendorSoilMixes("me")).resolves.toMatchObject({
      success: true,
      data: { soilMixes: [{ name: "Flower Mix" }] }
    });
    await expect(listVendorEquipment("me")).resolves.toMatchObject({
      success: true,
      data: { equipment: [{ name: "Pulse Sensor Hub" }] }
    });
    await expect(
      createVendorSoilMix("me", { name: "Starter Mix" })
    ).resolves.toMatchObject({
      success: true,
      data: { soilMix: { name: "Starter Mix" } }
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/vendors/me/metrics");
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/vendors/me/soil-mixes");
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, "/api/vendors/me/equipment");
    expect(mockApiRequest).toHaveBeenNthCalledWith(4, "/api/vendors/me/soil-mixes", {
      method: "POST",
      body: { name: "Starter Mix" }
    });
  });
});
